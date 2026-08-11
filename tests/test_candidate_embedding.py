"""
Unit & Integration Tests for Candidate Summary Builder & Embedding Persistence Service.
Validates canonical summary formatting, section inclusions/exclusions, and whitespace
normalization,
string-list deduplication, preference validation, and orchestration transaction behavior.
All tests monkeypatch generate_embedding with zero network calls.
"""

from datetime import date
from uuid import uuid4

import pytest
from app.db.models import (
    EducationEntry,
    ExperienceEntry,
    ProjectEntry,
    Skill,
    StudentProfile,
    StudentSkill,
)
from app.repositories.student_profile import StudentProfileRepository
from app.services.candidate_embedding import (
    CandidateEmbeddingPreconditionError,
    build_candidate_embedding_text,
    generate_and_persist_candidate_embedding,
)

from tests.db import TestingSessionLocal


@pytest.fixture(autouse=True)
def clean_candidate_tables():
    """Ensure candidate profiles and related tables are cleared between tests."""
    db = TestingSessionLocal()
    try:
        db.query(StudentSkill).delete()
        db.query(Skill).delete()
        db.query(EducationEntry).delete()
        db.query(ExperienceEntry).delete()
        db.query(ProjectEntry).delete()
        db.query(StudentProfile).delete()
        db.commit()
    finally:
        db.close()
    yield
    db = TestingSessionLocal()
    try:
        db.query(StudentSkill).delete()
        db.query(Skill).delete()
        db.query(EducationEntry).delete()
        db.query(ExperienceEntry).delete()
        db.query(ProjectEntry).delete()
        db.query(StudentProfile).delete()
        db.commit()
    finally:
        db.close()


def test_build_candidate_embedding_text_includes_all_sections():
    """Test 1: Canonical summary includes all candidate semantic sections."""
    edu = EducationEntry(
        degree="B.S. Computer Science",
        institution="MIT",
        start_year=2021,
        end_year=2025,
    )
    exp = ExperienceEntry(
        role="Backend Intern",
        company="TechCorp",
        start_date=date(2023, 6, 1),
        end_date=date(2023, 8, 31),
        description="Built REST APIs using FastAPI.",
    )
    proj = ProjectEntry(
        title="InternMatch AI",
        tech_stack=["Python", "FastAPI"],
        description="Vector candidate matching system.",
    )
    prefs = {
        "work_types": ["remote"],
        "desired_locations": ["San Francisco, CA"],
        "target_roles": ["Software Engineer"],
    }

    text = build_candidate_embedding_text(
        headline="Aspiring AI Engineer",
        skills=["Python", "SQL"],
        education=[edu],
        experience=[exp],
        projects=[proj],
        preferences=prefs,
    )

    assert "Headline: Aspiring AI Engineer" in text
    assert "Skills:\n- Python\n- SQL" in text
    assert "Education:\n- B.S. Computer Science | MIT | 2021 | 2025" in text
    assert (
        "Experience:\n- Backend Intern | TechCorp | 2023-06-01 | 2023-08-31 | "
        "Built REST APIs using FastAPI." in text
    )
    assert (
        "Projects:\n- InternMatch AI | FastAPI, Python | Vector candidate matching system." in text
    )
    assert (
        "Preferences:\n- work_types: remote\n- desired_locations: San Francisco, CA\n"
        "- target_roles: Software Engineer" in text
    )


def test_build_candidate_embedding_text_excludes_pii_and_unknown_keys():
    """Test 2: Excludes PII, persistence metadata, and unknown preference keys."""
    prefs = {
        "work_types": ["remote"],
        "unknown_custom_key": "should_be_ignored",
        "secret_token": 12345,
    }

    text = build_candidate_embedding_text(
        headline="Software Engineer",
        skills=["Python"],
        preferences=prefs,
    )

    assert "Jane Student" not in text
    assert "unknown_custom_key" not in text
    assert "secret_token" not in text
    assert "12345" not in text


def test_build_candidate_embedding_text_whitespace_normalization():
    """Test 3: Scalar values have outer whitespace stripped and internal whitespace collapsed."""
    text = build_candidate_embedding_text(
        headline="  Lead   Software   Engineer  \n  ",
    )
    assert text == "Headline: Lead Software Engineer"


def test_build_candidate_embedding_text_string_list_dedupe_and_sort():
    """Test 4: String-list deduplication is case-insensitive and sorted by casefolded value."""
    text = build_candidate_embedding_text(
        skills=["  python  ", "Python", "  DOCKER ", "sql"],
    )
    # Casefolded sort: docker, python, sql.
    # Preserve first normalized casing: DOCKER, python, sql.
    assert text == "Skills:\n- DOCKER\n- python\n- sql"


def test_build_candidate_embedding_text_tech_stack_normalization():
    """Test 5: Project tech stack is normalized, deduplicated, sorted, and joined."""
    proj = ProjectEntry(
        title="My App",
        tech_stack=["  react  ", "React", "TypeScript", "  FASTAPI "],
    )
    text = build_candidate_embedding_text(projects=[proj])
    assert text == "Projects:\n- My App | FASTAPI, react, TypeScript | "


def test_malformed_preferences_non_dict_raises_error():
    """Test 6: Non-dict preferences raises CandidateEmbeddingPreconditionError."""
    with pytest.raises(CandidateEmbeddingPreconditionError, match="must be a dictionary"):
        build_candidate_embedding_text(
            headline="Dev",
            preferences="not_a_dict",  # type: ignore
        )


def test_malformed_preference_key_non_list_raises_error():
    """Test 7: Non-list consumed preference raises the precondition error."""
    with pytest.raises(CandidateEmbeddingPreconditionError, match="must be a list"):
        build_candidate_embedding_text(
            headline="Dev",
            preferences={"work_types": "remote_string_not_list"},
        )


def test_malformed_preference_item_non_string_raises_error():
    """Test 8: Non-string preference item raises the precondition error."""
    with pytest.raises(CandidateEmbeddingPreconditionError, match="items must be strings"):
        build_candidate_embedding_text(
            headline="Dev",
            preferences={"work_types": [123, "remote"]},
        )


def test_orchestration_missing_profile_raises_precondition_error(monkeypatch):
    """Test 9: Missing profile fails before embedding generation."""
    called = []
    monkeypatch.setattr(
        "app.services.candidate_embedding.generate_embedding",
        lambda text: called.append(text),
    )

    db = TestingSessionLocal()
    try:
        with pytest.raises(CandidateEmbeddingPreconditionError, match="No StudentProfile found"):
            generate_and_persist_candidate_embedding(db, user_id=uuid4())
    finally:
        db.close()

    assert called == []


def test_orchestration_empty_summary_text_raises_precondition_error(monkeypatch):
    """Test 10: Candidate with no semantic content fails before provider invocation."""
    user_id = uuid4()
    db = TestingSessionLocal()
    try:
        prof = StudentProfile(user_id=user_id, full_name="Empty Candidate", headline=None)
        db.add(prof)
        db.flush()

        called = []
        monkeypatch.setattr(
            "app.services.candidate_embedding.generate_embedding",
            lambda text: called.append(text),
        )

        with pytest.raises(CandidateEmbeddingPreconditionError, match="summary text is empty"):
            generate_and_persist_candidate_embedding(db, user_id=user_id)

        assert called == []
    finally:
        db.close()


def test_orchestration_calls_generate_embedding_and_persists(monkeypatch):
    """Tests 11-13: Orchestration generates once and persists the candidate vector."""
    user_id = uuid4()
    db = TestingSessionLocal()
    try:
        prof = StudentProfile(
            user_id=user_id, full_name="Candidate One", headline="Backend Developer"
        )
        db.add(prof)
        db.flush()

        skill = Skill(name="Python")
        db.add(skill)
        db.flush()
        db.add(StudentSkill(student_id=prof.id, skill_id=skill.id))
        db.flush()

        fake_vec = [0.123] * 1536
        called_texts = []

        def mock_generate(text):
            called_texts.append(text)
            return fake_vec

        monkeypatch.setattr(
            "app.services.candidate_embedding.generate_embedding",
            mock_generate,
        )

        res = generate_and_persist_candidate_embedding(db, user_id=user_id)
        assert res == fake_vec
        assert len(called_texts) == 1
        assert "Headline: Backend Developer" in called_texts[0]
        assert "Skills:\n- Python" in called_texts[0]

        # Verify persisted in same transaction session
        assert prof.summary_embedding == fake_vec
    finally:
        db.close()


def test_orchestration_does_not_commit_caller_rollback_reverts_persistence(monkeypatch):
    """Test 14: Caller rollback proves the service does not commit persistence."""
    user_id = uuid4()
    db = TestingSessionLocal()
    try:
        prof = StudentProfile(user_id=user_id, full_name="Rollback Candidate", headline="Dev")
        db.add(prof)
        db.flush()

        monkeypatch.setattr(
            "app.services.candidate_embedding.generate_embedding",
            lambda text: [0.9] * 1536,
        )

        generate_and_persist_candidate_embedding(db, user_id=user_id)
        assert prof.summary_embedding is not None

        # Rollback caller transaction
        db.rollback()

        check = StudentProfileRepository.get_by_user_id(db, user_id)
        assert check is None or check.summary_embedding is None
    finally:
        db.close()


def test_provider_exception_propagates_without_overwriting_existing_embedding(monkeypatch):
    """Test 15: Provider exception propagates unchanged and existing embedding is preserved."""
    user_id = uuid4()
    db = TestingSessionLocal()
    try:
        old_vec = [0.7] * 1536
        prof = StudentProfile(
            user_id=user_id, full_name="Candidate", headline="Dev", summary_embedding=old_vec
        )
        db.add(prof)
        db.flush()

        def mock_crash(text):
            raise RuntimeError("OpenAI API 503 Overloaded")

        monkeypatch.setattr(
            "app.services.candidate_embedding.generate_embedding",
            mock_crash,
        )

        with pytest.raises(RuntimeError, match="OpenAI API 503 Overloaded"):
            generate_and_persist_candidate_embedding(db, user_id=user_id)

        assert prof.summary_embedding == old_vec
    finally:
        db.close()


def test_two_users_generating_user_a_cannot_modify_user_b(monkeypatch):
    """Test 16: Generating user A's embedding cannot modify user B's profile or embedding."""
    user_a = uuid4()
    user_b = uuid4()
    db = TestingSessionLocal()
    try:
        vec_b = [0.4] * 1536
        prof_a = StudentProfile(user_id=user_a, full_name="A", headline="Dev A")
        prof_b = StudentProfile(
            user_id=user_b, full_name="B", headline="Dev B", summary_embedding=vec_b
        )
        db.add_all([prof_a, prof_b])
        db.flush()

        monkeypatch.setattr(
            "app.services.candidate_embedding.generate_embedding",
            lambda text: [0.1] * 1536,
        )

        generate_and_persist_candidate_embedding(db, user_id=user_a)

        check_b = StudentProfileRepository.get_by_user_id(db, user_b)
        assert check_b is not None
        assert check_b.summary_embedding == vec_b
    finally:
        db.close()
