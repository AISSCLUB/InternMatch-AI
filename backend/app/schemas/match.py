"""
Match API Response Schemas
Provides Pydantic schemas for candidate pre-calculated match listing.
"""

from datetime import datetime
from typing import Any, List
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class InternshipMatchSummaryResponse(BaseModel):
    """Nested schema representing basic internship information in a match item."""

    id: UUID
    title: str
    company: str
    location: str

    model_config = ConfigDict(from_attributes=True)


class MatchItemResponse(BaseModel):
    """Schema representing an individual match entry in GET /api/v1/matches."""

    match_id: UUID
    internship: InternshipMatchSummaryResponse
    overall_score: int = Field(..., ge=0, le=100)
    skill_score: int = Field(..., ge=0, le=100)
    vector_score: int = Field(..., ge=0, le=100)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_tuple(
        cls, match: Any, internship: Any
    ) -> "MatchItemResponse":
        """Explicit mapping factory method converting (Match, InternshipListing) tuple."""
        return cls(
            match_id=match.id,
            internship=InternshipMatchSummaryResponse.model_validate(internship),
            overall_score=match.overall_score,
            skill_score=match.skill_score,
            vector_score=match.vector_score,
            created_at=match.created_at,
        )


class MatchListResponse(BaseModel):
    """Top-level response schema for GET /api/v1/matches."""

    matches: List[MatchItemResponse]
