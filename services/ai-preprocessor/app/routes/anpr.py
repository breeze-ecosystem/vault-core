import base64
import io
import time
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from PIL import Image

logger = logging.getLogger(__name__)

router = APIRouter()

# Lazy-loaded PaddleOCR instance (cold start on first request)
_ocr = None


def get_ocr():
    global _ocr
    if _ocr is None:
        logger.info("Initializing PaddleOCR (first call may be slow)...")
        from paddleocr import PaddleOCR
        _ocr = PaddleOCR(use_angle_cls=True, lang='en')
    return _ocr


class ANPRRequest(BaseModel):
    image_base64: str
    camera_id: str


class PlateResult(BaseModel):
    plate: str
    confidence: float
    bbox: list


class ANPRResponse(BaseModel):
    plates: list[PlateResult]
    camera_id: str
    processing_time_ms: float


@router.post("/anpr", response_model=ANPRResponse)
async def recognize_plate(request: ANPRRequest):
    """Detect and recognize license plate from camera frame using PaddleOCR."""
    start = time.time()

    # Decode base64 image
    try:
        image_data = base64.b64decode(request.image_base64)
        image = Image.open(io.BytesIO(image_data))
    except Exception as e:
        logger.error(f"Failed to decode image: {e}")
        raise HTTPException(status_code=400, detail="Invalid image data")

    # Run OCR
    ocr = get_ocr()
    results = ocr.ocr(image, cls=True)

    plates = []
    if results and results[0]:
        for word_info in results[0]:
            text = word_info[1][0]
            confidence = word_info[1][1]
            bbox = word_info[0]

            # Filter: only include results with reasonable confidence (>= 0.5)
            if confidence >= 0.5:
                plates.append(PlateResult(
                    plate=text.strip().upper(),
                    confidence=round(float(confidence), 4),
                    bbox=[float(coord) for point in bbox for coord in point],
                ))

    elapsed = round((time.time() - start) * 1000, 2)
    logger.info(f"ANPR processed {len(plates)} plates in {elapsed}ms for camera {request.camera_id}")

    return ANPRResponse(
        plates=plates,
        camera_id=request.camera_id,
        processing_time_ms=elapsed,
    )
