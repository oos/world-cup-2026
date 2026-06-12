import re
from dataclasses import dataclass

import httpx
from bs4 import BeautifulSoup, Tag

from app.utils.player_honours import categorize_competition, normalize_competition_name

WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php"
WIKIDATA_ENTITY_API = "https://www.wikidata.org/wiki/Special:EntityData/{wikidata_id}.json"
USER_AGENT = "WorldCup2026App/1.0 (https://github.com/oos/world-cup-2026)"

HONOURS_SECTION_NAMES = ("honours", "honors", "titles", "achievements")
SKIP_SECTION_NAMES = {"individual", "decorations", "orders", "see also", "notes"}


@dataclass
class HonourEntryDTO:
    competition: str
    seasons: list[str]
    team: str | None
    section: str | None
    category: str | None
    category_label: str | None
    tier: str | None


class PlayerHonoursClient:
    def __init__(self) -> None:
        self.client = httpx.Client(timeout=30.0, headers={"User-Agent": USER_AGENT})

    def fetch_honours(
        self,
        *,
        wikidata_id: str | None = None,
        player_name: str | None = None,
    ) -> tuple[list[HonourEntryDTO], str | None]:
        page_title = None
        if wikidata_id:
            page_title = self._wikipedia_title_for_wikidata(wikidata_id)
        if not page_title and player_name:
            page_title = self._search_wikipedia_title(player_name)

        if not page_title:
            return [], None

        section_index = self._find_honours_section_index(page_title)
        if not section_index:
            return [], None

        html = self._fetch_section_html(page_title, section_index)
        if not html:
            return [], None

        entries = self._parse_honours_html(html)
        return entries, "wikipedia"

    def _wikipedia_title_for_wikidata(self, wikidata_id: str) -> str | None:
        response = self.client.get(WIKIDATA_ENTITY_API.format(wikidata_id=wikidata_id))
        response.raise_for_status()
        entity = response.json().get("entities", {}).get(wikidata_id, {})
        sitelink = entity.get("sitelinks", {}).get("enwiki", {})
        return sitelink.get("title")

    def _search_wikipedia_title(self, player_name: str) -> str | None:
        response = self.client.get(
            WIKIPEDIA_API,
            params={
                "action": "query",
                "list": "search",
                "srsearch": player_name,
                "srlimit": 5,
                "format": "json",
            },
        )
        response.raise_for_status()
        results = response.json().get("query", {}).get("search", [])
        normalized_name = player_name.strip().lower()
        for result in results:
            title = result.get("title", "")
            if title.lower() == normalized_name:
                return title
        return results[0]["title"] if results else None

    def _find_honours_section_index(self, page_title: str) -> str | None:
        response = self.client.get(
            WIKIPEDIA_API,
            params={
                "action": "parse",
                "page": page_title,
                "prop": "sections",
                "format": "json",
            },
        )
        response.raise_for_status()
        sections = response.json().get("parse", {}).get("sections", [])
        for section in sections:
            line = (section.get("line") or "").strip().lower()
            if line in HONOURS_SECTION_NAMES:
                return section.get("index")
        for section in sections:
            line = (section.get("line") or "").strip().lower()
            if any(name in line for name in HONOURS_SECTION_NAMES):
                return section.get("index")
        return None

    def _fetch_section_html(self, page_title: str, section_index: str) -> str | None:
        response = self.client.get(
            WIKIPEDIA_API,
            params={
                "action": "parse",
                "page": page_title,
                "section": section_index,
                "prop": "text",
                "format": "json",
            },
        )
        response.raise_for_status()
        return response.json().get("parse", {}).get("text", {}).get("*")

    def _parse_honours_html(self, html: str) -> list[HonourEntryDTO]:
        soup = BeautifulSoup(html, "html.parser")
        entries: list[HonourEntryDTO] = []
        current_team: str | None = None
        current_section: str | None = None

        for element in soup.find_all(["p", "ul", "h3", "h4"]):
            if element.name in ("h3", "h4"):
                current_section = self._clean_heading(element.get_text(" ", strip=True))
                current_team = current_section
                continue

            if element.name == "p":
                heading = self._clean_heading(element.get_text(" ", strip=True))
                if not heading or heading.lower().startswith("cite error"):
                    continue
                current_team = heading
                current_section = heading
                continue

            if element.name != "ul":
                continue

            for li in element.find_all("li", recursive=False):
                parsed = self._parse_honour_li(li)
                if not parsed:
                    continue
                competition, seasons = parsed
                section_name = (current_section or current_team or "").strip()
                if self._should_skip_section(section_name):
                    continue

                category = categorize_competition(competition)
                entries.append(
                    HonourEntryDTO(
                        competition=competition,
                        seasons=seasons,
                        team=current_team,
                        section=section_name or None,
                        category=category.key if category else "other",
                        category_label=category.label if category else competition,
                        tier=category.tier if category else "other",
                    )
                )

        return entries

    def _parse_honour_li(self, li: Tag) -> tuple[str, list[str]] | None:
        links = li.find_all("a")
        if not links:
            return None

        competition = normalize_competition_name(links[0].get_text(" ", strip=True))
        if not competition:
            return None

        seasons: list[str] = []
        for link in links[1:]:
            season = self._normalize_season(link.get("title") or link.get_text(" ", strip=True))
            if season:
                seasons.append(season)

        if not seasons:
            text = li.get_text(" ", strip=True)
            if ":" in text:
                tail = text.split(":", 1)[1]
                seasons = [
                    self._normalize_season(part)
                    for part in re.split(r",|;", tail)
                    if self._normalize_season(part)
                ]

        if not seasons:
            return None

        return competition, seasons

    @staticmethod
    def _normalize_season(value: str) -> str | None:
        cleaned = re.sub(r"\[.*?\]", "", value).strip()
        cleaned = re.sub(r"\s+", " ", cleaned)
        if not cleaned or cleaned.lower().startswith("note"):
            return None
        return cleaned

    @staticmethod
    def _clean_heading(value: str) -> str:
        cleaned = re.sub(r"\[.*?\]", "", value)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned

    @staticmethod
    def _should_skip_section(section_name: str) -> bool:
        lower = section_name.lower()
        return any(skip in lower for skip in SKIP_SECTION_NAMES)

    def close(self) -> None:
        self.client.close()
