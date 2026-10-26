from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class TicketCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    urgency: Optional[str] = "medium"
    category: Optional[str] = None


class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    urgency: Optional[str] = None
    category: Optional[str] = None
    assigned_to_id: Optional[UUID] = None
    override_category: Optional[str] = None
    override_urgency: Optional[str] = None


class TicketResponse(BaseModel):
    id: UUID
    title: str
    description: str
    status: str
    urgency: str
    category: Optional[str] = None
    assigned_to_id: Optional[UUID] = None
    created_by_id: Optional[UUID] = None
    ai_category: Optional[str] = None
    ai_urgency: Optional[str] = None
    ai_confidence: Optional[float] = None
    ai_escalate: Optional[bool] = False
    override_category: Optional[str] = None
    override_urgency: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TicketList(BaseModel):
    items: List[TicketResponse]
    total: int
