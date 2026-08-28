"""
AI Interview Preparation Schemas

Structured candidate-facing interview preparation grounded in canonical
application, internship, profile, and matching data.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class InterviewPrepResponse(BaseModel):
    """Grounded AI preparation returned to the authenticated candidate."""

    application_id: UUID
    interview_scheduled_at: datetime
    preparation_summary: str
    likely_questions: list[str] = Field(default_factory=list)
    focus_areas: list[str] = Field(default_factory=list)
    strengths_to_highlight: list[str] = Field(default_factory=list)
    questions_to_ask: list[str] = Field(default_factory=list)
