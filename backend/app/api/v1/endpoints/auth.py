"""
Backend Authentication Endpoints
Provides authenticated user account sync and identity verification.
"""

from typing import Optional
from uuid import UUID

from app.core.security import AuthenticatedUser, get_current_user
from app.db.session import get_db
from app.repositories.student_profile import StudentProfileRepository
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

router = APIRouter()


class AuthSyncResponse(BaseModel):
    """Schema for authentication session sync response."""

    user_id: UUID
    email: Optional[str] = None
    has_profile: bool


@router.post("/sync", response_model=AuthSyncResponse)
def sync_authenticated_user(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Sync authenticated user session upon login via Supabase Auth.
    Checks whether candidate student profile exists in database.
    Identity is strictly derived from validated JWT claims.
    """
    profile = StudentProfileRepository.get_by_user_id(db, user_id=current_user.user_id)
    return AuthSyncResponse(
        user_id=current_user.user_id,
        email=current_user.email,
        has_profile=profile is not None,
    )
