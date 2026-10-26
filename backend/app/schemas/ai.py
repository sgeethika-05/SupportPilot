from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID
from pydantic import BaseModel, Field
from app.schemas.rag import ChunkResult


class ClassificationResult(BaseModel):
    category: str
    urgency: str
    confidence: float
    escalate: bool
    reasoning: str


class DraftCreate(BaseModel):
    ticket_id: UUID
    query: Optional[str] = None


class DraftResponse(BaseModel):
    id: UUID
    ticket_id: UUID
    content: str
    status: str
    sources: Optional[Any] = None
    created_by_id: Optional[UUID] = None
    approved_by_id: Optional[UUID] = None
    rejection_reason: Optional[str] = None
    regeneration_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class DraftUpdate(BaseModel):
    content: Optional[str] = None
    status: Optional[str] = None
    rejection_reason: Optional[str] = None


class RejectDraftRequest(BaseModel):
    reason: str = Field(..., min_length=1)


class CopilotRequest(BaseModel):
    question: str = Field(..., min_length=1)
    ticket_id: Optional[UUID] = None


class CopilotResponse(BaseModel):
    answer: str
    sources: List[ChunkResult]
    confidence: str
    requires_escalation: bool
