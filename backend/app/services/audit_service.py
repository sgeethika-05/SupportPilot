import uuid
from typing import Optional, Dict, Any, Union
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog


def log_action(
    db: Session,
    user_id: Optional[Union[str, uuid.UUID]],
    action: str,
    entity_type: str,
    entity_id: Optional[Union[str, uuid.UUID]] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    uid = uuid.UUID(str(user_id)) if user_id else None
    eid = uuid.UUID(str(entity_id)) if entity_id else None

    entry = AuditLog(
        id=uuid.uuid4(),
        user_id=uid,
        action=action,
        entity_type=entity_type,
        entity_id=eid,
        details=details,
        ip_address=ip_address,
    )
    db.add(entry)
    try:
        db.commit()
        db.refresh(entry)
    except Exception:
        db.rollback()
    return entry
