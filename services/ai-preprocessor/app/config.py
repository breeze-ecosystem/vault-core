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

    # ── BASTION — Weapon Detection (BAS-04, D-21) ────────────────
    WEAPON_CONFIDENCE_THRESHOLD: float = 0.6  # per D-21: >= 0.6 = alert

    # ── BASTION — Abandoned Object (BAS-03) ──────────────────────
    ABANDONED_OBJECT_MIN_SECONDS: int = 300  # default 5 minutes, configurable per zone

    # ── BASTION — Crowd Counting (BAS-05) ────────────────────────
    CROWD_COUNT_THRESHOLD: int = 20  # default persons per zone
    CROWD_DENSITY_THRESHOLD: float = 0.3  # default 30% density

    # ── BASTION — Behavior Analysis (BAS-06) ─────────────────────
    LOITERING_THRESHOLD_SECONDS: int = 120  # default 2 minutes

    # ── BASTION — Anti-spoofing (BAS-02, D-15) ───────────────────
    LIVENESS_SCORE_THRESHOLD: float = 0.3  # below this = reject as spoof (guardrail #2)
    LIVENESS_UNCERTAIN_THRESHOLD: float = 0.6  # 0.3-0.6 = operator notify

    # ── BASTION — Face Match Risk Scoring (BAS-01, D-11) ─────────
    FACE_RISK_MATCH_THRESHOLD: int = 85  # 85+ = match (default from similarity mapping)
    FACE_RISK_UNCERTAIN_THRESHOLD: int = 60  # 60-84 = uncertain

    # ── BASTION — Blacklist Matching (BAS-01, D-12) ──────────────
    BLACKLIST_MATCH_THRESHOLD: float = 0.48  # cosine similarity for blacklist alert

    class Config:
        env_file = ".env"


settings = Settings()
