import re
from dataclasses import dataclass

import httpx

from app.ingestion.team_mapper import name_to_fifa

SPARQL_ENDPOINT = "https://query.wikidata.org/sparql"
TRANSFERMARKT_API = "https://www.transfermarkt.co.uk/ceapi/transferHistory/list"

YOUTH_NATIONAL_RE = re.compile(
    r"\b(u-?\d{1,2}|under-?\d{1,2}|youth|olympic)\b",
    re.IGNORECASE,
)

CAREER_QUERY = """
SELECT ?team ?teamLabel ?start ?end ?acqLabel WHERE {
  VALUES ?player { wd:%(wikidata_id)s }
  ?player p:P54 ?stmt.
  ?stmt ps:P54 ?team.
  OPTIONAL { ?stmt pq:P580 ?start. }
  OPTIONAL { ?stmt pq:P582 ?end. }
  OPTIONAL { ?stmt pq:P1642 ?acq. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY ?start
"""

TRANSFERMARKT_ID_QUERY = """
SELECT ?tmId WHERE {
  VALUES ?player { wd:%(wikidata_id)s }
  ?player wdt:P2446 ?tmId.
}
LIMIT 1
"""


@dataclass
class CareerStintDTO:
    team_name: str
    fifa_code: str | None = None
    badge_url: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    transfer_fee: str | None = None
    is_current: bool = False


class PlayerCareerClient:
    def __init__(self) -> None:
        self.client = httpx.Client(
            timeout=30.0,
            headers={"User-Agent": "WorldCup2026App/1.0 (https://github.com/oos/world-cup-2026)"},
        )

    def fetch_career(
        self, wikidata_id: str
    ) -> tuple[list[CareerStintDTO], list[CareerStintDTO], str | None]:
        wikidata_rows = self._fetch_wikidata_career(wikidata_id)
        international = self._international_from_wikidata(wikidata_rows)
        tm_id = self._fetch_transfermarkt_id(wikidata_id)
        if tm_id:
            club = self._club_from_transfermarkt(tm_id)
            if club:
                return club, international, "transfermarkt"
        club = self._club_from_wikidata(wikidata_rows)
        source = "wikidata" if club or international else None
        return club, international, source

    def _fetch_wikidata_career(self, wikidata_id: str) -> list[dict]:
        return self._sparql(CAREER_QUERY % {"wikidata_id": wikidata_id})

    def _fetch_transfermarkt_id(self, wikidata_id: str) -> str | None:
        rows = self._sparql(TRANSFERMARKT_ID_QUERY % {"wikidata_id": wikidata_id})
        if not rows:
            return None
        return rows[0].get("tmId") or None

    def _club_from_transfermarkt(self, tm_id: str) -> list[CareerStintDTO]:
        response = self.client.get(f"{TRANSFERMARKT_API}/{tm_id}")
        response.raise_for_status()
        transfers = response.json().get("transfers") or []
        if not transfers:
            return []

        sorted_transfers = sorted(
            transfers,
            key=lambda row: row.get("dateUnformatted") or row.get("date") or "",
        )

        stints: list[CareerStintDTO] = []
        for index, transfer in enumerate(sorted_transfers):
            to_club = transfer.get("to") or {}
            team_name = (to_club.get("clubName") or "").strip()
            if not team_name:
                continue

            start_date = transfer.get("dateUnformatted") or None
            end_date = None
            is_current = index == len(sorted_transfers) - 1
            if not is_current:
                next_transfer = sorted_transfers[index + 1]
                end_date = next_transfer.get("dateUnformatted") or None

            fee = (transfer.get("fee") or "").strip() or None
            badge_url = to_club.get("clubEmblem-2x") or to_club.get("clubEmblem-1x")

            stints.append(
                CareerStintDTO(
                    team_name=team_name,
                    badge_url=badge_url,
                    start_date=start_date,
                    end_date=end_date,
                    transfer_fee=fee,
                    is_current=is_current,
                )
            )

        return stints

    def _club_from_wikidata(self, rows: list[dict]) -> list[CareerStintDTO]:
        stints: list[CareerStintDTO] = []
        for row in rows:
            team_label = (row.get("teamLabel") or "").strip()
            if not team_label or self._is_international_team(team_label):
                continue
            start_date = self._parse_date(row.get("start"))
            end_date = self._parse_date(row.get("end"))
            stints.append(
                CareerStintDTO(
                    team_name=team_label,
                    start_date=start_date,
                    end_date=end_date,
                    transfer_fee=(row.get("acqLabel") or "").strip() or None,
                    is_current=end_date is None,
                )
            )
        return self._dedupe_stints(stints)

    def _international_from_wikidata(self, rows: list[dict]) -> list[CareerStintDTO]:
        stints: list[CareerStintDTO] = []
        for row in rows:
            team_label = (row.get("teamLabel") or "").strip()
            if not team_label or not self._is_international_team(team_label):
                continue
            start_date = self._parse_date(row.get("start"))
            end_date = self._parse_date(row.get("end"))
            country_name = self._national_team_country(team_label)
            stints.append(
                CareerStintDTO(
                    team_name=country_name or team_label,
                    fifa_code=name_to_fifa(country_name or team_label),
                    start_date=start_date,
                    end_date=end_date,
                    is_current=end_date is None,
                )
            )
        return self._dedupe_stints(stints)

    def _sparql(self, query: str) -> list[dict]:
        response = self.client.get(
            SPARQL_ENDPOINT,
            params={"query": query, "format": "json"},
        )
        response.raise_for_status()
        bindings = response.json().get("results", {}).get("bindings", [])
        parsed = []
        for binding in bindings:
            row = {}
            for key, val in binding.items():
                row[key] = val.get("value", "")
            parsed.append(row)
        return parsed

    @staticmethod
    def _parse_date(value: str | None) -> str | None:
        if not value:
            return None
        return value[:10]

    @staticmethod
    def _is_international_team(label: str) -> bool:
        lower = label.lower()
        if YOUTH_NATIONAL_RE.search(lower):
            return False
        return "national" in lower

    @staticmethod
    def _national_team_country(label: str) -> str | None:
        match = re.match(
            r"^(.*)\s+national(?:\s+(?:association\s+)?football|\s+soccer|\s+team)?\b",
            label,
            re.IGNORECASE,
        )
        if match:
            return match.group(1).strip()
        return None

    @staticmethod
    def _dedupe_stints(stints: list[CareerStintDTO]) -> list[CareerStintDTO]:
        seen: set[tuple[str, str | None, str | None]] = set()
        unique: list[CareerStintDTO] = []
        for stint in stints:
            key = (stint.team_name.lower(), stint.start_date, stint.end_date)
            if key in seen:
                continue
            seen.add(key)
            unique.append(stint)
        return unique

    def close(self) -> None:
        self.client.close()
