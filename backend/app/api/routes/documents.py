
import os
import uuid
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    BackgroundTasks,
    Query,
)
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.document import Document, DocumentStatus
from app.models.chunk import Chunk
from app.schemas.document import DocumentResponse, DocumentList
from app.core.deps import get_current_user
from app.models.user import User
from app.services.ingestion_service import ingest_document
from app.services.audit_service import log_action

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_TYPES = {
    "application/pdf",
    "text/plain",
    "text/markdown",
    "text/x-markdown",
}
ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".markdown"}
MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

# Resolve the backend directory independently of the terminal's
# current working directory.
BACKEND_DIR = Path(__file__).resolve().parents[3]
UPLOAD_DIR = BACKEND_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _run_ingestion(doc_id: str, content: bytes, db_session):
    try:
        ingest_document(db_session, doc_id, content)
    except Exception:
        pass


@router.get("", response_model=DocumentList)
def list_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Document)
    total = q.count()

    items = (
        q.order_by(Document.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=201,
)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ext = Path(file.filename or "").suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "File type not allowed. Allowed: "
                f"{', '.join(sorted(ALLOWED_EXTENSIONS))}"
            ),
        )

    content = await file.read()

    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 10MB",
        )

    if len(content) == 0:
        raise HTTPException(
            status_code=400,
            detail="File is empty",
        )

    safe_name = f"{uuid.uuid4()}{ext}"

    doc = Document(
        id=uuid.uuid4(),
        filename=safe_name,
        original_name=file.filename,
        file_type=ext.lstrip("."),
        file_size=len(content),
        status=DocumentStatus.PENDING,
        uploaded_by_id=current_user.id,
    )

    db.add(doc)
    db.commit()
    db.refresh(doc)

    log_action(
        db,
        str(current_user.id),
        "document_uploaded",
        "document",
        str(doc.id),
        {"filename": file.filename},
    )

    from app.db.session import SessionLocal

    def run_bg(doc_id: str, data: bytes):
        bg_db = SessionLocal()
        try:
            ingest_document(bg_db, doc_id, data)
        except Exception:
            pass
        finally:
            bg_db.close()

    background_tasks.add_task(
        run_bg,
        str(doc.id),
        content,
    )

    return doc


@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()

    if not doc:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    return doc


@router.delete("/{doc_id}", status_code=204)
def delete_document(
    doc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required",
        )

    doc = db.query(Document).filter(Document.id == doc_id).first()

    if not doc:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    db.query(Chunk).filter(
        Chunk.document_id == doc_id
    ).delete()

    db.delete(doc)
    db.commit()

    log_action(
        db,
        str(current_user.id),
        "document_deleted",
        "document",
        doc_id,
    )


@router.post(
    "/{doc_id}/reindex",
    response_model=DocumentResponse,
)
async def reindex_document(
    doc_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required",
        )

    doc = db.query(Document).filter(
        Document.id == doc_id
    ).first()

    if not doc:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    # First, look for the stored UUID-based filename.
    upload_path = UPLOAD_DIR / doc.filename

    # If it is missing, look for the original FAQ in the project root.
    if not upload_path.exists():
        project_dir = BACKEND_DIR.parent
        original_path = (
            project_dir / "SupportPilot_Sample_Support_FAQ.txt"
        )

        if not original_path.exists():
            raise HTTPException(
                status_code=400,
                detail=(
                    "Original file not found. "
                    f"Checked: {upload_path} and {original_path}"
                ),
            )

        upload_path = original_path

    content = upload_path.read_bytes()

    doc.status = DocumentStatus.PENDING
    doc.error_message = None
    db.commit()

    from app.db.session import SessionLocal

    def run_bg(did: str, data: bytes):
        bg_db = SessionLocal()

        try:
            ingest_document(bg_db, did, data)
        except Exception:
            # Keep ingestion errors visible in the document record.
            # ingest_document sets ERROR and error_message on failure.
            pass
        finally:
            bg_db.close()

    background_tasks.add_task(
        run_bg,
        str(doc.id),
        content,
    )

    db.refresh(doc)
    return doc


@router.get("/{doc_id}/chunks")
def get_document_chunks(
    doc_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()

    if not doc:
        raise HTTPException(
            status_code=404,
            detail="Document not found",
        )

    q = db.query(Chunk).filter(
        Chunk.document_id == doc_id
    )

    total = q.count()

    items = (
        q.order_by(Chunk.chunk_index)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "items": [
            {
                "id": str(c.id),
                "content": c.content,
                "chunk_index": c.chunk_index,
                "token_count": c.token_count,
            }
            for c in items
        ],
        "total": total,
    }
