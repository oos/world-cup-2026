from app.ingestion.non_participation import get_absence_reason


def test_argentina_withdrew_in_1954():
    reason = get_absence_reason("ARG", 1954)
    assert reason["absence_reason"] == "withdrew"
    assert reason["absence_label"] == "Withdrew"


def test_default_absence_is_did_not_qualify():
    reason = get_absence_reason("SCO", 2022)
    assert reason["absence_reason"] == "did_not_qualify"
    assert reason["absence_label"] == "Did not qualify"


def test_pre_independence_absence():
    reason = get_absence_reason("CRO", 1990)
    assert reason["absence_reason"] == "not_established"
    assert reason["absence_label"] == "Not yet independent"
