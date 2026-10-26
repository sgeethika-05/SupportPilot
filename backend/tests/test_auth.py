import pytest

DEMO_PASSWORD = "pass1234"


def test_register_user(client):
    """Registration returns an access token."""
    response = client.post(
        "/api/auth/register",
        json={"email": "newuser@test.com", "name": "New User", "password": DEMO_PASSWORD, "role": "agent"},
    )
    assert response.status_code == 201, response.text
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_register_duplicate_email(client, agent_user):
    """Duplicate email returns 400."""
    response = client.post(
        "/api/auth/register",
        json={"email": agent_user.email, "name": "Dup", "password": DEMO_PASSWORD, "role": "agent"},
    )
    assert response.status_code == 400
    assert "already" in response.json()["detail"].lower()


def test_login_success(client, agent_user):
    """JSON login returns access token."""
    response = client.post(
        "/api/auth/login",
        json={"email": agent_user.email, "password": DEMO_PASSWORD},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_password(client, agent_user):
    """Wrong password returns 401."""
    response = client.post(
        "/api/auth/login",
        json={"email": agent_user.email, "password": "wrongpassword"},
    )
    assert response.status_code == 401


def test_get_me(client, agent_headers, agent_user):
    """GET /auth/me returns authenticated user info."""
    response = client.get("/api/auth/me", headers=agent_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == agent_user.email
    assert data["id"] == str(agent_user.id)


def test_invalid_token(client):
    """Invalid token returns 401."""
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer bad.token.here"})
    assert response.status_code == 401