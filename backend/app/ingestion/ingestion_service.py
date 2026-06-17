from datetime import datetime

from flask import current_app
from sqlalchemy import and_, or_

from app.extensions import db
from app.ingestion.dto import SquadPlayerDTO
from app.ingestion.gap_detector import GapDetector
from app.ingestion.openfootball_client import OpenFootballClient
from app.ingestion.scrapers import AlJazeeraSquadScraper, EspnSquadScraper, WikipediaSquadScraper
from app.ingestion.scrapers.base import BaseScraper
from app.ingestion.known_scores import apply_known_score, known_goals_for_teams, known_score_for_teams
from app.ingestion.team_mapper import name_to_fifa
from app.ingestion.player_image_client import PlayerImageClient
from app.ingestion.wikidata_client import WikidataClient
from app.models.ingestion_run import IngestionRun
from app.models.match import Match
from app.models.player import Player
from app.models.squad_member import SquadMember
from app.models.stadium import Stadium
from app.models.tournament_team import TournamentTeam
from app.models.tournament import Tournament
from app.repositories.player_repository import PlayerRepository
from app.repositories.team_repository import TeamRepository
from app.services.match_upsert_service import MatchUpsertService
from app.services.nation_service import NationService
from app.utils.club_status import default_club_status_for_missing_club
from app.utils.country_codes import normalize_country_code
from app.utils.match_key import build_match_key
from app.utils.player_validation import is_valid_player_name


class IngestionService:
    TOURNAMENT_KEY = "world-cup-2026"

    def __init__(self) -> None:
        self.team_repo = TeamRepository()
        self.player_repo = PlayerRepository()
        self.gap_detector = GapDetector()
        self.nation_service = NationService()
        self.match_upsert = MatchUpsertService()

    def apply_known_scores(self) -> dict:
        updated = 0
        for match in db.session.scalars(db.select(Match)).all():
            if not match.match_date or not match.team1 or not match.team2:
                continue
            if isinstance(match.score, dict) and match.score.get("ft"):
                continue
            score = known_score_for_teams(
                match.match_date.isoformat(),
                match.team1.name,
                match.team2.name,
            )
            goals1, goals2 = known_goals_for_teams(
                match.match_date.isoformat(),
                match.team1.name,
                match.team2.name,
            )
            if not score and goals1 is None and goals2 is None:
                continue
            from app.ingestion.score_merge import apply_score_update

            if apply_score_update(
                match,
                score,
                source="known_scores",
                goals1=goals1,
                goals2=goals2,
                force=True,
            ):
                updated += 1
        db.session.commit()
        return {"updated": updated}

    def sync_all(self) -> dict:
        results = {}
        results["openfootball"] = self._sync_openfootball()
        results["wikidata"] = self._sync_wikidata()
        results["player_images"] = self._sync_player_images()
        if current_app.config.get("SYNC_SCRAPERS", True):
            results["scrapers"] = self._sync_scrapers()
        else:
            results["scrapers"] = {"skipped": True}
        results["gaps"] = self.gap_detector.detect().__dict__
        return results

    def _sync_openfootball(self) -> dict:
        run = self._start_run("openfootball")
        client = OpenFootballClient()
        count = 0
        try:
            tournament = self._ensure_tournament()
            self.nation_service.seed_nations()
            team_map: dict[str, TournamentTeam] = {}

            for dto in client.fetch_teams():
                nation = self.nation_service.get_by_fifa_code(dto.fifa_code)
                if not nation:
                    from app.models.nation import Nation

                    nation = Nation(
                        name=dto.name,
                        fifa_code=dto.fifa_code,
                        continent=dto.continent,
                        aliases=[],
                    )
                    db.session.add(nation)
                    db.session.flush()

                team = self.team_repo.get_by_fifa_code(dto.fifa_code, tournament_year=2026)
                if not team:
                    team = TournamentTeam(
                        tournament_id=tournament.id,
                        nation_id=nation.id,
                        group_name=f"Group {dto.group_name}" if dto.group_name else None,
                        confederation=dto.confederation,
                        flag_icon=dto.flag_icon,
                    )
                    self.team_repo.add(team)
                else:
                    team.group_name = f"Group {dto.group_name}" if dto.group_name else team.group_name
                    team.flag_icon = dto.flag_icon or team.flag_icon
                    team.confederation = dto.confederation or team.confederation
                team_map[dto.fifa_code] = team
                count += 1
            db.session.flush()

            stadium_map: dict[str, Stadium] = {}
            for dto in client.fetch_stadiums():
                if not dto.name:
                    continue
                stadium = db.session.scalars(
                    db.select(Stadium).where(Stadium.name == dto.name)
                ).first()
                if not stadium:
                    stadium = Stadium(
                        name=dto.name,
                        city=dto.city,
                        country=normalize_country_code(dto.country),
                    )
                    db.session.add(stadium)
                else:
                    if dto.city:
                        stadium.city = dto.city
                    normalized_country = normalize_country_code(dto.country)
                    if normalized_country:
                        stadium.country = normalized_country
                stadium_map[dto.name] = stadium
                if dto.city:
                    stadium_map[dto.city] = stadium
                count += 1
            db.session.flush()

            for dto in client.fetch_matches():
                t1_code = name_to_fifa(dto.team1_name) or dto.team1_name
                t2_code = name_to_fifa(dto.team2_name) or dto.team2_name
                team1 = team_map.get(t1_code) if len(t1_code) <= 3 else None
                team2 = team_map.get(t2_code) if len(t2_code) <= 3 else None
                if not team1 and len(dto.team1_name) > 3:
                    team1 = self._team_by_name(dto.team1_name, team_map)
                if not team2 and len(dto.team2_name) > 3:
                    team2 = self._team_by_name(dto.team2_name, team_map)

                stadium = stadium_map.get(dto.stadium_name or "") or self._stadium_by_ground(
                    dto.stadium_name, stadium_map
                )
                score = known_score_for_teams(
                    dto.match_date.isoformat() if dto.match_date else None,
                    dto.team1_name,
                    dto.team2_name,
                ) or dto.score
                goals1, goals2 = known_goals_for_teams(
                    dto.match_date.isoformat() if dto.match_date else None,
                    dto.team1_name,
                    dto.team2_name,
                )

                self.match_upsert.upsert_from_openfootball(
                    tournament,
                    round_name=dto.round,
                    match_number=dto.match_number,
                    match_date=dto.match_date,
                    match_time=dto.match_time,
                    group_name=dto.group_name,
                    team1=team1,
                    team2=team2,
                    team1_name=dto.team1_name,
                    team2_name=dto.team2_name,
                    stadium_id=stadium.id if stadium else None,
                    score=score,
                    goals1=goals1,
                    goals2=goals2,
                )
                count += 1

            db.session.commit()
            self._finish_run(run, count)
        except Exception as exc:
            db.session.rollback()
            self._finish_run(run, count, errors=[str(exc)])
            raise
        finally:
            client.close()
        return {"records": count}

    def _sync_wikidata(self) -> dict:
        run = self._start_run("wikidata")
        client = WikidataClient()
        count = 0
        try:
            for dto in client.fetch_squad_players():
                fifa = name_to_fifa(dto.nationality or "")
                if not fifa:
                    continue
                team = self.team_repo.get_by_fifa_code(fifa)
                if not team:
                    continue
                count += self._upsert_player(dto, team)
            db.session.commit()
            self._finish_run(run, count)
        except Exception as exc:
            db.session.rollback()
            self._finish_run(run, count, errors=[str(exc)])
        finally:
            client.close()
        return {"records": count}

    def _sync_player_images(self) -> dict:
        run = self._start_run("player_images")
        client = PlayerImageClient()
        updated = 0
        errors: list[str] = []
        try:
            for player in self.player_repo.players_missing_images():
                try:
                    image_url = None
                    if player.wikidata_id:
                        image_url = client.fetch_image_by_wikidata_id(player.wikidata_id)
                    if not image_url:
                        image_url = client.fetch_image_by_name(player.name)
                    if not image_url:
                        continue
                    player.image_url = image_url[:512]
                    sources = dict(player.data_sources or {})
                    sources["player_images"] = datetime.utcnow().isoformat()
                    player.data_sources = sources
                    updated += 1
                    if updated % 25 == 0:
                        db.session.commit()
                except Exception as exc:
                    db.session.rollback()
                    errors.append(f"{player.name}: {exc}")
            db.session.commit()
            self._finish_run(run, updated, errors=errors or None)
        except Exception as exc:
            db.session.rollback()
            self._finish_run(run, updated, errors=[*errors, str(exc)])
        finally:
            client.close()
        return {"records": updated, "errors": len(errors)}

    def _sync_scrapers(self) -> dict:
        gaps = self.gap_detector.detect()
        if not gaps.teams_low_squad and not gaps.players_missing_fields:
            return {"skipped": True, "reason": "no gaps"}

        user_agent = f"WorldCup2026App/1.0 ({current_app.config.get('APP_DOMAIN', '')})"
        scrapers: list[BaseScraper] = [
            WikipediaSquadScraper(user_agent),
            AlJazeeraSquadScraper(user_agent),
            EspnSquadScraper(user_agent),
        ]
        total = 0
        target_teams = set(gaps.teams_low_squad) or {
            t.fifa_code for t in self.team_repo.list_for_tournament(2026)
        }

        for scraper in scrapers:
            run = self._start_run(scraper.source_name)
            filled = 0
            try:
                squads = scraper.fetch_all_squads()
                for fifa_code in target_teams:
                    players = squads.get(fifa_code, [])
                    team = self.team_repo.get_by_fifa_code(fifa_code)
                    if not team:
                        continue
                    for dto in players:
                        filled += self._upsert_player(dto, team, fill_only=True)
                db.session.commit()
                self._finish_run(run, filled)
                total += filled
            except Exception as exc:
                db.session.rollback()
                self._finish_run(run, filled, errors=[str(exc)])
            finally:
                scraper.close()

        return {"records": total, "teams_targeted": len(target_teams)}

    def cleanup_invalid_players(self) -> dict:
        removed: list[dict] = []
        for player in self.player_repo.get_all():
            if is_valid_player_name(player.name):
                continue
            db.session.execute(
                db.delete(SquadMember).where(SquadMember.player_id == player.id)
            )
            db.session.delete(player)
            removed.append({"id": player.id, "name": player.name})
        db.session.commit()
        return {"removed": len(removed), "players": removed}

    def _upsert_player(self, dto: SquadPlayerDTO, team: TournamentTeam, fill_only: bool = False) -> int:
        if not is_valid_player_name(dto.name):
            return 0
        player = None
        if dto.api_football_id:
            player = self.player_repo.find_by_api_football_id(dto.api_football_id)
        if dto.wikidata_id and not player:
            player = self.player_repo.get_by_wikidata_id(dto.wikidata_id)
        if not player:
            player = self.player_repo.find_by_name_and_team(dto.name, team.id)
        if not player:
            norm = BaseScraper.normalize_name(dto.name)
            all_members = db.session.scalars(
                db.select(SquadMember).where(SquadMember.team_id == team.id)
            ).all()
            for member in all_members:
                if BaseScraper.normalize_name(member.player.name) == norm:
                    player = member.player
                    break

        if not player:
            sources = {dto.source: datetime.utcnow().isoformat()}
            if dto.api_football_id:
                sources["api_football_id"] = dto.api_football_id
            player = Player(
                wikidata_id=dto.wikidata_id,
                name=dto.name,
                position=dto.position,
                dob=dto.dob,
                height_cm=dto.height_cm,
                club=dto.club,
                club_status=None if dto.club else default_club_status_for_missing_club(dto.wikidata_id),
                image_url=dto.image_url,
                nationality=dto.nationality or team.name,
                data_sources=sources,
            )
            self.player_repo.add(player)
            db.session.flush()
        else:
            sources = dict(player.data_sources or {})
            if not fill_only or not player.position:
                if dto.position and (not fill_only or not player.position):
                    player.position = dto.position
            if dto.club and (not fill_only or not player.club):
                player.club = dto.club
                player.club_status = None
            elif not player.club and not player.club_status:
                player.club_status = default_club_status_for_missing_club(player.wikidata_id)
            if dto.dob and not player.dob:
                player.dob = dto.dob
            if dto.height_cm and not player.height_cm:
                player.height_cm = dto.height_cm
            if dto.image_url and not player.image_url:
                player.image_url = dto.image_url
            if dto.wikidata_id and not player.wikidata_id:
                player.wikidata_id = dto.wikidata_id
            if dto.api_football_id:
                sources["api_football_id"] = dto.api_football_id
            sources[dto.source] = datetime.utcnow().isoformat()
            player.data_sources = sources

        membership = db.session.scalars(
            db.select(SquadMember).where(
                SquadMember.team_id == team.id,
                SquadMember.player_id == player.id,
            )
        ).first()
        if not membership:
            membership = SquadMember(
                team_id=team.id,
                player_id=player.id,
                jersey_number=dto.jersey_number,
            )
            db.session.add(membership)
        elif dto.jersey_number and not membership.jersey_number:
            membership.jersey_number = dto.jersey_number

        return 1

    def _ensure_tournament(self) -> Tournament:
        tournament = db.session.scalars(
            db.select(Tournament).where(Tournament.external_key == self.TOURNAMENT_KEY)
        ).first()
        if not tournament:
            tournament = Tournament(
                name="World Cup 2026",
                year=2026,
                external_key=self.TOURNAMENT_KEY,
            )
            db.session.add(tournament)
            db.session.flush()
        return tournament

    def _stadium_by_ground(self, ground: str | None, stadium_map: dict[str, Stadium]) -> Stadium | None:
        if not ground:
            return None
        for stadium in stadium_map.values():
            if stadium.city and ground.lower() in stadium.city.lower():
                return stadium
            if ground.lower() in stadium.name.lower():
                return stadium
        return None

    def _team_by_name(self, name: str, team_map: dict[str, TournamentTeam]) -> TournamentTeam | None:
        fifa = name_to_fifa(name)
        if fifa and fifa in team_map:
            return team_map[fifa]
        for team in team_map.values():
            if team.name.lower() == name.lower():
                return team
        return None

    def _find_existing_match(
        self,
        tournament_id: int,
        dto,
        team1: TournamentTeam | None,
        team2: TournamentTeam | None,
    ) -> Match | None:
        if dto.match_date and dto.team1_name and dto.team2_name:
            match_key = build_match_key(dto.match_date, dto.team1_name, dto.team2_name)
            existing = db.session.scalars(
                db.select(Match).where(
                    Match.tournament_id == tournament_id,
                    Match.match_key == match_key,
                )
            ).first()
            if existing:
                return existing

        if dto.match_number:
            existing = db.session.scalars(
                db.select(Match).where(
                    Match.tournament_id == tournament_id,
                    Match.match_number == dto.match_number,
                )
            ).first()
            if existing:
                return existing

        if dto.match_date and team1 and team2:
            return db.session.scalars(
                db.select(Match).where(
                    Match.tournament_id == tournament_id,
                    Match.match_date == dto.match_date,
                    or_(
                        and_(Match.team1_id == team1.id, Match.team2_id == team2.id),
                        and_(Match.team1_id == team2.id, Match.team2_id == team1.id),
                    ),
                )
            ).first()

        return None

    def _start_run(self, source: str) -> IngestionRun:
        run = IngestionRun(source=source, started_at=datetime.utcnow())
        db.session.add(run)
        db.session.flush()
        return run

    def _finish_run(
        self,
        run: IngestionRun,
        records: int,
        errors: list[str] | None = None,
    ) -> None:
        run.finished_at = datetime.utcnow()
        run.records_upserted = records
        run.errors = errors or []
        db.session.commit()
