"""
Protected Student Profile Endpoints
Provides authenticated read and write access to candidate profiles.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import UUID

from app.core.security import AuthenticatedUser, get_current_user
from app.db.session import get_db
from app.repositories.student_profile import StudentProfileRepository
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

router = APIRouter()


class StudentProfileCreateUpdate(BaseModel):
    """Request schema for creating or updating candidate profile."""

    full_name: str = Field(..., min_length=1, description="Candidate full name")
    headline: Optional[str] = Field(None, description="Short professional headline")
    cv_storage_path: Optional[str] = Field(None, description="Storage path for CV file")
    preferences: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Job/internship preferences"
    )


class StudentProfileResponse(BaseModel):
    """Schema for candidate profile response."""

    id: UUID
    user_id: UUID
    full_name: str
    headline: Optional[str] = None
    cv_storage_path: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


def format_not_found_error(message: str) -> Dict[str, Any]:
    """Format standard machine-readable 404 error payload."""
    return {
        "error": {
            "code": "NOT_FOUND",
            "message": message,
            "details": None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    }


@router.get("", response_model=StudentProfileResponse)
def get_my_profile(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve the authenticated user's own student profile.
    Requires valid Supabase Bearer JWT authentication token.
    Identity is strictly derived from the validated JWT subject UUID.
    """
    profile = StudentProfileRepository.get_by_user_id(db, user_id=current_user.user_id)

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=format_not_found_error("Student profile not found for authenticated user."),
        )

    return profile


@router.put("", response_model=StudentProfileResponse)
def upsert_my_profile(
    payload: StudentProfileCreateUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create or update the authenticated user's own student profile.
    Requires valid Supabase Bearer JWT authentication token.
    Ownership is strictly governed by the authenticated JWT subject UUID.
    Transaction commit boundary is owned by this endpoint handler.
    """
    profile = StudentProfileRepository.upsert_by_user_id(
        db=db,
        user_id=current_user.user_id,
        full_name=payload.full_name,
        headline=payload.headline,
        cv_storage_path=payload.cv_storage_path,
        preferences=payload.preferences,
    )
    try:
        db.commit()
        db.refresh(profile)
        return profile
    except Exception:
        db.rollback()
        raise
