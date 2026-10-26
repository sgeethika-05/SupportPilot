import pytest
from app.services.evaluation_service import (
    calculate_recall_at_k,
    evaluate_groundedness,
    run_evaluation,
)


def test_recall_at_k_calculation():
    chunks = [
        {"content": "Users can reset passwords via the forgot password link on login page."},
        {"content": "Session timeouts are 30 minutes of inactivity."},
    ]
    # Matching keywords
    recall = calculate_recall_at_k(chunks, "Reset password forgot link")
    assert recall >= 0.5  # at least half of >3-char keywords found

    # No match
    assert calculate_recall_at_k(chunks, "Quantum computing superconductor") == 0.0

    # Empty expected = perfect
    assert calculate_recall_at_k(chunks, "") == 1.0


def test_groundedness_scoring_supported():
    context = [{"content": "Refunds within 30 days of purchase by contacting billing support."}]
    answer = "According to [Source 1], request a refund within 30 days by contacting billing support."
    groundedness, has_unsupported, citation_prec = evaluate_groundedness(answer, context)
    assert groundedness >= 0.5
    assert not has_unsupported
    assert citation_prec == 1.0


def test_groundedness_scoring_unsupported():
    context = [{"content": "We support English and Spanish interfaces."}]
    answer = "Our servers are hosted on quantum machines in Antarctica with laser links."
    groundedness, has_unsupported, citation_prec = evaluate_groundedness(answer, context)
    assert groundedness < 0.6
    assert has_unsupported is True


def test_citation_validation():
    context = [{"id": "c1", "content": "Chunk one."}, {"id": "c2", "content": "Chunk two."}]
    _, _, valid_prec = evaluate_groundedness("Verified in [Source 1] and [Source 2].", context)
    assert valid_prec == 1.0
    _, _, invalid_prec = evaluate_groundedness("Claimed in [Source 8].", context)
    assert invalid_prec == 0.0


def test_evaluation_api_endpoints(client, agent_headers, mock_gemini):
    res = client.post(
        "/api/evaluations",
        json={"name": "Test Eval", "query": "How to reset password?", "expected_answer": "click forgot password", "top_k": 3},
        headers=agent_headers,
    )
    assert res.status_code == 201, res.text
    data = res.json()
    assert "groundedness_score" in data
    assert "recall_at_k" in data

    res_list = client.get("/api/evaluations", headers=agent_headers)
    assert res_list.status_code == 200
    assert len(res_list.json()) >= 1

    res_suite = client.post("/api/evaluations/run-suite", json={}, headers=agent_headers)
    assert res_suite.status_code == 200
    suite = res_suite.json()
    assert "total_evaluations" in suite
    assert "avg_latency_ms" in suite