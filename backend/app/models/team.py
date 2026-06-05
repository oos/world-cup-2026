from datetime import datetime

from app.extensions import db


class Team(db.Model):
    __tablename__ = "teams"

    id = db.Column(db.Integer, primary_key=True)
    tournament_id = db.Column(db.Integer, db.ForeignKey("tournaments.id"), nullable=False)
    name = db.Column(db.String(128), nullable=False)
    name_normalised = db.Column(db.String(128))
    fifa_code = db.Column(db.String(8), unique=True, nullable=False, index=True)
    group_name = db.Column(db.String(16))
    confederation = db.Column(db.String(32))
    flag_icon = db.Column(db.String(32))
    continent = db.Column(db.String(64))
    wikidata_id = db.Column(db.String(32))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tournament = db.relationship("Tournament", back_populates="teams")
    squad_members = db.relationship("SquadMember", back_populates="team", lazy="dynamic")

    def to_dict(self, player_count: int = 0) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "fifa_code": self.fifa_code,
            "group": self.group_name,
            "confederation": self.confederation,
            "flag_icon": self.flag_icon,
            "continent": self.continent,
            "player_count": player_count,
        }
