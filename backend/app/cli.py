import click
from flask import Flask

from app.ingestion import IngestionService
from app.services.history_service import HistoryService
from app.services.push_service import PushService


def register_commands(app: Flask) -> None:
    @app.cli.command("sync-data")
    def sync_data():
        """Sync World Cup 2026 data from openfootball, Wikidata, and scrapers."""
        service = IngestionService()
        results = service.sync_all()
        click.echo(f"Sync complete: {results}")

    @app.cli.command("sync-history")
    def sync_history():
        """Download all historical World Cup match results from openfootball."""
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
