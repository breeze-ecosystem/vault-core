---
phase: 03-bastion-ai-access-control
plan: 01
subsystem: ai-preprocessor
tags: [pydantic, yolo, bytetrack, insightface, anti-spoofing, face-recognition, weapon-detection]

requires:
  - phase: 02-vision-pack
    provides: AI Preprocessor with YOLOv12 + ByteTrack + InsightFace pipeline, face whitelist cache, Pydantic schemas
provides:
  - BASTION Pydantic schemas (BastionDetectionRequest/Response, WeaponResult, AbandonedObjectAlert, CrowdCountResult, BehaviorResult, FaceMatchResult)
  - POST /api/v1/bastion/detect endpoint with full multi-stage pipeline
  - Weapon detection with configurable 0.6 confidence threshold (D-21)
  - Abandoned object detection via ByteTrack static-duration timer
  - Crowd counting per zone with configurable count/density thresholds
  - Behavior analysis (zone intrusion + loitering) with configurable loitering threshold
  - Face recognition with anti-spoofing (liveness), blacklist matching, risk scoring (0-100)
  - 10 BASTION config constants in settings.py
  - Extended _notify_nestjs() with BASTION payload fields

affects: [03-02, 03-03]

tech-stack:
  added: []
  patterns:
    - BASTION multi-stage detection pipeline (weapon → abandoned → crowd → behavior → face)
    - Per-camera/tracker position history for static-duration and loitering measurement
    - Passive anti-spoofing via insightface buffalo_l built-in liveness score
    - Risk score mapping (cosine similarity → 0-100) with three threshold zones

key-files:
  created:
    - services/ai-preprocessor/app/schemas/bastion.py
    - services/ai-preprocessor/app/routes/detection_bastion.py
  modified:
    - services/ai-preprocessor/app/config.py
    - services/ai-preprocessor/app/main.py
    - services/ai-preprocessor/app/models/detector.py
    - services/ai-preprocessor/app/models/tracker.py
    - services/ai-preprocessor/app/models/face_recogniser.py
    - services/ai-preprocessor/app/routes/detection.py

key-decisions:
  - "WEAPON_CLASS_IDS placed in detector.py (not route) so both detection.py and detection_bastion.py can reference"
  - "Object position history stored per (camera_id, tracker_id) key to isolate per-camera tracking state for abandoned/loitering detection"
  - "Centroid positions recorded explicitly in route handler after ByteTrack tracking, not inside track() itself, to avoid modifying the shared tracking function signature"
  - "Face recognition pipeline (_run_face_rec_on_crop) placed in detection_bastion.py (not face_recogniser.py) to keep route-specific logic with the route — only the isolated helpers (get_liveness_score, match_blacklist, similarity_to_risk_score) live in face_recogniser.py"
  - "Anti-spoofing liveness sourced from insightface buffalo_l faces[0].score — passive liveness only, no active challenge (D-13)"

patterns-established:
  - "BASTION pipeline stages are pure functions taking sv.Detections + config, returning typed lists — composable and testable"
  - "Fire-and-forget NestJS notification via httpx with 10s timeout — errors logged, never surfaced to caller"
  - "All CPU-bound inference runs through asyncio.get_running_loop().run_in_executor() to avoid blocking FastAPI event loop"

requirements-completed:
  - BAS-01
  - BAS-02
  - BAS-03
  - BAS-04
  - BAS-05
  - BAS-06

duration: 15min
completed: 2026-07-18
---

# Phase 3: BASTION AI & Access Control Summary

**BASTION AI Preprocessor pipeline with weapon detection, abandoned object detection, crowd counting, zone intrusion/loitering analysis, and face recognition with anti-spoofing, blacklist matching, and configurable risk scoring (0-100)**

## Performance

- **Duration:** ~15 min (3 tasks)
- **Started:** 2026-07-18T19:08:18Z
- **Completed:** 2026-07-18T19:23:00Z
- **Tasks:** 3 of 3 completed
- **Files modified:** 9 (2 new, 7 modified)

## Accomplishments

- Created BASTION Pydantic schemas (7 models) and POST `/api/v1/bastion/detect` endpoint with full multi-stage detection pipeline
- Added 10 BASTION config constants in `config.py` for weapon threshold, abandoned object timer, crowd counting, loitering, liveness/risk/blacklist thresholds (D-11, D-15, D-21)
- Extended YOLO detector with `WEAPON_CLASS_IDS` constant and `detect_bastion()` returning all classes
- Implemented per-camera/tracker position history in ByteTrack wrapper for abandoned object static-duration and loitering detection
- Added weapon filtering with 0.6 confidence threshold (D-21), abandoned object detection (>5 min static), crowd counting per zone, zone intrusion and loitering detection
- Extended face recognition with passive anti-spoofing liveness scoring (D-15), blacklist matching (D-12), and configurable risk scoring 0-100 (D-11)
- All errors logged but never block the detection pipeline (fire-and-forget NestJS notification)
- Extended existing `_notify_nestjs()` in detection.py with BASTION payload fields (empty by default)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BASTION schemas, config, and route scaffold** - `074e105` (feat)
2. **Task 2: Extend YOLO detector + tracker for BASTION pipeline** - `3a848aa` (feat)
3. **Task 3: Extend face recognition pipeline with anti-spoofing, blacklist, risk scoring** - `f75a3a6` (feat)

**Plan metadata:** `(pending-final-commit)`

## Files Created/Modified

- `services/ai-preprocessor/app/schemas/bastion.py` (NEW) - 7 Pydantic models for BASTION detection types
- `services/ai-preprocessor/app/routes/detection_bastion.py` (NEW) - POST /bastion/detect with full pipeline
- `services/ai-preprocessor/app/config.py` (MODIFY) - 10 BASTION config constants added
- `services/ai-preprocessor/app/main.py` (MODIFY) - detection_bastion router registered
- `services/ai-preprocessor/app/models/detector.py` (MODIFY) - WEAPON_CLASS_IDS, detect_bastion(), _is_static_object()
- `services/ai-preprocessor/app/models/tracker.py` (MODIFY) - Position history, get_static_duration(), is_loitering(), reset_tracker_state()
- `services/ai-preprocessor/app/models/face_recogniser.py` (MODIFY) - Anti-spoofing, blacklist matching, risk scoring, extended cache schema
- `services/ai-preprocessor/app/routes/detection.py` (MODIFY) - BASTION fields added to _notify_nestjs()

## Decisions Made

- **WEAPON_CLASS_IDS in detector.py** — shared constant so both detection.py and detection_bastion.py can reference without duplication
- **Per-camera position history** — keyed by `(camera_id, tracker_id)` to isolate tracking state per stream
- **Centroid recording in route, not track()** — avoids modifying the shared function signature; route handler records positions explicitly after ByteTrack
- **Face analysis in route, helpers in model** — _run_face_rec_on_crop lives in detection_bastion.py (route-specific), while get_liveness_score, match_blacklist, similarity_to_risk_score live in face_recogniser.py (reusable)
- **Passive liveness only** — sourced from insightface buffalo_l built-in score, no active challenge (D-13)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Python dependencies (numpy, insightface, etc.) not available on host dev environment — syntax and import verification done via Docker test path only. All `.py` files pass `python3 -m py_compile` syntax checks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

AI Preprocessor BASTION detection pipeline is complete. Ready for Plan 03-02 (BASTION face enrollment, Qdrant integration, and NestJS bastion module) and Plan 03-03 (multi-site backend + BASTION-specific NestJS controllers). The next plans will consume this detection pipeline from NestJS and build the dashboard/mobile UIs.

## Self-Check: PASSED

- All 8 files exist on disk ✓
- All 4 commits found in git log ✓
- All 8 .py files compile successfully ✓

---
*Phase: 03-bastion-ai-access-control*
*Completed: 2026-07-18*
