"""
Candidate Application Operations Endpoints
Provides endpoints for personalized cover letter generation, application
listing, and tracker status/notes updates.
"""

from uuid import UUID

from app.core.rate_limit import enforce_rate_limit
from app.core.security import AuthenticatedUser, get_current_user
from app.db.session import get_db
from app.repositories.application import ApplicationRepository
from app.repositories.match import MatchRepository
from app.repositories.processing_job import ProcessingJobRepository
from app.schemas.application import (
    ApplicationGenerateAcceptedResponse,
    ApplicationGenerateRequest,
    ApplicationListResponse,
    ApplicationStatusUpdateRequest,
    ApplicationTrackerResponse,
)
from app.services.application_enqueue import enqueue_application_generation
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter()


@router.get("", response_model=ApplicationListResponse)
def get_my_applications(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve candidate internship applications for the Application Tracker.
    Requires valid Supabase Bearer JWT authentication token.
    Identity is strictly derived from the validated JWT subject UUID.
    Returns applications ordered by updated_at DESC, created_at DESC.
    """
    records = ApplicationRepository.list_for_user(
        db=db, user_id=current_user.user_id
    )

    items = [
        ApplicationTrackerResponse.from_orm_tuple(
            application=app, internship=internship
        )
        for app, internship in records
    ]

    return ApplicationListResponse(applications=items)


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
    enforce_rate_limit(
        user_id=current_user.user_id, scope="application_generate"
    )

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


@router.patch("/{id}/status", response_model=ApplicationTrackerResponse)
def update_application_status(
    id: UUID,
    payload: ApplicationStatusUpdateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update status and optional notes for an application in the tracker.
    Requires valid Supabase Bearer JWT authentication token.
    Identity is strictly derived from the validated JWT subject UUID.
    Returns 404 if application is not found or owned by another user.
    """
    record = ApplicationRepository.get_with_internship_for_user(
        db=db,
        application_id=id,
        user_id=current_user.user_id,
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found.",
        )

    application, internship = record
    notes_provided = "notes" in payload.model_fields_set

    try:
        updated_app = ApplicationRepository.update_status(
            db=db,
            application=application,
            status=payload.status,
            notes=payload.notes,
            notes_provided=notes_provided,
        )
        db.commit()
        db.refresh(updated_app)
    except Exception:
        db.rollback()
        raise

    return ApplicationTrackerResponse.from_orm_tuple(
        application=updated_app,
        internship=internship,
    )
