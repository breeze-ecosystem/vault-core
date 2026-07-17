"""
Oversight Hub — Edge Agent OSDP Serial Channel
pyserial-asyncio transport wrapper implementing the libosdp Channel interface.

Provides async connect/send/receive methods wrapping pyserial-asyncio's
reader/writer pattern, compatible with libosdp's OSDP context channel
requirements.
"""

from __future__ import annotations

import asyncio
import logging

import serial_asyncio

log = logging.getLogger("edge-agent")


class PySerialChannel:
    """libosdp Channel interface wrapping pyserial-asyncio.

    Wraps a serial connection opened with ``serial_asyncio.open_serial_connection``,
    providing ``connect()``, ``send()``, and ``receive()`` methods that libosdp's
    OSDP context uses as its transport layer for RS-485 communication.
    """

    def __init__(self, device: str, baud: int) -> None:
        """Store device path and baud rate for later connection.

        Args:
            device: Serial device path (e.g., ``/dev/ttyUSB0``).
            baud: Baud rate (e.g., 9600, 115200).
        """
        self._device = device
        self._baud = baud
        self._reader: asyncio.StreamReader | None = None
        self._writer: asyncio.StreamWriter | None = None

    async def connect(self) -> None:
        """Open the serial connection via pyserial-asyncio.

        Raises:
            Exception: If the serial port cannot be opened.
        """
        try:
            reader, writer = await serial_asyncio.open_serial_connection(
                url=self._device,
                baudrate=self._baud,
            )
            self._reader = reader
            self._writer = writer
            log.info("OSDP Channel: connected to %s @ %d baud", self._device, self._baud)
        except Exception as exc:
            log.error("OSDP Channel: failed to connect to %s — %s", self._device, exc)
            raise

    async def send(self, data: bytes) -> None:
        """Write *data* to the serial writer.

        Args:
            data: Raw bytes to transmit on the serial bus.
        """
        if self._writer is None:
            log.error("OSDP Channel: cannot send — not connected")
            return
        try:
            self._writer.write(data)
            await self._writer.drain()
        except Exception as exc:
            log.error("OSDP Channel: send error on %s — %s", self._device, exc)

    async def receive(self, timeout: float = 1.0) -> bytes | None:
        """Read available bytes from the serial reader.

        Args:
            timeout: Maximum seconds to wait for data (default: 1.0).

        Returns:
            Bytes read, or ``None`` if no data available within timeout.
        """
        if self._reader is None:
            log.error("OSDP Channel: cannot receive — not connected")
            return None
        try:
            data = await asyncio.wait_for(self._reader.read(1024), timeout=timeout)
            return data if data else None
        except asyncio.TimeoutError:
            return None
        except Exception as exc:
            log.error("OSDP Channel: receive error on %s — %s", self._device, exc)
            return None

    async def close(self) -> None:
        """Close the serial connection cleanly."""
        if self._writer is not None:
            try:
                self._writer.close()
                await self._writer.wait_closed()
            except Exception as exc:
                log.debug("OSDP Channel: close error on %s — %s", self._device, exc)
            self._reader = None
            self._writer = None
            log.info("OSDP Channel: disconnected from %s", self._device)
