"""
Unit & Integration Tests for Candidate Matches Read Endpoint.
Validates GET /api/v1/matches authentication, tenant isolation, score sorting,
nested mapping, and exclusion of explanation fields.
"""

from uuid import uuid4

import pytest
from app.db.models import InternshipListing, Match, StudentProfile
from app.repositories.match import MatchRepository
from fastapi.testclient import TestClient

from tests.db import TestingSessionLocal
from tests.test_auth import generate_mock_jwt


@pytest.fixture(autouse=True)
def clean_matches_table():
    """Ensure matches, student_profiles, and internship_listings are cleared between tests."""
    db = TestingSessionLocal()
    try:
        db.query(Match).delete()
        db.query(StudentProfile).delete()
        db.query(InternshipListing).delete()
        db.commit()
    finally:
        db.close()
    yield
    db = TestingSessionLocal()
    try:
        db.query(Match).delete()
        db.query(StudentProfile).delete()
        db.query(InternshipListing).delete()
        db.commit()
    finally:
        db.close()


def test_unauthenticated_matches_request_returns_401(client: TestClient):
    """Test 1: Unauthenticated request to GET /api/v1/matches returns 401 UNAUTHORIZED."""
    response = client.get("/api/v1/matches")
    assert response.status_code == 401
    data = response.json()
    assert data["detail"]["error"]["code"] == "UNAUTHORIZED"


def test_authenticated_user_with_no_matches_returns_empty_list(client: TestClient):
    """Test 2: Authenticated user with no persisted matches returns {"matches": []}."""
    user_id = uuid4()
    token = generate_mock_jwt(user_id=user_id)

    response = client.get(
        "/api/v1/matches", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["matches"] == []


def test_authenticated_user_receives_own_matches_sorted(client: TestClient):
    """Test 3: Authenticated user receives own matches sorted by overall_score DESC with mapping."""
    user_id = uuid4()
    other_user_id = uuid4()
    token = generate_mock_jwt(user_id=user_id)

    db = TestingSessionLocal()
    try:
        # Create student profiles
        student = StudentProfile(id=uuid4(), user_id=user_id, full_name="Candidate One")
        other_student = StudentProfile(
            id=uuid4(), user_id=other_user_id, full_name="Candidate Two"
        )
        db.add_all([student, other_student])
        db.flush()

        # Create internship listings
        internship1 = InternshipListing(
            id=uuid4(),
            title="Backend Engineer Intern",
            company="CloudCorp",
            location="Remote",
            work_type="remote",
            description="Backend dev",
        )
        internship2 = InternshipListing(
            id=uuid4(),
            title="AI Research Intern",
            company="NexaAI",
            location="San Francisco, CA",
            work_type="hybrid",
            description="AI research",
        )
        db.add_all([internship1, internship2])
        db.flush()

        # Create matches (overall_score 80 and 95 for candidate, match for other candidate)
        match_lower = Match(
            id=uuid4(),
            student_id=student.id,
            internship_id=internship1.id,
            overall_score=80,
            skill_score=85,
            vector_score=75,
            attribute_score=80,
            why_you_match="Good fit for backend skills.",
            skill_gap_analysis={"missing_skills": ["Docker"]},
        )
        match_higher = Match(
            id=uuid4(),
            student_id=student.id,
            internship_id=internship2.id,
            overall_score=95,
            skill_score=98,
            vector_score=92,
            attribute_score=95,
            why_you_match="Excellent fit for AI skills.",
            skill_gap_analysis={"missing_skills": []},
        )
        other_match = Match(
            id=uuid4(),
            student_id=other_student.id,
            internship_id=internship1.id,
            overall_score=99,
            skill_score=99,
            vector_score=99,
            attribute_score=99,
        )
        db.add_all([match_lower, match_higher, other_match])
        db.commit()

        target_match_id_higher = match_higher.id
        target_match_id_lower = match_lower.id
        target_internship2_id = internship2.id
        target_internship1_id = internship1.id
    finally:
        db.close()

    response = client.get(
        "/api/v1/matches", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    data = response.json()

    matches = data["matches"]
    # Only 2 matches for user_id (other user's match excluded)
    assert len(matches) == 2

    # Sorted by overall_score DESC (95 then 80)
    first_match = matches[0]
    assert first_match["match_id"] == str(target_match_id_higher)
    assert first_match["overall_score"] == 95
    assert first_match["skill_score"] == 98
    assert first_match["vector_score"] == 92
    assert first_match["internship"]["id"] == str(target_internship2_id)
    assert first_match["internship"]["title"] == "AI Research Intern"
    assert first_match["internship"]["company"] == "NexaAI"
    assert first_match["internship"]["location"] == "San Francisco, CA"

    second_match = matches[1]
    assert second_match["match_id"] == str(target_match_id_lower)
    assert second_match["overall_score"] == 80
    assert second_match["internship"]["id"] == str(target_internship1_id)

    # Confirm explanation fields and attribute_score are NOT exposed in GET /matches
    assert "why_you_match" not in first_match
    assert "skill_gap_analysis" not in first_match
    assert "attribute_score" not in first_match


def test_repository_query_level_ownership_enforcement():
    """Test 4: Direct repository test proving ownership restriction is enforced by SQL query."""
    user_a = uuid4()
    user_b = uuid4()

    db = TestingSessionLocal()
    try:
        student_a = StudentProfile(id=uuid4(), user_id=user_a, full_name="User A")
        student_b = StudentProfile(id=uuid4(), user_id=user_b, full_name="User B")
        db.add_all([student_a, student_b])
        db.flush()

        internship = InternshipListing(
            id=uuid4(),
            title="DevOps Intern",
            company="OpsTech",
            location="Remote",
            work_type="remote",
            description="DevOps engineering",
        )
        db.add(internship)
        db.flush()

        match_a = Match(
            id=uuid4(),
            student_id=student_a.id,
            internship_id=internship.id,
            overall_score=85,
            skill_score=85,
            vector_score=85,
            attribute_score=85,
        )
        db.add(match_a)
        db.commit()

        # Query for user_a returns match_a
        matches_a = MatchRepository.get_matches_for_user(db=db, user_id=user_a)
        assert len(matches_a) == 1
        assert matches_a[0][0].id == match_a.id

        # Query for user_b returns empty list directly from SQL filter
        matches_b = MatchRepository.get_matches_for_user(db=db, user_id=user_b)
        assert len(matches_b) == 0
    finally:
        db.close()
