from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

# Lazy-loaded YAMNet model (cold start on first request)
_yamnet_model = None

# YAMNet class ID whitelist: (yamnet_class_id, class_name, alert_severity)
# Maps YAMNet AudioSet ontology class IDs to Oversight Hub alert types.
# See: https://github.com/tensorflow/models/blob/master/research/audioset/yamnet/yamnet_class_map.csv
WHITELIST: list[tuple[int, str, str]] = [
    # Critical — immediate threat events
    (420, "Gunshot, gunfire", "CRITICAL"),
    (421, "Explosion", "CRITICAL"),
    (422, "Burst, pop", "INFO"),  # False-positive filter: pop alone is not CRITICAL
    # High — urgent attention needed
    (383, "Alarm", "HIGH"),
    (384, "Siren", "HIGH"),
    (174, "Glass breaking / shattering", "HIGH"),
    # Medium — potential concern
    (3, "Shout", "MEDIUM"),
    (8, "Yell", "MEDIUM"),
    (5, "Screaming", "MEDIUM"),
    (81, "Breaking", "HIGH"),  # General breaking sound (complements glass)
    # Info — situational awareness
    (186, "Dog barking", "INFO"),
    (405, "Door slamming", "INFO"),
    (402, "Vehicle horn", "INFO"),
    (401, "Vehicle", "INFO"),
    (414, "Engine", "INFO"),
    (388, "Smoke detector / fire alarm", "CRITICAL"),
]

# Default confidence threshold for YAMNet detections
_YAMNET_CONFIDENCE_THRESHOLD = 0.3


def get_yamnet():
    """Return the lazy-loaded YAMNet model from TensorFlow Hub.

    The model is downloaded once on first call and cached globally.
    Uses tfhub.dev/google/yamnet/1.
    """
    global _yamnet_model
    if _yamnet_model is None:
        logger.info("Loading YAMNet model from TF Hub (first call may be slow)...")
        import tensorflow_hub as hub

        _yamnet_model = hub.load("https://tfhub.dev/google/yamnet/1")
    return _yamnet_model


def classify_audio(
    audio_samples,
    sample_rate: int = 16000,
    confidence_threshold: float | None = None,
) -> list[dict]:
    """Classify audio samples using YAMNet, returning only whitelisted events.

    Args:
        audio_samples: numpy array of float32 audio samples.
        sample_rate: Sample rate of the audio (default 16000 Hz — YAMNet native rate).
        confidence_threshold: Minimum confidence to include a detection.
                              Defaults to _YAMNET_CONFIDENCE_THRESHOLD (0.3).

    Returns:
        List of dicts with keys: class_name, class_id, confidence, alert_severity.
        Only returns detections that match the WHITELIST and meet the confidence threshold.
    """
    import numpy as np

    model = get_yamnet()
    threshold = (
        confidence_threshold
        if confidence_threshold is not None
        else _YAMNET_CONFIDENCE_THRESHOLD
    )

    # Ensure audio is 1D float32 at 16kHz
    audio_np = np.array(audio_samples, dtype=np.float32)
    if audio_np.ndim > 1:
        audio_np = audio_np.mean(axis=0)  # Convert stereo to mono

    # Run YAMNet inference
    scores, embeddings, spectrogram = model(audio_np)

    # Build whitelist lookup for fast matching
    whitelist_map: dict[int, tuple[str, str]] = {}
    for class_id, class_name, severity in WHITELIST:
        whitelist_map[class_id] = (class_name, severity)

    # Extract top scores per frame and filter
    results: list[dict] = []
    for frame_idx in range(scores.shape[0]):
        frame_scores = scores.numpy()[frame_idx]
        top_class_id = int(np.argmax(frame_scores))
        top_confidence = float(frame_scores[top_class_id])

        if top_confidence < threshold:
            continue

        if top_class_id in whitelist_map:
            class_name, severity = whitelist_map[top_class_id]
            results.append(
                {
                    "class_name": class_name,
                    "class_id": top_class_id,
                    "confidence": round(top_confidence, 4),
                    "alert_severity": severity,
                }
            )

    # Deduplicate by class_name (keep highest confidence per class)
    deduped: dict[str, dict] = {}
    for r in results:
        key = r["class_name"]
        if key not in deduped or r["confidence"] > deduped[key]["confidence"]:
            deduped[key] = r

    return list(deduped.values())
