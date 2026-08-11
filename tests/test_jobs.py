"""
Unit & Integration Tests for Async Processing Job Tracking Endpoints.
Validates GET /api/v1/jobs/{job_id} authentication, tenant isolation,
schema mapping, and error handling.
"""

from uuid import uuid4

import pytest
from app.db.models import ProcessingJob
from app.repositories.processing_job import ProcessingJobRepository
from fastapi.testclient import TestClient

from tests.db import TestingSessionLocal
from tests.test_auth import generate_mock_jwt


@pytest.fixture(autouse=True)
def clean_processing_jobs_table():
    """Ensure processing_jobs table is cleared before and after each test."""
    db = TestingSessionLocal()
    try:
        db.query(ProcessingJob).delete()
        db.commit()
    finally:
        db.close()
    yield
    db = TestingSessionLocal()
    try:
        db.query(ProcessingJob).delete()
        db.commit()
    finally:
        db.close()


def test_unauthenticated_job_request_returns_401(client: TestClient):
    """Test 1: Unauthenticated request to GET /api/v1/jobs/{job_id} returns 401 UNAUTHORIZED."""
    job_id = uuid4()
    response = client.get(f"/api/v1/jobs/{job_id}")
    assert response.status_code == 401
    data = response.json()
    assert data["detail"]["error"]["code"] == "UNAUTHORIZED"


def test_authenticated_owner_can_retrieve_own_job(client: TestClient):
    """Test 2: Authenticated owner retrieves own job, verifies model.id -> job_id and progress."""
    user_id = uuid4()
    job_id = uuid4()
    token = generate_mock_jwt(user_id=user_id)

    db = TestingSessionLocal()
    try:
        job = ProcessingJob(
            id=job_id,
            user_id=user_id,
            job_type="cv_extraction",
            status="queued",
            progress_percent=10,
        )
        db.add(job)
        db.commit()
    finally:
        db.close()

    response = client.get(
        f"/api/v1/jobs/{job_id}", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["job_id"] == str(job_id)
    assert data["status"] == "queued"
    assert data["progress_percent"] == 10
    assert data["result"] is None
    assert data["error"] is None
    assert "updated_at" in data


def test_completed_job_returns_progress_100_and_result(client: TestClient):
    """Test 3: Completed job returns status='completed', progress_percent=100,
    and result payload."""
    user_id = uuid4()

    job_id = uuid4()
    token = generate_mock_jwt(user_id=user_id)

    db = TestingSessionLocal()
    try:
        job = ProcessingJob(
            id=job_id,
            user_id=user_id,
            job_type="cv_extraction",
            status="completed",
            progress_percent=100,
            result={"profile_id": "prof_123"},
        )
        db.add(job)
        db.commit()
    finally:
        db.close()

    response = client.get(
        f"/api/v1/jobs/{job_id}", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["job_id"] == str(job_id)
    assert data["status"] == "completed"
    assert data["progress_percent"] == 100
    assert data["result"] == {"profile_id": "prof_123"}
    assert data["error"] is None


def test_failed_job_returns_stored_error_and_progress(client: TestClient):
    """Test 4: Failed job returns status='failed', stored error message, and stored progress."""
    user_id = uuid4()
    job_id = uuid4()
    token = generate_mock_jwt(user_id=user_id)

    db = TestingSessionLocal()
    try:
        job = ProcessingJob(
            id=job_id,
            user_id=user_id,
            job_type="cv_extraction",
            status="failed",
            progress_percent=45,
            error="Failed to extract text from corrupted PDF document.",
        )
        db.add(job)
        db.commit()
    finally:
        db.close()

    response = client.get(
        f"/api/v1/jobs/{job_id}", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["job_id"] == str(job_id)
    assert data["status"] == "failed"
    assert data["progress_percent"] == 45
    assert data["error"] == "Failed to extract text from corrupted PDF document."


def test_another_authenticated_user_receives_not_found(client: TestClient):
    """Test 5: Another user attempting to access owner's job receives 404 NOT_FOUND."""
    owner_id = uuid4()
    other_user_id = uuid4()
    job_id = uuid4()

    db = TestingSessionLocal()
    try:
        job = ProcessingJob(
            id=job_id,
            user_id=owner_id,
            job_type="match_calculation",
            status="processing",
            progress_percent=50,
        )
        db.add(job)
        db.commit()
    finally:
        db.close()

    other_user_token = generate_mock_jwt(user_id=other_user_id)
    response = client.get(
        f"/api/v1/jobs/{job_id}", headers={"Authorization": f"Bearer {other_user_token}"}
    )
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "NOT_FOUND"


def test_unknown_job_id_returns_not_found(client: TestClient):
    """Test 6: Requesting an unknown job UUID returns standard 404 NOT_FOUND."""
    user_id = uuid4()
    unknown_job_id = uuid4()
    token = generate_mock_jwt(user_id=user_id)

    response = client.get(
        f"/api/v1/jobs/{unknown_job_id}", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404
    data = response.json()
    assert data["error"]["code"] == "NOT_FOUND"


def test_repository_query_level_ownership_enforcement():
    """Test 7: Direct repository test proving ownership restriction is enforced by SQL query."""
    user_a = uuid4()
    user_b = uuid4()
    job_id = uuid4()

    db = TestingSessionLocal()
    try:
        job = ProcessingJob(
            id=job_id,
            user_id=user_a,
            job_type="application_generation",
            status="queued",
            progress_percent=0,
        )
        db.add(job)
        db.commit()

        # Query by owner returns job record
        found_job = ProcessingJobRepository.get_by_id_and_user_id(
            db=db, job_id=job_id, user_id=user_a
        )
        assert found_job is not None
        assert found_job.id == job_id

        # Query by non-owner returns None directly from SQL filter
        non_owner_job = ProcessingJobRepository.get_by_id_and_user_id(
            db=db, job_id=job_id, user_id=user_b
        )
        assert non_owner_job is None
    finally:
        db.close()
