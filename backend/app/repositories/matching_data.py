"""
Matching Data Read Repository Foundation
Provides trusted internal database read operations for candidate matching context.
"""

from typing import List, Optional
from uuid import UUID

from app.db.models import (
    EducationEntry,
    InternshipListing,
    Skill,
    StudentProfile,
    StudentSkill,
)
from sqlalchemy import select
from sqlalchemy.orm import Session


class MatchingDataRepository:
    """Repository providing read operations for candidate profile and internship
    matching context."""


    @staticmethod
    def get_profile_by_user_id(
        db: Session, user_id: UUID
    ) -> Optional[StudentProfile]:
        """
        Retrieve StudentProfile record by authenticated user_id.
        Returns None if no profile exists for the specified user_id.
        """
        stmt = select(StudentProfile).where(StudentProfile.user_id == user_id)
        return db.scalar(stmt)

    @staticmethod
    def get_skill_names_for_student(
        db: Session, student_id: UUID
    ) -> List[str]:
        """
        Retrieve deterministic list of skill names for a given student_id.
        Joins StudentSkill -> Skill. Results ordered alphabetically by Skill.name.
        """
        stmt = (
            select(Skill.name)
            .join(StudentSkill, StudentSkill.skill_id == Skill.id)
            .where(StudentSkill.student_id == student_id)
            .order_by(Skill.name.asc())
        )
        return list(db.scalars(stmt).all())

    @staticmethod
    def get_education_for_student(
        db: Session, student_id: UUID
    ) -> List[EducationEntry]:
        """
        Retrieve EducationEntry records for a given student_id.
        Ordered deterministically by start_year ASC, id ASC.
        """
        stmt = (
            select(EducationEntry)
            .where(EducationEntry.student_id == student_id)
            .order_by(EducationEntry.start_year.asc(), EducationEntry.id.asc())
        )
        return list(db.scalars(stmt).all())

    @staticmethod
    def get_internship_by_id(
        db: Session, internship_id: UUID
    ) -> Optional[InternshipListing]:
        """
        Retrieve InternshipListing by primary key UUID, including description_embedding.
        Returns None if internship does not exist.
        """
        stmt = select(InternshipListing).where(InternshipListing.id == internship_id)
        return db.scalar(stmt)
