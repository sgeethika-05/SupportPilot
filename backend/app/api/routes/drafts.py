import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.models.draft import Draft, DraftStatus
from app.models.ticket import Ticket
from app.schemas.ai import DraftCreate, DraftUpdate
from app.core.deps import get_current_user
from app.models.user import User
from app.services.rag_service import semantic_search
from app.services.gemini_service import generate_draft
from app.services.audit_service import log_action
from app.core.config import settings

router = APIRouter(prefix="/drafts", tags=["drafts"])


def _draft_dict(draft: Draft) -> dict:
    """Serialize a Draft ORM object to a JSON-safe dict."""
    return {
        "id": str(draft.id),
        "ticket_id": str(draft.ticket_id),
        "content": draft.content or "",
        "status": draft.status.value if hasattr(draft.status, "value") else str(draft.status),
        "sources": draft.sources or [],
        "created_by_id": str(draft.created_by_id) if draft.created_by_id else None,
        "approved_by_id": str(draft.approved_by_id) if draft.approved_by_id else None,
        "rejection_reason": draft.rejection_reason,
        "regeneration_count": draft.regeneration_count or 0,
        "created_at": draft.created_at.isoformat() if draft.created_at else None,
        "updated_at": draft.updated_at.isoformat() if draft.updated_at else None,
    }


def _get_draft_or_404(draft_id: str, db: Session) -> Draft:
    draft = db.query(Draft).filter(Draft.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    return draft


@router.get("")
def list_drafts(
    ticket_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Draft)
    if ticket_id:
        q = q.filter(Draft.ticket_id == ticket_id)
    total = q.count()
    items = q.order_by(Draft.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": [_draft_dict(d) for d in items], "total": total, "page": page, "page_size": page_size}


@router.post("", status_code=201)
def create_draft(
    data: DraftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == str(data.ticket_id)).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    query = data.query or f"{ticket.title}: {ticket.description}"
    rag_result = semantic_search(db=db, query=query, top_k=settings.DEFAULT_TOP_K)
    chunks = rag_result.get("results", [])

    result = generate_draft(
        ticket_title=ticket.title,
        ticket_description=ticket.description,
        context_chunks=chunks,
        agent_name=current_user.name,
    )
    content = result.get("content", "") if isinstance(result, dict) else str(result)

    sources_data = [
        {
            "id": str(c.get("id", "")),
            "score": c.get("similarity_score", 0),
            "content": (c.get("content", ""))[:200],
            "document_name": c.get("document_name", ""),
        }
        for c in chunks
    ]

    draft = Draft(
        id=uuid.uuid4(),
        ticket_id=ticket.id,
        content=content,
        status=DraftStatus.DRAFT,
        sources=sources_data,
        created_by_id=current_user.id,
        regeneration_count=0,
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    log_action(db, str(current_user.id), "draft_created", "draft", str(draft.id), {"ticket_id": str(ticket.id)})
    return _draft_dict(draft)


@router.get("/{draft_id}")
def get_draft(draft_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _draft_dict(_get_draft_or_404(draft_id, db))


@router.patch("/{draft_id}")
def update_draft(
    draft_id: str,
    data: DraftUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    draft = _get_draft_or_404(draft_id, db)
    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(draft, k, v)
    db.commit()
    db.refresh(draft)
    return _draft_dict(draft)


@router.post("/{draft_id}/approve")
def approve_draft(draft_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    draft = _get_draft_or_404(draft_id, db)
    draft.status = DraftStatus.APPROVED
    draft.approved_by_id = current_user.id
    db.commit()
    db.refresh(draft)
    log_action(db, str(current_user.id), "draft_approved", "draft", draft_id)
    return _draft_dict(draft)


@router.post("/{draft_id}/reject")
def reject_draft(
    draft_id: str,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    draft = _get_draft_or_404(draft_id, db)
    reason = data.get("reason", "") if isinstance(data, dict) else ""
    draft.status = DraftStatus.REJECTED
    draft.rejection_reason = reason
    db.commit()
    db.refresh(draft)
    log_action(db, str(current_user.id), "draft_rejected", "draft", draft_id, {"reason": reason})
    return _draft_dict(draft)


@router.post("/{draft_id}/escalate")
def escalate_draft(draft_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    draft = _get_draft_or_404(draft_id, db)
    draft.status = DraftStatus.ESCALATED
    db.commit()
    db.refresh(draft)
    log_action(db, str(current_user.id), "draft_escalated", "draft", draft_id)
    return _draft_dict(draft)


@router.post("/{draft_id}/regenerate")
def regenerate_draft(draft_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    draft = _get_draft_or_404(draft_id, db)
    ticket = db.query(Ticket).filter(Ticket.id == str(draft.ticket_id)).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Associated ticket not found")

    query = f"{ticket.title}: {ticket.description}"
    rag_result = semantic_search(db=db, query=query, top_k=settings.DEFAULT_TOP_K)
    chunks = rag_result.get("results", [])

    result = generate_draft(ticket.title, ticket.description, chunks, current_user.name)
    content = result.get("content", "") if isinstance(result, dict) else str(result)

    sources_data = [
        {
            "id": str(c.get("id", "")),
            "score": c.get("similarity_score", 0),
            "content": (c.get("content", ""))[:200],
            "document_name": c.get("document_name", ""),
        }
        for c in chunks
    ]

    draft.content = content
    draft.sources = sources_data
    draft.status = DraftStatus.DRAFT
    draft.rejection_reason = None
    draft.regeneration_count = (draft.regeneration_count or 0) + 1
    db.commit()
    db.refresh(draft)
    log_action(db, str(current_user.id), "draft_regenerated", "draft", draft_id)
    return _draft_dict(draft)
