"""
Real PostgreSQL + pgvector Demo Seed Runtime Integration Test Suite.
Verifies real database seeding from database/seeds/001_demo_internships.sql,
idempotent pgvector description embedding backfill, description-change invalidation,
and pgvector cosine distance candidate retrieval readiness.
Runs ONLY when TEST_POSTGRES_DATABASE_URL environment variable is set.
Zero live OpenAI network calls (uses deterministic fake embedder).
"""

import hashlib
import math
import os
from typing import List

import pytest

POSTGRES_DB_URL = os.getenv("TEST_POSTGRES_DATABASE_URL")
if not POSTGRES_DB_URL:
    pytest.skip(
        "TEST_POSTGRES_DATABASE_URL environment variable is not set. "
        "Skipping PostgreSQL pgvector demo seed runtime integration tests.",
        allow_module_level=True,
    )

from app.core.config import settings  # noqa: E402
from app.db.models import InternshipListing  # noqa: E402
from app.repositories.vector_retrieval import (  # noqa: E402
    VectorRetrievalRepository,
)
from sqlalchemy import (  # noqa: E402
    create_engine,
    delete,
    func,
    select,
    update,
)
from sqlalchemy.orm import Session, sessionmaker  # noqa: E402

from scripts.seed_internships import (  # noqa: E402
    DEFAULT_SEED_SQL_PATH,
    extract_demo_internship_ids_from_sql,
    seed_demo_internships,
)


def _make_dense_vector(
    seed_val: float, dim: int = settings.EMBEDDING_DIMENSION
) -> List[float]:
    """Generate a deterministic normalized non-zero dense vector matching EMBEDDING_DIMENSION."""
    raw = [math.sin(seed_val + i * 0.05) for i in range(dim)]
    norm = math.sqrt(sum(x * x for x in raw))
    return [x / norm for x in raw]


def _make_deterministic_vector_from_text(
    text_val: str, dim: int = settings.EMBEDDING_DIMENSION
) -> List[float]:
    """Generate a stable deterministic dense vector using hashlib SHA256."""
    digest = hashlib.sha256(text_val.encode("utf-8")).digest()
    seed_val = float(sum(digest))
    return _make_dense_vector(seed_val=seed_val, dim=dim)


@pytest.fixture(scope="module")
def pg_engine():
    """Create dedicated SQLAlchemy engine for real PostgreSQL test database."""
    engine = create_engine(POSTGRES_DB_URL, pool_pre_ping=True)
    yield engine
    engine.dispose()


@pytest.fixture
def pg_session(pg_engine):
    """
    Provide an isolated database session for PostgreSQL tests.
    """
    session_factory = sessionmaker(bind=pg_engine, expire_on_commit=False)
    session = session_factory()
    yield session
    session.close()


def test_postgres_demo_seed_lifecycle_and_retrieval(pg_session: Session):
    """
    End-to-end integration test on real PostgreSQL covering:
    A. First seed execution (35 listings seeded + exactly 35 embeddings generated).
    B. Default rerun idempotency (35 listings preserved + 0 embeddings generated).
    C. Description-change invalidation (1 listing re-embedded).
    D. Vector retrieval readiness via pgvector cosine distance search.
    """
    sql_content = DEFAULT_SEED_SQL_PATH.read_text(encoding="utf-8")
    expected_ids = extract_demo_internship_ids_from_sql(sql_content)
    assert len(expected_ids) == 35

    # Clean only the 35 controlled demo internship rows before starting Phase A
    pg_session.execute(
        delete(InternshipListing).where(
            InternshipListing.id.in_(expected_ids)
        )
    )
    pg_session.commit()

    embed_call_counts: List[str] = []

    def tracked_embedder(text_val: str) -> List[float]:
        embed_call_counts.append(text_val)
        return _make_deterministic_vector_from_text(text_val)

    # -----------------------------------------------------------------------
    # Phase A: First Execution (Clean Slate -> 35 Embedded)
    # -----------------------------------------------------------------------
    summary_run1 = seed_demo_internships(
        session=pg_session,
        seed_sql_path=DEFAULT_SEED_SQL_PATH,
        embedder_func=tracked_embedder,
        refresh_embeddings=False,
    )

    assert len(embed_call_counts) == 35
    assert summary_run1.demo_rows == 35
    assert summary_run1.embedded == 35
    assert summary_run1.skipped_existing == 0
    assert summary_run1.missing_embeddings == 0

    # Verify all 35 rows in DB have valid 1536-dimensional non-null vectors
    stmt = select(InternshipListing).where(
        InternshipListing.id.in_(expected_ids)
    )
    listings_run1 = pg_session.scalars(stmt).all()
    assert len(listings_run1) == 35
    for listing in listings_run1:
        assert listing.description_embedding is not None
        assert len(listing.description_embedding) == settings.EMBEDDING_DIMENSION

    # -----------------------------------------------------------------------
    # Phase B: Default Rerun (Idempotent, Zero Embedder Calls)
    # -----------------------------------------------------------------------
    embed_call_counts.clear()

    summary_run2 = seed_demo_internships(
        session=pg_session,
        seed_sql_path=DEFAULT_SEED_SQL_PATH,
        embedder_func=tracked_embedder,
        refresh_embeddings=False,
    )

    assert len(embed_call_counts) == 0
    assert summary_run2.demo_rows == 35
    assert summary_run2.invalidated == 0
    assert summary_run2.embedded == 0
    assert summary_run2.skipped_existing == 35
    assert summary_run2.missing_embeddings == 0

    # -----------------------------------------------------------------------
    # Phase C: Description-Change Invalidation Proof
    # -----------------------------------------------------------------------
    target_id = expected_ids[0]
    original_listing = pg_session.get(InternshipListing, target_id)
    assert original_listing is not None
    original_description = original_listing.description

    # Mutate description directly in database using typed Core connection update
    pg_session.connection().execute(
        update(InternshipListing.__table__)
        .where(InternshipListing.__table__.c.id == target_id)
        .values(
            description="Temporarily mutated description that diverges from SQL."
        )
    )
    pg_session.commit()

    embed_call_counts.clear()

    summary_run3 = seed_demo_internships(
        session=pg_session,
        seed_sql_path=DEFAULT_SEED_SQL_PATH,
        embedder_func=tracked_embedder,
        refresh_embeddings=False,
    )

    assert len(embed_call_counts) == 1
    assert summary_run3.demo_rows == 35
    assert summary_run3.invalidated == 1
    assert summary_run3.embedded == 1
    assert summary_run3.skipped_existing == 34
    assert summary_run3.missing_embeddings == 0

    # Verify description is restored to authoritative content and has valid embedding
    reloaded_target = pg_session.get(InternshipListing, target_id)
    assert reloaded_target is not None
    assert reloaded_target.description == original_description
    assert reloaded_target.description_embedding is not None
    assert len(reloaded_target.description_embedding) == settings.EMBEDDING_DIMENSION

    # -----------------------------------------------------------------------
    # Phase D: Vector Retrieval Readiness via Real pgvector
    # -----------------------------------------------------------------------
    # Proves zero NULL description embeddings exist across all 35 demo rows using typed count
    null_count = pg_session.scalar(
        select(func.count())
        .select_from(InternshipListing)
        .where(
            InternshipListing.id.in_(expected_ids),
            InternshipListing.description_embedding.is_(None),
        )
    )
    assert null_count == 0

    # Query using VectorRetrievalRepository against a fake candidate vector
    candidate_vec = _make_dense_vector(42.0)
    candidates = VectorRetrievalRepository.get_nearest_internships(
        db=pg_session,
        candidate_embedding=candidate_vec,
        limit=5,
    )

    assert len(candidates) >= 1
    retrieved_demo_ids = [
        c.internship.id for c in candidates if c.internship.id in expected_ids
    ]
    assert len(retrieved_demo_ids) >= 1
    for c in candidates:
        assert isinstance(c.cosine_distance, float)
        assert c.cosine_distance >= 0.0
