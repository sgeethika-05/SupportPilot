import enum
import uuid
from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    ForeignKey,
    Enum as SAEnum,
    DateTime,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base


class DocumentStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    INDEXED = "indexed"
    ERROR = "error"


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size = Column(Integer, nullable=False)
    status = Column(
        SAEnum(DocumentStatus, name="document_status", values_callable=lambda obj: [e.value for e in obj]),
        default=DocumentStatus.PENDING,
        nullable=False,
    )
    error_message = Column(String(1000), nullable=True)
    chunk_count = Column(Integer, default=0, nullable=False)
    uploaded_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    is_restricted = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    uploaded_by = relationship("User", back_populates="documents")
    chunks = relationship("Chunk", back_populates="document", cascade="all, delete-orphan")
