import uuid
from sqlalchemy import Column, String, Text, Float, Integer, Boolean, DateTime, JSON, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.db.session import Base


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    query = Column(Text, nullable=False)
    expected_answer = Column(Text, nullable=True)
    actual_answer = Column(Text, nullable=True)
    retrieved_chunks = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    recall_at_k = Column(Float, nullable=True)
    groundedness_score = Column(Float, nullable=True)
    citation_precision = Column(Float, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    has_unsupported_claims = Column(Boolean, default=False, nullable=False)
    passed = Column(Boolean, nullable=True)
    notes = Column(String(1000), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
