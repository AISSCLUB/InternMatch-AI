"""
Unit Tests for Content Translation Service Layer
Validates content hashing, Redis cache operations, stampede locking,
provider failure cooldown, and Gemini structured output handling.
"""

from typing import Dict, Optional
from unittest.mock import MagicMock
from uuid import uuid4

import redis
from app.services.content_translation import (
    CACHE_TTL_SECONDS,
    CACHE_VERSION,
    FAILURE_SENTINEL_TTL_SECONDS,
    LOCK_TTL_SECONDS,
    TranslatedInternshipContent,
    compute_internship_content_hash,
    translate_internship_content,
)


class FakeRedisClient:
    """In-memory Redis fake for unit testing without external dependencies."""

    def __init__(self, should_fail: bool = False):
        self.store: Dict[str, str] = {}
        self.ttls: Dict[str, int] = {}
        self.should_fail = should_fail
        self.set_calls = []
        self.delete_calls = []

    def get(self, key: str) -> Optional[str]:
        if self.should_fail:
            raise redis.ConnectionError("Simulated Redis connection failure")
        return self.store.get(key)

    def set(
        self,
        key: str,
        value: str,
        ex: Optional[int] = None,
        nx: bool = False,
    ) -> bool:
        if self.should_fail:
            raise redis.ConnectionError("Simulated Redis connection failure")
        self.set_calls.append({"key": key, "value": value, "ex": ex, "nx": nx})
        if nx and key in self.store:
            return False
        self.store[key] = str(value)
        if ex:
            self.ttls[key] = ex
        return True

    def delete(self, *keys: str) -> int:
        if self.should_fail:
            raise redis.ConnectionError("Simulated Redis connection failure")
        deleted = 0
        for k in keys:
            self.delete_calls.append(k)
            if k in self.store:
                del self.store[k]
                deleted += 1
        return deleted


def test_compute_internship_content_hash_deterministic():
    """Verify same translatable fields produce identical SHA-256 hash."""
    desc = "Build backend services in Python."
    edu = "B.S. in Computer Science"

    h1 = compute_internship_content_hash(desc, edu)
    h2 = compute_internship_content_hash(desc, edu)
    h3 = compute_internship_content_hash("  " + desc + "  ", " " + edu + " ")

    assert len(h1) == 64
    assert h1 == h2
    assert h1 == h3


def test_compute_internship_content_hash_different_content():
    """Verify modifying translatable source changes the resulting hash."""
    base_hash = compute_internship_content_hash("Description A", "Education A")
    diff_desc_hash = compute_internship_content_hash("Description B", "Education A")
    diff_edu_hash = compute_internship_content_hash("Description A", "Education B")

    assert base_hash != diff_desc_hash
    assert base_hash != diff_edu_hash


def test_translate_internship_content_locale_en_bypasses_all(monkeypatch):
    """Verify target_locale='en' returns canonical content without Redis or Gemini."""
    redis_mock = MagicMock()
    gemini_mock = MagicMock()
    monkeypatch.setattr("app.services.content_translation._get_redis_client", redis_mock)
    monkeypatch.setattr("app.services.content_translation._call_gemini_translation", gemini_mock)

    internship_id = uuid4()
    desc, edu = translate_internship_content(
        internship_id=internship_id,
        description="Canonical Description",
        min_education="Canonical Education",
        target_locale="en",
    )

    assert desc == "Canonical Description"
    assert edu == "Canonical Education"
    redis_mock.assert_not_called()
    gemini_mock.assert_not_called()


def test_translate_internship_content_empty_source_bypasses_all(monkeypatch):
    """Verify empty/blank translatable source returns canonical without Redis or Gemini."""
    redis_mock = MagicMock()
    gemini_mock = MagicMock()
    monkeypatch.setattr("app.services.content_translation._get_redis_client", redis_mock)
    monkeypatch.setattr("app.services.content_translation._call_gemini_translation", gemini_mock)

    internship_id = uuid4()
    desc, edu = translate_internship_content(
        internship_id=internship_id,
        description="   ",
        min_education=None,
        target_locale="tr",
    )

    assert desc == "   "
    assert edu is None
    redis_mock.assert_not_called()
    gemini_mock.assert_not_called()


def test_translate_internship_content_cache_hit_avoids_gemini(monkeypatch):
    """Verify existing valid cache entry returns translated content without calling Gemini."""
    internship_id = uuid4()
    desc = "Build backend services."
    edu = "Computer Science"
    source_hash = compute_internship_content_hash(desc, edu)
    cache_key = f"internmatch:i18n:internship:{CACHE_VERSION}:{internship_id}:tr:{source_hash}"

    fake_redis = FakeRedisClient()
    cached_payload = TranslatedInternshipContent(
        description="Backend servisleri gelistirin.",
        min_education="Bilgisayar Bilimleri",
    ).model_dump_json()
    fake_redis.store[cache_key] = cached_payload

    gemini_mock = MagicMock()
    monkeypatch.setattr("app.services.content_translation._get_redis_client", lambda: fake_redis)
    monkeypatch.setattr("app.services.content_translation._call_gemini_translation", gemini_mock)

    res_desc, res_edu = translate_internship_content(
        internship_id=internship_id,
        description=desc,
        min_education=edu,
        target_locale="tr",
    )

    assert res_desc == "Backend servisleri gelistirin."
    assert res_edu == "Bilgisayar Bilimleri"
    gemini_mock.assert_not_called()


def test_translate_internship_content_cache_miss_calls_gemini_and_caches(monkeypatch):
    """Verify cache miss translates once, caches the result, and keeps a TTL lock."""
    internship_id = uuid4()
    desc = "Build backend services."
    edu = "Computer Science"
    source_hash = compute_internship_content_hash(desc, edu)
    cache_key = f"internmatch:i18n:internship:{CACHE_VERSION}:{internship_id}:tr:{source_hash}"
    lock_key = f"internmatch:i18n:internship:{CACHE_VERSION}:lock:{internship_id}:tr:{source_hash}"

    fake_redis = FakeRedisClient()
    monkeypatch.setattr("app.services.content_translation._get_redis_client", lambda: fake_redis)

    gemini_return = TranslatedInternshipContent(
        description="Backend servisleri gelistirin.",
        min_education="Bilgisayar Bilimleri",
    )
    monkeypatch.setattr(
        "app.services.content_translation._call_gemini_translation",
        lambda *args, **kwargs: gemini_return,
    )

    res_desc, res_edu = translate_internship_content(
        internship_id=internship_id,
        description=desc,
        min_education=edu,
        target_locale="tr",
    )

    assert res_desc == "Backend servisleri gelistirin."
    assert res_edu == "Bilgisayar Bilimleri"

    # Verify cached in Redis
    assert cache_key in fake_redis.store
    assert fake_redis.ttls[cache_key] == CACHE_TTL_SECONDS

    # Lock expires naturally; never blindly delete a possibly re-acquired lock.
    assert lock_key in fake_redis.store
    assert fake_redis.ttls[lock_key] == LOCK_TTL_SECONDS
    assert lock_key not in fake_redis.delete_calls


def test_translate_internship_content_redis_unavailable_returns_canonical_zero_gemini(monkeypatch):
    """
    CRITICAL COST SAFETY: When Redis is unavailable, return canonical content
    and DO NOT invoke Gemini on public requests.
    """
    internship_id = uuid4()
    fake_failing_redis = FakeRedisClient(should_fail=True)
    monkeypatch.setattr(
        "app.services.content_translation._get_redis_client", lambda: fake_failing_redis
    )

    gemini_mock = MagicMock()
    monkeypatch.setattr("app.services.content_translation._call_gemini_translation", gemini_mock)

    res_desc, res_edu = translate_internship_content(
        internship_id=internship_id,
        description="Original Canonical Description",
        min_education="Original Education",
        target_locale="tr",
    )

    assert res_desc == "Original Canonical Description"
    assert res_edu == "Original Education"
    gemini_mock.assert_not_called()


def test_translate_internship_content_gemini_failure_sets_sentinel_and_returns_canonical(
    monkeypatch,
):
    """Verify Gemini failure sets cooldown and returns canonical content."""
    internship_id = uuid4()
    desc = "Build backend services."
    edu = "Computer Science"
    source_hash = compute_internship_content_hash(desc, edu)
    failure_sentinel_key = (
        f"internmatch:i18n:internship:{CACHE_VERSION}:failure:{internship_id}:tr:{source_hash}"
    )

    fake_redis = FakeRedisClient()
    monkeypatch.setattr("app.services.content_translation._get_redis_client", lambda: fake_redis)

    # Gemini returns None (failure)
    monkeypatch.setattr(
        "app.services.content_translation._call_gemini_translation",
        lambda *args, **kwargs: None,
    )

    res_desc, res_edu = translate_internship_content(
        internship_id=internship_id,
        description=desc,
        min_education=edu,
        target_locale="tr",
    )

    assert res_desc == desc
    assert res_edu == edu
    assert failure_sentinel_key in fake_redis.store
    assert fake_redis.ttls[failure_sentinel_key] == FAILURE_SENTINEL_TTL_SECONDS


def test_translate_internship_content_failure_sentinel_prevents_gemini_retry(monkeypatch):
    """Verify active failure sentinel skips Gemini calls during cooldown window."""
    internship_id = uuid4()
    desc = "Build backend services."
    edu = "Computer Science"
    source_hash = compute_internship_content_hash(desc, edu)
    failure_sentinel_key = (
        f"internmatch:i18n:internship:{CACHE_VERSION}:failure:{internship_id}:tr:{source_hash}"
    )

    fake_redis = FakeRedisClient()
    fake_redis.store[failure_sentinel_key] = "1"
    monkeypatch.setattr("app.services.content_translation._get_redis_client", lambda: fake_redis)

    gemini_mock = MagicMock()
    monkeypatch.setattr("app.services.content_translation._call_gemini_translation", gemini_mock)

    res_desc, res_edu = translate_internship_content(
        internship_id=internship_id,
        description=desc,
        min_education=edu,
        target_locale="tr",
    )

    assert res_desc == desc
    assert res_edu == edu
    gemini_mock.assert_not_called()


def test_translate_internship_content_stampede_lock_loser_does_not_call_gemini(monkeypatch):
    """Verify a lock loser returns canonical content without calling Gemini."""
    internship_id = uuid4()
    desc = "Build backend services."
    edu = "Computer Science"
    source_hash = compute_internship_content_hash(desc, edu)
    lock_key = f"internmatch:i18n:internship:{CACHE_VERSION}:lock:{internship_id}:tr:{source_hash}"

    fake_redis = FakeRedisClient()
    fake_redis.store[lock_key] = "1"  # Lock is already held by another request
    monkeypatch.setattr("app.services.content_translation._get_redis_client", lambda: fake_redis)

    gemini_mock = MagicMock()
    monkeypatch.setattr("app.services.content_translation._call_gemini_translation", gemini_mock)

    res_desc, res_edu = translate_internship_content(
        internship_id=internship_id,
        description=desc,
        min_education=edu,
        target_locale="tr",
    )

    assert res_desc == desc
    assert res_edu == edu
    gemini_mock.assert_not_called()


def test_translate_internship_content_corrupted_cache_recovers_cleanly(monkeypatch):
    """Verify corrupted JSON in Redis is safely deleted and recovered cleanly."""
    internship_id = uuid4()
    desc = "Build backend services."
    edu = "Computer Science"
    source_hash = compute_internship_content_hash(desc, edu)
    cache_key = f"internmatch:i18n:internship:{CACHE_VERSION}:{internship_id}:tr:{source_hash}"

    fake_redis = FakeRedisClient()
    fake_redis.store[cache_key] = "NOT_A_VALID_JSON_STRING {{"
    monkeypatch.setattr("app.services.content_translation._get_redis_client", lambda: fake_redis)

    gemini_return = TranslatedInternshipContent(
        description="Backend servisleri gelistirin.",
        min_education="Bilgisayar Bilimleri",
    )
    monkeypatch.setattr(
        "app.services.content_translation._call_gemini_translation",
        lambda *args, **kwargs: gemini_return,
    )

    res_desc, res_edu = translate_internship_content(
        internship_id=internship_id,
        description=desc,
        min_education=edu,
        target_locale="tr",
    )

    assert res_desc == "Backend servisleri gelistirin."
    assert res_edu == "Bilgisayar Bilimleri"
    assert fake_redis.store[cache_key] == gemini_return.model_dump_json()
