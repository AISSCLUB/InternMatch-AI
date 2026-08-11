"""
Match Repository Foundation
Provides read-only database access for candidate internship matches.
"""

from typing import List, Tuple
from uuid import UUID

from app.db.models import InternshipListing, Match, StudentProfile
from sqlalchemy import select
from sqlalchemy.orm import Session


class MatchRepository:
    """Repository handling database read operations for candidate matches."""

    @staticmethod
    def get_matches_for_user(
        db: Session, user_id: UUID
    ) -> List[Tuple[Match, InternshipListing]]:
        """
        Fetch pre-calculated matches for the candidate identified by user_id.
        Joins StudentProfile to enforce tenant ownership strictly in SQL.
        Joins InternshipListing to load internship summary data.
        Ordered by overall_score DESC, created_at DESC.
        """
        stmt = (
            select(Match, InternshipListing)
            .join(StudentProfile, Match.student_id == StudentProfile.id)
            .join(InternshipListing, Match.internship_id == InternshipListing.id)
            .where(StudentProfile.user_id == user_id)
            .order_by(Match.overall_score.desc(), Match.created_at.desc())
        )
        return list(db.execute(stmt).all())
