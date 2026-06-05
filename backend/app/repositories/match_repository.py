from app.extensions import db
from app.models.match import Match
from app.repositories.base import BaseRepository


class MatchRepository(BaseRepository[Match]):
    model = Match

    def list_by_group(self, group_name: str | None = None) -> list[Match]:
        stmt = db.select(Match).order_by(Match.match_date, Match.match_number)
        if group_name:
            stmt = stmt.where(Match.group_name == group_name)
        return list(db.session.scalars(stmt).all())

    def matches_missing_scores(self) -> list[Match]:
        return list(
            db.session.scalars(
                db.select(Match).where(Match.score.is_(None))
            ).all()
        )
