"""
Processing Job Repository Foundation
Provides user-scoped database access for processing job records.
"""

from typing import Optional
from uuid import UUID

from app.db.models import ProcessingJob
from sqlalchemy import select
from sqlalchemy.orm import Session


class ProcessingJobRepository:
    """Repository handling database read operations for ProcessingJob."""

    @staticmethod
    def get_by_id_and_user_id(
        db: Session, job_id: UUID, user_id: UUID
    ) -> Optional[ProcessingJob]:
        """
        Fetch processing job record scoped strictly by BOTH job_id AND user_id.
        Enforces tenant isolation directly in SQL query.
        """
        stmt = select(ProcessingJob).where(
            ProcessingJob.id == job_id, ProcessingJob.user_id == user_id
        )
        return db.scalar(stmt)
