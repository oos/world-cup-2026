from sqlalchemy import func

from app.extensions import db
from app.models.squad_member import SquadMember
from app.models.tournament_team import TournamentTeam
from app.repositories.base import BaseRepository


class TeamRepository(BaseRepository[TournamentTeam]):
    model = TournamentTeam

    def get_by_fifa_code(self, fifa_code: str, *, tournament_year: int | None = 2026) -> TournamentTeam | None:
        stmt = (
            db.select(TournamentTeam)
            .join(TournamentTeam.nation)
            .join(TournamentTeam.tournament)
        )
        stmt = stmt.where(TournamentTeam.nation.has(fifa_code=fifa_code))
        if tournament_year is not None:
            stmt = stmt.where(TournamentTeam.tournament.has(year=tournament_year))
        return db.session.scalars(stmt).first()

    def get_by_group(self, group_name: str) -> list[TournamentTeam]:
        from app.models.nation import Nation

        return db.session.scalars(
            db.select(TournamentTeam)
            .join(TournamentTeam.nation)
            .where(TournamentTeam.group_name == group_name)
            .order_by(Nation.name)
        ).all()

    def list_with_player_counts(self) -> list[tuple[TournamentTeam, int]]:
        from app.models.nation import Nation

        stmt = (
            db.select(TournamentTeam, func.count(SquadMember.id))
            .join(TournamentTeam.nation)
            .outerjoin(SquadMember, SquadMember.team_id == TournamentTeam.id)
            .group_by(TournamentTeam.id)
            .order_by(TournamentTeam.group_name, Nation.name)
        )
        return list(db.session.execute(stmt).all())

    def teams_with_low_squad_count(self, min_players: int = 20) -> list[TournamentTeam]:
        stmt = (
            db.select(TournamentTeam)
            .outerjoin(SquadMember, SquadMember.team_id == TournamentTeam.id)
            .group_by(TournamentTeam.id)
            .having(func.count(SquadMember.id) < min_players)
        )
        return list(db.session.scalars(stmt).all())
