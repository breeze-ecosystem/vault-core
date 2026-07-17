"""
Tests for edge/agent/config.py — Settings class.
"""

from __future__ import annotations

from typing import Any

import pytest

from config import Settings


class TestSettingsDefaults:
    """Settings() creates sensible defaults for all fields."""

    def test_mqtt_broker_host_default(self) -> None:
        s = Settings()
        assert s.MQTT_BROKER_HOST == "localhost"

    def test_mqtt_broker_port_default(self) -> None:
        s = Settings()
        assert s.MQTT_BROKER_PORT == 8883

    def test_mqtt_username_empty_default(self) -> None:
        s = Settings()
        assert s.MQTT_USERNAME == ""

    def test_mqtt_password_empty_default(self) -> None:
        s = Settings()
        assert s.MQTT_PASSWORD == ""

    def test_mqtt_tls_ca_cert_default(self) -> None:
        s = Settings()
        assert s.MQTT_TLS_CA_CERT == "/app/certs/ca.crt"

    def test_mqtt_reconnect_interval_default(self) -> None:
        s = Settings()
        assert s.MQTT_RECONNECT_INTERVAL == 5

    def test_mqtt_buffer_maxsize_default(self) -> None:
        s = Settings()
        assert s.MQTT_BUFFER_MAXSIZE == 5000

    def test_edge_site_id_default(self) -> None:
        s = Settings()
        assert s.EDGE_SITE_ID == "unknown"

    def test_edge_agent_id_default(self) -> None:
        s = Settings()
        assert s.EDGE_AGENT_ID == "edge-unknown"

    def test_edge_supervision_url_default(self) -> None:
        s = Settings()
        assert s.EDGE_SUPERVISION_URL == "http://localhost:4000"

    def test_edge_agent_secret_empty_default(self) -> None:
        s = Settings()
        assert s.EDGE_AGENT_SECRET == ""

    def test_serial_ports_default(self) -> None:
        s = Settings()
        assert s.SERIAL_PORTS == "/dev/ttyUSB0"

    def test_serial_baud_default(self) -> None:
        s = Settings()
        assert s.SERIAL_BAUD == 9600

    def test_heartbeat_interval_default(self) -> None:
        s = Settings()
        assert s.HEARTBEAT_INTERVAL == 60

    def test_health_check_interval_default(self) -> None:
        s = Settings()
        assert s.HEALTH_CHECK_INTERVAL == 30

    def test_onvif_discovery_interval_default(self) -> None:
        s = Settings()
        assert s.ONVIF_DISCOVERY_INTERVAL == 300


class TestSettingsEnvOverride:
    """Environment variables override defaults."""

    @pytest.mark.parametrize(
        ("env_name", "env_value", "attr_name", "expected"),
        [
            ("MQTT_BROKER_HOST", "10.0.0.1", "MQTT_BROKER_HOST", "10.0.0.1"),
            ("MQTT_BROKER_PORT", "1883", "MQTT_BROKER_PORT", 1883),
            ("MQTT_USERNAME", "agent-site-test", "MQTT_USERNAME", "agent-site-test"),
            ("MQTT_PASSWORD", "s3cret!", "MQTT_PASSWORD", "s3cret!"),
            ("MQTT_TLS_CA_CERT", "/custom/ca.pem", "MQTT_TLS_CA_CERT", "/custom/ca.pem"),
            ("MQTT_RECONNECT_INTERVAL", "10", "MQTT_RECONNECT_INTERVAL", 10),
            ("MQTT_BUFFER_MAXSIZE", "100", "MQTT_BUFFER_MAXSIZE", 100),
            ("EDGE_SITE_ID", "site-42", "EDGE_SITE_ID", "site-42"),
            ("EDGE_AGENT_ID", "edge-site-42", "EDGE_AGENT_ID", "edge-site-42"),
            ("EDGE_SUPERVISION_URL", "https://api.example.com", "EDGE_SUPERVISION_URL", "https://api.example.com"),
            ("EDGE_AGENT_SECRET", "my-secret-key", "EDGE_AGENT_SECRET", "my-secret-key"),
            ("SERIAL_PORTS", "/dev/ttyS0", "SERIAL_PORTS", "/dev/ttyS0"),
            ("SERIAL_BAUD", "115200", "SERIAL_BAUD", 115200),
            ("HEARTBEAT_INTERVAL", "120", "HEARTBEAT_INTERVAL", 120),
            ("HEALTH_CHECK_INTERVAL", "60", "HEALTH_CHECK_INTERVAL", 60),
            ("ONVIF_DISCOVERY_INTERVAL", "600", "ONVIF_DISCOVERY_INTERVAL", 600),
        ],
    )
    def test_env_override(
        self,
        monkeypatch: pytest.MonkeyPatch,
        env_name: str,
        env_value: str,
        attr_name: str,
        expected: Any,
    ) -> None:
        monkeypatch.setenv(env_name, env_value)
        s = Settings()
        assert getattr(s, attr_name) == expected

    def test_env_override_preserves_defaults(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Setting one env var does not affect other defaults."""
        monkeypatch.setenv("MQTT_BROKER_HOST", "10.0.0.1")
        s = Settings()
        assert s.MQTT_BROKER_HOST == "10.0.0.1"
        assert s.MQTT_BROKER_PORT == 8883  # unchanged default
        assert s.EDGE_SITE_ID == "unknown"  # unchanged default


class TestSerialPortsParsing:
    """SERIAL_PORTS environment variable parsing."""

    def test_single_port(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("SERIAL_PORTS", "/dev/ttyUSB0")
        s = Settings()
        assert s.serial_ports_list == ["/dev/ttyUSB0"]

    def test_multiple_ports(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("SERIAL_PORTS", "/dev/ttyUSB0,/dev/ttyAMA0")
        s = Settings()
        assert s.serial_ports_list == ["/dev/ttyUSB0", "/dev/ttyAMA0"]

    def test_ports_with_whitespace(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("SERIAL_PORTS", "/dev/ttyUSB0, /dev/ttyAMA0")
        s = Settings()
        assert s.serial_ports_list == ["/dev/ttyUSB0", "/dev/ttyAMA0"]

    def test_empty_components_skipped(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("SERIAL_PORTS", "/dev/ttyUSB0,,,/dev/ttyAMA0")
        s = Settings()
        assert s.serial_ports_list == ["/dev/ttyUSB0", "/dev/ttyAMA0"]

    def test_default_single_port(self) -> None:
        """Default SERIAL_PORTS should parse to a list with one entry."""
        s = Settings()
        assert s.serial_ports_list == ["/dev/ttyUSB0"]
