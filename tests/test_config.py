"""
Configuration & Environment Validation Tests
Verifies default configuration loading and pinned AI model parameters.
"""

from app.core.config import settings


def test_pinned_ai_models_configuration():
    """Verify pinned AI models and dimensions in settings."""
    assert settings.LLM_MODEL_NAME == "gpt-4o-mini"
    assert settings.EMBEDDING_MODEL_NAME == "text-embedding-3-small"
    assert settings.EMBEDDING_DIMENSION == 1536
    assert settings.SKILL_FUZZY_THRESHOLD == 85


def test_cors_origins_parsing():
    """Verify CORS origins string is parsed into a list."""
    origins = settings.cors_origins_list
    assert isinstance(origins, list)
    assert len(origins) > 0
