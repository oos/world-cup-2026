from app.utils.country_codes import normalize_country_code


def test_normalize_country_code_maps_iso_codes():
    assert normalize_country_code("ca") == "Canada"
    assert normalize_country_code("US") == "USA"
    assert normalize_country_code("qa") == "Qatar"


def test_normalize_country_code_preserves_full_names():
    assert normalize_country_code("Canada") == "Canada"
    assert normalize_country_code(None) is None
