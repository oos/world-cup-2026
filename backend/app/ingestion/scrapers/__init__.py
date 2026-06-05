from app.ingestion.scrapers.aljazeera_scraper import AlJazeeraSquadScraper
from app.ingestion.scrapers.base import BaseScraper
from app.ingestion.scrapers.espn_scraper import EspnSquadScraper
from app.ingestion.scrapers.wikipedia_scraper import WikipediaSquadScraper

__all__ = [
    "BaseScraper",
    "WikipediaSquadScraper",
    "AlJazeeraSquadScraper",
    "EspnSquadScraper",
]
