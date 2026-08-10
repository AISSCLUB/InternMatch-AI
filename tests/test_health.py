"""
Health Endpoint Tests
Verifies process liveness, endpoint response status, and JSON schema structure.
"""

from fastapi.testclient import TestClient


def test_root_health_endpoint(client: TestClient):
    """Test GET /health liveness check."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "environment" in data
    assert "timestamp" in data


def test_api_v1_health_endpoint(client: TestClient):
    """Test GET /api/v1/health operational endpoint."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
