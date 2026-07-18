import asyncio
import base64
import io
import logging
import time

import cv2
import httpx
import numpy as np
import supervision as sv
from fastapi import APIRouter, HTTPException
from PIL import Image
from pydantic import BaseModel

from app.config import settings
from app.models.detector import detect, get_detector
from app.models.face_recogniser import (
    get_face_recogniser,
    get_frame_buffer,
    is_dark_frame,
    match_whitelist,
    prune_stale_buffers,
)
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
    detection_zones: list[list[list[float]]] = []  # list of polygons, each polygon is list of [x,y] vertices
    enable_face_recognition: bool = False
    enable_temporal_smoothing: bool = True


class DetectionResult(BaseModel):
    """A single detected object with tracking identity."""

    class_name: str
    confidence: float
    bbox: list[float]  # [x1, y1, x2, y2]
    tracker_id: int | None = None
    class_id: int
    face_match: dict | None = None  # {identity, identity_id, similarity} if face recognised
    in_zone: bool = True


class DetectionResponse(BaseModel):
    """Response payload for object detection results."""

    detections: list[DetectionResult]
    camera_id: str
    processing_time_ms: float
    face_matches: list[dict] = []  # per-detection face match results
    zone_hits: list[bool] = []  # per-detection whether it was inside a zone
    enhancement_applied: bool = False


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
    face_matches: list[dict] | None = None,
    zone_hits: list[bool] | None = None,
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
        "face_matches": face_matches or [],
        "zone_hits": zone_hits or [],
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
    tracking, filters to person/vehicle classes, optionally applies zone filtering,
    temporal smoothing, and face recognition.

    CPU-bound operations (YOLO, insightface) run via run_in_executor to avoid
    blocking the FastAPI event loop (T-02-04 mitigation).
    """
    start = time.time()
    loop = asyncio.get_running_loop()

    # Decode base64 image
    try:
        image_data = base64.b64decode(request.image_base64)
        image = Image.open(io.BytesIO(image_data))
    except Exception as e:
        logger.error("Failed to decode image: %s", e)
        raise HTTPException(status_code=400, detail="Invalid image data")

    # Convert PIL to numpy
    frame = np.array(image.convert("RGB"))

    # Run YOLOv12 detection in executor
    detections_sv = await loop.run_in_executor(
        None, lambda: detect(frame, confidence=request.confidence),
    )

    if len(detections_sv) == 0:
        elapsed = round((time.time() - start) * 1000, 2)
        return DetectionResponse(
            detections=[],
            camera_id=request.camera_id,
            processing_time_ms=elapsed,
        )

    # ── 1. Zone filtering ──────────────────────────────────────────────────
    # If detection_zones are configured, only keep detections inside any zone.
    zone_hits_list: list[bool] = []
    if request.detection_zones:
        in_any_zone = np.zeros(len(detections_sv), dtype=bool)
        for polygon_verts in request.detection_zones:
            polygon = np.array(polygon_verts, dtype=np.int32)
            zone = sv.PolygonZone(
                polygon=polygon,
                frame_resolution_wh=(frame.shape[1], frame.shape[0]),
            )
            in_any_zone |= zone.trigger(detections=detections_sv)
        zone_hits_list = in_any_zone.tolist()
        detections_sv = detections_sv[in_any_zone]

    if len(detections_sv) == 0:
        elapsed = round((time.time() - start) * 1000, 2)
        return DetectionResponse(
            detections=[],
            camera_id=request.camera_id,
            processing_time_ms=elapsed,
        )

    # Apply ByteTrack cross-frame tracking
    detections_tracked = track(detections_sv)

    # ── 2. Temporal smoothing ──────────────────────────────────────────────
    # Only include detections whose tracker_id has been seen in >= 3 of last 5 frames.
    if request.enable_temporal_smoothing:
        frame_buffer = get_frame_buffer()
        smoothing_mask = np.ones(len(detections_tracked), dtype=bool)

        for i in range(len(detections_tracked)):
            tid = (
                int(detections_tracked.tracker_id[i])
                if hasattr(detections_tracked, "tracker_id") and detections_tracked.tracker_id[i] is not None
                else None
            )
            if tid is not None:
                key = (request.camera_id, tid)
                if key not in frame_buffer:
                    frame_buffer[key] = []
                buf = frame_buffer[key]
                buf.append(True)
                if len(buf) > 5:
                    buf.pop(0)
                # Mark as unstable if < 3 positive frames in last 5
                if sum(buf) < 3:
                    smoothing_mask[i] = False
            # If no tracker_id, include anyway (tracker not initialised)

        detections_tracked = detections_tracked[smoothing_mask]

    if len(detections_tracked) == 0:
        elapsed = round((time.time() - start) * 1000, 2)
        return DetectionResponse(
            detections=[],
            camera_id=request.camera_id,
            processing_time_ms=elapsed,
        )

    # Build response — filter to person/vehicle classes
    results: list[DetectionResult] = []
    face_matches_list: list[dict] = []
    enhancement_applied = False

    # ── 3. Face recognition (if enabled) ───────────────────────────────────
    # Process at most 1 person crop per frame (highest confidence, class_id=0).
    # Skip if dark frame.
    should_run_face_rec = (
        request.enable_face_recognition
        and settings.FACE_RECOGNITION_ENABLED
    )

    best_person_idx = -1
    best_person_conf = -1.0

    for i in range(len(detections_tracked)):
        class_id = int(detections_tracked.class_id[i]) if hasattr(detections_tracked, "class_id") else -1
        if class_id == 0:
            conf = float(detections_tracked.confidence[i]) if hasattr(detections_tracked, "confidence") else 0.0
            if conf > best_person_conf:
                best_person_conf = conf
                best_person_idx = i

    person_face_match = None
    if should_run_face_rec and best_person_idx >= 0 and not is_dark_frame(frame):
        x1, y1, x2, y2 = map(int, detections_tracked.xyxy[best_person_idx])
        crop_w = x2 - x1
        crop_h = y2 - y1

        if crop_w >= settings.MIN_FACE_SIZE and crop_h >= settings.MIN_FACE_SIZE:
            # Expand bbox 20% upward for better face capture
            y1 = max(0, y1 - int(crop_h * 0.2))
            person_crop = frame[y1:y2, x1:x2]

            if person_crop.size > 0:
                crop_bgr = cv2.cvtColor(person_crop, cv2.COLOR_RGB2BGR)

                face_result = await loop.run_in_executor(
                    None,
                    _run_face_rec_on_crop,
                    crop_bgr,
                    settings.FACE_MATCH_THRESHOLD,
                )

                if face_result is not None:
                    match_id, match_name, similarity = face_result
                    person_face_match = {
                        "identity_id": match_id,
                        "identity": match_name,
                        "similarity": similarity,
                    }
                    if match_id is not None:
                        face_matches_list.append({
                            "tracker_id": int(detections_tracked.tracker_id[best_person_idx]) if hasattr(detections_tracked, "tracker_id") and detections_tracked.tracker_id[best_person_idx] is not None else None,
                            "identity_id": match_id,
                            "identity": match_name,
                            "similarity": similarity,
                        })

    # ── 4. Building result list ────────────────────────────────────────────
    for i in range(len(detections_tracked)):
        class_id = int(detections_tracked.class_id[i]) if hasattr(detections_tracked, "class_id") else -1

        if not _is_target_class(class_id):
            continue

        confidence = (
            float(detections_tracked.confidence[i])
            if hasattr(detections_tracked, "confidence")
            else 0.0
        )

        bbox = (
            detections_tracked.xyxy[i].tolist()
            if hasattr(detections_tracked, "xyxy")
            else []
        )

        tracker_id = (
            int(detections_tracked.tracker_id[i])
            if hasattr(detections_tracked, "tracker_id") and detections_tracked.tracker_id[i] is not None
            else None
        )

        class_names = {
            0: "person",
            1: "bicycle",
            2: "car",
            3: "motorcycle",
            5: "bus",
            7: "truck",
        }
        class_name = class_names.get(class_id, f"class_{class_id}")

        # Attach face match to the best person detection only
        face_for_this = person_face_match if i == best_person_idx else None

        results.append(
            DetectionResult(
                class_name=class_name,
                confidence=round(confidence, 4),
                bbox=[round(float(c), 2) for c in bbox],
                tracker_id=tracker_id,
                class_id=class_id,
                face_match=face_for_this,
                in_zone=True,
            )
        )

    # Prune stale tracking buffers
    prune_stale_buffers()

    # Notify NestJS API (fire-and-forget) with extended payload
    await _notify_nestjs(
        results,
        request.camera_id,
        request.organization_id,
        request.timestamp,
        face_matches=face_matches_list,
        zone_hits=zone_hits_list if zone_hits_list else None,
    )

    elapsed = round((time.time() - start) * 1000, 2)
    logger.info(
        "Detection completed: %d detections, %d face matches in %.2fms for %s",
        len(results),
        len(face_matches_list),
        elapsed,
        request.camera_id,
    )

    return DetectionResponse(
        detections=results,
        camera_id=request.camera_id,
        processing_time_ms=elapsed,
        face_matches=face_matches_list,
        zone_hits=zone_hits_list,
        enhancement_applied=enhancement_applied,
    )


# ── Face recognition helper (runs in executor) ────────────────────────────────


def _run_face_rec_on_crop(
    crop_bgr: np.ndarray,
    match_threshold: float,
) -> tuple[str | None, str | None, float | None] | None:
    """Run insightface face detection + whitelist matching on a BGR crop.

    Returns (match_id, match_name, similarity) or None if no face detected.
    """
    try:
        face_recogniser = get_face_recogniser()
        faces = face_recogniser.get(crop_bgr)

        if not faces:
            return None

        best_face = max(faces, key=lambda f: f.det_score)
        emb = best_face.normed_embedding
        best_sim, best_id = match_whitelist(emb)

        if best_sim >= match_threshold and best_id is not None:
            # Look up name
            from app.models.face_recogniser import _whitelist_cache

            match_name = None
            for entry in _whitelist_cache:
                if entry["id"] == best_id:
                    match_name = entry["name"]
                    break
            return (best_id, match_name, round(float(best_sim), 3))
        else:
            return (None, None, None)
    except Exception as e:
        logger.error("Face recognition error on crop: %s", e)
        return None
