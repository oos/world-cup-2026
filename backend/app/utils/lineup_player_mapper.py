from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.extensions import db
from app.models.squad_member import SquadMember
from app.utils.player_name import normalize_player_name


def espn_position_to_role(position: str | None) -> str:
    if not position:
        return "OTHER"
    value = position.strip().upper()
    if value in {"G", "GK", "GOALKEEPER"} or value.startswith("G"):
        return "GK"
    if value in {"D", "DF", "DEF", "DEFENDER"} or value.startswith("D"):
        return "DEF"
    if value in {"M", "MF", "MID", "MIDFIELDER"} or value.startswith("M"):
        return "MID"
    if value in {"F", "FW", "FWD", "FORWARD", "ATT", "ATTACKER"} or value.startswith("F"):
        return "FWD"
    return "OTHER"


class LineupPlayerMapper:
    def __init__(self, team_id: int) -> None:
        self.team_id = team_id
        self._by_jersey: dict[int, int] = {}
        self._by_name: dict[str, int] = {}
        self._load_squad()

    def _load_squad(self) -> None:
        members = db.session.scalars(
            select(SquadMember)
            .where(SquadMember.team_id == self.team_id)
            .options(joinedload(SquadMember.player))
        ).unique().all()

        for member in members:
            player = member.player
            if member.jersey_number is not None:
                self._by_jersey[int(member.jersey_number)] = player.id
            normalized = normalize_player_name(player.name)
            if normalized:
                self._by_name[normalized] = player.id

    def map_player(
        self,
        *,
        jersey_number: int | None,
        display_name: str | None,
    ) -> int | None:
        if jersey_number is not None and jersey_number in self._by_jersey:
            return self._by_jersey[jersey_number]

        if display_name:
            normalized = normalize_player_name(display_name)
            if normalized in self._by_name:
                return self._by_name[normalized]

        return None
