from app.extensions import db
from app.ingestion.player_career_client import CareerStintDTO, PlayerCareerClient
from app.repositories.player_repository import PlayerRepository


class PlayerCareerService:
    def __init__(self) -> None:
        self.player_repo = PlayerRepository()

    def get_career(self, player_id: int) -> dict | None:
        player = self.player_repo.get_by_id(player_id)
        if not player:
            return None

        if not player.wikidata_id:
            return {
                "club_history": [],
                "international_history": [],
                "source": None,
            }

        client = PlayerCareerClient()
        try:
            club_history, international_history, source = client.fetch_career(
                player.wikidata_id
            )
        finally:
            client.close()

        club_name, club_status = self._resolve_club_from_history(club_history)
        if club_name:
            player.club = club_name
            player.club_status = None
        elif not player.club:
            player.club_status = club_status
        db.session.commit()

        return {
            "club_history": [self._stint_dict(stint) for stint in club_history],
            "international_history": [
                self._stint_dict(stint) for stint in international_history
            ],
            "source": source,
        }

    @staticmethod
    def _resolve_club_from_history(
        club_history: list[CareerStintDTO],
    ) -> tuple[str | None, str | None]:
        from app.utils.club_status import club_status_from_career

        return club_status_from_career(club_history)

    @staticmethod
    def _stint_dict(stint: CareerStintDTO) -> dict:
        return {
            "team_name": stint.team_name,
            "fifa_code": stint.fifa_code,
            "badge_url": stint.badge_url,
            "start_date": stint.start_date,
            "end_date": stint.end_date,
            "transfer_fee": stint.transfer_fee,
            "is_current": stint.is_current,
        }
