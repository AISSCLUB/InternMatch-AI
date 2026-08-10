"""
SQLAlchemy ORM Models for Database Tables
Maps public schema tables defined by database/migrations/001_initial_schema.sql.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import UUID, uuid4

from app.db.session import Base
from sqlalchemy import JSON, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column


class StudentProfile(Base):
    """ORM Model mapping public.student_profiles table."""

    __tablename__ = "student_profiles"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), primary_key=True, default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), unique=True, nullable=False
    )
    full_name: Mapped[str] = mapped_column(String, nullable=False)
    headline: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    cv_storage_path: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    preferences: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSON, nullable=True, default=dict
    )
    created_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
