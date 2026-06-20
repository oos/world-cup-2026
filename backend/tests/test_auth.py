import re
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch
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
            "timezone": "America/Los_Angeles",
            "preferred_team_fifa_code": "BRA",
            "default_view_mode": "list",
            "match_reminders": True,
        },
    )
    assert patch_response.status_code == 200
    user = patch_response.get_json()["user"]
    assert user["display_name"] == "Alex Fan"
    assert user["city"] == "New York"
    assert user["timezone"] == "America/Los_Angeles"
    assert user["preferred_team_fifa_code"] == "BRA"
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


def test_password_login(client, app, auth_service):
    with app.app_context():
        from app.models.user import User

        user = User(email="password@example.com")
        auth_service.set_password(user, "secret-pass")
        db.session.add(user)
        db.session.commit()

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "password@example.com", "password": "secret-pass"},
    )
    assert login_response.status_code == 200
    assert login_response.get_json()["user"]["email"] == "password@example.com"

    me_response = client.get("/api/v1/auth/me")
    assert me_response.status_code == 200


def test_password_login_rejects_invalid_credentials(client, app, auth_service):
    with app.app_context():
        from app.models.user import User

        user = User(email="wrongpass@example.com")
        auth_service.set_password(user, "secret-pass")
        db.session.add(user)
        db.session.commit()

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "wrongpass@example.com", "password": "bad-password"},
    )
    assert response.status_code == 400
    assert "invalid" in response.get_json()["error"].lower()


def test_password_register(client):
    register_response = client.post(
        "/api/v1/auth/register",
        json={"email": "newuser@example.com", "password": "secret-pass"},
    )
    assert register_response.status_code == 201
    assert register_response.get_json()["user"]["email"] == "newuser@example.com"

    me_response = client.get("/api/v1/auth/me")
    assert me_response.status_code == 200


def test_password_register_rejects_duplicate_email(client, app, auth_service):
    with app.app_context():
        from app.models.user import User

        user = User(email="duplicate@example.com")
        auth_service.set_password(user, "secret-pass")
        db.session.add(user)
        db.session.commit()

    response = client.post(
        "/api/v1/auth/register",
        json={"email": "duplicate@example.com", "password": "another-pass"},
    )
    assert response.status_code == 400
    assert "already exists" in response.get_json()["error"].lower()


def test_google_oauth_start_requires_client_id(client):
    response = client.post("/api/v1/auth/oauth/google")
    assert response.status_code == 503
    assert "not configured" in response.get_json()["error"].lower()


def test_oauth_providers_lists_configured(client, app):
    app.config["GOOGLE_CLIENT_ID"] = "google-client-id"
    app.config["GOOGLE_CLIENT_SECRET"] = "google-client-secret"
    app.config["GITHUB_CLIENT_ID"] = ""
    app.config["GITHUB_CLIENT_SECRET"] = ""

    response = client.get("/api/v1/auth/oauth/providers")
    assert response.status_code == 200
    assert response.get_json()["providers"] == ["google"]


def test_google_oauth_callback_creates_user(client, app):
    app.config["GOOGLE_CLIENT_ID"] = "google-client-id"
    app.config["GOOGLE_CLIENT_SECRET"] = "google-client-secret"
    app.config["APP_DOMAIN"] = "http://localhost:5173"

    with patch("app.services.auth_service.httpx.post") as mock_post, patch(
        "app.services.auth_service.httpx.get"
    ) as mock_get:
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"access_token": "google-access-token"}
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "email": "google@example.com",
            "name": "Google User",
        }

        response = client.post(
            "/api/v1/auth/oauth/google/callback",
            json={"code": "google-oauth-code"},
        )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload["user"]["email"] == "google@example.com"
    assert payload["user"]["display_name"] == "Google User"

    me_response = client.get("/api/v1/auth/me")
    assert me_response.status_code == 200
    assert me_response.get_json()["user"]["email"] == "google@example.com"


def test_github_oauth_callback_uses_primary_email(client, app):
    app.config["GITHUB_CLIENT_ID"] = "github-client-id"
    app.config["GITHUB_CLIENT_SECRET"] = "github-client-secret"
    app.config["APP_DOMAIN"] = "http://localhost:5173"

    user_response = MagicMock()
    user_response.status_code = 200
    user_response.json.return_value = {
        "email": None,
        "login": "octocat",
        "name": "The Octocat",
    }

    emails_response = MagicMock()
    emails_response.status_code = 200
    emails_response.json.return_value = [
        {"email": "octocat@example.com", "primary": True, "verified": True},
    ]

    with patch("app.services.auth_service.httpx.post") as mock_post, patch(
        "app.services.auth_service.httpx.get"
    ) as mock_get:
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"access_token": "github-access-token"}

        def get_side_effect(url, **kwargs):
            if url.endswith("/user/emails"):
                return emails_response
            return user_response

        mock_get.side_effect = get_side_effect

        response = client.post(
            "/api/v1/auth/oauth/github/callback",
            json={"code": "github-oauth-code"},
        )

    assert response.status_code == 200
    assert response.get_json()["user"]["email"] == "octocat@example.com"
