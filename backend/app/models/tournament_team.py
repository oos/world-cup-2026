from datetime import datetime

from app.data.fifa_world_rankings_2026 import get_world_ranking_2026
from app.extensions import db


class TournamentTeam(db.Model):
    __tablename__ = "tournament_teams"

    id = db.Column(db.Integer, primary_key=True)
    tournament_id = db.Column(db.Integer, db.ForeignKey("tournaments.id"), nullable=False)
    # Nullable: club competitions reference clubs (via the fields below), not nations.
    nation_id = db.Column(db.Integer, db.ForeignKey("nations.id"), nullable=True, index=True)
    group_name = db.Column(db.String(16))
    confederation = db.Column(db.String(32))
    flag_icon = db.Column(db.String(32))
    # Club fields (used when nation_id is null).
    display_name = db.Column(db.String(128))
    short_code = db.Column(db.String(16))
    crest_url = db.Column(db.String(512))
    data_sources = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("tournament_id", "nation_id", name="uq_tournament_nation"),
    )

    tournament = db.relationship("Tournament", back_populates="tournament_teams")
    nation = db.relationship("Nation", back_populates="tournament_teams")
    squad_members = db.relationship("SquadMember", back_populates="team", lazy="dynamic")

    @property
    def is_club(self) -> bool:
        return self.nation_id is None

    @property
    def name(self) -> str:
        if self.nation:
            return self.nation.name
        return self.display_name or ""

    @property
    def fifa_code(self) -> str:
        if self.nation:
            return self.nation.fifa_code
        return self.short_code or ""

    @property
    def flag_iso(self) -> str | None:
        return self.nation.flag_iso if self.nation else None

    @property
    def continent(self) -> str | None:
        return self.nation.continent if self.nation else None

    def to_dict(self, player_count: int = 0) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "fifa_code": self.fifa_code,
            "flag_iso": self.flag_iso,
            "group": self.group_name,
            "confederation": self.confederation,
            "flag_icon": self.flag_icon,
            "continent": self.continent,
            "crest_url": self.crest_url,
            "is_club": self.is_club,
            "player_count": player_count,
            "world_ranking": get_world_ranking_2026(self.fifa_code) if self.nation else None,
        }
