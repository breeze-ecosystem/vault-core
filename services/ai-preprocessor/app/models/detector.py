from __future__ import annotations

import logging

from app.config import settings

logger = logging.getLogger(__name__)

# Lazy-loaded YOLOv12 model (cold start on first request)
_yolo_model = None


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
    import numpy as np
    import supervision as sv

    conf = confidence if confidence is not None else settings.DETECTION_CONFIDENCE
    model = get_detector()
    results = model(frame, conf=conf)[0]
    detections = sv.Detections.from_ultralytics(results)
    return detections
