import { useEffect, useMemo, useState } from "react";
import type { HistoryMatch } from "../api/client";
import { getHistoryTeamContinent } from "../utils/historyTeamContinent";
import { ROUND_COLORS } from "../utils/historyChartColors";
import { formatChartAccordionMeta } from "../utils/historyChartMeta";
import { ROUND_CATEGORIES, buildTeamRoundStats } from "../utils/historyRoundStats";

const CHART_INITIAL_VISIBLE = 30;
const CHART_SHOW_MORE_STEP = 10;

type HistoryRoundChartProps = {
  matches: HistoryMatch[];
  rangeLabel: string;
  searchQuery?: string;
  filterContinent?: string;
  filterTeam?: string;
};

export function HistoryRoundChart({
  matches,
  rangeLabel,
  searchQuery = "",
  filterContinent = "",
  filterTeam = "",
}: HistoryRoundChartProps) {
  const [visibleCount, setVisibleCount] = useState(CHART_INITIAL_VISIBLE);

  const teamStats = useMemo(() => {
    const stats = buildTeamRoundStats(matches);
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return stats.filter((entry) => {
      if (filterTeam && entry.team !== filterTeam) return false;
      if (filterContinent && getHistoryTeamContinent(entry.team) !== filterContinent) {
        return false;
      }
      if (normalizedSearch && !entry.team.toLowerCase().includes(normalizedSearch)) {
        return false;
      }
      return true;
    });
  }, [matches, filterTeam, filterContinent, searchQuery]);

  useEffect(() => {
    setVisibleCount(CHART_INITIAL_VISIBLE);
  }, [matches, searchQuery, filterContinent, filterTeam]);

  const visibleTeams = useMemo(
    () => teamStats.slice(0, visibleCount),
    [teamStats, visibleCount]
  );
  const maxTotal = Math.max(...teamStats.map((entry) => entry.total), 1);
  const hasMore = visibleCount < teamStats.length;
  const remaining = teamStats.length - visibleCount;
  const nextBatch = Math.min(CHART_SHOW_MORE_STEP, remaining);

  if (matches.length === 0) {
    return null;
  }

  return (
    <details className="history-chart-accordion history-year-accordion">
      <summary className="history-accordion-summary">
        <span className="history-accordion-title">Appearances by Round</span>
        <span className="history-accordion-meta">
          {formatChartAccordionMeta(rangeLabel, teamStats.length, "team", "teams")}
        </span>
      </summary>
      <div className="history-chart-body">
        <section className="history-chart" aria-label="Team appearances by round">
          {teamStats.length === 0 ? (
            <p className="history-chart-empty">No teams match your search or filters.</p>
          ) : (
            <>
              <div className="history-chart-legend history-round-race-legend team-success-round-legend">
                {ROUND_CATEGORIES.map((round) => (
                  <span key={round} className="history-chart-legend-item">
                    <span
                      className="history-chart-legend-swatch"
                      style={{ backgroundColor: ROUND_COLORS[round] }}
                    />
                    <span className="history-chart-legend-label">{round}</span>
                  </span>
                ))}
              </div>

              <div className="history-chart-rows">
                {visibleTeams.map((entry) => (
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

              {hasMore && (
                <div className="history-chart-more">
                  <button
                    type="button"
                    className="btn-secondary history-chart-more-btn"
                    onClick={() =>
                      setVisibleCount((count) =>
                        Math.min(count + CHART_SHOW_MORE_STEP, teamStats.length)
                      )
                    }
                  >
                    Show {nextBatch} more
                  </button>
                </div>
              )}

              <div className="history-chart-axis">
                <span>0</span>
                <span>{Math.round(maxTotal / 2)}</span>
                <span>{maxTotal}</span>
              </div>
            </>
          )}
        </section>
      </div>
    </details>
  );
}
