"""
Internship Catalog API Response Schemas
Provides Pydantic schemas for public internship catalog listing and detail responses.
Handles explicit API boundary translations required by docs/API_CONTRACT.md.
"""

from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class InternshipSummaryResponse(BaseModel):
    """Schema for individual internship item in catalog listing endpoint."""

    id: UUID
    title: str
    company: str
    location: str
    work_type: str
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    posted_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_model(cls, model: Any) -> "InternshipSummaryResponse":
        """Explicit mapping boundary for summary response."""
        return cls(
            id=model.id,
            title=model.title,
            company=model.company,
            location=model.location,
            work_type=model.work_type,
            required_skills=model.required_skills or [],
            preferred_skills=model.preferred_skills or [],
            posted_at=model.created_at,
        )


class InternshipListResponse(BaseModel):
    """Schema for paginated catalog list endpoint response."""

    items: List[InternshipSummaryResponse]
    total: int
    limit: int
    offset: int


class InternshipDetailResponse(BaseModel):
    """Schema for complete internship listing detail endpoint response."""

    id: UUID
    title: str
    company: str
    location: str
    work_type: str
    description: str
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=list)
    min_education: Optional[str] = None
    posted_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_model(cls, model: Any) -> "InternshipDetailResponse":
        """Explicit mapping boundary for detail response."""
        lang_str = model.language
        languages_list = [lang_str] if lang_str else ["English"]
        return cls(
            id=model.id,
            title=model.title,
            company=model.company,
            location=model.location,
            work_type=model.work_type,
            description=model.description,
            required_skills=model.required_skills or [],
            preferred_skills=model.preferred_skills or [],
            languages=languages_list,
            min_education=model.education_requirements,
            posted_at=model.created_at,
        )
