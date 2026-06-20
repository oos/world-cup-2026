from datetime import datetime, timedelta, timezone

from app.ingestion.score_merge import (
    apply_score_update,
    finalize_score_if_complete,
    merge_goals,
    merge_score,
    score_source_priority,
)


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


def test_merge_goals_preserves_assist_when_incoming_lacks_it():
    merged = merge_goals(
        [{"name": "Scorer", "minute": 9, "assist": "Assister"}],
        [{"name": "Scorer", "minute": 9}],
    )
    assert merged == [{"name": "Scorer", "minute": 9, "assist": "Assister"}]


def test_merge_goals_dedupes_string_stoppage_time_and_offset():
    merged = merge_goals(
        [{"name": "Folarin Balogun", "minute": "45+5"}],
        [{"name": "Folarin Balogun", "minute": 45, "offset": 5, "assist": "Malik Tillman"}],
    )
    assert merged == [
        {"name": "Folarin Balogun", "minute": 45, "offset": 5, "assist": "Malik Tillman"},
    ]


def test_merge_goals_dedupes_accent_and_case_name_variants():
    merged = merge_goals(
        [{"name": "Hwang In-beom", "minute": 67}],
        [{"name": "Hwang In-Beom", "minute": 67, "assist": "Lee Kang-In"}],
    )
    assert len(merged) == 1
    assert merged[0]["assist"] == "Lee Kang-In"


def test_dedupe_goals_collapses_duplicate_own_goals():
    from app.ingestion.score_merge import dedupe_goals

    deduped = dedupe_goals(
        [
            {"name": "Damian Bobadilla", "minute": "7", "owngoal": True},
            {"name": "Damián Bobadilla", "minute": 7, "owngoal": True},
        ]
    )
    assert len(deduped) == 1


def test_finalize_score_if_complete_marks_ft_without_final():
    score = {"ft": [2, 0], "ht": [1, 0]}
    finalized = finalize_score_if_complete(score)
    assert finalized == {"ft": [2, 0], "ht": [1, 0], "final": True}


def test_finalize_score_if_complete_keeps_recent_live_match():
    recent = datetime.now(timezone.utc).isoformat()
    score = {
        "ft": [2, 0],
        "live": {
            "state": "in",
            "period": "2H",
            "minute": 79,
            "updatedAt": recent,
        },
    }
    finalized = finalize_score_if_complete(score)
    assert finalized == score


def test_finalize_score_if_complete_marks_stale_live_with_ft():
    stale = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
    score = {
        "ft": [2, 0],
        "live": {
            "state": "in",
            "period": "2H",
            "minute": 79,
            "updatedAt": stale,
        },
    }
    finalized = finalize_score_if_complete(score)
    assert finalized == {"ft": [2, 0], "final": True}
