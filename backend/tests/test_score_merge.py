from app.ingestion.score_merge import apply_score_update, merge_goals, merge_score, score_source_priority


def test_merge_score_prefers_higher_priority_source():
    existing = {"ft": [0, 0]}
    incoming = {"ft": [2, 1], "ht": [1, 0]}
    merged = merge_score(existing, incoming, source="espn", existing_source="openfootball")
    assert merged == {"ft": [2, 1], "ht": [1, 0]}


def test_merge_score_does_not_downgrade_from_openfootball_null():
    existing = {"ft": [1, 1]}
    merged = merge_score(existing, None, source="openfootball", existing_source="espn")
    assert merged == {"ft": [1, 1]}


def test_merge_score_known_scores_can_override():
    existing = {"ft": [0, 0]}
    incoming = {"ft": [2, 0], "ht": [1, 0]}
    merged = merge_score(
        existing,
        incoming,
        source="known_scores",
        existing_source="openfootball",
        force=True,
    )
    assert merged == {"ft": [2, 0], "ht": [1, 0]}


def test_score_source_priority_order():
    assert score_source_priority("known_scores") > score_source_priority("espn")
    assert score_source_priority("espn") > score_source_priority("openfootball")


def test_apply_score_update_stamps_provenance():
    class Match:
        def __init__(self):
            self.score = None
            self.goals1 = []
            self.goals2 = []
            self.data_sources = {}

    match = Match()
    changed = apply_score_update(match, {"ft": [1, 0]}, source="espn", status="post")
    assert changed is True
    assert match.score == {"ft": [1, 0], "final": True}
    assert match.data_sources["score"]["source"] == "espn"
    assert match.data_sources["score"]["status"] == "post"


def test_merge_goals_handles_string_and_int_minutes():
    merged = merge_goals(
        [{"name": "Player A", "minute": 45}],
        [{"name": "Player B", "minute": "67'"}],
    )
    assert [goal["name"] for goal in merged] == ["Player A", "Player B"]
