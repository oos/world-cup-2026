import hashlib
import logging
import secrets
from datetime import datetime, timedelta

import httpx
from flask import current_app
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from sqlalchemy import select
from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db
from app.models.auth_token import AuthToken
from app.models.user import User

logger = logging.getLogger(__name__)

SESSION_COOKIE_NAME = "wc26_session"
GITHUB_API_USER_AGENT = "wc26-auth"


class AuthService:
    def __init__(self, app=None):
        self.app = app

    def _serializer(self) -> URLSafeTimedSerializer:
        app = self.app or current_app
        return URLSafeTimedSerializer(app.config["SECRET_KEY"], salt="wc26-auth-session")

    def _token_ttl(self) -> timedelta:
        app = self.app or current_app
        minutes = int(app.config.get("AUTH_TOKEN_TTL_MINUTES", 15))
        return timedelta(minutes=minutes)

    def _session_max_age(self) -> int:
        app = self.app or current_app
        return int(app.config.get("SESSION_COOKIE_MAX_AGE", 2592000))

    @staticmethod
    def _hash_token(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    @staticmethod
    def _normalise_email(email: str) -> str:
        return email.strip().lower()

    def create_magic_link(self, email: str) -> str:
        app = self.app or current_app
        normalised = self._normalise_email(email)
        if not normalised or "@" not in normalised:
            raise ValueError("Invalid email address")

        raw_token = secrets.token_urlsafe(32)
        token = AuthToken(
            email=normalised,
            token_hash=self._hash_token(raw_token),
            expires_at=datetime.utcnow() + self._token_ttl(),
        )
        db.session.add(token)
        db.session.commit()

        callback_url = f"{app.config['APP_DOMAIN'].rstrip('/')}/auth/callback?token={raw_token}"
        self._send_magic_link_email(normalised, callback_url)
        return callback_url

    def authenticate_with_password(self, email: str, password: str) -> User:
        normalised = self._normalise_email(email)
        if not normalised or "@" not in normalised:
            raise ValueError("Invalid email or password")

        password_value = password.strip()
        if not password_value:
            raise ValueError("Password is required")

        user = db.session.scalars(
            select(User).where(User.email == normalised)
        ).first()
        if user is None or not user.password_hash:
            raise ValueError("Invalid email or password")
        if not check_password_hash(user.password_hash, password_value):
            raise ValueError("Invalid email or password")

        user.ensure_profile()
        return user

    def set_password(self, user: User, password: str) -> None:
        password_value = password.strip()
        if not password_value:
            raise ValueError("Password is required")
        user.password_hash = generate_password_hash(password_value)

    def register_with_password(self, email: str, password: str) -> User:
        normalised = self._normalise_email(email)
        if not normalised or "@" not in normalised:
            raise ValueError("Invalid email address")

        existing = db.session.scalars(
            select(User).where(User.email == normalised)
        ).first()
        if existing is not None:
            raise ValueError("An account with this email already exists")

        user = User(email=normalised)
        self.set_password(user, password)
        db.session.add(user)
        db.session.flush()
        user.ensure_profile()
        db.session.commit()
        return user

    def verify_magic_link(self, raw_token: str) -> User:
        token_hash = self._hash_token(raw_token)
        auth_token = db.session.scalars(
            select(AuthToken).where(AuthToken.token_hash == token_hash)
        ).first()

        if auth_token is None:
            raise ValueError("Invalid or expired sign-in link")
        if auth_token.is_used:
            raise ValueError("This sign-in link has already been used")
        if auth_token.is_expired:
            raise ValueError("This sign-in link has expired")

        auth_token.used_at = datetime.utcnow()

        user = db.session.scalars(
            select(User).where(User.email == auth_token.email)
        ).first()
        if user is None:
            user = User(email=auth_token.email)
            db.session.add(user)
            db.session.flush()
            user.ensure_profile()
        elif user.profile is None:
            user.ensure_profile()

        db.session.commit()
        return user

    def issue_session_cookie(self, response, user: User):
        app = self.app or current_app
        token = self._serializer().dumps({"user_id": user.id})
        response.set_cookie(
            SESSION_COOKIE_NAME,
            token,
            max_age=self._session_max_age(),
            httponly=True,
            secure=not app.config.get("DEBUG", False),
            samesite="Lax",
            path="/",
        )

    def clear_session_cookie(self, response):
        response.set_cookie(
            SESSION_COOKIE_NAME,
            "",
            max_age=0,
            httponly=True,
            secure=not (self.app or current_app).config.get("DEBUG", False),
            samesite="Lax",
            path="/",
        )

    def get_user_from_cookie(self, cookie_value: str | None) -> User | None:
        if not cookie_value:
            return None

        try:
            data = self._serializer().loads(
                cookie_value,
                max_age=self._session_max_age(),
            )
        except (BadSignature, SignatureExpired):
            return None

        user_id = data.get("user_id")
        if not user_id:
            return None

        return db.session.get(User, user_id)

    def update_profile(self, user: User, payload: dict) -> User:
        profile = user.ensure_profile()

        if "display_name" in payload:
            name = str(payload["display_name"]).strip()
            user.display_name = name or None

        if "city" in payload:
            profile.city = str(payload["city"]).strip()

        if "timezone" in payload:
            profile.timezone = str(payload["timezone"]).strip()

        if "preferred_team_fifa_code" in payload:
            profile.preferred_team_fifa_code = str(payload["preferred_team_fifa_code"]).strip()

        if "default_view_mode" in payload:
            mode = str(payload["default_view_mode"]).strip()
            profile.default_view_mode = "list" if mode == "list" else "grid"

        if "match_reminders" in payload:
            profile.match_reminders = bool(payload["match_reminders"])

        if "match_reminder_minutes" in payload:
            minutes = payload["match_reminder_minutes"]
            if isinstance(minutes, list):
                profile.set_match_reminder_minutes(minutes)

        db.session.commit()
        return user

    def _send_magic_link_email(self, email: str, callback_url: str) -> None:
        app = self.app or current_app
        api_key = app.config.get("RESEND_API_KEY", "")
        from_email = app.config.get("AUTH_FROM_EMAIL", "")

        if not api_key or not from_email:
            logger.info("Magic link for %s (dev): %s", email, callback_url)
            return

        subject = "Sign in to World Cup stats"
        html = (
            "<p>Click the link below to sign in. It expires in "
            f"{int(app.config.get('AUTH_TOKEN_TTL_MINUTES', 15))} minutes.</p>"
            f'<p><a href="{callback_url}">Sign in</a></p>'
            f"<p>Or copy this URL:<br>{callback_url}</p>"
        )

        response = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": from_email,
                "to": [email],
                "subject": subject,
                "html": html,
            },
            timeout=30.0,
        )
        response.raise_for_status()

    def configured_oauth_providers(self) -> list[str]:
        app = self.app or current_app
        providers: list[str] = []

        if app.config.get("GOOGLE_CLIENT_ID", "") and app.config.get("GOOGLE_CLIENT_SECRET", ""):
            providers.append("google")

        if app.config.get("GITHUB_CLIENT_ID", "") and app.config.get("GITHUB_CLIENT_SECRET", ""):
            providers.append("github")

        return providers

    def _github_api_headers(self, access_token: str) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
            "User-Agent": GITHUB_API_USER_AGENT,
        }

    def _oauth_redirect_uri(self) -> str:
        app = self.app or current_app
        return f"{app.config['APP_DOMAIN'].rstrip('/')}/auth/callback"

    def _oauth_state(self, provider: str) -> str:
        return f"{provider}:{secrets.token_urlsafe(16)}"

    @staticmethod
    def parse_oauth_state(state: str | None) -> str | None:
        if not state:
            return None
        provider = state.split(":", 1)[0].strip().lower()
        if provider in {"google", "github"}:
            return provider
        return None

    def _user_from_oauth_identity(
        self,
        email: str,
        display_name: str | None = None,
    ) -> User:
        normalised = self._normalise_email(email)
        if not normalised or "@" not in normalised:
            raise ValueError("Provider did not return an email address")

        user = db.session.scalars(select(User).where(User.email == normalised)).first()
        if user is None:
            user = User(email=normalised)
            db.session.add(user)
            db.session.flush()
            user.ensure_profile()
        elif user.profile is None:
            user.ensure_profile()

        if display_name and not user.display_name:
            user.display_name = display_name.strip() or None

        db.session.commit()
        return user

    def complete_oauth(self, provider: str, code: str) -> User:
        code_value = code.strip()
        if not code_value:
            raise ValueError("Missing OAuth code")

        if provider == "google":
            return self._complete_google_oauth(code_value)
        if provider == "github":
            return self._complete_github_oauth(code_value)

        raise ValueError("Unsupported provider")

    def _complete_google_oauth(self, code: str) -> User:
        app = self.app or current_app
        client_id = app.config.get("GOOGLE_CLIENT_ID", "")
        client_secret = app.config.get("GOOGLE_CLIENT_SECRET", "")
        if not client_id or not client_secret:
            raise ValueError("Google sign-in is not configured yet.")

        redirect_uri = self._oauth_redirect_uri()
        token_response = httpx.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            timeout=30.0,
        )
        if token_response.status_code != 200:
            logger.warning("Google token exchange failed: %s", token_response.text)
            raise ValueError("Could not complete Google sign-in")

        access_token = token_response.json().get("access_token")
        if not access_token:
            raise ValueError("Could not complete Google sign-in")

        userinfo_response = httpx.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=30.0,
        )
        if userinfo_response.status_code != 200:
            logger.warning("Google userinfo failed: %s", userinfo_response.text)
            raise ValueError("Could not complete Google sign-in")

        userinfo = userinfo_response.json()
        return self._user_from_oauth_identity(
            str(userinfo.get("email", "")),
            str(userinfo.get("name", "")) if userinfo.get("name") else None,
        )

    def _complete_github_oauth(self, code: str) -> User:
        app = self.app or current_app
        client_id = app.config.get("GITHUB_CLIENT_ID", "")
        client_secret = app.config.get("GITHUB_CLIENT_SECRET", "")
        if not client_id or not client_secret:
            raise ValueError("GitHub sign-in is not configured yet.")

        redirect_uri = self._oauth_redirect_uri()
        token_response = httpx.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
            },
            headers={"Accept": "application/json"},
            timeout=30.0,
        )
        if token_response.status_code != 200:
            logger.warning("GitHub token exchange failed: %s", token_response.text)
            raise ValueError("Could not complete GitHub sign-in")

        access_token = token_response.json().get("access_token")
        if not access_token:
            raise ValueError("Could not complete GitHub sign-in")

        user_response = httpx.get(
            "https://api.github.com/user",
            headers=self._github_api_headers(access_token),
            timeout=30.0,
        )
        if user_response.status_code != 200:
            logger.warning("GitHub user lookup failed: %s", user_response.text)
            raise ValueError("Could not complete GitHub sign-in")

        github_user = user_response.json()
        email = github_user.get("email")
        if not email:
            emails_response = httpx.get(
                "https://api.github.com/user/emails",
                headers=self._github_api_headers(access_token),
                timeout=30.0,
            )
            if emails_response.status_code != 200:
                logger.warning("GitHub email lookup failed: %s", emails_response.text)
                raise ValueError("Could not complete GitHub sign-in")

            emails = emails_response.json()
            primary = next(
                (entry for entry in emails if entry.get("primary") and entry.get("verified")),
                None,
            )
            verified = next(
                (entry for entry in emails if entry.get("verified")),
                None,
            )
            chosen = primary or verified
            email = chosen.get("email") if chosen else None

        display_name = github_user.get("name") or github_user.get("login")
        return self._user_from_oauth_identity(
            str(email or ""),
            str(display_name) if display_name else None,
        )

    def get_oauth_start_url(self, provider: str) -> str:
        app = self.app or current_app
        redirect_uri = self._oauth_redirect_uri()
        state = self._oauth_state(provider)

        if provider == "google":
            client_id = app.config.get("GOOGLE_CLIENT_ID", "")
            client_secret = app.config.get("GOOGLE_CLIENT_SECRET", "")
            if not client_id or not client_secret:
                raise ValueError("Google sign-in is not configured yet.")
            params = {
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "response_type": "code",
                "scope": "openid email profile",
                "prompt": "select_account",
                "state": state,
            }
            query = httpx.QueryParams(params)
            return f"https://accounts.google.com/o/oauth2/v2/auth?{query}"

        if provider == "apple":
            if not app.config.get("APPLE_CLIENT_ID", ""):
                raise ValueError("Apple sign-in is not configured yet.")
            raise ValueError("Apple sign-in is not configured yet.")

        if provider == "github":
            client_id = app.config.get("GITHUB_CLIENT_ID", "")
            client_secret = app.config.get("GITHUB_CLIENT_SECRET", "")
            if not client_id or not client_secret:
                raise ValueError("GitHub sign-in is not configured yet.")
            params = {
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "scope": "user:email",
                "state": state,
            }
            query = httpx.QueryParams(params)
            return f"https://github.com/login/oauth/authorize?{query}"

        raise ValueError("Unsupported provider")
