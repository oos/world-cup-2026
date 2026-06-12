import { CalendarDays, MapPin } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import type {
  TeamHistoryStats,
  TeamMatchResult,
  TeamWorldCupResult,
} from "../api/client";
import {
  teamWorldCupMatchPath,
  worldCupMatchCardId,
  worldCupMatchKey,
} from "../utils/worldCupMatch";
import { formatMatchVenue } from "../utils/formatMatchVenue";
import { currentReturnPath, withReturnTo } from "../utils/navigation";
import { TeamNameWithFlag } from "./TeamNameWithFlag";

function finishClass(finish: string) {
  if (finish === "Champions") return "team-history-finish--champion";
  if (finish === "Runners-up") return "team-history-finish--runner-up";
  if (finish === "Third place" || finish === "Semi-finals") {
    return "team-history-finish--podium";
  }
  return "";
}

function outcomeLabel(outcome: string) {
  if (outcome === "W") return "Win";
  if (outcome === "D") return "Draw";
  return "Loss";
}

function outcomeClass(outcome: string) {
  if (outcome === "W") return "wc-result-outcome--win";
  if (outcome === "D") return "wc-result-outcome--draw";
  return "wc-result-outcome--loss";
}

function MatchScoreline({
  teamName,
  match,
}: {
  teamName: string;
  match: TeamMatchResult;
}) {
  const teamScore = match.team_score;
  const opponentScore = match.opponent_score;
  const hasStructuredScore =
    typeof teamScore === "number" && typeof opponentScore === "number";

  if (!hasStructuredScore) {
    return (
      <p className="wc-result-match-scoreline">
        <TeamNameWithFlag name={teamName} nameClassName="wc-result-match-team" />{" "}
        {match.score}{" "}
        <TeamNameWithFlag name={match.opponent} nameClassName="wc-result-match-team" />
      </p>
    );
  }

  let penaltySuffix = "";
  if (match.penalty_score) {
    penaltySuffix = `(${match.penalty_score.team} : ${match.penalty_score.opponent} Pens)`;
  }

  return (
    <p className="wc-result-match-scoreline">
      <TeamNameWithFlag name={teamName} nameClassName="wc-result-match-team" /> {teamScore}{" "}
      <span className="wc-result-match-score-sep">:</span> {opponentScore}{" "}
      <TeamNameWithFlag name={match.opponent} nameClassName="wc-result-match-team" />
      {match.went_to_extra_time ? " AET" : ""}
      {penaltySuffix ? ` ${penaltySuffix}` : ""}
    </p>
  );
}

function tournamentFormatLabel(entry: TeamWorldCupResult) {
  if (entry.team_count == null) return null;
  if (entry.group_count != null && entry.group_count > 0) {
    return `${entry.team_count} teams · ${entry.group_count} groups`;
  }
  if (entry.group_count === 0) {
    return `${entry.team_count} teams · no group stage`;
  }
  return `${entry.team_count} teams`;
}

function formatDate(date: string | null | undefined) {
  if (!date) return null;
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatGoalDifference(goalsFor: number, goalsAgainst: number) {
  const gd = goalsFor - goalsAgainst;
  if (gd > 0) return `+${gd}`;
  return `${gd}`;
}

function TournamentStatsViz({
  wins,
  draws,
  losses,
  goalsFor,
  goalsAgainst,
}: {
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}) {
  const matches = wins + draws + losses;
  const goalDifference = goalsFor - goalsAgainst;
  const gdTone =
    goalDifference > 0 ? "positive" : goalDifference < 0 ? "negative" : "neutral";

  return (
    <div className="wc-result-summary-record">
      <div className="wc-result-summary-stats">
        <span className="wc-result-stat-matches">
          {matches} {matches === 1 ? "match" : "matches"}
        </span>

        <div
          className="wc-result-wdl-viz"
          role="img"
          aria-label={`${wins} wins, ${draws} draws, ${losses} losses`}
        >
          <div className="wc-result-wdl-bar">
            {wins > 0 && (
              <span
                className="wc-result-wdl-seg wc-result-wdl-seg--win"
                style={{ flexGrow: wins }}
                title={`${wins} wins`}
              >
                {wins}
              </span>
            )}
            {draws > 0 && (
              <span
                className="wc-result-wdl-seg wc-result-wdl-seg--draw"
                style={{ flexGrow: draws }}
                title={`${draws} draws`}
              >
                {draws}
              </span>
            )}
            {losses > 0 && (
              <span
                className="wc-result-wdl-seg wc-result-wdl-seg--loss"
                style={{ flexGrow: losses }}
                title={`${losses} losses`}
              >
                {losses}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="wc-result-summary-goals">
        <span className="wc-result-goals-group">
          <span className="wc-result-stat-label">Goals:</span>
          <span className="wc-result-stat-goals">
            {goalsFor}F–{goalsAgainst}A
          </span>
        </span>
        <span
          className={`wc-result-gd-badge wc-result-gd-badge--${gdTone}`}
          title={`Goal difference ${formatGoalDifference(goalsFor, goalsAgainst)}`}
        >
          GD {formatGoalDifference(goalsFor, goalsAgainst)}
        </span>
      </div>
    </div>
  );
}

function AccordionSummary({ entry }: { entry: TeamWorldCupResult }) {
  const formatLabel = tournamentFormatLabel(entry);

  if (entry.status === "in_progress") {
    return (
      <>
        <span className="wc-result-year">{entry.year}</span>
        <span className="wc-result-finish wc-result-finish--in-progress">
          {entry.finish ?? "In Progress"}
        </span>
        {formatLabel && (
          <span className="wc-result-summary-format">{formatLabel}</span>
        )}
        <TournamentStatsViz
          wins={entry.wins ?? 0}
          draws={entry.draws ?? 0}
          losses={entry.losses ?? 0}
          goalsFor={entry.goals_for ?? 0}
          goalsAgainst={entry.goals_against ?? 0}
        />
      </>
    );
  }

  if (!entry.participated) {
    const absenceLabel = entry.absence_label ?? "Did not participate";

    return (
      <>
        <span className="wc-result-year">{entry.year}</span>
        <span className="wc-result-summary-meta wc-result-summary-meta--muted">
          {formatLabel ? `${formatLabel} · ` : ""}
          {absenceLabel}
        </span>
      </>
    );
  }

  return (
    <>
      <span className="wc-result-year">{entry.year}</span>
      <span className={`wc-result-finish ${finishClass(entry.finish ?? "")}`}>
        {entry.finish}
      </span>
      {formatLabel && (
        <span className="wc-result-summary-format">{formatLabel}</span>
      )}
      <TournamentStatsViz
        wins={entry.wins ?? 0}
        draws={entry.draws ?? 0}
        losses={entry.losses ?? 0}
        goalsFor={entry.goals_for ?? 0}
        goalsAgainst={entry.goals_against ?? 0}
      />
    </>
  );
}

function MatchCard({
  teamId,
  year,
  teamName,
  match,
  isFocused = false,
}: {
  teamId: number;
  year: number;
  teamName: string;
  match: TeamMatchResult;
  isFocused?: boolean;
}) {
  const location = useLocation();
  const dateLabel = formatDate(match.date);
  const matchKey = worldCupMatchKey(year, match);
  const cardId = worldCupMatchCardId(year, matchKey);
  const returnTo = `${currentReturnPath(location)}#${cardId}`;
  const venueLabel = formatMatchVenue(match.stadium, { year });

  return (
    <Link
      to={withReturnTo(teamWorldCupMatchPath(teamId, year, matchKey), returnTo)}
      id={cardId}
      className={`wc-result-match wc-result-match--link${
        isFocused ? " wc-result-match--focused" : ""
      }`}
    >
      <div className="wc-result-match-header">
        <div className="wc-result-match-round">
          {match.round}
          {match.group ? ` · ${match.group}` : ""}
        </div>
        <span className={`wc-result-outcome ${outcomeClass(match.outcome)}`}>
          {outcomeLabel(match.outcome)}
        </span>
      </div>

      <MatchScoreline teamName={teamName} match={match} />

      {dateLabel && (
        <div className="wc-result-match-meta">
          <CalendarDays
            className="wc-result-match-meta-icon"
            aria-hidden="true"
            size={13}
            strokeWidth={2.25}
          />
          <span>
            {dateLabel}
            {match.time ? ` · ${match.time}` : ""}
          </span>
        </div>
      )}

      {venueLabel && (
        <div className="wc-result-match-location">
          <MapPin className="wc-result-match-location-icon" aria-hidden="true" size={13} strokeWidth={2.25} />
          <span>{venueLabel}</span>
        </div>
      )}

      {(match.team_goals.length > 0 || match.opponent_goals.length > 0) && (
        <div className="wc-result-goals">
          {match.team_goals.length > 0 && (
            <p className="wc-result-goals-line">
              <span className="wc-result-goals-label">Scorers</span>
              {match.team_goals.map((goal) => goal.label).join(", ")}
            </p>
          )}
          {match.opponent_goals.length > 0 && (
            <p className="wc-result-goals-line wc-result-goals-line--opponent">
              <span className="wc-result-goals-label">{match.opponent}</span>
              {match.opponent_goals.map((goal) => goal.label).join(", ")}
            </p>
          )}
        </div>
      )}
    </Link>
  );
}

function resultLabel(entry: TeamWorldCupResult) {
  return entry.finish ?? entry.absence_label ?? "Did not participate";
}

export function WorldCupResultsSection({
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
  const allResults = history.world_cup_results ?? [];
  const results = allResults.filter((entry) => {
    if (yearFilter != null && entry.year !== yearFilter) return false;
    if (resultFilter && resultLabel(entry) !== resultFilter) return false;
    return true;
  });

  if (allResults.length === 0) {
    return null;
  }

  if (results.length === 0) {
    return (
      <section className="wc-results-section" aria-label="World Cup results">
        <h3 className="team-history-heading">World Cup Results</h3>
        <p className="empty-state">No World Cup results match your filters.</p>
      </section>
    );
  }

  return (
    <section className="wc-results-section" aria-label="World Cup results">
      <h3 className="team-history-heading">World Cup Results</h3>
      <div className="wc-results-accordions">
        {results.map((entry) => (
          <details
            key={entry.year}
            className={`wc-result-accordion${
              entry.status === "in_progress"
                ? " wc-result-accordion--in-progress"
                : entry.participated
                  ? ""
                  : " wc-result-accordion--absent"
            }`}
          >
            <summary className="wc-result-summary">
              <AccordionSummary entry={entry} />
            </summary>
            {entry.status === "in_progress" && entry.match_results?.length ? (
              <div className="wc-result-body">
                {entry.match_results.map((match, index) => (
                  <MatchCard
                    key={match.match_key ?? `${entry.year}-${match.date ?? index}-${match.opponent}`}
                    teamId={teamId}
                    year={entry.year}
                    teamName={teamName}
                    match={match}
                    isFocused={
                      focusMatchId === worldCupMatchCardId(entry.year, worldCupMatchKey(entry.year, match))
                    }
                  />
                ))}
              </div>
            ) : entry.status === "in_progress" ? (
              <div className="wc-result-body">
                <p className="wc-result-in-progress-detail">
                  Tournament in progress. Match results will appear here as games
                  are played.
                </p>
              </div>
            ) : entry.participated && entry.match_results ? (
              <div className="wc-result-body">
                {entry.match_results.map((match, index) => (
                  <MatchCard
                    key={match.match_key ?? `${entry.year}-${match.date ?? index}-${match.opponent}`}
                    teamId={teamId}
                    year={entry.year}
                    teamName={teamName}
                    match={match}
                    isFocused={
                      focusMatchId === worldCupMatchCardId(entry.year, worldCupMatchKey(entry.year, match))
                    }
                  />
                ))}
              </div>
            ) : (
              entry.absence_detail && (
                <div className="wc-result-body">
                  <p className="wc-result-absence-detail">{entry.absence_detail}</p>
                </div>
              )
            )}
          </details>
        ))}
      </div>
    </section>
  );
}
