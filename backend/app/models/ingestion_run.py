from datetime import datetime

from app.extensions import db


class IngestionRun(db.Model):
    __tablename__ = "ingestion_runs"

    id = db.Column(db.Integer, primary_key=True)
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    finished_at = db.Column(db.DateTime)
    source = db.Column(db.String(64), nullable=False)
    records_upserted = db.Column(db.Integer, default=0)
    gaps_filled = db.Column(db.Integer, default=0)
    errors = db.Column(db.JSON, default=list)
