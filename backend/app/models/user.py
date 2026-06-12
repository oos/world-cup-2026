from datetime import datetime
import json

from app.extensions import db

DEFAULT_MATCH_REMINDER_MINUTES = [15]


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    display_name = db.Column(db.String(128))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    profile = db.relationship(
        "UserProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    saved_items = db.relationship(
        "SavedItem",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    def to_dict(self) -> dict:
        profile = self.profile
        return {
            "id": self.id,
            "email": self.email,
            "display_name": self.display_name or self._default_display_name(),
            "city": profile.city if profile else "",
            "timezone": profile.timezone if profile else "",
            "preferred_team_fifa_code": profile.preferred_team_fifa_code if profile else "",
            "default_view_mode": profile.default_view_mode if profile else "grid",
            "match_reminders": profile.match_reminders if profile else False,
            "match_reminder_minutes": profile.match_reminder_minutes_list()
            if profile
            else DEFAULT_MATCH_REMINDER_MINUTES,
        }

    def _default_display_name(self) -> str:
        if self.email:
            return self.email.split("@")[0]
        return "User"

    def ensure_profile(self) -> "UserProfile":
        if self.profile is None:
            profile = UserProfile(user_id=self.id)
            db.session.add(profile)
            self.profile = profile
        return self.profile


class UserProfile(db.Model):
    __tablename__ = "user_profiles"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    city = db.Column(db.String(128), default="")
    timezone = db.Column(db.String(64), default="")
    preferred_team_fifa_code = db.Column(db.String(8), default="")
    default_view_mode = db.Column(db.String(16), default="grid", nullable=False)
    match_reminders = db.Column(db.Boolean, default=False, nullable=False)
    match_reminder_minutes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship("User", back_populates="profile")

    def match_reminder_minutes_list(self) -> list[int]:
        if not self.match_reminder_minutes:
            return DEFAULT_MATCH_REMINDER_MINUTES

        try:
            parsed = json.loads(self.match_reminder_minutes)
        except (TypeError, json.JSONDecodeError):
            return DEFAULT_MATCH_REMINDER_MINUTES

        return self.normalize_match_reminder_minutes(parsed)

    @staticmethod
    def normalize_match_reminder_minutes(minutes: list | None) -> list[int]:
        if not isinstance(minutes, list):
            return DEFAULT_MATCH_REMINDER_MINUTES

        normalized = sorted(
            {
                int(value)
                for value in minutes
                if isinstance(value, (int, float)) and int(value) > 0
            }
        )
        return normalized[:6] if normalized else DEFAULT_MATCH_REMINDER_MINUTES

    def set_match_reminder_minutes(self, minutes: list) -> None:
        self.match_reminder_minutes = json.dumps(
            self.normalize_match_reminder_minutes(minutes)
        )
