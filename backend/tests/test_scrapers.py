from pathlib import Path

from app.ingestion.scrapers.wikipedia_scraper import WikipediaSquadScraper

FIXTURE = Path(__file__).parent / "fixtures" / "scrapers" / "wikipedia_sample.html"


class TestWikipediaSquadScraper:
    def test_parse_fixture(self, monkeypatch):
        html = FIXTURE.read_text()
        scraper = WikipediaSquadScraper("TestAgent/1.0")

        def mock_fetch(_url):
            from bs4 import BeautifulSoup
            return BeautifulSoup(html, "html.parser")

        monkeypatch.setattr(scraper, "fetch_html", mock_fetch)
        squads = scraper.fetch_all_squads()
        scraper.close()

        assert "MEX" in squads
        assert len(squads["MEX"]) >= 2
        assert squads["MEX"][0].name == "Guillermo Ochoa"
        assert squads["MEX"][0].jersey_number == 1
        assert squads["MEX"][0].club == "Salernitana"
        assert "BRA" in squads or "MEX" in squads
