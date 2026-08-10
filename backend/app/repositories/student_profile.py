"""
Student Profile Repository Foundation
Provides authenticated user-scoped database access for student profile records.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import UUID

from app.db.models import StudentProfile
from sqlalchemy import select
from sqlalchemy.orm import Session


class StudentProfileRepository:
    """Repository handling database read and state mutation operations for StudentProfile."""

    @staticmethod
    def get_by_user_id(db: Session, user_id: UUID) -> Optional[StudentProfile]:
        """
        Fetch student profile record scoped strictly to the authenticated user's UUID.
        Does not query or expose another user's profile.
        """
        stmt = select(StudentProfile).where(StudentProfile.user_id == user_id)
        return db.scalar(stmt)

    @staticmethod
    def upsert_by_user_id(
        db: Session,
        user_id: UUID,
        full_name: str,
        headline: Optional[str] = None,
        cv_storage_path: Optional[str] = None,
        preferences: Optional[Dict[str, Any]] = None,
    ) -> StudentProfile:
        """
        Create or update a student profile for the authenticated user_id.
        Ownership is strictly governed by the passed user_id.
        Flushes session state; does not commit transaction (owned by endpoint layer).
        """
        profile = StudentProfileRepository.get_by_user_id(db, user_id=user_id)
        now = datetime.now(timezone.utc)

        if profile:
            profile.full_name = full_name
            profile.headline = headline
            profile.cv_storage_path = cv_storage_path
            if preferences is not None:
                profile.preferences = preferences
            profile.updated_at = now
        else:
            profile = StudentProfile(
                user_id=user_id,
                full_name=full_name,
                headline=headline,
                cv_storage_path=cv_storage_path,
                preferences=preferences or {},
                created_at=now,
                updated_at=now,
            )
            db.add(profile)

        db.flush()
        return profile
