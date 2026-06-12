import { CalendarDays, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type HistoryMatchDetail as MatchDetailData } from "../api/client";
import { PageHeaderActions } from "../components/PageHeader";
import { TeamNameWithFlag } from "../components/TeamNameWithFlag";
import { WorldCupMatchTimeline } from "../components/WorldCupMatchTimeline";
import { useBackPath } from "../hooks/useNavigation";
import { formatMatchVenue } from "../utils/formatMatchVenue";
import { historyReturnPath } from "../utils/historyMatch";

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

export function HistoryMatchDetail() {
  const { year, matchKey } = useParams<{ year: string; matchKey: string }>();
  const returnTo = useBackPath(
    historyReturnPath("", `history-match-${year}-${matchKey}`)
  );
  const [detail, setDetail] = useState<MatchDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!year || !matchKey) return;
    api
      .getHistoryMatch(Number(year), matchKey)
      .then(setDetail)
      .catch((e) => setError(e.message));
  }, [year, matchKey]);

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (!detail) return <div className="loading">Loading match…</div>;

  const dateLabel = formatDate(detail.date);
  const venueLabel = formatMatchVenue(detail.stadium, { year: detail.year });
  let penaltySuffix = "";
  if (detail.penalty_score) {
    penaltySuffix = `(${detail.penalty_score.team1} : ${detail.penalty_score.team2} Pens)`;
  }

  return (
    <>
      <Link to={returnTo} className="back-link">
        ← Back to history
      </Link>
      <div className="page-header-row page-header-row--end">
        <PageHeaderActions />
      </div>

      <section className="wc-match-detail">
        <p className="wc-match-detail-eyebrow">
          {detail.year} World Cup · {detail.round}
          {detail.group ? ` · ${detail.group}` : ""}
          {detail.match_number ? ` · Match ${detail.match_number}` : ""}
        </p>
        <h1 className="wc-match-detail-title">
          <TeamNameWithFlag name={detail.team1} flagClassName="wc-match-detail-flag" /> vs{" "}
          <TeamNameWithFlag name={detail.team2} flagClassName="wc-match-detail-flag" />
        </h1>

        <div className="wc-match-detail-scoreboard">
          <p className="wc-match-detail-scoreline">
            <TeamNameWithFlag name={detail.team1} nameClassName="wc-result-match-team" />{" "}
            {detail.team1_score}{" "}
            <span className="wc-result-match-score-sep">:</span> {detail.team2_score}{" "}
            <TeamNameWithFlag name={detail.team2} nameClassName="wc-result-match-team" />
            {detail.went_to_extra_time ? " AET" : ""}
            {penaltySuffix ? ` ${penaltySuffix}` : ""}
          </p>
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
                {detail.time ? ` · ${detail.time}` : ""}
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
          {detail.half_time_score && (
            <div className="wc-match-detail-phase">
              <span className="wc-match-detail-phase-label">Half time</span>
              <span>
                {detail.team1} {detail.half_time_score.team1} : {detail.half_time_score.team2}{" "}
                {detail.team2}
              </span>
            </div>
          )}
          {detail.full_time_score && (
            <div className="wc-match-detail-phase">
              <span className="wc-match-detail-phase-label">Full time</span>
              <span>
                {detail.team1} {detail.full_time_score.team1} : {detail.full_time_score.team2}{" "}
                {detail.team2}
              </span>
            </div>
          )}
          {detail.extra_time_score && (
            <div className="wc-match-detail-phase">
              <span className="wc-match-detail-phase-label">Extra time</span>
              <span>
                {detail.team1} {detail.extra_time_score.team1} : {detail.extra_time_score.team2}{" "}
                {detail.team2}
              </span>
            </div>
          )}
          {detail.penalty_score && (
            <div className="wc-match-detail-phase">
              <span className="wc-match-detail-phase-label">Penalties</span>
              <span>
                {detail.team1} {detail.penalty_score.team1} : {detail.penalty_score.team2}{" "}
                {detail.team2}
              </span>
            </div>
          )}
        </div>

        {(detail.team1_goals.length > 0 || detail.team2_goals.length > 0) && (
          <div className="wc-result-goals wc-match-detail-goals">
            {detail.team1_goals.length > 0 && (
              <p className="wc-result-goals-line">
                <span className="wc-result-goals-label">{detail.team1}</span>
                {detail.team1_goals.map((goal) => goal.label).join(", ")}
              </p>
            )}
            {detail.team2_goals.length > 0 && (
              <p className="wc-result-goals-line wc-result-goals-line--opponent">
                <span className="wc-result-goals-label">{detail.team2}</span>
                {detail.team2_goals.map((goal) => goal.label).join(", ")}
              </p>
            )}
          </div>
        )}

        {detail.timeline.length > 0 && (
          <WorldCupMatchTimeline
            teamName={detail.team1}
            opponent={detail.team2}
            events={detail.timeline}
          />
        )}
      </section>
    </>
  );
}
