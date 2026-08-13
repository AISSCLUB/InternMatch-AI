"""
Unit & Integration Tests for Grounded Match Explanation (Gate 2.27).
Tests GET /api/v1/matches/{id}/explanation endpoint, authentication,
tenant isolation, grounding from persisted match/profile data, LLM mocking,
caching/persistence of why_you_match, and preservation of deterministic scores.
"""

from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from app.db.models import (
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
from app.services.match_explanation import (
    LLMMatchExplanation,
    generate_grounded_match_explanation,
    get_or_create_match_explanation,
)
from fastapi.testclient import TestClient

from tests.db import TestingSessionLocal
from tests.test_auth import generate_mock_jwt


@pytest.fixture(autouse=True)
def clean_database():
    """Ensure all related tables are cleared before and after each test."""
    db = TestingSessionLocal()
    try:
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


def _mock_openai_explanation_parse(
    monkeypatch, explanation_obj: LLMMatchExplanation
):
    """Helper to mock OpenAI client structured output parse method."""
    mock_choice = MagicMock()
    mock_choice.message.refusal = None
    mock_choice.message.parsed = explanation_obj

    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    mock_client = MagicMock()
    mock_client.chat.completions.parse.return_value = mock_response

    monkeypatch.setattr(
        "app.services.match_explanation.settings.OPENAI_API_KEY",
        "sk-test-match-explanation",
    )
    monkeypatch.setattr(
        "app.services.match_explanation.OpenAI",
        lambda api_key: mock_client,
    )
    return mock_client


# ---------------------------------------------------------------------------
# 1. AUTHENTICATION & ACCESS CONTROL TESTS (1 - 3)
# ---------------------------------------------------------------------------


def test_unauthenticated_explanation_request_returns_401(client: TestClient):
    """Test 1: Unauthenticated GET returns 401 UNAUTHORIZED."""
    match_id = uuid4()
    response = client.get(f"/api/v1/matches/{match_id}/explanation")
    assert response.status_code == 401
    data = response.json()
    assert data["detail"]["error"]["code"] == "UNAUTHORIZED"


def test_nonexistent_match_returns_404(client: TestClient):
    """Test 2: Requesting explanation for nonexistent match returns 404."""
    user_id = uuid4()
    token = generate_mock_jwt(user_id=user_id)
    nonexistent_id = uuid4()

    response = client.get(
        f"/api/v1/matches/{nonexistent_id}/explanation",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Match not found."


def test_other_user_match_returns_404_tenant_isolation(client: TestClient):
    """Test 3: Another user's match returns 404 (never exposed)."""
    user_a = uuid4()
    user_b = uuid4()
    token_b = generate_mock_jwt(user_id=user_b)

    db = TestingSessionLocal()
    try:
        prof_a = StudentProfile(
            id=uuid4(), user_id=user_a, full_name="Candidate A"
        )
        db.add(prof_a)
        db.flush()

        listing = InternshipListing(
            id=uuid4(),
            title="Backend Intern",
            company="AlphaCorp",
            location="Remote",
            work_type="remote",
            description="Build backend microservices.",
        )
        db.add(listing)
        db.flush()

        match_a = Match(
            id=uuid4(),
            student_id=prof_a.id,
            internship_id=listing.id,
            overall_score=85,
            skill_score=90,
            vector_score=80,
            attribute_score=85,
            skill_gap_analysis={
                "matching_skills": ["Python"],
                "missing_skills": ["Docker"],
            },
        )
        db.add(match_a)
        db.commit()
        target_match_id = match_a.id
    finally:
        db.close()

    response = client.get(
        f"/api/v1/matches/{target_match_id}/explanation",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Match not found."


# ---------------------------------------------------------------------------
# 2. GROUNDED EXPLANATION GENERATION & PERSISTENCE (4 - 10)
# ---------------------------------------------------------------------------


def test_authenticated_owner_gets_explanation_successfully(
    client: TestClient, monkeypatch
):
    """
    Test 4: Authenticated owner receives full grounded explanation with
    exact contract schema, matching/missing skills copied from canonical gap,
    and overall_score matching persisted Match.
    """
    user_id = uuid4()
    token = generate_mock_jwt(user_id=user_id)

    db = TestingSessionLocal()
    try:
        profile = StudentProfile(
            id=uuid4(),
            user_id=user_id,
            full_name="Jane Student",
            headline="CS Junior @ State Tech",
        )
        db.add(profile)
        db.flush()

        listing = InternshipListing(
            id=uuid4(),
            title="Python Cloud Intern",
            company="CloudTech",
            location="Remote",
            work_type="remote",
            description="Develop Python APIs on AWS.",
            required_skills=["Python", "FastAPI"],
            preferred_skills=["Docker", "Redis"],
        )
        db.add(listing)
        db.flush()

        match = Match(
            id=uuid4(),
            student_id=profile.id,
            internship_id=listing.id,
            overall_score=88,
            skill_score=90,
            vector_score=85,
            attribute_score=90,
            skill_gap_analysis={
                "matching_skills": ["Python", "FastAPI"],
                "missing_skills": ["Docker", "Redis"],
                "summary": "",
                "recommendations": [],
            },
        )
        db.add(match)
        db.commit()
        target_match_id = match.id
    finally:
        db.close()

    mock_llm_output = LLMMatchExplanation(
        why_you_match=(
            "Your experience with Python and FastAPI matches CloudTech's core "
            "backend stack perfectly."
        ),
        skill_gap_summary=(
            "You are missing 2 preferred containerization and caching skills."
        ),
        recommendations=[
            "Complete a 2-hour tutorial on Docker basics.",
            "Learn basic Redis key-value caching patterns.",
        ],
    )
    _mock_openai_explanation_parse(monkeypatch, mock_llm_output)

    response = client.get(
        f"/api/v1/matches/{target_match_id}/explanation",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()

    # Exact contract schema verification
    assert data["match_id"] == str(target_match_id)
    assert data["overall_score"] == 88
    assert data["why_you_match"] == mock_llm_output.why_you_match
    assert data["matching_skills"] == ["Python", "FastAPI"]
    assert data["missing_skills"] == ["Docker", "Redis"]
    assert (
        data["skill_gap_analysis"]["summary"]
        == mock_llm_output.skill_gap_summary
    )
    assert (
        data["skill_gap_analysis"]["recommendations"]
        == mock_llm_output.recommendations
    )


def test_generated_explanation_is_persisted_and_cached(
    client: TestClient, monkeypatch
):
    """
    Test 5: First request generates and persists why_you_match and gap recommendations.
    Second request returns the cached result without calling OpenAI.
    """
    user_id = uuid4()
    token = generate_mock_jwt(user_id=user_id)

    db = TestingSessionLocal()
    try:
        profile = StudentProfile(
            id=uuid4(), user_id=user_id, full_name="Candidate"
        )
        db.add(profile)
        db.flush()

        listing = InternshipListing(
            id=uuid4(),
            title="Backend Intern",
            company="Co",
            location="Remote",
            work_type="remote",
            description="Backend dev.",
            required_skills=["Python"],
        )
        db.add(listing)
        db.flush()

        match = Match(
            id=uuid4(),
            student_id=profile.id,
            internship_id=listing.id,
            overall_score=92,
            skill_score=95,
            vector_score=90,
            attribute_score=90,
            skill_gap_analysis={
                "matching_skills": ["Python"],
                "missing_skills": ["Docker"],
                "summary": "",
                "recommendations": [],
            },
        )
        db.add(match)
        db.commit()
        target_match_id = match.id
    finally:
        db.close()

    mock_llm_output = LLMMatchExplanation(
        why_you_match="Great Python skills for the backend role.",
        skill_gap_summary="Missing Docker containerization skill.",
        recommendations=["Practice Dockerizing apps."],
    )
    mock_client = _mock_openai_explanation_parse(monkeypatch, mock_llm_output)

    # First call: triggers OpenAI parse
    resp1 = client.get(
        f"/api/v1/matches/{target_match_id}/explanation",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp1.status_code == 200
    assert mock_client.chat.completions.parse.call_count == 1

    # Verify database was updated
    db = TestingSessionLocal()
    try:
        persisted_match = db.query(Match).filter_by(id=target_match_id).first()
        assert persisted_match is not None
        assert persisted_match.skill_gap_analysis is not None
        assert persisted_match.why_you_match == mock_llm_output.why_you_match
        assert (
            persisted_match.skill_gap_analysis["summary"]
            == mock_llm_output.skill_gap_summary
        )
        assert (
            persisted_match.skill_gap_analysis["recommendations"]
            == mock_llm_output.recommendations
        )
        # Verify deterministic scores were NOT altered
        assert persisted_match.overall_score == 92
        assert persisted_match.skill_score == 95
        assert persisted_match.vector_score == 90
        assert persisted_match.attribute_score == 90
    finally:
        db.close()

    # Second call: uses cached explanation (OpenAI not called again)
    resp2 = client.get(
        f"/api/v1/matches/{target_match_id}/explanation",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp2.status_code == 200
    assert resp2.json()["why_you_match"] == mock_llm_output.why_you_match
    assert mock_client.chat.completions.parse.call_count == 1


def test_matching_and_missing_skills_are_never_overwritten_by_llm(
    client: TestClient, monkeypatch
):
    """Test 6: matching_skills and missing_skills are strictly preserved."""
    user_id = uuid4()
    token = generate_mock_jwt(user_id=user_id)

    db = TestingSessionLocal()
    try:
        profile = StudentProfile(
            id=uuid4(), user_id=user_id, full_name="Candidate"
        )
        db.add(profile)
        db.flush()

        listing = InternshipListing(
            id=uuid4(),
            title="Dev",
            company="Co",
            location="Remote",
            work_type="remote",
            description="Dev.",
        )
        db.add(listing)
        db.flush()

        canonical_matching = ["Python", "FastAPI", "SQL"]
        canonical_missing = ["Kubernetes", "AWS"]

        match = Match(
            id=uuid4(),
            student_id=profile.id,
            internship_id=listing.id,
            overall_score=75,
            skill_score=80,
            vector_score=70,
            attribute_score=75,
            skill_gap_analysis={
                "matching_skills": canonical_matching,
                "missing_skills": canonical_missing,
                "summary": "",
                "recommendations": [],
            },
        )
        db.add(match)
        db.commit()
        target_match_id = match.id
    finally:
        db.close()

    mock_llm_output = LLMMatchExplanation(
        why_you_match="Solid candidate for Python stack.",
        skill_gap_summary="Gap in cloud and orchestration.",
        recommendations=["Study Kubernetes."],
    )
    _mock_openai_explanation_parse(monkeypatch, mock_llm_output)

    resp = client.get(
        f"/api/v1/matches/{target_match_id}/explanation",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["matching_skills"] == canonical_matching
    assert data["missing_skills"] == canonical_missing


def test_provider_failure_returns_safe_503_and_does_not_leak_secrets(
    client: TestClient, monkeypatch
):
    """Test 7: OpenAI failure returns HTTP 503 and does not leak secrets."""
    user_id = uuid4()
    token = generate_mock_jwt(user_id=user_id)

    db = TestingSessionLocal()
    try:
        profile = StudentProfile(
            id=uuid4(), user_id=user_id, full_name="Candidate"
        )
        db.add(profile)
        db.flush()

        listing = InternshipListing(
            id=uuid4(),
            title="Dev",
            company="Co",
            location="Remote",
            work_type="remote",
            description="Dev.",
        )
        db.add(listing)
        db.flush()

        match = Match(
            id=uuid4(),
            student_id=profile.id,
            internship_id=listing.id,
            overall_score=80,
            skill_score=80,
            vector_score=80,
            attribute_score=80,
            skill_gap_analysis={
                "matching_skills": ["Python"],
                "missing_skills": [],
            },
        )
        db.add(match)
        db.commit()
        target_match_id = match.id
    finally:
        db.close()

    def failing_openai(*args, **kwargs):
        raise ValueError(
            "OPENAI_API_KEY configuration is missing or placeholder value"
        )

    monkeypatch.setattr(
        "app.services.match_explanation.generate_grounded_match_explanation",
        failing_openai,
    )

    response = client.get(
        f"/api/v1/matches/{target_match_id}/explanation",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 503
    assert "sk-" not in response.text
    assert "OPENAI_API_KEY" not in response.text


def test_malformed_canonical_skill_gap_handled_gracefully(
    client: TestClient, monkeypatch
):
    """Test 8: Match with None skill_gap_analysis is handled gracefully."""
    user_id = uuid4()
    token = generate_mock_jwt(user_id=user_id)

    db = TestingSessionLocal()
    try:
        profile = StudentProfile(
            id=uuid4(), user_id=user_id, full_name="Candidate"
        )
        db.add(profile)
        db.flush()

        listing = InternshipListing(
            id=uuid4(),
            title="Dev",
            company="Co",
            location="Remote",
            work_type="remote",
            description="Dev.",
        )
        db.add(listing)
        db.flush()

        match = Match(
            id=uuid4(),
            student_id=profile.id,
            internship_id=listing.id,
            overall_score=70,
            skill_score=70,
            vector_score=70,
            attribute_score=70,
            skill_gap_analysis=None,  # None instead of dict
        )
        db.add(match)
        db.commit()
        target_match_id = match.id
    finally:
        db.close()

    mock_llm_output = LLMMatchExplanation(
        why_you_match="Good fit.",
        skill_gap_summary="No specific gaps.",
        recommendations=[],
    )
    _mock_openai_explanation_parse(monkeypatch, mock_llm_output)

    response = client.get(
        f"/api/v1/matches/{target_match_id}/explanation",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["matching_skills"] == []
    assert data["missing_skills"] == []


def test_generate_grounded_match_explanation_unit(monkeypatch):
    """Test 9: Direct unit test for generate_grounded_match_explanation."""
    profile = StudentProfile(
        id=uuid4(),
        user_id=uuid4(),
        full_name="Alex Researcher",
        headline="AI Undergrad",
    )
    listing = InternshipListing(
        id=uuid4(),
        title="AI Engineer",
        company="Nexa",
        location="Remote",
        work_type="remote",
        description="Build LLMs.",
        required_skills=["Python", "PyTorch"],
    )

    mock_llm_output = LLMMatchExplanation(
        why_you_match="Alex has strong PyTorch fundamentals for Nexa.",
        skill_gap_summary="No missing required skills.",
        recommendations=["Review transformer architectures."],
    )
    _mock_openai_explanation_parse(monkeypatch, mock_llm_output)

    result = generate_grounded_match_explanation(
        profile=profile,
        internship=listing,
        overall_score=94,
        matching_skills=["Python", "PyTorch"],
        missing_skills=[],
        candidate_skills=["Python", "PyTorch", "Git"],
        education_entries=["B.S. CS at Tech (2023-2027)"],
    )

    assert result.why_you_match == mock_llm_output.why_you_match
    assert result.skill_gap_summary == mock_llm_output.skill_gap_summary
    assert result.recommendations == mock_llm_output.recommendations


def test_get_or_create_match_explanation_returns_none_for_missing_record():
    """Test 10: get_or_create_match_explanation returns None for missing match."""
    db = TestingSessionLocal()
    try:
        result = get_or_create_match_explanation(
            db=db,
            match_id=uuid4(),
            user_id=uuid4(),
        )
        assert result is None
    finally:
        db.close()
