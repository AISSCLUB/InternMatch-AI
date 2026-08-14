"""
Application Repository Foundation
Provides database operations for candidate applications and cover letters.
"""

from typing import Optional
from uuid import UUID

from app.db.models import Application
from sqlalchemy import select
from sqlalchemy.orm import Session


class ApplicationRepository:
    """Repository handling database read and write operations for applications."""

    @staticmethod
    def get_by_student_and_internship(
        db: Session,
        student_id: UUID,
        internship_id: Optional[UUID],
    ) -> Optional[Application]:
        """Fetch existing Application record by student_id and internship_id."""
        stmt = select(Application).where(
            Application.student_id == student_id,
            Application.internship_id == internship_id,
        )
        return db.scalars(stmt).first()

    @staticmethod
    def upsert_generated_cover_letter(
        db: Session,
        student_id: UUID,
        internship_id: Optional[UUID],
        generated_cover_letter: str,
    ) -> Application:
        """
        Create a new Application or update existing cover letter in place.
        Preserves existing application status, notes, id, and created_at.
        Performs db.flush() but does NOT commit or rollback.
        """
        existing = ApplicationRepository.get_by_student_and_internship(
            db=db,
            student_id=student_id,
            internship_id=internship_id,
        )

        if existing:
            existing.generated_cover_letter = generated_cover_letter
            db.flush()
            return existing

        new_app = Application(
            student_id=student_id,
            internship_id=internship_id,
            status="saved",
            generated_cover_letter=generated_cover_letter,
            notes=None,
        )
        db.add(new_app)
        db.flush()
        return new_app
