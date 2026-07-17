"""
Oversight Hub — Edge Agent Serial Task
Async serial I/O for OSDP door controller communication via pyserial-asyncio.
"""

from __future__ import annotations

import asyncio
import logging

import serial_asyncio

log = logging.getLogger("edge-agent")

# Maximum OSDP frame size in bytes (per OSDP spec: 0xFF * 8 bytes = 2040
# for extended-addressed frames, but we use a reasonable safe upper bound).
_FRAME_BUFFER_SIZE = 4096
_READ_TIMEOUT = 1.0
_FRAME_IDLE_TIMEOUT = 0.05  # 50 ms — gap between bytes signals frame end


async def serial_reader(
    shutdown: asyncio.Event,
    device: str,
    baud: int,
    message_queue: asyncio.Queue,
) -> None:
    """Read OSDP frames from *device* via pyserial-asyncio.

    Opens a serial connection, reads bytes with a short timeout (1 s) to
    prevent event-loop starvation, assembles frames by byte-gap idle detection,
    and places raw frame bytes onto *message_queue* for the MQTT task to
    publish.

    Graceful shutdown: on ``shutdown`` event, closes the serial port via
    ``try/finally``.
    """
    log.info("Serial: connecting to %s @ %d baud", device, baud)

    try:
        reader, writer = await serial_asyncio.open_serial_connection(
            url=device,
            baudrate=baud,
        )
    except Exception as exc:
        log.error("Serial: failed to open %s — %s", device, exc)
        return

    log.info("Serial: connected to %s", device)

    try:
        while not shutdown.is_set():
            try:
                # Read one byte with timeout — yields control to event loop
                byte = await asyncio.wait_for(
                    reader.readexactly(1),
                    timeout=_READ_TIMEOUT,
                )
            except asyncio.TimeoutError:
                # Expected — loop back and check shutdown flag
                continue
            except asyncio.IncompleteReadError:
                # Connection closed
                log.warning("Serial: incomplete read on %s — exiting", device)
                break

            # Collect the rest of the frame with idle-based termination
            frame = bytearray(byte)
            try:
                while len(frame) < _FRAME_BUFFER_SIZE:
                    chunk = await asyncio.wait_for(
                        reader.read(1),
                        timeout=_FRAME_IDLE_TIMEOUT,
                    )
                    if not chunk:
                        break
                    frame.extend(chunk)
            except asyncio.TimeoutError:
                pass  # Idle timeout — frame complete

            # Basic frame-length sanity check (minimum OSDP frame is ~6 bytes)
            if len(frame) < 6:
                log.debug("Serial: discarding short frame (%d bytes) from %s", len(frame), device)
                continue

            # Place raw frame on the queue for the MQTT task to publish
            try:
                message_queue.put_nowait(("serial_frame", device, bytes(frame)))
            except asyncio.QueueFull:
                log.warning("Serial: message queue full — dropping frame from %s", device)

    finally:
        writer.close()
        await writer.wait_closed()
        log.info("Serial: disconnected from %s", device)
