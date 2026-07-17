"""
Oversight Hub — Edge Agent Data Models
Pydantic models for MQTT message payloads and HTTP API payloads.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class DoorStatePayload(BaseModel):
    """Door state event published to ``site/{siteId}/door/{doorId}/state``.

    Published by the Edge Agent whenever a door controller reports a state
    transition (locked, unlocked, held-open, forced, unsecured, desynchronized).
    The ``sequence`` field enables API-side deduplication.
    """

    device_id: Optional[str] = None
    controller_id: Optional[str] = None
    state: str
    sequence: int
    timestamp: Optional[str] = None


class BadgeReadPayload(BaseModel):
    """Badge read event published to ``site/{siteId}/reader/{readerId}/badge``.

    Published by the Edge Agent whenever an OSDP badge reader reports a card
    scan. The ``sequence`` field enables API-side deduplication.
    """

    badge_number: str
    sequence: int
    device_id: Optional[str] = None
    timestamp: Optional[str] = None


class HealthPayload(BaseModel):
    """Controller health report published to ``site/{siteId}/controller/{controllerId}/health``.

    Published periodically by the Edge Agent for each connected door controller.
    The API uses this to detect offline controllers and trigger alerts.
    """

    controller_id: str
    online: bool
    uptime: int
    last_seen: str
    sequence: int


class HeartbeatPayload(BaseModel):
    """Edge Agent heartbeat payload POSTed to ``/api/heartbeat``.

    Mirrors the payload structure of the current synchronous agent's
    ``send_heartbeat()`` function so the API continues to receive the
    same shape.
    """

    clientId: str
    tier: str
    timestamp: str
    uptime: int
    system: dict
    services: dict
    cameraStats: dict
    alertStats: dict


class OnvifCameraPayload(BaseModel):
    """ONVIF-discovered camera payload POSTed to ``/api/supervision/cameras/discover``.

    Populated from WS-Discovery ``ProbeMatches`` response data collected by
    the ONVIF discovery service.
    """

    ip: str
    manufacturer: str
    model: str
    rtsp_url: Optional[str] = None
    xaddrs: list[str] = []
    scopes: list[str] = []
