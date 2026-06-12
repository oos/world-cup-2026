import { useEffect, useMemo, useState } from "react";
import type { HistoryMatch } from "../api/client";
import { TeamFlag } from "./TeamFlag";
import { formatChartAccordionMeta } from "../utils/historyChartMeta";
import { buildGoldenBootStats } from "../utils/goldenBootStats";

const INITIAL_VISIBLE = 30;
const SHOW_MORE_STEP = 10;

export function HistoryGoldenBoot({
  matches,
  rangeLabel,
}: {
  matches: HistoryMatch[];
  rangeLabel: string;
}) {
  const scorers = useMemo(() => buildGoldenBootStats(matches), [matches]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [matches, rangeLabel]);

  const maxGoals = Math.max(...scorers.map((entry) => entry.goals), 1);
  const visibleScorers = scorers.slice(0, visibleCount);
  const hasMore = visibleCount < scorers.length;
  const nextBatch = Math.min(SHOW_MORE_STEP, scorers.length - visibleCount);

  if (scorers.length === 0) {
    return (
      <details className="history-chart-accordion history-year-accordion">
        <summary className="history-accordion-summary">
          <span className="history-accordion-title">Golden Boot by Year</span>
          <span className="history-accordion-meta">{rangeLabel}</span>
        </summary>
        <div className="history-chart-body">
          <p className="history-chart-empty">No goal scorers found for {rangeLabel}.</p>
        </div>
      </details>
    );
  }

  return (
    <details className="history-chart-accordion history-year-accordion">
      <summary className="history-accordion-summary">
        <span className="history-accordion-title">Golden Boot by Year</span>
        <span className="history-accordion-meta">
          {formatChartAccordionMeta(rangeLabel, scorers.length, "player", "players")}
        </span>
      </summary>
      <div className="history-chart-body">
        <section className="history-chart history-golden-boot" aria-label="Golden Boot leaderboard">
          <div className="history-golden-boot-table" role="table">
            <div className="history-golden-boot-header" role="row">
              <span className="history-golden-boot-rank" role="columnheader">
                #
              </span>
              <span className="history-golden-boot-name" role="columnheader">
                Name
              </span>
              <span className="history-golden-boot-played" role="columnheader">
                Played
              </span>
              <span className="history-golden-boot-goals" role="columnheader">
                Goals
              </span>
            </div>

            {visibleScorers.map((entry) => (
              <div key={`${entry.player}-${entry.team}`} className="history-golden-boot-row" role="row">
                <span className="history-golden-boot-rank" role="cell">
                  {entry.rank}
                </span>
                <div className="history-golden-boot-name" role="cell">
                  <TeamFlag
                    teamName={entry.team}
                    variant="badge"
                    className="history-golden-boot-flag"
                  />
                  <span className="history-golden-boot-player-block">
                    <span className="history-golden-boot-player">{entry.player}</span>
                    <span className="history-golden-boot-team">{entry.team}</span>
                  </span>
                </div>
                <span className="history-golden-boot-played" role="cell">
                  {entry.played}
                </span>
                <div className="history-golden-boot-goals" role="cell">
                  <div className="history-golden-boot-goals-track">
                    <div
                      className="history-golden-boot-goals-bar"
                      style={{ width: `${(entry.goals / maxGoals) * 100}%` }}
                    >
                      <span className="history-golden-boot-goals-count">{entry.goals}</span>
                    </div>
                  </div>
                </div>
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
                    Math.min(count + SHOW_MORE_STEP, scorers.length)
                  )
                }
              >
                Show {nextBatch} more
              </button>
            </div>
          )}
        </section>
      </div>
    </details>
  );
}
