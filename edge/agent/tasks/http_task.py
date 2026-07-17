"""
Oversight Hub — Edge Agent HTTP Task
Async HTTP heartbeat, health reports, and update checks via aiohttp.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from datetime import datetime, timezone

import aiohttp

log = logging.getLogger("edge-agent")

_START_TIME = time.monotonic()


# ── Camera / alert stubs (same structure as existing agent) ─────
def _camera_stats() -> dict:
    """Return {total, online, offline}. Override with real camera data."""
    return {"total": 0, "online": 0, "offline": 0}


def _alert_count_24h() -> int:
    """Return number of alerts in the last 24 hours."""
    return 0


# ── Heartbeat ───────────────────────────────────────────────────
async def send_heartbeat(shutdown: asyncio.Event, settings) -> None:
    """POST heartbeat payload to the supervision API at regular intervals.

    Mirrors the payload structure of the current synchronous agent's
    ``send_heartbeat()`` — the API expects the same shape.
    """
    supervision_url: str = settings.EDGE_SUPERVISION_URL.rstrip("/")
    url = f"{supervision_url}/api/heartbeat"
    headers = _auth_headers(settings)
    timeout = aiohttp.ClientTimeout(total=10)

    async with aiohttp.ClientSession(headers=headers) as session:
        # Fire an immediate heartbeat on startup
        await _post_heartbeat(session, url, settings, timeout)

        while not shutdown.is_set():
            await asyncio.sleep(settings.HEARTBEAT_INTERVAL)
            if shutdown.is_set():
                break
            await _post_heartbeat(session, url, settings, timeout)


async def _post_heartbeat(
    session: aiohttp.ClientSession,
    url: str,
    settings,
    timeout: aiohttp.ClientTimeout,
) -> None:
    """Build and POST the heartbeat payload."""
    from services.metrics import service_status, system_metrics  # noqa: PLC0415

    uptime = int(time.monotonic() - _START_TIME)

    payload = {
        "clientId": settings.EDGE_AGENT_ID,
        "tier": "edge",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime": uptime,
        "system": system_metrics(),
        "services": service_status(settings),
        "cameraStats": _camera_stats(),
        "alertStats": {"last24h": _alert_count_24h()},
    }

    try:
        async with session.post(url, json=payload, timeout=timeout) as resp:
            log.info("Heartbeat sent — status %d", resp.status)
    except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
        log.error("Heartbeat failed: %s", exc)


# ── Health report ───────────────────────────────────────────────
async def send_health_report(shutdown: asyncio.Event, settings) -> None:
    """POST health check report to the supervision API.

    Collects Docker container statuses and system metrics, then posts them
    to the API's supervision report endpoint.
    """
    supervision_url: str = settings.EDGE_SUPERVISION_URL.rstrip("/")
    url = f"{supervision_url}/api/supervision/report"
    headers = _auth_headers(settings)
    timeout = aiohttp.ClientTimeout(total=10)

    async with aiohttp.ClientSession(headers=headers) as session:
        while not shutdown.is_set():
            await asyncio.sleep(settings.HEALTH_CHECK_INTERVAL)
            if shutdown.is_set():
                break
            await _post_health_report(session, url, settings, timeout)


async def _post_health_report(
    session: aiohttp.ClientSession,
    url: str,
    settings,
    timeout: aiohttp.ClientTimeout,
) -> None:
    """Build and POST health report payload."""
    from services.metrics import run_health_checks_sync  # noqa: PLC0415

    statuses = run_health_checks_sync(settings)
    for svc, ok in statuses.items():
        if not ok:
            log.warning("Health: service %s is NOT running", svc)

    try:
        async with session.post(url, json=statuses, timeout=timeout) as resp:
            log.info("Health report sent — status %d", resp.status)
    except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
        log.error("Health report failed: %s", exc)


# ── Update check ────────────────────────────────────────────────
async def check_for_updates(shutdown: asyncio.Event, settings) -> None:
    """Compare current image digest with latest from container registry.

    Async port of the current synchronous ``check_for_updates()`` function.
    Uses ``aiohttp`` instead of ``httpx`` for all HTTP calls.
    """
    # Note: registry config is not yet in settings — this is preserved for
    # future use when update-check interval and registry are configured.
    _ = shutdown, settings
    log.debug("Update check: not configured — skipping")


def _auth_headers(settings) -> dict[str, str]:
    """Build authorization headers for API requests."""
    headers: dict[str, str] = {}
    if settings.EDGE_AGENT_SECRET:
        headers["Authorization"] = f"Bearer {settings.EDGE_AGENT_SECRET}"
    return headers
