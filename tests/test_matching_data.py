"""
Unit & Integration Tests for Matching Data ORM Models & Repository.
Validates table registration, vector storage compatibility under SQLite,
skill/education retrieval, tenant isolation, and tech stack JSON variant.
"""

from uuid import uuid4

import pytest
from app.core.config import settings
from app.db.models import (
    EducationEntry,
    ExperienceEntry,
    InternshipListing,
    ProjectEntry,
    Skill,
    StudentProfile,
    StudentSkill,
)
from app.db.session import Base
from app.repositories.matching_data import MatchingDataRepository

from tests.db import TestingSessionLocal


@pytest.fixture(autouse=True)
def clean_matching_data_tables():
    """Clear matching data tables between tests."""
    db = TestingSessionLocal()
    try:
        db.query(StudentSkill).delete()
        db.query(Skill).delete()
        db.query(EducationEntry).delete()
        db.query(ExperienceEntry).delete()
        db.query(ProjectEntry).delete()
        db.query(StudentProfile).delete()
        db.query(InternshipListing).delete()
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
        db.query(InternshipListing).delete()
        db.commit()
    finally:
        db.close()


def test_required_new_orm_tables_are_registered():
    """Test 1: Verify all 5 new matching tables are registered in SQLAlchemy Base.metadata."""
    tables = Base.metadata.tables
    assert "skills" in tables
    assert "student_skills" in tables
    assert "education_entries" in tables
    assert "experience_entries" in tables
    assert "project_entries" in tables


def test_student_profile_summary_embedding_sqlite_variant():
    """Test 2: StudentProfile.summary_embedding accepts and stores a float vector under SQLite."""
    user_id = uuid4()
    test_vector = [0.05 * (i % 10) for i in range(settings.EMBEDDING_DIMENSION)]

    db = TestingSessionLocal()
    try:
        profile = StudentProfile(
            user_id=user_id,
            full_name="Vector Student",
            summary_embedding=test_vector,
        )
        db.add(profile)
        db.commit()

        fetched = db.query(StudentProfile).filter_by(user_id=user_id).first()
        assert fetched is not None
        assert fetched.summary_embedding is not None
        assert len(fetched.summary_embedding) == settings.EMBEDDING_DIMENSION
        assert fetched.summary_embedding[0] == 0.0
    finally:
        db.close()


def test_internship_listing_description_embedding_sqlite_variant():
    """Test 3: InternshipListing.description_embedding accepts and stores a float vector
    under SQLite."""

    test_vector = [0.01 * (i % 5) for i in range(settings.EMBEDDING_DIMENSION)]

    db = TestingSessionLocal()
    try:
        internship = InternshipListing(
            title="Embedded Data Intern",
            company="VectorCorp",
            location="Remote",
            work_type="remote",
            description="Vector search test",
            description_embedding=test_vector,
        )
        db.add(internship)
        db.commit()

        fetched = MatchingDataRepository.get_internship_by_id(
            db=db, internship_id=internship.id
        )
        assert fetched is not None
        assert fetched.description_embedding is not None
        assert len(fetched.description_embedding) == settings.EMBEDDING_DIMENSION
    finally:
        db.close()


def test_skill_and_student_skill_persistence():
    """Test 4: Skill and StudentSkill composite PK models persist correctly."""
    user_id = uuid4()

    db = TestingSessionLocal()
    try:
        student = StudentProfile(user_id=user_id, full_name="Skill Candidate")
        db.add(student)
        db.flush()

        skill = Skill(name="Python", category="Backend")
        db.add(skill)
        db.flush()

        student_skill = StudentSkill(
            student_id=student.id,
            skill_id=skill.id,
            proficiency_level="advanced",
        )
        db.add(student_skill)
        db.commit()

        fetched_ss = (
            db.query(StudentSkill)
            .filter_by(student_id=student.id, skill_id=skill.id)
            .first()
        )
        assert fetched_ss is not None
        assert fetched_ss.proficiency_level == "advanced"
        assert fetched_ss.skill.name == "Python"
    finally:
        db.close()


def test_get_skill_names_for_student_isolation_and_ordering():
    """Tests 5, 6, 7: get_skill_names_for_student returns only requested student's skills sorted."""
    user_a = uuid4()
    user_b = uuid4()

    db = TestingSessionLocal()
    try:
        student_a = StudentProfile(user_id=user_a, full_name="Student A")
        student_b = StudentProfile(user_id=user_b, full_name="Student B")
        db.add_all([student_a, student_b])
        db.flush()

        skill_py = Skill(name="Python")
        skill_go = Skill(name="Go")
        skill_sql = Skill(name="SQL")
        db.add_all([skill_py, skill_go, skill_sql])
        db.flush()

        # Student A has Python and Go
        db.add(StudentSkill(student_id=student_a.id, skill_id=skill_py.id))
        db.add(StudentSkill(student_id=student_a.id, skill_id=skill_go.id))

        # Student B has SQL
        db.add(StudentSkill(student_id=student_b.id, skill_id=skill_sql.id))
        db.commit()

        skills_a = MatchingDataRepository.get_skill_names_for_student(
            db=db, student_id=student_a.id
        )
        # Deterministic alphabetical ordering: ["Go", "Python"]
        assert skills_a == ["Go", "Python"]

        skills_b = MatchingDataRepository.get_skill_names_for_student(
            db=db, student_id=student_b.id
        )
        # Student B only has SQL (no leakage)
        assert skills_b == ["SQL"]
    finally:
        db.close()


def test_get_profile_by_user_id_user_scoped():
    """Test 8: MatchingDataRepository.get_profile_by_user_id is user_id scoped."""
    user_id = uuid4()
    other_user_id = uuid4()

    db = TestingSessionLocal()
    try:
        profile = StudentProfile(user_id=user_id, full_name="Scoped Profile")
        db.add(profile)
        db.commit()

        found = MatchingDataRepository.get_profile_by_user_id(db=db, user_id=user_id)
        assert found is not None
        assert found.full_name == "Scoped Profile"

        not_found = MatchingDataRepository.get_profile_by_user_id(
            db=db, user_id=other_user_id
        )
        assert not_found is None
    finally:
        db.close()


def test_education_entry_persistence_and_student_scoping():
    """Test 9: EducationEntry persists and get_education_for_student is student scoped."""
    user_a = uuid4()
    user_b = uuid4()

    db = TestingSessionLocal()
    try:
        student_a = StudentProfile(user_id=user_a, full_name="Edu Student A")
        student_b = StudentProfile(user_id=user_b, full_name="Edu Student B")
        db.add_all([student_a, student_b])
        db.flush()

        edu1 = EducationEntry(
            student_id=student_a.id,
            institution="Tech University",
            degree="B.S. Computer Science",
            start_year=2021,
            end_year=2025,
        )
        edu2 = EducationEntry(
            student_id=student_b.id,
            institution="State College",
            degree="B.A. Data Science",
            start_year=2022,
            end_year=2026,
        )
        db.add_all([edu1, edu2])
        db.commit()

        edu_a = MatchingDataRepository.get_education_for_student(
            db=db, student_id=student_a.id
        )
        assert len(edu_a) == 1
        assert edu_a[0].institution == "Tech University"
    finally:
        db.close()


def test_project_entry_tech_stack_json_variant():
    """Test 10: ProjectEntry.tech_stack SQLite JSON variant accepts and reads list of strings."""
    user_id = uuid4()

    db = TestingSessionLocal()
    try:
        student = StudentProfile(user_id=user_id, full_name="Project Student")
        db.add(student)
        db.flush()

        project = ProjectEntry(
            student_id=student.id,
            title="InternMatch AI Platform",
            tech_stack=["Python", "FastAPI", "PostgreSQL"],
            description="AI candidate matching system",
        )
        db.add(project)
        db.commit()

        fetched = db.query(ProjectEntry).filter_by(student_id=student.id).first()
        assert fetched is not None
        assert fetched.tech_stack == ["Python", "FastAPI", "PostgreSQL"]
    finally:
        db.close()


def test_existing_internship_listing_reads_remain_compatible():
    """Test 11: Existing InternshipListing reads without embeddings remain fully compatible."""
    db = TestingSessionLocal()
    try:
        internship = InternshipListing(
            title="Legacy Intern",
            company="Traditional Corp",
            location="Onsite",
            work_type="onsite",
            description="Traditional role description",
            required_skills=["Java", "SQL"],
        )
        db.add(internship)
        db.commit()

        fetched = MatchingDataRepository.get_internship_by_id(
            db=db, internship_id=internship.id
        )
        assert fetched is not None
        assert fetched.title == "Legacy Intern"
        assert fetched.description_embedding is None
    finally:
        db.close()
