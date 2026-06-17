from datetime import datetime, timezone

from sqlalchemy import select

from app.constants import CURRENT_TOURNAMENT_YEAR
from app.extensions import db
from app.models.match import Match
from app.models.tournament import Tournament
from app.repositories.base import BaseRepository
from app.utils.match_dedup import dedupe_matches
from app.utils.match_time import parse_match_kickoff


class MatchRepository(BaseRepository[Match]):
    model = Match

    def list_by_group(
        self,
        group_name: str | None = None,
        *,
        tournament_year: int = CURRENT_TOURNAMENT_YEAR,
        competition_slug: str | None = None,
    ) -> list[Match]:
        stmt = (
            db.select(Match)
            .join(Match.tournament)
            .order_by(Match.match_date, Match.match_number)
        )
        if competition_slug:
            stmt = stmt.where(Tournament.external_key == competition_slug)
        else:
            stmt = stmt.where(Tournament.year == tournament_year)
        if group_name:
            stmt = stmt.where(Match.group_name == group_name)
        return dedupe_matches(list(db.session.scalars(stmt).all()))

    def get_by_match_key(
        self,
        match_key: str,
        *,
        tournament_year: int,
    ) -> Match | None:
        return db.session.scalars(
            db.select(Match)
            .join(Match.tournament)
            .where(Tournament.year == tournament_year, Match.match_key == match_key)
        ).first()

    def get_next_upcoming(
        self,
        *,
        tournament_year: int = CURRENT_TOURNAMENT_YEAR,
        now: datetime | None = None,
    ) -> Match | None:
        now = now or datetime.now(timezone.utc)
        stmt = (
            select(Match)
            .join(Match.tournament)
            .where(
                Tournament.year == tournament_year,
                Match.score.is_(None),
                Match.team1_id.isnot(None),
                Match.team2_id.isnot(None),
                Match.match_date.isnot(None),
            )
        )
        candidates = list(db.session.scalars(stmt).all())
        upcoming: list[tuple[datetime, Match]] = []
        for match in candidates:
            kickoff = parse_match_kickoff(match.match_date, match.match_time)
            if kickoff is None:
                continue
            if kickoff >= now:
                upcoming.append((kickoff, match))
        if not upcoming:
            return None
        upcoming.sort(key=lambda item: item[0])
        return upcoming[0][1]

    def matches_missing_scores(
        self,
        *,
        tournament_year: int = CURRENT_TOURNAMENT_YEAR,
    ) -> list[Match]:
        return list(
            db.session.scalars(
                db.select(Match)
                .join(Match.tournament)
                .where(
                    Tournament.year == tournament_year,
                    Match.score.is_(None),
                )
            ).all()
        )
