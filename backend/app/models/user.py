from datetime import datetime

from app.extensions import db


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

    def to_dict(self) -> dict:
        profile = self.profile
        return {
            "id": self.id,
            "email": self.email,
            "display_name": self.display_name or self._default_display_name(),
            "city": profile.city if profile else "",
            "default_view_mode": profile.default_view_mode if profile else "grid",
            "match_reminders": profile.match_reminders if profile else False,
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
    default_view_mode = db.Column(db.String(16), default="grid", nullable=False)
    match_reminders = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship("User", back_populates="profile")
