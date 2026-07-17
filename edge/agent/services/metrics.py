"""
Oversight Hub — Edge Agent Metrics Service
System metrics, Docker service status, and application health checks.

Extracted from the original agent.py with minimal changes — these functions
remain synchronous and are called via asyncio-compatible paths from the
HTTP task.
"""

from __future__ import annotations

import logging
import shutil
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

log = logging.getLogger("edge-agent")

BACKUP_DIR = Path("/backup")

# ── System metrics ──────────────────────────────────────────────


def system_metrics() -> dict:
    """Collect CPU, RAM and disk usage.

    Reads from ``/proc/stat`` and ``/proc/meminfo`` for CPU and memory,
    ``shutil.disk_usage`` for disk.
    """
    metrics: dict = {"cpu": 0.0, "ram": 0.0, "disk": 0.0, "ramTotal": 0, "ramUsed": 0}

    try:
        # CPU %
        with open("/proc/stat") as f:
            line = f.readline()
        parts = [int(x) for x in line.split()[1:]]
        idle = parts[3]
        total = sum(parts)
        time.sleep(0.1)
        with open("/proc/stat") as f:
            line2 = f.readline()
        parts2 = [int(x) for x in line2.split()[1:]]
        idle2 = parts2[3]
        total2 = sum(parts2)
        diff_idle = idle2 - idle
        diff_total = total2 - total
        if diff_total > 0:
            metrics["cpu"] = round((1 - diff_idle / diff_total) * 100, 1)
    except Exception:
        pass

    try:
        # Memory
        info = {}
        with open("/proc/meminfo") as f:
            for line in f:
                k, v = line.split(":", 1)
                info[k.strip()] = int(v.split()[0])
        mem_total = info.get("MemTotal", 0)
        mem_available = info.get("MemAvailable", 0)
        mem_used = mem_total - mem_available
        metrics["ramTotal"] = mem_total
        metrics["ramUsed"] = mem_used
        if mem_total > 0:
            metrics["ram"] = round(mem_used / mem_total * 100, 1)
    except Exception:
        pass

    try:
        # Disk
        usage = shutil.disk_usage("/")
        if usage.total > 0:
            metrics["disk"] = round(usage.used / usage.total * 100, 1)
    except Exception:
        pass

    return metrics


# ── Service status ──────────────────────────────────────────────


def service_status(cfg) -> dict:
    """Return a dict of service_name → running(bool).

    ``cfg`` can be a ``Settings`` object (which has ``services`` as a property
    or dict-like attribute) or a plain dict.  We look for service names under
    the following fixed keys.
    """
    # Default service container names (mirrors DEFAULT_CONFIG.services)
    service_map = {
        "api": "oversight-api",
        "dashboard": "oversight-dashboard",
        "ollama": "ollama",
        "go2rtc": "go2rtc",
        "postgres": "oversight-postgres",
        "redis": "oversight-redis",
    }

    # Allow override via settings object (look for a services dict or attr)
    if hasattr(cfg, "services"):
        svc = cfg.services
        if isinstance(svc, dict):
            service_map.update(svc)
    elif isinstance(cfg, dict):
        svc = cfg.get("services", {})
        if isinstance(svc, dict):
            service_map.update(svc)

    from services.docker import container_running  # noqa: PLC0415

    status: dict = {}
    for key, container_name in service_map.items():
        status[key] = container_running(container_name)
    return status


# ── Ollama health & auto-restart ────────────────────────────────

_ollama_fail_count: int = 0


def check_ollama_health(cfg) -> None:
    """Health-check Ollama and auto-restart after 3 consecutive failures."""
    global _ollama_fail_count

    from services.docker import container_running, exec_in_container, restart_container  # noqa: PLC0415

    # Get the configured Ollama container name
    ollama_container = "ollama"
    if hasattr(cfg, "ollama_container"):
        ollama_container = cfg.ollama_container

    if not container_running(ollama_container):
        _ollama_fail_count += 1
        log.warning("Ollama container not running (fail %d/3)", _ollama_fail_count)
    else:
        exit_code, output = exec_in_container(ollama_container, ["ollama", "list"])
        if exit_code == 0:
            _ollama_fail_count = 0
            return
        _ollama_fail_count += 1
        log.warning("Ollama health check failed — exit %d: %s", exit_code, output[:200])

    if _ollama_fail_count >= 3:
        log.warning("Ollama has failed %d consecutive checks — restarting", _ollama_fail_count)
        restarted = restart_container(ollama_container)
        if restarted:
            _ollama_fail_count = 0


# ── Backup ──────────────────────────────────────────────────────


def backup_postgres(cfg) -> None:
    """Run pg_dump via docker exec and rotate old backups."""
    from services.docker import exec_in_container  # noqa: PLC0415

    container_name = "oversight-postgres"
    if hasattr(cfg, "postgres_container"):
        container_name = cfg.postgres_container
    retention_days = 7

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    now = datetime.now(timezone.utc)
    filename = f"oversight-pg-{now.strftime('%Y%m%d-%H%M%S')}.sql.gz"
    filepath = BACKUP_DIR / filename

    log.info("Starting PostgreSQL backup → %s", filepath)

    # Run pg_dump inside the container, gzip locally
    exit_code, output = exec_in_container(
        container_name,
        ["pg_dump", "-U", "postgres", "oversight"],
    )

    if exit_code != 0:
        log.error("pg_dump failed (exit %d): %s", exit_code, output[:500])
        return

    try:
        import gzip as gzip_mod

        with gzip_mod.open(filepath, "wb") as f:
            f.write(output.encode("utf-8", errors="replace"))
        size_kb = filepath.stat().st_size / 1024
        log.info("Backup complete — %.1f KB → %s", size_kb, filename)
    except Exception as exc:
        log.error("Failed to write backup file: %s", exc)
        return

    # --- rotate old backups ---
    cutoff = now - timedelta(days=retention_days)
    for old_file in BACKUP_DIR.glob("oversight-pg-*.sql.gz"):
        try:
            mtime = datetime.fromtimestamp(old_file.stat().st_mtime, tz=timezone.utc)
            if mtime < cutoff:
                old_file.unlink()
                log.info("Removed old backup: %s", old_file.name)
        except Exception as exc:
            log.warning("Failed to remove old backup %s: %s", old_file.name, exc)


# ── Health-check runner ─────────────────────────────────────────


def run_health_checks_sync(cfg) -> dict:
    """Run health checks synchronously for all services.

    Returns a dict of service_name → running(bool). This is the sync variant
    called from ``_post_health_report`` via ``asyncio.to_thread`` or directly.
    """
    statuses = service_status(cfg)
    for svc, ok in statuses.items():
        if not ok:
            log.warning("Service %s is NOT running", svc)
    check_ollama_health(cfg)
    return statuses


async def run_health_checks(shutdown: asyncio.Event, settings) -> None:  # noqa: F811
    """Periodic health check loop for all services.

    Runs at ``settings.HEALTH_CHECK_INTERVAL`` intervals and calls the
    sync health checks via the event loop executor.
    """
    import asyncio  # noqa: PLC0415 — already imported at module top but
    # we need the full import for the next line

    loop = asyncio.get_event_loop()
    while not shutdown.is_set():
        await asyncio.sleep(settings.HEALTH_CHECK_INTERVAL)
        if shutdown.is_set():
            break
        await loop.run_in_executor(None, run_health_checks_sync, settings)
        await asyncio.sleep(0)  # Yield control
