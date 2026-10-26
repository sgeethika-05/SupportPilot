import pytest


def test_dashboard_stats(client, agent_headers):
    res = client.get("/api/dashboard/stats", headers=agent_headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_tickets" in data
    assert "open_tickets" in data
    assert "urgency_distribution" in data
