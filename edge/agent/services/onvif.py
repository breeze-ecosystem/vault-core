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
