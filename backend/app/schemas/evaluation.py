from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class EvalCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    query: str = Field(..., min_length=1)
    expected_answer: Optional[str] = None
    top_k: int = Field(default=5, ge=1, le=20)


class EvalResponse(BaseModel):
    id: UUID
    name: str
    query: str
    expected_answer: Optional[str] = None
    actual_answer: Optional[str] = None
    retrieved_chunks: Optional[Any] = None
    recall_at_k: Optional[float] = None
    groundedness_score: Optional[float] = None
    citation_precision: Optional[float] = None
    latency_ms: Optional[int] = None
    has_unsupported_claims: bool = False
    passed: Optional[bool] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class EvalSuiteResult(BaseModel):
    total_evaluations: int
    passed_count: int
    failed_count: int
    avg_latency_ms: float
    avg_groundedness: float
    results: List[EvalResponse]
