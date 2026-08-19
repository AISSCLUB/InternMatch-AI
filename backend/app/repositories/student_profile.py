"""
Student Profile Repository Foundation
Provides authenticated user-scoped database access for student profile records.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
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
        Invalidates cached summary_embedding if embedding-relevant profile inputs change.
        Flushes session state; does not commit transaction (owned by endpoint layer).
        """
        profile = StudentProfileRepository.get_by_user_id(db, user_id=user_id)
        now = datetime.now(timezone.utc)

        if profile:
            embedding_inputs_changed = (
                profile.headline != headline
                or (preferences is not None and profile.preferences != preferences)
            )

            if embedding_inputs_changed:
                profile.summary_embedding = None

            profile.full_name = full_name
            profile.headline = headline
            if cv_storage_path is not None:
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

    @staticmethod
    def set_summary_embedding(
        db: Session,
        profile: StudentProfile,
        embedding: List[float],
    ) -> StudentProfile:
        """
        Persist vector summary embedding on StudentProfile and update updated_at.
        Flushes session state; does not commit transaction.
        """
        profile.summary_embedding = embedding
        profile.updated_at = datetime.now(timezone.utc)
        db.flush()
        return profile

    @staticmethod
    def invalidate_summary_embedding(
        db: Session,
        profile: StudentProfile,
    ) -> StudentProfile:
        """
        Invalidate cached summary_embedding on StudentProfile (set to None) if not already None.
        Flushes session state; does not commit transaction.
        """
        if profile.summary_embedding is not None:
            profile.summary_embedding = None
            profile.updated_at = datetime.now(timezone.utc)
            db.flush()
        return profile

    @staticmethod
    def update_avatar_storage_path(
        db: Session,
        user_id: UUID,
        avatar_storage_path: str,
    ) -> Optional[StudentProfile]:
        """
        Persist candidate avatar storage path on StudentProfile without modifying summary_embedding.
        Flushes session state; does not commit transaction.
        """
        profile = StudentProfileRepository.get_by_user_id(db, user_id=user_id)
        if not profile:
            return None

        profile.avatar_storage_path = avatar_storage_path
        profile.updated_at = datetime.now(timezone.utc)
        db.flush()
        return profile

    @staticmethod
    def clear_avatar_storage_path(
        db: Session,
        user_id: UUID,
    ) -> Optional[StudentProfile]:
        """
        Clear candidate avatar storage path on StudentProfile without modifying summary_embedding.
        Flushes session state; does not commit transaction.
        """
        profile = StudentProfileRepository.get_by_user_id(db, user_id=user_id)
        if not profile:
            return None

        profile.avatar_storage_path = None
        profile.updated_at = datetime.now(timezone.utc)
        db.flush()
        return profile
