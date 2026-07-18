from __future__ import annotations

import asyncio
import base64
import io
import logging
import time

import cv2
import numpy as np
from fastapi import APIRouter, HTTPException
from PIL import Image

from app.config import settings
from app.models.detector import detect
from app.models.face_recogniser import (
    get_face_recogniser,
    is_dark_frame,
    match_whitelist,
    prune_stale_buffers,
    refresh_whitelist_cache,
)
from app.schemas.face_recognition import (
    FaceMatch,
    FaceRecognitionRequest,
    FaceRecognitionResponse,
    FaceRegistrationRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Face recognition cooldown per tracker_id (5s) ─────────────────────────────
_last_face_match_time: dict[int, float] = {}
_FACE_COOLDOWN_SECONDS = 5.0

# ── YOLO person class ID ──────────────────────────────────────────────────────
_PERSON_CLASS_ID = 0


# ── Helpers ───────────────────────────────────────────────────────────────────


def _decode_base64_frame(image_base64: str) -> np.ndarray:
    """Decode a base64-encoded image string to an RGB numpy array.

    Raises HTTPException(400) on invalid image data (T-02-05 mitigation).
    """
    try:
        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data))
        return np.array(image.convert("RGB"))
    except Exception as e:
        logger.error("Failed to decode image: %s", e)
        raise HTTPException(status_code=400, detail="Invalid image data")


def _run_face_recognition_on_crop(
    crop_bgr: np.ndarray,
    match_threshold: float,
) -> tuple[list[float], float, str | None, str | None, float | None]:
    """Run insightface face detection + whitelist matching on a BGR crop.

    Returns (face_bbox, face_confidence, identity, identity_id, similarity).
    All values are None-wrapped if no face is detected.
    """
    face_recogniser = get_face_recogniser()
    faces = face_recogniser.get(crop_bgr)

    if not faces:
        return [], 0.0, None, None, None

    # Take the highest-confidence face
    best_face = max(faces, key=lambda f: f.det_score)
    emb = best_face.normed_embedding

    # Match against whitelist
    best_sim, best_id = match_whitelist(emb)

    identity_name = None
    identity_id = None
    similarity = None

    if best_sim >= match_threshold and best_id is not None:
        # Look up name from whitelist cache
        from app.models.face_recogniser import _whitelist_cache

        for entry in _whitelist_cache:
            if entry["id"] == best_id:
                identity_name = entry["name"]
                break
        identity_id = best_id
        similarity = round(float(best_sim), 3)

    face_bbox = best_face.bbox.tolist() if hasattr(best_face.bbox, "tolist") else list(best_face.bbox)

    return (
        face_bbox,
        float(best_face.det_score),
        identity_name,
        identity_id,
        similarity,
    )


# ── Route Handlers ────────────────────────────────────────────────────────────


@router.post("/face/recognise", response_model=FaceRecognitionResponse)
async def recognise_faces(request: FaceRecognitionRequest):
    """Recognise faces in a camera frame.

    Decodes the frame, runs YOLO detection to find persons, crops the highest
    confidence person bbox, runs insightface face detection + recognition on
    the crop, and returns face match results against the whitelist.

    CPU-bound operations (YOLO, insightface) run via run_in_executor to avoid
    blocking the FastAPI event loop (T-02-04 mitigation).
    """
    start = time.time()
    loop = asyncio.get_running_loop()

    # Decode base64 frame
    frame = _decode_base64_frame(request.image_base64)

    # Skip face recognition on dark frames (garbage embeddings)
    if is_dark_frame(frame):
        logger.debug("Skipping face recognition on dark frame for %s", request.camera_id)
        return FaceRecognitionResponse(
            faces=[],
            camera_id=request.camera_id,
            processing_time_ms=round((time.time() - start) * 1000, 2),
            total_whitelist_size=0,
        )

    # Run YOLO detection in executor
    sv_detections = await loop.run_in_executor(
        None,
        lambda: detect(frame, confidence=settings.DETECTION_CONFIDENCE),
    )

    # Filter to persons only (COCO class 0)
    person_mask = sv_detections.class_id == _PERSON_CLASS_ID
    persons = sv_detections[person_mask]

    if len(persons) == 0:
        elapsed = round((time.time() - start) * 1000, 2)
        return FaceRecognitionResponse(
            faces=[],
            camera_id=request.camera_id,
            processing_time_ms=elapsed,
            total_whitelist_size=0,
        )

    # Process at most 1 person crop per frame (highest confidence)
    best_idx = int(np.argmax(persons.confidence))
    x1, y1, x2, y2 = map(int, persons.xyxy[best_idx])

    # Ensure minimum crop size
    crop_w = x2 - x1
    crop_h = y2 - y1
    if crop_w < request.min_face_size or crop_h < request.min_face_size:
        elapsed = round((time.time() - start) * 1000, 2)
        return FaceRecognitionResponse(
            faces=[],
            camera_id=request.camera_id,
            processing_time_ms=elapsed,
            total_whitelist_size=0,
        )

    # Expand bbox 20% upward for better face capture
    y1 = max(0, y1 - int(crop_h * 0.2))
    person_crop = frame[y1:y2, x1:x2]

    if person_crop.size == 0:
        elapsed = round((time.time() - start) * 1000, 2)
        return FaceRecognitionResponse(
            faces=[],
            camera_id=request.camera_id,
            processing_time_ms=elapsed,
            total_whitelist_size=0,
        )

    # Run face recognition on the person crop (CPU-bound → executor)
    crop_bgr = cv2.cvtColor(person_crop, cv2.COLOR_RGB2BGR)
    match_threshold = FaceRecognitionRequest.clamp_threshold(request.match_threshold)

    face_result = await loop.run_in_executor(
        None,
        _run_face_recognition_on_crop,
        crop_bgr,
        match_threshold,
    )

    face_bbox, face_conf, identity_name, identity_id, similarity = face_result

    faces_list = []
    if face_bbox:
        # Offset face bbox back to original frame coordinates
        offset_bbox = [
            face_bbox[0] + x1,
            face_bbox[1] + y1,
            face_bbox[2] + x1,
            face_bbox[3] + y1,
        ]
        faces_list.append(
            FaceMatch(
                bbox=[round(float(c), 2) for c in offset_bbox],
                confidence=face_conf,
                identity=identity_name,
                identity_id=identity_id,
                similarity=similarity,
            )
        )

    elapsed = round((time.time() - start) * 1000, 2)
    logger.info(
        "Face recognition: %d faces in %.2fms for %s",
        len(faces_list),
        elapsed,
        request.camera_id,
    )

    # Fix T-02-06: never log embeddings
    prune_stale_buffers()

    return FaceRecognitionResponse(
        faces=faces_list,
        camera_id=request.camera_id,
        processing_time_ms=elapsed,
        total_whitelist_size=len(globals().get("_whitelist_cache", [])),
    )


@router.post("/face/register")
async def register_face(request: FaceRegistrationRequest):
    """Register a new face by extracting its embedding via insightface.

    Accepts a face photo and name, extracts the face embedding, and returns
    the embedding as base64 for storage by the NestJS API.
    """
    start = time.time()
    loop = asyncio.get_running_loop()

    frame = _decode_base64_frame(request.image_base64)

    # Convert RGB → BGR for insightface
    frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

    # Run face detection + embedding extraction in executor
    face_recogniser = get_face_recogniser()
    faces = await loop.run_in_executor(None, face_recogniser.get, frame_bgr)

    if not faces:
        raise HTTPException(
            status_code=400,
            detail="Aucun visage détecté dans l'image. Assurez-vous que le visage est bien visible.",
        )

    # Take the highest-confidence face
    best_face = max(faces, key=lambda f: f.det_score)
    emb: np.ndarray = best_face.normed_embedding

    # Serialize embedding to base64
    emb_bytes = emb.astype(np.float32).tobytes()
    embedding_base64 = base64.b64encode(emb_bytes).decode("utf-8")

    elapsed = round((time.time() - start) * 1000, 2)
    logger.info(
        "Face registered: %s (det_score=%.3f, processing=%.2fms)",
        request.name,
        best_face.det_score,
        elapsed,
    )

    return {
        "name": request.name,
        "embedding_base64": embedding_base64,
        "det_score": round(float(best_face.det_score), 4),
        "processing_time_ms": elapsed,
    }


@router.post("/face/refresh-whitelist")
async def refresh_whitelist():
    """Trigger an immediate refresh of the face whitelist cache from NestJS API."""
    await refresh_whitelist_cache()
    return {"status": "ok", "message": "Whitelist cache refresh initiated"}
