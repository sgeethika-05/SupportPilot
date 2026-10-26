from typing import List, Optional
from pydantic import BaseModel, Field


class RAGQuery(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = Field(default=5, ge=1, le=20)
    min_similarity: float = Field(default=0.7, ge=0.0, le=1.0)


class ChunkResult(BaseModel):
    id: str
    content: str
    document_id: str
    document_name: str
    similarity_score: float
    chunk_index: int


class RAGResponse(BaseModel):
    query: str
    results: List[ChunkResult]
    total_found: int
    search_time_ms: float


class RAGStats(BaseModel):
    total_documents: int
    total_chunks: int
    indexed_documents: int
    avg_chunks_per_doc: float
