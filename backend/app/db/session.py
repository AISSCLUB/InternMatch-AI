"""
Database Connection & Session Management Foundation
Manages SQLAlchemy engine creation and provides reusable FastAPI database session dependencies.
"""

from typing import Generator

from app.core.config import settings
from app.core.logging import get_logger
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

logger = get_logger(__name__)


class Base(DeclarativeBase):
    """Base declarative class for all SQLAlchemy ORM models."""

    pass


def get_database_url() -> str:
    """
    Retrieve configured DATABASE_URL from settings.
    Ensures safe parsing without exposing credentials in logs.
    """
    return settings.DATABASE_URL.strip()


# Create SQLAlchemy engine using existing environment DATABASE_URL
db_url = get_database_url()

# Configure engine arguments; use pool_pre_ping for resilient PostgreSQL connections
engine = create_engine(
    db_url,
    pool_pre_ping=True,
    future=True,
)

# Session factory for generating database sessions
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True,
)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency yielding a database session for request lifecycle.
    Ensures session closure after request completion.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
