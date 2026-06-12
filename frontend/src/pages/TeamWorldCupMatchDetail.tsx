import { CalendarDays, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type TeamWorldCupMatchDetail as MatchDetailData } from "../api/client";
import { PageHeaderActions } from "../components/PageHeader";
import { TeamNameWithFlag } from "../components/TeamNameWithFlag";
import { WorldCupMatchTimeline } from "../components/WorldCupMatchTimeline";
import { useBackPath } from "../hooks/useNavigation";
import { formatMatchVenue } from "../utils/formatMatchVenue";
import { teamStatsReturnPath } from "../utils/worldCupMatch";

function outcomeLabel(outcome: string) {
  if (outcome === "W") return "Win";
  if (outcome === "D") return "Draw";
  return "Loss";
}

function formatDate(date: string | null | undefined) {
  if (!date) return null;
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function TeamWorldCupMatchDetail() {
  const { id, year, matchKey } = useParams<{
    id: string;
    year: string;
    matchKey: string;
  }>();
  const returnTo = useBackPath(
    teamStatsReturnPath(Number(id), `wc-match-${year}-${matchKey}`)
  );
  const [detail, setDetail] = useState<MatchDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !year || !matchKey) return;
    api
      .getTeamHistoryMatch(Number(id), Number(year), matchKey)
      .then(setDetail)
      .catch((e) => setError(e.message));
  }, [id, year, matchKey]);

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (!detail) return <div className="loading">Loading match…</div>;

  const { match, team_name: teamName, year: tournamentYear } = detail;
  const dateLabel = formatDate(match.date);
  const venueLabel = formatMatchVenue(match.stadium, { year: tournamentYear });

  let penaltySuffix = "";
  if (match.penalty_score) {
    penaltySuffix = `(${match.penalty_score.team} : ${match.penalty_score.opponent} Pens)`;
  }

  return (
    <>
      <Link to={returnTo} className="back-link">
        ← Back to team stats
      </Link>
      <div className="page-header-row page-header-row--end">
        <PageHeaderActions />
      </div>

      <section className="wc-match-detail">
        <p className="wc-match-detail-eyebrow">
          {tournamentYear} World Cup · {match.round}
          {match.group ? ` · ${match.group}` : ""}
        </p>
        <h1 className="wc-match-detail-title">
          <TeamNameWithFlag name={teamName} flagClassName="wc-match-detail-flag" /> vs{" "}
          <TeamNameWithFlag name={match.opponent} flagClassName="wc-match-detail-flag" />
        </h1>

        <div className="wc-match-detail-scoreboard">
          <p className="wc-match-detail-scoreline">
            <TeamNameWithFlag name={teamName} nameClassName="wc-result-match-team" />{" "}
            {match.team_score}{" "}
            <span className="wc-result-match-score-sep">:</span> {match.opponent_score}{" "}
            <TeamNameWithFlag name={match.opponent} nameClassName="wc-result-match-team" />
            {match.went_to_extra_time ? " AET" : ""}
            {penaltySuffix ? ` ${penaltySuffix}` : ""}
          </p>
          <span className={`wc-result-outcome wc-result-outcome--${match.outcome === "W" ? "win" : match.outcome === "D" ? "draw" : "loss"}`}>
            {outcomeLabel(match.outcome)}
          </span>
        </div>

        <div className="wc-match-detail-meta">
          {dateLabel && (
            <div className="wc-result-match-meta">
              <CalendarDays
                className="wc-result-match-meta-icon"
                aria-hidden="true"
                size={14}
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
              <MapPin
                className="wc-result-match-location-icon"
                aria-hidden="true"
                size={14}
                strokeWidth={2.25}
              />
              <span>{venueLabel}</span>
            </div>
          )}
        </div>

        <div className="wc-match-detail-breakdown">
          {match.half_time_score && (
            <div className="wc-match-detail-phase">
              <span className="wc-match-detail-phase-label">Half time</span>
              <span>
                {teamName} {match.half_time_score.team} : {match.half_time_score.opponent}{" "}
                {match.opponent}
              </span>
            </div>
          )}
          {match.full_time_score && (
            <div className="wc-match-detail-phase">
              <span className="wc-match-detail-phase-label">Full time</span>
              <span>
                {teamName} {match.full_time_score.team} : {match.full_time_score.opponent}{" "}
                {match.opponent}
              </span>
            </div>
          )}
          {match.extra_time_score && (
            <div className="wc-match-detail-phase">
              <span className="wc-match-detail-phase-label">Extra time</span>
              <span>
                {teamName} {match.extra_time_score.team} : {match.extra_time_score.opponent}{" "}
                {match.opponent}
              </span>
            </div>
          )}
          {match.penalty_score && (
            <div className="wc-match-detail-phase">
              <span className="wc-match-detail-phase-label">Penalties</span>
              <span>
                {teamName} {match.penalty_score.team} : {match.penalty_score.opponent}{" "}
                {match.opponent}
              </span>
            </div>
          )}
        </div>

        <WorldCupMatchTimeline
          teamName={teamName}
          opponent={match.opponent}
          events={match.timeline ?? []}
        />
      </section>
    </>
  );
}
