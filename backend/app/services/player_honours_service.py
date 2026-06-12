from datetime import datetime

from app.extensions import db
from app.ingestion.player_honours_client import HonourEntryDTO, PlayerHonoursClient
from app.repositories.player_repository import PlayerRepository
from app.utils.player_honours import build_honours_payload


class PlayerHonoursService:
    def __init__(self) -> None:
        self.player_repo = PlayerRepository()

    def get_honours(self, player_id: int, *, refresh: bool = False) -> dict | None:
        player = self.player_repo.get_by_id(player_id)
        if not player:
            return None

        cached = (player.data_sources or {}).get("honours_cache")
        if cached and not refresh:
            return cached

        client = PlayerHonoursClient()
        try:
            entries, source = client.fetch_honours(
                wikidata_id=player.wikidata_id,
                player_name=player.name,
            )
        finally:
            client.close()

        payload = self._build_response(entries, source)
        sources = dict(player.data_sources or {})
        sources["honours_cache"] = payload
        player.data_sources = sources
        db.session.commit()
        return payload

    @staticmethod
    def _build_response(entries: list[HonourEntryDTO], source: str | None) -> dict:
        serializable = [
            {
                "competition": entry.competition,
                "team": entry.team,
                "section": entry.section,
                "seasons": entry.seasons,
                "category": entry.category,
                "category_label": entry.category_label,
                "tier": entry.tier,
            }
            for entry in entries
        ]
        payload = build_honours_payload(serializable)
        payload["source"] = source
        payload["synced_at"] = datetime.utcnow().isoformat()
        return payload
