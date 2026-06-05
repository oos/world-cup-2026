from app.ingestion.team_mapper import name_to_fifa


def test_name_to_fifa_common_names():
    assert name_to_fifa("Mexico") == "MEX"
    assert name_to_fifa("England") == "ENG"
    assert name_to_fifa("United States") == "USA"
    assert name_to_fifa("Czechia") == "CZE"
    assert name_to_fifa("Bosnia and Herzegovina") == "BIH"


def test_name_to_fifa_unknown():
    assert name_to_fifa("Atlantis") is None
