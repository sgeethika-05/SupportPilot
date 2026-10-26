import io
import pytest


def test_upload_invalid_file_type(client, agent_headers):
    """Unsupported file extensions rejected with 400."""
    files = {"file": ("malicious.exe", io.BytesIO(b"binary data"), "application/octet-stream")}
    res = client.post("/api/documents/upload", files=files, headers=agent_headers)
    assert res.status_code == 400
    detail = res.json()["detail"].lower()
    assert "not allowed" in detail or "file type" in detail


def test_upload_valid_txt_document(client, agent_headers):
    """Valid .txt file is accepted and document record created."""
    text_content = b"How to cancel subscription:\n1. Go to settings > billing\n2. Click cancel subscription"
    files = {"file": ("guide.txt", io.BytesIO(text_content), "text/plain")}
    res = client.post("/api/documents/upload", files=files, headers=agent_headers)
    assert res.status_code == 201, res.text
    doc = res.json()
    assert doc["original_name"] == "guide.txt"
    assert doc["file_type"] == "txt"
    # Status is "pending" or "processing" (background ingestion) or "indexed" if fast
    assert doc["status"] in ("pending", "processing", "indexed", "error")


def test_upload_markdown_document(client, agent_headers):
    """Valid .md file is accepted."""
    md_content = b"# API Docs\n\nRate limits: 60 req/min."
    files = {"file": ("api_docs.md", io.BytesIO(md_content), "text/markdown")}
    res = client.post("/api/documents/upload", files=files, headers=agent_headers)
    assert res.status_code == 201, res.text
    doc = res.json()
    assert doc["file_type"] == "md"


def test_upload_too_large_rejected(client, agent_headers):
    """Files over 10MB are rejected."""
    large_data = b"x" * (11 * 1024 * 1024)  # 11 MB
    files = {"file": ("large.txt", io.BytesIO(large_data), "text/plain")}
    res = client.post("/api/documents/upload", files=files, headers=agent_headers)
    assert res.status_code == 400
    assert "too large" in res.json()["detail"].lower()


def test_delete_document_requires_admin(client, agent_headers, admin_headers):
    """Only admins can delete documents."""
    # Upload as agent
    files = {"file": ("temp.txt", io.BytesIO(b"temp content"), "text/plain")}
    res = client.post("/api/documents/upload", files=files, headers=agent_headers)
    assert res.status_code == 201, res.text
    doc_id = res.json()["id"]

    # Agent cannot delete
    res_del_agent = client.delete(f"/api/documents/{doc_id}", headers=agent_headers)
    assert res_del_agent.status_code == 403

    # Admin can delete
    res_del_admin = client.delete(f"/api/documents/{doc_id}", headers=admin_headers)
    assert res_del_admin.status_code == 204