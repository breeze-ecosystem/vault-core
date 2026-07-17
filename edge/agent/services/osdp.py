"""
Oversight Hub — Edge Agent OSDP Master Service
libosdp CP context management with asyncio compatibility.

Provides the ``OSDPMaster`` class that wraps a ``libosdp.OSDP`` control panel
(CP) context, managing one or more peripheral devices (PDs) on an RS-485 bus
connected via ``PySerialChannel``.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Callable

import libosdp  # type: ignore[import-untyped]

from services.osdp_channel import PySerialChannel

log = logging.getLogger("edge-agent")

# Map human-readable command names to libosdp Command constants
_COMMAND_MAP: dict[str, int] = {
    "lock": libosdp.Command.LOCK,
    "unlock": libosdp.Command.UNLOCK,
}


class OSDPMaster:
    """Manages a libosdp CP context with asyncio-compatible refresh loop.

    Creates one CP context per serial port. Discovers PDs on the bus,
    negotiates Secure Channel if supported by both sides, and forwards
    PD events (badge reads, door state changes, tamper alerts) to a
    registered callback for MQTT publication.
    """

    def __init__(self, device: str, baud: int) -> None:
        """Store configuration and prepare channel.

        Args:
            device: Serial device path (e.g., ``/dev/ttyUSB0``).
            baud: Baud rate for the serial connection.
        """
        self._device = device
        self._baud = baud
        self._channel = PySerialChannel(device, baud)
        self._pd_info: list = []
        self._osdp: libosdp.OSDP | None = None
        self._event_callback: Callable | None = None
        self._sc_enabled: bool = True
        self._scbk: bytes | None = None

    @property
    def device(self) -> str:
        """Return the serial device path."""
        return self._device

    def configure_sc(self, enabled: bool, scbk: str = "") -> None:
        """Configure Secure Channel settings.

        Args:
            enabled: Whether to attempt SC negotiation with PDs.
            scbk: 32-byte hex string for the Secure Channel Base Key.
        """
        self._sc_enabled = enabled
        if scbk:
            self._scbk = bytes.fromhex(scbk)

    def set_event_callback(self, callback: Callable) -> None:
        """Register a callback for OSDP PD events.

        The callback receives ``(pd_address: int, event_type: str, data: dict)``.
        """
        self._event_callback = callback

    async def connect(self) -> None:
        """Open the serial channel and initialise the libosdp CP context.

        Opens the PySerialChannel, then creates the libosdp OSDP context
        in CP mode. PD info entries are currently populated from a default
        scan range (addresses 0x01-0x7E) — future iterations will store
        persistent PD configurations.

        If ``_sc_enabled`` is set, SC flags and SCBK are included in PD
        info entries so libosdp attempts Secure Channel negotiation.
        """
        await self._channel.connect()

        # Build PD info list for a range of OSDP addresses
        self._pd_info = []
        for addr in range(1, 127):  # 0x01 to 0x7E
            flags = libosdp.Flag.SC if self._sc_enabled else 0
            pd_info = libosdp.PDInfo(
                address=addr,
                flags=flags,
                scbk=self._scbk if self._sc_enabled else b"",
            )
            pd_info.channel = self._channel
            self._pd_info.append(pd_info)

        try:
            self._osdp = libosdp.OSDP(self._pd_info, mode=libosdp.Mode.CP, on_event=self._on_event)
            log.info("OSDP: CP context created for %s (SC=%s)", self._device, self._sc_enabled)
        except Exception as exc:
            log.error("OSDP: failed to create CP context for %s — %s", self._device, exc)
            raise

    async def refresh(self) -> None:
        """Run the OSDP CP refresh cycle in an executor thread.

        Must be called at approximately 50ms intervals per OSDP timing
        requirements. Runs ``osdp.refresh()`` in the default executor to
        avoid blocking the asyncio event loop.
        """
        if self._osdp is None:
            return
        loop = asyncio.get_event_loop()
        try:
            await loop.run_in_executor(None, self._osdp.refresh)
        except Exception as exc:
            log.debug("OSDP: refresh error on %s — %s", self._device, exc)

    async def send_command(self, pd_address: int, command: str) -> None:
        """Send an OSDP command to a specific PD.

        Args:
            pd_address: OSDP address of the target PD (0x01-0x7E).
            command: Human-readable command name (``"lock"`` or ``"unlock"``).
        """
        if self._osdp is None:
            log.error("OSDP: cannot send command — CP context not initialised")
            return

        osdp_cmd = _COMMAND_MAP.get(command)
        if osdp_cmd is None:
            log.warning("OSDP: unknown command '%s' for PD 0x%02X", command, pd_address)
            return

        loop = asyncio.get_event_loop()
        try:
            await loop.run_in_executor(None, self._osdp.send_command, pd_address, osdp_cmd)
            log.info("OSDP: sent command '%s' to PD 0x%02X on %s", command, pd_address, self._device)
        except Exception as exc:
            log.error("OSDP: failed to send command to PD 0x%02X on %s — %s", pd_address, self._device, exc)

    def _on_event(self, pd_address: int, event: int, data: bytes) -> None:
        """Internal libosdp event callback.

        Maps raw libosdp events to structured dicts and forwards them
        to the registered ``_event_callback``.

        Args:
            pd_address: OSDP address that generated the event.
            event: libosdp Event enum value.
            data: Raw event payload bytes.
        """
        event_type = self._map_event_type(event)
        event_data: dict = {
            "pd_address": pd_address,
            "event_type": event_type,
        }

        if event == libosdp.Event.BADGE_READ:
            try:
                event_data["badge_number"] = data.decode("ascii").strip()
            except (UnicodeDecodeError, AttributeError):
                event_data["badge_number"] = data.hex() if data else ""
        elif event == libosdp.Event.DOOR_STATE:
            event_data["door_state"] = self._map_door_state(data)
        elif event == libosdp.Event.TAMPER:
            event_data["tampered"] = True

        log.debug(
            "OSDP: event from PD 0x%02X on %s — %s",
            pd_address,
            self._device,
            event_type,
        )

        if self._event_callback:
            try:
                self._event_callback(pd_address, event_type, event_data)
            except Exception as exc:
                log.error("OSDP: event callback error — %s", exc)

    def _map_event_type(self, event: int) -> str:
        """Map a libosdp Event value to a human-readable string."""
        if event == libosdp.Event.BADGE_READ:
            return "badge_read"
        if event == libosdp.Event.DOOR_STATE:
            return "door_state"
        if event == libosdp.Event.TAMPER:
            return "tamper"
        return f"unknown_{event}"

    def _map_door_state(self, data: bytes) -> str:
        """Map raw door state byte to human-readable state."""
        if not data:
            return "unknown"
        byte_val = data[0]
        if byte_val == 0x00:
            return "locked"
        if byte_val == 0x01:
            return "unlocked"
        if byte_val == 0x02:
            return "held_open"
        if byte_val == 0x03:
            return "forced"
        return f"state_0x{byte_val:02X}"

    async def close(self) -> None:
        """Close the serial channel and release resources."""
        if self._osdp is not None:
            self._osdp = None
        if self._channel is not None:
            await self._channel.close()
        log.info("OSDP: master closed for %s", self._device)
