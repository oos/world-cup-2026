import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import type { CSSProperties } from "react";
import type { Match } from "../api/client";
import { useReturnToLink } from "../hooks/useNavigation";
import { useProfilePreferences } from "../hooks/useProfilePreferences";
import { resolveUserTimezone } from "../utils/cityTimezones";
import { formatMatchLocalDate, formatMatchLocalTime } from "../utils/matchTime";
import { matchGroupAccentColor } from "../utils/matchGroupAccent";
import { TeamNameWithFlag } from "./TeamNameWithFlag";

function formatVenueLabel(stadium: Match["stadium"]): string | null {
  if (!stadium) return null;
  if (stadium.name && stadium.city) return `${stadium.name}, ${stadium.city}`;
  return stadium.name ?? stadium.city ?? null;
}

export function MatchCard({
  match,
  linked = true,
  showDate = true,
  showGroupAccent = false,
}: {
  match: Match;
  linked?: boolean;
  showDate?: boolean;
  showGroupAccent?: boolean;
}) {
  const { preferences } = useProfilePreferences();
  const href = useReturnToLink(`/matches/${match.id}`);
  const groupAccent = showGroupAccent ? matchGroupAccentColor(match.group) : null;
  const accentStyle = groupAccent
    ? ({ "--match-group-accent": groupAccent } as CSSProperties)
    : undefined;
  const accentClass = groupAccent ? " match-card--group-accent" : "";
  const timeZone = resolveUserTimezone(preferences.city, preferences.timezone);
  const localDate = formatMatchLocalDate(match.date, match.time, timeZone);
  const localTime = formatMatchLocalTime(match.date, match.time, timeZone);
  const score = match.score?.ft;
  const scoreText = score ? `${score[0]} – ${score[1]}` : "vs";
  const timeLabel = localTime ?? match.time;
  const timeMetaParts = [
    showDate ? (localDate ?? match.date) : null,
    timeLabel,
  ].filter(Boolean);
  const venueLabel = formatVenueLabel(match.stadium);

  const content = (
    <>
      <div className="round">
        {match.round}
        {match.group ? ` · ${match.group}` : ""}
      </div>
      <div className="match-teams">
        <div className="match-team">
          <TeamNameWithFlag
            name={match.team1?.name || "TBD"}
            fifaCode={match.team1?.fifa_code}
            flagIso={match.team1?.flag_iso}
            flagClassName="match-team-flag"
          />
        </div>
        <div className="match-score">{scoreText}</div>
        <div className="match-team match-team--away">
          <TeamNameWithFlag
            name={match.team2?.name || "TBD"}
            fifaCode={match.team2?.fifa_code}
            flagIso={match.team2?.flag_iso}
            flagClassName="match-team-flag"
            flagAfter
          />
        </div>
      </div>
      {(timeMetaParts.length > 0 || venueLabel) && (
        <div className="match-meta">
          {timeMetaParts.length > 0 && (
            <span>{timeMetaParts.join(" · ")}</span>
          )}
          {venueLabel && (
            <span className="match-meta-location">
              {timeMetaParts.length > 0 && (
                <span className="match-meta-sep" aria-hidden="true">
                  {" · "}
                </span>
              )}
              <MapPin
                className="match-meta-location-icon"
                aria-hidden="true"
                size={12}
                strokeWidth={2.25}
              />
              <span>{venueLabel}</span>
            </span>
          )}
        </div>
      )}
    </>
  );

  if (!linked) {
    return (
      <div
        className={`match-card${accentClass}`}
        style={accentStyle}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      to={href}
      className={`match-card match-card-link${accentClass}`}
      style={accentStyle}
    >
      {content}
    </Link>
  );
}
