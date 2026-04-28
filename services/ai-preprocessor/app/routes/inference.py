from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class AnalyzeRequest(BaseModel):
    camera_id: str
    image_url: str | None = None
    prompt: str | None = None


class AnalyzeResponse(BaseModel):
    camera_id: str
    status: str = "placeholder"
    message: str = "Analysis not yet implemented - Sprint 2"


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    """Placeholder for AI analysis endpoint - Sprint 2."""
    return AnalyzeResponse(camera_id=request.camera_id)
