from datetime import datetime

from app.extensions import db


class Tournament(db.Model):
    __tablename__ = "tournaments"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False)
    year = db.Column(db.Integer, nullable=False, index=True)
    external_key = db.Column(db.String(64), unique=True, nullable=False)
    # Competition taxonomy (multi-competition support).
    kind = db.Column(db.String(32), default="international")
    format = db.Column(db.String(40), default="groups_knockout")
    country = db.Column(db.String(64))
    confederation = db.Column(db.String(32))
    tier = db.Column(db.Integer)
    season_label = db.Column(db.String(32))
    logo_url = db.Column(db.String(512))
    layout_config = db.Column(db.JSON, default=dict)
    sort_order = db.Column(db.Integer, default=100)
    synced_at = db.Column(db.DateTime)
    data_sources = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    tournament_teams = db.relationship("TournamentTeam", back_populates="tournament", lazy="dynamic")
    matches = db.relationship("Match", back_populates="tournament", lazy="dynamic")

    @property
    def slug(self) -> str:
        return self.external_key

    @property
    def region_key(self) -> str:
        """Grouping key for the competition selector."""
        if self.kind == "international":
            return "world"
        if self.kind == "continental":
            return (self.confederation or "continental").lower()
        return (self.country or "other").lower()

    @property
    def region_label(self) -> str:
        if self.kind == "international":
            return "World"
        if self.kind == "continental":
            return self.confederation or "Continental"
        return self.country or "Other"

    def to_dict(self) -> dict:
        return {
            "slug": self.external_key,
            "name": self.name,
            "year": self.year,
            "kind": self.kind,
            "format": self.format,
            "country": self.country,
            "confederation": self.confederation,
            "tier": self.tier,
            "season_label": self.season_label,
            "logo_url": self.logo_url,
            "layout_config": self.layout_config or {},
            "region_key": self.region_key,
            "region_label": self.region_label,
            "sort_order": self.sort_order if self.sort_order is not None else 100,
        }
