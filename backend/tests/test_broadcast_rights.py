from app.data.broadcast_rights_2026 import get_broadcast_country, list_broadcast_countries


def test_list_broadcast_countries_sorted_by_name():
    countries = list_broadcast_countries()
    names = [country["name"] for country in countries]
    assert names == sorted(names)
    assert any(country["code"] == "us" for country in countries)
    assert any(country["code"] == "gb" for country in countries)


def test_get_broadcast_country_case_insensitive():
    country = get_broadcast_country("US")
    assert country is not None
    assert country["name"] == "United States"
    assert any(b["name"] == "FOX" for b in country["broadcasters"])
    assert country["last_updated"]


def test_get_broadcast_country_unknown():
    assert get_broadcast_country("zz") is None
    assert get_broadcast_country(None) is None
