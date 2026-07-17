"""
Tests for edge/agent/tasks/serial_task.py — async serial I/O via pyserial-asyncio.

All tests use mocked I/O — no real serial ports needed.
"""

from __future__ import annotations

import asyncio
from typing import AsyncIterator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from tasks.serial_task import serial_reader


async def _async_gen(*items: bytes) -> AsyncIterator[bytes]:
    for item in items:
        yield item


class TestSerialReaderTimeout:
    """Serial reader handles timeout without crashing."""

    @pytest.mark.asyncio
    async def test_read_timeout_loops_back(self) -> None:
        """TimeoutError on read should be caught and loop should continue."""
        reader = AsyncMock()
        # First call raises TimeoutError, second call returns a byte
        reader.readexactly = AsyncMock(
            side_effect=[
                asyncio.TimeoutError(),
                b"\x00",  # byte after timeout
            ]
        )
        reader.read = AsyncMock(side_effect=[b"\x01", b""])

        writer = MagicMock()
        writer.close = MagicMock()
        writer.wait_closed = AsyncMock()

        with patch(
            "tasks.serial_task.serial_asyncio.open_serial_connection",
            return_value=(reader, writer),
        ):
            shutdown = asyncio.Event()
            message_queue: asyncio.Queue = asyncio.Queue()

            task = asyncio.create_task(
                serial_reader(shutdown, "/dev/ttyUSB0", 9600, message_queue)
            )
            await asyncio.sleep(0.1)
            shutdown.set()
            await asyncio.wait_for(task, timeout=5.0)

        # The reader should have been called at least twice (timeout + success)
        assert reader.readexactly.await_count >= 2

    @pytest.mark.asyncio
    async def test_timeout_does_not_crash(self) -> None:
        """Repeated timeouts should not crash the reader."""
        reader = AsyncMock()
        reader.readexactly = AsyncMock(side_effect=asyncio.TimeoutError())
        reader.read = AsyncMock()

        writer = MagicMock()
        writer.close = MagicMock()
        writer.wait_closed = AsyncMock()

        with patch(
            "tasks.serial_task.serial_asyncio.open_serial_connection",
            return_value=(reader, writer),
        ):
            shutdown = asyncio.Event()
            message_queue: asyncio.Queue = asyncio.Queue()

            task = asyncio.create_task(
                serial_reader(shutdown, "/dev/ttyUSB0", 9600, message_queue)
            )
            await asyncio.sleep(0.05)
            shutdown.set()
            await asyncio.wait_for(task, timeout=5.0)

        # Task completed without exception
        assert task.done()
        assert task.exception() is None


class TestSerialReaderShutdown:
    """Serial reader gracefully closes port on shutdown."""

    @pytest.mark.asyncio
    async def test_writer_closed_on_shutdown(self) -> None:
        """When shutdown event is set, writer.close() and wait_closed() are called."""
        reader = AsyncMock()
        reader.readexactly = AsyncMock(side_effect=asyncio.TimeoutError())

        writer = MagicMock()
        writer.close = MagicMock()
        writer.wait_closed = AsyncMock()

        with patch(
            "tasks.serial_task.serial_asyncio.open_serial_connection",
            return_value=(reader, writer),
        ):
            shutdown = asyncio.Event()
            message_queue: asyncio.Queue = asyncio.Queue()

            task = asyncio.create_task(
                serial_reader(shutdown, "/dev/ttyUSB0", 9600, message_queue)
            )
            await asyncio.sleep(0.05)
            shutdown.set()
            await asyncio.wait_for(task, timeout=5.0)

        writer.close.assert_called_once()
        writer.wait_closed.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_shutdown_without_timeout(self) -> None:
        """Shutdown event interrupts the loop even without timeout."""
        reader = AsyncMock()
        # Block forever on readexactly — but we set shutdown before awaiting
        reader.readexactly = AsyncMock(side_effect=lambda *a, **kw: asyncio.sleep(10))

        writer = MagicMock()
        writer.close = MagicMock()
        writer.wait_closed = AsyncMock()

        with patch(
            "tasks.serial_task.serial_asyncio.open_serial_connection",
            return_value=(reader, writer),
        ):
            shutdown = asyncio.Event()
            message_queue: asyncio.Queue = asyncio.Queue()

            # Set shutdown before starting to ensure loop exits immediately
            shutdown.set()
            task = asyncio.create_task(
                serial_reader(shutdown, "/dev/ttyUSB0", 9600, message_queue)
            )
            await asyncio.wait_for(task, timeout=5.0)

        assert task.done()
        writer.close.assert_called_once()
        writer.wait_closed.assert_awaited_once()


class TestSerialReaderConnectionError:
    """Serial reader handles connection errors gracefully."""

    @pytest.mark.asyncio
    async def test_connection_error_does_not_crash(self) -> None:
        """When open_serial_connection raises, the function logs and exits."""
        with patch(
            "tasks.serial_task.serial_asyncio.open_serial_connection",
            side_effect=Exception("device not found"),
        ):
            shutdown = asyncio.Event()
            message_queue: asyncio.Queue = asyncio.Queue()

            # The function should log and return, not crash
            await serial_reader(shutdown, "/dev/ttyUSB0", 9600, message_queue)

    @pytest.mark.asyncio
    async def test_incomplete_read_exits_loop(self) -> None:
        """IncompleteReadError should be caught and the loop should exit."""
        reader = AsyncMock()
        reader.readexactly = AsyncMock(side_effect=asyncio.IncompleteReadError(b""))

        writer = MagicMock()
        writer.close = MagicMock()
        writer.wait_closed = AsyncMock()

        with patch(
            "tasks.serial_task.serial_asyncio.open_serial_connection",
            return_value=(reader, writer),
        ):
            shutdown = asyncio.Event()
            message_queue: asyncio.Queue = asyncio.Queue()

            task = asyncio.create_task(
                serial_reader(shutdown, "/dev/ttyUSB0", 9600, message_queue)
            )
            await asyncio.sleep(0.1)
            # If IncompleteReadError is handled, the task should complete on its own
            shutdown.set()
            await asyncio.wait_for(task, timeout=5.0)

        assert task.done()
        # Writer should be closed in the finally block
        writer.close.assert_called_once()


class TestSerialReaderMessageQueue:
    """Serial reader places raw frames on the message queue."""

    @pytest.mark.asyncio
    async def test_frame_placed_on_message_queue(self) -> None:
        """A valid frame (>= 6 bytes) should be placed on the message queue."""
        frame_bytes = b"\xff\xff\xff\xff\xff\xff\xff\xff"  # 8 bytes, valid OSDP-ish

        reader = AsyncMock()
        reader.readexactly = AsyncMock(side_effect=[frame_bytes[:1], asyncio.TimeoutError()])
        reader.read = AsyncMock(side_effect=[frame_bytes[1:3], frame_bytes[3:]])

        writer = MagicMock()
        writer.close = MagicMock()
        writer.wait_closed = AsyncMock()

        with patch(
            "tasks.serial_task.serial_asyncio.open_serial_connection",
            return_value=(reader, writer),
        ):
            shutdown = asyncio.Event()
            message_queue: asyncio.Queue = asyncio.Queue()

            task = asyncio.create_task(
                serial_reader(shutdown, "/dev/ttyUSB0", 9600, message_queue)
            )
            await asyncio.sleep(0.1)
            shutdown.set()
            await asyncio.wait_for(task, timeout=5.0)

        # Verify frame was placed on the message queue
        assert not message_queue.empty()
        msg_type, device, data = message_queue.get_nowait()
        assert msg_type == "serial_frame"
        assert device == "/dev/ttyUSB0"
        assert isinstance(data, bytes)
        assert len(data) == 8

    @pytest.mark.asyncio
    async def test_short_frame_discarded(self) -> None:
        """Frames shorter than 6 bytes should be discarded."""
        reader = AsyncMock()
        # Return a 4-byte frame (too short)
        reader.readexactly = AsyncMock(side_effect=[b"\x01", asyncio.TimeoutError()])
        reader.read = AsyncMock(side_effect=[b"\x02", b"\x03"])

        writer = MagicMock()
        writer.close = MagicMock()
        writer.wait_closed = AsyncMock()

        with patch(
            "tasks.serial_task.serial_asyncio.open_serial_connection",
            return_value=(reader, writer),
        ):
            shutdown = asyncio.Event()
            message_queue: asyncio.Queue = asyncio.Queue()

            task = asyncio.create_task(
                serial_reader(shutdown, "/dev/ttyUSB0", 9600, message_queue)
            )
            await asyncio.sleep(0.1)
            shutdown.set()
            await asyncio.wait_for(task, timeout=5.0)

        # Short frame should not appear on the queue
        assert message_queue.empty()
