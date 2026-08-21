"""
Application API Response and Request Schemas
Provides Pydantic schemas for personalized application cover-letter generation
and application tracker management.
"""

from datetime import date, datetime
from typing import Any, List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

ApplicationStatus = Literal[
    "saved",
    "applied",
    "interviewing",
    "rejected",
    "accepted",
]


class ApplicationGenerateRequest(BaseModel):
    """Request schema for POST /api/v1/applications/generate."""

    match_id: UUID
    tone: str = Field(
        ...,
        min_length=1,
        description="Tone for the generated cover letter",
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
    """Response schema for POST /api/v1/applications/generate (HTTP 202)."""

    job_id: UUID
    status: Literal["queued"] = "queued"
    message: str = "Personalized application generation enqueued."

    model_config = ConfigDict(from_attributes=True)


class ApplicationTrackerResponse(BaseModel):
    """Schema representing an application record in the Application Tracker."""

    id: UUID
    internship_id: Optional[UUID]
    company_name: Optional[str]
    job_title: Optional[str]
    status: ApplicationStatus
    generated_cover_letter: Optional[str]
    applied_date: Optional[date]
    notes: Optional[str]

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_tuple(
        cls, application: Any, internship: Optional[Any]
    ) -> "ApplicationTrackerResponse":
        """Factory mapping (Application, Optional[InternshipListing]) tuple."""
        return cls(
            id=application.id,
            internship_id=application.internship_id,
            company_name=internship.company if internship is not None else None,
            job_title=internship.title if internship is not None else None,
            status=application.status,
            generated_cover_letter=application.generated_cover_letter,
            applied_date=application.applied_date,
            notes=application.notes,
        )


class ApplicationListResponse(BaseModel):
    """Response schema for GET /api/v1/applications."""

    applications: List[ApplicationTrackerResponse]


class ApplicationStatusUpdateRequest(BaseModel):
    """Request schema for PATCH /api/v1/applications/{id}/status."""

    status: ApplicationStatus
    notes: Optional[str] = None


class ApplicationStatusEventResponse(BaseModel):
    """Schema representing an individual status transition in an application's timeline."""

    status: ApplicationStatus
    occurred_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApplicationDetailResponse(BaseModel):
    """Schema representing full application detail with chronological timeline."""

    id: UUID
    internship_id: Optional[UUID]
    company_name: Optional[str]
    job_title: Optional[str]
    status: ApplicationStatus
    generated_cover_letter: Optional[str]
    applied_date: Optional[date]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    timeline: List[ApplicationStatusEventResponse]

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_data(
        cls,
        application: Any,
        internship: Optional[Any],
        events: List[Any],
    ) -> "ApplicationDetailResponse":
        """
        Factory mapping (Application, Optional[InternshipListing], List[ApplicationStatusEvent]).
        """
        return cls(
            id=application.id,
            internship_id=application.internship_id,
            company_name=internship.company if internship is not None else None,
            job_title=internship.title if internship is not None else None,
            status=application.status,
            generated_cover_letter=application.generated_cover_letter,
            applied_date=application.applied_date,
            notes=application.notes,
            created_at=application.created_at,
            updated_at=application.updated_at,
            timeline=[
                ApplicationStatusEventResponse(
                    status=event.status,
                    occurred_at=event.occurred_at,
                )
                for event in events
            ],
        )
