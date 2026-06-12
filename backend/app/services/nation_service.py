from __future__ import annotations

from sqlalchemy import select

from app.data.nation_registry import NATION_SEED
from app.extensions import db
from app.ingestion.team_mapper import name_to_fifa
from app.models.nation import Nation
from app.models.tournament import Tournament
from app.models.tournament_team import TournamentTeam


class NationService:
    def seed_nations(self) -> int:
        created = 0
        for name, fifa_code, flag_iso, continent, aliases in NATION_SEED:
            nation = db.session.scalars(
                select(Nation).where(Nation.fifa_code == fifa_code)
            ).first()
            if nation is None:
                nation = Nation(
                    name=name,
                    fifa_code=fifa_code,
                    flag_iso=flag_iso,
                    continent=continent,
                    aliases=aliases,
                )
                db.session.add(nation)
                created += 1
            else:
                nation.name = name
                nation.flag_iso = flag_iso or nation.flag_iso
                nation.continent = continent or nation.continent
                nation.aliases = aliases or nation.aliases
        db.session.commit()
        return created

    def get_by_fifa_code(self, fifa_code: str) -> Nation | None:
        return db.session.scalars(
            select(Nation).where(Nation.fifa_code == fifa_code.upper())
        ).first()

    def resolve(self, team_name: str) -> Nation | None:
        if not team_name:
            return None

        fifa = name_to_fifa(team_name)
        if fifa:
            nation = self.get_by_fifa_code(fifa)
            if nation:
                return nation

        normalized = team_name.strip().lower()
        for nation in db.session.scalars(select(Nation)).all():
            if nation.name.lower() == normalized:
                return nation
            for alias in nation.aliases or []:
                if alias.lower() == normalized:
                    return nation
        return None

    def get_or_create(self, team_name: str) -> Nation | None:
        nation = self.resolve(team_name)
        if nation:
            return nation

        fifa = name_to_fifa(team_name) or team_name[:3].upper()
        nation = Nation(
            name=team_name.strip(),
            fifa_code=fifa,
            flag_iso=None,
            continent=None,
            aliases=[],
        )
        db.session.add(nation)
        db.session.flush()
        return nation

    def ensure_tournament_team(
        self,
        tournament: Tournament,
        team_name: str,
        *,
        group_name: str | None = None,
    ) -> TournamentTeam | None:
        nation = self.get_or_create(team_name)
        if nation is None:
            return None

        tournament_team = db.session.scalars(
            select(TournamentTeam).where(
                TournamentTeam.tournament_id == tournament.id,
                TournamentTeam.nation_id == nation.id,
            )
        ).first()
        if tournament_team is None:
            tournament_team = TournamentTeam(
                tournament_id=tournament.id,
                nation_id=nation.id,
                group_name=group_name,
            )
            db.session.add(tournament_team)
            db.session.flush()
        elif group_name and not tournament_team.group_name:
            tournament_team.group_name = group_name

        return tournament_team

    @staticmethod
    def display_name(nation: Nation | None, fallback: str = "") -> str:
        return nation.name if nation else fallback

    @staticmethod
    def flag_iso(nation: Nation | None) -> str | None:
        return nation.flag_iso if nation else None
