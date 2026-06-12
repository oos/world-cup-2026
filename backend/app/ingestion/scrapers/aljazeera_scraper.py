import re

from app.ingestion.dto import SquadPlayerDTO
from app.ingestion.scrapers.base import BaseScraper
from app.ingestion.team_mapper import name_to_fifa
from app.utils.player_validation import is_footer_text, is_valid_player_name


class AlJazeeraSquadScraper(BaseScraper):
    source_name = "aljazeera_scraper"
    url = "https://www.aljazeera.com/sports/2026/6/2/fifa-world-cup-2026-full-squads-48-teams-players"

    def fetch_all_squads(self) -> dict[str, list[SquadPlayerDTO]]:
        soup = self.fetch_html(self.url)
        root = soup.find("article") or soup.find("main") or soup
        squads: dict[str, list[SquadPlayerDTO]] = {}
        current_fifa: str | None = None
        current_position: str | None = None

        for element in root.find_all(["h2", "h3", "p", "li"]):
            text = element.get_text(" ", strip=True)
            if not text or is_footer_text(text):
                current_fifa = None
                current_position = None
                continue

            if element.name in ("h2", "h3"):
                team_match = re.search(r"^(.+?)\s+World Cup squad", text, re.I)
                if team_match:
                    fifa = name_to_fifa(team_match.group(1))
                    if fifa:
                        current_fifa = fifa
                        squads.setdefault(fifa, [])
                        current_position = None
                pos_match = re.search(r"^(Goalkeepers|Defenders|Midfielders|Forwards)", text, re.I)
                if pos_match and current_fifa:
                    current_position = self.parse_position_group(pos_match.group(1))
                continue

            if not current_fifa or not current_position:
                continue

            if element.name == "p" and ":" in text:
                label, players_text = text.split(":", 1)
                position = self.parse_position_group(label.strip())
                if not position:
                    continue
                current_position = position
                self._parse_players(players_text, current_fifa, current_position, squads)
            elif element.name == "li":
                self._parse_player_line(text, current_fifa, current_position, squads)

        return squads

    def _parse_players(
        self,
        text: str,
        fifa: str,
        position: str | None,
        squads: dict[str, list[SquadPlayerDTO]],
    ) -> None:
        parts = re.split(r",\s*(?=[A-Z])", text)
        for part in parts:
            self._parse_player_line(part, fifa, position, squads)

    def _parse_player_line(
        self,
        line: str,
        fifa: str,
        position: str | None,
        squads: dict[str, list[SquadPlayerDTO]],
    ) -> None:
        line = line.strip()
        if not line or len(line) < 3 or is_footer_text(line):
            return
        match = re.match(r"^(\d+)\s+(.+?)(?:\s*\(([^)]+)\))?$", line)
        if match:
            jersey = int(match.group(1))
            name = match.group(2).strip()
            club = match.group(3)
        else:
            match2 = re.match(r"^(.+?)\(([^)]+)\)$", line)
            if match2:
                name = match2.group(1).strip()
                club = match2.group(2).strip()
                jersey = None
            else:
                name = line
                club = None
                jersey = None
        if not is_valid_player_name(name):
            return
        if name.lower().startswith(("goalkeeper", "defender", "midfield", "forward")):
            return
        squads[fifa].append(
            SquadPlayerDTO(
                name=name,
                position=position,
                jersey_number=jersey,
                club=club,
                source=self.source_name,
            )
        )
