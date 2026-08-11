"""
OpenAI Embedding Service Foundation
Provides reusable synchronous provider boundary for generating text embeddings via OpenAI API.
"""

import math
from typing import List

from openai import OpenAI

from app.core.config import settings


def generate_embedding(text: str) -> List[float]:
    """
    Generate floating point embedding vector for text using OpenAI API.
    Validates inputs, constructs OpenAI client dynamically, requests embeddings
    matching project config model/dimensions, and strictly validates provider output.
    """
    if not isinstance(text, str):
        raise TypeError(f"text input must be a string, got {type(text).__name__}")

    if not text.strip():
        raise ValueError("text input cannot be empty or whitespace-only")

    api_key = settings.OPENAI_API_KEY.strip() if settings.OPENAI_API_KEY else ""
    if not api_key:
        raise ValueError("OPENAI_API_KEY configuration is missing or empty")

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.embeddings.create(
        input=text,
        model=settings.EMBEDDING_MODEL_NAME,
        dimensions=settings.EMBEDDING_DIMENSION,
        encoding_format="float",
    )

    if not hasattr(response, "data") or not response.data:
        raise ValueError("OpenAI embedding API response returned empty data")

    first_item = response.data[0]
    if not hasattr(first_item, "embedding") or first_item.embedding is None:
        raise ValueError("OpenAI embedding result item contains no embedding vector")

    raw_embedding = first_item.embedding
    if not isinstance(raw_embedding, (list, tuple)):
        raise ValueError("OpenAI embedding result is not a valid sequence")

    if len(raw_embedding) != settings.EMBEDDING_DIMENSION:
        raise ValueError(
            f"Embedding dimension mismatch: expected {settings.EMBEDDING_DIMENSION}, "
            f"got {len(raw_embedding)}"
        )

    result_vector: List[float] = []
    for val in raw_embedding:
        if val is None or not isinstance(val, (int, float)) or isinstance(val, bool):
            raise ValueError("Embedding vector contains non-numeric element")
        float_val = float(val)
        if math.isnan(float_val) or math.isinf(float_val):
            raise ValueError("Embedding vector contains non-finite float value (NaN or Inf)")
        result_vector.append(float_val)

    return result_vector
