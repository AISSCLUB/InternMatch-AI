"""
Saved Internship API Response and Request Schemas
Provides Pydantic schemas for candidate saved internships (bookmarks),
including paginated listing, save, and unsave responses.
"""

from datetime import datetime
from typing import List
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.internship import InternshipSummaryResponse


class SavedInternshipItem(BaseModel):
    """Schema representing an individual candidate saved internship entry."""

    id: UUID
    internship_id: UUID
    saved_at: datetime
    internship: InternshipSummaryResponse

    model_config = ConfigDict(from_attributes=True)


class SavedInternshipListResponse(BaseModel):
    """Response schema for GET /api/v1/saved-internships."""

    items: List[SavedInternshipItem]
    total: int
    limit: int
    offset: int


class SaveInternshipResponse(BaseModel):
    """Response schema for POST /api/v1/saved-internships/{internship_id}."""

    id: UUID
    internship_id: UUID
    saved_at: datetime
    is_saved: bool = True
    message: str = "Internship saved successfully."

    model_config = ConfigDict(from_attributes=True)


class UnsaveInternshipResponse(BaseModel):
    """Response schema for DELETE /api/v1/saved-internships/{internship_id}."""

    internship_id: UUID
    is_saved: bool = False
    message: str = "Internship unsaved successfully."

    model_config = ConfigDict(from_attributes=True)
