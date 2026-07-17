"""
Oversight Hub — Edge Agent ONVIF Discovery Service
Async ONVIF WS-Discovery multicast probe sender.

Sends WS-Discovery ``Probe`` messages on the ONVIF standard multicast
address (239.255.255.50:3702) and collects ``ProbeMatches`` responses
from ONVIF-compatible cameras on the local network.
"""

from __future__ import annotations

import asyncio
import logging
import socket
import struct

log = logging.getLogger("edge-agent")

MCAST_GROUP = "239.255.255.50"
MCAST_PORT = 3702
MCAST_TTL = 4

# SOAP/WS-Discovery Probe message for NetworkVideoTransmitter (ONVIF cameras)
_PROBE_TEMPLATE = """\
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope
    xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
    xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing"
    xmlns:wsd="http://schemas.xmlsoap.org/ws/2005/04/discovery"
    xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
  <soap:Header>
    <wsa:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</wsa:Action>
    <wsa:MessageID>urn:uuid:{uuid}</wsa:MessageID>
    <wsa:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</wsa:To>
  </soap:Header>
  <soap:Body>
    <wsd:Probe>
      <wsd:Types>dn:NetworkVideoTransmitter</wsd:Types>
    </wsd:Probe>
  </soap:Body>
</soap:Envelope>"""


async def onvif_discovery(shutdown: asyncio.Event, settings) -> None:
    """Periodically send WS-Discovery probes on the local network.

    Creates a UDP multicast socket, sends a ``wsd:Probe`` for ONVIF
    ``NetworkVideoTransmitter`` devices, collects ``ProbeMatches`` responses,
    and POSTs discovered cameras to the supervision API.

    Runs at ``settings.ONVIF_DISCOVERY_INTERVAL`` seconds.
    """
    import uuid  # noqa: PLC0415

    log.info("ONVIF: discovery service started (interval=%ds)", settings.ONVIF_DISCOVERY_INTERVAL)

    sock = None
    try:
        # Create a UDP socket for multicast
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, struct.pack("b", MCAST_TTL))
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.settimeout(5.0)  # Blocking recv timeout — we use asyncio for the loop

        # Bind to receive multicast responses
        sock.bind(("", MCAST_PORT))

        # Join the ONVIF multicast group
        mreq = struct.pack("4sl", socket.inet_aton(MCAST_GROUP), socket.INADDR_ANY)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)
    except Exception as exc:
        log.error("ONVIF: failed to create multicast socket — %s", exc)
        if sock:
            sock.close()
        return

    log.info("ONVIF: listening on %s:%d for ProbeMatches", MCAST_GROUP, MCAST_PORT)

    # First probe immediately, then at configured intervals
    while not shutdown.is_set():
        await _send_probe(sock, settings)
        await asyncio.sleep(settings.ONVIF_DISCOVERY_INTERVAL)

    # Cleanup
    try:
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_DROP_MEMBERSHIP, mreq)
    except Exception:
        pass
    sock.close()
    log.info("ONVIF: discovery service stopped")


async def _send_probe(sock: socket.socket, settings) -> None:
    """Send a WS-Discovery Probe and collect responses."""
    import uuid  # noqa: PLC0415

    probe_msg = _PROBE_TEMPLATE.format(uuid=str(uuid.uuid4()))
    loop = asyncio.get_event_loop()

    try:
        # Send probe via multicast (run in executor since socket is blocking)
        await loop.run_in_executor(
            None,
            sock.sendto,
            probe_msg.encode("utf-8"),
            (MCAST_GROUP, MCAST_PORT),
        )
        log.debug("ONVIF: sent Probe for NetworkVideoTransmitter")
    except Exception as exc:
        log.warning("ONVIF: failed to send Probe — %s", exc)
        return

    # Collect responses for up to 3 seconds
    deadline = time.monotonic() + 3.0
    discovered: list[dict] = []

    while time.monotonic() < deadline:
        try:
            data, addr = await loop.run_in_executor(None, sock.recvfrom, 65535)
            ip = addr[0]
            # Basic parsing: extract key fields from XML response
            response = data.decode("utf-8", errors="replace")
            camera_info = _parse_probe_match(response, ip)
            if camera_info:
                discovered.append(camera_info)
                log.info("ONVIF: discovered camera at %s (%s %s)", ip, camera_info["manufacturer"], camera_info["model"])
        except socket.timeout:
            break
        except Exception as exc:
            log.debug("ONVIF: response parse error — %s", exc)
            continue

    if discovered:
        # POST discovered cameras to the supervision API
        await _report_discovered(discovered, settings)
    else:
        log.debug("ONVIF: no cameras discovered this cycle")


def _parse_probe_match(xml: str, ip: str) -> dict | None:
    """Minimal XML parsing of a WS-Discovery ProbeMatch response.

    Extracts manufacturer, model, XAddrs, and Scopes from the SOAP response.
    Uses simple string matching (not a full XML parser) to keep dependencies
    minimal. Phase 2 may replace this with a proper SOAP/XML library.

    Returns a dict suitable for ``OnvifCameraPayload``, or ``None`` if the
    response does not contain camera-relevant data.
    """
    import re  # noqa: PLC0415

    if "ProbeMatches" not in xml and "NetworkVideoTransmitter" not in xml:
        return None

    # Extract XAddrs (device URLs)
    xaddrs: list[str] = []
    xa_match = re.findall(r"<wsa:XAddrs>([^<]+)</wsa:XAddrs>", xml)
    if xa_match:
        xaddrs = [x.strip() for x in xa_match[0].split() if x.strip()]

    # Extract Scopes (device metadata)
    scopes: list[str] = []
    sc_match = re.findall(r"<wsd:Scopes>([^<]+)</wsd:Scopes>", xml)
    if sc_match:
        scopes = [s.strip() for s in sc_match[0].split() if s.strip()]

    # Extract manufacturer and model from scopes
    manufacturer = "Unknown"
    model = "Unknown"
    for scope in scopes:
        if "hardware/" in scope:
            model = scope.rsplit("/", 1)[-1]
        if "manufacturer/" in scope:
            manufacturer = scope.rsplit("/", 1)[-1]

    # Build RTSP URL from XAddrs if available
    rtsp_url: str | None = None
    for addr in xaddrs:
        if addr.startswith("rtsp://"):
            rtsp_url = addr
            break

    return {
        "ip": ip,
        "manufacturer": manufacturer,
        "model": model,
        "rtsp_url": rtsp_url,
        "xaddrs": xaddrs,
        "scopes": scopes,
    }


async def _report_discovered(discovered: list[dict], settings) -> None:
    """POST discovered cameras to the supervision API."""
    import json  # noqa: PLC0415
    import aiohttp  # noqa: PLC0415

    supervision_url: str = settings.EDGE_SUPERVISION_URL.rstrip("/")
    url = f"{supervision_url}/api/supervision/cameras/discover"

    headers = {"Content-Type": "application/json"}
    if settings.EDGE_AGENT_SECRET:
        headers["Authorization"] = f"Bearer {settings.EDGE_AGENT_SECRET}"

    try:
        async with aiohttp.ClientSession(headers=headers) as session:
            async with session.post(url, json=discovered, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                log.info("ONVIF: reported %d cameras — status %d", len(discovered), resp.status)
    except Exception as exc:
        log.error("ONVIF: failed to report discovered cameras — %s", exc)


# Import needed for the time module used in _send_probe
import time  # noqa: E402


# ── ONVIF Camera Provisioning ────────────────────────────────────────────


async def provision_camera(ip: str, port: int, username: str, password: str) -> dict | None:
    """Query an ONVIF camera for full device information and capabilities.

    Uses ``onvif-zeep`` in an executor thread to call:
      - ``GetDeviceInformation()`` — manufacturer, model, serial, firmware
      - ``GetCapabilities()`` — feature support (PTZ, Events)
      - ``create_media_service().GetProfiles()`` — profile tokens
      - ``GetStreamUri()`` — RTSP stream URL

    Args:
        ip: Camera IP address.
        port: Camera ONVIF port (typically 80).
        username: ONVIF user name.
        password: ONVIF password.

    Returns:
        Dict with keys: manufacturer, model, serial_number, firmware_version,
        rtsp_url, profiles, has_ptz, has_events, ip, onvif_port, site_group.
        Returns ``None`` if provisioning fails.
    """
    loop = asyncio.get_event_loop()

    def _query() -> dict | None:
        """Synchronous ONVIF query run in executor thread."""
        try:
            from onvif import ONVIFCamera  # noqa: PLC0415
        except ImportError:
            log.error("ONVIF: onvif-zeep not installed — cannot provision camera")
            return None

        try:
            cam = ONVIFCamera(ip, port, username, password)
        except Exception as exc:
            log.warning("ONVIF: failed to connect to %s:%d — %s", ip, port, exc)
            return None

        try:
            info = cam.devicemgmt.GetDeviceInformation()
        except Exception as exc:
            log.warning("ONVIF: GetDeviceInformation failed for %s:%d — %s", ip, port, exc)
            return None

        try:
            caps = cam.devicemgmt.GetCapabilities()
        except Exception as exc:
            log.warning("ONVIF: GetCapabilities failed for %s:%d — %s", ip, port, exc)
            caps = None

        # Check for PTZ and Events support in capabilities string
        caps_str = str(caps) if caps else ""
        has_ptz = "PTZ" in caps_str
        has_events = "Events" in caps_str

        # Get media profiles and stream URI
        profiles: list[str] = []
        rtsp_url: str | None = None
        try:
            media_service = cam.create_media_service()
            profile_objs = media_service.GetProfiles()
            for p in profile_objs:
                token = getattr(p, "token", "") or ""
                if token:
                    profiles.append(token)

            if profiles:
                stream_uri = media_service.GetStreamUri({
                    "StreamSetup": {
                        "Stream": "RTP-Unicast",
                        "Transport": {"Protocol": "RTSP"},
                    },
                    "ProfileToken": profiles[0],
                })
                rtsp_url = getattr(stream_uri, "Uri", None)
        except Exception as exc:
            log.debug("ONVIF: media service query failed for %s:%d — %s", ip, port, exc)

        # D-03: Extract location/site metadata from GetDeviceInformation
        # Some manufacturers include a Location field; fallback to "default"
        site_group = "default"
        try:
            location = getattr(info, "Location", None)
            if location:
                site_group = str(location).strip()
        except Exception:
            pass

        return {
            "manufacturer": getattr(info, "Manufacturer", "Unknown"),
            "model": getattr(info, "Model", "Unknown"),
            "serial_number": getattr(info, "SerialNumber", ""),
            "firmware_version": getattr(info, "FirmwareVersion", ""),
            "rtsp_url": rtsp_url or "",
            "profiles": profiles,
            "has_ptz": has_ptz,
            "has_events": has_events,
            "ip": ip,
            "onvif_port": port,
            "site_group": site_group,
        }

    return await loop.run_in_executor(None, _query)


async def probe_ptz_capabilities(
    ip: str,
    port: int,
    username: str,
    password: str,
    profile_token: str,
) -> dict:
    """Probe ONVIF PTZ capabilities for a camera profile.

    Creates a PTZ service and probes for absolute/continuous/relative
    move support and preset availability.

    Args:
        ip: Camera IP address.
        port: Camera ONVIF port.
        username: ONVIF user name.
        password: ONVIF password.
        profile_token: Media profile token to probe.

    Returns:
        Dict with boolean keys: has_absolute_move, has_continuous_move,
        has_relative_move, has_presets.
    """
    loop = asyncio.get_event_loop()

    def _probe() -> dict:
        """Synchronous PTZ probe run in executor thread."""
        result = {
            "has_absolute_move": False,
            "has_continuous_move": False,
            "has_relative_move": False,
            "has_presets": False,
        }

        try:
            from onvif import ONVIFCamera  # noqa: PLC0415
        except ImportError:
            log.error("ONVIF: onvif-zeep not installed — cannot probe PTZ")
            return result

        try:
            cam = ONVIFCamera(ip, port, username, password)
            ptz = cam.create_ptz_service()

            # PTZ service object has methods; check for supported operations
            # by inspecting the service's binding methods
            ptz_methods = dir(ptz)

            result["has_absolute_move"] = "AbsoluteMove" in ptz_methods
            result["has_continuous_move"] = "ContinuousMove" in ptz_methods
            result["has_relative_move"] = "RelativeMove" in ptz_methods

            # Probe presets by calling GetPresets — if it fails, no presets
            try:
                presets = ptz.GetPresets({"ProfileToken": profile_token})
                result["has_presets"] = len(presets) > 0
            except Exception:
                result["has_presets"] = False

        except Exception as exc:
            log.debug("ONVIF: PTZ probe failed for %s:%d — %s", ip, port, exc)

        return result

    return await loop.run_in_executor(None, _probe)


async def subscribe_onvif_events(
    ip: str,
    port: int,
    username: str,
    password: str,
    profile_token: str,
    pullpoint_url: str,
    callback: callable,
) -> asyncio.Task | None:
    """Subscribe to ONVIF PullPoint events with automatic renew loop.

    Creates an asyncio Task that manages a PullPointSubscription for
    the camera, calling ``PullMessages()`` periodically and renewing
    the subscription before it expires.

    Args:
        ip: Camera IP address.
        port: Camera ONVIF port.
        username: ONVIF user name.
        password: ONVIF password.
        profile_token: Media profile token to subscribe.
        pullpoint_url: PullPoint URL (empty string for auto-discovery).
        callback: Async callback receiving ``(event_type: str, details: dict)``.

    Returns:
        An ``asyncio.Task`` running the event loop, or ``None`` if
        subscription setup fails.
    """
    try:
        from onvif import ONVIFCamera  # noqa: PLC0415
    except ImportError:
        log.error("ONVIF: onvif-zeep not installed — cannot subscribe to events")
        return None

    loop = asyncio.get_event_loop()

    def _create_subscription():
        """Synchronous subscription creation in executor thread."""
        try:
            cam = ONVIFCamera(ip, port, username, password)
            events = cam.create_events_service()

            # Create PullPoint subscription
            subscription = events.CreatePullPointSubscription({
                "ProfileToken": profile_token,
            })
            return cam, events, subscription
        except Exception as exc:
            log.warning("ONVIF: event subscription failed for %s:%d — %s", ip, port, exc)
            return None

    result = await loop.run_in_executor(None, _create_subscription)
    if result is None:
        return None

    cam, events, subscription = result

    # Extract the subscription reference and timeout
    sub_ref = None
    initial_timeout = 600  # Default 10 minutes
    try:
        sub_ref = subscription.SubscriptionReference
        if hasattr(subscription, "CurrentTimeout"):
            from datetime import timedelta  # noqa: PLC0415
            timeout = subscription.CurrentTimeout
            if isinstance(timeout, timedelta):
                initial_timeout = int(timeout.total_seconds())
    except Exception:
        pass

    async def _event_loop():
        """Async event loop running PullMessages and renew."""
        timeout = initial_timeout
        renew_interval = max(timeout // 2, 30)  # Renew at half the timeout
        last_renew = loop.time()

        while not asyncio.get_event_loop().is_closed():
            try:
                # Pull messages
                pull_result = await loop.run_in_executor(
                    None,
                    lambda: events.PullMessages({
                        "SubscriptionReference": sub_ref,
                        "MessageLimit": 10,
                        "Timeout": "PT10S",
                    }) if sub_ref else None,
                )

                if pull_result:
                    # Process received events
                    notifications = getattr(pull_result, "NotificationMessage", [])
                    for notification in notifications:
                        try:
                            event_type = "unknown"
                            details = {}

                            # Extract event properties
                            source = getattr(notification, "Source", None)
                            if source:
                                details["source"] = str(source)

                            data = getattr(notification, "Data", None)
                            if data:
                                details["data"] = str(data)

                            property_ = getattr(notification, "Property", None)
                            if property_:
                                details["property"] = str(property_)

                            # Determine event type from topic
                            topic = getattr(notification, "Topic", None)
                            if topic:
                                topic_str = str(topic)
                                details["topic"] = topic_str
                                if "Motion" in topic_str:
                                    event_type = "motion"
                                elif "Tamper" in topic_str or "tamper" in topic_str:
                                    event_type = "tamper"
                                elif "VideoLoss" in topic_str:
                                    event_type = "video_loss"
                                elif "LineCrossing" in topic_str:
                                    event_type = "line_crossing"
                                elif "Intrusion" in topic_str:
                                    event_type = "intrusion"
                                elif "PresetReached" in topic_str:
                                    event_type = "preset_reached"

                            if callback:
                                await callback(event_type, details)
                        except Exception as exc:
                            log.debug("ONVIF: event processing error — %s", exc)

                # Renew subscription at half the timeout interval
                elapsed = loop.time() - last_renew
                if elapsed >= renew_interval and sub_ref:
                    try:
                        await loop.run_in_executor(
                            None,
                            lambda: events.Renew({
                                "SubscriptionReference": sub_ref,
                            }),
                        )
                        last_renew = loop.time()
                        log.debug("ONVIF: renewed event subscription for %s:%d", ip, port)
                    except Exception as exc:
                        log.warning(
                            "ONVIF: subscription renew failed for %s:%d — %s",
                            ip, port, exc,
                        )

            except asyncio.CancelledError:
                break
            except Exception as exc:
                log.debug("ONVIF: PullMessages error for %s:%d — %s", ip, port, exc)

            await asyncio.sleep(10)  # Pull interval

    task = asyncio.get_event_loop().create_task(_event_loop())
    log.info("ONVIF: event subscription active for %s:%d (timeout=%ds)", ip, port, initial_timeout)
    return task
