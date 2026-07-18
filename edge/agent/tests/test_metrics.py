"""
Tests for edge/agent/services/metrics.py — system metrics and service status.

Metrics tests run with real /proc filesystem (available in CI Docker containers).
Service status tests mock Docker to test graceful degradation.
"""

from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from services.metrics import run_health_checks_sync, service_status, system_metrics


class TestSystemMetricsStructure:
    """system_metrics() returns a dict with expected keys."""

    def test_returns_dict_with_required_keys(self) -> None:
        metrics = system_metrics()
        assert isinstance(metrics, dict)
        assert "cpu" in metrics
        assert "ram" in metrics
        assert "disk" in metrics
        assert "ramTotal" in metrics
        assert "ramUsed" in metrics

    def test_cpu_is_float(self) -> None:
        metrics = system_metrics()
        assert isinstance(metrics["cpu"], float)

    def test_ram_is_float(self) -> None:
        metrics = system_metrics()
        assert isinstance(metrics["ram"], float)

    def test_disk_is_float(self) -> None:
        metrics = system_metrics()
        assert isinstance(metrics["disk"], float)

    def test_ram_usage_consistent(self) -> None:
        """ramUsed should not exceed ramTotal (unless /proc/meminfo is weird)."""
        metrics = system_metrics()
        if metrics["ramTotal"] > 0:
            assert metrics["ramUsed"] <= metrics["ramTotal"]
            assert metrics["ram"] >= 0.0

    def test_values_are_non_negative(self) -> None:
        metrics = system_metrics()
        assert metrics["cpu"] >= 0.0
        assert metrics["ram"] >= 0.0
        assert metrics["disk"] >= 0.0
        assert metrics["ramTotal"] >= 0
        assert metrics["ramUsed"] >= 0


class TestServiceStatus:
    """service_status() handles Docker unavailability gracefully."""

    def test_returns_status_dict(self) -> None:
        """Service status always returns a dict, even when Docker is down."""
        cfg = MagicMock()
        cfg.services = {}

        # service_status imports container_running from services.docker at call time.
        # Patch at the source to always return False (Docker unavailable).
        with patch("services.docker.container_running", return_value=False):
            status = service_status(cfg)

        assert isinstance(status, dict)
        # All default services should be listed
        expected_services = {"api", "dashboard", "ollama", "go2rtc", "postgres", "redis"}
        assert expected_services.issubset(status.keys())

    def test_returns_false_when_docker_unavailable(self) -> None:
        """When Docker is unavailable, all services return False."""
        cfg = MagicMock()
        cfg.services = {}

        with patch("services.docker.container_running", return_value=False):
            status = service_status(cfg)

        for service_name, running in status.items():
            assert running is False, f"{service_name} should be False when Docker is unavailable"

    def test_cfg_services_overrides_defaults(self) -> None:
        """A 'services' dict in cfg overrides the default service map."""
        cfg = MagicMock()
        cfg.services = {"custom-app": "custom-container"}

        with patch("services.docker.container_running", return_value=True):
            status = service_status(cfg)

        assert "custom-app" in status

    def test_cfg_as_dict(self) -> None:
        """service_status also accepts a plain dict."""
        cfg: dict[str, Any] = {"services": {"my-svc": "my-container"}}

        with patch("services.docker.container_running", return_value=True):
            status = service_status(cfg)

        assert "my-svc" in status
        assert status["my-svc"] is True


class TestRunHealthChecksSync:
    """run_health_checks_sync() orchestrates service checks."""

    def test_returns_status_dict(self) -> None:
        cfg = MagicMock()
        cfg.services = {}

        with patch("services.docker.container_running", return_value=False):
            with patch("services.metrics.check_ollama_health"):
                status = run_health_checks_sync(cfg)

        assert isinstance(status, dict)

    def test_calls_check_ollama_health(self) -> None:
        cfg = MagicMock()
        cfg.services = {}

        with patch("services.docker.container_running", return_value=False):
            with patch("services.metrics.check_ollama_health") as mock_ollama:
                run_health_checks_sync(cfg)

        mock_ollama.assert_called_once_with(cfg)

    def test_logs_warning_for_down_services(self) -> None:
        cfg = MagicMock()
        cfg.services = {}

        with patch("services.docker.container_running", return_value=False):
            with patch("services.metrics.check_ollama_health"):
                with patch("services.metrics.log.warning") as mock_log:
                    run_health_checks_sync(cfg)

        # Should log at least one warning for a down service
        assert mock_log.call_count >= 1
