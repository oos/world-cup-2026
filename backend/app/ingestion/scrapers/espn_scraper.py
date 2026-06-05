import re

from app.ingestion.dto import SquadPlayerDTO
from app.ingestion.scrapers.base import BaseScraper
from app.ingestion.team_mapper import name_to_fifa


class EspnSquadScraper(BaseScraper):
    source_name = "espn_scraper"
    url = "https://www.espn.com/soccer/story/_/id/48757621/2026-world-cup-squad-lists-players-announced-all-48-teams"

    def fetch_all_squads(self) -> dict[str, list[SquadPlayerDTO]]:
        soup = self.fetch_html(self.url)
        squads: dict[str, list[SquadPlayerDTO]] = {}
        current_fifa: str | None = None
        current_position: str | None = None

        for element in soup.find_all(["h2", "h3", "p"]):
            text = element.get_text(" ", strip=True)
            if element.name in ("h2", "h3"):
                if re.search(r"GROUP [A-L]", text, re.I):
                    continue
                fifa = name_to_fifa(text)
                if fifa:
                    current_fifa = fifa
                    squads.setdefault(fifa, [])
                    current_position = None
                pos = self.parse_position_group(text)
                if pos:
                    current_position = pos
            elif current_fifa and element.name == "p":
                if re.search(r"^(Goalkeepers|Defenders|Midfielders|Forwards):", text, re.I):
                    current_position = self.parse_position_group(text.split(":")[0])
                    player_text = text.split(":", 1)[-1]
                    self._parse_list(player_text, current_fifa, current_position, squads)

        return squads

    def _parse_list(
        self,
        text: str,
        fifa: str,
        position: str | None,
        squads: dict[str, list[SquadPlayerDTO]],
    ) -> None:
        for part in re.split(r",\s*", text):
            part = part.strip()
            if not part:
                continue
            m = re.match(r"^(.+?)\(([^)]+)\)$", part)
            if m:
                squads[fifa].append(
                    SquadPlayerDTO(
                        name=m.group(1).strip(),
                        club=m.group(2).strip(),
                        position=position,
                        source=self.source_name,
                    )
                )
            elif len(part) > 2:
                squads[fifa].append(
                    SquadPlayerDTO(
                        name=part,
                        position=position,
                        source=self.source_name,
                    )
                )
