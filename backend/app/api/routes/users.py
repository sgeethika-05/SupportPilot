from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.core.deps import require_admin, get_current_user
from app.services.audit_service import log_action

router = APIRouter(prefix="/users", tags=["users"])


@router.get("")
def list_users(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [{"id": str(u.id), "email": u.email, "name": u.name, "role": u.role, "is_active": u.is_active, "created_at": str(u.created_at)} for u in users]


@router.patch("/{user_id}")
def update_user(user_id: str, data: dict, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if "role" in data and data["role"] in ["agent", "admin"]:
        user.role = data["role"]
    if "is_active" in data:
        user.is_active = bool(data["is_active"])
    db.commit()
    log_action(db, str(current_user.id), "user_updated", "user", user_id, data)
    return {"id": str(user.id), "email": user.email, "name": user.name, "role": user.role, "is_active": user.is_active}
