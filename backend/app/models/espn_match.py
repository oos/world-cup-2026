from datetime import date, datetime

from app.extensions import db


class EspnMatch(db.Model):
    __tablename__ = "espn_matches"

    id = db.Column(db.Integer, primary_key=True)
    espn_game_id = db.Column(db.String(32), unique=True, nullable=False, index=True)
    year = db.Column(db.Integer, index=True)
    match_date = db.Column(db.Date, index=True)
    home_team = db.Column(db.String(128))
    away_team = db.Column(db.String(128))
    match_id = db.Column(db.Integer, db.ForeignKey("matches.id"), nullable=True, index=True)
    history_match_key = db.Column(db.String(256), nullable=True, index=True)
    commentary_synced_at = db.Column(db.DateTime)
    commentary_event_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    match = db.relationship("Match", backref=db.backref("espn_link", uselist=False))
    events = db.relationship(
        "MatchCommentaryEvent",
        back_populates="espn_match",
        cascade="all, delete-orphan",
        order_by="MatchCommentaryEvent.sequence",
    )

    def to_dict(self) -> dict:
        return {
            "espn_game_id": self.espn_game_id,
            "year": self.year,
            "date": self.match_date.isoformat() if self.match_date else None,
            "home_team": self.home_team,
            "away_team": self.away_team,
            "match_id": self.match_id,
            "history_match_key": self.history_match_key,
            "commentary_synced_at": (
                self.commentary_synced_at.isoformat() if self.commentary_synced_at else None
            ),
            "commentary_event_count": self.commentary_event_count or 0,
        }


class MatchCommentaryEvent(db.Model):
    __tablename__ = "match_commentary_events"

    id = db.Column(db.Integer, primary_key=True)
    espn_match_id = db.Column(db.Integer, db.ForeignKey("espn_matches.id"), nullable=False)
    sequence = db.Column(db.Integer, nullable=False)
    period = db.Column(db.Integer)
    clock_display = db.Column(db.String(32))
    clock_value = db.Column(db.Float)
    event_type = db.Column(db.String(64))
    text = db.Column(db.Text, nullable=False)
    is_key_event = db.Column(db.Boolean, default=False, nullable=False)
    raw = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    espn_match = db.relationship("EspnMatch", back_populates="events")

    __table_args__ = (
        db.UniqueConstraint("espn_match_id", "sequence", name="uq_commentary_match_sequence"),
    )

    def to_dict(self) -> dict:
        return {
            "sequence": self.sequence,
            "period": self.period,
            "clock": self.clock_display,
            "event_type": self.event_type,
            "text": self.text,
            "is_key_event": self.is_key_event,
        }
