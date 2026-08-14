"""
Unit Tests for Google Gemini Embedding Service Foundation.
Validates input sanitization, Gemini API client construction, parameter shape,
dimension validation, non-finite vector checking, and exception propagation.
All tests use monkeypatched Gemini client mocks with zero network requests.
"""

from unittest.mock import MagicMock

import pytest
from app.core.config import settings
from app.services.embeddings import generate_embedding


def make_mock_gemini_response(vector):
    """Helper creating a mock Gemini embed_content API response object."""
    item = MagicMock()
    item.values = vector
    response = MagicMock()
    response.embeddings = [item]
    return response


def test_generate_embedding_valid_text(monkeypatch):
    """Test 1: Valid text constructs Gemini client with API key and returns List[float]."""
    mock_client_instance = MagicMock()
    dummy_vector = [0.1] * settings.EMBEDDING_DIMENSION
    mock_client_instance.models.embed_content.return_value = (
        make_mock_gemini_response(dummy_vector)
    )

    constructed_keys = []

    def mock_genai_client(api_key):
        constructed_keys.append(api_key)
        return mock_client_instance

    monkeypatch.setattr("app.services.embeddings.genai.Client", mock_genai_client)
    monkeypatch.setattr(
        "app.core.config.settings.GEMINI_API_KEY", "gemini-valid-test-key"
    )

    text_input = "Python Developer with FastAPI experience"
    result = generate_embedding(text_input)

    assert constructed_keys == ["gemini-valid-test-key"]
    assert mock_client_instance.models.embed_content.call_count == 1

    call_kwargs = mock_client_instance.models.embed_content.call_args.kwargs
    assert call_kwargs["contents"] == text_input
    assert call_kwargs["model"] == settings.EMBEDDING_MODEL_NAME
    assert (
        call_kwargs["config"].output_dimensionality
        == settings.EMBEDDING_DIMENSION
    )

    assert isinstance(result, list)
    assert len(result) == settings.EMBEDDING_DIMENSION
    assert all(isinstance(x, float) for x in result)
    assert result == dummy_vector


def test_generate_embedding_preserves_original_whitespace(monkeypatch):
    """
    Test 2: Preserves original supplied text
    (including internal/outer whitespace) for provider.
    """
    mock_client_instance = MagicMock()
    dummy_vector = [0.05] * settings.EMBEDDING_DIMENSION
    mock_client_instance.models.embed_content.return_value = (
        make_mock_gemini_response(dummy_vector)
    )

    monkeypatch.setattr(
        "app.services.embeddings.genai.Client", lambda api_key: mock_client_instance
    )
    monkeypatch.setattr(
        "app.core.config.settings.GEMINI_API_KEY", "gemini-valid-test-key"
    )

    raw_text = "   Backend Engineer \n with  Docker   "
    generate_embedding(raw_text)

    call_kwargs = mock_client_instance.models.embed_content.call_args.kwargs
    assert call_kwargs["contents"] == raw_text


def test_generate_embedding_empty_string_raises_value_error(monkeypatch):
    """Test 3: Empty string raises ValueError before Gemini client construction."""
    constructed = []
    monkeypatch.setattr(
        "app.services.embeddings.genai.Client",
        lambda api_key: constructed.append(api_key),
    )

    with pytest.raises(ValueError, match="cannot be empty or whitespace-only"):
        generate_embedding("")

    assert constructed == []


def test_generate_embedding_whitespace_only_string_raises_value_error(monkeypatch):
    """Test 4: Whitespace-only string raises ValueError before Gemini client construction."""
    constructed = []
    monkeypatch.setattr(
        "app.services.embeddings.genai.Client",
        lambda api_key: constructed.append(api_key),
    )

    with pytest.raises(ValueError, match="cannot be empty or whitespace-only"):
        generate_embedding("   \t\n  ")

    assert constructed == []


def test_generate_embedding_non_string_input_raises_type_error(monkeypatch):
    """Test 5: Non-string input raises TypeError before Gemini client construction."""
    constructed = []
    monkeypatch.setattr(
        "app.services.embeddings.genai.Client",
        lambda api_key: constructed.append(api_key),
    )

    with pytest.raises(TypeError, match="text input must be a string"):
        generate_embedding(123)  # type: ignore

    with pytest.raises(TypeError, match="text input must be a string"):
        generate_embedding(None)  # type: ignore

    assert constructed == []


def test_generate_embedding_empty_response_data_raises_value_error(monkeypatch):
    """Test 6: Empty/missing response.embeddings raises ValueError."""
    mock_client_instance = MagicMock()
    empty_resp = MagicMock()
    empty_resp.embeddings = []
    mock_client_instance.models.embed_content.return_value = empty_resp

    monkeypatch.setattr(
        "app.services.embeddings.genai.Client", lambda api_key: mock_client_instance
    )
    monkeypatch.setattr(
        "app.core.config.settings.GEMINI_API_KEY", "gemini-valid-test-key"
    )

    with pytest.raises(ValueError, match="response returned empty embeddings"):
        generate_embedding("Software Engineer")


def test_generate_embedding_wrong_dimension_raises_value_error(monkeypatch):
    """Test 7: Returned embedding dimension mismatch raises ValueError."""
    mock_client_instance = MagicMock()
    short_vector = [0.1] * 10  # Wrong dimension (10 != 1536)
    mock_client_instance.models.embed_content.return_value = (
        make_mock_gemini_response(short_vector)
    )

    monkeypatch.setattr(
        "app.services.embeddings.genai.Client", lambda api_key: mock_client_instance
    )
    monkeypatch.setattr(
        "app.core.config.settings.GEMINI_API_KEY", "gemini-valid-test-key"
    )

    with pytest.raises(ValueError, match="Embedding dimension mismatch"):
        generate_embedding("Software Engineer")


def test_generate_embedding_nan_value_raises_value_error(monkeypatch):
    """Test 8: NaN element in embedding vector raises ValueError."""
    mock_client_instance = MagicMock()
    vector_with_nan = [0.1] * (settings.EMBEDDING_DIMENSION - 1) + [float("nan")]
    mock_client_instance.models.embed_content.return_value = (
        make_mock_gemini_response(vector_with_nan)
    )

    monkeypatch.setattr(
        "app.services.embeddings.genai.Client", lambda api_key: mock_client_instance
    )
    monkeypatch.setattr(
        "app.core.config.settings.GEMINI_API_KEY", "gemini-valid-test-key"
    )

    with pytest.raises(ValueError, match="non-finite float value"):
        generate_embedding("Software Engineer")


def test_generate_embedding_positive_infinity_raises_value_error(monkeypatch):
    """Test 9: Positive infinity element in embedding vector raises ValueError."""
    mock_client_instance = MagicMock()
    vector_with_inf = [0.1] * (settings.EMBEDDING_DIMENSION - 1) + [float("inf")]
    mock_client_instance.models.embed_content.return_value = (
        make_mock_gemini_response(vector_with_inf)
    )

    monkeypatch.setattr(
        "app.services.embeddings.genai.Client", lambda api_key: mock_client_instance
    )
    monkeypatch.setattr(
        "app.core.config.settings.GEMINI_API_KEY", "gemini-valid-test-key"
    )

    with pytest.raises(ValueError, match="non-finite float value"):
        generate_embedding("Software Engineer")


def test_generate_embedding_negative_infinity_raises_value_error(monkeypatch):
    """Test 10: Negative infinity element in embedding vector raises ValueError."""
    mock_client_instance = MagicMock()
    vector_with_neginf = [0.1] * (settings.EMBEDDING_DIMENSION - 1) + [float("-inf")]
    mock_client_instance.models.embed_content.return_value = (
        make_mock_gemini_response(vector_with_neginf)
    )

    monkeypatch.setattr(
        "app.services.embeddings.genai.Client", lambda api_key: mock_client_instance
    )
    monkeypatch.setattr(
        "app.core.config.settings.GEMINI_API_KEY", "gemini-valid-test-key"
    )

    with pytest.raises(ValueError, match="non-finite float value"):
        generate_embedding("Software Engineer")


def test_generate_embedding_non_numeric_item_raises_value_error(monkeypatch):
    """Test 11: Non-numeric element in embedding vector raises ValueError."""
    mock_client_instance = MagicMock()
    vector_with_str = [0.1] * (settings.EMBEDDING_DIMENSION - 1) + ["invalid_string"]
    mock_client_instance.models.embed_content.return_value = (
        make_mock_gemini_response(vector_with_str)
    )

    monkeypatch.setattr(
        "app.services.embeddings.genai.Client", lambda api_key: mock_client_instance
    )
    monkeypatch.setattr(
        "app.core.config.settings.GEMINI_API_KEY", "gemini-valid-test-key"
    )

    with pytest.raises(ValueError, match="non-numeric element"):
        generate_embedding("Software Engineer")


def test_generate_embedding_boolean_item_raises_value_error(monkeypatch):
    """Test 11b: Boolean element in embedding vector raises ValueError (bool is int subclass)."""
    mock_client_instance = MagicMock()
    vector_with_bool = [0.1] * (settings.EMBEDDING_DIMENSION - 1) + [True]
    mock_client_instance.models.embed_content.return_value = (
        make_mock_gemini_response(vector_with_bool)
    )

    monkeypatch.setattr(
        "app.services.embeddings.genai.Client", lambda api_key: mock_client_instance
    )
    monkeypatch.setattr(
        "app.core.config.settings.GEMINI_API_KEY", "gemini-valid-test-key"
    )

    with pytest.raises(ValueError, match="non-numeric element"):
        generate_embedding("Software Engineer")


def test_generate_embedding_empty_api_key_raises_value_error(monkeypatch):
    """Test 12: Empty or whitespace-only GEMINI_API_KEY raises configuration ValueError."""
    constructed = []
    monkeypatch.setattr(
        "app.services.embeddings.genai.Client",
        lambda api_key: constructed.append(api_key),
    )

    monkeypatch.setattr("app.core.config.settings.GEMINI_API_KEY", "")
    with pytest.raises(ValueError, match="GEMINI_API_KEY configuration is missing or empty"):
        generate_embedding("Software Engineer")

    monkeypatch.setattr("app.core.config.settings.GEMINI_API_KEY", "   \t  ")
    with pytest.raises(ValueError, match="GEMINI_API_KEY configuration is missing or empty"):
        generate_embedding("Software Engineer")

    assert constructed == []


def test_generate_embedding_provider_exception_propagates(monkeypatch):
    """Test 13: Gemini provider exceptions propagate unchanged."""
    mock_client_instance = MagicMock()
    mock_client_instance.models.embed_content.side_effect = RuntimeError(
        "Gemini API 500 Server Error"
    )

    monkeypatch.setattr(
        "app.services.embeddings.genai.Client", lambda api_key: mock_client_instance
    )
    monkeypatch.setattr(
        "app.core.config.settings.GEMINI_API_KEY", "gemini-valid-test-key"
    )

    with pytest.raises(RuntimeError, match="Gemini API 500 Server Error"):
        generate_embedding("Software Engineer")
