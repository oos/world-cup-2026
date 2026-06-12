import { useMemo, type CSSProperties } from "react";
import type { TeamHistoryStats } from "../api/client";
import { finishHatchClass } from "../utils/historyRoundStats";

const ALL_WORLD_CUP_YEARS = [
  1930, 1934, 1938, 1950, 1954, 1958, 1962, 1966, 1970, 1974, 1978, 1982, 1986,
  1990, 1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022,
] as const;

const FINISH_RANK: Record<string, number> = {
  Champions: 7,
  "Runners-up": 6,
  "Third place": 5,
  "Fourth place": 4,
  "Semi-finals": 4,
  "Quarter-finals": 3,
  "Round of 16": 2,
  "Group Stage": 1,
};

const FINISH_LEGEND_ORDER = [
  "Group Stage",
  "Round of 16",
  "Quarter-finals",
  "Semi-finals",
  "Fourth place",
  "Third place",
  "Runners-up",
  "Champions",
] as const;

function finishRank(finish: string): number {
  return FINISH_RANK[finish] ?? 1;
}

export function TeamSuccessChart({ history }: { history: TeamHistoryStats }) {
  const tournamentByYear = useMemo(
    () => new Map(history.tournaments.map((entry) => [entry.year, entry])),
    [history.tournaments]
  );

  const maxFinishRank = 7;

  return (
    <section className="history-chart team-success-chart" aria-label="World Cup success chart">
      <h3 className="history-chart-title">World Cup History</h3>
      <p className="history-chart-subtitle">
        Highest round reached in each World Cup
      </p>

      <div className="team-success-timeline-wrap">
        <div
          className="team-success-timeline"
          role="list"
          style={{ "--timeline-count": ALL_WORLD_CUP_YEARS.length } as CSSProperties}
        >
          {ALL_WORLD_CUP_YEARS.map((year) => {
            const entry = tournamentByYear.get(year);
            const rank = entry ? finishRank(entry.finish) : 0;
            const height = entry ? (rank / maxFinishRank) * 100 : 0;
            return (
              <div
                key={year}
                className="team-success-timeline-item"
                role="listitem"
                title={
                  entry
                    ? `${year}: ${entry.finish}`
                    : `${year}: Did not participate`
                }
              >
                <div className="team-success-timeline-column">
                  {entry ? (
                    <div
                      className={`team-success-timeline-bar ${finishHatchClass(entry.finish)}`}
                      style={{
                        height: `${(height / 100) * 5.5}rem`,
                      }}
                      aria-label={`${year}: ${entry.finish}`}
                    />
                  ) : null}
                </div>
                <span className="team-success-timeline-year-wrap">
                  <span className="team-success-timeline-year">{year}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="history-chart-legend team-success-round-legend">
        {FINISH_LEGEND_ORDER.map((finish) => (
          <span key={finish} className="history-chart-legend-item">
            <span
              className={`history-chart-legend-swatch ${finishHatchClass(finish)}`}
            />
            <span className="history-chart-legend-label">{finish}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
