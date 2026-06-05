import httpx

SPARQL_ENDPOINT = "https://query.wikidata.org/sparql"
WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php"
USER_AGENT = "WorldCup2026App/1.0 (https://github.com/oos/world-cup-2026)"


class PlayerImageClient:
    def __init__(self) -> None:
        self.client = httpx.Client(timeout=30.0, headers={"User-Agent": USER_AGENT})

    def fetch_image_by_wikidata_id(self, wikidata_id: str) -> str | None:
        if not wikidata_id:
            return None
        query = f"""
        SELECT ?image WHERE {{
          wd:{wikidata_id} wdt:P18 ?image .
        }}
        LIMIT 1
        """
        response = self.client.get(
            SPARQL_ENDPOINT,
            params={"query": query, "format": "json"},
        )
        response.raise_for_status()
        bindings = response.json().get("results", {}).get("bindings", [])
        if not bindings:
            return None
        return self.normalize_image_url(bindings[0]["image"]["value"])

    def fetch_image_by_name(self, name: str) -> str | None:
        if not name:
            return None
        response = self.client.get(
            WIKIPEDIA_API,
            params={
                "action": "query",
                "generator": "search",
                "gsrsearch": name,
                "gsrlimit": 3,
                "prop": "pageimages",
                "piprop": "thumbnail",
                "pithumbsize": 200,
                "format": "json",
            },
        )
        response.raise_for_status()
        pages = response.json().get("query", {}).get("pages", {})
        for page in pages.values():
            thumbnail = page.get("thumbnail", {}).get("source")
            if thumbnail:
                return thumbnail
        return None

    @staticmethod
    def normalize_image_url(url: str, width: int = 200) -> str:
        if "commons.wikimedia.org/wiki/Special:FilePath/" in url:
            base = url.split("?")[0]
            return f"{base}?width={width}"
        return url

    def close(self) -> None:
        self.client.close()
