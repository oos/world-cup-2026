from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import joinedload

from app.extensions import db
from app.models.match import Match
from app.models.match_lineup import MatchLineup, MatchLineupPlayer
from app.models.tournament_team import TournamentTeam
from app.utils.match_time import parse_match_kickoff


class MatchLineupRepository:
    STARTER_ROLE = "starter"
    SUBSTITUTE_ROLE = "substitute"

    def count_starters(self, match_id: int, team_id: int) -> int:
        return (
            db.session.scalar(
                select(func.count(MatchLineupPlayer.id))
                .join(MatchLineup)
                .where(
                    MatchLineup.match_id == match_id,
                    MatchLineup.team_id == team_id,
                    MatchLineupPlayer.lineup_role == self.STARTER_ROLE,
                )
            )
            or 0
        )

    def has_complete_lineups(self, match: Match) -> bool:
        if not match.team1_id or not match.team2_id:
            return False
        return (
            self.count_starters(match.id, match.team1_id) >= 11
            and self.count_starters(match.id, match.team2_id) >= 11
        )

    def get_team_lineup(self, match_id: int, team_id: int) -> MatchLineup | None:
        return db.session.scalars(
            select(MatchLineup)
            .where(MatchLineup.match_id == match_id, MatchLineup.team_id == team_id)
            .options(
                joinedload(MatchLineup.players).joinedload(MatchLineupPlayer.player),
                joinedload(MatchLineup.team).joinedload(TournamentTeam.nation),
            )
        ).first()

    def build_team_payload(self, lineup: MatchLineup | None) -> dict | None:
        if not lineup:
            return None

        starters: list[dict] = []
        substitutes: list[dict] = []
        for entry in sorted(
            lineup.players,
            key=lambda row: (row.jersey_number is None, row.jersey_number or 999, row.id),
        ):
            payload = self._player_payload(entry, lineup.team)
            if entry.lineup_role == self.STARTER_ROLE:
                starters.append(payload)
            else:
                substitutes.append(payload)

        if not starters and not substitutes:
            return None

        return {
            "formation": lineup.formation,
            "players": starters,
            "substitutes": substitutes,
        }

    def get_match_lineups_payload(
        self,
        match: Match,
        *,
        lead_minutes: int,
        post_ko_minutes: int,
    ) -> dict:
        team1_lineup = (
            self.get_team_lineup(match.id, match.team1_id) if match.team1_id else None
        )
        team2_lineup = (
            self.get_team_lineup(match.id, match.team2_id) if match.team2_id else None
        )

        team1 = self.build_team_payload(team1_lineup)
        team2 = self.build_team_payload(team2_lineup)
        status = self._status_for_match(
            match,
            team1_lineup,
            team2_lineup,
            lead_minutes=lead_minutes,
            post_ko_minutes=post_ko_minutes,
        )

        return {
            "status": status,
            "team1": team1,
            "team2": team2,
        }

    def replace_lineup(
        self,
        *,
        match_id: int,
        team_id: int,
        formation: str | None,
        source: str,
        players: list[dict],
    ) -> MatchLineup:
        lineup = db.session.scalars(
            select(MatchLineup).where(
                MatchLineup.match_id == match_id,
                MatchLineup.team_id == team_id,
            )
        ).first()

        if lineup is None:
            lineup = MatchLineup(
                match_id=match_id,
                team_id=team_id,
                formation=formation,
                source=source,
            )
            db.session.add(lineup)
        else:
            lineup.formation = formation
            lineup.source = source
            for existing in list(lineup.players):
                db.session.delete(existing)

        lineup.synced_at = datetime.utcnow()

        for player in players:
            db.session.add(
                MatchLineupPlayer(
                    match_lineup=lineup,
                    player_id=player.get("player_id"),
                    jersey_number=player.get("jersey_number"),
                    position=player.get("position"),
                    lineup_role=player["lineup_role"],
                    grid=player.get("grid"),
                    display_name=player.get("display_name"),
                )
            )

        db.session.flush()
        return lineup

    def _player_payload(self, entry: MatchLineupPlayer, team: TournamentTeam | None) -> dict:
        from app.utils.lineup_player_mapper import espn_position_to_role

        if entry.player:
            data = entry.player.to_dict(
                jersey_number=entry.jersey_number,
                team_name=team.name if team else None,
                team_fifa_code=team.fifa_code if team else None,
            )
            name = data["name"]
        else:
            name = entry.display_name or "Unknown"
            data = {
                "id": entry.player_id or 0,
                "name": name,
                "position": entry.position,
                "dob": None,
                "height_cm": None,
                "club": None,
                "image_url": None,
                "nationality": team.name if team else None,
                "jersey_number": entry.jersey_number,
                "team_name": team.name if team else None,
                "team_fifa_code": team.fifa_code if team else None,
            }

        role = (
            espn_position_to_role(entry.position)
            if entry.lineup_role == self.STARTER_ROLE
            else "OTHER"
        )
        data["lineup_role"] = role
        if entry.jersey_number is not None:
            data["jersey_number"] = entry.jersey_number
        return data

    def _status_for_match(
        self,
        match: Match,
        team1_lineup: MatchLineup | None,
        team2_lineup: MatchLineup | None,
        *,
        lead_minutes: int,
        post_ko_minutes: int,
    ) -> str:
        if not match.team1_id or not match.team2_id:
            return "unavailable"

        team1_starters = self._starter_count(team1_lineup)
        team2_starters = self._starter_count(team2_lineup)
        if team1_starters >= 11 or team2_starters >= 11:
            return "available"

        kickoff = parse_match_kickoff(match.match_date, match.match_time)
        if not kickoff:
            return "unavailable"

        now = datetime.now(timezone.utc)
        window_start = kickoff - timedelta(minutes=lead_minutes)
        window_end = kickoff + timedelta(minutes=post_ko_minutes)

        if now > window_end:
            return "unavailable"
        if now >= window_start:
            return "pending"
        if kickoff > now:
            return "pending"
        return "unavailable"

    @staticmethod
    def _starter_count(lineup: MatchLineup | None) -> int:
        if not lineup:
            return 0
        return sum(1 for player in lineup.players if player.lineup_role == "starter")
