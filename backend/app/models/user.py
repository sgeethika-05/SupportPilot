import uuid
from sqlalchemy import Column, String, Boolean, Enum as SAEnum, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(
        SAEnum("agent", "admin", name="user_role"),
        default="agent",
        nullable=False,
    )
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    tickets_created = relationship(
        "Ticket",
        foreign_keys="Ticket.created_by_id",
        back_populates="created_by",
        cascade="all, delete-orphan",
    )
    tickets_assigned = relationship(
        "Ticket",
        foreign_keys="Ticket.assigned_to_id",
        back_populates="assigned_to",
    )
    documents = relationship(
        "Document",
        foreign_keys="Document.uploaded_by_id",
        back_populates="uploaded_by",
    )
    drafts_created = relationship(
        "Draft",
        foreign_keys="Draft.created_by_id",
        back_populates="created_by",
    )
    drafts_approved = relationship(
        "Draft",
        foreign_keys="Draft.approved_by_id",
        back_populates="approved_by",
    )
    audit_logs = relationship(
        "AuditLog",
        foreign_keys="AuditLog.user_id",
        back_populates="user",
    )
