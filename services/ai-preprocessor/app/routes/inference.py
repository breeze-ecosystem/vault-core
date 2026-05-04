import base64
import io
import httpx
from fastapi import APIRouter
from pydantic import BaseModel
from PIL import Image

from app.config import settings

router = APIRouter()


class PromptInput(BaseModel):
    id: str
    text: str
    severity: str = "MEDIUM"


class AnalyzeRequest(BaseModel):
    camera_id: str
    image_base64: str
    prompts: list[PromptInput] = []
    timestamp: str | None = None


class DetectionResult(BaseModel):
    promptId: str
    promptText: str
    detected: bool
    confidence: float
    description: str


class AnalyzeResponse(BaseModel):
    detections: list[DetectionResult]


async def call_ollama_vlm(image_b64: str, prompt: str, model: str = "moondream") -> str:
    """Call Ollama VLM API with image + text prompt."""
    async with httpx.AsyncClient(timeout=300) as client:
        payload = {
            "model": model,
            "prompt": prompt,
            "images": [image_b64],
            "stream": False,
            "options": {"temperature": 0.1},
        }
        resp = await client.post(f"{settings.OLLAMA_BASE_URL}/api/generate", json=payload)
        resp.raise_for_status()
        return resp.json().get("response", "").strip()


def preprocess_image(image_b64: str, max_size: int = 640) -> str:
    """Resize and compress image for faster inference."""
    try:
        img_bytes = base64.b64decode(image_b64)
        img = Image.open(io.BytesIO(img_bytes))

        # Resize maintaining aspect ratio
        img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

        # Convert to RGB if needed
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=80)
        return base64.b64encode(buf.getvalue()).decode("utf-8")
    except Exception:
        return image_b64  # Return original if preprocessing fails


def parse_detection(response: str, prompt_text: str) -> tuple[bool, float]:
    """Parse VLM response to determine if detection occurred."""
    lower = response.lower().strip()

    # Check first word/character for explicit YES/NO
    first_word = lower.split()[0] if lower.split() else ""

    # Strong yes signals
    strong_yes = ["yes", "oui"]
    if first_word in strong_yes:
        return True, 0.85

    # Strong no signals
    strong_no = ["no", "non", "no,", "no."]
    if first_word in strong_no:
        return False, 0.15

    # Check for yes/no patterns anywhere in response
    yes_words = ["yes", "oui", "detected", "found", "visible", "present", "true", "affirmative", "i can see", "there is a", "there are"]
    no_words = ["no", "non", "not", "none", "absent", "negative", "false", "rien", "aucun", "i cannot", "cannot see", "no person", "nobody"]

    yes_count = sum(1 for w in yes_words if w in lower)
    no_count = sum(1 for w in no_words if w in lower)

    if yes_count > no_count:
        confidence = min(0.9, 0.55 + (yes_count - no_count) * 0.1)
        return True, confidence
    elif no_count > yes_count:
        return False, 0.2

    # Ambiguous - moderate confidence lean toward detected
    return True, 0.45


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    """Analyze a camera frame against configured prompts using Ollama VLM."""
    if not request.prompts:
        return AnalyzeResponse(detections=[])

    # Preprocess image
    processed_image = preprocess_image(request.image_base64)

    detections: list[DetectionResult] = []

    for prompt in request.prompts:
        try:
            vlm_prompt = (
                f"Analyze this surveillance camera image carefully. "
                f"Answer with YES or NO followed by a brief explanation.\n\n"
                f"Question: {prompt.text}"
            )

            response_text = await call_ollama_vlm(processed_image, vlm_prompt)
            detected, confidence = parse_detection(response_text, prompt.text)

            detections.append(DetectionResult(
                promptId=prompt.id,
                promptText=prompt.text,
                detected=detected,
                confidence=confidence,
                description=response_text[:500],
            ))
        except Exception as e:
            detections.append(DetectionResult(
                promptId=prompt.id,
                promptText=prompt.text,
                detected=False,
                confidence=0.0,
                description=f"Error: {str(e)}",
            ))

    return AnalyzeResponse(detections=detections)


@router.get("/models")
async def list_models():
    """List available Ollama models."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            return resp.json()
    except Exception as e:
        return {"error": str(e)}
