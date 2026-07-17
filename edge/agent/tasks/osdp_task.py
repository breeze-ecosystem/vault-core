"""
Oversight Hub — Edge Agent OSDP Task
Asyncio task managing libosdp CP contexts for OSDP door controllers.

Creates one OSDPMaster per serial port, runs the 50ms CP refresh loop,
routes OSDP events to MQTT publish helpers, and dispatches door commands
received from the message queue.
"""

from __future__ import annotations

import asyncio
import logging

from services.osdp import OSDPMaster

log = logging.getLogger("edge-agent")


async def osdp_task(
    shutdown: asyncio.Event,
    settings,
    mqtt_handler,
    message_queue: asyncio.Queue,
) -> None:
    """Run OSDP CP instances for each configured serial port.

    Creates one ``OSDPMaster`` per serial port listed in
    ``settings.serial_ports_list``. Each master manages a libosdp CP
    context that discovers PDs on the RS-485 bus, negotiates Secure
    Channel (if configured), and forwards PD events to MQTT.

    The main refresh loop runs at 50ms intervals to meet OSDP timing
    requirements. Incoming door commands from the message queue are
    dispatched to the appropriate PD.

    Args:
        shutdown: Event signalling graceful shutdown.
        settings: Edge Agent Settings instance with OSDP/ONVIF config.
        mqtt_handler: Module with ``publish_osdp_event``,
            ``publish_door_state``, and ``publish_controller_discovery``
            helpers registered.
        message_queue: Shared asyncio.Queue receiving ``("door_cmd", ...)``
            messages from the MQTT handler.
    """
    # Check if OSDP publish helpers are registered
    has_osdp_publish = hasattr(mqtt_handler, "publish_osdp_event")

    # Build per-PD address to serial port mapping (populated during connect)
    pd_to_master: dict[int, OSDPMaster] = {}
    pd_to_door_id: dict[int, str] = {}

    # Create masters for each configured serial port
    masters: list[OSDPMaster] = []
    for port in settings.serial_ports_list:
        master = OSDPMaster(port, settings.SERIAL_BAUD)
        # Configure SC from settings if available
        if hasattr(settings, "OSDP_SC_ENABLED"):
            master.configure_sc(
                enabled=settings.OSDP_SC_ENABLED,
                scbk=getattr(settings, "OSDP_SCBK", ""),
            )

        # Set event callback for MQTT publication
        def make_callback(dev: str, m: OSDPMaster) -> callable:
            """Create closure capturing master and device for event routing."""
            async def on_event(pd_address: int, event_type: str, data: dict) -> None:
                await _handle_osdp_event(
                    mqtt_handler, has_osdp_publish, settings,
                    dev, pd_address, event_type, data, pd_to_door_id,
                )
            return on_event

        master.set_event_callback(make_callback(port, master))

        try:
            await master.connect()
            masters.append(master)
            log.info("OSDP: master initialised for %s", port)
        except Exception as exc:
            log.error("OSDP: failed to initialise master for %s — %s", port, exc)
            continue

    if not masters:
        log.warning("OSDP: no masters initialised — OSDP task idle")
        # Wait for shutdown without consuming CPU
        await shutdown.wait()
        return

    log.info("OSDP: task running with %d master(s)", len(masters))

    # ── Main refresh loop ──────────────────────────────────────
    try:
        while not shutdown.is_set():
            # Refresh all masters (50ms OSDP timing requirement)
            for master in masters:
                await master.refresh()

            # Check for incoming door commands from MQTT
            try:
                msg_type, topic, payload = message_queue.get_nowait()
                if msg_type == "door_cmd":
                    await _dispatch_door_command(
                        payload, masters, pd_to_master, pd_to_door_id,
                    )
            except (ValueError, asyncio.QueueEmpty):
                pass

            await asyncio.sleep(0.05)  # 50ms — OSDP timing requirement

    finally:
        # Clean shutdown: close all masters
        for master in masters:
            await master.close()
        log.info("OSDP: task stopped")


async def _handle_osdp_event(
    mqtt_handler,
    has_osdp_publish: bool,
    settings,
    device: str,
    pd_address: int,
    event_type: str,
    data: dict,
    pd_to_door_id: dict[int, str],
) -> None:
    """Route an OSDP event to the appropriate MQTT publish helper."""
    if not has_osdp_publish:
        log.debug("OSDP: event from PD 0x%02X on %s (%s) — no MQTT helper", pd_address, device, event_type)
        return

    if event_type == "door_state":
        door_id = pd_to_door_id.get(pd_address, f"pd-0x{pd_address:02X}")
        state = data.get("door_state", "unknown")
        try:
            await mqtt_handler.publish_door_state(None, door_id, state)
        except Exception as exc:
            log.error("OSDP: failed to publish door state — %s", exc)

    elif event_type == "badge_read":
        door_id = pd_to_door_id.get(pd_address, f"pd-0x{pd_address:02X}")
        badge_number = data.get("badge_number", "")
        try:
            await mqtt_handler.publish_badge_read(None, door_id, badge_number)
        except Exception as exc:
            log.error("OSDP: failed to publish badge read — %s", exc)

    elif event_type == "tamper":
        door_id = pd_to_door_id.get(pd_address, f"pd-0x{pd_address:02X}")
        try:
            await mqtt_handler.publish_osdp_event(
                None,
                door_id,
                event_type="tamper",
                tampered=True,
            )
        except Exception as exc:
            log.error("OSDP: failed to publish tamper event — %s", exc)

    # Also publish generic OSDP event if the publish_osdp_event helper exists
    try:
        door_id = pd_to_door_id.get(pd_address, f"pd-0x{pd_address:02X}")
        await mqtt_handler.publish_osdp_event(
            None,
            door_id,
            event_type=event_type,
            badge_number=data.get("badge_number"),
            direction=data.get("direction"),
            tampered=data.get("tampered", False),
        )
    except Exception:
        pass  # Generic event publishing is best-effort


async def _dispatch_door_command(
    payload: dict,
    masters: list[OSDPMaster],
    pd_to_master: dict[int, OSDPMaster],
    pd_to_door_id: dict[int, str],
) -> None:
    """Dispatch a door command from MQTT to the appropriate OSDP PD.

    Parses door_id and command from the MQTT payload, looks up the
    associated PD address and master, and sends the OSDP command.
    """
    door_id = payload.get("door_id", "")
    command = payload.get("command", "")

    if not door_id or command not in ("lock", "unlock"):
        log.warning("OSDP: invalid door command payload — %s", payload)
        return

    # Find PD address from door_id mapping (reverse lookup)
    pd_address = None
    for addr, did in pd_to_door_id.items():
        if did == door_id:
            pd_address = addr
            break

    if pd_address is None:
        log.warning("OSDP: no PD found for door %s — command dropped", door_id)
        return

    # Find the master that manages this PD
    master = pd_to_master.get(pd_address)
    if master is None:
        log.warning("OSDP: no master for PD 0x%02X — command dropped", pd_address)
        return

    await master.send_command(pd_address, command)
