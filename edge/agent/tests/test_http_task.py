"""
Tests for edge/agent/tasks/http_task.py — async HTTP heartbeat, health reports.

All tests use mocked I/O (aiohttp, docker) — no real HTTP connections.
"""

from __future__ import annotations

import asyncio
from typing import Any
from unittest.mock import AsyncMock, MagicMock, PropertyMock, call, patch

import aiohttp
import pytest

from unittest.mock import ANY as MOCK_ANY  # noqa: N811

from tasks.http_task import (
    _auth_headers,
    _post_heartbeat,
    _post_health_report,
    send_heartbeat,
    send_health_report,
)


# ── Helpers ─────────────────────────────────────────────────────────


def _mock_settings(**overrides: Any) -> MagicMock:
    """Create a mock settings object with sensible defaults."""
    defaults = {
        "EDGE_AGENT_ID": "edge-test",
        "EDGE_AGENT_SECRET": "test-secret",
        "EDGE_SUPERVISION_URL": "http://localhost:4000",
        "HEARTBEAT_INTERVAL": 60,
        "HEALTH_CHECK_INTERVAL": 30,
        "MQTT_BROKER_HOST": "localhost",
        "MQTT_BROKER_PORT": 8883,
        "MQTT_USERNAME": "",
        "MQTT_PASSWORD": "",
        "MQTT_TLS_CA_CERT": "/certs/ca.crt",
        "MQTT_RECONNECT_INTERVAL": 5,
        "MQTT_BUFFER_MAXSIZE": 5000,
        "EDGE_SITE_ID": "test",
        "SERIAL_PORTS": "/dev/ttyUSB0",
        "SERIAL_BAUD": 9600,
        "ONVIF_DISCOVERY_INTERVAL": 300,
    }
    defaults.update(overrides)
    s = MagicMock()
    for k, v in defaults.items():
        setattr(s, k, v)
    return s


def _mock_response(status: int = 200, body: str = "ok") -> AsyncMock:
    """Create a mock aiohttp.ClientResponse."""
    resp = AsyncMock()
    resp.status = status
    resp.__aenter__ = AsyncMock(return_value=resp)
    resp.__aexit__ = AsyncMock(return_value=None)
    return resp


# ── _auth_headers ──────────────────────────────────────────────────


class TestAuthHeaders:
    """Unit tests for the authorization header builder."""

    def test_returns_empty_when_no_secret(self) -> None:
        settings = _mock_settings(EDGE_AGENT_SECRET="")
        headers = _auth_headers(settings)
        assert headers == {}

    def test_returns_bearer_token_when_secret_set(self) -> None:
        settings = _mock_settings(EDGE_AGENT_SECRET="my-token")
        headers = _auth_headers(settings)
        assert headers["Authorization"] == "Bearer my-token"


# ── _post_heartbeat ────────────────────────────────────────────────


class TestPostHeartbeat:
    """Unit tests for the heartbeat POST helper."""

    @pytest.mark.asyncio
    async def test_payload_contains_required_fields(self) -> None:
        """Verify the heartbeat payload structure."""
        settings = _mock_settings(EDGE_AGENT_ID="edge-site-1")
        session = AsyncMock()
        session.post.return_value = _mock_response(200)

        with patch("services.metrics.system_metrics", return_value={"cpu": 10.0, "ram": 50.0, "disk": 60.0}):
            with patch("services.metrics.service_status", return_value={"api": True, "mosquitto": True}):
                await _post_heartbeat(
                    session=session,
                    url="http://localhost:4000/api/heartbeat",
                    settings=settings,
                    timeout=aiohttp.ClientTimeout(total=10),
                )

        session.post.assert_awaited_once()
        call_args = session.post.await_args
        assert call_args is not None
        payload = call_args.kwargs["json"]

        # Check required fields
        assert payload["clientId"] == "edge-site-1"
        assert payload["tier"] == "edge"
        assert "timestamp" in payload
        assert isinstance(payload["uptime"], int)
        assert isinstance(payload["system"], dict)
        assert isinstance(payload["services"], dict)
        assert isinstance(payload["cameraStats"], dict)
        assert isinstance(payload["alertStats"], dict)

    @pytest.mark.asyncio
    async def test_system_metrics_included(self) -> None:
        settings = _mock_settings()
        session = AsyncMock()
        session.post.return_value = _mock_response(200)
        fake_metrics = {"cpu": 25.0, "ram": 45.0, "disk": 70.0}

        with patch("services.metrics.system_metrics", return_value=fake_metrics):
            with patch("services.metrics.service_status", return_value={}):
                await _post_heartbeat(
                    session=session,
                    url="http://localhost:4000/api/heartbeat",
                    settings=settings,
                    timeout=aiohttp.ClientTimeout(total=10),
                )

        call_args = session.post.await_args
        assert call_args is not None
        assert call_args.kwargs["json"]["system"] == fake_metrics

    @pytest.mark.asyncio
    async def test_services_included(self) -> None:
        settings = _mock_settings()
        session = AsyncMock()
        session.post.return_value = _mock_response(200)
        fake_services = {"api": True, "mosquitto": False}

        with patch("services.metrics.system_metrics", return_value={}):
            with patch("services.metrics.service_status", return_value=fake_services):
                await _post_heartbeat(
                    session=session,
                    url="http://localhost:4000/api/heartbeat",
                    settings=settings,
                    timeout=aiohttp.ClientTimeout(total=10),
                )

        call_args = session.post.await_args
        assert call_args is not None
        assert call_args.kwargs["json"]["services"] == fake_services

    @pytest.mark.asyncio
    async def test_posts_to_correct_url(self) -> None:
        settings = _mock_settings()
        session = AsyncMock()
        session.post.return_value = _mock_response(200)

        with patch("services.metrics.system_metrics", return_value={}):
            with patch("services.metrics.service_status", return_value={}):
                await _post_heartbeat(
                    session=session,
                    url="http://api.test/api/heartbeat",
                    settings=settings,
                    timeout=aiohttp.ClientTimeout(total=10),
                )

        session.post.assert_awaited_once_with(
            "http://api.test/api/heartbeat",
            json=MOCK_ANY,
            timeout=MOCK_ANY,
        )


# ── Heartbeat error handling ──────────────────────────────────────


class TestHeartbeatErrors:
    """Verify heartbeat error handling doesn't crash the agent."""

    @pytest.mark.asyncio
    async def test_http_error_logged_and_continues(self) -> None:
        """aiohttp.ClientError should be caught, not propagated."""
        settings = _mock_settings()
        session = AsyncMock()
        session.post.side_effect = aiohttp.ClientError("connection refused")

        with patch("services.metrics.system_metrics", return_value={}):
            with patch("services.metrics.service_status", return_value={}):
                # Should not raise
                await _post_heartbeat(
                    session=session,
                    url="http://localhost:4000/api/heartbeat",
                    settings=settings,
                    timeout=aiohttp.ClientTimeout(total=10),
                )

    @pytest.mark.asyncio
    async def test_timeout_error_logged_and_continues(self) -> None:
        """asyncio.TimeoutError should be caught, not propagated."""
        settings = _mock_settings()
        session = AsyncMock()
        session.post.side_effect = asyncio.TimeoutError("timed out")

        with patch("services.metrics.system_metrics", return_value={}):
            with patch("services.metrics.service_status", return_value={}):
                await _post_heartbeat(
                    session=session,
                    url="http://localhost:4000/api/heartbeat",
                    settings=settings,
                    timeout=aiohttp.ClientTimeout(total=10),
                )


# ── send_heartbeat (loop) ──────────────────────────────────────────


class TestSendHeartbeat:
    """Verify the heartbeat loop sends on startup and at intervals."""

    @pytest.mark.asyncio
    async def test_sends_heartbeat_on_startup(self) -> None:
        """An immediate heartbeat is sent before entering the interval loop."""
        shutdown = asyncio.Event()
        settings = _mock_settings(HEARTBEAT_INTERVAL=60)

        with patch("tasks.http_task.aiohttp.ClientSession") as mock_session:
            instance = AsyncMock()
            instance.post = AsyncMock(return_value=_mock_response(200))
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=None)
            mock_session.return_value = instance

            with patch("services.metrics.system_metrics", return_value={}):
                with patch("services.metrics.service_status", return_value={}):
                    task = asyncio.create_task(send_heartbeat(shutdown, settings))
                    await asyncio.sleep(0.2)
                    shutdown.set()
                    await asyncio.wait_for(task, timeout=5.0)

        # At least one POST (the immediate one) was made
        assert instance.post.await_count >= 1


# ── health report ──────────────────────────────────────────────────


class TestHealthReport:
    """Verify health report calls docker service status."""

    @pytest.mark.asyncio
    async def test_health_report_calls_run_health_checks(self) -> None:
        settings = _mock_settings(HEALTH_CHECK_INTERVAL=60)
        fake_statuses = {"api": True, "mosquitto": True}

        with patch("services.metrics.run_health_checks_sync", return_value=fake_statuses) as mock_health:
            with patch("tasks.http_task.aiohttp.ClientSession") as mock_session:
                instance = AsyncMock()
                instance.post = AsyncMock(return_value=_mock_response(200))
                instance.__aenter__ = AsyncMock(return_value=instance)
                instance.__aexit__ = AsyncMock(return_value=None)
                mock_session.return_value = instance

                shutdown = asyncio.Event()
                # Call _post_health_report directly (not the loop)
                await _post_health_report(
                    session=instance,
                    url="http://localhost:4000/api/supervision/report",
                    settings=settings,
                    timeout=aiohttp.ClientTimeout(total=10),
                )

        mock_health.assert_called_once_with(settings)

    @pytest.mark.asyncio
    async def test_health_report_posts_statuses(self) -> None:
        settings = _mock_settings()
        session = AsyncMock()
        session.post.return_value = _mock_response(200)
        fake_statuses = {"api": True, "mosquitto": False}

        with patch("services.metrics.run_health_checks_sync", return_value=fake_statuses):
            await _post_health_report(
                session=session,
                url="http://localhost:4000/api/supervision/report",
                settings=settings,
                timeout=aiohttp.ClientTimeout(total=10),
            )

        session.post.assert_awaited_once()
        call_args = session.post.await_args
        assert call_args is not None
        assert call_args.kwargs["json"] == fake_statuses

    @pytest.mark.asyncio
    async def test_health_report_error_handling(self) -> None:
        """HTTP errors in health report should be caught."""
        settings = _mock_settings()
        session = AsyncMock()
        session.post.side_effect = aiohttp.ClientError("fail")

        with patch("services.metrics.run_health_checks_sync", return_value={}):
            await _post_health_report(
                session=session,
                url="http://localhost:4000/api/supervision/report",
                settings=settings,
                timeout=aiohttp.ClientTimeout(total=10),
            )
