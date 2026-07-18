from __future__ import annotations

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

from app.config import settings
from app.models.detector import WEAPON_CLASS_IDS, detect
from app.models.face_recogniser import (
    get_face_recogniser,
    is_dark_frame,
    match_whitelist,
)
from app.models.tracker import get_tracker, set_object_position, track
from app.schemas.bastion import (
    AbandonedObjectAlert,
    BastionDetectionRequest,
    BastionDetectionResponse,
    BehaviorResult,
    CrowdCountResult,
    FaceMatchResult,
    WeaponResult,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Pipeline stage helpers (implemented in Task 2-3) ───────────────────────────


def _check_weapons(
    detections_sv: sv.Detections,
    frame: np.ndarray,
) -> list[WeaponResult]:
    """Filter detections for weapon class IDs with minimum confidence threshold.

    Per D-21:
    - Confidence >= WEAPON_CONFIDENCE_THRESHOLD (0.6) = include as alert
    - Confidence 0.3-0.59 = low-confidence (currently excluded from alert;
      future: add to review queue)
    """
    if len(detections_sv) == 0:
        return []

    weapon_mask = np.zeros(len(detections_sv), dtype=bool)
    for i in range(len(detections_sv)):
        class_id = int(detections_sv.class_id[i]) if hasattr(detections_sv, "class_id") else -1
        if class_id in WEAPON_CLASS_IDS:
            conf = float(detections_sv.confidence[i]) if hasattr(detections_sv, "confidence") else 0.0
            if conf >= settings.WEAPON_CONFIDENCE_THRESHOLD:
                weapon_mask[i] = True

    if not weapon_mask.any():
        return []

    weapon_dets = detections_sv[weapon_mask]
    results: list[WeaponResult] = []
    class_names = {96: "firearm", 97: "knife", 98: "suspicious_object"}

    for i in range(len(weapon_dets)):
        class_id = int(weapon_dets.class_id[i]) if hasattr(weapon_dets, "class_id") else -1
        conf = float(weapon_dets.confidence[i]) if hasattr(weapon_dets, "confidence") else 0.0
        bbox = weapon_dets.xyxy[i].tolist() if hasattr(weapon_dets, "xyxy") else []
        tracker_id = (
            int(weapon_dets.tracker_id[i])
            if hasattr(weapon_dets, "tracker_id") and weapon_dets.tracker_id[i] is not None
            else None
        )

        results.append(
            WeaponResult(
                class_name=class_names.get(class_id, f"class_{class_id}"),
                confidence=round(conf, 4),
                bbox=[round(float(c), 2) for c in bbox],
                tracker_id=tracker_id,
            )
        )

    return results


def _check_abandoned(
    detections_tracked: sv.Detections,
    camera_id: str,
    zones: list[np.ndarray],
    zone_names: list[str],
    frame: np.ndarray,
) -> list[AbandonedObjectAlert]:
    """Detect objects that have been static in a zone beyond the configured threshold.

    For each tracked detection that is NOT a person class, measure static duration
    via the tracker's position history. An object is "abandoned" if:
    (a) it is not a person,
    (b) it has been static > ABANDONED_OBJECT_MIN_SECONDS,
    (c) it is within a configured detection zone.
    """
    if len(detections_tracked) == 0 or not zones:
        return []

    from app.models.tracker import get_static_duration

    results: list[AbandonedObjectAlert] = []

    for i in range(len(detections_tracked)):
        class_id = int(detections_tracked.class_id[i]) if hasattr(detections_tracked, "class_id") else -1

        # Skip person class (COCO class 0) — only non-person objects can be abandoned
        if class_id == 0:
            continue

        tracker_id = (
            int(detections_tracked.tracker_id[i])
            if hasattr(detections_tracked, "tracker_id") and detections_tracked.tracker_id[i] is not None
            else None
        )
        if tracker_id is None:
            continue

        bbox = detections_tracked.xyxy[i] if hasattr(detections_tracked, "xyxy") else None
        if bbox is None:
            continue

        # Compute centroid
        centroid = (float((bbox[0] + bbox[2]) / 2), float((bbox[1] + bbox[3]) / 2))

        # Check which zone this object is in
        for z_idx, polygon in enumerate(zones):
            pts = np.array([polygon], dtype=np.int32)
            # Point-in-polygon test
            inside = cv2.pointPolygonTest(pts[0], (int(centroid[0]), int(centroid[1])), False) >= 0
            if not inside:
                continue

            # Get static duration from tracker
            static_seconds = get_static_duration(camera_id, tracker_id, centroid)

            if static_seconds >= settings.ABANDONED_OBJECT_MIN_SECONDS:
                zone_name = zone_names[z_idx] if z_idx < len(zone_names) else f"zone_{z_idx}"
                results.append(
                    AbandonedObjectAlert(
                        zone_name=zone_name,
                        tracker_id=tracker_id,
                        static_duration_seconds=round(static_seconds, 1),
                        bbox=[round(float(c), 2) for c in bbox],
                    )
                )
                break  # Only report once per object

    return results


def _count_crowd(
    detections_sv: sv.Detections,
    zones: list[np.ndarray],
    zone_names: list[str],
    frame_shape: tuple[int, int],
) -> list[CrowdCountResult]:
    """Count persons per zone and compute density.

    Filters to person class (COCO class 0), counts centroids within each zone,
    and computes density relative to zone area ratio.
    """
    if len(detections_sv) == 0 or not zones:
        return []

    # Filter persons only
    person_mask = detections_sv.class_id == 0 if hasattr(detections_sv, "class_id") else np.zeros(len(detections_sv), dtype=bool)
    persons = detections_sv[person_mask]

    if len(persons) == 0:
        return []

    results: list[CrowdCountResult] = []
    frame_area = frame_shape[0] * frame_shape[1]

    for z_idx, polygon in enumerate(zones):
        zone_name = zone_names[z_idx] if z_idx < len(zone_names) else f"zone_{z_idx}"

        # Count persons in this zone
        sv_zone = sv.PolygonZone(
            polygon=np.array(polygon, dtype=np.int32),
            frame_resolution_wh=(frame_shape[1], frame_shape[0]),
        )
        in_zone = sv_zone.trigger(detections=persons)
        person_count = int(in_zone.sum())

        # Zone area ratio as fraction of frame
        zone_contour = np.array(polygon, dtype=np.int32)
        zone_area = float(cv2.contourArea(zone_contour))
        zone_area_ratio = zone_area / max(frame_area, 1)

        # Density: count / expected capacity (zone_area_ratio * base capacity)
        # The denominator is zone_area_ratio * 100 as a rough density heuristic
        density_denom = max(zone_area_ratio * 100, 1)
        density_percent = round(min(100.0, (person_count / density_denom) * 100), 1)

        threshold_exceeded = (
            person_count > settings.CROWD_COUNT_THRESHOLD
            or density_percent > settings.CROWD_DENSITY_THRESHOLD * 100
        )

        results.append(
            CrowdCountResult(
                zone_name=zone_name,
                person_count=person_count,
                density_percent=density_percent,
                threshold_exceeded=threshold_exceeded,
            )
        )

    return results


def _check_behavior(
    detections_tracked: sv.Detections,
    camera_id: str,
    zones: list[np.ndarray],
    zone_names: list[str],
    frame: np.ndarray,
) -> list[BehaviorResult]:
    """Detect zone intrusion and loitering behavior.

    Zone intrusion: any person detection whose centroid enters a configured zone.
    Loitering: person tracker_id in a zone beyond LOITERING_THRESHOLD_SECONDS.
    """
    if len(detections_tracked) == 0 or not zones:
        return []

    from app.models.tracker import is_loitering

    results: list[BehaviorResult] = []

    for i in range(len(detections_tracked)):
        class_id = int(detections_tracked.class_id[i]) if hasattr(detections_tracked, "class_id") else -1
        if class_id != 0:  # person class only
            continue

        bbox = detections_tracked.xyxy[i] if hasattr(detections_tracked, "xyxy") else None
        if bbox is None:
            continue

        centroid = (float((bbox[0] + bbox[2]) / 2), float((bbox[1] + bbox[3]) / 2))
        tracker_id = (
            int(detections_tracked.tracker_id[i])
            if hasattr(detections_tracked, "tracker_id") and detections_tracked.tracker_id[i] is not None
            else None
        )

        for z_idx, polygon in enumerate(zones):
            pts = np.array([polygon], dtype=np.int32)
            inside = cv2.pointPolygonTest(pts[0], (int(centroid[0]), int(centroid[1])), False) >= 0
            if not inside:
                continue

            zone_name = zone_names[z_idx] if z_idx < len(zone_names) else f"zone_{z_idx}"

            # Zone intrusion (any person entering a zone)
            results.append(
                BehaviorResult(
                    behavior_type="zone_intrusion",
                    zone_name=zone_name,
                    tracker_id=tracker_id,
                    confidence=1.0,
                    bbox=[round(float(c), 2) for c in bbox],
                )
            )

            # Loitering check (person in zone beyond threshold)
            if tracker_id is not None and is_loitering(
                camera_id, tracker_id, zone_name, float(settings.LOITERING_THRESHOLD_SECONDS)
            ):
                results.append(
                    BehaviorResult(
                        behavior_type="loitering",
                        zone_name=zone_name,
                        tracker_id=tracker_id,
                        confidence=1.0,
                        bbox=[round(float(c), 2) for c in bbox],
                    )
                )

            break  # first zone match per detection

    return results


# ── NestJS notification (fire-and-forget) ─────────────────────────────────────


async def _notify_bastion(
    response: BastionDetectionResponse,
    camera_id: str,
    organization_id: str,
    timestamp: str | None,
    has_critical_blacklist: bool = False,
) -> None:
    """POST BASTION detection results to the NestJS internal bastion-detection endpoint.

    Fire-and-forget: errors are logged but never surfaced to the caller.
    The detection pipeline must never block on NestJS availability.
    """
    if not settings.NESTJS_API_URL:
        logger.warning("NESTJS_API_URL not configured — skipping BASTION notification")
        return

    url = f"{settings.NESTJS_API_URL}/api/internal/bastion-detection"
    payload = {
        "camera_id": camera_id,
        "organization_id": organization_id,
        "timestamp": timestamp,
        "weapons": [w.model_dump() for w in response.weapons],
        "abandoned_objects": [a.model_dump() for a in response.abandoned_objects],
        "crowd_counts": [c.model_dump() for c in response.crowd_counts],
        "behaviors": [b.model_dump() for b in response.behaviors],
        "face_matches": [f.model_dump() for f in response.face_matches],
        "has_critical_blacklist": has_critical_blacklist,
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            logger.info(
                "Notified NestJS of BASTION detection for camera %s "
                "(%d weapons, %d abandoned, %d crowd, %d behaviors, %d face matches)",
                camera_id,
                len(response.weapons),
                len(response.abandoned_objects),
                len(response.crowd_counts),
                len(response.behaviors),
                len(response.face_matches),
            )
    except httpx.HTTPError as e:
        logger.error("Failed to notify NestJS BASTION API: %s", e)


# ── Route Handler ─────────────────────────────────────────────────────────────


@router.post("/bastion/detect", response_model=BastionDetectionResponse)
async def bastion_detect(request: BastionDetectionRequest):
    """Run the full BASTION multi-stage detection pipeline on a camera frame.

    Stages:
    1. Decode base64 frame
    2. YOLOv12 object detection (executor)
    3. Zone filtering via sv.PolygonZone
    4. ByteTrack cross-frame tracking
    5. Weapon detection (filter class_ids, threshold by WEAPON_CONFIDENCE_THRESHOLD)
    6. Abandoned object detection (static duration per tracker_id)
    7. Crowd counting (persons per zone)
    8. Behavior analysis (zone intrusion, loitering)
    9. Face recognition (if enabled, with anti-spoofing if enabled)
    10. Fire-and-forget notify NestJS
    11. Return BastionDetectionResponse

    CPU-bound operations run via run_in_executor to avoid blocking the event loop.
    """
    start = time.time()
    loop = asyncio.get_running_loop()

    # ── 1. Decode base64 image ──────────────────────────────────────────────
    try:
        image_data = base64.b64decode(request.image_base64)
        image = Image.open(io.BytesIO(image_data))
    except Exception as e:
        logger.error("Failed to decode BASTION image: %s", e)
        raise HTTPException(status_code=400, detail="Invalid image data")

    frame = np.array(image.convert("RGB"))

    # ── 2. YOLOv12 object detection in executor ─────────────────────────────
    detections_sv = await loop.run_in_executor(
        None, lambda: detect(frame, confidence=request.confidence),
    )

    if len(detections_sv) == 0:
        elapsed = round((time.time() - start) * 1000, 2)
        return BastionDetectionResponse(
            camera_id=request.camera_id,
            processing_time_ms=elapsed,
        )

    # Parse zones from request
    zones: list[np.ndarray] = []
    zone_names: list[str] = []
    for z_idx, polygon_verts in enumerate(request.detection_zones):
        polygon = np.array(polygon_verts, dtype=np.int32)
        zones.append(polygon)
        zone_names.append(f"zone_{z_idx}")

    # ── 3. Zone filtering ───────────────────────────────────────────────────
    if zones:
        in_any_zone = np.zeros(len(detections_sv), dtype=bool)
        for polygon in zones:
            zone = sv.PolygonZone(
                polygon=polygon,
                frame_resolution_wh=(frame.shape[1], frame.shape[0]),
            )
            in_any_zone |= zone.trigger(detections=detections_sv)
        detections_sv = detections_sv[in_any_zone]

    if len(detections_sv) == 0:
        elapsed = round((time.time() - start) * 1000, 2)
        return BastionDetectionResponse(
            camera_id=request.camera_id,
            processing_time_ms=elapsed,
        )

    # ── 4. ByteTrack cross-frame tracking ───────────────────────────────────
    detections_tracked = track(detections_sv)

    # Record centroid positions for all tracked detections (per-camera state)
    # Required for abandoned object static-duration and loitering detection.
    if hasattr(detections_tracked, "tracker_id") and detections_tracked.tracker_id is not None:
        for i in range(len(detections_tracked)):
            tid = int(detections_tracked.tracker_id[i])
            if tid is not None:
                bbox = detections_tracked.xyxy[i]
                cx = float((bbox[0] + bbox[2]) / 2)
                cy = float((bbox[1] + bbox[3]) / 2)
                set_object_position(request.camera_id, tid, (cx, cy))

    # ── 5. Weapon detection ─────────────────────────────────────────────────
    weapons = _check_weapons(detections_tracked, frame)

    # ── 6. Abandoned object detection ───────────────────────────────────────
    abandoned = _check_abandoned(detections_tracked, request.camera_id, zones, zone_names, frame)

    # ── 7. Crowd counting ───────────────────────────────────────────────────
    crowd_counts = _count_crowd(detections_tracked, zones, zone_names, frame.shape)

    # ── 8. Behavior analysis ────────────────────────────────────────────────
    behaviors = _check_behavior(detections_tracked, request.camera_id, zones, zone_names, frame)

    # ── 9. Face recognition (if enabled) ────────────────────────────────────
    face_matches: list[FaceMatchResult] = []
    has_critical_blacklist = False

    if request.enable_face_recognition and settings.FACE_RECOGNITION_ENABLED and not is_dark_frame(frame):
        # Face recognition stage — process person detections
        person_indices = []
        for i in range(len(detections_tracked)):
            class_id = int(detections_tracked.class_id[i]) if hasattr(detections_tracked, "class_id") else -1
            if class_id == 0:
                person_indices.append(i)

        for idx in person_indices:
            x1, y1, x2, y2 = map(int, detections_tracked.xyxy[idx])
            crop_w = x2 - x1
            crop_h = y2 - y1

            if crop_w < settings.MIN_FACE_SIZE or crop_h < settings.MIN_FACE_SIZE:
                continue

            # Expand bbox 20% upward for better face capture
            y1_expanded = max(0, y1 - int(crop_h * 0.2))
            person_crop = frame[y1_expanded:y2, x1:x2]

            if person_crop.size == 0:
                continue

            crop_bgr = cv2.cvtColor(person_crop, cv2.COLOR_RGB2BGR)

            face_result = await loop.run_in_executor(
                None,
                _run_face_rec_on_crop,
                crop_bgr,
                settings.FACE_MATCH_THRESHOLD,
                request.enable_anti_spoofing,
            )

            if face_result is not None:
                fm = face_result  # Already a FaceMatchResult dict
                if fm.risk_score >= 85 and fm.is_blacklisted:
                    has_critical_blacklist = True  # CRITICAL alert for blacklist match
                face_matches.append(fm)

    # ── 10. Build response and notify NestJS ────────────────────────────────
    elapsed = round((time.time() - start) * 1000, 2)

    response = BastionDetectionResponse(
        weapons=weapons,
        abandoned_objects=abandoned,
        crowd_counts=crowd_counts,
        behaviors=behaviors,
        face_matches=face_matches,
        camera_id=request.camera_id,
        processing_time_ms=elapsed,
    )

    # Fire-and-forget notification
    await _notify_bastion(
        response,
        request.camera_id,
        request.organization_id,
        request.timestamp,
        has_critical_blacklist=has_critical_blacklist,
    )

    logger.info(
        "BASTION detection completed: %d weapons, %d abandoned, %d crowd, "
        "%d behaviors, %d face matches in %.2fms for %s",
        len(weapons),
        len(abandoned),
        len(crowd_counts),
        len(behaviors),
        len(face_matches),
        elapsed,
        request.camera_id,
    )

    return response


# ── Face recognition helper (runs in executor) ────────────────────────────────


def _run_face_rec_on_crop(
    crop_bgr: np.ndarray,
    match_threshold: float,
    enable_anti_spoofing: bool = False,
) -> FaceMatchResult | None:
    """Run insightface face detection + BASTION analysis on a BGR crop.

    Returns a FaceMatchResult or None if no face detected.
    Incorporates anti-spoofing (liveness), blacklist matching, and risk scoring.
    """
    try:
        face_recogniser = get_face_recogniser()
        faces = face_recogniser.get(crop_bgr)

        if not faces:
            return None

        best_face = max(faces, key=lambda f: f.det_score)
        emb = best_face.normed_embedding

        # Get liveness score (anti-spoofing)
        liveness_score = 0.0
        if enable_anti_spoofing:
            try:
                # insightface buffalo_l returns liveness via faces[0].score
                liveness_score = float(getattr(best_face, "score", 0.0))
            except Exception as e:
                logger.error("Anti-spoofing error: %s", e)
                liveness_score = 0.0

        is_spoof = liveness_score < settings.LIVENESS_SCORE_THRESHOLD if enable_anti_spoofing else False

        # Run whitelist matching
        best_sim, best_id = match_whitelist(emb)

        # Run blacklist matching
        from app.models.face_recogniser import match_blacklist

        blacklist_sim, blacklist_entry = match_blacklist(emb)

        # Compute risk score from best similarity (whitelist or blacklist)
        from app.models.face_recogniser import similarity_to_risk_score

        risk_score = 0
        is_blacklisted = False
        name = None

        if blacklist_entry is not None and blacklist_sim >= settings.BLACKLIST_MATCH_THRESHOLD:
            # Blacklist match takes priority
            risk_score = similarity_to_risk_score(blacklist_sim)
            is_blacklisted = True
            name = blacklist_entry.get("name")
        elif best_sim >= match_threshold and best_id is not None:
            # Whitelist match
            risk_score = similarity_to_risk_score(best_sim)
            # Look up name from whitelist cache
            from app.models.face_recogniser import _whitelist_cache

            for entry in _whitelist_cache:
                if entry["id"] == best_id:
                    name = entry["name"]
                    break
        else:
            # No match — still return a result with risk_score=0
            risk_score = 0

        return FaceMatchResult(
            name=name,
            risk_score=risk_score,
            is_blacklisted=is_blacklisted,
            liveness_score=round(liveness_score, 4) if enable_anti_spoofing else None,
            is_spoof=is_spoof,
            anti_spoofing_score=round(liveness_score, 4) if enable_anti_spoofing else None,
        )
    except Exception as e:
        logger.error("BASTION face recognition error on crop: %s", e)
        return None
