import pytest


def test_create_and_get_ticket(client, agent_headers):
    res = client.post(
        "/api/tickets",
        json={"title": "Cannot access dashboard", "description": "User gets error 500.", "urgency": "high", "category": "technical"},
        headers=agent_headers,
    )
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["title"] == "Cannot access dashboard"
    assert data["status"] == "open"
    ticket_id = data["id"]

    res_get = client.get(f"/api/tickets/{ticket_id}", headers=agent_headers)
    assert res_get.status_code == 200
    assert res_get.json()["id"] == ticket_id


def test_update_ticket(client, agent_headers):
    res = client.post(
        "/api/tickets",
        json={"title": "Pending question", "description": "Needs review"},
        headers=agent_headers,
    )
    assert res.status_code == 201, res.text
    ticket_id = res.json()["id"]

    res_patch = client.patch(
        f"/api/tickets/{ticket_id}",
        json={"status": "in_progress", "category": "billing", "urgency": "critical"},
        headers=agent_headers,
    )
    assert res_patch.status_code == 200
    updated = res_patch.json()
    assert updated["status"] == "in_progress"
    assert updated["category"] == "billing"


def test_list_tickets_and_filtering(client, agent_headers):
    client.post("/api/tickets", json={"title": "Alpha ticket", "description": "database connectivity", "urgency": "critical", "category": "technical"}, headers=agent_headers)
    client.post("/api/tickets", json={"title": "Beta ticket", "description": "Billing dispute", "urgency": "low", "category": "billing"}, headers=agent_headers)

    res = client.get("/api/tickets?urgency=critical", headers=agent_headers)
    assert res.status_code == 200
    data = res.json()
    assert all(t["urgency"] == "critical" for t in data["items"])

    res_cat = client.get("/api/tickets?category=billing", headers=agent_headers)
    assert res_cat.status_code == 200
    assert all(t["category"] == "billing" for t in res_cat.json()["items"])

    res_search = client.get("/api/tickets?search=database", headers=agent_headers)
    assert res_search.status_code == 200
    assert any("Alpha" in t["title"] for t in res_search.json()["items"])


def test_classify_ticket(client, agent_headers, mock_gemini):
    res = client.post(
        "/api/tickets",
        json={"title": "Payment gateway timeout", "description": "Credit card processing fails."},
        headers=agent_headers,
    )
    assert res.status_code == 201, res.text
    ticket_id = res.json()["id"]

    res_cls = client.post(f"/api/tickets/{ticket_id}/classify", headers=agent_headers)
    assert res_cls.status_code == 200, res_cls.text
    classified = res_cls.json()
    # Mock returns category=technical, urgency=high, confidence=0.95
    assert "category" in classified
    assert "urgency" in classified
    assert classified["confidence"] > 0


def test_delete_ticket(client, agent_headers):
    res = client.post(
        "/api/tickets",
        json={"title": "To be deleted", "description": "Temporary ticket"},
        headers=agent_headers,
    )
    assert res.status_code == 201, res.text
    ticket_id = res.json()["id"]

    res_del = client.delete(f"/api/tickets/{ticket_id}", headers=agent_headers)
    assert res_del.status_code == 204

    res_check = client.get(f"/api/tickets/{ticket_id}", headers=agent_headers)
    assert res_check.status_code == 404