"""
Oversight Hub — Edge Agent Docker Service
Docker SDK wrapper for container health checks and management.
"""

from __future__ import annotations

import logging

log = logging.getLogger("edge-agent")


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
