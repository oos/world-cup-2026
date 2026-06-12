import type { TeamHistoryStats } from "../api/client";
import { TeamSuccessChart } from "./TeamSuccessChart";
import { ROUND_CATEGORIES } from "../utils/historyRoundStats";

function StatChip({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="stat-chip">
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}

function formatYears(years: number[]) {
  return years.length > 0 ? years.join(", ") : "—";
}

function finishClass(finish: string) {
  if (finish === "Champions") return "team-history-finish--champion";
  if (finish === "Runners-up") return "team-history-finish--runner-up";
  if (finish === "Third place" || finish === "Semi-finals") {
    return "team-history-finish--podium";
  }
  return "";
}

export function TeamHistoryPanel({ history }: { history: TeamHistoryStats }) {
  const isDebut = history.appearances === 0;
  const recentTournaments = [...history.tournaments].reverse().slice(0, 8);
  const knockoutRounds = ROUND_CATEGORIES.filter(
    (round) => round !== "Group Stage" && history.rounds_reached[round] > 0
  );

  return (
    <section className="team-history-panel" aria-label="World Cup history">
      {isDebut ? (
        <p className="team-history-debut">
          First World Cup appearance in <strong>2026</strong>
        </p>
      ) : (
        <>
          <div className="stats-row team-history-stats-row">
            <StatChip value={history.appearances} label="Appearances" />
            <StatChip value={history.titles} label="Titles" />
            <StatChip
              value={history.best_finish ?? "—"}
              label={
                history.best_finish_year
                  ? `Best finish (${history.best_finish_year})`
                  : "Best finish"
              }
            />
            <StatChip value={history.total_matches} label="Matches" />
          </div>

          <div className="stats-row team-history-stats-row">
            <StatChip
              value={`${history.wins}-${history.draws}-${history.losses}`}
              label="W–D–L"
            />
            <StatChip
              value={`${history.goals_for}:${history.goals_against}`}
              label="Goals for:against"
            />
            <StatChip
              value={history.goal_difference > 0 ? `+${history.goal_difference}` : history.goal_difference}
              label="Goal difference"
            />
            <StatChip value={history.knockout_appearances} label="Knockout runs" />
          </div>

          <TeamSuccessChart history={history} />

          <div className="team-history-details">
            <div className="team-history-block">
              <h3 className="team-history-heading">World Cups played</h3>
              <p className="team-history-text">{formatYears(history.world_cups_played)}</p>
              {history.title_years.length > 0 && (
                <p className="team-history-text team-history-highlight">
                  Champions: {history.title_years.join(", ")}
                </p>
              )}
              {history.runners_up > 0 && (
                <p className="team-history-text">
                  Runners-up finishes: {history.runners_up}
                </p>
              )}
            </div>

            {knockoutRounds.length > 0 && (
              <div className="team-history-block">
                <h3 className="team-history-heading">Stages reached (World Cups)</h3>
                <div className="team-history-tags">
                  {knockoutRounds.map((round) => (
                    <span key={round} className="team-history-tag">
                      {round}
                      <span className="team-history-tag-count">
                        {history.rounds_reached[round]}×
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {recentTournaments.length > 0 && (
            <div className="team-history-tournaments">
              <h3 className="team-history-heading">Tournament results</h3>
              <div className="team-history-tournament-list">
                {recentTournaments.map((entry) => (
                  <div key={entry.year} className="team-history-tournament-row">
                    <span className="team-history-year">{entry.year}</span>
                    <span className={`team-history-finish ${finishClass(entry.finish)}`}>
                      {entry.finish}
                    </span>
                    <span className="team-history-record">
                      {entry.wins}W-{entry.draws}D-{entry.losses}L · {entry.goals_for}–
                      {entry.goals_against} goals
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
