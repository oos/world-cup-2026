import re
from datetime import datetime, timedelta
from urllib.parse import parse_qs, urlparse

import pytest

from app.extensions import db
from app.models.auth_token import AuthToken
from app.services.auth_service import AuthService, SESSION_COOKIE_NAME


@pytest.fixture
def auth_service(app):
    return AuthService(app)


def _extract_token(callback_url: str) -> str:
    query = parse_qs(urlparse(callback_url).query)
    return query["token"][0]


def test_magic_link_verify_and_me(client, auth_service):
    callback_url = auth_service.create_magic_link("user@example.com")
    token = _extract_token(callback_url)

    verify_response = client.post("/api/v1/auth/verify", json={"token": token})
    assert verify_response.status_code == 200
    payload = verify_response.get_json()
    assert payload["user"]["email"] == "user@example.com"

    me_response = client.get("/api/v1/auth/me")
    assert me_response.status_code == 200
    assert me_response.get_json()["user"]["email"] == "user@example.com"


def test_expired_token_rejected(client, app):
    raw_token = "expired-token-value"
    with app.app_context():
        db.session.add(
            AuthToken(
                email="expired@example.com",
                token_hash=AuthService._hash_token(raw_token),
                expires_at=datetime.utcnow() - timedelta(minutes=1),
            )
        )
        db.session.commit()

    response = client.post("/api/v1/auth/verify", json={"token": raw_token})
    assert response.status_code == 400
    assert "expired" in response.get_json()["error"].lower()


def test_used_token_rejected(client, auth_service):
    callback_url = auth_service.create_magic_link("reuse@example.com")
    token = _extract_token(callback_url)

    first = client.post("/api/v1/auth/verify", json={"token": token})
    assert first.status_code == 200

    second = client.post("/api/v1/auth/verify", json={"token": token})
    assert second.status_code == 400
    assert "already been used" in second.get_json()["error"].lower()


def test_profile_patch_persists(client, auth_service):
    callback_url = auth_service.create_magic_link("profile@example.com")
    token = _extract_token(callback_url)
    client.post("/api/v1/auth/verify", json={"token": token})

    patch_response = client.patch(
        "/api/v1/auth/me",
        json={
            "display_name": "Alex Fan",
            "city": "New York",
            "default_view_mode": "list",
            "match_reminders": True,
        },
    )
    assert patch_response.status_code == 200
    user = patch_response.get_json()["user"]
    assert user["display_name"] == "Alex Fan"
    assert user["city"] == "New York"
    assert user["default_view_mode"] == "list"
    assert user["match_reminders"] is True


def test_logout_clears_session(client, auth_service):
    callback_url = auth_service.create_magic_link("logout@example.com")
    token = _extract_token(callback_url)
    client.post("/api/v1/auth/verify", json={"token": token})

    logout_response = client.post("/api/v1/auth/logout")
    assert logout_response.status_code == 200

    me_response = client.get("/api/v1/auth/me")
    assert me_response.status_code == 401
