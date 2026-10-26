from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.session import get_db
from app.core.config import settings

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
def health_check(db: Session = Depends(get_db)):
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass
    gemini_ok = bool(settings.GEMINI_API_KEY)
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "gemini": "configured" if gemini_ok else "api_key_missing",
        "version": "1.0.0",
        "app": settings.APP_NAME,
    }
