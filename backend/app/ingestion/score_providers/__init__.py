"""Score provider adapters for multi-source live sync."""

from app.ingestion.score_providers.api_football import ApiFootballScoreProvider
from app.ingestion.score_providers.base import ScoreUpdate
from app.ingestion.score_providers.espn import EspnScoreProvider

__all__ = ["ApiFootballScoreProvider", "EspnScoreProvider", "ScoreUpdate"]
