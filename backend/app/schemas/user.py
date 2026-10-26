from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class UserUpdateRole(BaseModel):
    role: str = Field(..., pattern="^(agent|admin)$")


class UserDetailResponse(BaseModel):
    id: UUID
    email: str
    name: str
    role: str
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UserList(BaseModel):
    items: List[UserDetailResponse]
    total: int
