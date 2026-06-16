from datetime import datetime

from app.extensions import db


class MatchLineup(db.Model):
    __tablename__ = "match_lineups"

    id = db.Column(db.Integer, primary_key=True)
    match_id = db.Column(db.Integer, db.ForeignKey("matches.id"), nullable=False, index=True)
    team_id = db.Column(db.Integer, db.ForeignKey("tournament_teams.id"), nullable=False, index=True)
    formation = db.Column(db.String(16))
    source = db.Column(db.String(32), nullable=False)
    synced_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("match_id", "team_id", name="uq_match_lineup_team"),
    )

    match = db.relationship("Match", back_populates="lineups")
    team = db.relationship("TournamentTeam")
    players = db.relationship(
        "MatchLineupPlayer",
        back_populates="match_lineup",
        cascade="all, delete-orphan",
    )


class MatchLineupPlayer(db.Model):
    __tablename__ = "match_lineup_players"

    id = db.Column(db.Integer, primary_key=True)
    match_lineup_id = db.Column(
        db.Integer,
        db.ForeignKey("match_lineups.id"),
        nullable=False,
        index=True,
    )
    player_id = db.Column(db.Integer, db.ForeignKey("players.id"), nullable=True)
    jersey_number = db.Column(db.Integer)
    position = db.Column(db.String(32))
    lineup_role = db.Column(db.String(16), nullable=False)
    grid = db.Column(db.String(16))
    display_name = db.Column(db.String(256))

    __table_args__ = (
        db.UniqueConstraint(
            "match_lineup_id",
            "jersey_number",
            name="uq_match_lineup_player_jersey",
        ),
    )

    match_lineup = db.relationship("MatchLineup", back_populates="players")
    player = db.relationship("Player")
