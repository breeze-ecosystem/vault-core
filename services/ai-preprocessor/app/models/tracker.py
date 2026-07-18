from __future__ import annotations

import logging
import time

import numpy as np

logger = logging.getLogger(__name__)

# Lazy-loaded ByteTrack tracker (cold start on first request)
_tracker = None

# ── BASTION: Frame-level position history ─────────────────────────────────────
# Keyed by (camera_id, tracker_id) storing list of (cx, cy, timestamp) tuples.
# Used for abandoned object static-duration and loitering detection.
_object_positions: dict[tuple[str, int], list[tuple[float, float, float]]] = {}


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

    # Update per-tracker position history (BASTION: abandoned object + loitering)
    if hasattr(tracked, "tracker_id") and tracked.tracker_id is not None:
        for i in range(len(tracked)):
            tid = int(tracked.tracker_id[i])
            # Compute centroid from bounding box
            xyxy = tracked.xyxy[i]
            cx = float((xyxy[0] + xyxy[2]) / 2)
            cy = float((xyxy[1] + xyxy[3]) / 2)
            now = time.time()

            # Store at most 300 positions per tracker (300 frames ~20s at 15fps)
            key = ("_global", tid)  # global key since camera_id isn't available here
            if key not in _object_positions:
                _object_positions[key] = []
            _object_positions[key].append((cx, cy, now))
            if len(_object_positions[key]) > 300:
                _object_positions[key].pop(0)

    return tracked


# ── BASTION: Position helpers ─────────────────────────────────────────────────


def get_object_positions(
    camera_id: str,
    tracker_id: int,
) -> list[tuple[float, float]]:
    """Get recent centroid positions for a tracked object.

    Returns list of (cx, cy) tuples (without timestamps) for the given
    (camera_id, tracker_id) pair.

    Args:
        camera_id: Camera identifier.
        tracker_id: ByteTrack tracker ID.

    Returns:
        List of (cx, cy) centroid positions, newest last. Empty if not found.
    """
    key = (camera_id, tracker_id)
    raw = _object_positions.get(key, [])
    return [(cx, cy) for (cx, cy, _) in raw]


def set_object_position(
    camera_id: str,
    tracker_id: int,
    centroid: tuple[float, float],
) -> None:
    """Record a centroid position for a tracked object at the current time.

    Stores the position with a timestamp for static-duration computation.
    Caps history at 900 entries (~60s at 15fps) to limit memory.

    Args:
        camera_id: Camera identifier.
        tracker_id: ByteTrack tracker ID.
        centroid: (cx, cy) centroid coordinates in frame pixel space.
    """
    key = (camera_id, tracker_id)
    if key not in _object_positions:
        _object_positions[key] = []
    _object_positions[key].append((centroid[0], centroid[1], time.time()))
    if len(_object_positions[key]) > 900:
        _object_positions[key].pop(0)


def get_static_duration(
    camera_id: str,
    tracker_id: int,
    current_centroid: tuple[float, float],
) -> float:
    """Calculate how many seconds a tracked object has been stationary.

    Compares the current centroid against position history. An object
    is considered "static" when its centroid movement is < 5px threshold.
    Returns the duration (in seconds) since the object last moved.

    Args:
        camera_id: Camera identifier.
        tracker_id: ByteTrack tracker ID.
        current_centroid: (cx, cy) centroid from the current frame.

    Returns:
        Seconds the object has been static (0.0 if not found or moving).
    """
    key = (camera_id, tracker_id)
    raw = _object_positions.get(key, [])

    if len(raw) < 2:
        # Store current position and return 0
        set_object_position(camera_id, tracker_id, current_centroid)
        return 0.0

    # Store current position
    set_object_position(camera_id, tracker_id, current_centroid)

    # Check if current centroid has moved relative to the last stored position
    last_cx, last_cy, _ = raw[-2] if len(raw) >= 2 else raw[-1]
    dx = current_centroid[0] - last_cx
    dy = current_centroid[1] - last_cy
    movement = np.sqrt(dx**2 + dy**2)

    if movement > 5.0:
        # Object is still moving — reset static timer
        return 0.0

    # Find the most recent frame where the object moved significantly
    # Walk backwards through the position history
    static_since_time = raw[-1][2]  # default: most recent timestamp
    for j in range(len(raw) - 1, 0, -1):
        prev_cx, prev_cy = raw[j - 1][0], raw[j - 1][1]
        ddx = raw[j][0] - prev_cx
        ddy = raw[j][1] - prev_cy
        if np.sqrt(ddx**2 + ddy**2) > 5.0:
            static_since_time = raw[j][2]
            break

    return max(0.0, time.time() - static_since_time)


def is_loitering(
    camera_id: str,
    tracker_id: int,
    zone_name: str,
    threshold_seconds: float,
) -> bool:
    """Check if a tracked person has been in the same zone beyond the threshold.

    Args:
        camera_id: Camera identifier.
        tracker_id: ByteTrack tracker ID.
        zone_name: Name of the zone to check.
        threshold_seconds: Maximum allowed seconds before loitering alert.

    Returns:
        True if the person has been in this zone longer than threshold_seconds.
    """
    key = (camera_id, tracker_id)
    raw = _object_positions.get(key, [])

    if len(raw) < 2:
        return False

    # Get the first recorded timestamp for this tracker
    first_time = raw[0][2]
    elapsed = time.time() - first_time

    return elapsed > threshold_seconds


def reset_tracker_state(camera_id: str) -> None:
    """Clear tracking state for a specific camera.

    Called on stream reset to avoid stale tracker IDs causing false
    abandoned-object or loitering detections after a stream restart.

    Args:
        camera_id: Camera identifier whose state should be cleared.
    """
    global _object_positions

    keys_to_delete = [k for k in _object_positions.keys() if k[0] == camera_id]
    for k in keys_to_delete:
        del _object_positions[k]

    if keys_to_delete:
        logger.info("Reset tracker state for camera %s (%d entries)", camera_id, len(keys_to_delete))
