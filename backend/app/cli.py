import logging

import click
from flask import Flask, current_app

from app.ingestion import IngestionService
from app.services.api_football_proof_sync_service import ApiFootballProofSyncService
from app.services.api_football_sync_service import ApiFootballSyncService
from app.services.espn_commentary_service import EspnCommentaryService
from app.services.history_service import HistoryService
from app.services.lineup_sync_service import LineupSyncService
from app.services.match_merge_service import MatchMergeService
from app.services.push_service import PushService
from app.services.score_sync_service import LiveScoreService


def register_commands(app: Flask) -> None:
    @app.cli.command("sync-api-football")
    @click.option(
        "--all-teams",
        is_flag=True,
        default=False,
        help="Sync all World Cup teams (~70–100 requests). Off by default.",
    )
    @click.option("--fixtures/--no-fixtures", default=False, help="Also fetch fixtures (1 request).")
    @click.option("--season", type=int, default=None, help="Season year (default: 2026). Free plan: 2022–2024 only.")
    def sync_api_football(all_teams, fixtures, season):
        """Sync World Cup squads (clubs, photos, profiles) from API-Football."""
        service = ApiFootballSyncService()
        try:
            results = service.sync(
                all_teams=all_teams,
                players=True,
                fixtures=fixtures,
                season=season or current_app.config.get("API_FOOTBALL_SEASON", 2026),
            )
        except RuntimeError as exc:
            raise click.ClickException(str(exc)) from exc
        click.echo(f"API-Football sync complete: {results}")

    @app.cli.command("sync-api-football-proof")
    @click.option("--match-key", default=None, help="History match_key override (default: proof config).")
    @click.option("--dry-run", is_flag=True, help="Print planned API calls without fetching.")
    @click.option("--budget", type=int, default=None, help="Max requests to use (default: API_FOOTBALL_DAILY_BUDGET).")
    def sync_api_football_proof(match_key, dry_run, budget):
        """Daily proof sync: enrich one WC match within the free-tier quota."""
        service = ApiFootballProofSyncService()
        try:
            results = service.run(match_key=match_key, dry_run=dry_run, budget=budget)
        except RuntimeError as exc:
            raise click.ClickException(str(exc)) from exc

        if results.get("skipped"):
            click.echo(f"Proof sync skipped: {results.get('reason')}")
            return

        if dry_run:
            click.echo(f"Proof sync dry-run: {results}")
            return

        used = results.get("requests_used", 0)
        remaining = results.get("remaining_daily")
        click.echo(
            f"Proof sync complete: {used} requests used"
            + (f", {remaining} remaining today" if remaining is not None else "")
        )
        if results.get("inspect_url"):
            click.echo(f"Inspect: GET {results['inspect_url']}")
        click.echo(f"Details: {results}")

    @app.cli.command("cleanup-players")
    def cleanup_players():
        """Remove scraped junk rows (footer links, nav text) stored as player names."""
        service = IngestionService()
        results = service.cleanup_invalid_players()
        click.echo(f"Player cleanup complete: {results}")

    @app.cli.command("sync-data")
    def sync_data():
        """Sync World Cup 2026 data from openfootball, Wikidata, and scrapers."""
        service = IngestionService()
        results = service.sync_all()
        click.echo(f"Sync complete: {results}")

    @app.cli.command("apply-known-scores")
    def apply_known_scores():
        """Backfill authoritative scores for completed matches missing from openfootball."""
        ingestion = IngestionService()
        db_results = ingestion.apply_known_scores()
        click.echo(f"Known scores applied: {db_results}")

    @app.cli.command("merge-duplicate-matches")
    @click.option("--year", type=int, default=2026, help="Tournament year to dedupe.")
    def merge_duplicate_matches(year):
        """Merge duplicate match rows onto a single canonical record per fixture."""
        service = MatchMergeService()
        results = service.merge_duplicates(year=year)
        click.echo(f"Duplicate match merge complete: {results}")

    @app.cli.command("sync-history")
    def sync_history():
        """Download World Cup match results from openfootball (1930–2026)."""
        service = HistoryService()
        results = service.sync_history()
        click.echo(f"History sync complete: {results}")

    @app.cli.command("sync-player-images")
    def sync_player_images():
        """Fetch profile photos from Wikidata and Wikipedia for players missing images."""
        service = IngestionService()
        results = service._sync_player_images()
        click.echo(f"Player image sync complete: {results}")

    @app.cli.command("sync-lineups")
    @click.option("--match-id", type=int, default=None, help="Sync a single match by ID.")
    @click.option("--force", is_flag=True, help="Re-fetch even if lineups are already stored.")
    def sync_lineups(match_id, force):
        """Fetch official match lineups from ESPN (API-Football fallback)."""
        service = LineupSyncService()
        try:
            results = service.sync(match_id=match_id, force=force)
        finally:
            service.close()
        click.echo(f"Lineup sync: {results}")

    @app.cli.command("sync-live-scores")
    def sync_live_scores():
        """Poll ESPN and API-Football for live scores when World Cup matches are in progress."""
        service = LiveScoreService()
        try:
            results = service.sync()
        finally:
            service.close()

        if results.get("skipped"):
            click.echo(f"Live score sync skipped: {results.get('reason')}")
            return

        updated = results.get("updated", 0)
        known_updated = results.get("known_scores_updated", 0)
        if updated > 0 or known_updated > 0:
            logging.getLogger(__name__).info(
                "Live score sync updated %s match(es), %s known score(s); "
                "live_candidates=%s catchup_candidates=%s espn_checked=%s api_football_checked=%s",
                updated,
                known_updated,
                results.get("live_candidates"),
                results.get("catchup_candidates"),
                results.get("espn_checked"),
                results.get("api_football_checked"),
            )
        click.echo(f"Live score sync: {results}")

    @app.cli.command("send-match-notifications")
    def send_match_notifications():
        """Send push notifications for upcoming match kickoffs."""
        service = PushService()
        results = service.send_match_reminders()
        click.echo(f"Match notifications: {results}")

    @app.cli.command("sync-espn-commentary")
    @click.option("--game-id", default=None, help="Single ESPN gameId to sync.")
    @click.option("--year", type=int, default=None, help="Discover and sync a World Cup year.")
    @click.option("--limit", type=int, default=None, help="Max matches to sync this run.")
    @click.option("--delay", type=float, default=None, help="Seconds between ESPN API calls.")
    @click.option("--force", is_flag=True, help="Re-sync commentary even if already stored.")
    @click.option("--discover-only", is_flag=True, help="Only discover game IDs, do not fetch commentary.")
    def sync_espn_commentary(game_id, year, limit, delay, force, discover_only):
        """Fetch ESPN match commentary slowly and store it in Postgres."""
        delay_seconds = delay if delay is not None else current_app.config.get("ESPN_COMMENTARY_DELAY", 6.0)
        service = EspnCommentaryService(delay=delay_seconds)
        try:
            if discover_only:
                if year is None:
                    raise click.ClickException("--year is required with --discover-only")
                discovered = service.discover_year(year)
                click.echo(f"Discovered {discovered} ESPN matches for {year}.")
                return

            results = service.sync(
                game_id=game_id,
                year=year,
                limit=limit,
                force=force,
                discover=year is not None,
            )
            click.echo(f"ESPN commentary sync complete: {results}")
        finally:
            service.close()
