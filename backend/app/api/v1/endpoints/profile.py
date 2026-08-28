"""
Protected Student Profile Endpoints
Provides authenticated read, write, and CV upload access to candidate profiles.
"""

import re
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID

from app.core.rate_limit import enforce_rate_limit
from app.core.security import AuthenticatedUser, get_current_user
from app.db.session import get_db
from app.repositories.matching_data import MatchingDataRepository
from app.repositories.processing_job import ProcessingJobRepository
from app.repositories.student_profile import StudentProfileRepository
from app.services.avatar_storage import (
    MAX_AVATAR_SIZE_BYTES,
    AvatarStorageValidationError,
    delete_candidate_avatar,
    generate_avatar_signed_url,
    store_candidate_avatar,
)
from app.services.cv_enqueue import enqueue_cv_extraction
from app.services.cv_storage import (
    MAX_CV_SIZE_BYTES,
    CVStorageValidationError,
    delete_candidate_cv,
    store_candidate_cv,
)
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, ConfigDict, Field, field_validator
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
    skills: Optional[List[str]] = Field(
        None, description="List of candidate skills"
    )

    @field_validator("skills")
    @classmethod
    def validate_skills_list(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return None
        if len(v) > 50:
            raise ValueError("Candidate profile cannot have more than 50 skills.")
        for item in v:
            if not isinstance(item, str):
                raise ValueError("Each skill must be a string.")
            clean = re.sub(r"\s+", " ", item.strip())
            if not clean:
                raise ValueError("Skill name cannot be empty.")
            if len(clean) > 80:
                raise ValueError(f"Skill name '{clean}' exceeds maximum limit of 80 characters.")
        return v


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
    avatar_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AvatarUploadResponse(BaseModel):
    """Response schema for profile avatar upload."""

    avatar_url: str
    message: str = "Avatar uploaded successfully."


class AvatarDeleteResponse(BaseModel):
    """Response schema for profile avatar deletion."""

    avatar_url: Optional[str] = None
    message: str = "Avatar removed successfully."


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

    avatar_url = generate_avatar_signed_url(
        user_id=current_user.user_id,
        storage_path=profile.avatar_storage_path,
    )

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
        avatar_url=avatar_url,
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

    if payload.skills is not None:
        skills_changed = StudentProfileRepository.sync_student_skills(
            db=db,
            student_id=profile.id,
            skills=payload.skills,
        )
        if skills_changed:
            StudentProfileRepository.invalidate_summary_embedding(db, profile)

    try:
        db.commit()
        db.refresh(profile)

        skills = MatchingDataRepository.get_skill_names_for_student(db, student_id=profile.id)
        education = MatchingDataRepository.get_education_for_student(db, student_id=profile.id)
        experience = MatchingDataRepository.get_experience_for_student(db, student_id=profile.id)
        projects = MatchingDataRepository.get_projects_for_student(db, student_id=profile.id)

        avatar_url = generate_avatar_signed_url(
            user_id=current_user.user_id,
            storage_path=profile.avatar_storage_path,
        )

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
            avatar_url=avatar_url,
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
    # 1. Enforce rate limiting before reading/storing content
    enforce_rate_limit(user_id=current_user.user_id, scope="cv_upload")

    # 2. Read content up to max size + 1 to guard against oversized payloads
    max_read_bytes = MAX_CV_SIZE_BYTES + 1
    content = await file.read(max_read_bytes)

    if len(content) > MAX_CV_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=format_error_payload(
                "PAYLOAD_TOO_LARGE",
                "CV file exceeds maximum limit of 10 MB.",
            ),
        )

    # 3. Validate MIME/extension/signature and upload to private Supabase Storage
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


@router.post("/avatar", response_model=AvatarUploadResponse, status_code=status.HTTP_200_OK)
async def upload_profile_avatar(
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload candidate profile avatar image (JPEG, PNG, WebP <= 5 MB).
    Uploads new object to private Supabase Storage, updates avatar_storage_path on StudentProfile,
    commits transaction, generates signed avatar_url, and best-effort removes previous object.
    """
    # 1. Enforce rate limiting before reading content
    enforce_rate_limit(user_id=current_user.user_id, scope="avatar_upload")

    # 2. Read content up to max size + 1 to guard against oversized payloads
    max_read_bytes = MAX_AVATAR_SIZE_BYTES + 1
    content = await file.read(max_read_bytes)

    if len(content) > MAX_AVATAR_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=format_error_payload(
                "PAYLOAD_TOO_LARGE",
                "Avatar file exceeds maximum limit of 5 MB.",
            ),
        )

    # 3. Validate profile exists for authenticated user
    profile = StudentProfileRepository.get_by_user_id(db, user_id=current_user.user_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=format_error_payload(
                "NOT_FOUND", "Student profile not found for authenticated user."
            ),
        )

    old_storage_path = profile.avatar_storage_path

    # 4. Validate image binary and upload new object to private Supabase Storage
    try:
        stored_avatar = store_candidate_avatar(
            user_id=current_user.user_id,
            content_type=file.content_type,
            content=content,
        )
    except AvatarStorageValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=format_error_payload("BAD_REQUEST", str(exc)),
        )

    # 5. Persist new avatar_storage_path in DB
    try:
        StudentProfileRepository.update_avatar_storage_path(
            db=db,
            user_id=current_user.user_id,
            avatar_storage_path=stored_avatar.storage_path,
        )
        db.commit()
    except Exception:
        db.rollback()
        # Best-effort cleanup of newly uploaded object if DB update fails
        try:
            delete_candidate_avatar(
                user_id=current_user.user_id,
                storage_path=stored_avatar.storage_path,
            )
        except Exception:
            pass
        raise

    # 6. Generate signed URL for immediate presentation
    signed_url = generate_avatar_signed_url(
        user_id=current_user.user_id,
        storage_path=stored_avatar.storage_path,
    )

    # 7. Best-effort delete old avatar object after successful persistence
    if old_storage_path and old_storage_path != stored_avatar.storage_path:
        try:
            delete_candidate_avatar(
                user_id=current_user.user_id,
                storage_path=old_storage_path,
            )
        except Exception:
            pass

    return AvatarUploadResponse(
        avatar_url=signed_url or "",
        message="Avatar uploaded successfully.",
    )


@router.delete("/avatar", response_model=AvatarDeleteResponse, status_code=status.HTTP_200_OK)
def delete_profile_avatar(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete candidate profile avatar image.
    Safely clears avatar_storage_path on StudentProfile, commits transaction,
    and removes object from Supabase Storage.
    """
    profile = StudentProfileRepository.get_by_user_id(db, user_id=current_user.user_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=format_error_payload(
                "NOT_FOUND", "Student profile not found for authenticated user."
            ),
        )

    old_storage_path = profile.avatar_storage_path

    if not old_storage_path:
        return AvatarDeleteResponse(
            avatar_url=None,
            message="No profile avatar was set.",
        )

    try:
        StudentProfileRepository.clear_avatar_storage_path(
            db=db,
            user_id=current_user.user_id,
        )
        db.commit()
    except Exception:
        db.rollback()
        raise

    # Delete old storage object after DB commit
    try:
        delete_candidate_avatar(
            user_id=current_user.user_id,
            storage_path=old_storage_path,
        )
    except Exception:
        pass

    return AvatarDeleteResponse(
        avatar_url=None,
        message="Avatar removed successfully.",
    )
