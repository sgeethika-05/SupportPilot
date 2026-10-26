from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.rag import RAGQuery, RAGResponse
from app.services.rag_service import semantic_search, get_rag_stats
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/rag", tags=["rag"])


@router.post("/search", response_model=RAGResponse)
def search(query: RAGQuery, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = semantic_search(
        db=db,
        query=query.query,
        top_k=query.top_k,
        min_similarity=query.min_similarity,
    )
    return result


@router.get("/stats")
def rag_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_rag_stats(db)
