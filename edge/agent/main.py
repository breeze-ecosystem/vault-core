#!/usr/bin/env python3
"""
Oversight Hub — Edge Agent (async entry point)

Runs as a single asyncio event loop with concurrent tasks for:
  - Serial I/O (OSDP door controllers via pyserial-asyncio)
  - MQTT pub/sub (aiomqtt to Mosquitto broker)
  - HTTP heartbeat, health reports, and update checks (aiohttp)
  - ONVIF WS-Discovery probe sender

Graceful lifecycle: SIGTERM/SIGINT → shutdown event → all tasks exit →
serial ports close → MQTT disconnects cleanly → process exits.
"""

from __future__ import annotations

import asyncio
import logging
import signal
import sys
import time

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S%z",
)
log = logging.getLogger("edge-agent")

START_TIME = time.monotonic()


async def main() -> None:
    """Async entry point: configure signal handlers, spawn tasks, wait."""
    shutdown = asyncio.Event()
    loop = asyncio.get_event_loop()

    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, shutdown.set)

    # Import config here so that missing env vars fail fast at import time
    from config import settings  # noqa: PLC0415

    site_id = settings.EDGE_SITE_ID
    log.info(
        "Edge Agent starting — site=%s  agent=%s  supervision=%s",
        site_id,
        settings.EDGE_AGENT_ID,
        settings.EDGE_SUPERVISION_URL,
    )

    # Shared message queue: serial readers → MQTT publisher
    message_queue: asyncio.Queue = asyncio.Queue(maxsize=settings.MQTT_BUFFER_MAXSIZE)

    # Build task list
    tasks: list[asyncio.Task] = []

    # ── Serial reader tasks (one per port) ──────────────────────
    from tasks.serial_task import serial_reader  # noqa: PLC0415

    for port in settings.serial_ports_list:
        tasks.append(
            asyncio.create_task(
                serial_reader(shutdown, port, settings.SERIAL_BAUD, message_queue),
                name=f"serial-{port}",
            )
        )

    # ── MQTT handler ────────────────────────────────────────────
    from tasks.mqtt_task import mqtt_handler  # noqa: PLC0415

    tasks.append(
        asyncio.create_task(
            mqtt_handler(shutdown, settings, message_queue),
            name="mqtt",
        )
    )

    # ── HTTP heartbeat ──────────────────────────────────────────
    from tasks.http_task import send_heartbeat  # noqa: PLC0415

    tasks.append(
        asyncio.create_task(
            send_heartbeat(shutdown, settings),
            name="heartbeat",
        )
    )

    # ── Health checks ───────────────────────────────────────────
    from services.metrics import run_health_checks  # noqa: PLC0415

    tasks.append(
        asyncio.create_task(
            run_health_checks(shutdown, settings),
            name="health-checks",
        )
    )

    # ── ONVIF discovery ─────────────────────────────────────────
    from services.onvif import onvif_discovery  # noqa: PLC0415

    tasks.append(
        asyncio.create_task(
            onvif_discovery(shutdown, settings),
            name="onvif-discovery",
        )
    )

    # ── OSDP protocol task ───────────────────────────────────────
    from tasks.osdp_task import osdp_task  # noqa: PLC0415

    tasks.append(
        asyncio.create_task(
            osdp_task(shutdown, settings, mqtt_handler, message_queue),
            name="osdp",
        )
    )

    # ── ONVIF provisioning task ──────────────────────────────────
    from tasks.onvif_task import onvif_task  # noqa: PLC0415

    tasks.append(
        asyncio.create_task(
            onvif_task(shutdown, settings),
            name="onvif-provision",
        )
    )

    log.info("Spawned %d tasks — entering event loop", len(tasks))

    try:
        await asyncio.gather(*tasks, return_exceptions=True)
    except Exception as exc:
        log.error("Unexpected error in gather: %s", exc)

    uptime = int(time.monotonic() - START_TIME)
    log.info("Edge Agent stopped — uptime=%ds", uptime)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log.info("Edge Agent stopped by user")
        sys.exit(0)
    except Exception as exc:
        log.critical("Edge Agent crashed: %s", exc, exc_info=True)
        sys.exit(1)
