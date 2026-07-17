"""
Oversight Hub — Edge Agent Configuration
Pydantic-settings config loading from environment variables.
"""

from __future__ import annotations

from typing import Any

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables with .env file support.

    All configuration is driven by environment variables, with sensible defaults
    for local development. In production, values are injected via Docker Compose
    environment definitions.
    """

    # ── MQTT ─────────────────────────────────────────────────────
    MQTT_BROKER_HOST: str = "localhost"
    MQTT_BROKER_PORT: int = 8883
    MQTT_USERNAME: str = ""
    MQTT_PASSWORD: str = ""
    MQTT_TLS_CA_CERT: str = "/app/certs/ca.crt"
    MQTT_RECONNECT_INTERVAL: int = 5
    MQTT_BUFFER_MAXSIZE: int = 5000

    # ── Agent Identity ──────────────────────────────────────────
    EDGE_SITE_ID: str = "unknown"
    EDGE_AGENT_ID: str = "edge-unknown"
    EDGE_SUPERVISION_URL: str = "http://localhost:4000"
    EDGE_AGENT_SECRET: str = ""

    # ── Serial ──────────────────────────────────────────────────
    SERIAL_PORTS: str = "/dev/ttyUSB0"
    SERIAL_BAUD: int = 9600

    # ── Intervals ───────────────────────────────────────────────
    HEARTBEAT_INTERVAL: int = 60
    HEALTH_CHECK_INTERVAL: int = 30
    ONVIF_DISCOVERY_INTERVAL: int = 300

    model_config = SettingsConfigDict(env_file=".env")

    @model_validator(mode="before")
    @classmethod
    def parse_serial_ports(cls, data: Any) -> Any:
        """Parse comma-separated SERIAL_PORTS into a list.

        The env-var value is a string like ``"/dev/ttyUSB0,/dev/ttyUSB1"``
        which gets stored as ``SERIAL_PORTS``.  This validator keeps it as a
        string on the model but downstream consumers split on ``,``.
        """
        if isinstance(data, dict):
            ports = data.get("SERIAL_PORTS", "/dev/ttyUSB0")
            if isinstance(ports, str):
                data["SERIAL_PORTS_LIST"] = [p.strip() for p in ports.split(",") if p.strip()]
        return data

    @property
    def serial_ports_list(self) -> list[str]:
        """Return serial ports as a list, splitting by comma."""
        return [p.strip() for p in self.SERIAL_PORTS.split(",") if p.strip()]


settings = Settings()
