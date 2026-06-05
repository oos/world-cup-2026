from datetime import date, datetime

from app.extensions import db


class Match(db.Model):
    __tablename__ = "matches"

    id = db.Column(db.Integer, primary_key=True)
    tournament_id = db.Column(db.Integer, db.ForeignKey("tournaments.id"), nullable=False)
    round = db.Column(db.String(64))
    match_number = db.Column(db.Integer)
    match_date = db.Column(db.Date)
    match_time = db.Column(db.String(32))
    team1_id = db.Column(db.Integer, db.ForeignKey("teams.id"))
    team2_id = db.Column(db.Integer, db.ForeignKey("teams.id"))
    group_name = db.Column(db.String(16))
    stadium_id = db.Column(db.Integer, db.ForeignKey("stadiums.id"))
    score = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tournament = db.relationship("Tournament", back_populates="matches")
    team1 = db.relationship("Team", foreign_keys=[team1_id])
    team2 = db.relationship("Team", foreign_keys=[team2_id])
    stadium = db.relationship("Stadium", back_populates="matches")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "round": self.round,
            "match_number": self.match_number,
            "date": self.match_date.isoformat() if self.match_date else None,
            "time": self.match_time,
            "group": self.group_name,
            "team1": self.team1.to_dict() if self.team1 else None,
            "team2": self.team2.to_dict() if self.team2 else None,
            "stadium": self.stadium.to_dict() if self.stadium else None,
            "score": self.score,
        }
