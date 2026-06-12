import { useMemo } from "react";
import type { HistoryMatch } from "../api/client";
import {
  ROUND_CATEGORIES,
  buildTeamRoundStats,
  roundHatchClass,
} from "../utils/historyRoundStats";

export function HistoryRoundChart({ matches }: { matches: HistoryMatch[] }) {
  const teamStats = useMemo(() => buildTeamRoundStats(matches), [matches]);
  const maxTotal = Math.max(...teamStats.map((entry) => entry.total), 1);

  if (teamStats.length === 0) {
    return null;
  }

  return (
    <details className="history-chart-accordion history-year-accordion">
      <summary className="history-accordion-summary">
        <span className="history-accordion-title">Appearances by Round</span>
        <span className="history-accordion-meta">
          {teamStats.length} {teamStats.length === 1 ? "team" : "teams"}
        </span>
      </summary>
      <div className="history-chart-body">
        <section className="history-chart" aria-label="Team appearances by round">
          <p className="history-chart-subtitle">
            How many times each team played in each stage across all World Cups
          </p>

          <div className="history-chart-legend">
            {ROUND_CATEGORIES.map((round) => (
              <span key={round} className="history-chart-legend-item">
                <span
                  className={`history-chart-legend-swatch ${roundHatchClass(round)}`}
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
                          className={`history-chart-segment ${roundHatchClass(round)}`}
                          style={{
                            flexGrow: count,
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
      </div>
    </details>
  );
}
