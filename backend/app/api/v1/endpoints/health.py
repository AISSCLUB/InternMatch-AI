"""
Health & Operational Readiness Router
Provides endpoints to verify system process liveness and component readiness.
"""

from datetime import datetime, timezone

from app.core.config import settings
from fastapi import APIRouter
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str
    timestamp: str


router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Application Health & Liveness Check",
    description="Verifies that the backend gateway process is alive and functioning."
)
async def get_health() -> HealthResponse:
    """Return liveness and health metadata without exposing internal credentials."""
    return HealthResponse(
        status="healthy",
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        timestamp=datetime.now(timezone.utc).isoformat()
    )
