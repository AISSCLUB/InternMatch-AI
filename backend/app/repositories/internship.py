"""
Internship Catalog Repository Foundation
Provides read-only database access for internship listings.
"""

from typing import List, Optional, Tuple
from uuid import UUID

from app.db.models import InternshipListing
from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session


class InternshipRepository:
    """Repository handling database read operations for InternshipListing."""

    @staticmethod
    def get_by_id(db: Session, internship_id: UUID) -> Optional[InternshipListing]:
        """Fetch single internship listing record by its primary key UUID."""
        stmt = select(InternshipListing).where(InternshipListing.id == internship_id)
        return db.scalar(stmt)

    @staticmethod
    def list_internships(
        db: Session,
        work_type: Optional[str] = None,
        location: Optional[str] = None,
        skill: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Tuple[List[InternshipListing], int]:
        """
        Fetch paginated and filtered list of internship listings.
        Returns (items, total_count).
        """
        stmt = select(InternshipListing)

        if work_type and work_type.strip():
            stmt = stmt.where(
                func.lower(InternshipListing.work_type) == work_type.strip().lower()
            )

        if location and location.strip():
            loc_pattern = f"%{location.strip().lower()}%"
            stmt = stmt.where(func.lower(InternshipListing.location).like(loc_pattern))

        if skill and skill.strip():
            skill_pattern = f"%{skill.strip().lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(cast(InternshipListing.required_skills, String)).like(
                        skill_pattern
                    ),
                    func.lower(cast(InternshipListing.preferred_skills, String)).like(
                        skill_pattern
                    ),
                )
            )

        # Count total matching rows
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = db.scalar(count_stmt) or 0

        # Apply ordering and pagination
        safe_limit = max(1, min(limit, 50))
        safe_offset = max(0, offset)
        paged_stmt = (
            stmt.order_by(InternshipListing.created_at.desc())
            .offset(safe_offset)
            .limit(safe_limit)
        )
        items = list(db.scalars(paged_stmt).all())

        return items, total
