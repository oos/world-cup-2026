from typing import Generic, TypeVar

from app.extensions import db

T = TypeVar("T")


class BaseRepository(Generic[T]):
    model: type[T]

    def get_by_id(self, entity_id: int) -> T | None:
        return db.session.get(self.model, entity_id)

    def get_all(self) -> list[T]:
        return db.session.scalars(db.select(self.model)).all()

    def add(self, entity: T) -> T:
        db.session.add(entity)
        return entity

    def commit(self) -> None:
        db.session.commit()

    def rollback(self) -> None:
        db.session.rollback()
