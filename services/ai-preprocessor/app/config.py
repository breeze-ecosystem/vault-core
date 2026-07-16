from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Ollama / VLM ─────────────────────────────────────────────────────
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    # ── API ──────────────────────────────────────────────────────────────
    API_V1_PREFIX: str = "/api/v1"
    NESTJS_API_URL: str = "http://api:4000"

    # ── Detection (YOLOv12) ──────────────────────────────────────────────
    DETECTION_MODEL: str = "yolov12n"
    DETECTION_CONFIDENCE: float = 0.45
    YOLO_PERSON_CLASSES: list[int] = [0]  # COCO person class (+ hard-hat/vest variants)

    # ── Transcription (Faster-Whisper) ───────────────────────────────────
    WHISPER_MODEL: str = "medium"
    WHISPER_DEVICE: str = "cpu"

    class Config:
        env_file = ".env"


settings = Settings()
