from sqlalchemy import func

from app.extensions import db
from app.models.squad_member import SquadMember
from app.models.team import Team
from app.repositories.base import BaseRepository


class TeamRepository(BaseRepository[Team]):
    model = Team

    def get_by_fifa_code(self, fifa_code: str) -> Team | None:
        return db.session.scalars(
            db.select(Team).where(Team.fifa_code == fifa_code)
        ).first()

    def get_by_group(self, group_name: str) -> list[Team]:
        return db.session.scalars(
            db.select(Team).where(Team.group_name == group_name).order_by(Team.name)
        ).all()

    def list_with_player_counts(self) -> list[tuple[Team, int]]:
        stmt = (
            db.select(Team, func.count(SquadMember.id))
            .outerjoin(SquadMember, SquadMember.team_id == Team.id)
            .group_by(Team.id)
            .order_by(Team.group_name, Team.name)
        )
        return list(db.session.execute(stmt).all())

    def teams_with_low_squad_count(self, min_players: int = 20) -> list[Team]:
        stmt = (
            db.select(Team)
            .outerjoin(SquadMember, SquadMember.team_id == Team.id)
            .group_by(Team.id)
            .having(func.count(SquadMember.id) < min_players)
        )
        return list(db.session.scalars(stmt).all())
