from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class WeaponResult(BaseModel):
    """A detected weapon in a camera frame.

    Per D-21: confidence >= 0.6 = alert; 0.3-0.59 = low-confidence review queue.
    """

    class_name: str = Field(..., description="One of: firearm, knife, suspicious_object")
    confidence: float = Field(..., ge=0.0, le=1.0)
    bbox: list[float] = Field(..., min_length=4, max_length=4)  # [x1, y1, x2, y2]
    tracker_id: int | None = None


class AbandonedObjectAlert(BaseModel):
    """An object that has been static beyond the configured threshold in a zone."""

    zone_name: str
    tracker_id: int
    static_duration_seconds: float
    bbox: list[float] = Field(..., min_length=4, max_length=4)  # [x1, y1, x2, y2]


class CrowdCountResult(BaseModel):
    """Person count and density for a single detection zone."""

    zone_name: str
    person_count: int = Field(..., ge=0)
    density_percent: float = Field(..., ge=0.0, le=100.0)
    threshold_exceeded: bool = False


class BehaviorResult(BaseModel):
    """A detected behavioral anomaly in a zone."""

    behavior_type: str = Field(..., description="zone_intrusion or loitering")
    zone_name: str
    tracker_id: int | None = None
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    bbox: list[float] = Field(default_factory=list, min_length=0, max_length=4)


class FaceMatchResult(BaseModel):
    """A face recognition result with risk scoring, blacklist, and anti-spoofing."""

    name: str | None = None
    risk_score: int = Field(default=0, ge=0, le=100)  # 0-100 per D-11
    is_blacklisted: bool = False
    liveness_score: float | None = Field(default=None, ge=0.0, le=1.0)
    is_spoof: bool = False
    anti_spoofing_score: float | None = Field(default=None, ge=0.0, le=1.0)
    tracker_id: int | None = None
    bbox: list[float] = Field(default_factory=list, min_length=0, max_length=4)


class BastionDetectionRequest(BaseModel):
    """Request payload for BASTION multi-stage detection on a single camera frame."""

    camera_id: str
    image_base64: str
    timestamp: str | None = None
    organization_id: str
    confidence: float = 0.45
    detection_zones: list[list[list[float]]] = []  # list of polygons
    enable_face_recognition: bool = False
    enable_anti_spoofing: bool = False


class BastionDetectionResponse(BaseModel):
    """Response payload for BASTION detection results.

    Each list defaults to an empty list when no detections of that type are found.
    """

    weapons: list[WeaponResult] = []
    abandoned_objects: list[AbandonedObjectAlert] = []
    crowd_counts: list[CrowdCountResult] = []
    behaviors: list[BehaviorResult] = []
    face_matches: list[FaceMatchResult] = []
    camera_id: str
    processing_time_ms: float
