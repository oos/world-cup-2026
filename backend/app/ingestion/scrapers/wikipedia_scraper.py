import re

from app.ingestion.dto import SquadPlayerDTO
from app.ingestion.scrapers.base import BaseScraper
from app.ingestion.team_mapper import name_to_fifa
from app.utils.player_validation import is_valid_player_name


class WikipediaSquadScraper(BaseScraper):
    source_name = "wikipedia_scraper"
    url = "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_squads"

    def fetch_all_squads(self) -> dict[str, list[SquadPlayerDTO]]:
        soup = self.fetch_html(self.url)
        squads: dict[str, list[SquadPlayerDTO]] = {}
        current_fifa: str | None = None

        for element in soup.find_all(["h2", "h3", "table"]):
            if element.name in ("h2", "h3"):
                title = element.get_text(strip=True).replace("[edit]", "")
                current_fifa = self._fifa_from_heading(title)
            elif element.name == "table" and current_fifa:
                self._parse_table(element, current_fifa, squads)

        return squads

    @staticmethod
    def _fifa_from_heading(title: str) -> str | None:
        if not title or title.lower() == "contents":
            return None
        if title.lower().startswith("group "):
            return None
        if "squad" in title.lower():
            team_name = re.sub(r"\s+squad$", "", title, flags=re.I).strip()
            return name_to_fifa(team_name)
        if re.match(r"^Group\s+[A-L]$", title, re.I):
            return None
        return name_to_fifa(title)

    def _parse_table(
        self,
        table,
        fifa: str,
        squads: dict[str, list[SquadPlayerDTO]],
    ) -> None:
        rows = table.find_all("tr")
        if len(rows) < 2:
            return

        header_cells = rows[0].find_all(["td", "th"])
        headers = [cell.get_text(" ", strip=True) for cell in header_cells]
        columns = self._column_indexes(headers)
        if not columns:
            return

        for row in rows[1:]:
            cells = row.find_all(["td", "th"])
            texts = [cell.get_text(" ", strip=True) for cell in cells]
            if len(texts) < 2:
                continue

            player = self._parse_structured_row(texts, columns)
            if player and is_valid_player_name(player.name):
                squads.setdefault(fifa, []).append(player)

    @staticmethod
    def _column_indexes(headers: list[str]) -> dict[str, int] | None:
        columns: dict[str, int] = {}
        for index, header in enumerate(headers):
            key = header.lower().strip().rstrip(".")
            if key in {"no", "no."}:
                columns["jersey"] = index
            elif key in {"pos", "pos."}:
                columns["position"] = index
            elif key == "player":
                columns["name"] = index
            elif key == "club":
                columns["club"] = index

        return columns if "name" in columns and "club" in columns else None

    def _parse_structured_row(
        self,
        texts: list[str],
        columns: dict[str, int],
    ) -> SquadPlayerDTO | None:
        name_index = columns["name"]
        if name_index >= len(texts):
            return None

        name = re.sub(r"\([^)]*\)", "", texts[name_index]).strip()
        if not name:
            return None

        jersey = None
        if "jersey" in columns and columns["jersey"] < len(texts):
            jersey_match = re.match(r"^\d{1,2}$", texts[columns["jersey"]].strip())
            if jersey_match:
                jersey = int(jersey_match.group())

        position = None
        if "position" in columns and columns["position"] < len(texts):
            parsed_jersey, position = self._parse_position_cell(texts[columns["position"]])
            if jersey is None:
                jersey = parsed_jersey

        club = None
        if "club" in columns and columns["club"] < len(texts):
            club = texts[columns["club"]].strip() or None
            if club and len(club) > 200:
                club = None

        return SquadPlayerDTO(
            name=name,
            position=position,
            jersey_number=jersey,
            club=club,
            source=self.source_name,
        )

    def _parse_position_cell(self, text: str) -> tuple[int | None, str | None]:
        cleaned = text.strip()
        match = re.match(r"^(\d{1,2})\s+(.+)$", cleaned)
        if match:
            jersey = int(match.group(1))
            position = self.parse_position_group(match.group(2))
            return jersey, position
        return None, self.parse_position_group(cleaned)
