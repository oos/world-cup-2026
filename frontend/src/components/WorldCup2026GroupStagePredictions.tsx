import { useMemo, useState, type CSSProperties } from "react";
import type { Match, Team } from "../api/client";
import { TeamFlag } from "./TeamFlag";
import { WC26_GROUP_COLORS } from "../theme/plannerColors";
import {
  groupStageFixturesByGroup,
  hasActualResult,
  mergeGroupPredictions,
  type GroupScore,
} from "../utils/worldCup2026GroupPredictions";
import {
  buildGroupStandings,
  qualifiedThirdPlaceLetters,
} from "../utils/worldCup2026Standings";

function parseScoreInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
}

function GroupFixtureRow({
  match,
  prediction,
  onChange,
}: {
  match: Match;
  prediction: GroupScore | undefined;
  onChange: (matchNumber: number, score: GroupScore | null) => void;
}) {
  const locked = hasActualResult(match);
  const actual = match.score?.ft;
  const home = locked ? actual?.[0] ?? null : prediction?.[0] ?? null;
  const away = locked ? actual?.[1] ?? null : prediction?.[1] ?? null;

  const update = (side: 0 | 1, raw: string) => {
    if (locked || !match.match_number) return;
    const parsed = parseScoreInput(raw);
    const next: [number | null, number | null] =
      side === 0 ? [parsed, away] : [home, parsed];
    if (next[0] === null || next[1] === null) {
      onChange(match.match_number, null);
      return;
    }
    onChange(match.match_number, [next[0], next[1]]);
  };

  return (
    <div className={`wc26-group-fixture${locked ? " is-locked" : ""}`}>
      <span className="wc26-group-fixture-team wc26-group-fixture-team--home">
        <span className="wc26-group-fixture-name">{match.team1?.name ?? "TBD"}</span>
        <TeamFlag
          fifaCode={match.team1?.fifa_code}
          teamName={match.team1?.name}
          variant="badge"
          className="wc26-group-fixture-flag"
        />
      </span>
      <span className="wc26-group-fixture-scores">
        <input
          type="number"
          min={0}
          max={20}
          inputMode="numeric"
          className="wc26-prediction-input"
          value={home === null ? "" : String(home)}
          disabled={locked}
          onChange={(event) => update(0, event.target.value)}
          aria-label={`${match.team1?.name ?? "Home"} score`}
        />
        <span className="wc26-group-fixture-dash">–</span>
        <input
          type="number"
          min={0}
          max={20}
          inputMode="numeric"
          className="wc26-prediction-input"
          value={away === null ? "" : String(away)}
          disabled={locked}
          onChange={(event) => update(1, event.target.value)}
          aria-label={`${match.team2?.name ?? "Away"} score`}
        />
      </span>
      <span className="wc26-group-fixture-team wc26-group-fixture-team--away">
        <TeamFlag
          fifaCode={match.team2?.fifa_code}
          teamName={match.team2?.name}
          variant="badge"
          className="wc26-group-fixture-flag"
        />
        <span className="wc26-group-fixture-name">{match.team2?.name ?? "TBD"}</span>
      </span>
    </div>
  );
}

export function WorldCup2026GroupStagePredictions({
  matches,
  teams,
  predictions,
  onScoreChange,
  onClear,
}: {
  matches: Match[];
  teams: Team[];
  predictions: Record<number, GroupScore>;
  onScoreChange: (matchNumber: number, score: GroupScore | null) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);

  const fixtures = useMemo(() => groupStageFixturesByGroup(matches), [matches]);

  const mergedMatches = useMemo(
    () => mergeGroupPredictions(matches, predictions),
    [matches, predictions]
  );

  const standings = useMemo(
    () => buildGroupStandings(mergedMatches, teams),
    [mergedMatches, teams]
  );

  const qualifiedThirds = useMemo(
    () => qualifiedThirdPlaceLetters(standings),
    [standings]
  );

  const standingsByLetter = useMemo(
    () => new Map(standings.map((group) => [group.groupLetter, group])),
    [standings]
  );

  const { predictable, predicted } = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const bucket of fixtures) {
      for (const match of bucket.matches) {
        if (hasActualResult(match)) continue;
        total += 1;
        if (match.match_number && predictions[match.match_number]) done += 1;
      }
    }
    return { predictable: total, predicted: done };
  }, [fixtures, predictions]);

  const allGroupsComplete = standings.length > 0 && standings.every((g) => g.isComplete);

  if (fixtures.length === 0) return null;

  return (
    <section className="wc26-group-predictions" aria-label="Group stage predictions">
      <button
        type="button"
        className="wc26-group-predictions-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        data-track-button={open ? "collapse_group_predictions" : "expand_group_predictions"}
      >
        <span className="wc26-group-predictions-toggle-main">
          <span className="wc26-group-predictions-toggle-title">Group stage predictions</span>
          <span className="wc26-group-predictions-toggle-sub">
            {predicted}/{predictable} matches predicted ·{" "}
            {allGroupsComplete
              ? "all groups decided"
              : "fill every group to set the playoff slots"}
          </span>
        </span>
        <span className="wc26-group-predictions-chevron" aria-hidden="true">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open ? (
        <div className="wc26-group-predictions-body">
          <div className="wc26-group-predictions-toolbar">
            <p className="wc26-prediction-subtitle">
              Predict every group result to decide who advances. Top two in each group
              qualify automatically, plus the eight best third-placed teams.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClear}
              disabled={predicted === 0}
              data-track-button="clear_group_picks"
            >
              Clear group picks
            </button>
          </div>

          <div className="wc26-group-predictions-grid">
            {fixtures.map((bucket) => {
              const groupColor = WC26_GROUP_COLORS[bucket.groupLetter];
              const accentStyle = groupColor
                ? ({ "--group-accent": groupColor.bg } as CSSProperties)
                : undefined;
              const standing = standingsByLetter.get(bucket.groupLetter);

              return (
                <div
                  key={bucket.groupLetter}
                  className="wc26-group-predictions-card"
                  style={accentStyle}
                >
                  <h4 className="wc26-group-predictions-card-title">{bucket.groupLabel}</h4>

                  {standing ? (
                    <ol className="wc26-group-standings-mini">
                      {standing.rows.map((row) => {
                        const isTopTwo = row.position <= 2;
                        const isQualifiedThird =
                          row.position === 3 &&
                          standing.isComplete &&
                          qualifiedThirds.has(bucket.groupLetter);
                        const qualifies = isTopTwo || isQualifiedThird;
                        return (
                          <li
                            key={row.team.id}
                            className={[
                              "wc26-group-standings-row",
                              qualifies ? "is-qualified" : "",
                              isQualifiedThird ? "is-third" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            <span className="wc26-group-standings-pos">{row.position}</span>
                            <TeamFlag
                              fifaCode={row.team.fifa_code}
                              teamName={row.team.name}
                              variant="badge"
                              className="wc26-group-fixture-flag"
                            />
                            <span className="wc26-group-standings-name">{row.team.name}</span>
                            <span className="wc26-group-standings-pts">{row.points}</span>
                          </li>
                        );
                      })}
                    </ol>
                  ) : null}

                  <div className="wc26-group-fixtures">
                    {bucket.matches.map((match) => (
                      <GroupFixtureRow
                        key={match.match_number ?? match.id}
                        match={match}
                        prediction={
                          match.match_number ? predictions[match.match_number] : undefined
                        }
                        onChange={onScoreChange}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
