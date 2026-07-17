"""
Oversight Hub — Edge Agent MQTT Task
Async MQTT pub/sub via aiomqtt with reconnect loop and bounded buffer.
"""

from __future__ import annotations

import asyncio
import json
import logging
import ssl
from collections import defaultdict

import aiomqtt

log = logging.getLogger("edge-agent")


def _build_tls_params(settings) -> aiomqtt.TLSParameters:
    """Build TLS parameters for aiomqtt from settings.

    Uses CA certificate only (no client cert per D-06). Produces a warning
    if the configured CA path may not exist.
    """
    return aiomqtt.TLSParameters(
        ca_certs=settings.MQTT_TLS_CA_CERT,
        certfile=None,
        keyfile=None,
        cert_reqs=ssl.CERT_REQUIRED,
    )


async def mqtt_handler(
    shutdown: asyncio.Event,
    settings,
    message_queue: asyncio.Queue,
) -> None:
    """Run aiomqtt client with automatic reconnect and bounded event buffer.

    Connects to the Mosquitto broker at ``settings.MQTT_BROKER_HOST:8883``
    with TLS + password auth. On disconnect, buffers outgoing events in an
    in-memory queue (maxsize=5000) and replays them on reconnect.

    Subscribes to door commands at ``site/{site_id}/door/+/cmd`` and routes
    incoming messages to the serial task.

    Sequence numbers are tracked per device for deduplication by the API's
    ``MqttService``.
    """
    tls_params = _build_tls_params(settings)
    site_id = settings.EDGE_SITE_ID
    buffer: asyncio.Queue = asyncio.Queue(maxsize=settings.MQTT_BUFFER_MAXSIZE)
    reconnect_interval = settings.MQTT_RECONNECT_INTERVAL

    # Per-device sequence number tracking for outgoing messages
    seq_numbers: defaultdict[str, int] = defaultdict(int)

    def next_seq(device_id: str) -> int:
        """Increment and return the next sequence number for *device_id*."""
        seq_numbers[device_id] += 1
        return seq_numbers[device_id]

    # ── Internal publish helpers ────────────────────────────────

    async def _publish(client: aiomqtt.Client, topic: str, payload: dict) -> None:
        """Publish a JSON-encoded message with QoS 1."""
        await client.publish(topic, payload=json.dumps(payload, default=str), qos=1)

    async def _buffer_or_publish(client: aiomqtt.Client | None, topic: str, payload: dict) -> None:
        """Publish directly if connected, otherwise buffer for replay."""
        if client is not None and not shutdown.is_set():
            try:
                await _publish(client, topic, payload)
            except aiomqtt.MqttError:
                # Connection dropped during publish — buffer instead
                await _buffer_message(topic, payload)
        else:
            await _buffer_message(topic, payload)

    async def _buffer_message(topic: str, payload: dict) -> None:
        """Add a message to the replay buffer, dropping oldest if full."""
        msg = json.dumps({"topic": topic, "payload": payload}, default=str)
        try:
            buffer.put_nowait(msg)
        except asyncio.QueueFull:
            # FIFO eviction: drop oldest message
            try:
                buffer.get_nowait()
            except asyncio.QueueEmpty:
                pass
            buffer.put_nowait(msg)
            log.warning("MQTT: buffer full — dropped oldest message")

    async def _drain_buffer(client: aiomqtt.Client) -> None:
        """Publish all buffered messages until the buffer is empty."""
        drained = 0
        while not buffer.empty() and not shutdown.is_set():
            try:
                msg = buffer.get_nowait()
                data = json.loads(msg)
                await _publish(client, data["topic"], data["payload"])
                drained += 1
            except (asyncio.QueueEmpty, json.JSONDecodeError, aiomqtt.MqttError):
                break
        if drained:
            log.info("MQTT: replayed %d buffered messages", drained)

    # ── Public helpers (imported by other modules) ──────────────

    async def publish_door_state(
        client: aiomqtt.Client | None,
        door_id: str,
        state: str,
    ) -> None:
        """Publish door state to ``site/{site_id}/door/{door_id}/state``."""
        topic = f"site/{site_id}/door/{door_id}/state"
        payload = {
            "device_id": door_id,
            "state": state,
            "sequence": next_seq(door_id),
        }
        await _buffer_or_publish(client, topic, payload)

    async def publish_badge_read(
        client: aiomqtt.Client | None,
        reader_id: str,
        badge_number: str,
    ) -> None:
        """Publish badge read to ``site/{site_id}/reader/{reader_id}/badge``."""
        topic = f"site/{site_id}/reader/{reader_id}/badge"
        payload = {
            "badge_number": badge_number,
            "device_id": reader_id,
            "sequence": next_seq(reader_id),
        }
        await _buffer_or_publish(client, topic, payload)

    async def publish_controller_health(
        client: aiomqtt.Client | None,
        controller_id: str,
        online: bool,
        uptime: int,
    ) -> None:
        """Publish controller health to ``site/{site_id}/controller/{controller_id}/health``."""
        topic = f"site/{site_id}/controller/{controller_id}/health"
        payload = {
            "controller_id": controller_id,
            "online": online,
            "uptime": uptime,
            "last_seen": "",
            "sequence": next_seq(controller_id),
        }
        await _buffer_or_publish(client, topic, payload)

    # ── Phase 2: OSDP publish helpers ────────────────────────────

    async def publish_osdp_event(
        client: aiomqtt.Client | None,
        door_id: str,
        event_type: str,
        badge_number: str | None = None,
        direction: str | None = None,
        tampered: bool = False,
        controller_serial: str | None = None,
    ) -> None:
        """Publish rich OSDP event to ``site/{site_id}/door/{door_id}/event``."""
        topic = f"site/{site_id}/door/{door_id}/event"
        payload = {
            "event_type": event_type,
            "door_id": door_id,
            "badge_number": badge_number,
            "direction": direction,
            "tampered": tampered,
            "controller_serial": controller_serial,
            "timestamp": "",
            "sequence": next_seq(door_id),
        }
        await _buffer_or_publish(client, topic, payload)

    async def publish_controller_discovery(
        client: aiomqtt.Client | None,
        controller_id: str,
        serial_number: str,
        manufacturer: str,
        model: str,
    ) -> None:
        """Publish controller discovery to ``site/{site_id}/controller/{controller_id}/discovery``."""
        topic = f"site/{site_id}/controller/{controller_id}/discovery"
        payload = {
            "controller_id": controller_id,
            "serial_number": serial_number,
            "manufacturer": manufacturer,
            "model": model,
            "timestamp": "",
            "sequence": next_seq(controller_id),
        }
        await _buffer_or_publish(client, topic, payload)

    async def publish_onvif_event(
        client: aiomqtt.Client | None,
        camera_id: str,
        event_type: str,
        details: dict | None = None,
    ) -> None:
        """Publish ONVIF event to ``site/{site_id}/onvif/{camera_id}/event``."""
        topic = f"site/{site_id}/onvif/{camera_id}/event"
        payload = {
            "event_type": event_type,
            "camera_id": camera_id,
            "details": details or {},
            "timestamp": "",
            "sequence": next_seq(camera_id),
        }
        await _buffer_or_publish(client, topic, payload)

    # Store helpers on the module so tasks can use them
    mqtt_handler.publish_door_state = publish_door_state  # type: ignore[attr-defined]
    mqtt_handler.publish_badge_read = publish_badge_read  # type: ignore[attr-defined]
    mqtt_handler.publish_controller_health = publish_controller_health  # type: ignore[attr-defined]
    mqtt_handler.publish_osdp_event = publish_osdp_event  # type: ignore[attr-defined]
    mqtt_handler.publish_controller_discovery = publish_controller_discovery  # type: ignore[attr-defined]
    mqtt_handler.publish_onvif_event = publish_onvif_event  # type: ignore[attr-defined]
    # Expose the buffer so main.py can access it if needed
    mqtt_handler.buffer = buffer  # type: ignore[attr-defined]

    # ── Main reconnect loop ─────────────────────────────────────

    while not shutdown.is_set():
        log.info(
            "MQTT: connecting to %s:%d",
            settings.MQTT_BROKER_HOST,
            settings.MQTT_BROKER_PORT,
        )

        try:
            async with aiomqtt.Client(
                hostname=settings.MQTT_BROKER_HOST,
                port=settings.MQTT_BROKER_PORT,
                username=settings.MQTT_USERNAME or None,
                password=settings.MQTT_PASSWORD or None,
                tls_params=tls_params,
            ) as client:
                log.info("MQTT: connected")

                # Drain any buffered messages from a previous disconnection
                await _drain_buffer(client)

                # Subscribe to door commands from the API
                cmd_topic = f"site/{site_id}/door/+/cmd"
                await client.subscribe(cmd_topic, qos=1)
                log.info("MQTT: subscribed to %s", cmd_topic)

                # Enter message loop
                async with client.messages() as messages:
                    async for message in messages:
                        if shutdown.is_set():
                            break

                        try:
                            payload = json.loads(message.payload.decode())
                        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
                            log.warning("MQTT: invalid message on %s — %s", message.topic, exc)
                            continue

                        log.debug(
                            "MQTT: received on %s — %s",
                            message.topic,
                            json.dumps(payload, default=str)[:200],
                        )

                        # Route: door command → serial task via message_queue
                        if message.topic.endswith("/cmd"):
                            try:
                                message_queue.put_nowait(("door_cmd", message.topic, payload))
                            except asyncio.QueueFull:
                                log.warning(
                                    "MQTT: serial message queue full — dropping cmd for %s",
                                    message.topic,
                                )

        except aiomqtt.MqttError as exc:
            if shutdown.is_set():
                break
            log.warning(
                "MQTT: connection error — %s (reconnecting in %ds)",
                exc,
                reconnect_interval,
            )
            await asyncio.sleep(reconnect_interval)
        except Exception as exc:
            log.error("MQTT: unexpected error — %s", exc, exc_info=True)
            if shutdown.is_set():
                break
            await asyncio.sleep(reconnect_interval)

    log.info("MQTT: handler stopped")
