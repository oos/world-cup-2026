import { useMemo, type CSSProperties } from "react";
import type { TeamHistoryStats } from "../api/client";
import {
  ROUND_CATEGORIES,
  finishHatchClass,
  roundHatchClass,
  type RoundCategory,
} from "../utils/historyRoundStats";

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

function finishRank(finish: string): number {
  return FINISH_RANK[finish] ?? 1;
}

export function TeamSuccessChart({ history }: { history: TeamHistoryStats }) {
  const tournamentByYear = useMemo(
    () => new Map(history.tournaments.map((entry) => [entry.year, entry])),
    [history.tournaments]
  );

  const stagesReached = useMemo(
    () =>
      Object.fromEntries(
        ROUND_CATEGORIES.map((round) => [round, history.rounds_reached[round] ?? 0])
      ) as Record<RoundCategory, number>,
    [history.rounds_reached]
  );

  const hasStageData = ROUND_CATEGORIES.some((round) => stagesReached[round] > 0);

  const maxFinishRank = 7;

  return (
    <section className="history-chart team-success-chart" aria-label="World Cup success chart">
      <h3 className="history-chart-title">World Cup History</h3>
      <p className="history-chart-subtitle">
        Number of matches played in each world cup
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
                    ? `${year}: ${entry.finish} · ${entry.matches} matches`
                    : `${year}: Did not participate`
                }
              >
                <div className="team-success-timeline-column">
                  {entry ? (
                    <div className="team-success-timeline-stack">
                      <span className="team-success-timeline-bar-label">
                        {entry.matches}
                      </span>
                      <div
                        className={`team-success-timeline-bar ${finishHatchClass(entry.finish)}`}
                        style={{
                          height: `${(height / 100) * 5.5}rem`,
                        }}
                        aria-label={`${year}: ${entry.matches} matches`}
                      />
                    </div>
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

      {hasStageData && (
        <>
          <div className="history-chart-legend team-success-round-legend">
            {ROUND_CATEGORIES.map((round) => (
              <span key={round} className="history-chart-legend-item">
                <span
                  className={`history-chart-legend-swatch ${roundHatchClass(round)}`}
                />
                <span className="history-chart-legend-label">{round}</span>
              </span>
            ))}
          </div>

          <div className="team-success-round-section">
            <div className="team-success-round-heading">
              <span className="team-success-round-heading-bold">Stages reached</span>{" "}
              <span className="team-success-round-heading-count">
                across {history.appearances} World Cups
              </span>
            </div>
            <div className="team-success-round-bar-track">
              <div
                className="history-chart-bar"
                style={{ width: "100%" }}
                role="img"
                aria-label={ROUND_CATEGORIES.map(
                  (round) => `${round} ${stagesReached[round]}`
                ).join(", ")}
              >
                {ROUND_CATEGORIES.map((round) => {
                  const count = stagesReached[round];
                  if (count === 0) return null;
                  return (
                    <span
                      key={round}
                      className={`history-chart-segment ${roundHatchClass(round)}`}
                      style={{
                        flexGrow: count,
                      }}
                      title={`${round}: ${count}×`}
                    >
                      <span className="history-chart-segment-label">{count}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
