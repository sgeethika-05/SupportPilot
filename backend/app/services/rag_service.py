
import math
import time
from typing import List, Optional

from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models.chunk import Chunk
from app.models.document import Document, DocumentStatus
from app.services.embedding_service import get_embedding
from app.core.config import settings


def _cosine_sim(a: List[float], b: List[float]) -> float:
    """Calculate cosine similarity between two embedding vectors."""
    if len(a) != len(b) or not a or not b:
        return 0.0

    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return dot / (norm_a * norm_b)


def _keyword_overlap(query: str, content: str) -> float:
    """
    Calculate a simple lexical-overlap score.
    This supplements semantic similarity; it does not replace it.
    """
    stop_words = {
        "a", "an", "and", "are", "as", "at", "be", "by", "do",
        "for", "how", "i", "in", "is", "it", "me", "my", "of",
        "on", "or", "the", "to", "what", "when", "where", "with",
        "your", "application",
    }

    query_words = {
        word
        for word in query.lower().split()
        if word.isalnum() and len(word) > 2 and word not in stop_words
    }

    content_words = {
        word
        for word in content.lower().split()
        if word.isalnum()
    }

    if not query_words:
        return 0.0

    return len(query_words & content_words) / len(query_words)


def _rank_chunks(query: str, chunks: list) -> list:
    """
    Rank retrieved chunks using semantic similarity plus a small
    lexical-overlap bonus. Preserve original similarity scores.
    """
    ranked = []

    for chunk in chunks:
        semantic_score = float(chunk.get("similarity_score", 0.0))
        lexical_score = _keyword_overlap(
            query,
            chunk.get("content", ""),
        )

        # Semantic similarity remains the dominant ranking signal.
        combined_score = (0.85 * semantic_score) + (0.15 * lexical_score)

        ranked.append((combined_score, chunk))

    ranked.sort(key=lambda item: item[0], reverse=True)

    return [chunk for _, chunk in ranked]


def semantic_search(
    db: Session,
    query: str,
    top_k: Optional[int] = None,
    min_similarity: Optional[float] = None,
    restricted_doc_ids: Optional[List[str]] = None,
) -> dict:
    """
    Search indexed knowledge-base chunks using semantic similarity.

    Supports PostgreSQL with pgvector and an in-memory cosine-similarity
    fallback for SQLite or compatible test databases.

    Returns the query, retrieved chunks, result count, and search latency.
    """
    start = time.monotonic()

    top_k = (
        top_k
        if top_k is not None and top_k > 0
        else settings.DEFAULT_TOP_K
    )

    min_similarity = (
        min_similarity
        if min_similarity is not None
        else settings.MIN_SIMILARITY_THRESHOLD
    )

    query_embedding = get_embedding(query)

    if not query_embedding:
        return {
            "query": query,
            "results": [],
            "total_found": 0,
            "search_time_ms": round(
                (time.monotonic() - start) * 1000, 2
            ),
        }

    try:
        is_postgres = db.get_bind().dialect.name == "postgresql"
    except Exception:
        is_postgres = False

    chunks = []

    if is_postgres:
        filters = [
            "d.status = 'indexed'",
            "1 - (c.embedding <=> CAST(:embedding AS vector)) >= :min_sim",
        ]

        params = {
            "embedding": "[" + ",".join(
                str(float(value)) for value in query_embedding
            ) + "]",
            "min_sim": min_similarity,
            # Retrieve additional candidates before reranking.
            "top_k": min(max(top_k * 4, top_k), 100),
        }

        if restricted_doc_ids:
            filters.append(
                "CAST(c.document_id AS TEXT) IN :doc_ids"
            )
            params["doc_ids"] = tuple(
                str(doc_id) for doc_id in restricted_doc_ids
            )

        # Use an expanding parameter for a safe SQL IN clause.
        where_clause = " AND ".join(filters)

        sql = text(
            f"""
            SELECT
                c.id,
                c.content,
                c.chunk_index,
                c.document_id,
                d.original_name AS document_name,
                1 - (c.embedding <=> CAST(:embedding AS vector))
                    AS similarity_score
            FROM chunks c
            JOIN documents d ON c.document_id = d.id
            WHERE {where_clause}
            ORDER BY c.embedding <=> CAST(:embedding AS vector)
            LIMIT :top_k
            """
        )

        if restricted_doc_ids:
            sql = sql.bindparams(
                __import__("sqlalchemy").bindparam(
                    "doc_ids", expanding=True
                )
            )

        result = db.execute(sql, params)

        for row in result.fetchall():
            chunks.append({
                "id": str(row.id),
                "content": row.content,
                "chunk_index": row.chunk_index,
                "document_id": str(row.document_id),
                "document_name": row.document_name,
                "similarity_score": float(row.similarity_score),
            })

    else:
        query_rows = (
            db.query(Chunk, Document.original_name)
            .join(Document, Chunk.document_id == Document.id)
            .filter(Document.status == DocumentStatus.INDEXED)
            .all()
        )

        scored = []

        allowed_ids = (
            {str(doc_id) for doc_id in restricted_doc_ids}
            if restricted_doc_ids
            else None
        )

        for chunk, doc_name in query_rows:
            if (
                allowed_ids is not None
                and str(chunk.document_id) not in allowed_ids
            ):
                continue

            if chunk.embedding is None:
                continue

            embedding = chunk.embedding

            if hasattr(embedding, "tolist"):
                embedding = embedding.tolist()
            else:
                embedding = list(embedding)

            similarity = _cosine_sim(
                query_embedding,
                embedding,
            )

            if similarity >= min_similarity:
                scored.append({
                    "id": str(chunk.id),
                    "content": chunk.content,
                    "chunk_index": chunk.chunk_index,
                    "document_id": str(chunk.document_id),
                    "document_name": doc_name,
                    "similarity_score": float(similarity),
                })

        scored.sort(
            key=lambda item: item["similarity_score"],
            reverse=True,
        )

        # Keep a candidate pool for the common ranking step.
        chunks = scored[:min(max(top_k * 4, top_k), 100)]

    # Rerank the candidates and return the requested number.
    chunks = _rank_chunks(query, chunks)[:top_k]

    elapsed_ms = (time.monotonic() - start) * 1000

    return {
        "query": query,
        "results": chunks,
        "total_found": len(chunks),
        "search_time_ms": round(elapsed_ms, 2),
    }


def get_rag_stats(db: Session) -> dict:
    """Return knowledge-base document and chunk counts."""
    total_docs = db.query(Document).count()

    indexed_docs = (
        db.query(Document)
        .filter(Document.status == DocumentStatus.INDEXED)
        .count()
    )

    total_chunks = db.query(Chunk).count()

    avg_chunks = (
        total_chunks / total_docs
        if total_docs > 0
        else 0.0
    )

    return {
        "total_documents": total_docs,
        "total_chunks": total_chunks,
        "indexed_documents": indexed_docs,
        "avg_chunks_per_doc": round(avg_chunks, 2),
    }
