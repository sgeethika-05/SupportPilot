
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.ai import (
    CopilotRequest,
    CopilotResponse,
    ClassificationResult,
)
from app.services.rag_service import semantic_search
from app.services.gemini_service import (
    answer_copilot,
    classify_ticket,
)
from app.core.deps import get_current_user
from app.models.user import User
from app.core.config import settings


router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/copilot", response_model=CopilotResponse)
def copilot(
    req: CopilotRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Answer a support question using the knowledge base."""

    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key not configured.",
        )

    try:
        rag_result = semantic_search(
            db=db,
            query=req.question,
            top_k=settings.DEFAULT_TOP_K,
        )

        chunks = rag_result.get("results", [])

        result = answer_copilot(
            question=req.question,
            context_chunks=chunks,
        )

        return {
            "answer": result["answer"],
            "sources": chunks,
            "confidence": result["confidence"],
            "requires_escalation": result["requires_escalation"],
        }

    except HTTPException:
        raise

    except RuntimeError as exc:
        error_message = str(exc).lower()

        if "429" in error_message or "quota" in error_message or "rate limit" in error_message:
            raise HTTPException(
                status_code=429,
                detail=(
                    "Gemini API quota or rate limit exceeded. "
                    "Please try again after the quota resets."
                ),
            ) from exc

        raise HTTPException(
            status_code=500,
            detail="AI Copilot could not generate an answer.",
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="AI Copilot failed. Please check the backend logs.",
        ) from exc


@router.post("/classify", response_model=ClassificationResult)
def classify(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Classify a support ticket using Gemini."""

    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key not configured.",
        )

    title = data.get("title", "").strip()
    description = data.get("description", "").strip()

    if not title:
        raise HTTPException(
            status_code=400,
            detail="title is required.",
        )

    try:
        result = classify_ticket(
            title=title,
            description=description,
        )
        return result

    except Exception as exc:
        error_message = str(exc).lower()

        if "429" in error_message or "quota" in error_message or "rate limit" in error_message:
            raise HTTPException(
                status_code=429,
                detail=(
                    "Gemini API quota or rate limit exceeded. "
                    "Please try again after the quota resets."
                ),
            ) from exc

        raise HTTPException(
            status_code=500,
            detail="Ticket classification failed. Please try again later.",
        ) from exc
