import base64
import io
import logging
import time

import httpx
from fastapi import APIRouter, HTTPException
from PIL import Image
from pydantic import BaseModel

from app.config import settings
from app.models.detector import detect, get_detector
from app.models.tracker import get_tracker, track

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Pydantic Models ──────────────────────────────────────────────────────────


class DetectionRequest(BaseModel):
    """Request payload for object detection on a single camera frame."""

    camera_id: str
    image_base64: str
    timestamp: str | None = None
    confidence: float = 0.45
    organization_id: str


class DetectionResult(BaseModel):
    """A single detected object with tracking identity."""

    class_name: str
    confidence: float
    bbox: list[float]  # [x1, y1, x2, y2]
    tracker_id: int | None = None
    class_id: int


class DetectionResponse(BaseModel):
    """Response payload for object detection results."""

    detections: list[DetectionResult]
    camera_id: str
    processing_time_ms: float


# ── YOLO person/vehicle class IDs ────────────────────────────────────────────
# COCO classes: 0=person, 1=bicycle, 2=car, 3=motorcycle, 5=bus, 7=truck
# Default person classes from config include hard-hat/vest variants
_DEFAULT_TARGET_CLASSES: set[int] = {0, 1, 2, 3, 5, 7}


def _is_target_class(class_id: int) -> bool:
    """Check if a YOLO class ID is a person or vehicle class of interest."""
    person_classes = set(settings.YOLO_PERSON_CLASSES)
    if person_classes:
        return class_id in person_classes
    return class_id in _DEFAULT_TARGET_CLASSES


# ── Internal API notification ────────────────────────────────────────────────


async def _notify_nestjs(
    detections: list[DetectionResult],
    camera_id: str,
    organization_id: str,
    timestamp: str | None,
) -> None:
    """POST detection results to the NestJS internal detection-fire endpoint."""
    if not settings.NESTJS_API_URL:
        logger.warning("NESTJS_API_URL not configured — skipping notification")
        return

    url = f"{settings.NESTJS_API_URL}/api/internal/detection-fire"
    payload = {
        "camera_id": camera_id,
        "organization_id": organization_id,
        "timestamp": timestamp,
        "detections": [d.model_dump() for d in detections],
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            logger.info(
                "Notified NestJS of %d detections for camera %s",
                len(detections),
                camera_id,
            )
    except httpx.HTTPError as e:
        logger.error("Failed to notify NestJS API: %s", e)


# ── Route Handlers ───────────────────────────────────────────────────────────


@router.post("/detect", response_model=DetectionResponse)
async def detect_objects(request: DetectionRequest):
    """Run YOLOv12 object detection + ByteTrack tracking on a camera frame.

    Decodes a base64-encoded image, runs object detection, applies cross-frame
    tracking, filters to person/vehicle classes, and optionally notifies the
    NestJS API of the detection results.
    """
    start = time.time()

    # Decode base64 image
    try:
        image_data = base64.b64decode(request.image_base64)
        image = Image.open(io.BytesIO(image_data))
    except Exception as e:
        logger.error("Failed to decode image: %s", e)
        raise HTTPException(status_code=400, detail="Invalid image data")

    # Convert PIL to numpy
    import numpy as np

    frame = np.array(image.convert("RGB"))

    # Run YOLOv12 detection
    detections_sv = detect(frame, confidence=request.confidence)

    # Apply ByteTrack cross-frame tracking
    detections_tracked = track(detections_sv)

    # Build response — filter to person/vehicle classes
    results: list[DetectionResult] = []
    for i in range(len(detections_tracked)):
        class_id = int(detections_tracked.class_id[i]) if hasattr(detections_tracked, "class_id") else int(detections_tracked[i][3]) if hasattr(detections_tracked, "__getitem__") else -1

        if not _is_target_class(class_id):
            continue

        confidence = (
            float(detections_tracked.confidence[i])
            if hasattr(detections_tracked, "confidence")
            else float(detections_tracked[i][2])
        )

        bbox = (
            detections_tracked.xyxy[i].tolist()
            if hasattr(detections_tracked, "xyxy")
            else list(detections_tracked[i][:4])
        )

        tracker_id = (
            int(detections_tracked.tracker_id[i])
            if hasattr(detections_tracked, "tracker_id") and detections_tracked.tracker_id[i] is not None
            else None
        )

        # Map COCO class ID to human-readable name
        class_names = {
            0: "person",
            1: "bicycle",
            2: "car",
            3: "motorcycle",
            5: "bus",
            7: "truck",
        }
        class_name = class_names.get(class_id, f"class_{class_id}")

        results.append(
            DetectionResult(
                class_name=class_name,
                confidence=round(confidence, 4),
                bbox=[round(float(c), 2) for c in bbox],
                tracker_id=tracker_id,
                class_id=class_id,
            )
        )

    # Notify NestJS API (fire-and-forget)
    await _notify_nestjs(
        results,
        request.camera_id,
        request.organization_id,
        request.timestamp,
    )

    elapsed = round((time.time() - start) * 1000, 2)
    logger.info(
        "Detection completed: %d detections in %.2fms for camera %s",
        len(results),
        elapsed,
        request.camera_id,
    )

    return DetectionResponse(
        detections=results,
        camera_id=request.camera_id,
        processing_time_ms=elapsed,
    )
