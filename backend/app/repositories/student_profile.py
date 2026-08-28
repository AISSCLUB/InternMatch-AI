"""
Student Profile Repository Foundation
Provides authenticated user-scoped database access for student profile records.
"""

import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Sequence, Set
from uuid import UUID

from app.db.models import Skill, StudentProfile, StudentSkill
from app.repositories.matching_data import MatchingDataRepository
from sqlalchemy import delete, func, select
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
            old_preferences = profile.preferences or {}
            new_preferences = preferences if preferences is not None else old_preferences
            semantic_preference_keys = (
                "work_types",
                "desired_locations",
                "target_roles",
            )
            semantic_preferences_changed = any(
                old_preferences.get(key) != new_preferences.get(key)
                for key in semantic_preference_keys
            )
            embedding_inputs_changed = (
                profile.headline != headline
                or semantic_preferences_changed
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
    def sync_student_skills(
        db: Session,
        student_id: UUID,
        skills: Sequence[str],
    ) -> bool:
        """
        Synchronize candidate skills with the provided list.
        Normalizes and deduplicates incoming skills case-insensitively.
        If effective skills differ from existing skills:
          - Removes deleted StudentSkill associations (does not delete master Skill rows).
          - Adds new StudentSkill associations (creating Skill taxonomy rows if needed).
          - Flushes session state.
          - Returns True (skills meaningfully changed).
        If effective skills are identical:
          - Leaves associations untouched and returns False.
        """
        # 1. Fetch current candidate skills
        current_skills = MatchingDataRepository.get_skill_names_for_student(db, student_id)
        current_norm_map: Dict[str, str] = {
            re.sub(r"\s+", " ", s.strip()).casefold(): s.strip()
            for s in current_skills
            if re.sub(r"\s+", " ", s.strip())
        }
        current_keys: Set[str] = set(current_norm_map.keys())

        # 2. Process incoming skills
        incoming_norm_map: Dict[str, str] = {}
        for s in skills:
            if not isinstance(s, str):
                continue
            clean = re.sub(r"\s+", " ", s.strip())
            if not clean:
                continue
            folded = clean.casefold()
            if folded not in incoming_norm_map:
                incoming_norm_map[folded] = clean
        incoming_keys: Set[str] = set(incoming_norm_map.keys())

        # 3. Check for meaningful change
        if current_keys == incoming_keys:
            return False

        # 4. Remove dropped skills
        to_remove = current_keys - incoming_keys
        if to_remove:
            stmt_delete = delete(StudentSkill).where(
                StudentSkill.student_id == student_id,
                StudentSkill.skill_id.in_(
                    select(Skill.id).where(func.lower(Skill.name).in_(to_remove))
                ),
            )
            db.execute(stmt_delete)

        # 5. Add new skills
        to_add = incoming_keys - current_keys
        if to_add:
            for folded in to_add:
                display_name = incoming_norm_map[folded]
                stmt_find = select(Skill).where(func.lower(Skill.name) == folded)
                skill_row = db.scalar(stmt_find)
                if not skill_row:
                    skill_row = Skill(name=display_name)
                    db.add(skill_row)
                    db.flush()

                student_skill = StudentSkill(
                    student_id=student_id,
                    skill_id=skill_row.id,
                    proficiency_level="intermediate",
                )
                db.add(student_skill)

        db.flush()
        return True

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
