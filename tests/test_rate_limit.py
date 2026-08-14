"""
Unit Tests for Redis-backed Abuse Protection & Rate Limiting Boundary.
Verifies production enforcement, non-production no-op, atomic Lua EVAL execution,
per-user & per-scope counter isolation, 429 Retry-After responses, and fail-closed
503 error shielding.
Uses in-memory fake/mock Redis and zero real network calls.
"""

from uuid import uuid4

import pytest
from app.core.config import settings
from app.core.rate_limit import (
    _RATE_LIMIT_LUA,
    RATE_LIMIT_POLICIES,
    enforce_rate_limit,
)
from fastapi import HTTPException


class FakeRedis:
    """In-memory Redis emulator implementing atomic Lua rate-limiting eval semantics."""

    def __init__(self):
        self.store = {}
        self.ttls = {}
        self.eval_calls = []

    def eval(self, script, numkeys, key, expire_seconds):
        self.eval_calls.append(
            {"script": script, "numkeys": numkeys, "key": key, "expire": expire_seconds}
        )
        current = self.store.get(key, 0) + 1
        self.store[key] = current
        if current == 1:
            self.ttls[key] = int(expire_seconds)
        ttl = self.ttls.get(key, int(expire_seconds))
        return [current, ttl]


@pytest.fixture
def fake_redis():
    return FakeRedis()


def test_non_production_environment_is_noop(monkeypatch, fake_redis):
    """Test 1: When ENVIRONMENT is development/test, rate limiting is a complete no-op."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    calls = []
    monkeypatch.setattr(
        "app.core.rate_limit._get_redis_client",
        lambda: calls.append(1) or fake_redis,
    )

    user_id = uuid4()
    # Call 100 times, well beyond any policy limit
    for _ in range(100):
        enforce_rate_limit(user_id=user_id, scope="cv_upload")

    assert calls == []
    assert fake_redis.eval_calls == []


def test_non_production_creates_no_redis_client(monkeypatch):
    """Test 2: Non-production execution never attempts connection or Redis creation."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "test")
    client_calls = []
    monkeypatch.setattr(
        "redis.Redis.from_url",
        lambda *args, **kwargs: client_calls.append(1),
    )

    user_id = uuid4()
    enforce_rate_limit(user_id=user_id, scope="match_calculate")
    assert client_calls == []


def test_production_first_request_succeeds(monkeypatch, fake_redis):
    """Test 3: First request under production environment succeeds."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(
        "app.core.rate_limit._get_redis_client",
        lambda: fake_redis,
    )

    user_id = uuid4()
    enforce_rate_limit(user_id=user_id, scope="cv_upload")
    assert len(fake_redis.eval_calls) == 1


def test_production_requests_through_exact_limit_succeed(monkeypatch, fake_redis):
    """Test 4: All requests up to exact policy limit succeed without error."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(
        "app.core.rate_limit._get_redis_client",
        lambda: fake_redis,
    )

    user_id = uuid4()
    limit = RATE_LIMIT_POLICIES["cv_upload"]["limit"]  # 5

    for _ in range(limit):
        enforce_rate_limit(user_id=user_id, scope="cv_upload")

    assert len(fake_redis.eval_calls) == limit


def test_production_limit_plus_one_raises_429(monkeypatch, fake_redis):
    """Test 5: Request exceeding limit (limit + 1) raises HTTP 429 Too Many Requests."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(
        "app.core.rate_limit._get_redis_client",
        lambda: fake_redis,
    )

    user_id = uuid4()
    limit = RATE_LIMIT_POLICIES["cv_upload"]["limit"]  # 5

    for _ in range(limit):
        enforce_rate_limit(user_id=user_id, scope="cv_upload")

    with pytest.raises(HTTPException) as exc_info:
        enforce_rate_limit(user_id=user_id, scope="cv_upload")

    assert exc_info.value.status_code == 429


def test_retry_after_header_present_and_valid(monkeypatch, fake_redis):
    """
    Tests 6, 7, 8: 429 includes Retry-After header, RATE_LIMITED code,
    retry_after_seconds >= 1.
    """
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(
        "app.core.rate_limit._get_redis_client",
        lambda: fake_redis,
    )

    user_id = uuid4()
    limit = RATE_LIMIT_POLICIES["match_calculate"]["limit"]  # 10

    for _ in range(limit):
        enforce_rate_limit(user_id=user_id, scope="match_calculate")

    with pytest.raises(HTTPException) as exc_info:
        enforce_rate_limit(user_id=user_id, scope="match_calculate")

    exc = exc_info.value
    assert exc.status_code == 429
    assert "Retry-After" in exc.headers
    retry_after = int(exc.headers["Retry-After"])
    assert retry_after >= 1

    detail = exc.detail
    assert detail["error"]["code"] == "RATE_LIMITED"
    assert "Too many requests" in detail["error"]["message"]
    assert detail["error"]["details"]["retry_after_seconds"] == retry_after
    assert "timestamp" in detail["error"]


def test_separate_users_have_independent_counters(monkeypatch, fake_redis):
    """Test 9: Counter for User A does not affect counter or limits for User B."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(
        "app.core.rate_limit._get_redis_client",
        lambda: fake_redis,
    )

    user_a = uuid4()
    user_b = uuid4()
    limit = RATE_LIMIT_POLICIES["cv_upload"]["limit"]  # 5

    # User A reaches limit
    for _ in range(limit):
        enforce_rate_limit(user_id=user_a, scope="cv_upload")

    # User A is now rate-limited
    with pytest.raises(HTTPException):
        enforce_rate_limit(user_id=user_a, scope="cv_upload")

    # User B can still make requests successfully
    for _ in range(limit):
        enforce_rate_limit(user_id=user_b, scope="cv_upload")


def test_separate_scopes_have_independent_counters(monkeypatch, fake_redis):
    """Test 10: Same user has independent counters across distinct scopes."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(
        "app.core.rate_limit._get_redis_client",
        lambda: fake_redis,
    )

    user_id = uuid4()
    cv_limit = RATE_LIMIT_POLICIES["cv_upload"]["limit"]  # 5

    # Exhaust cv_upload scope
    for _ in range(cv_limit):
        enforce_rate_limit(user_id=user_id, scope="cv_upload")

    with pytest.raises(HTTPException):
        enforce_rate_limit(user_id=user_id, scope="cv_upload")

    # match_calculate scope for same user is still unconsumed
    enforce_rate_limit(user_id=user_id, scope="match_calculate")


def test_redis_key_structure_and_no_credential_leakage(monkeypatch, fake_redis):
    """
    Tests 11, 12: Redis key format is internmatch:rate-limit:{scope}:{user_id}
    with no sensitive data.
    """
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(
        "app.core.rate_limit._get_redis_client",
        lambda: fake_redis,
    )

    user_id = uuid4()
    enforce_rate_limit(user_id=user_id, scope="application_generate")

    call = fake_redis.eval_calls[0]
    key = call["key"]
    assert key == f"internmatch:rate-limit:application_generate:{user_id}"
    assert "Bearer" not in key
    assert "jwt" not in key.lower()
    assert "@" not in key


def test_redis_failure_fails_closed_with_503_and_zero_leakage(monkeypatch):
    """
    Tests 13, 14, 15: Redis connection/Lua failure in production raises 503
    with zero secret leakage.
    """
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")

    sensitive_pass = "REDIS_SUPER_SECRET_AUTH_KEY_999"
    sensitive_url = f"redis://default:{sensitive_pass}@redis.internal.net:6379/0"

    class FailingRedis:
        def eval(self, *args, **kwargs):
            raise ConnectionError(f"Connection timeout to {sensitive_url}")

    monkeypatch.setattr(
        "app.core.rate_limit._get_redis_client",
        lambda: FailingRedis(),
    )

    user_id = uuid4()
    with pytest.raises(HTTPException) as exc_info:
        enforce_rate_limit(user_id=user_id, scope="match_explanation")

    exc = exc_info.value
    assert exc.status_code == 503
    detail = exc.detail
    assert detail["error"]["code"] == "SERVICE_UNAVAILABLE"
    assert (
        detail["error"]["message"]
        == "Request protection service is temporarily unavailable."
    )
    # Ensure zero leakage of Redis password, URL, or internal error text
    detail_str = str(detail)
    assert sensitive_pass not in detail_str
    assert "redis.internal.net" not in detail_str
    assert "Connection timeout" not in detail_str


def test_atomic_eval_script_execution(monkeypatch, fake_redis):
    """Test 16: Increment and TTL operations execute through atomic Lua EVAL script."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(
        "app.core.rate_limit._get_redis_client",
        lambda: fake_redis,
    )

    user_id = uuid4()
    enforce_rate_limit(user_id=user_id, scope="match_calculate")

    call = fake_redis.eval_calls[0]
    assert call["script"] == _RATE_LIMIT_LUA
    assert call["numkeys"] == 1
    assert call["key"] == f"internmatch:rate-limit:match_calculate:{user_id}"
    assert call["expire"] == 600
