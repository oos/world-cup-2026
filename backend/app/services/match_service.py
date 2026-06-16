from app.repositories.match_lineup_repository import MatchLineupRepository
from app.repositories.match_repository import MatchRepository


class MatchService:
    def __init__(self) -> None:
        self.match_repo = MatchRepository()
        self.lineup_repo = MatchLineupRepository()

    def list_matches(self, group: str | None = None) -> list[dict]:
        return [m.to_dict() for m in self.match_repo.list_by_group(group)]

    def get_match(self, match_id: int) -> dict | None:
        from flask import current_app

        match = self.match_repo.get_by_id(match_id)
        if not match:
            return None

        data = match.to_dict()
        lead_minutes = int(current_app.config.get("LINEUP_LEAD_MINUTES", 60))
        post_ko_minutes = int(current_app.config.get("LINEUP_POST_KO_MINUTES", 15))
        data["lineups"] = self.lineup_repo.get_match_lineups_payload(
            match,
            lead_minutes=lead_minutes,
            post_ko_minutes=post_ko_minutes,
        )
        return data
