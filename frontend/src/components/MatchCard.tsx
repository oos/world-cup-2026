import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import type { CSSProperties } from "react";
import type { Match } from "../api/client";
import { useReturnToLink } from "../hooks/useNavigation";
import { useProfilePreferences } from "../hooks/useProfilePreferences";
import { resolveUserTimezone } from "../utils/cityTimezones";
import { formatMatchLocalDate, formatMatchLocalTime } from "../utils/matchTime";
import { formatMatchCardTeamName } from "../utils/formatMatchTeamName";
import { formatMatchVenue } from "../utils/formatMatchVenue";
import { formatMatchExcitementScore } from "../utils/matchExcitement";
import { matchGroupAccentColor, matchGroupColors } from "../utils/matchGroupAccent";
import {
  formatTeamWorldRanking,
  getTeamWorldRanking,
} from "../utils/teamWorldRanking";
import { TeamFlag } from "./TeamFlag";
import { ViewingMatchButton } from "./ViewingMatchButton";

function formatVenueLabel(stadium: Match["stadium"]): string | null {
  return formatMatchVenue(stadium, { year: 2026 });
}

export function MatchCard({
  match,
  linked = true,
  showDate = true,
  showGroupAccent = false,
  showBookmark = true,
}: {
  match: Match;
  linked?: boolean;
  showDate?: boolean;
  showGroupAccent?: boolean;
  showBookmark?: boolean;
}) {
  const { preferences } = useProfilePreferences();
  const href = useReturnToLink(`/matches/${match.id}`);
  const groupAccent = showGroupAccent ? matchGroupAccentColor(match.group) : null;
  const groupColors = matchGroupColors(match.group);
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
  const dateMeta = showDate ? (localDate ?? match.date) : null;
  const venueLabel = formatVenueLabel(match.stadium);
  const headerPrimary = match.round ?? null;
  const excitementScore = formatMatchExcitementScore(match);
  const team1Name = formatMatchCardTeamName(
    match.team1?.name || "TBD",
    match.team1?.fifa_code,
  );
  const team2Name = formatMatchCardTeamName(
    match.team2?.name || "TBD",
    match.team2?.fifa_code,
  );
  const team1Rank =
    team1Name !== "TBD"
      ? getTeamWorldRanking(match.team1?.fifa_code, match.team1?.world_ranking)
      : null;
  const team2Rank =
    team2Name !== "TBD"
      ? getTeamWorldRanking(match.team2?.fifa_code, match.team2?.world_ranking)
      : null;
  const showRanks = team1Rank != null || team2Rank != null;

  const content = (
    <>
      {(headerPrimary || match.group || excitementScore) && (
        <div className="match-card-header">
          <div className="match-card-header-meta">
            {(headerPrimary || match.group) && (
              <div className="match-card-header-lead">
                {headerPrimary && (
                  <span className="match-card-header-primary">{headerPrimary}</span>
                )}
                {headerPrimary && match.group && (
                  <span className="match-card-header-sep" aria-hidden="true">
                    ·
                  </span>
                )}
                {match.group && (
                  <span
                    className="match-card-header-group"
                    style={groupColors ? { color: groupColors.bg } : undefined}
                  >
                    {match.group}
                  </span>
                )}
              </div>
            )}
            {excitementScore && (
              <span
                className="match-card-excitement-tag"
                aria-label={`Excitement factor ${excitementScore}`}
              >
                EF {excitementScore}
              </span>
            )}
          </div>
        </div>
      )}
      <div className="match-teams">
        <div className="match-team-line match-team-line--home">
          <TeamFlag
            fifaCode={match.team1?.fifa_code}
            teamName={match.team1?.name}
            flagIso={match.team1?.flag_iso}
            variant="badge"
            className="match-team-flag"
          />
          <span className="match-team-name">{team1Name}</span>
        </div>
        <div className="match-score">{scoreText}</div>
        <div className="match-team-line match-team-line--away">
          <span className="match-team-name">{team2Name}</span>
          <TeamFlag
            fifaCode={match.team2?.fifa_code}
            teamName={match.team2?.name}
            flagIso={match.team2?.flag_iso}
            variant="badge"
            className="match-team-flag"
          />
        </div>
        {showRanks && (
          <>
            <div className="match-team-rank match-team-rank--home">
              <span className="match-team-rank-gutter" aria-hidden="true" />
              {team1Rank != null ? (
                <span
                  className="match-team-rank-pill team-world-rank"
                  aria-label={`FIFA world ranking ${team1Rank}`}
                >
                  {formatTeamWorldRanking(team1Rank)}
                </span>
              ) : (
                <span className="match-team-rank-pill" aria-hidden="true" />
              )}
            </div>
            <div className="match-team-rank-spacer" aria-hidden="true" />
            <div className="match-team-rank match-team-rank--away">
              {team2Rank != null ? (
                <span
                  className="match-team-rank-pill team-world-rank"
                  aria-label={`FIFA world ranking ${team2Rank}`}
                >
                  {formatTeamWorldRanking(team2Rank)}
                </span>
              ) : (
                <span className="match-team-rank-pill" aria-hidden="true" />
              )}
              <span className="match-team-rank-gutter" aria-hidden="true" />
            </div>
          </>
        )}
      </div>
      {(dateMeta || venueLabel || timeLabel) && (
        <div className="match-meta">
          {dateMeta && <span className="match-meta-date">{dateMeta}</span>}
          {(venueLabel || timeLabel) && (
            <div className="match-meta-location">
              <MapPin
                className="match-meta-location-icon"
                aria-hidden="true"
                size={12}
                strokeWidth={2.25}
              />
              {venueLabel && (
                <span className="match-meta-location-text">{venueLabel}</span>
              )}
              {venueLabel && timeLabel && (
                <span className="match-meta-at" aria-hidden="true">
                  {" @ "}
                </span>
              )}
              {timeLabel && (
                <span className="match-meta-kickoff">{timeLabel}</span>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );

  if (!linked) {
    return (
      <div
        className={`match-card${accentClass}${showBookmark ? " match-card--with-bookmark" : ""}`}
        style={accentStyle}
      >
        {showBookmark ? (
          <ViewingMatchButton matchId={match.id} className="match-card-bookmark" />
        ) : null}
        {content}
      </div>
    );
  }

  return (
    <div
      className={`match-card-wrap${showBookmark ? " match-card-wrap--with-bookmark" : ""}`}
      style={accentStyle}
    >
      {showBookmark ? (
        <ViewingMatchButton matchId={match.id} className="match-card-bookmark" />
      ) : null}
      <Link
        to={href}
        className={`match-card match-card-link${accentClass}`}
      >
        {content}
      </Link>
    </div>
  );
}
