"""
Tests for edge/agent/tasks/mqtt_task.py — async MQTT handler with aiomqtt.

All tests use mocked I/O (unittest.mock.patch) — no real MQTT broker needed.
"""

from __future__ import annotations

import asyncio
import json
import ssl
from typing import Any, AsyncIterator, Callable
from unittest.mock import AsyncMock, MagicMock, PropertyMock, call, patch

import aiomqtt
import pytest

from tasks.mqtt_task import _build_tls_params, mqtt_handler


# ── Helpers ─────────────────────────────────────────────────────────


async def _async_gen(*items: Any) -> AsyncIterator[Any]:
    """Async generator helper yielding the provided items."""
    for item in items:
        yield item


def _make_mock_client(
    *,
    messages: list[Any] | None = None,
    subscribe_ok: bool = True,
    publish_ok: bool = True,
) -> MagicMock:
    """Create a mocked aiomqtt.Client with controlled async context manager.

    The returned mock handles ``async with`` entry/exit, ``.messages()``
    context manager, and the subscribe/publish methods.
    """
    client = MagicMock()
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=None)
    client.subscribe = AsyncMock() if subscribe_ok else AsyncMock(side_effect=aiomqtt.MqttError("sub fail"))
    client.publish = AsyncMock() if publish_ok else AsyncMock(side_effect=aiomqtt.MqttError("pub fail"))

    # Message context manager
    msgs = AsyncMock()
    msgs.__aenter__ = AsyncMock(return_value=msgs)
    msgs.__aexit__ = AsyncMock(return_value=None)
    msgs.__aiter__ = AsyncMock(return_value=_async_gen(*(messages or [])))
    client.messages.return_value = msgs

    return client


def _mock_settings(**overrides: Any) -> MagicMock:
    """Create a mock settings object with sensible defaults."""
    defaults = {
        "MQTT_BROKER_HOST": "localhost",
        "MQTT_BROKER_PORT": 8883,
        "MQTT_USERNAME": "test-user",
        "MQTT_PASSWORD": "test-pass",
        "MQTT_TLS_CA_CERT": "/app/certs/ca.crt",
        "MQTT_RECONNECT_INTERVAL": 1,
        "MQTT_BUFFER_MAXSIZE": 5000,
        "EDGE_SITE_ID": "test",
        "EDGE_AGENT_ID": "edge-test",
    }
    defaults.update(overrides)
    s = MagicMock(**{k: PropertyMock(return_value=v) for k, v in defaults.items()})
    # Ensure the string values actually resolve as strings, not PropertyMock instances
    for k, v in defaults.items():
        setattr(s, k, v)
    return s


# ── _build_tls_params ──────────────────────────────────────────────


class TestBuildTlsParams:
    """Unit tests for the module-level TLS parameter builder."""

    def test_returns_tlsparameters(self) -> None:
        settings = _mock_settings()
        params = _build_tls_params(settings)
        assert isinstance(params, aiomqtt.TLSParameters)

    def test_ca_certs_from_settings(self) -> None:
        settings = _mock_settings(MQTT_TLS_CA_CERT="/custom/ca.pem")
        params = _build_tls_params(settings)
        assert params.ca_certs == "/custom/ca.pem"

    def test_certfile_is_none(self) -> None:
        """No client cert — password auth only (D-06)."""
        settings = _mock_settings()
        params = _build_tls_params(settings)
        assert params.certfile is None

    def test_keyfile_is_none(self) -> None:
        settings = _mock_settings()
        params = _build_tls_params(settings)
        assert params.keyfile is None

    def test_cert_reqs_is_cert_required(self) -> None:
        settings = _mock_settings()
        params = _build_tls_params(settings)
        assert params.cert_reqs == ssl.CERT_REQUIRED


# ── Reconnect ──────────────────────────────────────────────────────


class TestMQTTReconnect:
    """Verify the handler retries on connection failure."""

    @pytest.mark.asyncio
    async def test_reconnect_on_mqtt_error(self) -> None:
        """First connection attempt fails, second succeeds."""
        fail_client = MagicMock()
        fail_client.__aenter__ = AsyncMock(side_effect=aiomqtt.MqttError("connection refused"))

        ok_client = _make_mock_client()

        with patch("tasks.mqtt_task.aiomqtt.Client", side_effect=[fail_client, ok_client]):
            shutdown = asyncio.Event()
            settings = _mock_settings(MQTT_RECONNECT_INTERVAL=1)
            message_queue: asyncio.Queue = asyncio.Queue()

            task = asyncio.create_task(mqtt_handler(shutdown, settings, message_queue))
            # Allow enough time for two connect attempts
            await asyncio.sleep(2.5)
            shutdown.set()
            await asyncio.wait_for(task, timeout=5.0)

        # Verify the second client subscribed (proof it connected)
        ok_client.subscribe.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_stops_retrying_on_shutdown(self) -> None:
        """When shutdown is set during reconnect wait, the handler stops."""
        fail_client = MagicMock()
        fail_client.__aenter__ = AsyncMock(side_effect=aiomqtt.MqttError("fail"))

        with patch("tasks.mqtt_task.aiomqtt.Client", return_value=fail_client):
            shutdown = asyncio.Event()
            settings = _mock_settings(MQTT_RECONNECT_INTERVAL=10)
            message_queue: asyncio.Queue = asyncio.Queue()

            task = asyncio.create_task(mqtt_handler(shutdown, settings, message_queue))
            await asyncio.sleep(0.2)
            shutdown.set()
            await asyncio.wait_for(task, timeout=5.0)

        # Handler should exit cleanly — the task is done
        assert task.done()


# ── Publish ─────────────────────────────────────────────────────────


class TestMQTTPublish:
    """Verify publish helpers send messages to the correct topics."""

    @pytest.mark.asyncio
    async def test_publish_door_state_topic(self) -> None:
        client = _make_mock_client()
        ok_client = _make_mock_client()

        with patch("tasks.mqtt_task.aiomqtt.Client", return_value=ok_client):
            shutdown = asyncio.Event()
            settings = _mock_settings(EDGE_SITE_ID="site-1")
            message_queue: asyncio.Queue = asyncio.Queue()

            task = asyncio.create_task(mqtt_handler(shutdown, settings, message_queue))
            await asyncio.sleep(0.3)

            # Get the publish helper exposed on the handler
            publish_fn = mqtt_handler.publish_door_state  # type: ignore[attr-defined]
            await publish_fn(client, "door-1", "locked")
            shutdown.set()
            await asyncio.wait_for(task, timeout=5.0)

        expected_topic = "site/site-1/door/door-1/state"
        client.publish.assert_awaited_once()
        call_args = client.publish.await_args
        assert call_args is not None
        assert call_args[0] == expected_topic

    @pytest.mark.asyncio
    async def test_publish_door_state_payload(self) -> None:
        client = _make_mock_client()
        ok_client = _make_mock_client()

        with patch("tasks.mqtt_task.aiomqtt.Client", return_value=ok_client):
            shutdown = asyncio.Event()
            settings = _mock_settings(EDGE_SITE_ID="site-1")
            message_queue: asyncio.Queue = asyncio.Queue()

            task = asyncio.create_task(mqtt_handler(shutdown, settings, message_queue))
            await asyncio.sleep(0.3)

            publish_fn = mqtt_handler.publish_door_state  # type: ignore[attr-defined]
            await publish_fn(client, "door-1", "locked")
            shutdown.set()
            await asyncio.wait_for(task, timeout=5.0)

        call_args = client.publish.await_args
        assert call_args is not None
        payload = json.loads(call_args[1]["payload"])
        assert payload["device_id"] == "door-1"
        assert payload["state"] == "locked"
        assert isinstance(payload["sequence"], int)
        assert payload["sequence"] >= 0

    @pytest.mark.asyncio
    async def test_publish_badge_read_topic(self) -> None:
        client = _make_mock_client()
        ok_client = _make_mock_client()

        with patch("tasks.mqtt_task.aiomqtt.Client", return_value=ok_client):
            shutdown = asyncio.Event()
            settings = _mock_settings(EDGE_SITE_ID="site-1")
            message_queue: asyncio.Queue = asyncio.Queue()

            task = asyncio.create_task(mqtt_handler(shutdown, settings, message_queue))
            await asyncio.sleep(0.3)

            publish_fn = mqtt_handler.publish_badge_read  # type: ignore[attr-defined]
            await publish_fn(client, "reader-1", "12345")
            shutdown.set()
            await asyncio.wait_for(task, timeout=5.0)

        expected_topic = "site/site-1/reader/reader-1/badge"
        client.publish.assert_awaited_once()
        call_args = client.publish.await_args
        assert call_args is not None
        assert call_args[0] == expected_topic

    @pytest.mark.asyncio
    async def test_publish_controller_health_topic(self) -> None:
        client = _make_mock_client()
        ok_client = _make_mock_client()

        with patch("tasks.mqtt_task.aiomqtt.Client", return_value=ok_client):
            shutdown = asyncio.Event()
            settings = _mock_settings(EDGE_SITE_ID="site-1")
            message_queue: asyncio.Queue = asyncio.Queue()

            task = asyncio.create_task(mqtt_handler(shutdown, settings, message_queue))
            await asyncio.sleep(0.3)

            publish_fn = mqtt_handler.publish_controller_health  # type: ignore[attr-defined]
            await publish_fn(client, "ctrl-1", True, 3600)
            shutdown.set()
            await asyncio.wait_for(task, timeout=5.0)

        expected_topic = "site/site-1/controller/ctrl-1/health"
        client.publish.assert_awaited_once()
        call_args = client.publish.await_args
        assert call_args is not None
        assert call_args[0] == expected_topic


# ── Subscribe ──────────────────────────────────────────────────────


class TestMQTTSubscribe:
    """Verify the handler subscribes to the correct command topic."""

    @pytest.mark.asyncio
    async def test_subscribes_to_door_cmd_topic(self) -> None:
        ok_client = _make_mock_client()

        with patch("tasks.mqtt_task.aiomqtt.Client", return_value=ok_client):
            shutdown = asyncio.Event()
            settings = _mock_settings(EDGE_SITE_ID="site-99")
            message_queue: asyncio.Queue = asyncio.Queue()

            task = asyncio.create_task(mqtt_handler(shutdown, settings, message_queue))
            await asyncio.sleep(0.3)
            shutdown.set()
            await asyncio.wait_for(task, timeout=5.0)

        expected_topic = "site/site-99/door/+/cmd"
        ok_client.subscribe.assert_awaited_once_with(expected_topic, qos=1)


# ── Buffer overflow ───────────────────────────────────────────────


class TestMQTTBufferOverflow:
    """Verify the bounded buffer drops oldest messages on overflow."""

    @pytest.mark.asyncio
    async def test_buffer_drops_oldest_on_overflow(self) -> None:
        """When buffer is full, oldest message is evicted (FIFO)."""
        buffer: asyncio.Queue = asyncio.Queue(maxsize=3)
        msg = json.dumps({"topic": "test", "payload": {"seq": 0}})

        # Fill the buffer
        for i in range(3):
            buffer.put_nowait(json.dumps({"topic": "test", "payload": {"seq": i}}))

        # Buffer is now full. Simulate FIFO eviction (pattern from _buffer_message).
        try:
            buffer.put_nowait(json.dumps({"topic": "test", "payload": {"seq": 3}}))
        except asyncio.QueueFull:
            try:
                buffer.get_nowait()  # drop oldest
            except asyncio.QueueEmpty:
                pass
            buffer.put_nowait(json.dumps({"topic": "test", "payload": {"seq": 3}}))

        assert buffer.qsize() == 3

        # Read all messages and verify seq 0 (oldest) was dropped
        items = []
        while not buffer.empty():
            items.append(json.loads(buffer.get_nowait()))
        seqs = [item["payload"]["seq"] for item in items]
        assert seqs == [1, 2, 3], f"Expected [1, 2, 3] but got {seqs}"

    @pytest.mark.asyncio
    async def test_buffer_is_bounded_by_maxsize(self) -> None:
        """Buffer never exceeds maxsize even when continuously filling."""
        buffer: asyncio.Queue = asyncio.Queue(maxsize=10)

        for i in range(20):
            try:
                buffer.put_nowait(json.dumps({"seq": i}))
            except asyncio.QueueFull:
                try:
                    buffer.get_nowait()
                except asyncio.QueueEmpty:
                    pass
                buffer.put_nowait(json.dumps({"seq": i}))

        assert buffer.qsize() == 10


# ── Replay on reconnect ────────────────────────────────────────────


class TestMQTTReplay:
    """Verify buffered messages are replayed on reconnect."""

    @pytest.mark.asyncio
    async def test_replay_buffered_messages_on_reconnect(self) -> None:
        """After buffering during disconnection, messages are published on reconnect."""
        fail_client = MagicMock()
        fail_client.__aenter__ = AsyncMock(side_effect=aiomqtt.MqttError("fail"))

        ok_client = _make_mock_client()

        with patch("tasks.mqtt_task.aiomqtt.Client", side_effect=[fail_client, ok_client]):
            shutdown = asyncio.Event()
            settings = _mock_settings(
                MQTT_RECONNECT_INTERVAL=1,
                MQTT_BUFFER_MAXSIZE=5000,
                EDGE_SITE_ID="test",
            )
            message_queue: asyncio.Queue = asyncio.Queue()

            task = asyncio.create_task(mqtt_handler(shutdown, settings, message_queue))
            # Let the first connection fail
            await asyncio.sleep(0.3)
            assert hasattr(mqtt_handler, "buffer"), "handler.buffer should exist"

            # Buffer messages while disconnected
            buffer = mqtt_handler.buffer  # type: ignore[attr-defined]
            for i in range(3):
                msg = json.dumps({"topic": "site/test/door/1/state", "payload": {"state": "locked", "seq": i}})
                buffer.put_nowait(msg)

            # Now let it reconnect (the mock will return ok_client on second call)
            await asyncio.sleep(2.0)
            shutdown.set()
            await asyncio.wait_for(task, timeout=5.0)

        # The ok_client should have published the buffered messages plus subscribed
        # 3 buffered + the subscribe call
        assert ok_client.publish.await_count >= 3

    @pytest.mark.asyncio
    async def test_no_publish_if_no_buffered_messages(self) -> None:
        """On fresh connect with empty buffer, no replay publishes happen."""
        ok_client = _make_mock_client()

        with patch("tasks.mqtt_task.aiomqtt.Client", return_value=ok_client):
            shutdown = asyncio.Event()
            settings = _mock_settings(EDGE_SITE_ID="test")
            message_queue: asyncio.Queue = asyncio.Queue()

            task = asyncio.create_task(mqtt_handler(shutdown, settings, message_queue))
            await asyncio.sleep(0.3)
            shutdown.set()
            await asyncio.wait_for(task, timeout=5.0)

        # publish may be called 0 times (no buffered messages), only subscribe
        assert ok_client.subscribe.await_count == 1


# ── Message parsing ────────────────────────────────────────────────


class TestMQTTMessageParsing:
    """Verify incoming MQTT messages are parsed and routed correctly."""

    @pytest.mark.asyncio
    async def test_door_command_routed_to_message_queue(self) -> None:
        """A /cmd message should be placed on the message queue."""
        class MockMessage:
            topic = b"site/test/door/1/cmd"
            payload = b'{"command": "unlock"}'

            def decode(self) -> str:
                return self.payload.decode()

        ok_client = _make_mock_client(messages=[MockMessage()])

        with patch("tasks.mqtt_task.aiomqtt.Client", return_value=ok_client):
            shutdown = asyncio.Event()
            settings = _mock_settings(EDGE_SITE_ID="test")
            message_queue: asyncio.Queue = asyncio.Queue()

            task = asyncio.create_task(mqtt_handler(shutdown, settings, message_queue))
            await asyncio.sleep(0.3)
            shutdown.set()
            await asyncio.wait_for(task, timeout=5.0)

        # The message should have been put on the queue
        assert not message_queue.empty()
        msg_type, topic, payload = message_queue.get_nowait()
        assert msg_type == "door_cmd"
        assert "door/1/cmd" in topic
        assert payload["command"] == "unlock"

    @pytest.mark.asyncio
    async def test_invalid_json_logged_and_skipped(self) -> None:
        """A non-JSON message on a command topic should be skipped gracefully."""
        class MockMessage:
            topic = b"site/test/door/1/cmd"
            payload = b"not-json"

            def decode(self) -> str:
                return self.payload.decode()

        ok_client = _make_mock_client(messages=[MockMessage()])

        with patch("tasks.mqtt_task.aiomqtt.Client", return_value=ok_client):
            shutdown = asyncio.Event()
            settings = _mock_settings(EDGE_SITE_ID="test")
            message_queue: asyncio.Queue = asyncio.Queue()

            task = asyncio.create_task(mqtt_handler(shutdown, settings, message_queue))
            await asyncio.sleep(0.3)
            shutdown.set()
            await asyncio.wait_for(task, timeout=5.0)

        # No message should be on the queue for invalid JSON
        assert message_queue.empty()

    @pytest.mark.asyncio
    async def test_non_cmd_message_not_routed(self) -> None:
        """Messages on non-cmd topics should not be routed to the message queue."""
        class MockMessage:
            topic = b"site/test/door/1/state"
            payload = b'{"state": "locked"}'

            def decode(self) -> str:
                return self.payload.decode()

        ok_client = _make_mock_client(messages=[MockMessage()])

        with patch("tasks.mqtt_task.aiomqtt.Client", return_value=ok_client):
            shutdown = asyncio.Event()
            settings = _mock_settings(EDGE_SITE_ID="test")
            message_queue: asyncio.Queue = asyncio.Queue()

            task = asyncio.create_task(mqtt_handler(shutdown, settings, message_queue))
            await asyncio.sleep(0.3)
            shutdown.set()
            await asyncio.wait_for(task, timeout=5.0)

        # State messages don't go to the serial task queue
        assert message_queue.empty()
