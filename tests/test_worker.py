"""
Worker Task Foundation Tests
Verifies task module imports, ping_task execution, and job_state persistence helper.
"""

import sys
from pathlib import Path
from uuid import uuid4

import pytest

# Add worker directory to path for test execution
worker_dir = Path(__file__).parent.parent / "worker"
if str(worker_dir) not in sys.path:
    sys.path.insert(0, str(worker_dir))

from app.repositories.processing_job import ProcessingJobRepository  # noqa: E402
from tasks.example_task import ping_task  # noqa: E402
from tasks.job_state import update_job_state  # noqa: E402

from tests.db import TestingSessionLocal  # noqa: E402


@pytest.fixture(autouse=True)
def override_worker_sessionlocal(monkeypatch):
    """Monkeypatch worker SessionLocal to use TestingSessionLocal SQLite memory DB."""
    monkeypatch.setattr("tasks.job_state.SessionLocal", TestingSessionLocal)


def test_worker_ping_task():
    """Verify ping_task returns expected response."""
    result = ping_task()
    assert result == "pong"


def test_update_job_state_worker_helper_success():
    """Verify worker update_job_state helper updates job state and commits successfully."""
    user_id = uuid4()
    db = TestingSessionLocal()
    try:
        job = ProcessingJobRepository.create(
            db=db, user_id=user_id, job_type="cv_extraction"
        )
        db.commit()
        job_id = job.id
    finally:
        db.close()

    # Call worker helper with string or UUID job_id
    updated = update_job_state(
        job_id=str(job_id),
        status="processing",
        progress_percent=50,
        result={"step": "parsing_pdf"},
    )
    assert updated.id == job_id
    assert updated.status == "processing"
    assert updated.progress_percent == 50
    assert updated.result == {"step": "parsing_pdf"}

    # Verify persisted state in fresh session
    db = TestingSessionLocal()
    try:
        persisted = ProcessingJobRepository.get_by_id(db=db, job_id=job_id)
        assert persisted is not None
        assert persisted.status == "processing"
        assert persisted.progress_percent == 50
    finally:
        db.close()


def test_update_job_state_worker_helper_unknown_job_raises():
    """Verify worker update_job_state helper raises ValueError for unknown job_id."""
    unknown_id = uuid4()
    with pytest.raises(ValueError, match="not found"):
        update_job_state(
            job_id=unknown_id,
            status="completed",
            progress_percent=100,
        )


def test_update_job_state_worker_helper_invalid_string_uuid_raises():
    """Verify worker update_job_state helper raises ValueError for invalid UUID string."""
    with pytest.raises(ValueError, match="Invalid UUID string format"):
        update_job_state(
            job_id="not-a-valid-uuid-string",
            status="completed",
            progress_percent=100,
        )


def test_update_job_state_worker_helper_invalid_progress_raises():
    """Verify worker update_job_state helper raises ValueError for invalid progress_percent."""
    user_id = uuid4()
    db = TestingSessionLocal()
    try:
        job = ProcessingJobRepository.create(
            db=db, user_id=user_id, job_type="cv_extraction"
        )
        db.commit()
        job_id = job.id
    finally:
        db.close()

    with pytest.raises(ValueError, match="Invalid progress_percent"):
        update_job_state(
            job_id=job_id,
            status="processing",
            progress_percent=-10,
        )
