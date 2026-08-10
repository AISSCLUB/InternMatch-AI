"""
Unit Tests for Supabase Bearer JWT Authentication Foundation & Reusable Dependencies
Verifies token parsing, algorithm safety, claim validation, user_id extraction, and error handling.
"""

import time
from typing import Optional
from uuid import UUID, uuid4

import jwt
import pytest
from app.core.config import settings
from app.core.security import (
    AuthenticatedUser,
    get_current_user,
    get_current_user_id,
    verify_jwt_token,
)
from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.testclient import TestClient

TEST_JWT_SECRET = "test_supabase_jwt_secret_32_bytes_long_minimum!!"

# FastAPI test router for temporary protected endpoints.
auth_test_router = APIRouter(prefix="/test-auth", tags=["Test Auth"])


@auth_test_router.get("/me")
def protected_me_endpoint(current_user: AuthenticatedUser = Depends(get_current_user)):
    """Sample protected endpoint consuming get_current_user dependency."""
    return {
        "authenticated": True,
        "user_id": str(current_user.user_id),
        "email": current_user.email,
        "role": current_user.role,
    }


@auth_test_router.get("/user-id")
def protected_user_id_endpoint(
    user_id: UUID = Depends(get_current_user_id),
    client_supplied_user_id: Optional[str] = None,
):
    """
    Protected endpoint verifying that client-supplied user_id parameters
    cannot override the authenticated identity extracted from the JWT token.
    """
    return {
        "authenticated_user_id": str(user_id),
        "ignored_client_param": client_supplied_user_id,
    }


@pytest.fixture(autouse=True)
def configure_test_jwt_settings():
    original_secret = settings.SUPABASE_JWT_SECRET
    original_url = settings.SUPABASE_URL

    settings.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
    settings.SUPABASE_URL = "https://legitimate-project.supabase.co"

    yield

    settings.SUPABASE_JWT_SECRET = original_secret
    settings.SUPABASE_URL = original_url


@pytest.fixture
def auth_test_client() -> TestClient:
    """Fixture providing TestClient with test auth routes mounted."""
    test_app = FastAPI()
    test_app.include_router(auth_test_router)
    return TestClient(test_app)


def generate_mock_jwt(
    user_id: Optional[UUID] = None,
    exp_offset: int = 3600,
    secret: str = TEST_JWT_SECRET,
    aud: str = "authenticated",
    iss: Optional[str] = "https://legitimate-project.supabase.co/auth/v1",
    alg: str = "HS256",
    include_sub: bool = True,
) -> str:
    """Helper utility to generate mock synthetic JWTs for testing."""
    payload = {
        "aud": aud,
        "email": "student@example.com",
        "role": "authenticated",
        "exp": int(time.time()) + exp_offset,
    }
    if include_sub and user_id:
        payload["sub"] = str(user_id)
    if iss:
        payload["iss"] = iss

    headers = {"alg": alg, "typ": "JWT"}
    return jwt.encode(payload, secret, algorithm=alg, headers=headers)


def test_valid_jwt_accepted_and_extracts_identity(auth_test_client: TestClient):
    """Test Case 1: Valid JWT token is accepted and identity is extracted."""
    test_uuid = uuid4()
    valid_token = generate_mock_jwt(user_id=test_uuid, exp_offset=3600)

    response = auth_test_client.get(
        "/test-auth/me", headers={"Authorization": f"Bearer {valid_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is True
    assert data["user_id"] == str(test_uuid)
    assert data["email"] == "student@example.com"


def test_wrong_issuer_returns_401(auth_test_client: TestClient):
    """Test Case 2: Token with wrong issuer returns 401 UNAUTHORIZED."""
    test_uuid = uuid4()
    bad_iss_token = generate_mock_jwt(
        user_id=test_uuid, iss="https://malicious-auth-issuer.com/auth/v1"
    )

    original_url = settings.SUPABASE_URL
    try:
        settings.SUPABASE_URL = "https://legitimate-project.supabase.co"
        with pytest.raises(HTTPException) as exc_info:
            verify_jwt_token(bad_iss_token)
        assert exc_info.value.status_code == 401
    finally:
        settings.SUPABASE_URL = original_url


def test_wrong_audience_returns_401(auth_test_client: TestClient):
    """Test Case 3: Token with wrong audience returns 401 UNAUTHORIZED."""
    test_uuid = uuid4()
    wrong_aud_token = generate_mock_jwt(user_id=test_uuid, aud="anon")

    response = auth_test_client.get(
        "/test-auth/me", headers={"Authorization": f"Bearer {wrong_aud_token}"}
    )
    assert response.status_code == 401
    data = response.json()
    assert "audience" in data["detail"]["error"]["message"].lower()


def test_expired_token_returns_401(auth_test_client: TestClient):
    """Test Case 4: Expired token returns 401 UNAUTHORIZED."""
    test_uuid = uuid4()
    expired_token = generate_mock_jwt(user_id=test_uuid, exp_offset=-3600)

    response = auth_test_client.get(
        "/test-auth/me", headers={"Authorization": f"Bearer {expired_token}"}
    )
    assert response.status_code == 401
    data = response.json()
    assert "expired" in data["detail"]["error"]["message"].lower()


def test_missing_sub_returns_401(auth_test_client: TestClient):
    """Test Case 5: Token missing required 'sub' claim returns 401 UNAUTHORIZED."""
    missing_sub_token = generate_mock_jwt(include_sub=False)

    response = auth_test_client.get(
        "/test-auth/me", headers={"Authorization": f"Bearer {missing_sub_token}"}
    )
    assert response.status_code == 401
    data = response.json()
    assert "sub" in data["detail"]["error"]["message"].lower()


def test_invalid_signature_returns_401(auth_test_client: TestClient):
    """Test Case 6: Invalid token signature returns 401 UNAUTHORIZED."""
    original_secret = settings.SUPABASE_JWT_SECRET
    try:
        settings.SUPABASE_JWT_SECRET = "real_secret_key_for_testing_32_bytes_long!!"
        tampered_token = generate_mock_jwt(
            user_id=uuid4(), secret="wrong_secret_key_for_testing_32_bytes_long!!"
        )

        response = auth_test_client.get(
            "/test-auth/me", headers={"Authorization": f"Bearer {tampered_token}"}
        )
        assert response.status_code == 401
    finally:
        settings.SUPABASE_JWT_SECRET = original_secret


def test_unsupported_algorithm_returns_401(auth_test_client: TestClient):
    """Test Case 7: Token using unsupported algorithm (none/RS256) returns 401 UNAUTHORIZED."""
    token_none = jwt.encode(
        {"sub": str(uuid4()), "aud": "authenticated", "exp": 9999999999},
        "",
        algorithm="none",
    )
    response = auth_test_client.get(
        "/test-auth/me", headers={"Authorization": f"Bearer {token_none}"}
    )
    assert response.status_code == 401
    data = response.json()
    assert "unsupported" in data["detail"]["error"]["message"].lower()


def test_client_supplied_user_id_cannot_override_jwt_sub(auth_test_client: TestClient):
    """Test Case 8: Client-supplied user_id parameter cannot override JWT sub identity."""
    authenticated_uuid = uuid4()
    attacker_supplied_uuid = str(uuid4())
    valid_token = generate_mock_jwt(user_id=authenticated_uuid)

    response = auth_test_client.get(
        f"/test-auth/user-id?client_supplied_user_id={attacker_supplied_uuid}",
        headers={"Authorization": f"Bearer {valid_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["authenticated_user_id"] == str(authenticated_uuid)
    assert data["authenticated_user_id"] != attacker_supplied_uuid


# --- Gate 2.10: GET /api/v1/auth/me Endpoint Tests ---


def test_get_auth_me_valid_jwt_returns_user_identity(client: TestClient):
    """Test 9: GET /api/v1/auth/me returns 200 OK with authenticated user identity."""
    user_uuid = uuid4()
    valid_token = generate_mock_jwt(user_id=user_uuid)

    response = client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {valid_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == str(user_uuid)
    assert data["email"] == "student@example.com"
    assert data["role"] == "authenticated"


def test_get_auth_me_missing_header_returns_401(client: TestClient):
    """Test 10: GET /api/v1/auth/me without Authorization header returns 401 UNAUTHORIZED."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    data = response.json()
    assert data["detail"]["error"]["code"] == "UNAUTHORIZED"


def test_get_auth_me_invalid_token_returns_401(client: TestClient):
    """Test 11: GET /api/v1/auth/me with invalid JWT returns 401 UNAUTHORIZED."""
    response = client.get(
        "/api/v1/auth/me", headers={"Authorization": "Bearer invalid.token.value"}
    )
    assert response.status_code == 401
    data = response.json()
    assert data["detail"]["error"]["code"] == "UNAUTHORIZED"


def test_get_auth_me_ignores_client_query_override_attempts(client: TestClient):
    """Test 12: GET /api/v1/auth/me ignores client query parameters attempting identity override."""
    authenticated_uuid = uuid4()
    attacker_uuid = uuid4()
    valid_token = generate_mock_jwt(user_id=authenticated_uuid)

    response = client.get(
        f"/api/v1/auth/me?user_id={attacker_uuid}&email=hacker@evil.com",
        headers={"Authorization": f"Bearer {valid_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == str(authenticated_uuid)
    assert data["user_id"] != str(attacker_uuid)
    assert data["email"] == "student@example.com"
