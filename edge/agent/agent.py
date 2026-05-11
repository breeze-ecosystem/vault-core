#!/usr/bin/env python3
"""
Oversight Hub — Edge Agent
Monitors the local edge server and reports to the central supervision platform.
"""

from __future__ import annotations

import json
import logging
import os
import shutil
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
import schedule

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S%z",
)
log = logging.getLogger("edge-agent")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
CONFIG_PATH = os.environ.get("EDGE_CONFIG_PATH", "/app/edge.config.json")
BACKUP_DIR = Path(os.environ.get("EDGE_BACKUP_DIR", "/backup"))
START_TIME = time.monotonic()

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DEFAULT_CONFIG: dict = {
    "clientId": "edge-unknown",
    "tier": "edge",
    "supervisionUrl": "http://localhost:8080",
    "heartbeatInterval": 60,
    "healthCheckInterval": 30,
    "updateCheckIntervalHours": 6,
    "backupHour": 2,
    "backupRetentionDays": 7,
    "registry": "ghcr.io/nousresearch/oversight-hub",
    "currentDigest": "",
    "services": {
        "api": "oversight-api",
        "dashboard": "oversight-dashboard",
        "ollama": "ollama",
        "go2rtc": "go2rtc",
        "postgres": "oversight-postgres",
        "redis": "oversight-redis",
    },
}

_config: dict = {}


def load_config() -> dict:
    """Load configuration from JSON file, then overlay environment variables."""
    cfg = dict(DEFAULT_CONFIG)

    # --- file config ---
    try:
        with open(CONFIG_PATH, "r") as fh:
            file_cfg = json.load(fh)
            cfg.update(file_cfg)
            log.info("Loaded config from %s", CONFIG_PATH)
    except FileNotFoundError:
        log.warning("Config file %s not found — using defaults", CONFIG_PATH)
    except json.JSONDecodeError as exc:
        log.error("Invalid JSON in config file: %s", exc)

    # --- environment variable overrides ---
    env_map = {
        "EDGE_CLIENT_ID": "clientId",
        "EDGE_TIER": "tier",
        "EDGE_SUPERVISION_URL": "supervisionUrl",
        "EDGE_HEARTBEAT_INTERVAL": ("heartbeatInterval", int),
        "EDGE_HEALTH_CHECK_INTERVAL": ("healthCheckInterval", int),
        "EDGE_UPDATE_CHECK_INTERVAL_HOURS": ("updateCheckIntervalHours", int),
        "EDGE_BACKUP_HOUR": ("backupHour", int),
        "EDGE_BACKUP_RETENTION_DAYS": ("backupRetentionDays", int),
        "EDGE_REGISTRY": "registry",
        "EDGE_CURRENT_DIGEST": "currentDigest",
    }
    for env_key, cfg_key in env_map.items():
        val = os.environ.get(env_key)
        if val is not None:
            if isinstance(cfg_key, tuple):
                cfg_key, caster = cfg_key
                try:
                    val = caster(val)
                except (ValueError, TypeError):
                    log.warning("Cannot cast env %s=%r — skipping", env_key, val)
                    continue
            cfg[cfg_key] = val

    return cfg


# ---------------------------------------------------------------------------
# Docker helpers
# ---------------------------------------------------------------------------
def _docker_client():
    """Return a Docker client, or None if Docker is unavailable."""
    try:
        import docker  # type: ignore
        return docker.from_env()
    except Exception as exc:
        log.error("Docker client unavailable: %s", exc)
        return None


def container_running(name: str) -> bool:
    """Return True if a Docker container with *name* is running."""
    client = _docker_client()
    if client is None:
        return False
    try:
        c = client.containers.get(name)
        return c.status == "running"
    except Exception:
        return False


def restart_container(name: str) -> bool:
    """Attempt to restart a Docker container. Returns True on success."""
    client = _docker_client()
    if client is None:
        return False
    try:
        c = client.containers.get(name)
        c.restart(timeout=30)
        log.info("Restarted container %s", name)
        return True
    except Exception as exc:
        log.error("Failed to restart container %s: %s", name, exc)
        return False


def exec_in_container(name: str, cmd: list[str]) -> tuple[int, str]:
    """Execute *cmd* inside container *name*. Returns (exit_code, output)."""
    client = _docker_client()
    if client is None:
        return -1, "docker unavailable"
    try:
        c = client.containers.get(name)
        exit_code, output = c.exec_run(cmd, demux=True)
        stdout = (output[0] or b"").decode("utf-8", errors="replace")
        stderr = (output[1] or b"").decode("utf-8", errors="replace")
        return exit_code, stdout + stderr
    except Exception as exc:
        return -1, str(exc)


# ---------------------------------------------------------------------------
# System metrics
# ---------------------------------------------------------------------------
def system_metrics() -> dict:
    """Collect CPU, RAM and disk usage."""
    metrics: dict = {"cpu": 0.0, "ram": 0.0, "disk": 0.0, "ramTotal": 0, "ramUsed": 0}

    try:
        # CPU %
        with open("/proc/stat", "r") as f:
            line = f.readline()
        parts = [int(x) for x in line.split()[1:]]
        idle = parts[3]
        total = sum(parts)
        time.sleep(0.1)
        with open("/proc/stat", "r") as f:
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
        with open("/proc/meminfo", "r") as f:
            for line in f:
                k, v = line.split(":", 1)
                info[k.strip()] = int(v.split()[0])
        total = info.get("MemTotal", 0)
        available = info.get("MemAvailable", 0)
        used = total - available
        metrics["ramTotal"] = total
        metrics["ramUsed"] = used
        if total > 0:
            metrics["ram"] = round(used / total * 100, 1)
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


def service_status(cfg: dict) -> dict:
    """Return a dict of service_name → running(bool)."""
    services_cfg: dict = cfg.get("services", {})
    status: dict = {}
    for key, container_name in services_cfg.items():
        status[key] = container_running(container_name)
    return status


# ---------------------------------------------------------------------------
# Ollama health & auto-restart
# ---------------------------------------------------------------------------
_ollama_fail_count: int = 0


def check_ollama_health(cfg: dict) -> None:
    """Health-check Ollama and auto-restart after 3 consecutive failures."""
    global _ollama_fail_count

    container_name = cfg.get("services", {}).get("ollama", "ollama")

    if not container_running(container_name):
        _ollama_fail_count += 1
        log.warning("Ollama container not running (fail %d/3)", _ollama_fail_count)
    else:
        exit_code, output = exec_in_container(container_name, ["ollama", "list"])
        if exit_code == 0:
            _ollama_fail_count = 0
            return
        _ollama_fail_count += 1
        log.warning("Ollama health check failed — exit %d: %s", exit_code, output[:200])

    if _ollama_fail_count >= 3:
        log.warning("Ollama has failed %d consecutive checks — restarting", _ollama_fail_count)
        restarted = restart_container(container_name)
        if restarted:
            _ollama_fail_count = 0


# ---------------------------------------------------------------------------
# Heartbeat
# ---------------------------------------------------------------------------
def send_heartbeat(cfg: dict) -> None:
    """POST heartbeat payload to the supervision API."""
    supervision_url: str = cfg.get("supervisionUrl", "").rstrip("/")
    url = f"{supervision_url}/api/heartbeat"
    uptime = int(time.monotonic() - START_TIME)

    payload = {
        "clientId": cfg.get("clientId", "edge-unknown"),
        "tier": cfg.get("tier", "edge"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime": uptime,
        "system": system_metrics(),
        "services": service_status(cfg),
        "cameraStats": _camera_stats(),
        "alertStats": {"last24h": _alert_count_24h()},
    }

    try:
        with httpx.Client(timeout=10) as client:
            resp = client.post(url, json=payload)
            log.info("Heartbeat sent — status %d", resp.status_code)
    except httpx.ConnectError:
        log.error("Heartbeat failed — cannot connect to %s", url)
    except httpx.TimeoutException:
        log.error("Heartbeat failed — timeout contacting %s", url)
    except Exception as exc:
        log.error("Heartbeat failed: %s", exc)


# ---------------------------------------------------------------------------
# Camera / alert stubs — replace with real implementations
# ---------------------------------------------------------------------------
def _camera_stats() -> dict:
    """Return {total, online, offline}. Override with real camera data."""
    # TODO: query local API for real camera data
    return {"total": 0, "online": 0, "offline": 0}


def _alert_count_24h() -> int:
    """Return number of alerts in the last 24 hours."""
    # TODO: query local API for real alert data
    return 0


# ---------------------------------------------------------------------------
# Update check
# ---------------------------------------------------------------------------
def check_for_updates(cfg: dict) -> None:
    """Compare current image digest with latest from registry."""
    registry: str = cfg.get("registry", "")
    current_digest: str = cfg.get("currentDigest", "")

    if not registry or not current_digest:
        log.debug("Update check skipped — registry or currentDigest not configured")
        return

    tag = "latest"
    token_url = f"https://ghcr.io/token?service=ghcr.io&scope=repository:{registry}:pull"
    manifest_url = f"https://ghcr.io/v2/{registry}/manifests/{tag}"

    try:
        with httpx.Client(timeout=15) as client:
            # Obtain token
            token_resp = client.get(token_url)
            token_resp.raise_for_status()
            token = token_resp.json().get("token", "")

            # Fetch manifest
            headers = {
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.oci.image.index.v1+json, "
                          "application/vnd.docker.distribution.manifest.v2+json",
            }
            manifest_resp = client.get(manifest_url, headers=headers)
            manifest_resp.raise_for_status()

            latest_digest = manifest_resp.headers.get(
                "docker-content-digest", ""
            ) or manifest_resp.json().get("config", {}).get("digest", "")

            if not latest_digest:
                log.warning("Could not determine latest digest from registry")
                return

            if latest_digest == current_digest:
                log.info("No update available — running latest image")
            else:
                log.warning(
                    "Update available! current=%s latest=%s — manual pull required",
                    current_digest[:24],
                    latest_digest[:24],
                )

    except httpx.HTTPStatusError as exc:
        log.error("Update check HTTP error: %s", exc.response.status_code)
    except Exception as exc:
        log.error("Update check failed: %s", exc)


# ---------------------------------------------------------------------------
# PostgreSQL backup
# ---------------------------------------------------------------------------
def backup_postgres(cfg: dict) -> None:
    """Run pg_dump via docker exec and rotate old backups."""
    container_name = cfg.get("services", {}).get("postgres", "oversight-postgres")
    retention_days: int = cfg.get("backupRetentionDays", 7)

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    now = datetime.now(timezone.utc)
    filename = f"oversight-pg-{now.strftime('%Y%m%d-%H%M%S')}.sql.gz"
    filepath = BACKUP_DIR / filename

    log.info("Starting PostgreSQL backup → %s", filepath)

    # Run pg_dump inside the container, gzip locally
    exit_code, output = exec_in_container(
        container_name, ["pg_dump", "-U", "postgres", "oversight"]
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


# ---------------------------------------------------------------------------
# Health-check runner (all services + ollama-specific logic)
# ---------------------------------------------------------------------------
def run_health_checks(cfg: dict) -> None:
    """Periodic health check for all services."""
    statuses = service_status(cfg)
    for svc, ok in statuses.items():
        if not ok:
            log.warning("Service %s is NOT running", svc)
    check_ollama_health(cfg)


# ---------------------------------------------------------------------------
# Scheduler setup
# ---------------------------------------------------------------------------
def setup_schedule(cfg: dict) -> None:
    """Register all recurring jobs."""
    heartbeat_sec = cfg.get("heartbeatInterval", 60)
    health_sec = cfg.get("healthCheckInterval", 30)
    update_hours = cfg.get("updateCheckIntervalHours", 6)
    backup_hour = cfg.get("backupHour", 2)

    schedule.every(heartbeat_sec).seconds.do(send_heartbeat, cfg=cfg)
    schedule.every(health_sec).seconds.do(run_health_checks, cfg=cfg)
    schedule.every(update_hours).hours.do(check_for_updates, cfg=cfg)
    schedule.every().day.at(f"{backup_hour:02d}:00").do(backup_postgres, cfg=cfg)

    log.info(
        "Schedule configured — heartbeat:%ds  health:%ds  update:%dh  backup:%02d:00",
        heartbeat_sec, health_sec, update_hours, backup_hour,
    )


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------
def main() -> None:
    global _config
    log.info("Oversight Hub Edge Agent starting")

    _config = load_config()
    log.info(
        "Config — clientId=%s  tier=%s  supervision=%s",
        _config.get("clientId"),
        _config.get("tier"),
        _config.get("supervisionUrl"),
    )

    setup_schedule(_config)

    # Fire an immediate heartbeat so the supervisor knows we're alive
    send_heartbeat(_config)

    log.info("Entering main loop — Ctrl+C to stop")
    while True:
        try:
            schedule.run_pending()
        except Exception as exc:
            log.error("Unhandled error in scheduler tick: %s", exc)
        time.sleep(1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log.info("Edge Agent stopped by user")
        sys.exit(0)
    except Exception as exc:
        log.critical("Edge Agent crashed: %s", exc, exc_info=True)
        sys.exit(1)
