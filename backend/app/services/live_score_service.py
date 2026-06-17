"""Backward-compatible entry point; implementation lives in score_sync_service."""

from app.services.score_sync_service import LiveScoreService, ScoreSyncService

__all__ = ["LiveScoreService", "ScoreSyncService"]
