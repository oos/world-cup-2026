"""Shared match upsert used by openfootball ingestion and history sync."""

from __future__ import annotations

import logging
from datetime import date

from sqlalchemy import and_, or_, select

from app.constants import CURRENT_TOURNAMENT_YEAR
from app.extensions import db
from app.ingestion.score_merge import apply_score_update, merge_goals
from app.models.match import Match
from app.models.tournament import Tournament
from app.models.tournament_team import TournamentTeam
from app.utils.match_key import build_match_key

logger = logging.getLogger(__name__)


class MatchUpsertService:
    def find_existing_match(
        self,
        tournament_id: int,
        *,
        match_key: str | None,
        match_number: int | None,
        match_date: date | None,
        team1: TournamentTeam | None,
        team2: TournamentTeam | None,
    ) -> Match | None:
        if match_key:
            existing = db.session.scalars(
                select(Match).where(
                    Match.tournament_id == tournament_id,
                    Match.match_key == match_key,
                )
            ).first()
            if existing:
                return existing

        if match_number:
            existing = db.session.scalars(
                select(Match).where(
                    Match.tournament_id == tournament_id,
                    Match.match_number == match_number,
                )
            ).first()
            if existing:
                return existing

        if match_date and team1 and team2:
            return db.session.scalars(
                select(Match).where(
                    Match.tournament_id == tournament_id,
                    Match.match_date == match_date,
                    or_(
                        and_(Match.team1_id == team1.id, Match.team2_id == team2.id),
                        and_(Match.team1_id == team2.id, Match.team2_id == team1.id),
                    ),
                )
            ).first()

        return None

    def upsert_from_openfootball(
        self,
        tournament: Tournament,
        *,
        round_name: str | None,
        match_number: int | None,
        match_date: date | None,
        match_time: str | None,
        group_name: str | None,
        team1: TournamentTeam | None,
        team2: TournamentTeam | None,
        team1_name: str,
        team2_name: str,
        stadium_id: int | None,
        score: dict | None,
        goals1: list | None = None,
        goals2: list | None = None,
        stage: str | None = None,
        leg: int | None = None,
    ) -> Match:
        match_key = build_match_key(match_date, team1_name, team2_name)
        if leg is not None and match_key:
            # Two-legged ties share team names + (often) no date; disambiguate by leg.
            match_key = f"{match_key}-leg{leg}"
        existing = self.find_existing_match(
            tournament.id,
            match_key=match_key,
            match_number=match_number,
            match_date=match_date,
            team1=team1 if leg is None else None,
            team2=team2 if leg is None else None,
        )

        if existing is None:
            match = Match(
                tournament_id=tournament.id,
                round=round_name,
                stage=stage,
                leg=leg,
                match_number=match_number,
                match_date=match_date,
                match_time=match_time,
                team1_id=team1.id if team1 else None,
                team2_id=team2.id if team2 else None,
                group_name=group_name,
                stadium_id=stadium_id,
                match_key=match_key,
            )
            db.session.add(match)
            existing = match

        if round_name:
            existing.round = round_name
        if stage is not None:
            existing.stage = stage
        if leg is not None:
            existing.leg = leg
        if match_number is not None:
            existing.match_number = match_number
        if match_date:
            existing.match_date = match_date
        if match_time:
            existing.match_time = match_time
        if group_name:
            existing.group_name = group_name
        if team1:
            existing.team1_id = team1.id
        if team2:
            existing.team2_id = team2.id
        if stadium_id:
            existing.stadium_id = stadium_id
        if match_key and not existing.match_key:
            existing.match_key = match_key

        apply_score_update(existing, score, source="openfootball", goals1=goals1, goals2=goals2)
        db.session.flush()
        return existing

    def upsert_from_api_football(
        self,
        tournament: Tournament,
        parsed,
        *,
        team1: TournamentTeam | None,
        team2: TournamentTeam | None,
        team1_name: str,
        team2_name: str,
    ) -> Match:
        from app.ingestion.api_football_fixture import ParsedApiFixture

        if not isinstance(parsed, ParsedApiFixture):
            raise TypeError("parsed must be a ParsedApiFixture")

        match_key = build_match_key(parsed.match_date, team1_name, team2_name)
        if parsed.leg is not None and match_key:
            match_key = f"{match_key}-leg{parsed.leg}"
        if parsed.fixture_id and match_key:
            match_key = f"{match_key}-fx{parsed.fixture_id}"

        existing = self.find_existing_match(
            tournament.id,
            match_key=match_key,
            match_number=parsed.fixture_id,
            match_date=parsed.match_date,
            team1=team1 if parsed.leg is None else None,
            team2=team2 if parsed.leg is None else None,
        )

        if existing is None:
            match = Match(
                tournament_id=tournament.id,
                round=parsed.round_name,
                stage=parsed.stage,
                leg=parsed.leg,
                match_number=parsed.fixture_id,
                match_date=parsed.match_date,
                match_time=parsed.match_time,
                team1_id=team1.id if team1 else None,
                team2_id=team2.id if team2 else None,
                group_name=parsed.group_name,
                match_key=match_key,
                api_football_fixture_id=parsed.fixture_id,
            )
            db.session.add(match)
            existing = match
        else:
            if parsed.round_name:
                existing.round = parsed.round_name
            if parsed.stage is not None:
                existing.stage = parsed.stage
            if parsed.leg is not None:
                existing.leg = parsed.leg
            if parsed.match_date:
                existing.match_date = parsed.match_date
            if parsed.match_time:
                existing.match_time = parsed.match_time
            if parsed.group_name:
                existing.group_name = parsed.group_name
            if team1:
                existing.team1_id = team1.id
            if team2:
                existing.team2_id = team2.id
            if match_key and not existing.match_key:
                existing.match_key = match_key
            if parsed.fixture_id:
                existing.api_football_fixture_id = parsed.fixture_id

        if parsed.score:
            apply_score_update(existing, parsed.score, source="api_football")
        db.session.flush()
        return existing

    def upsert_from_history(
        self,
        tournament: Tournament,
        payload: dict,
        team1: TournamentTeam | None,
        team2: TournamentTeam | None,
        *,
        allow_insert: bool = False,
    ) -> Match | None:
        match_key = build_match_key(
            payload.get("date"),
            payload.get("team1", ""),
            payload.get("team2", ""),
        )
        match_date = self._parse_date(payload.get("date"))
        is_current = tournament.year == CURRENT_TOURNAMENT_YEAR

        existing = self.find_existing_match(
            tournament.id,
            match_key=match_key,
            match_number=payload.get("match_number"),
            match_date=match_date,
            team1=team1,
            team2=team2,
        )

        if existing is None:
            if is_current and not allow_insert:
                logger.warning(
                    "History sync skipped insert for missing 2026 match: %s",
                    match_key,
                )
                return None

            existing = Match(tournament_id=tournament.id)
            db.session.add(existing)
            existing.round = payload.get("round") or ""
            existing.match_number = payload.get("match_number")
            existing.match_date = match_date
            existing.match_time = payload.get("time")
            existing.group_name = payload.get("group")
            existing.stadium_name = payload.get("stadium")
            existing.team1_id = team1.id if team1 else None
            existing.team2_id = team2.id if team2 else None
            existing.match_key = match_key

        if is_current:
            apply_score_update(
                existing,
                payload.get("score"),
                source="openfootball",
                goals1=payload.get("goals1"),
                goals2=payload.get("goals2"),
            )
            if match_key and not existing.match_key:
                existing.match_key = match_key
        else:
            existing.round = payload.get("round") or existing.round
            existing.match_number = payload.get("match_number")
            existing.match_date = match_date
            existing.match_time = payload.get("time")
            existing.group_name = payload.get("group")
            existing.stadium_name = payload.get("stadium")
            existing.match_key = match_key
            existing.team1_id = team1.id if team1 else None
            existing.team2_id = team2.id if team2 else None
            apply_score_update(
                existing,
                payload.get("score"),
                source="openfootball",
                goals1=payload.get("goals1"),
                goals2=payload.get("goals2"),
            )
            if payload.get("goals1") is not None:
                existing.goals1 = merge_goals(existing.goals1, payload.get("goals1"))
            if payload.get("goals2") is not None:
                existing.goals2 = merge_goals(existing.goals2, payload.get("goals2"))

        db.session.flush()
        return existing

    @staticmethod
    def _parse_date(value: str | None) -> date | None:
        if not value:
            return None
        return date.fromisoformat(value)
