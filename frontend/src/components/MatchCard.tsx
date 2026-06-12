import { Link } from "react-router-dom";
import type { Match } from "../api/client";
import { useProfilePreferences } from "../hooks/useProfilePreferences";
import { resolveUserTimezone } from "../utils/cityTimezones";
import {
  formatMatchLocalDate,
  formatMatchLocalTime,
  isMatchPast,
} from "../utils/matchTime";

export function MatchCard({
  match,
  linked = true,
  showDate = true,
}: {
  match: Match;
  linked?: boolean;
  showDate?: boolean;
}) {
  const { preferences } = useProfilePreferences();
  const timeZone = resolveUserTimezone(preferences.city);
  const localDate = formatMatchLocalDate(match.date, match.time, timeZone);
  const localTime = formatMatchLocalTime(match.date, match.time, timeZone);
  const isPast = isMatchPast(match.date, match.time);
  const score = isPast ? match.score?.ft : undefined;
  const scoreText = score ? `${score[0]} – ${score[1]}` : "vs";
  const timeLabel = localTime ?? match.time;
  const metaParts = [
    showDate ? (localDate ?? match.date) : null,
    timeLabel,
    match.stadium?.name ?? null,
  ].filter(Boolean);

  const content = (
    <>
      <div className="round">
        {match.round}
        {match.group ? ` · ${match.group}` : ""}
      </div>
      <div className="match-teams">
        <div className="match-team">
          {match.team1?.flag_icon} {match.team1?.name || "TBD"}
        </div>
        <div className="match-score">{scoreText}</div>
        <div className="match-team">
          {match.team2?.name || "TBD"} {match.team2?.flag_icon}
        </div>
      </div>
      {metaParts.length > 0 && (
        <div className="match-meta">{metaParts.join(" · ")}</div>
      )}
    </>
  );

  if (!linked) {
    return <div className="match-card">{content}</div>;
  }

  return (
    <Link to={`/matches/${match.id}`} className="match-card match-card-link">
      {content}
    </Link>
  );
}
