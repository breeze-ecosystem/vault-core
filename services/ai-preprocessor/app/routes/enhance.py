from __future__ import annotations

import base64
import io
import logging
import time

import cv2
import numpy as np
from fastapi import APIRouter, HTTPException
from PIL import Image
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Pydantic Models ───────────────────────────────────────────────────────────


class EnhanceRequest(BaseModel):
    """Request to enhance a camera frame (e.g., night vision)."""

    image_base64: str
    mode: str = "night"  # Currently only 'night' mode is supported


class EnhanceResponse(BaseModel):
    """Response payload for enhanced image."""

    image_base64: str
    mode: str
    processing_time_ms: float


# ── Enhancement Logic ─────────────────────────────────────────────────────────


def _enhance_night(frame_rgb: np.ndarray) -> np.ndarray:
    """Apply histogram equalization + mild CLAHE for night vision enhancement.

    Process:
    1. Convert RGB → YUV (Y = luminance channel)
    2. Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) on Y channel
    3. Apply global histogram equalization on Y channel (weighted blend)
    4. Convert back to RGB

    Target: <100ms on consumer CPU, improved visibility without noise amplification.
    This is a lightweight histogram-based enhancement, NOT a deep learning model.
    """
    # Convert to YUV color space
    frame_yuv = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2YUV)
    y_channel = frame_yuv[:, :, 0].astype(np.uint8)

    # Apply CLAHE (contrast-limited adaptive histogram equalization)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    y_clahe = clahe.apply(y_channel)

    # Apply global histogram equalization
    y_equalized = cv2.equalizeHist(y_channel)

    # Blend CLAHE + global equalization (70% CLAHE, 30% global)
    y_enhanced = cv2.addWeighted(y_clahe, 0.7, y_equalized, 0.3, 0)

    # Replace Y channel with enhanced version
    frame_yuv[:, :, 0] = y_enhanced

    # Convert back to RGB
    enhanced_rgb = cv2.cvtColor(frame_yuv, cv2.COLOR_YUV2RGB)

    # Mild gamma correction for very dark areas
    gamma = 1.1
    look_up_table = np.array(
        [((i / 255.0) ** (1.0 / gamma)) * 255 for i in range(256)],
        dtype=np.uint8,
    )
    enhanced_rgb = cv2.LUT(enhanced_rgb, look_up_table)

    return enhanced_rgb


# ── Route Handler ─────────────────────────────────────────────────────────────


@router.post("/enhance", response_model=EnhanceResponse)
async def enhance_frame(request: EnhanceRequest):
    """Enhance a camera frame for improved visibility (night vision).

    Accepts a base64-encoded image and an enhancement mode.
    Currently supports 'night' mode only — applies histogram equalization
    + CLAHE + mild gamma correction.

    Processing time target: <100ms on consumer CPU.
    """
    start = time.time()

    # Decode base64 image
    try:
        image_data = base64.b64decode(request.image_base64)
        image = Image.open(io.BytesIO(image_data))
    except Exception as e:
        logger.error("Failed to decode image for enhancement: %s", e)
        raise HTTPException(status_code=400, detail="Invalid image data")

    frame_rgb = np.array(image.convert("RGB"))

    if request.mode == "night":
        # Apply night vision enhancement
        enhanced_rgb = _enhance_night(frame_rgb)
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported enhancement mode: {request.mode}. Supported: 'night'",
        )

    # Encode enhanced image back to base64 JPEG
    enhanced_pil = Image.fromarray(enhanced_rgb.astype(np.uint8))
    output_buffer = io.BytesIO()
    enhanced_pil.save(output_buffer, format="JPEG", quality=90)
    enhanced_base64 = base64.b64encode(output_buffer.getvalue()).decode("utf-8")

    elapsed = round((time.time() - start) * 1000, 2)
    logger.info("Image enhanced (mode=%s) in %.2fms", request.mode, elapsed)

    return EnhanceResponse(
        image_base64=enhanced_base64,
        mode=request.mode,
        processing_time_ms=elapsed,
    )
