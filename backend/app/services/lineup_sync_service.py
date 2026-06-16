from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from flask import current_app
from sqlalchemy import select

from app.constants import CURRENT_TOURNAMENT_YEAR
from app.extensions import db
from app.ingestion.api_football_client import ApiFootballClient, normalize_api_position
from app.ingestion.espn_commentary_client import EspnCommentaryClient
from app.ingestion.team_mapper import name_to_fifa
from app.models.espn_match import EspnMatch
from app.models.match import Match
from app.models.tournament import Tournament
from app.repositories.match_lineup_repository import MatchLineupRepository
from app.repositories.player_repository import PlayerRepository
from app.services.espn_commentary_service import EspnCommentaryService
from app.utils.lineup_player_mapper import LineupPlayerMapper
from app.utils.match_time import parse_match_kickoff

logger = logging.getLogger(__name__)

DEFAULT_LEAD_MINUTES = 60
DEFAULT_POST_KO_MINUTES = 15


class LineupSyncService:
    USER_AGENT = "WorldCup2026App/1.0 (https://github.com/oos/world-cup-2026; +lineup-sync)"

    def __init__(self, delay: float = 6.0) -> None:
        self.client = EspnCommentaryClient(self.USER_AGENT, delay=delay)
        self.espn_service = EspnCommentaryService(delay=delay)
        self.lineup_repo = MatchLineupRepository()
        self.player_repo = PlayerRepository()

    def close(self) -> None:
        self.client.close()
        self.espn_service.close()

    def sync(
        self,
        *,
        match_id: int | None = None,
        force: bool = False,
    ) -> dict:
        lead_minutes = int(
            current_app.config.get("LINEUP_LEAD_MINUTES", DEFAULT_LEAD_MINUTES)
        )
        post_ko_minutes = int(
            current_app.config.get("LINEUP_POST_KO_MINUTES", DEFAULT_POST_KO_MINUTES)
        )

        now = datetime.now(timezone.utc)
        if match_id is not None:
            match = db.session.get(Match, match_id)
            candidates = [match] if match else []
        else:
            candidates = self._collect_candidates(now, lead_minutes, post_ko_minutes)

        results = {
            "candidates": len(candidates),
            "synced": 0,
            "skipped": 0,
            "errors": [],
        }

        for match in candidates:
            if match is None:
                continue
            if not force and self.lineup_repo.has_complete_lineups(match):
                results["skipped"] += 1
                continue

            try:
                if self._sync_match(match, force=force):
                    results["synced"] += 1
                else:
                    results["skipped"] += 1
            except Exception as exc:  # noqa: BLE001
                logger.exception("Failed syncing lineups for match %s", match.id)
                results["errors"].append({"match_id": match.id, "error": str(exc)})

        db.session.commit()
        return results

    def _collect_candidates(
        self,
        now: datetime,
        lead_minutes: int,
        post_ko_minutes: int,
    ) -> list[Match]:
        candidates: list[Match] = []
        for match in self._current_tournament_matches():
            if not match.team1_id or not match.team2_id:
                continue
            kickoff = parse_match_kickoff(match.match_date, match.match_time)
            if not kickoff:
                continue

            window_start = kickoff - timedelta(minutes=lead_minutes)
            window_end = kickoff + timedelta(minutes=post_ko_minutes)
            if window_start <= now <= window_end:
                candidates.append(match)
        return candidates

    def _current_tournament_matches(self) -> list[Match]:
        return list(
            db.session.scalars(
                select(Match)
                .join(Match.tournament)
                .where(Tournament.year == CURRENT_TOURNAMENT_YEAR)
                .order_by(Match.match_date, Match.match_time, Match.id)
            ).all()
        )

    def _sync_match(self, match: Match, *, force: bool) -> bool:
        if self._sync_from_espn(match, force=force):
            return True
        return self._sync_from_api_football(match, force=force)

    def _sync_from_espn(self, match: Match, *, force: bool) -> bool:
        espn_match = self._resolve_espn_match(match)
        if not espn_match:
            return False

        summary = self.client.fetch_summary(espn_match.espn_game_id)
        team_blocks = self.client.parse_lineups(summary)
        if not team_blocks:
            return False

        updated = False
        for block in team_blocks:
            team_id = self._team_id_for_espn_block(match, block)
            if not team_id:
                continue

            starters = [p for p in block["players"] if p.get("starter")]
            if len(starters) < 11 and not force:
                continue

            mapper = LineupPlayerMapper(team_id)
            rows = []
            for player in block["players"]:
                rows.append(
                    {
                        "player_id": mapper.map_player(
                            jersey_number=player.get("jersey_number"),
                            display_name=player.get("display_name"),
                        ),
                        "jersey_number": player.get("jersey_number"),
                        "position": player.get("position"),
                        "lineup_role": (
                            MatchLineupRepository.STARTER_ROLE
                            if player.get("starter")
                            else MatchLineupRepository.SUBSTITUTE_ROLE
                        ),
                        "display_name": player.get("display_name"),
                    }
                )

            if not rows:
                continue

            self.lineup_repo.replace_lineup(
                match_id=match.id,
                team_id=team_id,
                formation=block.get("formation"),
                source="espn",
                players=rows,
            )
            espn_match.lineup_synced_at = datetime.utcnow()
            updated = True

        return updated

    def _sync_from_api_football(self, match: Match, *, force: bool) -> bool:
        api_key = current_app.config.get("API_FOOTBALL_KEY") or ""
        if not api_key or not match.api_football_fixture_id:
            return False

        client = ApiFootballClient(api_key)
        try:
            response = client.fetch_fixture_lineups(match.api_football_fixture_id)
        finally:
            client.close()

        if not response:
            return False

        updated = False
        for block in response:
            team_info = block.get("team") or {}
            team_id = self._team_id_for_api_team(match, team_info)
            if not team_id:
                continue

            starters = block.get("startXI") or []
            if len(starters) < 11 and not force:
                continue

            mapper = LineupPlayerMapper(team_id)
            rows = []
            for entry in starters:
                player = entry.get("player") or {}
                rows.append(self._api_football_row(player, mapper, starter=True))
            for entry in block.get("substitutes") or []:
                player = entry.get("player") or {}
                rows.append(self._api_football_row(player, mapper, starter=False))

            if not rows:
                continue

            self.lineup_repo.replace_lineup(
                match_id=match.id,
                team_id=team_id,
                formation=block.get("formation"),
                source="api_football",
                players=rows,
            )
            updated = True

        return updated

    def _api_football_row(
        self,
        player: dict,
        mapper: LineupPlayerMapper,
        *,
        starter: bool,
    ) -> dict:
        api_id = player.get("id")
        player_id = None
        if api_id is not None:
            mapped = self.player_repo.find_by_api_football_id(str(api_id))
            if mapped:
                player_id = mapped.id

        jersey_number = player.get("number")
        try:
            jersey_number = int(jersey_number) if jersey_number is not None else None
        except (TypeError, ValueError):
            jersey_number = None

        display_name = (player.get("name") or "").strip()
        if player_id is None:
            player_id = mapper.map_player(
                jersey_number=jersey_number,
                display_name=display_name,
            )

        position = normalize_api_position(player.get("pos")) or player.get("pos")
        return {
            "player_id": player_id,
            "jersey_number": jersey_number,
            "position": position,
            "lineup_role": (
                MatchLineupRepository.STARTER_ROLE
                if starter
                else MatchLineupRepository.SUBSTITUTE_ROLE
            ),
            "grid": player.get("grid"),
            "display_name": display_name or None,
        }

    def _resolve_espn_match(self, match: Match) -> EspnMatch | None:
        espn_match = db.session.scalars(
            select(EspnMatch).where(EspnMatch.match_id == match.id)
        ).first()
        if espn_match:
            return espn_match

        if not match.match_date:
            return None

        self.espn_service.discover_year(CURRENT_TOURNAMENT_YEAR)
        return db.session.scalars(
            select(EspnMatch).where(EspnMatch.match_id == match.id)
        ).first()

    def _team_id_for_espn_block(self, match: Match, block: dict) -> int | None:
        team_name = block.get("team_name")
        if team_name:
            for team in (match.team1, match.team2):
                if team and self._names_match(team_name, team.name):
                    return team.id

        return self._team_id_for_side(match, block.get("home_away"))

    @staticmethod
    def _team_id_for_side(match: Match, home_away: str | None) -> int | None:
        if home_away == "home":
            return match.team1_id
        if home_away == "away":
            return match.team2_id
        return None

    def _team_id_for_api_team(self, match: Match, team_info: dict) -> int | None:
        api_name = team_info.get("name") or ""
        api_code = (team_info.get("code") or "").upper()
        for team in (match.team1, match.team2):
            if not team:
                continue
            if api_code and team.fifa_code.upper() == api_code:
                return team.id
            if api_name and self._names_match(api_name, team.name):
                return team.id
        return None

    @staticmethod
    def _names_match(left: str, right: str) -> bool:
        left_code = (name_to_fifa(left) or left).strip().lower()
        right_code = (name_to_fifa(right) or right).strip().lower()
        return left_code == right_code
