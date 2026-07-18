from __future__ import annotations

import logging
import time

import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)

# Lazy-loaded YOLOv12 model (cold start on first request)
_yolo_model = None

# ── BASTION weapon class ID constants ──────────────────────────────────────────
# These are mapped to the fine-tuned YOLO model's class IDs for weapon types.
# Fine-tune adds classes beyond COCO's default 80 (indices 80+).
# Placeholder values — update once fine-tuned model is deployed.
WEAPON_CLASS_IDS: set[int] = {96, 97, 98}
# 96 = firearm, 97 = knife, 98 = suspicious_object


def get_detector(model_name: str | None = None):
    """Return the lazy-loaded YOLOv12 model instance.

    Uses the model name from config.DETECTION_MODEL if not explicitly provided.
    The model is loaded once and cached globally.
    """
    global _yolo_model
    if _yolo_model is None:
        name = model_name or settings.DETECTION_MODEL
        logger.info("Loading YOLO model: %s (first call may be slow)...", name)
        from ultralytics import YOLO

        _yolo_model = YOLO(name)
    return _yolo_model


def detect(frame: np.ndarray, confidence: float | None = None):
    """Run YOLOv12 detection on a single frame.

    Args:
        frame: numpy array of shape (H, W, 3) representing the image.
        confidence: Confidence threshold for detections.
                     Defaults to config.DETECTION_CONFIDENCE (0.45).

    Returns:
        supervision.Detections object with bounding boxes, class IDs,
        and confidence scores extracted from the ultralytics results.
    """
    import supervision as sv

    conf = confidence if confidence is not None else settings.DETECTION_CONFIDENCE
    model = get_detector()
    results = model(frame, conf=conf)[0]
    detections = sv.Detections.from_ultralytics(results)
    return detections


def detect_bastion(frame: np.ndarray, confidence: float | None = None):
    """Run YOLOv12 detection returning ALL detections (persons + weapons + objects).

    Unlike `detect()` which is used by the VISION pipeline and focuses on
    person/vehicle classes, this returns all class IDs for BASTION downstream
    processing including weapon and abandoned-object candidates.

    Args:
        frame: numpy array of shape (H, W, 3) representing the image.
        confidence: Confidence threshold for detections.
                     Defaults to config.DETECTION_CONFIDENCE (0.45).

    Returns:
        supervision.Detections object with bounding boxes, class IDs,
        and confidence scores — includes ALL classes, not filtered.
    """
    import supervision as sv

    conf = confidence if confidence is not None else settings.DETECTION_CONFIDENCE
    model = get_detector()
    results = model(frame, conf=conf)[0]
    detections = sv.Detections.from_ultralytics(results)
    return detections


def _is_static_object(
    tracker_id: int,
    camera_id: str,
    idle_frames: int = 90,
) -> bool:
    """Check if a tracked object has been stationary for N frames.

    Uses the tracker's position history stored in `_object_positions`
    to determine if the centroid has moved less than a threshold (5px)
    over the last `idle_frames` frames.

    Args:
        tracker_id: ByteTrack tracker ID for the object.
        camera_id: Camera identifier for isolating per-camera state.
        idle_frames: Number of consecutive frames to check (default 90).

    Returns:
        True if the object has been stationary for at least idle_frames.
    """
    from app.models.tracker import get_object_positions

    positions = get_object_positions(camera_id, tracker_id)
    if len(positions) < idle_frames:
        return False

    # Check the last idle_frames positions
    recent = positions[-idle_frames:]
    deltas = [
        np.sqrt((recent[j][0] - recent[j - 1][0]) ** 2 + (recent[j][1] - recent[j - 1][1]) ** 2)
        for j in range(1, len(recent))
    ]
    # Object is static if all deltas are below 5px threshold
    return all(d < 5.0 for d in deltas)
