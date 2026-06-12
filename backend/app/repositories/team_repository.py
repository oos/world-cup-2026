from sqlalchemy import func

from app.constants import CURRENT_TOURNAMENT_YEAR
from app.extensions import db
from app.models.nation import Nation
from app.models.squad_member import SquadMember
from app.models.tournament import Tournament
from app.models.tournament_team import TournamentTeam
from app.repositories.base import BaseRepository


class TeamRepository(BaseRepository[TournamentTeam]):
    model = TournamentTeam

    def get_by_fifa_code(
        self,
        fifa_code: str,
        *,
        tournament_year: int | None = CURRENT_TOURNAMENT_YEAR,
    ) -> TournamentTeam | None:
        stmt = (
            db.select(TournamentTeam)
            .join(TournamentTeam.nation)
            .join(TournamentTeam.tournament)
        )
        stmt = stmt.where(TournamentTeam.nation.has(fifa_code=fifa_code))
        if tournament_year is not None:
            stmt = stmt.where(TournamentTeam.tournament.has(year=tournament_year))
        return db.session.scalars(stmt).first()

    def get_by_group(
        self,
        group_name: str,
        *,
        tournament_year: int = CURRENT_TOURNAMENT_YEAR,
    ) -> list[TournamentTeam]:
        return db.session.scalars(
            db.select(TournamentTeam)
            .join(TournamentTeam.nation)
            .join(TournamentTeam.tournament)
            .where(
                TournamentTeam.group_name == group_name,
                Tournament.year == tournament_year,
            )
            .order_by(Nation.name)
        ).all()

    def list_for_tournament(
        self,
        tournament_year: int = CURRENT_TOURNAMENT_YEAR,
    ) -> list[TournamentTeam]:
        return db.session.scalars(
            db.select(TournamentTeam)
            .join(TournamentTeam.tournament)
            .where(Tournament.year == tournament_year)
        ).all()

    def list_with_player_counts(
        self,
        *,
        tournament_year: int = CURRENT_TOURNAMENT_YEAR,
    ) -> list[tuple[TournamentTeam, int]]:
        stmt = (
            db.select(TournamentTeam, func.count(SquadMember.id))
            .join(TournamentTeam.nation)
            .join(TournamentTeam.tournament)
            .where(Tournament.year == tournament_year)
            .outerjoin(SquadMember, SquadMember.team_id == TournamentTeam.id)
            .group_by(TournamentTeam.id, Nation.name)
            .order_by(TournamentTeam.group_name, Nation.name)
        )
        return list(db.session.execute(stmt).all())

    def teams_with_low_squad_count(
        self,
        min_players: int = 20,
        *,
        tournament_year: int = CURRENT_TOURNAMENT_YEAR,
    ) -> list[TournamentTeam]:
        stmt = (
            db.select(TournamentTeam)
            .join(TournamentTeam.tournament)
            .where(Tournament.year == tournament_year)
            .outerjoin(SquadMember, SquadMember.team_id == TournamentTeam.id)
            .group_by(TournamentTeam.id)
            .having(func.count(SquadMember.id) < min_players)
        )
        return list(db.session.scalars(stmt).all())
