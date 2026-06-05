from datetime import datetime

from app.extensions import db


class Stadium(db.Model):
    __tablename__ = "stadiums"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(256), nullable=False)
    city = db.Column(db.String(128))
    country = db.Column(db.String(128))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    matches = db.relationship("Match", back_populates="stadium", lazy="dynamic")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "city": self.city,
            "country": self.country,
        }
