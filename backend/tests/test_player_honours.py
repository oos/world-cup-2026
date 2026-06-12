from app.ingestion.player_honours_client import PlayerHonoursClient
from app.utils.player_honours import build_honours_payload, categorize_competition


def test_categorize_competition_major_trophies():
    assert categorize_competition("FIFA World Cup").key == "world_cup"
    assert categorize_competition("UEFA Champions League").key == "champions_league"
    assert categorize_competition("Premier League").key == "premier_league"
    assert categorize_competition("Ballon d'Or").key == "ballon_dor"
    assert categorize_competition("FIFA World Cup Golden Ball") is None


def test_build_honours_payload_groups_major_counts():
    payload = build_honours_payload(
        [
            {
                "competition": "FIFA World Cup",
                "team": "Argentina",
                "seasons": ["2022"],
                "category": "world_cup",
                "category_label": "World Cup",
                "tier": "major",
            },
            {
                "competition": "UEFA Champions League",
                "team": "Barcelona",
                "seasons": ["2005–06", "2008–09", "2010–11", "2014–15"],
                "category": "champions_league",
                "category_label": "Champions League",
                "tier": "major",
            },
            {
                "competition": "La Liga",
                "team": "Barcelona",
                "seasons": ["2004–05", "2008–09"],
                "category": "la_liga",
                "category_label": "La Liga",
                "tier": "domestic",
            },
        ]
    )

    assert payload["major"] == [
        {"key": "champions_league", "label": "Champions League", "count": 4},
        {"key": "world_cup", "label": "World Cup", "count": 1},
    ]
    assert payload["domestic"][0]["count"] == 2


def test_parse_honour_li_extracts_competition_and_seasons():
    html = """
    <li>
      <a href="/wiki/UEFA_Champions_League" title="UEFA Champions League">UEFA Champions League</a>:
      <a href="/wiki/2005%E2%80%9306_UEFA_Champions_League" title="2005–06 UEFA Champions League">2005–06</a>,
      <a href="/wiki/2014%E2%80%9315_UEFA_Champions_League" title="2014–15 UEFA Champions League">2014–15</a>
    </li>
    """
    from bs4 import BeautifulSoup

    client = PlayerHonoursClient()
    li = BeautifulSoup(html, "html.parser").find("li")
    parsed = client._parse_honour_li(li)
    assert parsed == ("UEFA Champions League", ["2005–06 UEFA Champions League", "2014–15 UEFA Champions League"])
