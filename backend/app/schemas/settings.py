from typing import List, Optional
from pydantic import BaseModel, Field


class SettingsResponse(BaseModel):
    APP_NAME: str
    DEBUG: bool
    EMBEDDING_MODEL: str
    EMBEDDING_DIMENSIONS: int
    DEFAULT_TOP_K: int
    MIN_SIMILARITY_THRESHOLD: float
    CHUNK_SIZE: int
    CHUNK_OVERLAP: int
    CORS_ORIGINS: List[str]


class SettingsUpdate(BaseModel):
    DEFAULT_TOP_K: Optional[int] = Field(None, ge=1, le=50)
    MIN_SIMILARITY_THRESHOLD: Optional[float] = Field(None, ge=0.0, le=1.0)
    CHUNK_SIZE: Optional[int] = Field(None, ge=64, le=2048)
    CHUNK_OVERLAP: Optional[int] = Field(None, ge=0, le=512)
