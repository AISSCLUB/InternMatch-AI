"""
Unit and Integration Tests for Internship Catalog Endpoints
Validates GET /api/v1/internships and GET /api/v1/internships/{id}.
"""

from datetime import datetime, timezone
from uuid import uuid4

import pytest
from app.db.models import InternshipListing
from fastapi.testclient import TestClient

from tests.db import TestingSessionLocal


@pytest.fixture(autouse=True)
def clean_internships_table():
    """Ensure internship_listings table is cleared before and after each test."""
    db = TestingSessionLocal()
    try:
        db.query(InternshipListing).delete()
        db.commit()
    finally:
        db.close()
    yield
    db = TestingSessionLocal()
    try:
        db.query(InternshipListing).delete()
        db.commit()
    finally:
        db.close()


def test_list_internships_empty_catalog(client: TestClient):
    """Verify GET /api/v1/internships returns empty catalog contract response
    when table is empty."""
    response = client.get("/api/v1/internships")
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0
    assert data["limit"] == 20
    assert data["offset"] == 0


def test_list_internships_pagination_and_sorting(client: TestClient):
    """Verify pagination limit, offset, total count, and sorting by posted_at desc."""
    db = TestingSessionLocal()
    try:
        for i in range(5):
            listing = InternshipListing(
                id=uuid4(),
                title=f"Engineer Intern {i}",
                company="TechCorp",
                location="Remote",
                work_type="remote",
                description=f"Description {i}",
                required_skills=["Python"],
                preferred_skills=["Docker"],
                created_at=datetime(2026, 8, i + 1, tzinfo=timezone.utc),
            )
            db.add(listing)
        db.commit()
    finally:
        db.close()

    # Default pagination: limit=20, offset=0
    response = client.get("/api/v1/internships")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 5
    assert len(data["items"]) == 5
    # First item should be the newest (created_at Aug 5)
    assert data["items"][0]["title"] == "Engineer Intern 4"

    # Custom limit and offset
    response_paged = client.get("/api/v1/internships?limit=2&offset=1")
    assert response_paged.status_code == 200
    data_paged = response_paged.json()
    assert data_paged["total"] == 5
    assert len(data_paged["items"]) == 2
    assert data_paged["limit"] == 2
    assert data_paged["offset"] == 1
    assert data_paged["items"][0]["title"] == "Engineer Intern 3"


def test_list_internships_filters(client: TestClient):
    """Verify filtering by work_type, location, and skill."""
    db = TestingSessionLocal()
    try:
        listing1 = InternshipListing(
            id=uuid4(),
            title="Backend Intern",
            company="CloudCorp",
            location="San Francisco, CA",
            work_type="remote",
            description="Backend python development",
            required_skills=["Python", "FastAPI"],
            preferred_skills=["Redis"],
        )
        listing2 = InternshipListing(
            id=uuid4(),
            title="Frontend Intern",
            company="Web Corp",
            location="New York, NY",
            work_type="hybrid",
            description="Frontend React development",
            required_skills=["TypeScript", "React"],
            preferred_skills=["CSS"],
        )
        listing3 = InternshipListing(
            id=uuid4(),
            title="DevOps Intern",
            company="Ops Solutions",
            location="Austin, TX",
            work_type="onsite",
            description="Infrastructure operations",
            required_skills=["Docker", "AWS"],
            preferred_skills=["Python"],
        )
        db.add_all([listing1, listing2, listing3])
        db.commit()
    finally:
        db.close()

    # Filter by work_type
    res_work = client.get("/api/v1/internships?work_type=remote")
    assert res_work.status_code == 200
    data_work = res_work.json()
    assert data_work["total"] == 1
    assert data_work["items"][0]["title"] == "Backend Intern"

    # Filter by location substring
    res_loc = client.get("/api/v1/internships?location=york")
    assert res_loc.status_code == 200
    data_loc = res_loc.json()
    assert data_loc["total"] == 1
    assert data_loc["items"][0]["title"] == "Frontend Intern"

    # Filter by skill (required or preferred skill)
    res_skill = client.get("/api/v1/internships?skill=python")
    assert res_skill.status_code == 200
    data_skill = res_skill.json()
    assert data_skill["total"] == 2
    titles = [item["title"] for item in data_skill["items"]]
    assert "Backend Intern" in titles
    assert "DevOps Intern" in titles



def test_get_internship_by_id_success_and_boundary_mapping(client: TestClient):
    """
    Verify detail boundary mapping:
    created_at->posted_at, language->languages,
    education_requirements->min_education.
    """
    listing_id = uuid4()
    created_time = datetime(2026, 8, 10, 12, 0, 0, tzinfo=timezone.utc)

    db = TestingSessionLocal()
    try:
        listing = InternshipListing(
            id=listing_id,
            title="AI Engineer Intern",
            company="NexaAI",
            location="Remote",
            work_type="remote",
            description="Build modern LLM RAG pipelines.",
            required_skills=["Python", "PyTorch"],
            preferred_skills=["Docker"],
            language="English",
            education_requirements="Bachelor Student in Computer Science",
            experience_requirements="Python experience",
            created_at=created_time,
        )
        db.add(listing)
        db.commit()
    finally:
        db.close()

    response = client.get(f"/api/v1/internships/{listing_id}")

    assert response.status_code == 200
    data = response.json()

    assert data["id"] == str(listing_id)
    assert data["title"] == "AI Engineer Intern"
    assert data["company"] == "NexaAI"
    assert data["location"] == "Remote"
    assert data["work_type"] == "remote"
    assert data["description"] == "Build modern LLM RAG pipelines."
    assert data["required_skills"] == ["Python", "PyTorch"]
    assert data["preferred_skills"] == ["Docker"]

    assert data["languages"] == ["English"]
    assert data["min_education"] == "Bachelor Student in Computer Science"
    assert "posted_at" in data
    assert data["posted_at"].startswith("2026-08-10T12:00:00")


def test_get_internship_by_id_not_found(client: TestClient):
    """
    Verify detail endpoint returns machine-readable 404
    error payload for an unknown UUID.
    """
    unknown_id = uuid4()

    response = client.get(f"/api/v1/internships/{unknown_id}")

    assert response.status_code == 404
    data = response.json()

    assert "error" in data
    assert data["error"]["code"] == "NOT_FOUND"
    assert "message" in data["error"]
    assert "timestamp" in data["error"]
