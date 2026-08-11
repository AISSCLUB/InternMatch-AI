"""
Processing Job Status Tracking Endpoints
Provides authenticated job status retrieval for asynchronous tasks.
"""

from datetime import datetime, timezone
from typing import Any, Dict
from uuid import UUID

from app.core.security import AuthenticatedUser, get_current_user
from app.db.session import get_db
from app.repositories.processing_job import ProcessingJobRepository
from app.schemas.job import ProcessingJobResponse
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

router = APIRouter()


def format_not_found_error(message: str) -> Dict[str, Any]:
    """Format standard machine-readable 404 error payload."""
    return {
        "error": {
            "code": "NOT_FOUND",
            "message": message,
            "details": None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    }


@router.get("/{job_id}", response_model=ProcessingJobResponse)
def get_job_status(
    job_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve status of asynchronous processing job for authenticated user.
    Query is scoped strictly by job_id and authenticated user_id.
    """
    job = ProcessingJobRepository.get_by_id_and_user_id(
        db=db, job_id=job_id, user_id=current_user.user_id
    )
    if not job:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=format_not_found_error("Processing job not found."),
        )
    return ProcessingJobResponse.from_orm_model(job)
