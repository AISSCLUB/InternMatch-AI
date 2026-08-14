"""
Protected Student Profile Endpoints
Provides authenticated read, write, and CV upload access to candidate profiles.
"""

from datetime import date, datetime, timezone
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID

from app.core.security import AuthenticatedUser, get_current_user
from app.db.session import get_db
from app.repositories.matching_data import MatchingDataRepository
from app.repositories.processing_job import ProcessingJobRepository
from app.repositories.student_profile import StudentProfileRepository
from app.services.cv_enqueue import enqueue_cv_extraction
from app.services.cv_storage import (
    MAX_CV_SIZE_BYTES,
    CVStorageValidationError,
    delete_candidate_cv,
    store_candidate_cv,
)
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

router = APIRouter()


class StudentProfileCreateUpdate(BaseModel):
    """Request schema for creating or updating candidate profile."""

    full_name: str = Field(..., min_length=1, description="Candidate full name")
    headline: Optional[str] = Field(None, description="Short professional headline")
    cv_storage_path: Optional[str] = Field(None, description="Storage path for CV file")
    preferences: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Job/internship preferences"
    )


class EducationResponse(BaseModel):
    """Schema for structured education history entry in profile response."""

    institution: str
    degree: str
    start_year: Optional[int] = None
    end_year: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class ExperienceResponse(BaseModel):
    """Schema for structured work experience entry in profile response."""

    company: str
    role: str
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)


class ProjectResponse(BaseModel):
    """Schema for structured project entry in profile response."""

    title: str
    tech_stack: List[str] = Field(default_factory=list)
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class StudentProfileResponse(BaseModel):
    """Authoritative API schema for candidate profile response."""

    id: UUID
    user_id: UUID
    full_name: str
    headline: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    education: List[EducationResponse] = Field(default_factory=list)
    experience: List[ExperienceResponse] = Field(default_factory=list)
    projects: List[ProjectResponse] = Field(default_factory=list)
    preferences: Optional[Dict[str, Any]] = Field(default_factory=dict)
    cv_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class CVProcessingResponse(BaseModel):
    """Response schema for successfully enqueued CV upload."""

    job_id: UUID
    status: Literal["queued"] = "queued"
    message: str = "CV processing enqueued successfully."
    estimated_seconds: int = 15


def format_error_payload(code: str, message: str) -> Dict[str, Any]:
    """Format standard machine-readable error payload."""
    return {
        "error": {
            "code": code,
            "message": message,
            "details": None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    }


@router.get("", response_model=StudentProfileResponse)
def get_my_profile(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve the authenticated user's own structured student profile.
    Requires valid Supabase Bearer JWT authentication token.
    Identity is strictly derived from the validated JWT subject UUID.
    Loads structured skills, education, experience, and projects deterministically.
    """
    profile = StudentProfileRepository.get_by_user_id(db, user_id=current_user.user_id)

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=format_error_payload(
                "NOT_FOUND", "Student profile not found for authenticated user."
            ),
        )

    skills = MatchingDataRepository.get_skill_names_for_student(db, student_id=profile.id)
    education = MatchingDataRepository.get_education_for_student(db, student_id=profile.id)
    experience = MatchingDataRepository.get_experience_for_student(db, student_id=profile.id)
    projects = MatchingDataRepository.get_projects_for_student(db, student_id=profile.id)

    return StudentProfileResponse(
        id=profile.id,
        user_id=profile.user_id,
        full_name=profile.full_name,
        headline=profile.headline,
        skills=skills,
        education=[EducationResponse.model_validate(e) for e in education],
        experience=[ExperienceResponse.model_validate(e) for e in experience],
        projects=[ProjectResponse.model_validate(p) for p in projects],
        preferences=profile.preferences or {},
    )


@router.put("", response_model=StudentProfileResponse)
def upsert_my_profile(
    payload: StudentProfileCreateUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create or update the authenticated user's own student profile.
    Requires valid Supabase Bearer JWT authentication token.
    Ownership is strictly governed by the authenticated JWT subject UUID.
    Transaction commit boundary is owned by this endpoint handler.
    """
    profile = StudentProfileRepository.upsert_by_user_id(
        db=db,
        user_id=current_user.user_id,
        full_name=payload.full_name,
        headline=payload.headline,
        cv_storage_path=payload.cv_storage_path,
        preferences=payload.preferences,
    )
    try:
        db.commit()
        db.refresh(profile)

        skills = MatchingDataRepository.get_skill_names_for_student(db, student_id=profile.id)
        education = MatchingDataRepository.get_education_for_student(db, student_id=profile.id)
        experience = MatchingDataRepository.get_experience_for_student(db, student_id=profile.id)
        projects = MatchingDataRepository.get_projects_for_student(db, student_id=profile.id)

        return StudentProfileResponse(
            id=profile.id,
            user_id=profile.user_id,
            full_name=profile.full_name,
            headline=profile.headline,
            skills=skills,
            education=[EducationResponse.model_validate(e) for e in education],
            experience=[ExperienceResponse.model_validate(e) for e in experience],
            projects=[ProjectResponse.model_validate(p) for p in projects],
            preferences=profile.preferences or {},
        )
    except Exception:
        db.rollback()
        raise


@router.post("/cv", response_model=CVProcessingResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_candidate_cv(
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload candidate CV document (PDF/DOCX) to initiate background AI profile extraction.
    Validates file format and size <= 10 MiB, uploads securely to private Supabase Storage,
    persists durable ProcessingJob, and enqueues background worker task.
    """
    # 1. Read content up to max size + 1 to guard against oversized payloads
    max_read_bytes = MAX_CV_SIZE_BYTES + 1
    content = await file.read(max_read_bytes)

    if len(content) > MAX_CV_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=format_error_payload(
                "BAD_REQUEST",
                f"CV file size ({len(content)} bytes) exceeds maximum limit of 10 MB",
            ),
        )

    # 2. Validate MIME/extension and upload to private Supabase Storage
    try:
        stored_cv = store_candidate_cv(
            user_id=current_user.user_id,
            filename=file.filename or "",
            content_type=file.content_type or "",
            content=content,
        )
    except CVStorageValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=format_error_payload("BAD_REQUEST", str(exc)),
        )

    # 3. Create durable ProcessingJob record and commit BEFORE enqueue
    try:
        job = ProcessingJobRepository.create(
            db=db,
            user_id=current_user.user_id,
            job_type="cv_extraction",
        )
        db.commit()
        db.refresh(job)
    except Exception:
        db.rollback()
        # Best-effort cleanup of uploaded object if DB persistence fails
        try:
            delete_candidate_cv(
                user_id=current_user.user_id,
                storage_path=stored_cv.storage_path,
            )
        except Exception:
            pass
        raise

    # 4. Enqueue background extraction task to RQ
    try:
        enqueue_cv_extraction(
            job_id=job.id,
            user_id=current_user.user_id,
            storage_path=stored_cv.storage_path,
        )
    except Exception:
        # If durable ProcessingJob commit succeeded but RQ enqueue failed:
        # mark ProcessingJob failed, commit, and return HTTP 503
        try:
            job.status = "failed"
            job.progress_percent = 100
            job.result = None
            job.error = "Failed to enqueue CV extraction job."
            db.commit()
        except Exception:
            db.rollback()

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=format_error_payload(
                "SERVICE_UNAVAILABLE",
                "Failed to enqueue CV extraction job. Please try again later.",
            ),
        )

    # 5. Return HTTP 202 Accepted with exact API contract
    return CVProcessingResponse(
        job_id=job.id,
        status="queued",
        message="CV processing enqueued successfully.",
        estimated_seconds=15,
    )
