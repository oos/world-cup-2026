import time

from app.extensions import db
from app.ingestion.player_career_client import PlayerCareerClient
from app.ingestion.wikidata_client import WikidataClient
from app.models.player import Player
from app.utils.club_status import (
    CLUB_STATUS_NONE,
    club_status_from_career,
    default_club_status_for_missing_club,
)


class ClubEnrichmentService:
    def enrich_batch(
        self,
        players: list[Player],
        *,
        commit_every: int = 20,
        delay_seconds: float = 0.35,
    ) -> dict:
        filled = 0
        marked_none = 0
        still_missing = 0
        errors: list[str] = []

        for index, player in enumerate(players, start=1):
            if index > 1 and delay_seconds > 0:
                time.sleep(delay_seconds)
            try:
                before = (player.club or "").strip()
                self.enrich_player(player, commit=False)
                after = (player.club or "").strip()
                if after and after != before:
                    filled += 1
                elif player.club_status == CLUB_STATUS_NONE:
                    marked_none += 1
                else:
                    still_missing += 1
                if index % commit_every == 0:
                    db.session.commit()
            except Exception as exc:  # noqa: BLE001 - batch job should continue
                db.session.rollback()
                errors.append(f"{player.name}: {exc}")

        db.session.commit()
        return {
            "processed": len(players),
            "filled": filled,
            "marked_none": marked_none,
            "still_missing": still_missing,
            "errors": errors,
        }

    def enrich_player(self, player: Player, *, commit: bool = False) -> Player:
        if player.club and player.club.strip():
            player.club_status = None
            if commit:
                db.session.commit()
            return player

        if not player.wikidata_id:
            wikidata = WikidataClient()
            try:
                resolved_id = wikidata.resolve_player_id(player.name)
            finally:
                wikidata.close()
            if resolved_id:
                player.wikidata_id = resolved_id
            else:
                player.club_status = default_club_status_for_missing_club(None)
                if commit:
                    db.session.commit()
                return player

        if player.club_status == CLUB_STATUS_NONE:
            if commit:
                db.session.commit()
            return player

        client = PlayerCareerClient()
        try:
            club_history, _, _ = client.fetch_career(player.wikidata_id)
        finally:
            client.close()

        club_name, club_status = club_status_from_career(club_history)
        if club_name:
            player.club = club_name
            player.club_status = None
        else:
            player.club_status = club_status or CLUB_STATUS_NONE

        if commit:
            db.session.commit()
        return player
