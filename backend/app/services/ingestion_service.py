import io
import re
import uuid
from pathlib import Path
from typing import Union
from sqlalchemy.orm import Session
from app.models.document import Document, DocumentStatus
from app.models.chunk import Chunk
from app.services.embedding_service import chunk_text, get_embedding
from app.core.config import settings


def extract_text_from_pdf(content: bytes) -> str:
    try:
        import PyPDF2
        reader = PyPDF2.PdfReader(io.BytesIO(content))
        text_parts = []
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text_parts.append(extracted)
        return "\n".join(text_parts)
    except Exception as e:
        raise ValueError(f"PDF extraction failed: {e}")


def extract_text_from_txt(content: bytes) -> str:
    try:
        import chardet
        detected = chardet.detect(content)
        encoding = (detected.get("encoding") or "utf-8") if detected else "utf-8"
        return content.decode(encoding, errors="replace")
    except Exception as e:
        raise ValueError(f"Text extraction failed: {e}")


def extract_text_from_markdown(content: bytes) -> str:
    try:
        text = content.decode("utf-8", errors="replace")
        # Strip markdown syntax for cleaner chunking
        text = re.sub(r"#{1,6}\s+", "", text)
        text = re.sub(r"\*{1,2}([^*]+)\*{1,2}", r"\1", text)
        text = re.sub(r"`[^`]+`", "", text)
        text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
        return text
    except Exception as e:
        raise ValueError(f"Markdown extraction failed: {e}")


def extract_text(filename: str, content: bytes) -> str:
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return extract_text_from_pdf(content)
    elif ext in (".txt", ".text"):
        return extract_text_from_txt(content)
    elif ext in (".md", ".markdown"):
        return extract_text_from_markdown(content)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def ingest_document(db: Session, document_id: Union[str, uuid.UUID], content: bytes) -> int:
    """Extract text, chunk, embed, and store. Returns chunk count."""
    doc_uuid = uuid.UUID(str(document_id)) if isinstance(document_id, str) else document_id
    doc = db.query(Document).filter(Document.id == doc_uuid).first()
    if not doc:
        raise ValueError("Document not found")

    doc.status = DocumentStatus.PROCESSING
    db.commit()

    try:
        # Extract text
        text = extract_text(doc.original_name, content)
        if not text.strip():
            raise ValueError("No text extracted from document")

        # Delete existing chunks if re-indexing
        db.query(Chunk).filter(Chunk.document_id == doc_uuid).delete()

        # Chunk text
        chunks = chunk_text(text)

        # Embed and store chunks
        chunk_count = 0
        for i, chunk_text_val in enumerate(chunks):
            embedding = get_embedding(chunk_text_val)
            chunk = Chunk(
                id=uuid.uuid4(),
                document_id=doc_uuid,
                content=chunk_text_val,
                chunk_index=i,
                token_count=len(chunk_text_val.split()),
                embedding=embedding,
            )
            db.add(chunk)
            chunk_count += 1

        doc.chunk_count = chunk_count
        doc.status = DocumentStatus.INDEXED
        doc.error_message = None
        db.commit()
        return chunk_count

    except Exception as e:
        doc.status = DocumentStatus.ERROR
        doc.error_message = str(e)[:500]
        db.commit()
        raise
