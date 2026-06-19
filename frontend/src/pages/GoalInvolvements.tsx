import { useEffect, useMemo, useState } from "react";
import { AdBanner } from "../ads/AdBanner";
import { api, type Match } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { TeamFlag } from "../components/TeamFlag";
import {
  buildGoalInvolvementStats,
  type GoalInvolvementEntry,
} from "../utils/worldCup2026GoalInvolvements";
import { goldenBootPlayerKey } from "../utils/goldenBootStats";

function InvolvementBarChart({
  entry,
  leaderInvolvements,
}: {
  entry: GoalInvolvementEntry;
  leaderInvolvements: number;
}) {
  const scale = leaderInvolvements > 0 ? 100 / leaderInvolvements : 0;
  const goalsWidth = entry.goals * scale;
  const assistsWidth = entry.assists * scale;

  return (
    <div className="goal-involvements-chart" role="cell">
      <div
        className="goal-involvements-chart-track"
        aria-label={`${entry.goals} goals, ${entry.assists} assists, ${entry.involvements} total involvements`}
      >
        {entry.goals > 0 ? (
          <div
            className="goal-involvements-chart-segment goal-involvements-chart-segment--goals"
            style={{ width: `${goalsWidth}%` }}
          >
            <span className="goal-involvements-chart-label">{entry.goals}</span>
          </div>
        ) : null}
        {entry.assists > 0 ? (
          <div
            className="goal-involvements-chart-segment goal-involvements-chart-segment--assists"
            style={{ width: `${assistsWidth}%` }}
          >
            <span className="goal-involvements-chart-label">{entry.assists}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function InvolvementRow({
  entry,
  leaderInvolvements,
}: {
  entry: GoalInvolvementEntry;
  leaderInvolvements: number;
}) {
  return (
    <div className="goal-involvements-row" role="row">
      <div className="goal-involvements-player" role="cell">
        <TeamFlag
          fifaCode={entry.teamFifaCode}
          teamName={entry.team}
          variant="badge"
          className="goal-involvements-flag"
        />
        <span className="goal-involvements-player-block">
          <span className="goal-involvements-player-name">{entry.player}</span>
          <span className="goal-involvements-team">{entry.team}</span>
        </span>
      </div>
      <span className="goal-involvements-stat goal-involvements-mp" role="cell">
        {entry.matches}
      </span>
      <InvolvementBarChart entry={entry} leaderInvolvements={leaderInvolvements} />
    </div>
  );
}

export function GoalInvolvements() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getMatches()
      .then((response) => setMatches(response.matches))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const leaderboard = useMemo(() => buildGoalInvolvementStats(matches), [matches]);
  const playedMatches = matches.filter((match) => match.score?.ft).length;
  const leaderInvolvements = leaderboard[0]?.involvements ?? 0;

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (loading) return <div className="loading">Loading goal involvements…</div>;

  return (
    <div className="goal-involvements-page">
      <PageHeader
        title="Most goal involvements"
        subtitle={`World Cup 2026 goals + assists · ${playedMatches} matches played`}
        accent="var(--palette-orange)"
      />

      {leaderboard.length === 0 ? (
        <div className="profile-card today-empty">
          <p className="empty-state">
            No goal involvements recorded yet. The leaderboard updates as matches are played
            and scorer data comes in.
          </p>
        </div>
      ) : (
        <div className="profile-card goal-involvements-card">
          <div className="goal-involvements-table" role="table" aria-label="Goal involvements">
            <div className="goal-involvements-header" role="row">
              <span className="goal-involvements-player" role="columnheader">
                Player
              </span>
              <span className="goal-involvements-stat goal-involvements-mp" role="columnheader">
                Games played
              </span>
              <div className="goal-involvements-chart-header" role="columnheader">
                <span>Involvements</span>
                <span className="goal-involvements-legend" aria-hidden="true">
                  <span className="goal-involvements-legend-item goal-involvements-legend-item--goals">
                    Goals
                  </span>
                  <span className="goal-involvements-legend-item goal-involvements-legend-item--assists">
                    Assists
                  </span>
                </span>
              </div>
            </div>
            {leaderboard.map((entry) => (
              <InvolvementRow
                key={goldenBootPlayerKey(entry.player, entry.team)}
                entry={entry}
                leaderInvolvements={leaderInvolvements}
              />
            ))}
          </div>
        </div>
      )}

      <AdBanner />
    </div>
  );
}
