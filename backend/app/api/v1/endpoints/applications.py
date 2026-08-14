"""
Candidate Application Operations Endpoints
Provides asynchronous personalized application cover letter generation trigger.
"""

from app.core.security import AuthenticatedUser, get_current_user
from app.db.session import get_db
from app.repositories.match import MatchRepository
from app.repositories.processing_job import ProcessingJobRepository
from app.schemas.application import (
    ApplicationGenerateAcceptedResponse,
    ApplicationGenerateRequest,
)
from app.services.application_enqueue import enqueue_application_generation
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter()


@router.post(
    "/generate",
    response_model=ApplicationGenerateAcceptedResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def generate_application(
    payload: ApplicationGenerateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Enqueue asynchronous personalized application cover-letter generation job.
    Requires valid Supabase Bearer JWT authentication token.
    Identity is strictly derived from the validated JWT subject UUID.
    Verifies match ownership prior to enqueuing job. Returns 404 if match is
    not found or owned by another user.
    """
    # Verify match exists and is owned by authenticated user
    match_record = MatchRepository.get_match_with_details_for_user(
        db=db,
        match_id=payload.match_id,
        user_id=current_user.user_id,
    )
    if not match_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found.",
        )

    try:
        processing_job = ProcessingJobRepository.create(
            db=db,
            user_id=current_user.user_id,
            job_type="application_generation",
        )
        db.commit()
    except Exception:
        db.rollback()
        raise

    try:
        enqueue_application_generation(
            job_id=processing_job.id,
            user_id=current_user.user_id,
            match_id=payload.match_id,
            tone=payload.tone,
            content_locale=payload.content_locale,
        )
    except Exception:
        safe_error = "Failed to enqueue application generation job."
        try:
            processing_job.status = "failed"
            processing_job.progress_percent = 100
            processing_job.result = None
            processing_job.error = safe_error
            db.commit()
        except Exception:
            db.rollback()

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to enqueue application generation job.",
        )

    return ApplicationGenerateAcceptedResponse(
        job_id=processing_job.id,
        status="queued",
        message="Personalized application generation enqueued.",
    )
