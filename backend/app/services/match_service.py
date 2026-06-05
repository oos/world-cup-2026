from app.repositories.match_repository import MatchRepository
from app.services.lineup_service import LineupService
from app.services.squad_service import SquadService


class MatchService:
    def __init__(self) -> None:
        self.match_repo = MatchRepository()
        self.squad_service = SquadService()
        self.lineup_service = LineupService()

    def list_matches(self, group: str | None = None) -> list[dict]:
        return [m.to_dict() for m in self.match_repo.list_by_group(group)]

    def get_match(self, match_id: int) -> dict | None:
        match = self.match_repo.get_by_id(match_id)
        if not match:
            return None

        data = match.to_dict()
        data["predicted_lineups"] = {}
        if match.team1_id:
            squad = self.squad_service.get_squad(match.team1_id)
            data["predicted_lineups"]["team1"] = self.lineup_service.predict(squad)
        if match.team2_id:
            squad = self.squad_service.get_squad(match.team2_id)
            data["predicted_lineups"]["team2"] = self.lineup_service.predict(squad)
        return data
