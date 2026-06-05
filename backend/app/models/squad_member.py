from datetime import datetime

from app.extensions import db


class SquadMember(db.Model):
    __tablename__ = "squad_members"

    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, db.ForeignKey("teams.id"), nullable=False, index=True)
    player_id = db.Column(db.Integer, db.ForeignKey("players.id"), nullable=False, index=True)
    jersey_number = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint("team_id", "player_id", name="uq_team_player"),)

    team = db.relationship("Team", back_populates="squad_members")
    player = db.relationship("Player", back_populates="squad_memberships")
