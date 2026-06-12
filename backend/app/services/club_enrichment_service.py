from app.extensions import db
from app.ingestion.player_career_client import PlayerCareerClient
from app.models.player import Player
from app.utils.club_status import (
    CLUB_STATUS_NONE,
    club_status_from_career,
    default_club_status_for_missing_club,
)


class ClubEnrichmentService:
    def enrich_player(self, player: Player, *, commit: bool = False) -> Player:
        if player.club and player.club.strip():
            player.club_status = None
            if commit:
                db.session.commit()
            return player

        if not player.wikidata_id:
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
