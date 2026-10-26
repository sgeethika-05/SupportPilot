from datetime import datetime
from typing import Any, List, Optional
from uuid import UUID
from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    action: str
    entity_type: str
    entity_id: Optional[UUID] = None
    details: Optional[Any] = None
    ip_address: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AuditLogList(BaseModel):
    items: List[AuditLogResponse]
    total: int
