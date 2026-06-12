import logging
from datetime import date, datetime

from sqlalchemy import select

from app.extensions import db
from app.ingestion.espn_commentary_client import EspnCommentaryClient
from app.ingestion.team_mapper import name_to_fifa
from app.ingestion.world_cup_years import CURRENT_WORLD_CUP_YEAR, HISTORICAL_WORLD_CUP_YEARS
from app.models.espn_match import EspnMatch, MatchCommentaryEvent
from app.models.match import Match
from app.services.history_service import HistoryService

logger = logging.getLogger(__name__)


class EspnCommentaryService:
    USER_AGENT = "WorldCup2026App/1.0 (https://github.com/oos/world-cup-2026; +espn-commentary-sync)"

    def __init__(self, delay: float = 6.0) -> None:
        self.client = EspnCommentaryClient(self.USER_AGENT, delay=delay)
        self.history_service = HistoryService()

    def close(self) -> None:
        self.client.close()

    def sync(
        self,
        *,
        game_id: str | None = None,
        year: int | None = None,
        limit: int | None = None,
        force: bool = False,
        discover: bool = True,
    ) -> dict:
        results = {"discovered": 0, "synced": 0, "skipped": 0, "errors": []}

        if discover and year is not None:
            results["discovered"] = self.discover_year(year)

        if game_id:
            self._ensure_game_record(str(game_id))

        targets = self._select_targets(game_id=game_id, year=year, limit=limit, force=force)

        for espn_match in targets:
            try:
                if self.sync_game(espn_match, force=force):
                    results["synced"] += 1
                else:
                    results["skipped"] += 1
            except Exception as exc:  # noqa: BLE001 - collect and continue slowly
                logger.exception("Failed syncing ESPN game %s", espn_match.espn_game_id)
                results["errors"].append({"espn_game_id": espn_match.espn_game_id, "error": str(exc)})

        return results

    def discover_year(self, year: int) -> int:
        dates = self.client.tournament_dates(year)
        if not dates:
            raise ValueError(f"No ESPN date window configured for World Cup {year}")

        discovered = 0
        for event in self.client.fetch_scoreboard(dates):
            parsed = self.client.parse_scoreboard_event(event)
            if not parsed:
                continue
            parsed["year"] = year
            if self._upsert_discovered_match(parsed):
                discovered += 1
        return discovered

    def sync_game(self, espn_match: EspnMatch, *, force: bool = False) -> bool:
        if espn_match.commentary_synced_at and not force:
            return False

        summary = self.client.fetch_summary(espn_match.espn_game_id)
        events = self.client.parse_commentary(summary)
        if not events:
            return False

        db.session.execute(
            db.delete(MatchCommentaryEvent).where(MatchCommentaryEvent.espn_match_id == espn_match.id)
        )

        for item in events:
            db.session.add(
                MatchCommentaryEvent(
                    espn_match_id=espn_match.id,
                    sequence=item["sequence"],
                    period=item.get("period"),
                    clock_display=item.get("clock_display"),
                    clock_value=item.get("clock_value"),
                    event_type=item.get("event_type"),
                    text=item["text"],
                    is_key_event=item.get("is_key_event", False),
                    raw=item.get("raw"),
                )
            )

        espn_match.commentary_synced_at = datetime.utcnow()
        espn_match.commentary_event_count = len(events)
        db.session.commit()
        return True

    def get_commentary_for_match_id(self, match_id: int) -> dict | None:
        return self._get_commentary_payload(
            db.session.scalars(select(EspnMatch).where(EspnMatch.match_id == match_id)).first()
        )

    def get_commentary_for_history(self, year: int, match_key: str) -> dict | None:
        return self._get_commentary_payload(
            db.session.scalars(
                select(EspnMatch).where(
                    EspnMatch.year == year,
                    EspnMatch.history_match_key == match_key,
                )
            ).first()
        )

    @classmethod
    def get_stored_commentary_for_match_id(cls, match_id: int) -> dict | None:
        espn_match = db.session.scalars(
            select(EspnMatch).where(EspnMatch.match_id == match_id)
        ).first()
        return cls._payload_for(espn_match)

    @classmethod
    def get_stored_commentary_for_history(cls, year: int, match_key: str) -> dict | None:
        espn_match = db.session.scalars(
            select(EspnMatch).where(
                EspnMatch.year == year,
                EspnMatch.history_match_key == match_key,
            )
        ).first()
        return cls._payload_for(espn_match)

    def _commentary_payload(self, espn_match: EspnMatch) -> dict:
        return self._payload_for(espn_match) or {}

    @staticmethod
    def _payload_for(espn_match: EspnMatch | None) -> dict | None:
        if espn_match is None:
            return None
        return {
            **espn_match.to_dict(),
            "events": [event.to_dict() for event in espn_match.events],
        }

    def _get_commentary_payload(self, espn_match: EspnMatch | None) -> dict | None:
        return self._payload_for(espn_match)

    def _select_targets(
        self,
        *,
        game_id: str | None,
        year: int | None,
        limit: int | None,
        force: bool,
    ) -> list[EspnMatch]:
        stmt = select(EspnMatch).order_by(EspnMatch.year, EspnMatch.match_date, EspnMatch.id)

        if game_id:
            stmt = stmt.where(EspnMatch.espn_game_id == str(game_id))
        if year is not None:
            stmt = stmt.where(EspnMatch.year == year)
        if not force:
            stmt = stmt.where(EspnMatch.commentary_synced_at.is_(None))

        if limit is not None:
            stmt = stmt.limit(limit)

        return list(db.session.scalars(stmt).all())

    def _upsert_discovered_match(self, parsed: dict) -> bool:
        espn_game_id = parsed["espn_game_id"]
        espn_match = db.session.scalars(
            select(EspnMatch).where(EspnMatch.espn_game_id == espn_game_id)
        ).first()

        if espn_match is None:
            espn_match = EspnMatch(espn_game_id=espn_game_id)
            db.session.add(espn_match)
            created = True
        else:
            created = False

        espn_match.year = parsed.get("year") or espn_match.year
        espn_match.match_date = parsed.get("match_date") or espn_match.match_date
        espn_match.home_team = parsed.get("home_team") or espn_match.home_team
        espn_match.away_team = parsed.get("away_team") or espn_match.away_team

        if not espn_match.match_id or not espn_match.history_match_key:
            self._link_match(espn_match)

        db.session.commit()
        return created

    def _ensure_game_record(self, game_id: str) -> EspnMatch:
        espn_match = db.session.scalars(
            select(EspnMatch).where(EspnMatch.espn_game_id == game_id)
        ).first()
        if espn_match:
            return espn_match

        summary = self.client.fetch_summary(game_id)
        competition = (summary.get("header", {}).get("competitions") or [{}])[0]
        competitors = competition.get("competitors") or []
        home_team = away_team = None
        for competitor in competitors:
            name = (competitor.get("team") or {}).get("displayName")
            if competitor.get("homeAway") == "home":
                home_team = name
            elif competitor.get("homeAway") == "away":
                away_team = name

        match_date = None
        date_text = competition.get("date") or summary.get("header", {}).get("date")
        if date_text:
            match_date = datetime.fromisoformat(date_text.replace("Z", "+00:00")).date()

        year = (summary.get("header", {}).get("season") or {}).get("year")
        if year is None and match_date:
            year = match_date.year

        espn_match = EspnMatch(
            espn_game_id=game_id,
            year=year,
            match_date=match_date,
            home_team=home_team,
            away_team=away_team,
        )
        db.session.add(espn_match)
        self._link_match(espn_match)
        db.session.commit()
        return espn_match

    def _link_match(self, espn_match: EspnMatch) -> None:
        if espn_match.match_date and espn_match.home_team and espn_match.away_team:
            db_match = self._find_db_match(
                espn_match.match_date,
                espn_match.home_team,
                espn_match.away_team,
            )
            if db_match:
                espn_match.match_id = db_match.id

            if espn_match.year:
                history_key = self._find_history_match_key(
                    espn_match.year,
                    espn_match.match_date,
                    espn_match.home_team,
                    espn_match.away_team,
                )
                if history_key:
                    espn_match.history_match_key = history_key

    def _find_db_match(
        self,
        match_date: date,
        home_team: str,
        away_team: str,
    ) -> Match | None:
        target = self._team_codes(home_team, away_team)
        for match in db.session.scalars(select(Match).where(Match.match_date == match_date)).all():
            if not match.team1 or not match.team2:
                continue
            codes = self._team_codes(match.team1.name, match.team2.name)
            if codes == target:
                return match
        return None

    def _find_history_match_key(
        self,
        year: int,
        match_date: date,
        home_team: str,
        away_team: str,
    ) -> str | None:
        target = self._team_codes(home_team, away_team)
        for match in self.history_service.list_matches(year=year):
            if match.get("date") != match_date.isoformat():
                continue
            codes = self._team_codes(match.get("team1", ""), match.get("team2", ""))
            if codes == target:
                return self.history_service.build_match_key(match)
        return None

    @staticmethod
    def _team_codes(team_a: str, team_b: str) -> frozenset[str]:
        def code(name: str) -> str:
            return (name_to_fifa(name) or name or "").strip().lower()

        return frozenset({code(team_a), code(team_b)})

    @staticmethod
    def supported_years() -> list[int]:
        from app.ingestion.espn_commentary_client import TOURNAMENT_DATE_WINDOWS

        configured = set(TOURNAMENT_DATE_WINDOWS)
        return sorted(configured.intersection({*HISTORICAL_WORLD_CUP_YEARS, CURRENT_WORLD_CUP_YEAR}))
