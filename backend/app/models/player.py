from datetime import date, datetime

from app.extensions import db


class Player(db.Model):
    __tablename__ = "players"

    id = db.Column(db.Integer, primary_key=True)
    wikidata_id = db.Column(db.String(32), unique=True, index=True)
    name = db.Column(db.String(256), nullable=False, index=True)
    position = db.Column(db.String(32))
    dob = db.Column(db.Date)
    height_cm = db.Column(db.Float)
    club = db.Column(db.String(256))
    image_url = db.Column(db.String(512))
    nationality = db.Column(db.String(128))
    data_sources = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    squad_memberships = db.relationship("SquadMember", back_populates="player", lazy="dynamic")

    def to_dict(
        self,
        jersey_number: int | None = None,
        team_name: str | None = None,
        team_fifa_code: str | None = None,
    ) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "position": self.position,
            "dob": self.dob.isoformat() if self.dob else None,
            "height_cm": self.height_cm,
            "club": self.club,
            "image_url": self.image_url,
            "nationality": self.nationality,
            "jersey_number": jersey_number,
            "team_name": team_name,
            "team_fifa_code": team_fifa_code,
            "data_sources": self.data_sources or {},
        }
