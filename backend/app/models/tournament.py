from datetime import datetime

from app.extensions import db


class Tournament(db.Model):
    __tablename__ = "tournaments"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False)
    year = db.Column(db.Integer, nullable=False, index=True)
    external_key = db.Column(db.String(64), unique=True, nullable=False)
    synced_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    tournament_teams = db.relationship("TournamentTeam", back_populates="tournament", lazy="dynamic")
    matches = db.relationship("Match", back_populates="tournament", lazy="dynamic")
