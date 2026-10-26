from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user, require_admin
from app.core.config import settings
from app.models.user import User

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("")
def get_settings(current_user: User = Depends(require_admin)):
    return {
        "gemini_model": "gemini-2.0-flash",
        "embedding_model": settings.EMBEDDING_MODEL,
        "embedding_dimensions": settings.EMBEDDING_DIMENSIONS,
        "default_top_k": settings.DEFAULT_TOP_K,
        "min_similarity_threshold": settings.MIN_SIMILARITY_THRESHOLD,
        "chunk_size": settings.CHUNK_SIZE,
        "chunk_overlap": settings.CHUNK_OVERLAP,
        "gemini_configured": bool(settings.GEMINI_API_KEY),
    }


@router.patch("")
def update_settings(data: dict, current_user: User = Depends(require_admin)):
    # Dynamic threshold updates (in-process only; restart required for permanent change)
    if "default_top_k" in data:
        val = int(data["default_top_k"])
        if 1 <= val <= 20:
            settings.DEFAULT_TOP_K = val
    if "min_similarity_threshold" in data:
        val = float(data["min_similarity_threshold"])
        if 0.0 <= val <= 1.0:
            settings.MIN_SIMILARITY_THRESHOLD = val
    return {"updated": True, "message": "Settings updated for this session. Set env vars for persistence."}