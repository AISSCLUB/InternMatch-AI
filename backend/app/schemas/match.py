"""
Match API Response Schemas
Provides Pydantic schemas for candidate pre-calculated match listing
and calculation enqueue.
"""

from datetime import datetime
from typing import Any, List, Literal
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
        """Explicit mapping factory converting (Match, InternshipListing) tuple."""
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


class MatchCalculationAcceptedResponse(BaseModel):
    """Response schema for POST /api/v1/matches/calculate endpoint."""

    job_id: UUID
    status: Literal["queued"]
    message: str

    model_config = ConfigDict(from_attributes=True)


class SkillGapAnalysisResponse(BaseModel):
    """Schema representing the skill gap analysis narrative and recommendations."""

    summary: str = Field(default="", description="Summary of candidate skill gaps")
    recommendations: List[str] = Field(
        default_factory=list, description="Actionable learning recommendations"
    )

    model_config = ConfigDict(from_attributes=True)


class MatchExplanationResponse(BaseModel):
    """Schema representing the full grounded match explanation response."""

    match_id: UUID
    overall_score: int = Field(..., ge=0, le=100)
    why_you_match: str
    matching_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    skill_gap_analysis: SkillGapAnalysisResponse

    model_config = ConfigDict(from_attributes=True)
