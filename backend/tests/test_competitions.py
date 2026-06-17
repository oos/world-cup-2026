from app.data.competitions import FORMAT_LEAGUE, competition_by_slug, layout_for
from app.extensions import db
from app.models.match import Match
from app.models.tournament import Tournament
from app.models.tournament_team import TournamentTeam
from app.services.bracket_service import BracketService
from app.services.competition_ingestion_service import CompetitionIngestionService
from app.services.standings_service import StandingsService


def _ingest_sample(slug: str, *, sample_key: str | None = None) -> None:
    """Load structural sample data (no API-Football calls in CI)."""
    from datetime import datetime

    svc = CompetitionIngestionService()
    comp = competition_by_slug(slug)
    assert comp is not None
    tournament = svc.ensure_competition(comp)
    svc._ingest_sample(tournament, {"key": sample_key or slug})
    tournament.synced_at = datetime.utcnow()
    db.session.commit()


def test_seed_and_list_competitions(client):
    CompetitionIngestionService().seed_all()

    res = client.get("/api/v1/competitions")
    assert res.status_code == 200
    payload = res.get_json()

    slugs = {c["slug"] for c in payload["competitions"]}
    assert {"world-cup-2026", "premier-league", "la-liga", "fa-cup",
            "uefa-champions-league"} <= slugs

    region_keys = {r["key"] for r in payload["regions"]}
    assert {"world", "uefa", "england", "spain"} <= region_keys


def test_historical_world_cups_excluded_from_selector(client):
    """Past WC tournament rows (history sync) must not appear in the competition picker."""
    CompetitionIngestionService().seed_all()
    for year in (1998, 2002, 2022):
        db.session.add(
            Tournament(
                name=f"FIFA World Cup {year}",
                year=year,
                external_key=f"world-cup-{year}",
            )
        )
    db.session.commit()

    payload = client.get("/api/v1/competitions").get_json()
    slugs = {c["slug"] for c in payload["competitions"]}

    assert "world-cup-2026" in slugs
    assert "world-cup-1998" not in slugs
    assert "world-cup-2002" not in slugs
    assert "world-cup-2022" not in slugs
    assert not {s for s in slugs if s.startswith("world-cup-") and s != "world-cup-2026"}


def test_knockout_bracket_from_sample(client):
    _ingest_sample("fa-cup")

    res = client.get("/api/v1/competitions/fa-cup/bracket")
    assert res.status_code == 200
    bracket = res.get_json()

    round_keys = [r["key"] for r in bracket["rounds"]]
    assert round_keys == ["quarter_final", "semi_final", "final"]

    final = bracket["rounds"][-1]["ties"][0]
    winner_id = final["winner_team_id"]
    winner = next(
        t for t in (final["team1"], final["team2"]) if t and t["id"] == winner_id
    )
    assert winner["name"] == "Crystal Palace"


def test_league_phase_standings_and_two_legged_bracket(client):
    _ingest_sample("uefa-champions-league")

    standings = client.get("/api/v1/competitions/uefa-champions-league/standings").get_json()
    assert standings["mode"] == "league_phase"
    assert len(standings["rows"]) > 0
    # zones from the league-phase template
    kinds = {z["kind"] for z in standings["zones"]}
    assert {"qualify", "playoff", "out"} <= kinds
    # top row carries a position + qualify zone
    assert standings["rows"][0]["position"] == 1

    bracket = client.get("/api/v1/competitions/uefa-champions-league/bracket").get_json()
    assert bracket["two_legged"] is True
    playoff = next(r for r in bracket["rounds"] if r["key"] == "knockout_playoff")
    tie = playoff["ties"][0]
    # two legs aggregated into a tie
    assert len(tie["legs"]) == 2
    assert tie["score1"] is not None and tie["score2"] is not None


def test_matches_competition_param(client):
    _ingest_sample("fa-cup")

    res = client.get("/api/v1/matches?competition=fa-cup")
    assert res.status_code == 200
    assert len(res.get_json()["matches"]) > 0

    # a competition with no ingested matches returns an empty list
    other = client.get("/api/v1/matches?competition=premier-league")
    assert other.status_code == 200
    assert other.get_json()["matches"] == []


def test_teams_stats_competition_param(client):
    _ingest_sample("fa-cup")

    res = client.get("/api/v1/teams/stats?competition=fa-cup")
    assert res.status_code == 200
    stats = res.get_json()
    assert stats["team_count"] > 0
    assert stats["player_count"] >= 0


def test_single_league_standings_ordering(app):
    tournament = Tournament(
        name="Test League",
        year=2025,
        external_key="test-league",
        kind="league",
        format=FORMAT_LEAGUE,
        layout_config=layout_for(FORMAT_LEAGUE),
    )
    db.session.add(tournament)
    db.session.flush()

    names = ["Alpha", "Beta", "Gamma"]
    teams = {}
    for name in names:
        team = TournamentTeam(
            tournament_id=tournament.id, nation_id=None, display_name=name, short_code=name[:3].upper()
        )
        db.session.add(team)
        teams[name] = team
    db.session.flush()

    def add(t1, t2, g1, g2):
        db.session.add(
            Match(
                tournament_id=tournament.id,
                stage="league",
                team1_id=teams[t1].id,
                team2_id=teams[t2].id,
                match_key=f"{t1}-{t2}",
                score={"ft": [g1, g2]},
            )
        )

    add("Alpha", "Beta", 3, 0)   # Alpha win
    add("Alpha", "Gamma", 1, 1)  # draw
    add("Beta", "Gamma", 0, 2)   # Gamma win
    db.session.commit()

    standings = StandingsService().get_standings("test-league")
    rows = standings["rows"]
    assert standings["mode"] == "single"
    assert [r["name"] for r in rows] == ["Alpha", "Gamma", "Beta"]
    assert rows[0]["points"] == 4  # win + draw
    assert rows[0]["goal_difference"] == 3
