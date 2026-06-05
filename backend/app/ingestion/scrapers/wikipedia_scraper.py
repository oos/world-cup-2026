import re

from app.ingestion.dto import SquadPlayerDTO
from app.ingestion.scrapers.base import BaseScraper
from app.ingestion.team_mapper import name_to_fifa


class WikipediaSquadScraper(BaseScraper):
    source_name = "wikipedia_scraper"
    url = "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_squads"

    def fetch_all_squads(self) -> dict[str, list[SquadPlayerDTO]]:
        soup = self.fetch_html(self.url)
        squads: dict[str, list[SquadPlayerDTO]] = {}
        current_team: str | None = None
        current_fifa: str | None = None

        for element in soup.find_all(["h2", "h3", "table"]):
            if element.name in ("h2", "h3"):
                title = element.get_text(strip=True).replace("[edit]", "")
                if "squad" in title.lower() or any(
                    c in title for c in ("Mexico", "Brazil", "England", "France", "Germany", "USA")
                ):
                    team_name = re.sub(r"\s+squad$", "", title, flags=re.I).strip()
                    fifa = name_to_fifa(team_name)
                    if fifa:
                        current_team = team_name
                        current_fifa = fifa
                        squads.setdefault(fifa, [])
            elif element.name == "table" and current_fifa:
                rows = element.find_all("tr")
                for row in rows[1:]:
                    cells = row.find_all(["td", "th"])
                    if len(cells) < 2:
                        continue
                    texts = [c.get_text(" ", strip=True) for c in cells]
                    jersey = None
                    name = None
                    position = None
                    club = None
                    for i, text in enumerate(texts):
                        if re.match(r"^\d{1,2}$", text):
                            jersey = int(text)
                        elif self.parse_position_group(text):
                            position = self.parse_position_group(text)
                        elif len(text) > 3 and not name:
                            name = re.sub(r"\([^)]*\)", "", text).strip()
                        elif club is None and name and text != name and len(text) > 2:
                            club = text
                    if name:
                        squads[current_fifa].append(
                            SquadPlayerDTO(
                                name=name,
                                position=position,
                                jersey_number=jersey,
                                club=club,
                                source=self.source_name,
                            )
                        )
        return squads
