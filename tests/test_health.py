"""
Health & Operational Readiness Endpoint Tests
Verifies process liveness (GET /health) and component readiness (GET /api/v1/health).
Uses mocks/monkeypatching for Redis and RQ worker discovery without external network dependencies.
"""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from rq import Queue
from sqlalchemy.orm import Session


def test_root_liveness_endpoint(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
):
    """
    Test A: Root /health process liveness check.
    Returns HTTP 200 with metadata without performing DB, Redis, or RQ operations.
    Proves dependency independence by ensuring Redis, Worker, and DB methods raise
    if invoked, yet GET /health succeeds cleanly.
    """

    def raise_redis(*args, **kwargs):
        raise AssertionError("Liveness check must not call Redis.from_url")

    def raise_worker(*args, **kwargs):
        raise AssertionError("Liveness check must not call Worker.count")

    def raise_db(*args, **kwargs):
        raise AssertionError("Liveness check must not call Session.execute")

    monkeypatch.setattr(
        "app.api.v1.endpoints.health.Redis.from_url", raise_redis
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.health.Worker.count", raise_worker
    )
    monkeypatch.setattr(Session, "execute", raise_db)

    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "environment" in data
    assert "timestamp" in data
    # Ensure readiness-specific component keys are not present in liveness
    assert "database" not in data
    assert "redis" not in data
    assert "worker" not in data


@patch("app.api.v1.endpoints.health.Worker.count", return_value=1)
@patch("app.api.v1.endpoints.health.Redis.from_url")
def test_readiness_all_components_healthy(
    mock_redis_from_url: MagicMock,
    mock_worker_count: MagicMock,
    client: TestClient,
):
    """
    Test B: GET /api/v1/health when DB, Redis, and RQ workers are healthy.
    Returns HTTP 200 with status=healthy and all components connected/ready.
    Proves Redis connection is closed after probes.
    """
    mock_redis_conn = MagicMock()
    mock_redis_conn.ping.return_value = True
    mock_redis_from_url.return_value = mock_redis_conn

    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert data["redis"] == "connected"
    assert data["worker"] == "ready"
    assert "version" in data
    assert "environment" in data
    assert "timestamp" in data

    # Verify Redis client was closed
    mock_redis_conn.close.assert_called_once()


@patch("app.api.v1.endpoints.health.Worker.count", return_value=1)
@patch("app.api.v1.endpoints.health.Redis.from_url")
def test_readiness_database_failure(
    mock_redis_from_url: MagicMock,
    mock_worker_count: MagicMock,
    client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
):
    """
    Test C: GET /api/v1/health when database probe fails.
    Returns HTTP 503 with database=unavailable while preserving structured JSON
    and keeping driver error text absent from the body.
    """
    secret_db_error = (
        "FATAL: password authentication failed for user 'internmatch_db_user'"
    )

    def failing_execute(self, *args, **kwargs):
        raise RuntimeError(secret_db_error)

    monkeypatch.setattr(Session, "execute", failing_execute)

    mock_redis_conn = MagicMock()
    mock_redis_conn.ping.return_value = True
    mock_redis_from_url.return_value = mock_redis_conn

    response = client.get("/api/v1/health")
    assert response.status_code == 503
    data = response.json()
    assert data["status"] == "unhealthy"
    assert data["database"] == "unavailable"
    assert data["redis"] == "connected"
    assert data["worker"] == "ready"

    # Ensure internal DB exception text is not leaked
    assert secret_db_error not in response.text
    assert "internmatch_db_user" not in response.text

    # Verify Redis client was closed
    mock_redis_conn.close.assert_called_once()


@patch("app.api.v1.endpoints.health.Redis.from_url")
def test_readiness_redis_failure_and_secret_masking(
    mock_redis_from_url: MagicMock,
    client: TestClient,
):
    """
    Test D: GET /api/v1/health when Redis ping fails with an exception containing secrets.
    Returns HTTP 503 with redis=unavailable and worker=unavailable without leaking credentials.
    """
    mock_redis_conn = MagicMock()
    secret_redis_url = (
        "redis://:super_secret_redis_pw@redis.internal.prod:6379/0"
    )
    mock_redis_conn.ping.side_effect = RuntimeError(
        f"Connection refused to {secret_redis_url}"
    )
    mock_redis_from_url.return_value = mock_redis_conn

    response = client.get("/api/v1/health")
    assert response.status_code == 503
    data = response.json()
    assert data["status"] == "unhealthy"
    assert data["database"] == "connected"
    assert data["redis"] == "unavailable"
    assert data["worker"] == "unavailable"

    # Ensure Redis secret string is absent from response body
    assert "super_secret_redis_pw" not in response.text
    assert "redis.internal.prod" not in response.text

    # Verify Redis client was closed even after ping failure
    mock_redis_conn.close.assert_called_once()


@patch("app.api.v1.endpoints.health.Worker.count", return_value=0)
@patch("app.api.v1.endpoints.health.Redis.from_url")
def test_readiness_no_rq_workers(
    mock_redis_from_url: MagicMock,
    mock_worker_count: MagicMock,
    client: TestClient,
):
    """
    Test E: GET /api/v1/health when no RQ workers are registered for the queue.
    Returns HTTP 503 with worker=unavailable.
    """
    mock_redis_conn = MagicMock()
    mock_redis_conn.ping.return_value = True
    mock_redis_from_url.return_value = mock_redis_conn

    response = client.get("/api/v1/health")
    assert response.status_code == 503
    data = response.json()
    assert data["status"] == "unhealthy"
    assert data["database"] == "connected"
    assert data["redis"] == "connected"
    assert data["worker"] == "unavailable"

    mock_redis_conn.close.assert_called_once()


@patch("app.api.v1.endpoints.health.Worker.count")
@patch("app.api.v1.endpoints.health.Redis.from_url")
def test_readiness_rq_discovery_failure(
    mock_redis_from_url: MagicMock,
    mock_worker_count: MagicMock,
    client: TestClient,
):
    """
    Test F: GET /api/v1/health when Worker.count raises an internal discovery error.
    Returns HTTP 503 with worker=unavailable and no exception details leaked.
    """
    secret_rq_msg = (
        "RQ discovery failed on worker cluster token rq-token-xyz987"
    )
    mock_worker_count.side_effect = RuntimeError(secret_rq_msg)

    mock_redis_conn = MagicMock()
    mock_redis_conn.ping.return_value = True
    mock_redis_from_url.return_value = mock_redis_conn

    response = client.get("/api/v1/health")
    assert response.status_code == 503
    data = response.json()
    assert data["status"] == "unhealthy"
    assert data["database"] == "connected"
    assert data["redis"] == "connected"
    assert data["worker"] == "unavailable"

    assert secret_rq_msg not in response.text
    assert "rq-token-xyz987" not in response.text

    mock_redis_conn.close.assert_called_once()


@patch("app.api.v1.endpoints.health.Queue.enqueue")
@patch("app.api.v1.endpoints.health.Worker.count", return_value=2)
@patch("app.api.v1.endpoints.health.Redis.from_url")
def test_readiness_default_queue_usage_and_no_jobs_enqueued(
    mock_redis_from_url: MagicMock,
    mock_worker_count: MagicMock,
    mock_queue_enqueue: MagicMock,
    client: TestClient,
):
    """
    Test G: Proves Worker.count is called against the Queue bound to the Redis client
    and explicitly verifies zero probe jobs are enqueued via Queue.enqueue.
    """
    mock_redis_conn = MagicMock()
    mock_redis_conn.ping.return_value = True
    mock_redis_from_url.return_value = mock_redis_conn

    response = client.get("/api/v1/health")
    assert response.status_code == 200

    # Verify Worker.count was called with a Queue
    mock_worker_count.assert_called_once()
    called_queue = mock_worker_count.call_args[1].get("queue")
    assert isinstance(called_queue, Queue)
    assert called_queue.connection == mock_redis_conn
    assert called_queue.name == "default"

    # Explicitly assert Queue.enqueue was NEVER called
    mock_queue_enqueue.assert_not_called()

    mock_redis_conn.close.assert_called_once()
