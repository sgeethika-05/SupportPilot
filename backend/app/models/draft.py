import enum
import uuid
from sqlalchemy import (
    Column,
    Text,
    String,
    Integer,
    ForeignKey,
    Enum as SAEnum,
    DateTime,
    JSON,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.db.session import Base


class DraftStatus(str, enum.Enum):
    DRAFT = "draft"
    APPROVED = "approved"
    REJECTED = "rejected"
    ESCALATED = "escalated"


class Draft(Base):
    __tablename__ = "drafts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tickets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    content = Column(Text, nullable=False)
    status = Column(
        SAEnum("draft", "approved", "rejected", "escalated", name="draft_status"),
        default="draft",
        nullable=False,
    )
    sources = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)

    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approved_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    rejection_reason = Column(String(500), nullable=True)
    regeneration_count = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    ticket = relationship("Ticket", back_populates="drafts")
    created_by = relationship("User", foreign_keys=[created_by_id], back_populates="drafts_created")
    approved_by = relationship("User", foreign_keys=[approved_by_id], back_populates="drafts_approved")
