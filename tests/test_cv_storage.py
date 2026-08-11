"""
Unit Tests for Secure CV Intake & Supabase Storage Service Foundation.
Validates MIME type enforcement, filename extension agreement, size limit boundaries,
server-side object key generation, Supabase credential checking, and exception propagation.
All tests use monkeypatched Supabase client mocks with zero real network calls.
"""

from unittest.mock import MagicMock
from uuid import UUID, uuid4

import pytest
from app.services.cv_storage import (
    MAX_CV_SIZE_BYTES,
    CVStorageValidationError,
    CVStoredObject,
    store_candidate_cv,
)


@pytest.fixture(autouse=True)
def valid_supabase_settings(monkeypatch):
    """Provide non-placeholder Supabase settings for tests by default."""
    monkeypatch.setattr(
        "app.core.config.settings.SUPABASE_URL", "https://valid-project.supabase.co"
    )
    monkeypatch.setattr(
        "app.core.config.settings.SUPABASE_SERVICE_ROLE_KEY", "valid_service_role_key_secret_123"
    )
    monkeypatch.setattr("app.core.config.settings.CV_STORAGE_BUCKET", "cvs")


def make_mock_supabase_client():
    """Create a mock Supabase client with chainable storage.from_().upload() methods."""
    mock_storage_bucket = MagicMock()
    mock_storage_bucket.upload.return_value = {"path": "uploaded/file.pdf"}

    mock_storage = MagicMock()
    mock_storage.from_.return_value = mock_storage_bucket

    mock_client = MagicMock()
    mock_client.storage = mock_storage
    return mock_client, mock_storage_bucket


def test_store_candidate_cv_valid_pdf_upload(monkeypatch):
    """Test 1: Valid PDF upload calls Supabase client with correct bucket and file_options."""
    mock_client, mock_bucket = make_mock_supabase_client()
    monkeypatch.setattr("app.services.cv_storage.create_client", lambda url, key: mock_client)

    user_id = uuid4()
    pdf_bytes = b"%PDF-1.4 test pdf content"
    res = store_candidate_cv(
        user_id=user_id,
        filename="my_resume.pdf",
        content_type="application/pdf",
        content=pdf_bytes,
    )

    assert isinstance(res, CVStoredObject)
    assert res.content_type == "application/pdf"
    assert res.size_bytes == len(pdf_bytes)
    assert res.storage_path.startswith(f"{user_id}/")
    assert res.storage_path.endswith(".pdf")

    mock_client.storage.from_.assert_called_once_with("cvs")
    mock_bucket.upload.assert_called_once_with(
        path=res.storage_path,
        file=pdf_bytes,
        file_options={"content-type": "application/pdf"},
    )


def test_store_candidate_cv_valid_docx_upload(monkeypatch):
    """Test 2: Valid DOCX upload calls Supabase client with correct MIME type."""
    mock_client, mock_bucket = make_mock_supabase_client()
    monkeypatch.setattr("app.services.cv_storage.create_client", lambda url, key: mock_client)

    user_id = uuid4()
    docx_bytes = b"PK\x03\x04 docx content"
    docx_mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    res = store_candidate_cv(
        user_id=user_id,
        filename="resume.docx",
        content_type=docx_mime,
        content=docx_bytes,
    )

    assert res.content_type == docx_mime
    assert res.storage_path.endswith(".docx")
    mock_bucket.upload.assert_called_once_with(
        path=res.storage_path,
        file=docx_bytes,
        file_options={"content-type": docx_mime},
    )


def test_store_candidate_cv_object_path_format(monkeypatch):
    """Test 3: Object path follows {user_id}/{uuid4}.{ext} canonical format."""
    mock_client, _ = make_mock_supabase_client()
    monkeypatch.setattr("app.services.cv_storage.create_client", lambda url, key: mock_client)

    user_id = uuid4()
    res = store_candidate_cv(
        user_id=user_id,
        filename="cv.pdf",
        content_type="application/pdf",
        content=b"%PDF content",
    )

    parts = res.storage_path.split("/")
    assert len(parts) == 2
    assert parts[0] == str(user_id)

    filename_part, ext = parts[1].rsplit(".", 1)
    assert UUID(filename_part)  # Validates UUID4
    assert ext == "pdf"


def test_store_candidate_cv_original_filename_not_in_key(monkeypatch):
    """Test 4: Original filename is NOT present in the generated storage_path."""
    mock_client, _ = make_mock_supabase_client()
    monkeypatch.setattr("app.services.cv_storage.create_client", lambda url, key: mock_client)

    user_id = uuid4()
    original_name = "Jane_Doe_Resume_Final_v2_2026.pdf"
    res = store_candidate_cv(
        user_id=user_id,
        filename=original_name,
        content_type="application/pdf",
        content=b"%PDF content",
    )

    assert "Jane" not in res.storage_path
    assert "Resume" not in res.storage_path
    assert original_name not in res.storage_path


def test_store_candidate_cv_pdf_mime_docx_ext_mismatch_rejected(monkeypatch):
    """Test 5: PDF MIME with .docx extension is rejected before client creation."""
    client_created = []
    monkeypatch.setattr(
        "app.services.cv_storage.create_client", lambda url, key: client_created.append(1)
    )

    with pytest.raises(CVStorageValidationError, match="does not match file extension"):
        store_candidate_cv(
            user_id=uuid4(),
            filename="resume.docx",
            content_type="application/pdf",
            content=b"content",
        )

    assert client_created == []


def test_store_candidate_cv_docx_mime_pdf_ext_mismatch_rejected(monkeypatch):
    """Test 6: DOCX MIME with .pdf extension is rejected before client creation."""
    client_created = []
    monkeypatch.setattr(
        "app.services.cv_storage.create_client", lambda url, key: client_created.append(1)
    )

    docx_mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    with pytest.raises(CVStorageValidationError, match="does not match file extension"):
        store_candidate_cv(
            user_id=uuid4(),
            filename="resume.pdf",
            content_type=docx_mime,
            content=b"content",
        )

    assert client_created == []


def test_store_candidate_cv_unsupported_mime_rejected(monkeypatch):
    """Test 7: Unsupported MIME type (e.g. image/png) is rejected before client creation."""
    client_created = []
    monkeypatch.setattr(
        "app.services.cv_storage.create_client", lambda url, key: client_created.append(1)
    )

    with pytest.raises(CVStorageValidationError, match="Unsupported content type"):
        store_candidate_cv(
            user_id=uuid4(),
            filename="image.png",
            content_type="image/png",
            content=b"png bytes",
        )

    assert client_created == []


def test_store_candidate_cv_unsupported_extension_rejected(monkeypatch):
    """Test 8: Unsupported extension (e.g. .txt) is rejected before client creation."""
    client_created = []
    monkeypatch.setattr(
        "app.services.cv_storage.create_client", lambda url, key: client_created.append(1)
    )

    with pytest.raises(CVStorageValidationError, match="Unsupported file extension"):
        store_candidate_cv(
            user_id=uuid4(),
            filename="resume.txt",
            content_type="application/pdf",
            content=b"content",
        )

    assert client_created == []


def test_store_candidate_cv_empty_bytes_rejected(monkeypatch):
    """Test 9: Empty bytes upload is rejected before client creation."""
    client_created = []
    monkeypatch.setattr(
        "app.services.cv_storage.create_client", lambda url, key: client_created.append(1)
    )

    with pytest.raises(CVStorageValidationError, match="cannot be empty"):
        store_candidate_cv(
            user_id=uuid4(),
            filename="resume.pdf",
            content_type="application/pdf",
            content=b"",
        )

    assert client_created == []


def test_store_candidate_cv_exactly_10mb_accepted(monkeypatch):
    """Test 10: Payload of exactly 10 MiB (10 * 1024 * 1024 bytes) is accepted."""
    mock_client, _ = make_mock_supabase_client()
    monkeypatch.setattr("app.services.cv_storage.create_client", lambda url, key: mock_client)

    exact_10mb = b"a" * MAX_CV_SIZE_BYTES
    res = store_candidate_cv(
        user_id=uuid4(),
        filename="resume.pdf",
        content_type="application/pdf",
        content=exact_10mb,
    )
    assert res.size_bytes == MAX_CV_SIZE_BYTES


def test_store_candidate_cv_greater_than_10mb_rejected(monkeypatch):
    """Test 11: Payload greater than 10 MiB is rejected before client creation."""
    client_created = []
    monkeypatch.setattr(
        "app.services.cv_storage.create_client", lambda url, key: client_created.append(1)
    )

    over_10mb = b"a" * (MAX_CV_SIZE_BYTES + 1)
    with pytest.raises(CVStorageValidationError, match="exceeds maximum limit of 10 MB"):
        store_candidate_cv(
            user_id=uuid4(),
            filename="resume.pdf",
            content_type="application/pdf",
            content=over_10mb,
        )

    assert client_created == []


def test_store_candidate_cv_blank_service_role_key_rejected(monkeypatch):
    """Test 12: Blank or placeholder SUPABASE_SERVICE_ROLE_KEY is rejected."""
    client_created = []
    monkeypatch.setattr(
        "app.services.cv_storage.create_client", lambda url, key: client_created.append(1)
    )

    monkeypatch.setattr("app.core.config.settings.SUPABASE_SERVICE_ROLE_KEY", "")
    with pytest.raises(CVStorageValidationError, match="SUPABASE_SERVICE_ROLE_KEY"):
        store_candidate_cv(
            user_id=uuid4(),
            filename="resume.pdf",
            content_type="application/pdf",
            content=b"%PDF content",
        )

    monkeypatch.setattr(
        "app.core.config.settings.SUPABASE_SERVICE_ROLE_KEY",
        "sb_serv_placeholder_key_server_only",
    )
    with pytest.raises(CVStorageValidationError, match="SUPABASE_SERVICE_ROLE_KEY"):
        store_candidate_cv(
            user_id=uuid4(),
            filename="resume.pdf",
            content_type="application/pdf",
            content=b"%PDF content",
        )

    assert client_created == []


def test_store_candidate_cv_placeholder_supabase_url_rejected(monkeypatch):
    """Test 13: Placeholder SUPABASE_URL is rejected before client creation."""
    client_created = []
    monkeypatch.setattr(
        "app.services.cv_storage.create_client", lambda url, key: client_created.append(1)
    )

    monkeypatch.setattr(
        "app.core.config.settings.SUPABASE_URL",
        "https://placeholder-project.supabase.co",
    )
    with pytest.raises(CVStorageValidationError, match="SUPABASE_URL"):
        store_candidate_cv(
            user_id=uuid4(),
            filename="resume.pdf",
            content_type="application/pdf",
            content=b"%PDF content",
        )

    assert client_created == []


def test_store_candidate_cv_uses_configured_bucket(monkeypatch):
    """Test 14: Configured CV_STORAGE_BUCKET is passed to Supabase storage.from_()."""
    mock_client, _ = make_mock_supabase_client()
    monkeypatch.setattr("app.services.cv_storage.create_client", lambda url, key: mock_client)
    monkeypatch.setattr("app.core.config.settings.CV_STORAGE_BUCKET", "custom_resumes")

    store_candidate_cv(
        user_id=uuid4(),
        filename="resume.pdf",
        content_type="application/pdf",
        content=b"%PDF content",
    )

    mock_client.storage.from_.assert_called_once_with("custom_resumes")


def test_store_candidate_cv_provider_exception_propagates(monkeypatch):
    """Test 15: Genuine Supabase provider exception propagates unchanged."""
    mock_client, mock_bucket = make_mock_supabase_client()
    mock_bucket.upload.side_effect = RuntimeError("Supabase Storage Error 500")
    monkeypatch.setattr("app.services.cv_storage.create_client", lambda url, key: mock_client)

    with pytest.raises(RuntimeError, match="Supabase Storage Error 500"):
        store_candidate_cv(
            user_id=uuid4(),
            filename="resume.pdf",
            content_type="application/pdf",
            content=b"%PDF content",
        )


def test_store_candidate_cv_returned_metadata_fields(monkeypatch):
    """Test 16: Returned CVStoredObject contains exact correct metadata fields."""
    mock_client, _ = make_mock_supabase_client()
    monkeypatch.setattr("app.services.cv_storage.create_client", lambda url, key: mock_client)

    pdf_data = b"%PDF-1.7 payload"
    user_id = uuid4()
    res = store_candidate_cv(
        user_id=user_id,
        filename="candidate_cv.pdf",
        content_type="application/pdf",
        content=pdf_data,
    )

    assert res.size_bytes == len(pdf_data)
    assert res.content_type == "application/pdf"
    assert res.storage_path.startswith(f"{user_id}/")


def test_importing_cv_storage_performs_no_network(monkeypatch):
    """Test 17: Importing module performs zero client creation or network calls."""
    calls = []
    monkeypatch.setattr(
        "app.services.cv_storage.create_client",
        lambda url, key: calls.append(1),
    )

    import app.services.cv_storage  # noqa: F401

    assert calls == []


def test_uppercase_extensions_accepted_and_canonical_lowercase(monkeypatch):
    """
    Test 18: Uppercase .PDF/.DOCX extensions are accepted and persisted lowercase.
    """
    mock_client, _ = make_mock_supabase_client()
    monkeypatch.setattr("app.services.cv_storage.create_client", lambda url, key: mock_client)

    user_id = uuid4()
    res = store_candidate_cv(
        user_id=user_id,
        filename="MY_RESUME.PDF",
        content_type="application/pdf",
        content=b"%PDF content",
    )

    assert res.storage_path.endswith(".pdf")
    assert not res.storage_path.endswith(".PDF")
