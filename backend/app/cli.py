import click
from flask import Flask, current_app

from app.ingestion import IngestionService
from app.services.espn_commentary_service import EspnCommentaryService
from app.services.history_service import HistoryService
from app.services.push_service import PushService


def register_commands(app: Flask) -> None:
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
        history = HistoryService()
        history.sync_history()
        click.echo(f"Known scores applied: db={db_results}, history_cache_refreshed=True")

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
