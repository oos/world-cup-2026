from app.ingestion.dto import GapReport
from app.repositories.match_repository import MatchRepository
from app.repositories.player_repository import PlayerRepository
from app.repositories.team_repository import TeamRepository


class GapDetector:
    def __init__(self) -> None:
        self.team_repo = TeamRepository()
        self.player_repo = PlayerRepository()
        self.match_repo = MatchRepository()

    def detect(self) -> GapReport:
        low_squad = [
            t.fifa_code for t in self.team_repo.teams_with_low_squad_count(min_players=15)
        ]
        missing_fields = [p.id for p in self.player_repo.players_missing_fields()]
        missing_scores = [m.id for m in self.match_repo.matches_missing_scores()]
        return GapReport(
            teams_low_squad=low_squad,
            players_missing_fields=missing_fields,
            matches_missing_scores=missing_scores,
        )
