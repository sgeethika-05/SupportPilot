from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import get_db
from app.models.ticket import Ticket
from app.models.document import Document, DocumentStatus
from app.models.chunk import Chunk
from app.models.draft import Draft, DraftStatus
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total_tickets = db.query(Ticket).count()
    open_tickets = db.query(Ticket).filter(Ticket.status == "open").count()
    resolved_tickets = db.query(Ticket).filter(Ticket.status == "resolved").count()
    docs_indexed = db.query(Document).filter(Document.status == DocumentStatus.INDEXED).count()
    total_chunks = db.query(Chunk).count()
    drafts_pending = db.query(Draft).filter(Draft.status == DraftStatus.DRAFT).count()
    escalated = db.query(Draft).filter(Draft.status == DraftStatus.ESCALATED).count()

    urgency_dist = {}
    for urgency in ["low", "medium", "high", "critical"]:
        count = db.query(Ticket).filter(Ticket.urgency == urgency).count()
        urgency_dist[urgency] = count

    recent_tickets = db.query(Ticket).order_by(Ticket.created_at.desc()).limit(5).all()

    return {
        "total_tickets": total_tickets,
        "open_tickets": open_tickets,
        "resolved_tickets": resolved_tickets,
        "pending_review": drafts_pending + escalated,
        "documents_indexed": docs_indexed,
        "total_chunks": total_chunks,
        "drafts_pending": drafts_pending,
        "avg_resolution_time_hours": 0,
        "urgency_distribution": urgency_dist,
        "recent_tickets": [
            {"id": str(t.id), "title": t.title, "status": t.status, "urgency": t.urgency, "created_at": str(t.created_at)}
            for t in recent_tickets
        ],
    }
