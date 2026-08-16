"""
RQ CV Extraction Task
Provides background execution boundary for candidate CV document download,
parsing, structured LLM extraction, profile persistence, and embedding generation.
"""

from typing import Any, Dict, Union
from uuid import UUID

from app.db.session import SessionLocal
from app.repositories.candidate_profile_write import (
    replace_candidate_profile_from_extraction,
)
from app.repositories.processing_job import ProcessingJobRepository
from app.services.candidate_embedding import (
    generate_and_persist_candidate_embedding,
)
from app.services.cv_parser import extract_cv_text
from app.services.cv_profile_extraction import (
    extract_structured_candidate_profile,
)
from app.services.cv_storage import download_candidate_cv
from app.services.cv_validation import (
    InvalidCVDocumentError,
    validate_cv_document,
)


def _normalize_uuid(val: Union[UUID, str], param_name: str) -> UUID:
    """Normalize UUID object or string to UUID instance. Raises ValueError for invalid format."""
    if isinstance(val, UUID):
        return val
    if isinstance(val, str):
        try:
            return UUID(val)
        except (ValueError, AttributeError, TypeError):
            raise ValueError(f"Invalid UUID string format for {param_name}: '{val}'")
    raise ValueError(
        f"Invalid UUID type for {param_name}: expected UUID or str, got {type(val).__name__}"
    )


def run_cv_extraction(
    job_id: Union[UUID, str],
    user_id: Union[UUID, str],
    storage_path: str,
    content_locale: str = "en",
) -> Dict[str, Any]:
    """
    RQ Task execution boundary for candidate CV extraction pipeline.
    Validates job ownership and job_type, executes download -> parse -> LLM -> DB -> embedding,
    and manages transaction lifecycle atomically.
    """
    norm_job_id = _normalize_uuid(job_id, "job_id")
    norm_user_id = _normalize_uuid(user_id, "user_id")

    clean_path = storage_path.strip() if isinstance(storage_path, str) else ""
    if not clean_path:
        raise ValueError("storage_path cannot be empty")

    db = SessionLocal()
    job_validated = False

    try:
        job = ProcessingJobRepository.get_by_id(db, norm_job_id)
        if job is None:
            raise ValueError(f"ProcessingJob with id '{norm_job_id}' not found.")

        if job.user_id != norm_user_id:
            raise ValueError(
                f"Job ownership mismatch: ProcessingJob {norm_job_id} "
                f"belongs to user {job.user_id}, "
                f"not user {norm_user_id}."
            )

        if job.job_type != "cv_extraction":
            raise ValueError(
                f"ProcessingJob type mismatch: expected 'cv_extraction', got '{job.job_type}'."
            )

        # Precondition checks passed for target job
        job_validated = True

        # Transition to processing state
        job.status = "processing"
        job.progress_percent = 10
        job.result = None
        job.error = None
        db.flush()

        # Step 1: Download private CV object from storage
        cv_bytes = download_candidate_cv(
            user_id=norm_user_id,
            storage_path=clean_path,
        )

        # Step 2: In-memory document parsing
        extracted_text = extract_cv_text(
            storage_path=clean_path,
            content=cv_bytes,
        )

        # Step 3: Semantic CV Validation (before any profile extraction/mutation)
        validate_cv_document(
            text=extracted_text,
            content_locale=content_locale or "en",
        )

        # Step 4: Structured LLM extraction
        extracted_profile = extract_structured_candidate_profile(
            text=extracted_text,
            content_locale=content_locale or "en",
        )

        # Step 5: Transactional structured candidate data persistence
        profile = replace_candidate_profile_from_extraction(
            db=db,
            user_id=norm_user_id,
            cv_storage_path=clean_path,
            extracted=extracted_profile,
        )

        # Step 6: Candidate summary embedding generation & persistence
        generate_and_persist_candidate_embedding(
            db=db,
            user_id=norm_user_id,
        )

        # Step 7: Mark job completed
        job.status = "completed"
        job.progress_percent = 100
        job.error = None
        job.result = {"profile_id": str(profile.id)}

        db.commit()

        return {
            "job_id": str(norm_job_id),
            "status": "completed",
            "profile_id": str(profile.id),
        }
    except Exception as exc:
        try:
            db.rollback()
        finally:
            db.close()

        # If job passed ownership and type validation, persist failure state in a fresh session
        if job_validated:
            fail_db = SessionLocal()
            try:
                fail_job = ProcessingJobRepository.get_by_id(fail_db, norm_job_id)
                if fail_job:
                    fail_job.status = "failed"
                    fail_job.progress_percent = 100
                    fail_job.result = None
                    if isinstance(exc, InvalidCVDocumentError):
                        fail_job.error = (
                            "The uploaded document does not appear to be a valid CV or resume. "
                            "Please upload a valid resume."
                        )
                    else:
                        fail_job.error = "CV processing failed."
                    fail_db.commit()
            except Exception:
                fail_db.rollback()
            finally:
                fail_db.close()

        raise
    finally:
        db.close()
