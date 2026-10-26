import io
import pytest


def test_rag_semantic_search_and_stats(client, agent_headers, mock_gemini):
    """RAG search endpoint works and returns correct response shape."""
    # Upload a doc
    doc_text = b"Refund policy: customers may request refunds within 30 days."
    files = {"file": ("refund_policy.txt", io.BytesIO(doc_text), "text/plain")}
    client.post("/api/documents/upload", files=files, headers=agent_headers)

    # Perform search - mock returns empty results (no real embedding in tests)
    res = client.post(
        "/api/rag/search",
        json={"query": "refund policy", "top_k": 3, "min_similarity": 0.1},
        headers=agent_headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert "results" in data
    # Results may be empty in test (mock embedding), structure is what matters
    assert isinstance(data["results"], list)

    # Stats endpoint
    res_stats = client.get("/api/rag/stats", headers=agent_headers)
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert "total_documents" in stats or "total_chunks" in stats