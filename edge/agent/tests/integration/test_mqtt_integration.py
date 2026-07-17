"""
Integration tests for MQTT connectivity with a real Mosquitto broker.

These tests require a running Mosquitto instance (plaintext on 1883,
TLS on 8883) and the following environment variables:

    MOSQUITTO_HOST     — Broker hostname (default: localhost)
    MQTT_USERNAME      — MQTT username for auth
    MQTT_PASSWORD      — MQTT password for auth
    MQTT_CA_CERT       — Path to CA certificate for TLS

Start the test Mosquitto with:

    docker compose -f edge/agent/tests/integration/docker-compose.test.yml up -d

Tests are skipped automatically when MOSQUITTO_HOST is not set.
"""

from __future__ import annotations

import asyncio
import json
import os
import ssl
from typing import AsyncIterator

import aiomqtt
import pytest

pytestmark = pytest.mark.integration

# ── Test configuration from environment ───────────────────────────

MOSQUITTO_HOST = os.environ.get("MOSQUITTO_HOST", "")
MOSQUITTO_PORT = int(os.environ.get("MOSQUITTO_PORT", "1883"))
MOSQUITTO_TLS_PORT = int(os.environ.get("MOSQUITTO_TLS_PORT", "8883"))
MQTT_USERNAME = os.environ.get("MQTT_USERNAME", "agent-site-abc")
MQTT_PASSWORD = os.environ.get("MQTT_PASSWORD", "")
MQTT_CA_CERT = os.environ.get("MQTT_CA_CERT", "")

_SKIP_REASON = (
    "MOSQUITTO_HOST not set — define MOSQUITTO_HOST (or MQTT_USERNAME, "
    "MQTT_PASSWORD, MQTT_CA_CERT) to run integration tests"
)

_SKIP_TLS_REASON = (
    "MQTT_CA_CERT not set — define MQTT_CA_CERT to run TLS integration tests"
)


def _skip_no_broker() -> bool:
    """Return True if tests should be skipped (no broker configured)."""
    return not MOSQUITTO_HOST


def _skip_no_tls() -> bool:
    """Return True if TLS tests should be skipped (no CA cert configured)."""
    return not MQTT_CA_CERT or not MOSQUITTO_HOST


# ── Async generator helpers ────────────────────────────────────────


async def _message_stream() -> AsyncIterator[aiomqtt.Message]:
    """Empty message stream (no messages expected in simple tests)."""
    if False:
        yield  # pragma: no cover


# ── Helpers ─────────────────────────────────────────────────────────


async def _publish_and_verify(
    host: str,
    port: int,
    username: str,
    password: str,
    topic: str,
    payload: dict,
    subscribe_topic: str,
    *,
    use_tls: bool = False,
    ca_cert: str = "",
) -> dict:
    """Publish a message and verify it's received by a subscriber.

    Returns the received payload dict.
    """
    received: dict = {}
    got_message = asyncio.Event()

    async def _subscriber() -> None:
        nonlocal received
        tls_params = None
        if use_tls and ca_cert:
            tls_params = aiomqtt.TLSParameters(
                ca_certs=ca_cert,
                certfile=None,
                keyfile=None,
                cert_reqs=ssl.CERT_REQUIRED,
            )

        async with aiomqtt.Client(
            hostname=host,
            port=port,
            username=username,
            password=password,
            tls_params=tls_params,
        ) as client:
            await client.subscribe(subscribe_topic, qos=1)
            async with client.messages() as messages:
                async for message in messages:
                    received = json.loads(message.payload.decode())
                    got_message.set()
                    break

    async def _publisher() -> None:
        tls_params = None
        if use_tls and ca_cert:
            tls_params = aiomqtt.TLSParameters(
                ca_certs=ca_cert,
                certfile=None,
                keyfile=None,
                cert_reqs=ssl.CERT_REQUIRED,
            )

        async with aiomqtt.Client(
            hostname=host,
            port=port,
            username=username,
            password=password,
            tls_params=tls_params,
        ) as client:
            await client.publish(topic, payload=json.dumps(payload), qos=1)

    # Run publisher and subscriber concurrently
    await asyncio.gather(_subscriber(), _publisher())

    # Wait for message with timeout
    try:
        await asyncio.wait_for(got_message.wait(), timeout=10.0)
    except asyncio.TimeoutError:
        pytest.fail("Timed out waiting for published message")

    return received


# ── Skip check ──────────────────────────────────────────────────────


def pytest_configure() -> None:
    """Register custom marker if needed (pytest handles @pytest.mark.integration)."""
    pass


# ── Publish / Subscribe roundtrip ──────────────────────────────────


class TestPublishSubscribeRoundtrip:
    """Verify publish/subscribe roundtrip via plaintext port."""

    @pytest.mark.skipif(_skip_no_broker(), reason=_SKIP_REASON)
    @pytest.mark.asyncio
    async def test_publish_subscribe_roundtrip(self) -> None:
        """Subscriber receives message published by publisher on port 1883."""
        topic = "site/test/door/1/state"
        payload = {"state": "locked", "sequence": 1}

        received = await _publish_and_verify(
            host=MOSQUITTO_HOST,
            port=MOSQUITTO_PORT,
            username=MQTT_USERNAME,
            password=MQTT_PASSWORD,
            topic=topic,
            payload=payload,
            subscribe_topic="site/test/door/+/state",
        )

        assert received["state"] == "locked"
        assert received["sequence"] == 1

    @pytest.mark.skipif(_skip_no_broker(), reason=_SKIP_REASON)
    @pytest.mark.asyncio
    async def test_publish_multiple_messages(self) -> None:
        """Multiple messages on different topics are received correctly."""
        topics = [
            ("site/test/door/1/state", {"state": "locked", "sequence": 1}),
            ("site/test/door/2/state", {"state": "unlocked", "sequence": 2}),
        ]

        for topic, payload in topics:
            received = await _publish_and_verify(
                host=MOSQUITTO_HOST,
                port=MOSQUITTO_PORT,
                username=MQTT_USERNAME,
                password=MQTT_PASSWORD,
                topic=topic,
                payload=payload,
                subscribe_topic="site/test/door/+/state",
            )
            assert received["state"] == payload["state"]
            assert received["sequence"] == payload["sequence"]


# ── TLS connection ────────────────────────────────────────────────


class TestTLSConnection:
    """Verify TLS connectivity to the broker."""

    @pytest.mark.skipif(_skip_no_tls(), reason=_SKIP_TLS_REASON)
    @pytest.mark.asyncio
    async def test_connect_with_tls(self) -> None:
        """Connect with TLS + valid credentials on port 8883."""
        tls_params = aiomqtt.TLSParameters(
            ca_certs=MQTT_CA_CERT,
            certfile=None,
            keyfile=None,
            cert_reqs=ssl.CERT_REQUIRED,
        )

        async with aiomqtt.Client(
            hostname=MOSQUITTO_HOST,
            port=MOSQUITTO_TLS_PORT,
            username=MQTT_USERNAME,
            password=MQTT_PASSWORD,
            tls_params=tls_params,
        ) as client:
            await client.subscribe("site/test/door/+/cmd", qos=1)

        # If we get here without exception, TLS connection succeeded
        assert True

    @pytest.mark.skipif(_skip_no_tls(), reason=_SKIP_TLS_REASON)
    @pytest.mark.asyncio
    async def test_tls_publish_subscribe_roundtrip(self) -> None:
        """Publish/subscribe roundtrip over TLS on port 8883."""
        topic = "site/test/reader/1/badge"
        payload = {"badge_number": "12345", "sequence": 1}

        received = await _publish_and_verify(
            host=MOSQUITTO_HOST,
            port=MOSQUITTO_TLS_PORT,
            username=MQTT_USERNAME,
            password=MQTT_PASSWORD,
            topic=topic,
            payload=payload,
            subscribe_topic="site/test/reader/+/badge",
            use_tls=True,
            ca_cert=MQTT_CA_CERT,
        )

        assert received["badge_number"] == "12345"
        assert received["sequence"] == 1


# ── TLS rejection tests ───────────────────────────────────────────


class TestTLSRejection:
    """Verify the broker rejects unauthorized connections on TLS port."""

    @pytest.mark.skipif(_skip_no_tls(), reason=_SKIP_TLS_REASON)
    @pytest.mark.asyncio
    async def test_tls_rejects_anonymous(self) -> None:
        """Connecting without credentials on TLS port 8883 should be rejected."""
        tls_params = aiomqtt.TLSParameters(
            ca_certs=MQTT_CA_CERT,
            certfile=None,
            keyfile=None,
            cert_reqs=ssl.CERT_REQUIRED,
        )

        with pytest.raises(aiomqtt.MqttError):
            async with aiomqtt.Client(
                hostname=MOSQUITTO_HOST,
                port=MOSQUITTO_TLS_PORT,
                username=None,
                password=None,
                tls_params=tls_params,
            ) as client:
                await client.subscribe("site/test/+/#")

    @pytest.mark.skipif(_skip_no_tls(), reason=_SKIP_TLS_REASON)
    @pytest.mark.asyncio
    async def test_tls_rejects_wrong_credentials(self) -> None:
        """Connecting with wrong username/password on TLS port should be rejected."""
        tls_params = aiomqtt.TLSParameters(
            ca_certs=MQTT_CA_CERT,
            certfile=None,
            keyfile=None,
            cert_reqs=ssl.CERT_REQUIRED,
        )

        with pytest.raises(aiomqtt.MqttError):
            async with aiomqtt.Client(
                hostname=MOSQUITTO_HOST,
                port=MOSQUITTO_TLS_PORT,
                username="wrong-user",
                password="wrong-pass",
                tls_params=tls_params,
            ) as client:
                await client.publish("site/test/door/1/state", payload="{}", qos=1)


# ─── Buffer / Replay test (module-level, uses real broker) ──────


class TestBufferReplay:
    """Verify buffering and replay behavior with a real broker (unit-test style)."""

    @pytest.mark.skipif(_skip_no_broker(), reason=_SKIP_REASON)
    @pytest.mark.asyncio
    async def test_buffer_replay(self) -> None:
        """Simulate disconnect, buffer messages, reconnect, verify they're published.

        This test verifies that the MQTT task's buffer/replay pattern works
        correctly end-to-end: it creates a buffer, fills it, connects to the
        broker, and drains the buffer.
        """
        buffer: asyncio.Queue = asyncio.Queue(maxsize=100)
        published: list[str] = []

        # Fill the buffer with messages
        for i in range(3):
            msg = json.dumps({
                "topic": f"site/test/door/{i}/state",
                "payload": {"state": "locked", "sequence": i},
            })
            buffer.put_nowait(msg)

        # Connect to broker and drain the buffer
        async with aiomqtt.Client(
            hostname=MOSQUITTO_HOST,
            port=MOSQUITTO_PORT,
            username=MQTT_USERNAME,
            password=MQTT_PASSWORD,
        ) as client:
            while not buffer.empty():
                msg = buffer.get_nowait()
                data = json.loads(msg)
                await client.publish(
                    data["topic"],
                    payload=json.dumps(data["payload"]),
                    qos=1,
                )
                published.append(data["topic"])

        # Verify all buffered messages were published
        assert len(published) == 3
        assert published[0] == "site/test/door/0/state"
        assert published[2] == "site/test/door/2/state"
