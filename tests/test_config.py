"""
Configuration & Environment Validation Tests
Verifies default configuration loading and pinned AI model parameters.
"""

from app.core.config import Settings, settings


def test_pinned_ai_models_configuration():
    """Verify pinned AI model and matching defaults independent of local environment."""
    fields = Settings.model_fields

    assert fields["LLM_MODEL_NAME"].default == "gemini-3.5-flash"
    assert fields["EMBEDDING_MODEL_NAME"].default == "gemini-embedding-2"
    assert fields["EMBEDDING_DIMENSION"].default == 1536
    assert fields["SKILL_FUZZY_THRESHOLD"].default == 85


def test_cors_origins_parsing():
    """Verify CORS origins string is parsed into a list."""
    origins = settings.cors_origins_list
    assert isinstance(origins, list)
    assert len(origins) > 0
