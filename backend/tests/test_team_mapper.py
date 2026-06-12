from app.ingestion.team_mapper import history_team_matches_fifa, name_to_fifa


def test_name_to_fifa_common_names():
    assert name_to_fifa("Mexico") == "MEX"
    assert name_to_fifa("England") == "ENG"
    assert name_to_fifa("United States") == "USA"
    assert name_to_fifa("Czechia") == "CZE"
    assert name_to_fifa("Bosnia and Herzegovina") == "BIH"


def test_name_to_fifa_unknown():
    assert name_to_fifa("Atlantis") is None


def test_history_team_matches_fifa_aliases():
    assert history_team_matches_fifa("West Germany", "GER", "Germany")
    assert history_team_matches_fifa("Korea Republic", "KOR", "South Korea")
    assert history_team_matches_fifa("Argentina", "ARG", "Argentina")
    assert not history_team_matches_fifa("Brazil", "ARG", "Argentina")
