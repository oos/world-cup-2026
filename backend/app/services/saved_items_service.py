from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.extensions import db
from app.models.player import Player
from app.models.saved_item import SavedItem
from app.models.squad_member import SquadMember
from app.models.tournament_team import TournamentTeam
from app.models.user import User

SUPPORTED_ITEM_TYPES = {"team", "player"}


class SavedItemsService:
    def list_items(self, user: User) -> list[dict]:
        items = db.session.scalars(
            select(SavedItem)
            .where(SavedItem.user_id == user.id)
            .order_by(SavedItem.created_at.desc(), SavedItem.id.desc())
        ).all()
        return [self._to_dict(item) for item in items]

    def add_item(self, user: User, item_type: str, item_id: int) -> dict:
        normalised_type = self._normalise_item_type(item_type)
        if normalised_type is None:
            raise ValueError("item_type must be 'team' or 'player'")
        if item_id <= 0:
            raise ValueError("item_id must be a positive integer")

        self._ensure_item_exists(normalised_type, item_id)

        existing = db.session.scalars(
            select(SavedItem).where(
                SavedItem.user_id == user.id,
                SavedItem.item_type == normalised_type,
                SavedItem.item_id == item_id,
            )
        ).first()
        if existing is not None:
            return self._to_dict(existing)

        saved = SavedItem(user_id=user.id, item_type=normalised_type, item_id=item_id)
        db.session.add(saved)
        db.session.commit()
        return self._to_dict(saved)

    def remove_item(self, user: User, item_type: str, item_id: int) -> bool:
        normalised_type = self._normalise_item_type(item_type)
        if normalised_type is None:
            raise ValueError("item_type must be 'team' or 'player'")
        if item_id <= 0:
            raise ValueError("item_id must be a positive integer")

        saved = db.session.scalars(
            select(SavedItem).where(
                SavedItem.user_id == user.id,
                SavedItem.item_type == normalised_type,
                SavedItem.item_id == item_id,
            )
        ).first()
        if saved is None:
            return False

        db.session.delete(saved)
        db.session.commit()
        return True

    @staticmethod
    def _normalise_item_type(item_type: str) -> str | None:
        normalised = str(item_type).strip().lower()
        return normalised if normalised in SUPPORTED_ITEM_TYPES else None

    @staticmethod
    def _ensure_item_exists(item_type: str, item_id: int) -> None:
        if item_type == "team":
            team = db.session.get(TournamentTeam, item_id)
            if team is None:
                raise ValueError("Team not found")
            return

        player = db.session.get(Player, item_id)
        if player is None:
            raise ValueError("Player not found")

    def _to_dict(self, saved: SavedItem) -> dict:
        payload = {
            "item_type": saved.item_type,
            "item_id": saved.item_id,
            "saved_at": saved.created_at.isoformat() if saved.created_at else None,
        }

        if saved.item_type == "team":
            team = db.session.get(TournamentTeam, saved.item_id)
            payload.update(
                {
                    "name": team.name if team else "Unknown team",
                    "fifa_code": team.fifa_code if team else "",
                }
            )
            return payload

        player = db.session.get(Player, saved.item_id)
        membership = db.session.scalars(
            select(SquadMember)
            .where(SquadMember.player_id == saved.item_id)
            .options(joinedload(SquadMember.team))
            .order_by(SquadMember.id.desc())
        ).first()

        payload.update(
            {
                "name": player.name if player else "Unknown player",
                "position": player.position if player else None,
                "team_name": membership.team.name if membership and membership.team else None,
                "team_fifa_code": membership.team.fifa_code
                if membership and membership.team
                else None,
            }
        )
        return payload
