"""
Backend Authentication Endpoints
Exposes current authenticated user identity from validated Supabase Bearer JWTs.
"""

from typing import Optional
from uuid import UUID

from app.core.security import AuthenticatedUser, get_current_user
from fastapi import APIRouter, Depends
from pydantic import BaseModel

router = APIRouter()


class AuthMeResponse(BaseModel):
    """Schema for authenticated user identity response."""

    user_id: UUID
    email: Optional[str] = None
    role: Optional[str] = None


@router.get("/me", response_model=AuthMeResponse)
def get_authenticated_user_me(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Retrieve the currently authenticated user identity.
    Requires valid Supabase Bearer JWT authentication token.
    Identity is strictly derived from the validated JWT claims.
    """
    return AuthMeResponse(
        user_id=current_user.user_id,
        email=current_user.email,
        role=current_user.role,
    )
