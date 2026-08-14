"""
Application API Response and Request Schemas
Provides Pydantic schemas for personalized application cover-letter generation.
"""

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ApplicationGenerateRequest(BaseModel):
    """Request schema for POST /api/v1/applications/generate."""

    match_id: UUID
    tone: str = Field(
        ...,
        min_length=1,
        description="Tone for the generated cover letter (e.g. professional, enthusiastic)",
    )
    content_locale: Literal["en", "tr", "ar"] = Field(
        default="en",
        description="Target content locale for the generated cover letter",
    )

    @field_validator("tone")
    @classmethod
    def validate_tone(cls, v: str) -> str:
        """Validate and normalize tone string ensuring non-empty content."""
        stripped = v.strip()
        if not stripped:
            raise ValueError("Tone must not be empty or whitespace only")
        return stripped


class ApplicationGenerateAcceptedResponse(BaseModel):
    """Response schema for POST /api/v1/applications/generate (HTTP 202 Accepted)."""

    job_id: UUID
    status: Literal["queued"] = "queued"
    message: str = "Personalized application generation enqueued."

    model_config = ConfigDict(from_attributes=True)
