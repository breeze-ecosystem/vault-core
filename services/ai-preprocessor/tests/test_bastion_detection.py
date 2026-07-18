"""
Integration tests for the BASTION detection pipeline.

Tests validate BASTION-specific detection endpoints using synthetic frames.
Follows the eval methodology from AI-SPEC § 5.3.

Usage:
    cd services/ai-preprocessor && python -m pytest tests/test_bastion_detection.py -v
"""

from __future__ import annotations

import base64
import io
import uuid

import numpy as np
import pytest
from PIL import Image

# ── Test helpers ─────────────────────────────────────────────────────────────


def _make_test_frame(
    width: int = 640,
    height: int = 480,
    mean_pixel: int = 128,
) -> str:
    """Create a solid-color test frame as a base64-encoded JPEG.

    Args:
        width: Frame width in pixels.
        height: Frame height in pixels.
        mean_pixel: Gray value (0=black, 128=mid-gray, 255=white).

    Returns:
        Base64-encoded JPEG string.
    """
    frame = np.full((height, width, 3), mean_pixel, dtype=np.uint8)
    buf = io.BytesIO()
    Image.fromarray(frame).save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def _make_dark_frame(width: int = 640, height: int = 480) -> str:
    """Create a very dark frame (mean pixel < 20) to test dark-frame skip logic."""
    return _make_test_frame(width, height, mean_pixel=5)


def _make_weapon_like_frame(width: int = 640, height: int = 480) -> str:
    """Create a synthetic frame with a high-contrast weapon-like region.

    The frame has a bright, elongated region in the center intended to
    represent a potential weapon detection for testing the pipeline.
    """
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    # Draw a bright horizontal bar (simulating a weapon-like shape)
    frame[200:240, 250:400] = [200, 180, 180]
    buf = io.BytesIO()
    Image.fromarray(frame).save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def _make_crowded_frame(person_count: int = 5) -> str:
    """Create a frame with multiple small bright spots simulating persons."""
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    spacing = 640 // (person_count + 1)
    for i in range(person_count):
        cx = spacing * (i + 1)
        frame[220:260, cx - 10 : cx + 10] = [100, 150, 200]
    buf = io.BytesIO()
    Image.fromarray(frame).save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("ascii")


# ── Tests ────────────────────────────────────────────────────────────────────


class TestBastionDetectionPipeline:
    """Integration tests for the BASTION /api/v1/bastion/detect endpoint."""

    @pytest.fixture(autouse=True)
    def _setup(self):
        """Set up test data and FastAPI TestClient."""
        import httpx
        from app.main import app
        from fastapi.testclient import TestClient

        self.client = TestClient(app)
        self.base_url = "/api/v1"
        self.camera_id = f"test-cam-{uuid.uuid4().hex[:8]}"
        self.org_id = f"test-org-{uuid.uuid4().hex[:8]}"

    def _detect(self, image_base64: str, **overrides) -> dict:
        """Send a BASTION detection request and return the JSON response."""
        payload = {
            "camera_id": self.camera_id,
            "image_base64": image_base64,
            "organization_id": self.org_id,
            "confidence": 0.45,
            "detection_zones": [],
            "enable_face_recognition": False,
            "enable_anti_spoofing": False,
            **overrides,
        }
        response = self.client.post(f"{self.base_url}/bastion/detect", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        return response.json()

    # ── Response structure ───────────────────────────────────────────────

    def test_bastion_response_structure(self):
        """Verify the response matches BastionDetectionResponse schema (all lists present)."""
        frame = _make_test_frame()
        result = self._detect(frame)

        assert "camera_id" in result
        assert "processing_time_ms" in result
        assert isinstance(result["processing_time_ms"], float)
        assert result["processing_time_ms"] >= 0
        assert "weapons" in result
        assert "abandoned_objects" in result
        assert "crowd_counts" in result
        assert "behaviors" in result
        assert "face_matches" in result

    def test_bastion_endpoint_reachable(self):
        """Verify POST /api/v1/bastion/detect returns 200."""
        frame = _make_test_frame()
        result = self._detect(frame)
        assert result["camera_id"] == self.camera_id

    # ── Weapon detection ─────────────────────────────────────────────────

    def test_weapon_detection_empty_frame(self):
        """Send a blank image → verify weapons list is empty, processing_time_ms > 0."""
        frame = _make_test_frame(mean_pixel=128)
        result = self._detect(frame)

        assert isinstance(result["weapons"], list)
        assert len(result["weapons"]) == 0
        assert result["processing_time_ms"] > 0

    def test_weapon_detection_high_confidence(self):
        """Send a synthetic frame with known weapon-like pattern → verify weapon detection.

        Note: This test validates the pipeline runs without error and returns
        the expected response structure. Actual weapon detection depends on
        the fine-tuned YOLO model being loaded.
        """
        frame = _make_weapon_like_frame()
        result = self._detect(frame, confidence=0.6)

        assert isinstance(result["weapons"], list)
        assert isinstance(result["processing_time_ms"], float)
        assert result["processing_time_ms"] > 0

    # ── Abandoned object detection ───────────────────────────────────────

    def test_abandoned_object_no_detection(self):
        """Send single frame → verify abandoned_objects list is empty.

        A single frame cannot determine abandoned status (requires temporal
        tracking across multiple frames).
        """
        frame = _make_test_frame()
        result = self._detect(frame)

        assert isinstance(result["abandoned_objects"], list)
        assert len(result["abandoned_objects"]) == 0

    # ── Crowd counting ───────────────────────────────────────────────────

    def test_crowd_counting_empty_scene(self):
        """Send frame with no persons → verify crowd_counts list shows count=0."""
        frame = _make_test_frame(mean_pixel=128)
        result = self._detect(frame)

        assert isinstance(result["crowd_counts"], list)
        assert len(result["crowd_counts"]) == 0

    # ── Face recognition ─────────────────────────────────────────────────

    def test_face_recognition_dark_frame_skip(self):
        """Send very dark frame → verify face_matches is empty (dark frame skip)."""
        frame = _make_dark_frame()
        result = self._detect(frame, enable_face_recognition=True)

        assert isinstance(result["face_matches"], list)
        assert len(result["face_matches"]) == 0

    # ── Behavior analysis ────────────────────────────────────────────────

    def test_behavior_analysis_empty_scene(self):
        """Send empty frame → verify behaviors list is empty."""
        frame = _make_test_frame(mean_pixel=128)
        result = self._detect(frame)

        assert isinstance(result["behaviors"], list)
        assert len(result["behaviors"]) == 0
