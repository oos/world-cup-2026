from datetime import datetime

from app.extensions import db


class SavedItem(db.Model):
    __tablename__ = "saved_items"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    item_type = db.Column(db.String(16), nullable=False)
    item_id = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship("User", back_populates="saved_items")

    __table_args__ = (
        db.UniqueConstraint("user_id", "item_type", "item_id", name="uq_saved_items_user_item"),
    )
