import logging

logger = logging.getLogger(__name__)

# Lazy-loaded ByteTrack tracker (cold start on first request)
_tracker = None


def get_tracker():
    """Return the lazy-loaded ByteTrack tracker instance.

    Uses the supervision library's ByteTrack implementation
    (NOT the standalone bytetrack PyPI package — per Pitfall 2).
    The tracker is created once and cached globally.
    """
    global _tracker
    if _tracker is None:
        logger.info("Initializing ByteTrack tracker via supervision...")
        from supervision import ByteTrack

        _tracker = ByteTrack()
    return _tracker


def track(detections):
    """Apply ByteTrack cross-frame tracking to detections.

    Args:
        detections: supervision.Detections object from object detection.

    Returns:
        supervision.Detections object with tracker_id added to each
        detection for cross-frame identity persistence.
    """
    import supervision as sv

    tracker = get_tracker()
    tracked = tracker.update_with_detections(detections)
    return tracked
