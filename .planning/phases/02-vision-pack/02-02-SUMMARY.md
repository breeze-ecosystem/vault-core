---
phase: 02-vision-pack
plan: 02
subsystem: ai-preprocessor
tags: [insightface, onnxruntime, face-recognition, night-vision, yolo, zone-filtering, temporal-smoothing, opencv, python, fastapi]

# Dependency graph
requires:
  - phase: 01
    provides: AI Preprocessor microservice with YOLOv12+supervision detection pipeline
provides:
  - Face recognition module (insightface, CPU-only, whitelist up to 50 faces)
  - Night vision enhancement endpoint (histogram equalization + CLAHE)
  - Human-only detection with zone filtering (sv.PolygonZone)
  - Temporal smoothing (per-tracker rolling buffer, 3/5 frames minimum)
  - Per-camera confidence threshold passed through to YOLO
affects: [02-03, 02-04, 02-07, 02-08]

# Tech tracking
tech-stack:
  added: [insightface>=0.7.3, onnxruntime>=1.17.0]
  patterns: [face recogniser lazy singleton, whitelist cache with periodic refresh, run_in_executor for CPU-bound CV ops, PolygonZone geofencing, temporal smoothing frame buffer]

key-files:
  created:
    - services/ai-preprocessor/app/models/face_recogniser.py
    - services/ai-preprocessor/app/schemas/face_recognition.py
    - services/ai-preprocessor/app/routes/face_recognition.py
    - services/ai-preprocessor/app/routes/enhance.py
  modified:
    - services/ai-preprocessor/requirements.txt
    - services/ai-preprocessor/Dockerfile
    - services/ai-preprocessor/app/config.py
    - services/ai-preprocessor/app/main.py
    - services/ai-preprocessor/app/routes/detection.py

key-decisions:
  - "insightface buffalo_l with CPUExecutionProvider and ctx_id=-1 (no GPU fallback)"
  - "Whitelist cache fetched from NestJS /api/internal/face-whitelist, decoded from base64 float32 arrays"
  - "Face recognition only on highest-confidence person crop per frame (CPU budget constraint)"
  - "Night vision enhancement uses histogram-based approach (no deep learning) for <100ms latency"
  - "Temporal smoothing: 5-frame rolling window, 3/5 minimum for stable detection"
  - "Polygon zones in native frame coordinates, scaled from camera config"

patterns-established:
  - "FaceAnalysis singleton: lazy-loaded, CPU-only, same pattern as get_detector() in detector.py"
  - "Dark frame heuristic (mean pixel < 20) skips face recognition to avoid garbage embeddings"
  - "All CV inference via run_in_executor to avoid blocking FastAPI event loop"
  - "Per-tracker cooldown for face recognition (5s suppression after match)"

requirements-completed: [VIS-04, VIS-06, VIS-07, VIS-10, VIS-11]

# Metrics
duration: 3 min
completed: 2026-07-18
---

# Phase 02 Vision Pack — Plan 02: AI Preprocessor Face Recognition, Night Vision, and Detection Pipeline Extensions

**insightface CPU-only face recognition with whitelist matching, histogram-based night vision enhancement, and supervision PolygonZone geofencing with temporal smoothing integrated into the existing YOLOv12 detection pipeline**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-18T17:03:04Z
- **Completed:** 2026-07-18T17:06:42Z
- **Tasks:** 3
- **Files modified:** 10 (5 created, 5 modified)

## Accomplishments

- Insightface `buffalo_l` face recognition singleton (CPU-only, `providers=["CPUExecutionProvider"]`) with whitelist cache and cosine-similarity matching — lazy-loaded singleton pattern matching existing `get_detector()`
- Face recognition REST endpoints: `POST /face/recognise` (detect → crop → match), `POST /face/register` (extract embedding for enrollment), `POST /face/refresh-whitelist` (cache refresh from NestJS API)
- Night vision enhancement endpoint `POST /enhance` (histogram equalization + CLAHE + gamma correction, target <100ms CPU)
- Detection pipeline extended with three new features in `POST /detect`:
  - **Zone filtering**: `sv.PolygonZone` per polygon, drop detections outside all zones
  - **Temporal smoothing**: per-tracker rolling 5-frame buffer, min 3/5 positive for alert
  - **Face recognition**: on highest-confidence person crop, dark frame skip, 5s per-tracker cooldown
- All CPU-bound operations (`run_in_executor`) to prevent FastAPI event loop blocking
- Dockerfile pre-downloads `buffalo_l` model at build time (avoids 30-60s cold start) + VOLUME mount for persistence
- Model pre-download in Dockerfile, base64 decode error handling per threat register

## Task Commits

Each task was committed atomically:

1. **Task 1: insightface deps, config, face recogniser singleton, Pydantic schemas** - `ec823f9` (feat)
2. **Task 2: face recognition and night vision enhancement endpoints** - `f805507` (feat)
3. **Task 3: detection pipeline zone filtering, temporal smoothing, face rec** - `fc94ece` (feat)

## Files Created/Modified

### Created
- `services/ai-preprocessor/app/models/face_recogniser.py` - Insightface singleton, whitelist cache, temporal smoothing buffer, match helpers
- `services/ai-preprocessor/app/schemas/face_recognition.py` - Pydantic models: FaceWhitelistEntry, FaceRecognitionRequest, FaceMatch, FaceRecognitionResponse, FaceRegistrationRequest
- `services/ai-preprocessor/app/routes/face_recognition.py` - /face/recognise, /face/register, /face/refresh-whitelist endpoints
- `services/ai-preprocessor/app/routes/enhance.py` - /enhance endpoint with histogram equalization + CLAHE

### Modified
- `services/ai-preprocessor/requirements.txt` - Added insightface>=0.7.3, onnxruntime>=1.17.0
- `services/ai-preprocessor/Dockerfile` - Pre-download buffalo_l model, VOLUME /root/.insightface
- `services/ai-preprocessor/app/config.py` - Added FACE_RECOGNITION_ENABLED, FACE_MATCH_THRESHOLD, FACE_WHITELIST_REFRESH_INTERVAL, MIN_FACE_SIZE
- `services/ai-preprocessor/app/main.py` - Registered face_recognition and enhance routers
- `services/ai-preprocessor/app/routes/detection.py` - Extended request/response models, added zone filtering, temporal smoothing, face recognition

## Decisions Made

- **insightface `buffalo_l`** chosen over DeepFace/dlib for CPU-only face recognition (lightweight, Apache 2.0 license, 180MB model pack)
- **Singleton pattern** for FaceAnalysis (same as YOLO detector) prevents ONNX memory leak from repeated session creation
- **CPU-only explicit** with `providers=["CPUExecutionProvider"]` and `ctx_id=-1` to avoid CUDA-related crashes on CPU hardware
- **Dark frame heuristic** (mean pixel < 20) skips face recognition entirely — embeddings from dark frames are unreliable
- **Max 1 person crop per frame** for face recognition — CPU budget constraint (~200ms per crop with insightface)
- **Night vision uses histogram-based approach** (not deep learning) — sufficient for visibility improvement, <100ms target

## Deviations from Plan

None - plan executed exactly as written.

## Threat Surface Scan

No new network endpoints or trust boundaries introduced beyond those explicitly declared in the plan's threat model. All routes are behind the existing FastAPI application with API_V1_PREFIX. The `/_notify_nestjs` function now includes `face_matches` and `zone_hits` in the payload to the existing internal endpoint.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required. The insightface model is pre-downloaded at Docker build time via the Dockerfile.

## Next Phase Readiness

- AI Preprocessor extended with face recognition (VIS-07), night vision (VIS-04), human-only zone-filtered detection (VIS-06, VIS-11), and per-camera sensitivity (VIS-10)
- Ready for plans 02-03 (NestJS API: face whitelist CRUD, detection zones, sensitivity), 02-04 (alert channels + recording), and downstream dashboard/mobile plans
- The `_whitelist_cache` expects a NestJS endpoint at `/api/internal/face-whitelist` (to be built in 02-03)

---

## Self-Check: PASSED

All 11 files verified on disk. All 4 commits found in git log. All 11 plan-level verification items pass (requirements, Dockerfile, config, face_recogniser, schemas, routes, main.py, detection extensions).

*Phase: 02-vision-pack*
*Completed: 2026-07-18*
