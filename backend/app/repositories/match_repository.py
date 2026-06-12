from app.constants import CURRENT_TOURNAMENT_YEAR
from app.extensions import db
from app.models.match import Match
from app.models.tournament import Tournament
from app.repositories.base import BaseRepository


class MatchRepository(BaseRepository[Match]):
    model = Match

    def list_by_group(
        self,
        group_name: str | None = None,
        *,
        tournament_year: int = CURRENT_TOURNAMENT_YEAR,
    ) -> list[Match]:
        stmt = (
            db.select(Match)
            .join(Match.tournament)
            .where(Tournament.year == tournament_year)
            .order_by(Match.match_date, Match.match_number)
        )
        if group_name:
            stmt = stmt.where(Match.group_name == group_name)
        return list(db.session.scalars(stmt).all())

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
