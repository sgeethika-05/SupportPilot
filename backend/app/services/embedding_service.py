from typing import List, Optional
from app.services.gemini_service import generate_embedding
from app.core.config import settings


def get_embedding(text: str) -> list[float]:
    """Get embedding for text, truncating to avoid token limits."""
    # Truncate to ~2000 chars to stay within token limits
    truncated = text[:2000]
    return generate_embedding(truncated)


def chunk_text(
    text: str,
    chunk_size: Optional[int] = None,
    overlap: Optional[int] = None,
) -> List[str]:
    """Split text into overlapping chunks by word count."""

    chunk_size = (
        settings.CHUNK_SIZE if chunk_size is None else chunk_size
    )
    overlap = (
        settings.CHUNK_OVERLAP if overlap is None else overlap
    )

    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero")

    if overlap < 0:
        raise ValueError("overlap cannot be negative")

    if overlap >= chunk_size:
        overlap = chunk_size - 1

    words = text.split()

    if not words:
        return []

    chunks: List[str] = []
    step = chunk_size - overlap

    for start in range(0, len(words), step):
        chunk = " ".join(words[start : start + chunk_size])

        if chunk.strip():
            chunks.append(chunk)

        if start + chunk_size >= len(words):
            break

    return chunks