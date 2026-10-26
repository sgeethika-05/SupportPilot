import pytest


def test_draft_workflow_create_approve_reject_regenerate(client, agent_headers, mock_gemini):
    # 1. Create ticket
    res_ticket = client.post(
        "/api/tickets",
        json={"title": "How to export data", "description": "Need step by step instructions"},
        headers=agent_headers,
    )
    assert res_ticket.status_code == 201, res_ticket.text
    ticket_id = res_ticket.json()["id"]

    # 2. Generate draft via /api/drafts (POST)
    res_draft = client.post(
        "/api/drafts",
        json={"ticket_id": ticket_id},
        headers=agent_headers,
    )
    assert res_draft.status_code == 201, res_draft.text
    draft_data = res_draft.json()
    assert "DRAFT" in draft_data.get("content", "")
    assert draft_data["status"] == "draft"
    draft_id = draft_data["id"]

    # 3. List drafts for ticket
    res_list = client.get(f"/api/drafts?ticket_id={ticket_id}", headers=agent_headers)
    assert res_list.status_code == 200
    items = res_list.json().get("items", res_list.json())
    assert len(items) >= 1

    # 4. Reject with reason
    res_reject = client.post(
        f"/api/drafts/{draft_id}/reject",
        json={"reason": "Missing export formats."},
        headers=agent_headers,
    )
    assert res_reject.status_code == 200, res_reject.text
    rejected = res_reject.json()
    assert rejected["status"] == "rejected"

    # 5. Regenerate
    res_regen = client.post(f"/api/drafts/{draft_id}/regenerate", headers=agent_headers)
    assert res_regen.status_code == 200, res_regen.text
    regen_data = res_regen.json()
    assert regen_data["regeneration_count"] >= 1

    # 6. Approve the regenerated draft
    res_app = client.post(f"/api/drafts/{draft_id}/approve", headers=agent_headers)
    assert res_app.status_code == 200, res_app.text
    assert res_app.json()["status"] == "approved"