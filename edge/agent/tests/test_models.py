"""
Tests for edge/agent/models.py — Pydantic message payload models.
"""

from __future__ import annotations

import json

import pytest

from models import (
    BadgeReadPayload,
    DoorStatePayload,
    HealthPayload,
    HeartbeatPayload,
    OnvifCameraPayload,
)


class TestDoorStatePayload:
    """Door state event payload model."""

    def test_create_with_all_fields(self) -> None:
        payload = DoorStatePayload(
            device_id="door-1",
            controller_id="ctrl-1",
            state="locked",
            sequence=42,
            timestamp="2026-07-17T12:00:00Z",
        )
        assert payload.device_id == "door-1"
        assert payload.controller_id == "ctrl-1"
        assert payload.state == "locked"
        assert payload.sequence == 42
        assert payload.timestamp == "2026-07-17T12:00:00Z"

    def test_optional_fields_default_to_none(self) -> None:
        payload = DoorStatePayload(state="unlocked", sequence=1)
        assert payload.device_id is None
        assert payload.controller_id is None
        assert payload.timestamp is None

    def test_json_serialization_includes_sequence(self) -> None:
        payload = DoorStatePayload(state="locked", sequence=42)
        data = json.loads(payload.model_dump_json())
        assert data["sequence"] == 42
        assert data["state"] == "locked"

    def test_json_serialization_omits_none_fields(self) -> None:
        """By default, model_dump_json omits unset optional fields."""
        payload = DoorStatePayload(state="held-open", sequence=3)
        data = json.loads(payload.model_dump_json())
        assert "device_id" not in data or data["device_id"] is None
        assert data["state"] == "held-open"
        assert data["sequence"] == 3

    def test_serialization_roundtrip(self) -> None:
        original = DoorStatePayload(
            device_id="door-2",
            state="forced",
            sequence=99,
        )
        json_str = original.model_dump_json()
        restored = DoorStatePayload.model_validate_json(json_str)
        assert restored.device_id == original.device_id
        assert restored.state == original.state
        assert restored.sequence == original.sequence


class TestBadgeReadPayload:
    """Badge read event payload model."""

    def test_create_with_required_fields(self) -> None:
        payload = BadgeReadPayload(badge_number="12345", sequence=1)
        assert payload.badge_number == "12345"
        assert payload.sequence == 1

    def test_optional_fields_default_to_none(self) -> None:
        payload = BadgeReadPayload(badge_number="67890", sequence=2)
        assert payload.device_id is None
        assert payload.timestamp is None

    def test_create_with_all_fields(self) -> None:
        payload = BadgeReadPayload(
            badge_number="ABC123",
            sequence=10,
            device_id="reader-1",
            timestamp="2026-07-17T13:00:00Z",
        )
        assert payload.badge_number == "ABC123"
        assert payload.sequence == 10
        assert payload.device_id == "reader-1"
        assert payload.timestamp == "2026-07-17T13:00:00Z"

    def test_json_serialization_includes_sequence(self) -> None:
        payload = BadgeReadPayload(badge_number="11111", sequence=5)
        data = json.loads(payload.model_dump_json())
        assert data["sequence"] == 5
        assert data["badge_number"] == "11111"

    def test_serialization_roundtrip(self) -> None:
        original = BadgeReadPayload(
            badge_number="99999",
            sequence=100,
            device_id="reader-3",
        )
        json_str = original.model_dump_json()
        restored = BadgeReadPayload.model_validate_json(json_str)
        assert restored.badge_number == original.badge_number
        assert restored.sequence == original.sequence
        assert restored.device_id == original.device_id


class TestHealthPayload:
    """Controller health report payload model."""

    def test_create_with_all_fields(self) -> None:
        payload = HealthPayload(
            controller_id="ctrl-1",
            online=True,
            uptime=3600,
            last_seen="2026-07-17T12:00:00Z",
            sequence=7,
        )
        assert payload.controller_id == "ctrl-1"
        assert payload.online is True
        assert payload.uptime == 3600
        assert payload.last_seen == "2026-07-17T12:00:00Z"
        assert payload.sequence == 7

    def test_json_serialization(self) -> None:
        payload = HealthPayload(
            controller_id="ctrl-2",
            online=False,
            uptime=0,
            last_seen="",
            sequence=0,
        )
        data = json.loads(payload.model_dump_json())
        assert data["controller_id"] == "ctrl-2"
        assert data["online"] is False
        assert data["uptime"] == 0
        assert data["last_seen"] == ""
        assert data["sequence"] == 0

    def test_serialization_roundtrip(self) -> None:
        original = HealthPayload(
            controller_id="ctrl-health-1",
            online=True,
            uptime=7200,
            last_seen="2026-07-17T14:00:00Z",
            sequence=15,
        )
        json_str = original.model_dump_json()
        restored = HealthPayload.model_validate_json(json_str)
        assert restored.controller_id == original.controller_id
        assert restored.online == original.online
        assert restored.uptime == original.uptime
        assert restored.sequence == original.sequence


class TestHeartbeatPayload:
    """Heartbeat payload model."""

    def test_create_with_all_fields(self) -> None:
        payload = HeartbeatPayload(
            clientId="edge-site-1",
            tier="edge",
            timestamp="2026-07-17T12:00:00Z",
            uptime=86400,
            system={"cpu": 12.5, "ram": 45.0, "disk": 67.8},
            services={"api": True, "mosquitto": True},
            cameraStats={"total": 4, "online": 3, "offline": 1},
            alertStats={"last24h": 2},
        )
        assert payload.clientId == "edge-site-1"
        assert payload.tier == "edge"
        assert payload.uptime == 86400

    def test_nested_dict_structure(self) -> None:
        system = {"cpu": 5.0, "ram": 30.0, "disk": 50.0}
        payload = HeartbeatPayload(
            clientId="test",
            tier="edge",
            timestamp="now",
            uptime=100,
            system=system,
            services={},
            cameraStats={},
            alertStats={},
        )
        assert payload.system["cpu"] == 5.0

    def test_json_serialization_preserves_nested_dicts(self) -> None:
        payload = HeartbeatPayload(
            clientId="edge-test",
            tier="edge",
            timestamp="2026-07-17T12:00:00Z",
            uptime=100,
            system={"cpu": 8.0, "ram": 40.0, "disk": 55.0},
            services={"api": True},
            cameraStats={"total": 2, "online": 2, "offline": 0},
            alertStats={"last24h": 1},
        )
        data = json.loads(payload.model_dump_json())
        assert data["clientId"] == "edge-test"
        assert data["system"]["cpu"] == 8.0
        assert data["services"]["api"] is True
        assert data["cameraStats"]["total"] == 2
        assert data["alertStats"]["last24h"] == 1


class TestOnvifCameraPayload:
    """ONVIF-discovered camera payload model."""

    def test_create_with_required_fields(self) -> None:
        payload = OnvifCameraPayload(ip="192.168.1.100", manufacturer="Hikvision", model="DS-2CD")
        assert payload.ip == "192.168.1.100"
        assert payload.manufacturer == "Hikvision"
        assert payload.model == "DS-2CD"

    def test_optional_fields_defaults(self) -> None:
        payload = OnvifCameraPayload(ip="10.0.0.50", manufacturer="Dahua", model="IPC-HFW")
        assert payload.rtsp_url is None
        assert payload.xaddrs == []
        assert payload.scopes == []

    def test_create_with_all_fields(self) -> None:
        payload = OnvifCameraPayload(
            ip="192.168.1.200",
            manufacturer="Axis",
            model="Q3515-L",
            rtsp_url="rtsp://192.168.1.200:554/stream",
            xaddrs=["http://192.168.1.200/onvif/device_service"],
            scopes=["onvif://www.onvif.org/type/video_encoder"],
        )
        assert payload.rtsp_url == "rtsp://192.168.1.200:554/stream"
        assert len(payload.xaddrs) == 1
        assert len(payload.scopes) == 1


class TestSequenceField:
    """Verify that every event model includes a sequence field."""

    def test_door_state_has_sequence(self) -> None:
        assert "sequence" in DoorStatePayload.model_fields
        assert DoorStatePayload.model_fields["sequence"].annotation == int

    def test_badge_read_has_sequence(self) -> None:
        assert "sequence" in BadgeReadPayload.model_fields
        assert BadgeReadPayload.model_fields["sequence"].annotation == int

    def test_health_payload_has_sequence(self) -> None:
        assert "sequence" in HealthPayload.model_fields
        assert HealthPayload.model_fields["sequence"].annotation == int

    @pytest.mark.parametrize(
        "model_class",
        [
            DoorStatePayload,
            BadgeReadPayload,
            HealthPayload,
        ],
    )
    def test_event_models_have_sequence_field(self, model_class: type) -> None:
        """All event models intended for MQTT publish must have a sequence field."""
        assert "sequence" in model_class.model_fields, (
            f"{model_class.__name__} is missing the 'sequence' field"
        )

    def test_heartbeat_does_not_require_sequence(self) -> None:
        """Heartbeat is an HTTP payload, not an MQTT event — no sequence needed."""
        assert "sequence" not in HeartbeatPayload.model_fields
