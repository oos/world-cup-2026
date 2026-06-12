from datetime import datetime

from app.extensions import db


class PushSubscription(db.Model):
    __tablename__ = "push_subscriptions"

    id = db.Column(db.Integer, primary_key=True)
    endpoint = db.Column(db.Text, unique=True, nullable=False)
    p256dh = db.Column(db.Text, nullable=False)
    auth = db.Column(db.Text, nullable=False)
    timezone = db.Column(db.String(64))
    reminder_minutes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SentMatchNotification(db.Model):
    __tablename__ = "sent_match_notifications"

    id = db.Column(db.Integer, primary_key=True)
    match_id = db.Column(db.Integer, db.ForeignKey("matches.id"), nullable=False)
    subscription_id = db.Column(db.Integer, db.ForeignKey("push_subscriptions.id"), nullable=False)
    notification_type = db.Column(db.String(32), nullable=False)
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("match_id", "subscription_id", "notification_type"),
    )
