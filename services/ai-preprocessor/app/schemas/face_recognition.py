from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class FaceWhitelistEntry(BaseModel):
    """A single known person in the organisation's face whitelist.

    Stored in PostgreSQL. Embedding serialised as base64 float32 array.
    """

    id: str
    name: str
    embedding_base64: str  # np.ndarray → base64 on write
    created_at: str | None = None
    updated_at: str | None = None


class FaceRecognitionRequest(BaseModel):
    """Request to recognise faces in a camera frame."""

    camera_id: str
    image_base64: str
    timestamp: str | None = None
    organization_id: str
    min_face_size: int = 80  # ignore faces smaller than 80×80 px
    match_threshold: float = 0.48  # clamped to [0.20, 0.95]

    @classmethod
    def clamp_threshold(cls, v: float) -> float:
        """Clamp match threshold to valid range [0.20, 0.95]."""
        return max(0.20, min(0.95, v))


class FaceMatch(BaseModel):
    """A recognised (or unrecognised) face in the frame."""

    bbox: list[float]  # [x1, y1, x2, y2] in original frame coords
    confidence: float  # face detection confidence
    identity: str | None = None  # whitelisted name if matched, else None
    identity_id: str | None = None  # UUID if matched, else None
    similarity: float | None = None  # cosine similarity if matched, else None


class FaceRecognitionResponse(BaseModel):
    """Response payload for face recognition results."""

    faces: list[FaceMatch]
    camera_id: str
    processing_time_ms: float
    total_whitelist_size: int  # how many embeddings were compared against


class FaceRegistrationRequest(BaseModel):
    """Register a new face in the whitelist.

    Sent from dashboard/mobile → NestJS API → AI Preprocessor (for embedding extraction).
    """

    name: str = Field(..., min_length=1, max_length=100)
    image_base64: str  # face photo uploaded by admin
    organization_id: str
