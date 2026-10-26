import uuid
from sqlalchemy import (
    Column,
    String,
    Text,
    Boolean,
    Float,
    ForeignKey,
    Enum as SAEnum,
    DateTime,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(
        SAEnum("open", "in_progress", "resolved", "closed", name="ticket_status"),
        default="open",
        nullable=False,
    )
    urgency = Column(
        SAEnum("low", "medium", "high", "critical", name="ticket_urgency"),
        default="medium",
        nullable=False,
    )
    category = Column(String(100), nullable=True)

    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    ai_category = Column(String(100), nullable=True)
    ai_urgency = Column(String(50), nullable=True)
    ai_confidence = Column(Float, nullable=True)
    ai_escalate = Column(Boolean, default=False)

    override_category = Column(String(100), nullable=True)
    override_urgency = Column(String(50), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    created_by = relationship("User", foreign_keys=[created_by_id], back_populates="tickets_created")
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], back_populates="tickets_assigned")
    drafts = relationship("Draft", back_populates="ticket", cascade="all, delete-orphan")
