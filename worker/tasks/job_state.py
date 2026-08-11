"""
Worker Job State Persistence Boundary
Provides helper functions for RQ workers to update processing job state in the database.
"""

from typing import Any, Dict, Optional, Union
from uuid import UUID

from app.db.models import ProcessingJob
from app.db.session import SessionLocal
from app.repositories.processing_job import ProcessingJobRepository


def update_job_state(
    job_id: Union[UUID, str],
    status: str,
    progress_percent: int,
    result: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None,
) -> ProcessingJob:
    """
    Update processing job state from worker tasks.
    Safely handles session lifecycle (open, commit on success, rollback on exception, close).
    Raises ValueError if target job_id does not exist in database.
    """
    if isinstance(job_id, str):
        try:
            parsed_job_id = UUID(job_id)
        except ValueError as e:
            raise ValueError(f"Invalid UUID string format for job_id: '{job_id}'") from e
    else:
        parsed_job_id = job_id

    db = SessionLocal()
    try:
        updated_job = ProcessingJobRepository.update_state(
            db=db,
            job_id=parsed_job_id,
            status=status,
            progress_percent=progress_percent,
            result=result,
            error=error,
        )
        if not updated_job:
            raise ValueError(f"Processing job with ID '{parsed_job_id}' not found.")

        db.commit()
        db.refresh(updated_job)
        return updated_job
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
