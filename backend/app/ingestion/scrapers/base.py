import time
from abc import ABC, abstractmethod

import httpx
from bs4 import BeautifulSoup

from app.ingestion.dto import SquadPlayerDTO
from app.utils.player_name import normalize_player_name


class BaseScraper(ABC):
    source_name: str = "base"
    base_url: str = ""

    def __init__(self, user_agent: str, delay: float = 1.0) -> None:
        self.user_agent = user_agent
        self.delay = delay
        self._last_request = 0.0
        self.client = httpx.Client(
            timeout=30.0,
            headers={"User-Agent": user_agent},
            follow_redirects=True,
        )

    def _rate_limit(self) -> None:
        elapsed = time.time() - self._last_request
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)
        self._last_request = time.time()

    def fetch_html(self, url: str) -> BeautifulSoup:
        self._rate_limit()
        for attempt in range(3):
            try:
                response = self.client.get(url)
                if response.status_code == 429:
                    time.sleep(2 ** attempt)
                    continue
                response.raise_for_status()
                return BeautifulSoup(response.text, "html.parser")
            except httpx.HTTPError:
                if attempt == 2:
                    raise
                time.sleep(2 ** attempt)
        raise RuntimeError(f"Failed to fetch {url}")

    @abstractmethod
    def fetch_all_squads(self) -> dict[str, list[SquadPlayerDTO]]:
        """Return dict keyed by FIFA code."""

    @staticmethod
    def normalize_name(name: str) -> str:
        return normalize_player_name(name)

    @staticmethod
    def parse_position_group(text: str) -> str | None:
        upper = text.upper().strip()
        if "GOAL" in upper or upper == "GK":
            return "GK"
        if "DEF" in upper or upper == "DF":
            return "DEF"
        if "MID" in upper or upper == "MF":
            return "MID"
        if "FOR" in upper or "FWD" in upper or upper == "FW":
            return "FWD"
        return None

    def close(self) -> None:
        self.client.close()
