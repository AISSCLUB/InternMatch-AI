"""
Candidate Matches Endpoints
Provides authenticated read access for pre-calculated internship matches.
"""

from app.core.security import AuthenticatedUser, get_current_user
from app.db.session import get_db
from app.repositories.match import MatchRepository
from app.schemas.match import MatchItemResponse, MatchListResponse
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter()


@router.get("", response_model=MatchListResponse)
def get_my_matches(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve pre-calculated matches for the authenticated candidate, sorted by score.
    Requires valid Supabase Bearer JWT authentication token.
    Identity is strictly derived from the validated JWT subject UUID.
    """
    records = MatchRepository.get_matches_for_user(
        db=db, user_id=current_user.user_id
    )

    items = [
        MatchItemResponse.from_orm_tuple(match=match, internship=internship)
        for match, internship in records
    ]

    return MatchListResponse(matches=items)
