import { useMemo } from "react";
import type { TeamHistoryStats } from "../api/client";
import { TeamSuccessChart } from "./TeamSuccessChart";
import { WorldCupResultsSection } from "./WorldCupResultsSection";

const TEAM_HISTORY_KNOCKOUT_ROUNDS = [
  "Round of 16",
  "Quarter-finals",
  "Semi-finals",
  "Third Place",
  "Final",
] as const;

function StatChip({
  value,
  label,
  detail,
  className = "",
}: {
  value: string | number;
  label: string;
  detail?: string;
  className?: string;
}) {
  return (
    <div className={`stat-chip${className ? ` ${className}` : ""}`}>
      <div className="value">{value}</div>
      <div className="label">{label}</div>
      {detail && <div className="stat-chip-detail">{detail}</div>}
    </div>
  );
}

export function TeamHistoryPanel({
  history,
  teamId,
  teamName,
  focusMatchId,
  yearFilter,
  resultFilter,
}: {
  history: TeamHistoryStats;
  teamId: number;
  teamName: string;
  focusMatchId?: string | null;
  yearFilter?: number | null;
  resultFilter?: string | null;
}) {
  const isDebut = history.appearances === 0;
  const knockoutRounds = TEAM_HISTORY_KNOCKOUT_ROUNDS.filter(
    (round) => history.rounds_reached[round] > 0
  );
  const finalYears = useMemo(
    () =>
      history.tournaments
        .filter((tournament) => (tournament.round_matches?.Final ?? 0) > 0)
        .map((tournament) => tournament.year)
        .sort((a, b) => a - b),
    [history.tournaments]
  );

  return (
    <section className="team-history-panel" aria-label="World Cup history">
      {isDebut && (
        <p className="team-history-debut">
          First World Cup appearance in <strong>2026</strong>
        </p>
      )}

      {!isDebut && (
        <>
          <div className="stats-row team-history-stats-row">
            <StatChip value={history.appearances} label="Tournament appearances" />
            <StatChip value={history.knockout_appearances} label="Knockout runs" />
            <StatChip value={history.best_finish ?? "—"} label="Best finish" />
          </div>

          {(knockoutRounds.length > 0 || history.titles > 0) && (
            <div className="team-history-stages-panel">
              <div className="stats-row team-history-stats-row team-history-stats-row--stages">
                {knockoutRounds.map((round) => (
                  <StatChip
                    key={round}
                    value={`${history.rounds_reached[round]}×`}
                    label={round}
                    detail={
                      round === "Final" && finalYears.length > 0
                        ? finalYears.join(", ")
                        : undefined
                    }
                  />
                ))}
                <StatChip
                  value={history.titles}
                  label="Champions"
                  detail={
                    history.title_years.length > 0
                      ? history.title_years.join(", ")
                      : undefined
                  }
                  className="stat-chip--tournament-winner"
                />
              </div>
            </div>
          )}

          <TeamSuccessChart history={history} />
        </>
      )}

      <WorldCupResultsSection
        history={history}
        teamId={teamId}
        teamName={teamName}
        focusMatchId={focusMatchId}
        yearFilter={yearFilter}
        resultFilter={resultFilter}
      />
    </section>
  );
}
