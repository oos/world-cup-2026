from datetime import date, datetime

from app.extensions import db


from app.ingestion.player_minutes_store import player_minutes_for_match


class Match(db.Model):
    __tablename__ = "matches"

    id = db.Column(db.Integer, primary_key=True)
    tournament_id = db.Column(db.Integer, db.ForeignKey("tournaments.id"), nullable=False, index=True)
    round = db.Column(db.String(64))
    stage = db.Column(db.String(32))
    leg = db.Column(db.Integer)
    match_number = db.Column(db.Integer)
    match_date = db.Column(db.Date, index=True)
    match_time = db.Column(db.String(32))
    team1_id = db.Column(db.Integer, db.ForeignKey("tournament_teams.id"))
    team2_id = db.Column(db.Integer, db.ForeignKey("tournament_teams.id"))
    group_name = db.Column(db.String(16))
    stadium_id = db.Column(db.Integer, db.ForeignKey("stadiums.id"))
    stadium_name = db.Column(db.String(256))
    score = db.Column(db.JSON)
    goals1 = db.Column(db.JSON)
    goals2 = db.Column(db.JSON)
    match_key = db.Column(db.String(256), index=True)
    api_football_fixture_id = db.Column(db.Integer, index=True)
    data_sources = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tournament = db.relationship("Tournament", back_populates="matches")
    team1 = db.relationship("TournamentTeam", foreign_keys=[team1_id])
    team2 = db.relationship("TournamentTeam", foreign_keys=[team2_id])
    stadium = db.relationship("Stadium", back_populates="matches")
    lineups = db.relationship("MatchLineup", back_populates="match", lazy="dynamic")

    def to_dict(self) -> dict:
        from app.ingestion.score_merge import finalize_score_if_complete

        minutes1, minutes2 = player_minutes_for_match(self)
        score = finalize_score_if_complete(self.score) if self.score else self.score
        return {
            "id": self.id,
            "round": self.round,
            "stage": self.stage,
            "leg": self.leg,
            "match_number": self.match_number,
            "date": self.match_date.isoformat() if self.match_date else None,
            "time": self.match_time,
            "group": self.group_name,
            "team1": self.team1.to_dict() if self.team1 else None,
            "team2": self.team2.to_dict() if self.team2 else None,
            "stadium": (
                self.stadium.to_dict()
                if self.stadium
                else (
                    {"name": self.stadium_name, "city": None, "country": None}
                    if self.stadium_name
                    else None
                )
            ),
            "score": score,
            "goals1": self.goals1 or [],
            "goals2": self.goals2 or [],
            "player_minutes1": minutes1,
            "player_minutes2": minutes2,
        }
