"""
Unit & Integration Tests for Application Tracker (Gate 2.29).
Tests GET /api/v1/applications and PATCH /api/v1/applications/{id}/status,
tenant isolation in SQL, applied_date persistence semantics, notes handling
(omitted vs explicit null vs string), deleted internship historical retention,
and Gate 2.28 regeneration safety.
"""

from datetime import date, datetime, timezone
from uuid import uuid4

import pytest
from app.db.models import (
    Application,
    EducationEntry,
    ExperienceEntry,
    InternshipListing,
    Match,
    ProcessingJob,
    ProjectEntry,
    Skill,
    StudentProfile,
    StudentSkill,
)
from app.repositories.application import ApplicationRepository
from fastapi.testclient import TestClient

from tests.db import TestingSessionLocal

pytestmark = pytest.mark.usefixtures("mock_supabase_auth")


@pytest.fixture(autouse=True)
def clean_database():
    """Ensure all related tables are cleared before and after each test."""
    db = TestingSessionLocal()
    try:
        db.query(Application).delete()
        db.query(Match).delete()
        db.query(ProcessingJob).delete()
        db.query(StudentSkill).delete()
        db.query(EducationEntry).delete()
        db.query(ExperienceEntry).delete()
        db.query(ProjectEntry).delete()
        db.query(StudentProfile).delete()
        db.query(Skill).delete()
        db.query(InternshipListing).delete()
        db.commit()
    finally:
        db.close()
    yield
    db = TestingSessionLocal()
    try:
        db.query(Application).delete()
        db.query(Match).delete()
        db.query(ProcessingJob).delete()
        db.query(StudentSkill).delete()
        db.query(EducationEntry).delete()
        db.query(ExperienceEntry).delete()
        db.query(ProjectEntry).delete()
        db.query(StudentProfile).delete()
        db.query(Skill).delete()
        db.query(InternshipListing).delete()
        db.commit()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# 1. GET /applications TESTS (1 - 7)
# ---------------------------------------------------------------------------


def test_unauthenticated_get_applications_rejected(client: TestClient):
    """Test 1: Unauthenticated GET /applications returns 401."""
    response = client.get("/api/v1/applications")
    assert response.status_code == 401
    assert response.json()["detail"]["error"]["code"] == "UNAUTHORIZED"


def test_empty_tracker_returns_empty_list(client: TestClient):
    """Test 2: Authenticated user with no applications gets empty list."""
    user_id = uuid4()
    token = f"valid-user-{user_id}"

    response = client.get(
        "/api/v1/applications",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json() == {"applications": []}


def test_owner_sees_own_applications_with_joined_internship(
    client: TestClient,
):
    """Test 3: Owner retrieves applications with company_name and job_title."""
    user_id = uuid4()
    token = f"valid-user-{user_id}"

    db = TestingSessionLocal()
    try:
        profile = StudentProfile(id=uuid4(), user_id=user_id, full_name="Jane Candidate")
        db.add(profile)
        db.flush()

        listing = InternshipListing(
            id=uuid4(),
            title="Backend Intern",
            company="AlphaCorp",
            location="Remote",
            work_type="remote",
            description="API development.",
        )
        db.add(listing)
        db.flush()

        app = Application(
            id=uuid4(),
            student_id=profile.id,
            internship_id=listing.id,
            status="saved",
            generated_cover_letter="Cover letter text",
            notes="Interested in their backend team",
        )
        db.add(app)
        db.commit()
        app_id = app.id
        listing_id = listing.id
    finally:
        db.close()

    response = client.get(
        "/api/v1/applications",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["applications"]) == 1
    item = data["applications"][0]
    assert item["id"] == str(app_id)
    assert item["internship_id"] == str(listing_id)
    assert item["company_name"] == "AlphaCorp"
    assert item["job_title"] == "Backend Intern"
    assert item["status"] == "saved"
    assert item["generated_cover_letter"] == "Cover letter text"
    assert item["applied_date"] is None
    assert item["notes"] == "Interested in their backend team"


def test_tenant_isolation_never_exposes_other_user_applications(
    client: TestClient,
):
    """Test 4: User B cannot see User A's application tracker records."""
    user_a = uuid4()
    user_b = uuid4()
    token_b = f"valid-user-{user_b}"

    db = TestingSessionLocal()
    try:
        prof_a = StudentProfile(id=uuid4(), user_id=user_a, full_name="Candidate A")
        db.add(prof_a)
        db.flush()

        listing = InternshipListing(
            id=uuid4(),
            title="Dev",
            company="Alpha",
            location="Remote",
            work_type="remote",
            description="Dev.",
        )
        db.add(listing)
        db.flush()

        app_a = Application(
            id=uuid4(),
            student_id=prof_a.id,
            internship_id=listing.id,
            status="applied",
        )
        db.add(app_a)
        db.commit()
    finally:
        db.close()

    response = client.get(
        "/api/v1/applications",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert response.status_code == 200
    assert response.json() == {"applications": []}


def test_historical_record_with_deleted_internship_preserved(
    client: TestClient,
):
    """
    Test 5 & 6: Application with internship_id=None (deleted listing)
    remains visible with internship_id=null, company_name=null, job_title=null.
    """
    user_id = uuid4()
    token = f"valid-user-{user_id}"

    db = TestingSessionLocal()
    try:
        profile = StudentProfile(id=uuid4(), user_id=user_id, full_name="Jane Candidate")
        db.add(profile)
        db.flush()

        # Historical application whose internship listing was archived/removed
        app = Application(
            id=uuid4(),
            student_id=profile.id,
            internship_id=None,  # ON DELETE SET NULL
            status="interviewing",
            generated_cover_letter="Historical cover letter",
            applied_date=date(2026, 8, 1),
            notes="Interview completed",
        )
        db.add(app)
        db.commit()
        app_id = app.id
    finally:
        db.close()

    response = client.get(
        "/api/v1/applications",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["applications"]) == 1
    item = data["applications"][0]
    assert item["id"] == str(app_id)
    assert item["internship_id"] is None
    assert item["company_name"] is None
    assert item["job_title"] is None
    assert item["status"] == "interviewing"
    assert item["generated_cover_letter"] == "Historical cover letter"
    assert item["applied_date"] == "2026-08-01"
    assert item["notes"] == "Interview completed"


def test_application_serialization_excludes_internal_fields(
    client: TestClient,
):
    """Test 7: Response does not leak student_id or internal timestamps."""
    user_id = uuid4()
    token = f"valid-user-{user_id}"

    db = TestingSessionLocal()
    try:
        profile = StudentProfile(id=uuid4(), user_id=user_id, full_name="Candidate")
        db.add(profile)
        db.flush()

        app = Application(
            id=uuid4(),
            student_id=profile.id,
            internship_id=None,
            status="saved",
        )
        db.add(app)
        db.commit()
    finally:
        db.close()

    response = client.get(
        "/api/v1/applications",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    item = response.json()["applications"][0]
    assert "student_id" not in item
    assert "created_at" not in item
    assert "updated_at" not in item


# ---------------------------------------------------------------------------
# 2. PATCH /applications/{id}/status TESTS (8 - 20)
# ---------------------------------------------------------------------------


def test_unauthenticated_patch_status_rejected(client: TestClient):
    """Test 8: Unauthenticated PATCH /applications/{id}/status returns 401."""
    response = client.patch(
        f"/api/v1/applications/{uuid4()}/status",
        json={"status": "applied"},
    )
    assert response.status_code == 401
    assert response.json()["detail"]["error"]["code"] == "UNAUTHORIZED"


def test_nonexistent_application_returns_404(client: TestClient):
    """Test 9: Requesting PATCH on nonexistent application returns 404."""
    user_id = uuid4()
    token = f"valid-user-{user_id}"

    response = client.patch(
        f"/api/v1/applications/{uuid4()}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "applied"},
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Application not found."


def test_other_user_application_returns_404_tenant_isolation(
    client: TestClient,
):
    """Test 10: Attempting to PATCH another user's application returns 404."""
    user_a = uuid4()
    user_b = uuid4()
    token_b = f"valid-user-{user_b}"

    db = TestingSessionLocal()
    try:
        prof_a = StudentProfile(id=uuid4(), user_id=user_a, full_name="Candidate A")
        db.add(prof_a)
        db.flush()

        app_a = Application(
            id=uuid4(),
            student_id=prof_a.id,
            internship_id=None,
            status="saved",
        )
        db.add(app_a)
        db.commit()
        target_id = app_a.id
    finally:
        db.close()

    response = client.patch(
        f"/api/v1/applications/{target_id}/status",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"status": "applied"},
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Application not found."


def test_invalid_status_rejected_with_422(client: TestClient):
    """Test 11: Invalid status string returns 422 validation error."""
    user_id = uuid4()
    token = f"valid-user-{user_id}"

    response = client.patch(
        f"/api/v1/applications/{uuid4()}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "in_progress"},  # Invalid status
    )
    assert response.status_code == 422


@pytest.mark.parametrize(
    "valid_status", ["saved", "applied", "interviewing", "rejected", "accepted"]
)
def test_owner_can_update_each_valid_status(client: TestClient, valid_status):
    """Test 12: Owner can update to any valid status in the contract."""
    user_id = uuid4()
    token = f"valid-user-{user_id}"

    db = TestingSessionLocal()
    try:
        profile = StudentProfile(id=uuid4(), user_id=user_id, full_name="Candidate")
        db.add(profile)
        db.flush()

        app = Application(
            id=uuid4(),
            student_id=profile.id,
            internship_id=None,
            status="saved",
        )
        db.add(app)
        db.commit()
        app_id = app.id
    finally:
        db.close()

    response = client.patch(
        f"/api/v1/applications/{app_id}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": valid_status},
    )
    assert response.status_code == 200
    assert response.json()["status"] == valid_status


def test_notes_omitted_preserves_existing_notes(client: TestClient):
    """Test 13: Omitting 'notes' field in PATCH payload preserves existing notes."""
    user_id = uuid4()
    token = f"valid-user-{user_id}"

    db = TestingSessionLocal()
    try:
        profile = StudentProfile(id=uuid4(), user_id=user_id, full_name="Candidate")
        db.add(profile)
        db.flush()

        app = Application(
            id=uuid4(),
            student_id=profile.id,
            internship_id=None,
            status="saved",
            notes="Important notes to keep",
        )
        db.add(app)
        db.commit()
        app_id = app.id
    finally:
        db.close()

    response = client.patch(
        f"/api/v1/applications/{app_id}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "interviewing"},  # 'notes' omitted
    )
    assert response.status_code == 200
    assert response.json()["notes"] == "Important notes to keep"


def test_notes_string_updates_notes(client: TestClient):
    """Test 14: Supplying string 'notes' updates the notes in database."""
    user_id = uuid4()
    token = f"valid-user-{user_id}"

    db = TestingSessionLocal()
    try:
        profile = StudentProfile(id=uuid4(), user_id=user_id, full_name="Candidate")
        db.add(profile)
        db.flush()

        app = Application(
            id=uuid4(),
            student_id=profile.id,
            internship_id=None,
            status="saved",
            notes="Old notes",
        )
        db.add(app)
        db.commit()
        app_id = app.id
    finally:
        db.close()

    response = client.patch(
        f"/api/v1/applications/{app_id}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "saved", "notes": "Brand new notes"},
    )
    assert response.status_code == 200
    assert response.json()["notes"] == "Brand new notes"


def test_notes_explicit_null_clears_notes(client: TestClient):
    """Test 15: Explicitly passing 'notes': null clears existing notes."""
    user_id = uuid4()
    token = f"valid-user-{user_id}"

    db = TestingSessionLocal()
    try:
        profile = StudentProfile(id=uuid4(), user_id=user_id, full_name="Candidate")
        db.add(profile)
        db.flush()

        app = Application(
            id=uuid4(),
            student_id=profile.id,
            internship_id=None,
            status="saved",
            notes="Notes to be cleared",
        )
        db.add(app)
        db.commit()
        app_id = app.id
    finally:
        db.close()

    response = client.patch(
        f"/api/v1/applications/{app_id}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "saved", "notes": None},  # Explicit null
    )
    assert response.status_code == 200
    assert response.json()["notes"] is None


def test_first_transition_to_applied_sets_applied_date(client: TestClient):
    """Test 16: First transition to 'applied' sets applied_date to UTC today."""
    user_id = uuid4()
    token = f"valid-user-{user_id}"

    db = TestingSessionLocal()
    try:
        profile = StudentProfile(id=uuid4(), user_id=user_id, full_name="Candidate")
        db.add(profile)
        db.flush()

        app = Application(
            id=uuid4(),
            student_id=profile.id,
            internship_id=None,
            status="saved",
            applied_date=None,
        )
        db.add(app)
        db.commit()
        app_id = app.id
    finally:
        db.close()

    today_str = datetime.now(timezone.utc).date().isoformat()

    response = client.patch(
        f"/api/v1/applications/{app_id}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "applied"},
    )
    assert response.status_code == 200
    assert response.json()["applied_date"] == today_str


def test_repeat_applied_preserves_original_applied_date(client: TestClient):
    """Test 17: Repeat PATCH to 'applied' preserves existing applied_date."""
    user_id = uuid4()
    token = f"valid-user-{user_id}"

    original_date = date(2026, 7, 15)

    db = TestingSessionLocal()
    try:
        profile = StudentProfile(id=uuid4(), user_id=user_id, full_name="Candidate")
        db.add(profile)
        db.flush()

        app = Application(
            id=uuid4(),
            student_id=profile.id,
            internship_id=None,
            status="applied",
            applied_date=original_date,
        )
        db.add(app)
        db.commit()
        app_id = app.id
    finally:
        db.close()

    response = client.patch(
        f"/api/v1/applications/{app_id}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "applied"},
    )
    assert response.status_code == 200
    assert response.json()["applied_date"] == "2026-07-15"


def test_later_status_transitions_preserve_applied_date(client: TestClient):
    """Test 18: Transitions to interviewing/rejected/accepted preserve applied_date."""
    user_id = uuid4()
    token = f"valid-user-{user_id}"

    original_date = date(2026, 7, 20)

    db = TestingSessionLocal()
    try:
        profile = StudentProfile(id=uuid4(), user_id=user_id, full_name="Candidate")
        db.add(profile)
        db.flush()

        app = Application(
            id=uuid4(),
            student_id=profile.id,
            internship_id=None,
            status="applied",
            applied_date=original_date,
        )
        db.add(app)
        db.commit()
        app_id = app.id
    finally:
        db.close()

    # Move to interviewing
    resp1 = client.patch(
        f"/api/v1/applications/{app_id}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "interviewing"},
    )
    assert resp1.status_code == 200
    assert resp1.json()["applied_date"] == "2026-07-20"

    # Move to accepted
    resp2 = client.patch(
        f"/api/v1/applications/{app_id}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "accepted"},
    )
    assert resp2.status_code == 200
    assert resp2.json()["applied_date"] == "2026-07-20"


def test_direct_saved_to_interviewing_leaves_applied_date_null(
    client: TestClient,
):
    """Test 19: Direct transition saved -> interviewing leaves applied_date None."""
    user_id = uuid4()
    token = f"valid-user-{user_id}"

    db = TestingSessionLocal()
    try:
        profile = StudentProfile(id=uuid4(), user_id=user_id, full_name="Candidate")
        db.add(profile)
        db.flush()

        app = Application(
            id=uuid4(),
            student_id=profile.id,
            internship_id=None,
            status="saved",
            applied_date=None,
        )
        db.add(app)
        db.commit()
        app_id = app.id
    finally:
        db.close()

    response = client.patch(
        f"/api/v1/applications/{app_id}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "interviewing"},
    )
    assert response.status_code == 200
    assert response.json()["applied_date"] is None


def test_successful_patch_returns_full_updated_contract_schema(
    client: TestClient,
):
    """Test 20: Successful PATCH returns all contract-specified fields."""
    user_id = uuid4()
    token = f"valid-user-{user_id}"

    db = TestingSessionLocal()
    try:
        profile = StudentProfile(id=uuid4(), user_id=user_id, full_name="Candidate")
        db.add(profile)
        db.flush()

        listing = InternshipListing(
            id=uuid4(),
            title="Frontend Intern",
            company="BetaTech",
            location="Remote",
            work_type="remote",
            description="React dev.",
        )
        db.add(listing)
        db.flush()

        app = Application(
            id=uuid4(),
            student_id=profile.id,
            internship_id=listing.id,
            status="saved",
            generated_cover_letter="My cover letter",
        )
        db.add(app)
        db.commit()
        app_id = app.id
        listing_id = listing.id
    finally:
        db.close()

    response = client.patch(
        f"/api/v1/applications/{app_id}/status",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "applied", "notes": "Applied via portal"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(app_id)
    assert data["internship_id"] == str(listing_id)
    assert data["company_name"] == "BetaTech"
    assert data["job_title"] == "Frontend Intern"
    assert data["status"] == "applied"
    assert data["generated_cover_letter"] == "My cover letter"
    assert data["applied_date"] is not None
    assert data["notes"] == "Applied via portal"


# ---------------------------------------------------------------------------
# 3. GATE 2.28 REGENERATION REGRESSION SAFETY (21)
# ---------------------------------------------------------------------------


def test_gate_2_28_regeneration_preserves_status_notes_applied_date():
    """
    Test 21: Gate 2.28 cover-letter regeneration updates generated_cover_letter
    only and strictly preserves status, notes, applied_date, id, and created_at.
    """
    db = TestingSessionLocal()
    try:
        student_id = uuid4()
        internship_id = uuid4()

        profile = StudentProfile(id=student_id, user_id=uuid4(), full_name="Candidate")
        db.add(profile)
        listing = InternshipListing(
            id=internship_id,
            title="Dev",
            company="Co",
            location="Remote",
            work_type="remote",
            description="Dev.",
        )
        db.add(listing)
        db.flush()

        original_applied_date = date(2026, 8, 10)
        existing_app = Application(
            id=uuid4(),
            student_id=student_id,
            internship_id=internship_id,
            status="interviewing",
            generated_cover_letter="Version 1 cover letter",
            applied_date=original_applied_date,
            notes="Second round next Tuesday",
        )
        db.add(existing_app)
        db.commit()
        orig_id = existing_app.id
        orig_created_at = existing_app.created_at

        # Call Gate 2.28 repository upsert
        updated_app = ApplicationRepository.upsert_generated_cover_letter(
            db=db,
            student_id=student_id,
            internship_id=internship_id,
            generated_cover_letter="Version 2 regenerated cover letter",
        )
        db.commit()

        assert updated_app.id == orig_id
        assert updated_app.created_at == orig_created_at
        assert updated_app.status == "interviewing"  # PRESERVED
        assert updated_app.applied_date == original_applied_date  # PRESERVED
        assert updated_app.notes == "Second round next Tuesday"  # PRESERVED
        assert updated_app.generated_cover_letter == "Version 2 regenerated cover letter"
    finally:
        db.close()
