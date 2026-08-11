"""
Worker Task Foundation Tests
Verifies task module imports, ping_task execution, job_state persistence helper,
and run_match_calculation RQ task lifecycle.
"""

import sys
from pathlib import Path
from uuid import uuid4

import pytest

# Add worker directory to path for test execution
worker_dir = Path(__file__).parent.parent / "worker"
if str(worker_dir) not in sys.path:
    sys.path.insert(0, str(worker_dir))

from app.db.models import Match  # noqa: E402
from app.repositories.processing_job import ProcessingJobRepository  # noqa: E402
from app.services.match_calculation import (  # noqa: E402
    MatchCalculationPreconditionError,
)
from tasks.example_task import ping_task  # noqa: E402
from tasks.job_state import update_job_state  # noqa: E402
from tasks.match_calculation import run_match_calculation  # noqa: E402

from tests.db import TestingSessionLocal  # noqa: E402


@pytest.fixture(autouse=True)
def override_worker_sessionlocal(monkeypatch):
    """Monkeypatch worker SessionLocal to use TestingSessionLocal SQLite memory DB."""
    monkeypatch.setattr("tasks.job_state.SessionLocal", TestingSessionLocal)
    monkeypatch.setattr("tasks.match_calculation.SessionLocal", TestingSessionLocal)


def test_worker_ping_task():
    """Verify ping_task returns expected response."""
    result = ping_task()
    assert result == "pong"


def test_update_job_state_worker_helper_success():
    """Verify worker update_job_state helper updates job state and commits successfully."""
    user_id = uuid4()
    db = TestingSessionLocal()
    try:
        job = ProcessingJobRepository.create(db=db, user_id=user_id, job_type="cv_extraction")
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
        job = ProcessingJobRepository.create(db=db, user_id=user_id, job_type="cv_extraction")
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


# RUN_MATCH_CALCULATION TASK TESTS (1 - 15)


def test_run_match_calculation_success(monkeypatch):
    """Test 1: Successful task execution updates job to completed and returns summary dict."""
    user_id = uuid4()
    db = TestingSessionLocal()
    try:
        job = ProcessingJobRepository.create(db=db, user_id=user_id, job_type="match_calculation")
        db.commit()
        job_id = job.id
    finally:
        db.close()

    # Fake calculation returns 2 match items
    fake_matches = ["match1", "match2"]
    monkeypatch.setattr(
        "tasks.match_calculation.calculate_and_persist_matches",
        lambda db, user_id, candidate_limit: fake_matches,
    )

    res = run_match_calculation(job_id=job_id, user_id=user_id, candidate_limit=25)
    assert res == {
        "job_id": str(job_id),
        "status": "completed",
        "match_count": 2,
    }

    # Verify persisted state in fresh session
    db = TestingSessionLocal()
    try:
        persisted = ProcessingJobRepository.get_by_id(db=db, job_id=job_id)
        assert persisted is not None
        assert persisted.status == "completed"
        assert persisted.progress_percent == 100
        assert persisted.result == {"match_count": 2}
        assert persisted.error is None
    finally:
        db.close()


def test_run_match_calculation_boundary_call_args(monkeypatch):
    """Test 2: Calculation boundary receives db session, correct user_id, and candidate_limit."""
    user_id = uuid4()
    db = TestingSessionLocal()
    try:
        job = ProcessingJobRepository.create(db=db, user_id=user_id, job_type="match_calculation")
        db.commit()
        job_id = job.id
    finally:
        db.close()

    calls = []

    def mock_calc(db, user_id, candidate_limit):
        calls.append((user_id, candidate_limit))
        return ["m1"]

    monkeypatch.setattr(
        "tasks.match_calculation.calculate_and_persist_matches",
        mock_calc,
    )

    run_match_calculation(job_id=job_id, user_id=user_id, candidate_limit=15)
    assert len(calls) == 1
    assert calls[0] == (user_id, 15)


def test_run_match_calculation_default_candidate_limit_is_50(monkeypatch):
    """Test 3: Default candidate_limit passed to calculation service is 50."""
    user_id = uuid4()
    db = TestingSessionLocal()
    try:
        job = ProcessingJobRepository.create(db=db, user_id=user_id, job_type="match_calculation")
        db.commit()
        job_id = job.id
    finally:
        db.close()

    limits = []

    def mock_calc(db, user_id, candidate_limit):
        limits.append(candidate_limit)
        return []

    monkeypatch.setattr(
        "tasks.match_calculation.calculate_and_persist_matches",
        mock_calc,
    )

    run_match_calculation(job_id=job_id, user_id=user_id)
    assert limits == [50]


def test_run_match_calculation_accepts_uuid_strings(monkeypatch):
    """Test 4: Accepts valid UUID strings for job_id and user_id."""
    user_id = uuid4()
    db = TestingSessionLocal()
    try:
        job = ProcessingJobRepository.create(db=db, user_id=user_id, job_type="match_calculation")
        db.commit()
        job_id = job.id
    finally:
        db.close()

    monkeypatch.setattr(
        "tasks.match_calculation.calculate_and_persist_matches",
        lambda db, user_id, candidate_limit: [],
    )

    res = run_match_calculation(job_id=str(job_id), user_id=str(user_id))
    assert res["status"] == "completed"


def test_run_match_calculation_invalid_job_id_uuid_string_raises_value_error():
    """Test 5: Invalid job_id string raises ValueError."""
    with pytest.raises(ValueError, match="Invalid UUID string format for job_id"):
        run_match_calculation(job_id="bad-uuid", user_id=uuid4())


def test_run_match_calculation_invalid_user_id_uuid_string_raises_value_error():
    """Test 6: Invalid user_id string raises ValueError."""
    with pytest.raises(ValueError, match="Invalid UUID string format for user_id"):
        run_match_calculation(job_id=uuid4(), user_id="bad-uuid")


def test_run_match_calculation_candidate_limit_zero_or_negative_raises_value_error(monkeypatch):
    """Test 7: candidate_limit <= 0 raises ValueError without invoking calculation."""
    called = []
    monkeypatch.setattr(
        "tasks.match_calculation.calculate_and_persist_matches",
        lambda db, user_id, candidate_limit: called.append(1),
    )

    with pytest.raises(ValueError, match="Limit must be > 0"):
        run_match_calculation(job_id=uuid4(), user_id=uuid4(), candidate_limit=0)

    with pytest.raises(ValueError, match="Limit must be > 0"):
        run_match_calculation(job_id=uuid4(), user_id=uuid4(), candidate_limit=-5)

    assert called == []


def test_run_match_calculation_missing_job_raises_value_error(monkeypatch):
    """Test 8: Missing ProcessingJob raises ValueError without invoking calculation."""
    called = []
    monkeypatch.setattr(
        "tasks.match_calculation.calculate_and_persist_matches",
        lambda db, user_id, candidate_limit: called.append(1),
    )

    with pytest.raises(ValueError, match="not found"):
        run_match_calculation(job_id=uuid4(), user_id=uuid4())

    assert called == []


def test_run_match_calculation_ownership_mismatch_raises_value_error(monkeypatch):
    """Test 9: Job ownership mismatch raises ValueError and leaves job state unchanged."""
    owner_id = uuid4()
    other_user_id = uuid4()
    db = TestingSessionLocal()
    try:
        job = ProcessingJobRepository.create(db=db, user_id=owner_id, job_type="match_calculation")
        db.commit()
        job_id = job.id
    finally:
        db.close()

    called = []
    monkeypatch.setattr(
        "tasks.match_calculation.calculate_and_persist_matches",
        lambda db, user_id, candidate_limit: called.append(1),
    )

    with pytest.raises(ValueError, match="Job ownership mismatch"):
        run_match_calculation(job_id=job_id, user_id=other_user_id)

    assert called == []

    # Verify job remained queued and untouched
    db = TestingSessionLocal()
    try:
        persisted = ProcessingJobRepository.get_by_id(db=db, job_id=job_id)
        assert persisted is not None
        assert persisted.status == "queued"
        assert persisted.progress_percent == 0
    finally:
        db.close()


def test_run_match_calculation_wrong_job_type_raises_value_error(monkeypatch):
    """Test 10: Wrong job_type (e.g. cv_extraction) raises ValueError and leaves job unchanged."""
    user_id = uuid4()
    db = TestingSessionLocal()
    try:
        job = ProcessingJobRepository.create(db=db, user_id=user_id, job_type="cv_extraction")
        db.commit()
        job_id = job.id
    finally:
        db.close()

    called = []
    monkeypatch.setattr(
        "tasks.match_calculation.calculate_and_persist_matches",
        lambda db, user_id, candidate_limit: called.append(1),
    )

    with pytest.raises(ValueError, match="ProcessingJob type mismatch"):
        run_match_calculation(job_id=job_id, user_id=user_id)

    assert called == []

    # Verify job remained queued
    db = TestingSessionLocal()
    try:
        persisted = ProcessingJobRepository.get_by_id(db=db, job_id=job_id)
        assert persisted is not None
        assert persisted.status == "queued"
    finally:
        db.close()


def test_run_match_calculation_calculation_exception_rolls_back_and_marks_failed(monkeypatch):
    """
    Test 11 & 15: Calculation exception rolls back uncommitted Match writes,
    persists job as failed in fresh session, and re-raises original exception.
    """
    user_id = uuid4()
    student_id = uuid4()
    internship_id = uuid4()
    db = TestingSessionLocal()
    try:
        job = ProcessingJobRepository.create(db=db, user_id=user_id, job_type="match_calculation")
        db.commit()
        job_id = job.id
    finally:
        db.close()

    def mock_failing_calc(db, user_id, candidate_limit):
        # Perform an uncommitted Match write using supplied session
        uncommitted_match = Match(
            student_id=student_id,
            internship_id=internship_id,
            overall_score=75,
            skill_score=75,
            vector_score=75,
            attribute_score=75,
        )
        db.add(uncommitted_match)
        db.flush()
        raise RuntimeError("Calculation internal crash")

    monkeypatch.setattr(
        "tasks.match_calculation.calculate_and_persist_matches",
        mock_failing_calc,
    )

    with pytest.raises(RuntimeError, match="Calculation internal crash"):
        run_match_calculation(job_id=job_id, user_id=user_id)

    # Verify in fresh DB session:
    # 1. Partial Match write was rolled back completely
    # 2. ProcessingJob was updated to failed with error message
    db = TestingSessionLocal()
    try:
        match_check = db.query(Match).filter_by(student_id=student_id).first()
        assert match_check is None

        persisted_job = ProcessingJobRepository.get_by_id(db=db, job_id=job_id)
        assert persisted_job is not None
        assert persisted_job.status == "failed"
        assert persisted_job.progress_percent == 100
        assert persisted_job.result is None
        assert persisted_job.error == "Calculation internal crash"
    finally:
        db.close()


def test_run_match_calculation_precondition_error_follows_failed_lifecycle(monkeypatch):
    """Test 12: MatchCalculationPreconditionError triggers failed job state and re-raises error."""
    user_id = uuid4()
    db = TestingSessionLocal()
    try:
        job = ProcessingJobRepository.create(db=db, user_id=user_id, job_type="match_calculation")
        db.commit()
        job_id = job.id
    finally:
        db.close()

    def mock_precondition_calc(db, user_id, candidate_limit):
        raise MatchCalculationPreconditionError("Profile summary_embedding missing")

    monkeypatch.setattr(
        "tasks.match_calculation.calculate_and_persist_matches",
        mock_precondition_calc,
    )

    with pytest.raises(MatchCalculationPreconditionError, match="summary_embedding missing"):
        run_match_calculation(job_id=job_id, user_id=user_id)

    # Verify persisted job state is failed
    db = TestingSessionLocal()
    try:
        persisted = ProcessingJobRepository.get_by_id(db=db, job_id=job_id)
        assert persisted is not None
        assert persisted.status == "failed"
        assert persisted.progress_percent == 100
        assert persisted.error == "Profile summary_embedding missing"
    finally:
        db.close()


def test_run_match_calculation_clears_stale_job_result_and_error(monkeypatch):
    """Test 13: Stale job.result and job.error are cleared on successful rerun."""
    user_id = uuid4()
    db = TestingSessionLocal()
    try:
        job = ProcessingJobRepository.create(db=db, user_id=user_id, job_type="match_calculation")
        job.result = {"old": "result"}
        job.error = "old error"
        db.commit()
        job_id = job.id
    finally:
        db.close()

    monkeypatch.setattr(
        "tasks.match_calculation.calculate_and_persist_matches",
        lambda db, user_id, candidate_limit: ["m1"],
    )

    run_match_calculation(job_id=job_id, user_id=user_id)

    db = TestingSessionLocal()
    try:
        persisted = ProcessingJobRepository.get_by_id(db=db, job_id=job_id)
        assert persisted is not None
        assert persisted.status == "completed"
        assert persisted.error is None
        assert persisted.result == {"match_count": 1}
    finally:
        db.close()


def test_run_match_calculation_truncates_long_error_message_to_1000_chars(monkeypatch):
    """Test 14: Exception message exceeding 1000 chars is persisted truncated to 1000 chars."""
    user_id = uuid4()
    db = TestingSessionLocal()
    try:
        job = ProcessingJobRepository.create(db=db, user_id=user_id, job_type="match_calculation")
        db.commit()
        job_id = job.id
    finally:
        db.close()

    long_msg = "X" * 1500

    def mock_long_error_calc(db, user_id, candidate_limit):
        raise RuntimeError(long_msg)

    monkeypatch.setattr(
        "tasks.match_calculation.calculate_and_persist_matches",
        mock_long_error_calc,
    )

    with pytest.raises(RuntimeError):
        run_match_calculation(job_id=job_id, user_id=user_id)

    db = TestingSessionLocal()
    try:
        persisted = ProcessingJobRepository.get_by_id(db=db, job_id=job_id)
        assert persisted is not None
        assert persisted.status == "failed"
        assert len(persisted.error) == 1000
        assert persisted.error == "X" * 1000
    finally:
        db.close()
