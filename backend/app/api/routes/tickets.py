from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import uuid

from app.db.session import get_db
from app.models.ticket import Ticket
from app.models.user import User
from app.schemas.ticket import TicketCreate, TicketUpdate, TicketResponse, TicketList
from app.core.deps import get_current_user
from app.services.gemini_service import classify_ticket
from app.services.audit_service import log_action

router = APIRouter(prefix="/tickets", tags=["tickets"])


@router.get("", response_model=TicketList)
def list_tickets(
    status: Optional[str] = None,
    urgency: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Ticket)
    if status:
        q = q.filter(Ticket.status == status)
    if urgency:
        q = q.filter(Ticket.urgency == urgency)
    if category:
        q = q.filter(Ticket.category == category)
    if search:
        term = f"%{search}%"
        q = q.filter(Ticket.title.ilike(term) | Ticket.description.ilike(term))
    total = q.count()
    items = q.order_by(Ticket.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("", response_model=TicketResponse, status_code=201)
def create_ticket(
    data: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = Ticket(
        id=uuid.uuid4(),
        title=data.title,
        description=data.description,
        urgency=data.urgency or "medium",
        category=data.category,
        created_by_id=current_user.id,
        status="open",
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    log_action(db, str(current_user.id), "ticket_created", "ticket", str(ticket.id), {"title": ticket.title})
    return ticket


@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(ticket_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@router.patch("/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    ticket_id: str,
    data: TicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    update_data = data.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(ticket, key, val)
    db.commit()
    db.refresh(ticket)
    log_action(db, str(current_user.id), "ticket_updated", "ticket", str(ticket.id), update_data)
    return ticket


@router.delete("/{ticket_id}", status_code=204)
def delete_ticket(ticket_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    db.delete(ticket)
    db.commit()
    log_action(db, str(current_user.id), "ticket_deleted", "ticket", ticket_id)


@router.post("/{ticket_id}/classify")
def classify(ticket_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if not classify_ticket:
        raise HTTPException(status_code=503, detail="AI service unavailable")
    try:
        result = classify_ticket(ticket.title, ticket.description)
        ticket.ai_category = result["category"]
        ticket.ai_urgency = result["urgency"]
        ticket.ai_confidence = result["confidence"]
        ticket.ai_escalate = result["escalate"]
        db.commit()
        db.refresh(ticket)
        log_action(db, str(current_user.id), "ticket_classified", "ticket", ticket_id, result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")
