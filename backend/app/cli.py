import click
from flask import Flask

from app.ingestion import IngestionService
from app.services.history_service import HistoryService


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
