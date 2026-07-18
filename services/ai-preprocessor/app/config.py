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

    # ── Face Recognition (insightface) ────────────────────────────
    FACE_RECOGNITION_ENABLED: bool = True
    FACE_MATCH_THRESHOLD: float = 0.48
    FACE_WHITELIST_REFRESH_INTERVAL: int = 60  # seconds
    MIN_FACE_SIZE: int = 80  # minimum face crop dimension in px

    class Config:
        env_file = ".env"


settings = Settings()
