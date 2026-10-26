from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: UUID
    filename: str
    original_name: str
    file_type: str
    file_size: int
    status: str
    error_message: Optional[str] = None
    chunk_count: int = 0
    uploaded_by_id: Optional[UUID] = None
    is_restricted: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class DocumentList(BaseModel):
    items: List[DocumentResponse]
    total: int


class ChunkDetail(BaseModel):
    id: UUID
    document_id: UUID
    content: str
    chunk_index: int
    token_count: int
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
