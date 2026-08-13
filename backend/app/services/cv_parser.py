"""
Document Parser Service Foundation
Provides in-memory text extraction for candidate CV documents (PDF and DOCX formats).
Extracts text without writing to disk or executing macros, normalizing line endings.
"""

import io

from docx import Document
from pypdf import PdfReader


class CVParsingError(ValueError):
    """
    Raised when CV parsing fails due to invalid format, corrupt data, or empty output.
    """

    pass


def _extract_pdf_text(content: bytes) -> str:
    """Extract text from PDF byte payload using pypdf in page order."""
    try:
        reader = PdfReader(io.BytesIO(content))
        pages_text = []
        for page in reader.pages:
            text = page.extract_text()
            if text and text.strip():
                pages_text.append(text.strip())
        return "\n\n".join(pages_text)
    except Exception as exc:
        raise CVParsingError(f"Failed to parse PDF document: {exc}") from exc


def _extract_docx_text(content: bytes) -> str:
    """Extract text from DOCX byte payload using python-docx in paragraph order."""
    try:
        doc = Document(io.BytesIO(content))
        paragraphs_text = []
        for p in doc.paragraphs:
            text = p.text.strip() if p.text else ""
            if text:
                paragraphs_text.append(text)
        return "\n".join(paragraphs_text)
    except Exception as exc:
        raise CVParsingError(f"Failed to parse DOCX document: {exc}") from exc


def extract_cv_text(
    *,
    storage_path: str,
    content: bytes,
) -> str:
    """
    Extract normalized text content from candidate CV document bytes.
    Determines parser based on storage_path extension (.pdf or .docx).
    Validates non-empty content and non-empty extracted text.
    Normalizes line endings to standard Unix newline characters.
    """
    if not isinstance(content, bytes):
        raise CVParsingError("CV content must be raw bytes")

    if not content or len(content) == 0:
        raise CVParsingError("CV content cannot be empty")

    clean_path = storage_path.strip() if isinstance(storage_path, str) else ""
    if not clean_path or "." not in clean_path:
        raise CVParsingError(f"Invalid storage path: '{clean_path}'")

    ext = clean_path.rsplit(".", 1)[-1].lower()

    if ext == "pdf":
        raw_text = _extract_pdf_text(content)
    elif ext == "docx":
        raw_text = _extract_docx_text(content)
    else:
        raise CVParsingError(
            f"Unsupported file extension '.{ext}'. Supported extensions are .pdf and .docx"
        )

    normalized_text = raw_text.replace("\r\n", "\n").replace("\r", "\n").strip()

    if not normalized_text:
        raise CVParsingError("Extracted text from CV document is empty or whitespace-only")

    return normalized_text
