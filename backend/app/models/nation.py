from datetime import datetime

from app.extensions import db


class Nation(db.Model):
    __tablename__ = "nations"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False)
    fifa_code = db.Column(db.String(8), unique=True, nullable=False, index=True)
    flag_iso = db.Column(db.String(16))
    continent = db.Column(db.String(64))
    aliases = db.Column(db.JSON, default=list)
    wikidata_id = db.Column(db.String(32))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tournament_teams = db.relationship("TournamentTeam", back_populates="nation", lazy="dynamic")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "fifa_code": self.fifa_code,
            "flag_iso": self.flag_iso,
            "continent": self.continent,
        }
