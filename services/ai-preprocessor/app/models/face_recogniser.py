from __future__ import annotations

import base64
import logging
import time

import cv2
import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)

# ── Lazy-loaded insightface singleton (CPU-only) ──────────────────────────────

_face_app: "FaceAnalysis | None" = None


def get_face_recogniser():
    """Return the lazy-loaded insightface FaceAnalysis singleton.

    CPU-only: uses CPUExecutionProvider and ctx_id=-1 to avoid CUDA crashes
    on CPU-only hardware (Pitfall 1 from AI-SPEC §3).
    Follows the same lazy singleton pattern as get_detector() in detector.py.
    """
    global _face_app
    if _face_app is None:
        from insightface.app import FaceAnalysis

        logger.info("Loading insightface FaceAnalysis (buffalo_l, CPU-only)...")
        _face_app = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"],
        )
        _face_app.prepare(ctx_id=-1)
        logger.info("insightface FaceAnalysis loaded successfully")
    return _face_app


# ── Whitelist cache ───────────────────────────────────────────────────────────

_whitelist_cache: list[dict] = []
_last_cache_refresh: float = 0.0


async def refresh_whitelist_cache() -> None:
    """Fetch the face whitelist from NestJS API and rebuild the in-memory cache.

    GET {NESTJS_API_URL}/api/internal/face-whitelist returns list of
    {id, name, embedding_base64}. Decodes base64 to np.float32 array.
    Falls back to stale cache on HTTP/network error.
    """
    global _whitelist_cache, _last_cache_refresh
    import httpx

    url = f"{settings.NESTJS_API_URL}/api/internal/face-whitelist"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

        entries: list[dict] = []
        for entry in data:
            emb_bytes = base64.b64decode(entry["embedding_base64"])
            emb = np.frombuffer(emb_bytes, dtype=np.float32).copy()
            entries.append({
                "id": entry["id"],
                "name": entry["name"],
                "embedding": emb,
            })

        _whitelist_cache = entries
        _last_cache_refresh = time.time()
        logger.info("Whitelist cache refreshed: %d faces", len(entries))
    except Exception as e:
        logger.error("Whitelist refresh failed (using stale cache): %s", e)


def match_whitelist(
    embedding: np.ndarray,
) -> tuple[float, str | None]:
    """Compare a face embedding against the whitelist cache.

    Uses cosine similarity (dot product since both vectors are L2-normalized).
    The caller is responsible for threshold checks.

    Args:
        embedding: L2-normalized 512-d embedding from insightface.

    Returns:
        Tuple of (best_similarity, best_id). best_id is None if cache is empty.
    """
    best_sim = -1.0
    best_id: str | None = None

    for entry in _whitelist_cache:
        sim = float(np.dot(embedding, entry["embedding"]))
        if sim > best_sim:
            best_sim = sim
            best_id = entry["id"]

    return best_sim, best_id


# ── Temporal smoothing buffer ─────────────────────────────────────────────────
# Shared across recognition routes and detection pipeline.
# Keyed by (camera_id, tracker_id) → rolling window of detection booleans.

_frame_buffer: dict[tuple[str, int], list[bool]] = {}
_MAX_SMOOTHING_FRAMES = 5
_MIN_POSITIVE_FRAMES = 3


def get_frame_buffer() -> dict:
    """Return the global frame buffer reference for temporal smoothing."""
    return _frame_buffer


def prune_stale_buffers() -> None:
    """Remove tracker buffers not seen in 30+ seconds.

    Prevents unbounded memory growth from tracker IDs that have left the frame.
    Called periodically after each frame is processed.
    """
    now = time.time()
    stale_keys = [
        k for k, v in _frame_buffer.items()
        if now - getattr(v, "_last_seen", now) > 30
    ]
    for k in stale_keys:
        del _frame_buffer[k]
    if stale_keys:
        logger.debug("Pruned %d stale tracking buffers", len(stale_keys))


# ── Dark frame heuristic ──────────────────────────────────────────────────────

_DARK_FRAME_THRESHOLD = 20  # mean pixel value below which frame is considered dark


def is_dark_frame(frame: np.ndarray) -> bool:
    """Check if a frame is too dark for reliable face recognition.

    Returns True if mean pixel value < threshold (default 20),
    indicating a night/dark frame where face embeddings are unreliable.
    """
    return float(np.mean(frame)) < _DARK_FRAME_THRESHOLD
