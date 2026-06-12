from pathlib import Path

import pytest

from app.ingestion.scrapers.aljazeera_scraper import AlJazeeraSquadScraper
from app.utils.player_validation import is_valid_player_name

FIXTURE = Path(__file__).parent / "fixtures" / "scrapers" / "aljazeera_sample.html"


class TestPlayerValidation:
    @pytest.mark.parametrize(
        "name",
        [
            "About About Show more About Us Code of Ethics",
            "Privacy Policy",
            "Cookie Preferences",
            "Our Network Our Network Show more Al Jazeera Arabic",
            "",
            "A",
        ],
    )
    def test_rejects_junk_names(self, name):
        assert is_valid_player_name(name) is False

    @pytest.mark.parametrize(
        "name",
        [
            "Eldor Shomurodov",
            "Guillermo Ochoa",
            "Kim Min-jae",
            "João Cancelo",
        ],
    )
    def test_accepts_real_names(self, name):
        assert is_valid_player_name(name) is True


class TestAlJazeeraSquadScraper:
    def test_ignores_footer_links(self, monkeypatch):
        html = FIXTURE.read_text()
        scraper = AlJazeeraSquadScraper("TestAgent/1.0")

        def mock_fetch(_url):
            from bs4 import BeautifulSoup
            return BeautifulSoup(html, "html.parser")

        monkeypatch.setattr(scraper, "fetch_html", mock_fetch)
        squads = scraper.fetch_all_squads()
        scraper.close()

        assert "UZB" in squads
        names = {player.name for player in squads["UZB"]}
        assert "Eldor Shomurodov" in names
        assert "Privacy Policy" not in names
        assert not any("About Us" in name for name in names)
