"""Merge duplicate match rows and keep a single canonical record per fixture."""

from __future__ import annotations

from sqlalchemy import select

from app.extensions import db
from app.models.match import Match
from app.models.tournament import Tournament
from app.utils.match_dedup import dedupe_matches, match_identity_key


class MatchMergeService:
    def merge_duplicates(self, *, year: int | None = None) -> dict:
        stmt = select(Match).join(Match.tournament).order_by(Match.id)
        if year is not None:
            stmt = stmt.where(Tournament.year == year)

        matches = list(db.session.scalars(stmt).all())
        groups: dict[tuple, list[Match]] = {}
        for match in matches:
            key = match_identity_key(match)
            groups.setdefault(key, []).append(match)

        merged = 0
        deleted = 0
        for group in groups.values():
            if len(group) < 2:
                continue
            preferred = dedupe_matches(group)[0]
            for duplicate in group:
                if duplicate.id == preferred.id:
                    continue
                if duplicate.stadium_id and not preferred.stadium_id:
                    preferred.stadium_id = duplicate.stadium_id
                if duplicate.stadium_name and not preferred.stadium_name:
                    preferred.stadium_name = duplicate.stadium_name
                if duplicate.match_key and not preferred.match_key:
                    preferred.match_key = duplicate.match_key
                dup_score = duplicate.score if isinstance(duplicate.score, dict) else None
                pref_score = preferred.score if isinstance(preferred.score, dict) else None
                if dup_score and dup_score.get("ft") and not (pref_score and pref_score.get("ft")):
                    preferred.score = dup_score
                if duplicate.goals1 and not preferred.goals1:
                    preferred.goals1 = duplicate.goals1
                if duplicate.goals2 and not preferred.goals2:
                    preferred.goals2 = duplicate.goals2
                if duplicate.api_football_fixture_id and not preferred.api_football_fixture_id:
                    preferred.api_football_fixture_id = duplicate.api_football_fixture_id
                db.session.delete(duplicate)
                deleted += 1
                merged += 1

        db.session.commit()
        return {"groups_merged": merged, "rows_deleted": deleted}
