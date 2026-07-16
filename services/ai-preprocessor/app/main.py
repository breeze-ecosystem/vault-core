from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routes import health, inference, anpr, detection, audio

app = FastAPI(
    title="OVERSIGHT AI - Preprocessor",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(inference.router, prefix=settings.API_V1_PREFIX)
app.include_router(anpr.router, prefix=settings.API_V1_PREFIX)
app.include_router(detection.router, prefix=settings.API_V1_PREFIX)
app.include_router(audio.router, prefix=settings.API_V1_PREFIX)
