from datetime import datetime

import httpx

from app.ingestion.dto import SquadPlayerDTO
from app.ingestion.team_mapper import WIKIDATA_TEAM_LABELS, name_to_fifa

SPARQL_ENDPOINT = "https://query.wikidata.org/sparql"

SQUAD_QUERY = """
SELECT ?player ?playerLabel ?teamLabel ?positionLabel ?dob ?height ?clubLabel ?image ?nationalityLabel
WHERE {
  ?player wdt:P1344 wd:Q133699268 .
  OPTIONAL { ?player wdt:P54 ?club . }
  OPTIONAL { ?player wdt:P413 ?position . }
  OPTIONAL { ?player wdt:P569 ?dob . }
  OPTIONAL { ?player wdt:P2048 ?height . }
  OPTIONAL { ?player wdt:P18 ?image . }
  OPTIONAL { ?player wdt:P1532 ?nationality . }
  OPTIONAL {
    ?player p:P54 ?clubStatement .
    ?clubStatement ps:P54 ?club .
  }
  BIND(?nationality AS ?team)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 2000
"""

TEAM_SQUAD_QUERY = """
SELECT ?player ?playerLabel ?teamLabel ?positionLabel ?dob ?height ?clubLabel ?image
WHERE {
  ?player wdt:P1344 wd:Q133699268 .
  OPTIONAL { ?player wdt:P413 ?position . }
  OPTIONAL { ?player wdt:P569 ?dob . }
  OPTIONAL { ?player wdt:P2048 ?height . }
  OPTIONAL { ?player wdt:P18 ?image . }
  OPTIONAL { ?player wdt:P1532 ?nationality . }
  OPTIONAL {
    ?player p:P54 ?clubStatement .
    ?clubStatement ps:P54 ?club .
  }
  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en".
    ?player rdfs:label ?playerLabel .
    ?position rdfs:label ?positionLabel .
    ?club rdfs:label ?clubLabel .
    ?nationality rdfs:label ?teamLabel .
  }
}
LIMIT 2000
"""


class WikidataClient:
    def __init__(self) -> None:
        self.client = httpx.Client(
            timeout=60.0,
            headers={"User-Agent": "WorldCup2026App/1.0 (https://github.com/oos/world-cup-2026)"},
        )

    def fetch_squad_players(self) -> list[SquadPlayerDTO]:
        data = self._sparql(TEAM_SQUAD_QUERY)
        players = []
        for row in data:
            wikidata_id = row.get("player", "").split("/")[-1] if row.get("player") else None
            team_label = row.get("teamLabel", "")
            fifa = name_to_fifa(team_label)
            if not fifa:
                for label, code in WIKIDATA_TEAM_LABELS.items():
                    if label.lower() in team_label.lower() or team_label.lower() in label.lower():
                        fifa = code
                        break

            dob = None
            if row.get("dob"):
                try:
                    dob = datetime.fromisoformat(row["dob"].replace("Z", "+00:00")).date()
                except ValueError:
                    pass

            height = None
            if row.get("height"):
                try:
                    height = float(row["height"])
                except (ValueError, TypeError):
                    pass

            position = self._normalize_position(row.get("positionLabel", ""))

            players.append(
                SquadPlayerDTO(
                    name=row.get("playerLabel", "Unknown"),
                    position=position,
                    club=row.get("clubLabel"),
                    wikidata_id=wikidata_id,
                    dob=dob,
                    height_cm=height,
                    image_url=row.get("image"),
                    nationality=team_label,
                    source="wikidata",
                )
            )
        return players

    def _sparql(self, query: str) -> list[dict]:
        response = self.client.get(
            SPARQL_ENDPOINT,
            params={"query": query, "format": "json"},
        )
        response.raise_for_status()
        results = response.json()
        bindings = results.get("results", {}).get("bindings", [])
        parsed = []
        for b in bindings:
            row = {}
            for key, val in b.items():
                row[key] = val.get("value", "")
            parsed.append(row)
        return parsed

    @staticmethod
    def _normalize_position(label: str) -> str | None:
        if not label:
            return None
        lower = label.lower()
        if "goalkeeper" in lower or lower == "gk":
            return "GK"
        if "defender" in lower or "defence" in lower or lower == "df":
            return "DEF"
        if "midfield" in lower or lower == "mf":
            return "MID"
        if "forward" in lower or "striker" in lower or lower == "fw":
            return "FWD"
        return label[:8].upper()

    def close(self) -> None:
        self.client.close()
