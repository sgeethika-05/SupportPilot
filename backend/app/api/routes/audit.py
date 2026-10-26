from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.core.deps import get_current_user, require_admin
from app.models.user import User

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("")
def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    entity_type: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    q = db.query(AuditLog)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    total = q.count()
    items = q.order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}
