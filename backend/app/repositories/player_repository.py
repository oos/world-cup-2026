from sqlalchemy import func, or_

from app.extensions import db
from app.models.player import Player
from app.models.squad_member import SquadMember
from app.repositories.base import BaseRepository
from app.utils.club_status import CLUB_STATUS_NONE


class PlayerRepository(BaseRepository[Player]):
    model = Player

    def get_by_wikidata_id(self, wikidata_id: str) -> Player | None:
        return db.session.scalars(
            db.select(Player).where(Player.wikidata_id == wikidata_id)
        ).first()

    def find_by_name_and_team(self, name: str, team_id: int) -> Player | None:
        stmt = (
            db.select(Player)
            .join(SquadMember, SquadMember.player_id == Player.id)
            .where(SquadMember.team_id == team_id, Player.name.ilike(name))
        )
        return db.session.scalars(stmt).first()

    def find_by_api_football_id(self, api_football_id: str) -> Player | None:
        return db.session.scalars(
            db.select(Player).where(
                Player.data_sources["api_football_id"].as_string() == str(api_football_id)
            )
        ).first()

    def players_missing_fields(self) -> list[Player]:
        return db.session.scalars(
            db.select(Player).where(
                (Player.position.is_(None))
                | (Player.club.is_(None))
            )
        ).all()

    def players_missing_images(self) -> list[Player]:
        return db.session.scalars(
            db.select(Player).where(Player.image_url.is_(None)).order_by(Player.name)
        ).all()

    def players_missing_club(self) -> list[Player]:
        return db.session.scalars(
            db.select(Player)
            .where(or_(Player.club.is_(None), func.trim(Player.club) == ""))
            .where(or_(Player.club_status.is_(None), Player.club_status != CLUB_STATUS_NONE))
            .order_by(Player.name)
        ).all()

    def count_with_club(self) -> int:
        return (
            db.session.scalar(
                db.select(func.count(Player.id)).where(
                    Player.club.isnot(None),
                    func.trim(Player.club) != "",
                )
            )
            or 0
        )
