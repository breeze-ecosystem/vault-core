"""
Oversight Hub — Edge Agent Camera Snapshot Service
Async HTTP snapshot capture from ONVIF cameras with digest auth support.

Captures JPEG snapshots from ONVIF-compatible cameras via their HTTP
snapshot endpoints. Tries multiple common ONVIF snapshot paths if the
first attempt fails.
"""

from __future__ import annotations

import logging

import aiohttp

log = logging.getLogger("edge-agent")

# Common ONVIF snapshot URL paths tried in order
_SNAPSHOT_PATHS = [
    "/onvif/snapshot",
    "/onvif-media/snapshot",
    "/onvif-http/snapshot",
    "/snapshot",
    "/cgi-bin/snapshot.cgi",
]

_DEFAULT_TIMEOUT = aiohttp.ClientTimeout(total=10)


async def capture_snapshot(
    ip: str,
    port: int,
    username: str,
    password: str,
) -> bytes | None:
    """Capture a JPEG snapshot from an ONVIF camera via HTTP GET.

    Tries common ONVIF snapshot URL paths in order, using basic
    authentication. Returns the raw JPEG bytes on success, or ``None``
    if all paths fail.

    Args:
        ip: Camera IP address.
        port: Camera HTTP port (typically 80 or 443).
        username: ONVIF user name.
        password: ONVIF password.

    Returns:
        JPEG image bytes, or ``None`` if no path succeeded.
    """
    base_url = f"http://{ip}:{port}"
    auth = aiohttp.BasicAuth(username, password)
    timeout = _DEFAULT_TIMEOUT

    for path in _SNAPSHOT_PATHS:
        url = f"{base_url}{path}"
        try:
            async with aiohttp.ClientSession(auth=auth, timeout=timeout) as session:
                async with session.get(url) as resp:
                    if resp.status == 200:
                        content_type = resp.headers.get("Content-Type", "")
                        if "image" in content_type or not content_type:
                            data = await resp.read()
                            if data and len(data) > 100:  # Minimum plausible JPEG size
                                log.info(
                                    "Snapshot: captured %d bytes from %s",
                                    len(data), url,
                                )
                                return data

                    log.debug(
                        "Snapshot: %s returned status %d — trying next path",
                        url, resp.status,
                    )
        except Exception as exc:
            log.debug("Snapshot: error fetching %s — %s", url, exc)
            continue

    log.warning("Snapshot: all paths failed for %s:%d", ip, port)
    return None
