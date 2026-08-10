"""
Pytest Test Suite Configuration & Fixtures
Provides shared test fixtures, app TestClient, and test JWT environment configuration.
"""

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Ensure backend directory is in Python path for test execution
backend_dir = Path(__file__).parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.config import settings  # noqa: E402
from app.main import app  # noqa: E402

TEST_JWT_SECRET = "test_supabase_jwt_secret_32_bytes_long_minimum!!"
TEST_SUPABASE_URL = "https://legitimate-project.supabase.co"


@pytest.fixture(autouse=True)
def configure_test_jwt_settings():
    """Configure shared test JWT secret and Supabase URL for all test modules."""
    original_secret = settings.SUPABASE_JWT_SECRET
    original_url = settings.SUPABASE_URL

    settings.SUPABASE_JWT_SECRET = TEST_JWT_SECRET
    settings.SUPABASE_URL = TEST_SUPABASE_URL

    yield

    settings.SUPABASE_JWT_SECRET = original_secret
    settings.SUPABASE_URL = original_url


@pytest.fixture
def client() -> TestClient:
    """Fixture providing FastAPI TestClient instance."""
    return TestClient(app)
