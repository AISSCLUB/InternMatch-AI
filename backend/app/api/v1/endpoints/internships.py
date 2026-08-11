"""
Public Read-Only Internship Catalog Endpoints
Provides endpoints for browsing and fetching internship listings.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import UUID

from app.db.session import get_db
from app.repositories.internship import InternshipRepository
from app.schemas.internship import (
    InternshipDetailResponse,
    InternshipListResponse,
    InternshipSummaryResponse,
)
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

router = APIRouter()


def format_not_found_error(message: str) -> Dict[str, Any]:
    """Format standard machine-readable 404 error payload."""
    return {
        "error": {
            "code": "NOT_FOUND",
            "message": message,
            "details": None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    }


@router.get("", response_model=InternshipListResponse)
def list_internships(
    work_type: Optional[str] = Query(
        None, description="Filter by work type ('remote', 'onsite', 'hybrid')"
    ),
    location: Optional[str] = Query(None, description="Filter by location substring"),
    skill: Optional[str] = Query(
        None, description="Filter by required or preferred skill substring"
    ),
    limit: int = Query(20, ge=1, le=50, description="Pagination limit (default 20, max 50)"),
    offset: int = Query(0, ge=0, description="Pagination offset (default 0)"),
    db: Session = Depends(get_db),
):
    """
    Retrieve the list of curated internships with optional filtering.
    Public read-only endpoint.
    """
    items, total = InternshipRepository.list_internships(
        db=db,
        work_type=work_type,
        location=location,
        skill=skill,
        limit=limit,
        offset=offset,
    )
    return InternshipListResponse(
        items=[InternshipSummaryResponse.from_orm_model(item) for item in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{id}", response_model=InternshipDetailResponse)
def get_internship_detail(
    id: UUID,
    db: Session = Depends(get_db),
):
    """
    Retrieve complete details of a specific internship listing.
    Public read-only endpoint.
    """
    listing = InternshipRepository.get_by_id(db=db, internship_id=id)
    if not listing:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=format_not_found_error("Internship listing not found."),
        )
    return InternshipDetailResponse.from_orm_model(listing)
