"""
Unit & Compilation Tests for PostgreSQL Vector Candidate Retrieval Repository.
Validates embedding dimension validation, limit validation, PostgreSQL pgvector <=> operator
compilation, SQL WHERE/ORDER BY/LIMIT clauses, and row-to-VectorCandidate mapping.
"""

from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from app.core.config import settings
from app.db.models import InternshipListing
from app.repositories.vector_retrieval import (
    VectorCandidate,
    VectorRetrievalRepository,
    build_nearest_internships_statement,
)
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import Session


def test_1_wrong_embedding_dimension_raises_value_error():
    """Test 1: Embedding with dimension != EMBEDDING_DIMENSION raises ValueError."""
    wrong_vector = [0.1] * (settings.EMBEDDING_DIMENSION - 1)
    with pytest.raises(ValueError, match="Invalid candidate_embedding dimension"):
        build_nearest_internships_statement(candidate_embedding=wrong_vector, limit=10)


def test_2_empty_embedding_raises_value_error():
    """Test 2: Empty embedding vector raises ValueError."""
    with pytest.raises(ValueError, match="Invalid candidate_embedding dimension"):
        build_nearest_internships_statement(candidate_embedding=[], limit=10)


def test_3_zero_limit_raises_value_error():
    """Test 3: Limit of zero raises ValueError."""
    valid_vector = [0.1] * settings.EMBEDDING_DIMENSION
    with pytest.raises(ValueError, match="Limit must be a positive integer"):
        build_nearest_internships_statement(candidate_embedding=valid_vector, limit=0)


def test_4_negative_limit_raises_value_error():
    """Test 4: Negative limit raises ValueError."""
    valid_vector = [0.1] * settings.EMBEDDING_DIMENSION
    with pytest.raises(ValueError, match="Limit must be a positive integer"):
        build_nearest_internships_statement(candidate_embedding=valid_vector, limit=-5)


def test_5_correct_configured_embedding_dimension_accepted():
    """Test 5: Vector matching settings.EMBEDDING_DIMENSION constructs statement cleanly."""
    valid_vector = [0.1] * settings.EMBEDDING_DIMENSION
    stmt = build_nearest_internships_statement(candidate_embedding=valid_vector, limit=5)
    assert stmt is not None


def test_6_postgresql_compilation_uses_cosine_distance_operator():
    """Test 6: PostgreSQL compilation uses pgvector <=> cosine distance operator."""
    valid_vector = [0.1] * settings.EMBEDDING_DIMENSION
    stmt = build_nearest_internships_statement(candidate_embedding=valid_vector, limit=10)
    compiled_sql = str(stmt.compile(dialect=postgresql.dialect()))
    assert "<=>" in compiled_sql


def test_7_sql_excludes_null_description_embedding_rows():
    """Test 7: Statement excludes rows where description_embedding IS NULL."""
    valid_vector = [0.1] * settings.EMBEDDING_DIMENSION
    stmt = build_nearest_internships_statement(candidate_embedding=valid_vector, limit=10)
    compiled_sql = str(stmt.compile(dialect=postgresql.dialect()))
    assert "IS NOT NULL" in compiled_sql


def test_8_sql_orders_by_cosine_distance_ascending():
    """Test 8: Statement orders by cosine distance ascending (nearest first)."""
    valid_vector = [0.1] * settings.EMBEDDING_DIMENSION
    stmt = build_nearest_internships_statement(candidate_embedding=valid_vector, limit=10)
    compiled_sql = str(stmt.compile(dialect=postgresql.dialect()))
    assert "ORDER BY" in compiled_sql
    assert "<=>" in compiled_sql
    assert "ASC" in compiled_sql


def test_9_sql_applies_limit():
    """Test 9: Statement applies limit clause."""
    valid_vector = [0.1] * settings.EMBEDDING_DIMENSION
    stmt = build_nearest_internships_statement(candidate_embedding=valid_vector, limit=15)
    compiled_sql = str(stmt.compile(dialect=postgresql.dialect()))
    assert "LIMIT" in compiled_sql


def test_10_no_unrelated_business_filters_in_where_clause():
    """Test 10: Statement WHERE clause contains no skill, location, work_type,
    or language filters."""

    valid_vector = [0.1] * settings.EMBEDDING_DIMENSION
    stmt = build_nearest_internships_statement(candidate_embedding=valid_vector, limit=10)
    where_sql = str(stmt.whereclause.compile(dialect=postgresql.dialect()))
    assert "IS NOT NULL" in where_sql
    assert "required_skills" not in where_sql
    assert "work_type" not in where_sql
    assert "location" not in where_sql
    assert "language" not in where_sql
    assert "eligibility" not in where_sql


def test_11_result_dataclass_contains_no_score_fields():
    """Test 11: VectorCandidate result dataclass holds only internship and raw distance."""
    mock_internship = InternshipListing(
        id=uuid4(),
        title="AI Intern",
        company="Nexa",
        location="Remote",
        work_type="remote",
        description="AI research role",
    )
    candidate = VectorCandidate(internship=mock_internship, cosine_distance=0.1234)
    assert candidate.internship == mock_internship
    assert candidate.cosine_distance == 0.1234
    assert not hasattr(candidate, "vector_score")
    assert not hasattr(candidate, "overall_score")
    assert not hasattr(candidate, "skill_score")
    assert not hasattr(candidate, "attribute_score")


def test_12_repository_maps_rows_and_preserves_database_order():
    """Test 12: Repository maps DB rows into VectorCandidate list
    preserving order and raw distance."""
    mock_internship1 = InternshipListing(
        id=uuid4(),
        title="Role 1",
        company="Co 1",
        location="Loc 1",
        work_type="remote",
        description="Desc 1",
    )
    mock_internship2 = InternshipListing(
        id=uuid4(),
        title="Role 2",
        company="Co 2",
        location="Loc 2",
        work_type="onsite",
        description="Desc 2",
    )

    mock_db = MagicMock(spec=Session)
    mock_db.execute.return_value.all.return_value = [
        (mock_internship1, 0.15),
        (mock_internship2, 0.42),
    ]

    valid_vector = [0.0] * settings.EMBEDDING_DIMENSION
    results = VectorRetrievalRepository.get_nearest_internships(
        db=mock_db, candidate_embedding=valid_vector, limit=2
    )

    assert len(results) == 2
    assert isinstance(results[0], VectorCandidate)
    assert results[0].internship == mock_internship1
    assert results[0].cosine_distance == 0.15

    assert isinstance(results[1], VectorCandidate)
    assert results[1].internship == mock_internship2
    assert results[1].cosine_distance == 0.42
