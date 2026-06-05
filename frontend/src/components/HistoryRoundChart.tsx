import { useMemo } from "react";
import type { HistoryMatch } from "../api/client";
import {
  ROUND_CATEGORIES,
  ROUND_COLORS,
  buildTeamRoundStats,
} from "../utils/historyRoundStats";

export function HistoryRoundChart({ matches }: { matches: HistoryMatch[] }) {
  const teamStats = useMemo(() => buildTeamRoundStats(matches), [matches]);
  const maxTotal = Math.max(...teamStats.map((entry) => entry.total), 1);

  if (teamStats.length === 0) {
    return null;
  }

  return (
    <section className="history-chart" aria-label="Team appearances by round">
      <h2 className="history-chart-title">Appearances by Round</h2>
      <p className="history-chart-subtitle">
        How many times each team played in each stage across all World Cups
      </p>

      <div className="history-chart-legend">
        {ROUND_CATEGORIES.map((round) => (
          <span key={round} className="history-chart-legend-item">
            <span
              className="history-chart-legend-swatch"
              style={{ backgroundColor: ROUND_COLORS[round] }}
            />
            {round}
          </span>
        ))}
      </div>

      <div className="history-chart-rows">
        {teamStats.map((entry) => (
          <div key={entry.team} className="history-chart-row">
            <div className="history-chart-team" title={entry.team}>
              {entry.team}
            </div>
            <div className="history-chart-bar-track">
              <div
                className="history-chart-bar"
                style={{ width: `${(entry.total / maxTotal) * 100}%` }}
                role="img"
                aria-label={`${entry.team}: ${ROUND_CATEGORIES.map(
                  (round) => `${round} ${entry.rounds[round]}`
                ).join(", ")}`}
              >
                {ROUND_CATEGORIES.map((round) => {
                  const count = entry.rounds[round];
                  if (count === 0) return null;
                  return (
                    <span
                      key={round}
                      className="history-chart-segment"
                      style={{
                        flexGrow: count,
                        backgroundColor: ROUND_COLORS[round],
                      }}
                      title={`${entry.team} · ${round}: ${count}`}
                    >
                      <span className="history-chart-segment-label">{count}</span>
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="history-chart-total">{entry.total}</div>
          </div>
        ))}
      </div>

      <div className="history-chart-axis">
        <span>0</span>
        <span>{Math.round(maxTotal / 2)}</span>
        <span>{maxTotal}</span>
      </div>
    </section>
  );
}
