from sqlalchemy import func

from app.constants import CURRENT_TOURNAMENT_YEAR
from app.extensions import db
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
        competition_slug: str | None = None,
    ) -> list[TournamentTeam]:
        stmt = (
            db.select(TournamentTeam)
            .join(TournamentTeam.tournament)
            .where(TournamentTeam.group_name == group_name)
            .order_by(TournamentTeam.group_name)
        )
        if competition_slug:
            stmt = stmt.where(Tournament.external_key == competition_slug)
        else:
            stmt = stmt.where(Tournament.year == tournament_year)
        return db.session.scalars(stmt).all()

    def list_for_tournament(
        self,
        tournament_year: int = CURRENT_TOURNAMENT_YEAR,
        *,
        competition_slug: str | None = None,
    ) -> list[TournamentTeam]:
        stmt = db.select(TournamentTeam).join(TournamentTeam.tournament)
        if competition_slug:
            stmt = stmt.where(Tournament.external_key == competition_slug)
        else:
            stmt = stmt.where(Tournament.year == tournament_year)
        return db.session.scalars(stmt).all()

    def list_with_player_counts(
        self,
        *,
        tournament_year: int = CURRENT_TOURNAMENT_YEAR,
        competition_slug: str | None = None,
    ) -> list[tuple[TournamentTeam, int]]:
        stmt = (
            db.select(TournamentTeam, func.count(SquadMember.id))
            .join(TournamentTeam.tournament)
            .outerjoin(SquadMember, SquadMember.team_id == TournamentTeam.id)
            .group_by(TournamentTeam.id)
            .order_by(TournamentTeam.group_name, TournamentTeam.id)
        )
        if competition_slug:
            stmt = stmt.where(Tournament.external_key == competition_slug)
        else:
            stmt = stmt.where(Tournament.year == tournament_year)
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
