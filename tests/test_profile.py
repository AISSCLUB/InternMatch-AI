"""
Unit & Repository Tests for Protected Student Profile Read & Write Endpoints.
Verifies authentication, user-scoped profile retrieval, upsert operations,
404 handling, and parameter override protection.
"""

from uuid import uuid4

from app.db.models import StudentProfile
from app.db.session import Base, get_db
from app.main import app
from app.repositories.student_profile import StudentProfileRepository
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from tests.test_auth import generate_mock_jwt

# SQLite in-memory database setup for fast unit testing
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=test_engine
)


def override_get_db():
    """Override get_db dependency to use SQLite in-memory test database."""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


def setup_module():
    """Create all test database tables in memory before tests run."""
    Base.metadata.create_all(bind=test_engine)


def teardown_module():
    """Drop all test database tables after tests finish."""
    Base.metadata.drop_all(bind=test_engine)


def test_unauthenticated_profile_request_returns_401(client: TestClient):
    """Test 1: Unauthenticated request to GET /api/v1/profile returns 401 UNAUTHORIZED."""
    response = client.get("/api/v1/profile")
    assert response.status_code == 401
    data = response.json()
    assert data["detail"]["error"]["code"] == "UNAUTHORIZED"


def test_authenticated_user_without_profile_returns_404(client: TestClient):
    """Test 2: Authenticated user with no database profile returns 404 NOT FOUND."""
    no_profile_user_id = uuid4()
    token = generate_mock_jwt(user_id=no_profile_user_id)

    response = client.get(
        "/api/v1/profile", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 404
    data = response.json()
    assert data["detail"]["error"]["code"] == "NOT_FOUND"
    assert "Student profile not found" in data["detail"]["error"]["message"]


def test_authenticated_user_with_profile_returns_own_profile(client: TestClient):
    """Test 3: Authenticated user with existing profile returns 200 OK with their own profile."""
    user_id = uuid4()
    db = TestingSessionLocal()

    profile = StudentProfile(
        user_id=user_id,
        full_name="Jane Student",
        headline="Software Engineering Intern Candidate",
        cv_storage_path="cvs/jane_doe_cv.pdf",
        preferences={"work_types": ["remote"], "desired_locations": ["Remote"]},
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    db.close()

    token = generate_mock_jwt(user_id=user_id)
    response = client.get(
        "/api/v1/profile", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == str(user_id)
    assert data["full_name"] == "Jane Student"
    assert data["headline"] == "Software Engineering Intern Candidate"


def test_client_supplied_user_id_cannot_override_jwt_identity(client: TestClient):
    """Test 4: Client-supplied user_id parameter cannot override JWT sub identity."""
    authenticated_user_id = uuid4()
    other_user_id = uuid4()

    db = TestingSessionLocal()
    # Create profile for authenticated user
    auth_profile = StudentProfile(
        user_id=authenticated_user_id,
        full_name="Authenticated User",
        headline="Real Profile",
    )
    # Create profile for victim user
    other_profile = StudentProfile(
        user_id=other_user_id,
        full_name="Victim User",
        headline="Other Profile",
    )
    db.add_all([auth_profile, other_profile])
    db.commit()
    db.close()

    token = generate_mock_jwt(user_id=authenticated_user_id)

    # Attempt attacker override via query parameter
    response = client.get(
        f"/api/v1/profile?user_id={other_user_id}",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == str(authenticated_user_id)
    assert data["full_name"] == "Authenticated User"
    assert data["full_name"] != "Victim User"


def test_repository_scopes_query_strictly_to_user_id():
    """Test 5: StudentProfileRepository.get_by_user_id queries strictly the target user_id."""
    user_a = uuid4()
    user_b = uuid4()

    db = TestingSessionLocal()
    profile_a = StudentProfile(user_id=user_a, full_name="User A")
    profile_b = StudentProfile(user_id=user_b, full_name="User B")
    db.add_all([profile_a, profile_b])
    db.commit()

    # Query user A
    res_a = StudentProfileRepository.get_by_user_id(db, user_id=user_a)
    assert res_a is not None
    assert res_a.user_id == user_a
    assert res_a.full_name == "User A"

    # Query user B
    res_b = StudentProfileRepository.get_by_user_id(db, user_id=user_b)
    assert res_b is not None
    assert res_b.user_id == user_b
    assert res_b.full_name == "User B"

    # Query non-existent user C
    res_c = StudentProfileRepository.get_by_user_id(db, user_id=uuid4())
    assert res_c is None

    db.close()


def test_unauthenticated_put_profile_returns_401(client: TestClient):
    """Test 6: Unauthenticated PUT /api/v1/profile returns 401 UNAUTHORIZED."""
    payload = {"full_name": "New Candidate"}
    response = client.put("/api/v1/profile", json=payload)
    assert response.status_code == 401
    data = response.json()
    assert data["detail"]["error"]["code"] == "UNAUTHORIZED"


def test_authenticated_user_can_create_profile(client: TestClient):
    """Test 7: Authenticated user can create their own profile via PUT when none exists."""
    user_id = uuid4()
    token = generate_mock_jwt(user_id=user_id)

    payload = {
        "full_name": "Alex Student",
        "headline": "Junior Data Scientist",
        "preferences": {"work_types": ["hybrid"]},
    }
    response = client.put(
        "/api/v1/profile",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == str(user_id)
    assert data["full_name"] == "Alex Student"
    assert data["headline"] == "Junior Data Scientist"
    assert data["preferences"] == {"work_types": ["hybrid"]}


def test_authenticated_user_can_update_existing_profile(client: TestClient):
    """Test 8: Authenticated user can update their existing profile via PUT."""
    user_id = uuid4()
    db = TestingSessionLocal()

    initial_profile = StudentProfile(
        user_id=user_id,
        full_name="Original Name",
        headline="Old Headline",
    )
    db.add(initial_profile)
    db.commit()
    db.close()

    token = generate_mock_jwt(user_id=user_id)
    update_payload = {
        "full_name": "Updated Name",
        "headline": "New Lead Engineer",
        "preferences": {"work_types": ["remote"]},
    }

    response = client.put(
        "/api/v1/profile",
        json=update_payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == str(user_id)
    assert data["full_name"] == "Updated Name"
    assert data["headline"] == "New Lead Engineer"


def test_client_supplied_user_id_in_body_cannot_override_jwt(client: TestClient):
    """Test 9: Attacker user_id in PUT request body cannot hijack another user's profile."""
    authenticated_user_id = uuid4()
    victim_user_id = uuid4()

    db = TestingSessionLocal()
    victim_profile = StudentProfile(
        user_id=victim_user_id,
        full_name="Victim Full Name",
        headline="Victim Headline",
    )
    db.add(victim_profile)
    db.commit()
    db.close()

    token = generate_mock_jwt(user_id=authenticated_user_id)
    malicious_payload = {
        "user_id": str(victim_user_id),
        "full_name": "Attacker Hijack Attempt",
        "headline": "Hacked",
    }

    response = client.put(
        "/api/v1/profile",
        json=malicious_payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    # Profile created/updated belongs strictly to authenticated_user_id, NOT victim_user_id
    assert data["user_id"] == str(authenticated_user_id)
    assert data["full_name"] == "Attacker Hijack Attempt"

    # Verify victim's profile remains completely unchanged in database
    db_verify = TestingSessionLocal()
    victim_db_record = StudentProfileRepository.get_by_user_id(db_verify, victim_user_id)
    assert victim_db_record is not None
    assert victim_db_record.full_name == "Victim Full Name"
    assert victim_db_record.headline == "Victim Headline"
    db_verify.close()


def test_second_user_profile_remains_unchanged_on_update(client: TestClient):
    """Test 10: Updating user A's profile leaves user B's profile completely untouched."""
    user_a = uuid4()
    user_b = uuid4()

    db = TestingSessionLocal()
    prof_a = StudentProfile(user_id=user_a, full_name="User A Original")
    prof_b = StudentProfile(user_id=user_b, full_name="User B Original")
    db.add_all([prof_a, prof_b])
    db.commit()
    db.close()

    token_a = generate_mock_jwt(user_id=user_a)
    payload_a = {"full_name": "User A Modified"}

    response = client.put(
        "/api/v1/profile",
        json=payload_a,
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert response.status_code == 200

    db_check = TestingSessionLocal()
    check_b = StudentProfileRepository.get_by_user_id(db_check, user_b)
    assert check_b is not None
    assert check_b.full_name == "User B Original"
    db_check.close()


def test_invalid_profile_input_rejected(client: TestClient):
    """Test 11: Invalid profile input (e.g. empty full_name) is rejected with 422."""
    user_id = uuid4()
    token = generate_mock_jwt(user_id=user_id)

    invalid_payload = {"full_name": ""}
    response = client.put(
        "/api/v1/profile",
        json=invalid_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 422


def test_put_profile_persists_in_fresh_database_session(client: TestClient):
    """Test 12: Verify that PUT /api/v1/profile commits transaction and persists to session."""
    user_id = uuid4()
    token = generate_mock_jwt(user_id=user_id)

    payload = {"full_name": "Persisted Student", "headline": "Persisted Headline"}
    response = client.put(
        "/api/v1/profile",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200

    # Query directly in a separate database session after request completion
    db_fresh = TestingSessionLocal()
    persisted = StudentProfileRepository.get_by_user_id(db_fresh, user_id=user_id)
    assert persisted is not None
    assert persisted.full_name == "Persisted Student"
    assert persisted.headline == "Persisted Headline"
    db_fresh.close()
