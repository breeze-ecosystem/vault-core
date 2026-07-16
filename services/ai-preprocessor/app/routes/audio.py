import base64
import io
import logging
import time

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.audio_classifier import classify_audio
from app.models.transcriber import transcribe

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Pydantic Models ──────────────────────────────────────────────────────────


class AudioClassifyRequest(BaseModel):
    """Request payload for audio event classification."""

    camera_id: str
    audio_base64: str | None = None
    audio_url: str | None = None
    organization_id: str


class AudioEvent(BaseModel):
    """A single audio classification event."""

    class_name: str
    confidence: float
    alert_severity: str  # CRITICAL / HIGH / MEDIUM / INFO
    timestamp: str | None = None
    class_id: int


class AudioClassifyResponse(BaseModel):
    """Response payload for audio classification results."""

    events: list[AudioEvent]
    camera_id: str
    processing_time_ms: float


class AudioTranscribeRequest(BaseModel):
    """Request payload for speech-to-text transcription."""

    audio_base64: str
    language: str = "fr"


class AudioTranscribeResponse(BaseModel):
    """Response payload for transcription results."""

    text: str
    processing_time_ms: float


# ── Helpers ──────────────────────────────────────────────────────────────────


def _decode_audio(audio_base64: str) -> np.ndarray:
    """Decode base64-encoded audio and convert to float32 numpy array.

    Uses scipy to read various audio formats (WAV, MP3, OGG, etc.)
    and resamples to 16000 Hz mono for YAMNet compatibility.
    """
    try:
        raw = base64.b64decode(audio_base64)
    except Exception as e:
        logger.error("Failed to decode audio base64: %s", e)
        raise HTTPException(status_code=400, detail="Invalid audio base64 data")

    try:
        from scipy.io import wavfile

        audio_buffer = io.BytesIO(raw)

        # Try as WAV first (scipy)
        try:
            sample_rate, data = wavfile.read(audio_buffer)
            # Convert to mono if stereo
            if data.ndim > 1:
                data = data.mean(axis=1).astype(np.float32)
            else:
                data = data.astype(np.float32)
            # Resample to 16kHz if needed
            if sample_rate != 16000:
                from scipy.signal import resample

                num_samples = int(len(data) * 16000 / sample_rate)
                data = resample(data, num_samples)
            return data
        except Exception:
            pass

        # Fallback: try soundfile
        try:
            import soundfile as sf

            audio_buffer.seek(0)
            data, sample_rate = sf.read(audio_buffer, dtype="float32")
            if data.ndim > 1:
                data = np.mean(data, axis=1)
            if sample_rate != 16000:
                from scipy.signal import resample

                num_samples = int(len(data) * 16000 / sample_rate)
                data = resample(data, num_samples)
            return data
        except Exception:
            pass

        # Last resort: treat as raw PCM 16-bit mono 16kHz
        audio_buffer.seek(0)
        raw_pcm = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
        return raw_pcm

    except Exception as e:
        logger.error("Failed to process audio data: %s", e)
        raise HTTPException(status_code=400, detail=f"Audio processing failed: {e}")


# ── Route Handlers ───────────────────────────────────────────────────────────


@router.post("/audio/classify", response_model=AudioClassifyResponse)
async def classify_audio_endpoint(request: AudioClassifyRequest):
    """Classify audio for security-relevant events (glass break, gunshot, etc.).

    Accepts base64-encoded audio or an audio URL. Runs YAMNet inference
    and returns only whitelisted event types with alert severities.
    """
    start = time.time()

    # Decode audio
    if request.audio_base64:
        audio_samples = _decode_audio(request.audio_base64)
    elif request.audio_url:
        raise HTTPException(
            status_code=501,
            detail="Audio URL fetching not yet implemented — use audio_base64",
        )
    else:
        raise HTTPException(
            status_code=400,
            detail="Either audio_base64 or audio_url must be provided",
        )

    # Run YAMNet classification
    raw_events = classify_audio(audio_samples)

    events = []
    for evt in raw_events:
        events.append(
            AudioEvent(
                class_name=evt["class_name"],
                confidence=evt["confidence"],
                alert_severity=evt["alert_severity"],
                class_id=evt["class_id"],
                timestamp=request.timestamp if hasattr(request, "timestamp") else None,
            )
        )

    elapsed = round((time.time() - start) * 1000, 2)
    logger.info(
        "Audio classification: %d events in %.2fms for camera %s",
        len(events),
        elapsed,
        request.camera_id,
    )

    return AudioClassifyResponse(
        events=events,
        camera_id=request.camera_id,
        processing_time_ms=elapsed,
    )


@router.post("/audio/transcribe", response_model=AudioTranscribeResponse)
async def transcribe_audio_endpoint(request: AudioTranscribeRequest):
    """Transcribe speech from audio to text using Faster-Whisper.

    Defaults to French transcription per D-37. Accepts base64-encoded
    audio in common formats (WAV, MP3, OGG).
    """
    start = time.time()

    if not request.audio_base64:
        raise HTTPException(status_code=400, detail="audio_base64 is required")

    try:
        audio_bytes = base64.b64decode(request.audio_base64)
    except Exception as e:
        logger.error("Failed to decode audio base64: %s", e)
        raise HTTPException(status_code=400, detail="Invalid audio base64 data")

    # Transcribe with Faster-Whisper
    text = transcribe(audio_bytes, language=request.language)

    elapsed = round((time.time() - start) * 1000, 2)
    logger.info("Transcription completed in %.2fms (%d chars)", elapsed, len(text))

    return AudioTranscribeResponse(text=text, processing_time_ms=elapsed)
