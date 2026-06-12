from sqlalchemy.orm import joinedload

from app.extensions import db
from app.models.squad_member import SquadMember
from app.models.tournament import Tournament
from app.models.tournament_team import TournamentTeam
from app.models.tournament import Tournament
from app.repositories.player_repository import PlayerRepository
from app.repositories.team_repository import TeamRepository
from app.services.club_enrichment_service import ClubEnrichmentService
from app.utils.player_name import dedupe_players

POSITION_ORDER = {"GK": 0, "DF": 1, "DEF": 1, "MF": 2, "MID": 2, "FW": 3, "FWD": 3}
CURRENT_TOURNAMENT_YEAR = 2026


class SquadService:
    def __init__(self) -> None:
        self.team_repo = TeamRepository()
        self.player_repo = PlayerRepository()
        self.club_enrichment = ClubEnrichmentService()

    def list_teams(self, group: str | None = None) -> list[dict]:
        if group:
            teams = self.team_repo.get_by_group(group)
            return [t.to_dict(player_count=self._count_players(t.id)) for t in teams]
        return [
            team.to_dict(player_count=count)
            for team, count in self.team_repo.list_with_player_counts()
        ]

    def get_team(self, team_id: int) -> dict | None:
        team = self.team_repo.get_by_id(team_id)
        if not team:
            return None
        data = team.to_dict(player_count=self._count_players(team.id))
        data["squad"] = self.get_squad(team_id)
        return data

    def get_squad(self, team_id: int) -> dict:
        stmt = (
            db.select(SquadMember)
            .where(SquadMember.team_id == team_id)
            .options(joinedload(SquadMember.player), joinedload(SquadMember.team))
        )
        members = db.session.scalars(stmt).unique().all()
        players = []
        for member in members:
            pos = (member.player.position or "UNK").upper()
            players.append({
                **self._player_dict(member),
                "_sort": POSITION_ORDER.get(pos[:3] if len(pos) >= 3 else pos, 9),
            })
        players = dedupe_players(players, same_team=True)
        players.sort(key=lambda p: (p["_sort"], p.get("jersey_number") or 999, p["name"]))
        for p in players:
            p.pop("_sort", None)

        grouped: dict[str, list] = {"GK": [], "DEF": [], "MID": [], "FWD": [], "OTHER": []}
        for p in players:
            pos = (p.get("position") or "").upper()
            if pos.startswith("GK"):
                grouped["GK"].append(p)
            elif pos.startswith("DF") or pos.startswith("DEF"):
                grouped["DEF"].append(p)
            elif pos.startswith("MF") or pos.startswith("MID"):
                grouped["MID"].append(p)
            elif pos.startswith("FW") or pos.startswith("FWD"):
                grouped["FWD"].append(p)
            else:
                grouped["OTHER"].append(p)
        return grouped

    def list_players(
        self,
        year: int = CURRENT_TOURNAMENT_YEAR,
        group: str | None = None,
        position: str | None = None,
        team_id: int | None = None,
    ) -> list[dict]:
        stmt = (
            db.select(SquadMember)
            .join(SquadMember.team)
            .join(TournamentTeam.tournament)
            .where(Tournament.year == year)
            .options(joinedload(SquadMember.player), joinedload(SquadMember.team))
        )
        if group:
            stmt = stmt.where(SquadMember.team.has(group_name=group))
        if team_id:
            stmt = stmt.where(SquadMember.team_id == team_id)

        members = db.session.scalars(stmt).unique().all()
        players = []
        for member in members:
            pos = (member.player.position or "UNK").upper()
            if position and not self._matches_position(pos, position):
                continue
            players.append({
                **self._player_dict(member),
                "_sort": POSITION_ORDER.get(pos[:3] if len(pos) >= 3 else pos, 9),
            })

        players = dedupe_players(players)
        players.sort(
            key=lambda p: (
                p.get("team_name") or "",
                p["_sort"],
                p.get("jersey_number") or 999,
                p["name"],
            )
        )
        for p in players:
            p.pop("_sort", None)
        return players

    def get_player(self, player_id: int) -> dict | None:
        player = self.player_repo.get_by_id(player_id)
        if not player:
            return None
        if not player.club:
            self.club_enrichment.enrich_player(player, commit=True)
        membership = db.session.scalars(
            db.select(SquadMember)
            .where(SquadMember.player_id == player_id)
            .options(joinedload(SquadMember.team))
        ).first()
        if not membership:
            return player.to_dict()
        return self._player_dict(membership)

    def get_stats(self) -> dict:
        teams = self.team_repo.get_all()
        players = self.player_repo.get_all()
        return {
            "team_count": len(teams),
            "player_count": len(players),
            "groups": sorted({t.group_name for t in teams if t.group_name}),
            "player_counts_by_year": self._player_counts_by_year(),
        }

    def _player_counts_by_year(self) -> dict[int, int]:
        rows = db.session.execute(
            db.select(Tournament.year, db.func.count(db.distinct(SquadMember.player_id)))
            .select_from(SquadMember)
            .join(TournamentTeam, SquadMember.team_id == TournamentTeam.id)
            .join(Tournament, TournamentTeam.tournament_id == Tournament.id)
            .group_by(Tournament.year)
        ).all()
        return {int(year): int(count) for year, count in rows}

    @staticmethod
    def _player_dict(member: SquadMember) -> dict:
        team = member.team
        return member.player.to_dict(
            jersey_number=member.jersey_number,
            team_name=team.name if team else None,
            team_fifa_code=team.fifa_code if team else None,
        )

    def _count_players(self, team_id: int) -> int:
        return db.session.scalar(
            db.select(db.func.count(SquadMember.id)).where(SquadMember.team_id == team_id)
        ) or 0

    @staticmethod
    def _matches_position(pos: str, filter_pos: str) -> bool:
        key = filter_pos.upper()
        if key == "GK":
            return pos.startswith("GK")
        if key == "DEF":
            return pos.startswith("DF") or pos.startswith("DEF")
        if key == "MID":
            return pos.startswith("MF") or pos.startswith("MID")
        if key == "FWD":
            return pos.startswith("FW") or pos.startswith("FWD")
        return True
