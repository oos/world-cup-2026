from app.extensions import db
from app.models.player import Player
from app.models.squad_member import SquadMember
from app.repositories.base import BaseRepository


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
