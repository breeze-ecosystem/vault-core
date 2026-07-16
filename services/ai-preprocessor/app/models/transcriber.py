from __future__ import annotations

import logging

from app.config import settings

logger = logging.getLogger(__name__)

# Lazy-loaded Faster-Whisper model (cold start on first request)
_whisper_model = None


def get_whisper(model_size: str | None = None):
    """Return the lazy-loaded Faster-Whisper model instance.

    Uses the model size from config.WHISPER_MODEL if not explicitly provided.
    Defaults to "medium" with CPU/int8 inference.
    The model is loaded once and cached globally.
    """
    global _whisper_model
    if _whisper_model is None:
        size = model_size or settings.WHISPER_MODEL
        device = settings.WHISPER_DEVICE
        logger.info(
            "Loading Faster-Whisper model: %s on %s (first call may be slow)...",
            size,
            device,
        )
        from faster_whisper import WhisperModel

        _whisper_model = WhisperModel(
            size, device=device, compute_type="int8"
        )
    return _whisper_model


def transcribe(audio_path_or_bytes, language: str = "fr") -> str:
    """Transcribe audio using Faster-Whisper.

    Args:
        audio_path_or_bytes: Path to an audio file, or bytes/array of audio data.
        language: Language code for transcription. Defaults to "fr" (French)
                  per D-37 (Oversight Hub primary deployment language).

    Returns:
        Transcribed text as a string. Returns empty string on failure.
    """
    try:
        model = get_whisper()
        segments, info = model.transcribe(audio_path_or_bytes, language=language)
        text = " ".join(segment.text.strip() for segment in segments)
        return text
    except Exception as e:
        logger.error("Transcription failed: %s", e)
        return ""
