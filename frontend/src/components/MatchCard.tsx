import { Link } from "react-router-dom";
import type { CSSProperties } from "react";
import type { Match } from "../api/client";
import { useLiveMatch } from "../hooks/useLiveMatch";
import { useReturnToLink } from "../hooks/useNavigation";
import { useProfilePreferences } from "../hooks/useProfilePreferences";
import { MatchCardMeta } from "./MatchCardMeta";
import {
  formatMatchLiveClock,
  formatMatchLocalDate,
  formatMatchLocalTime,
  getLiveClockTone,
  isMatchComplete,
  isMatchdayRound,
  isMatchInPlay,
  isProminentLiveClock,
} from "../utils/matchTime";
import { resolveUserTimezone } from "../utils/cityTimezones";
import { formatMatchCardTeamName } from "../utils/formatMatchTeamName";
import { formatMatchVenue } from "../utils/formatMatchVenue";
import { groupMatchGoalsByScorer } from "../utils/formatMatchGoals";
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
  liveRefresh = true,
}: {
  match: Match;
  linked?: boolean;
  showDate?: boolean;
  showGroupAccent?: boolean;
  showBookmark?: boolean;
  /** Poll this card every minute while the match is in the kickoff window. */
  liveRefresh?: boolean;
}) {
  const liveMatch = useLiveMatch(match, liveRefresh);
  const { preferences } = useProfilePreferences();
  const href = useReturnToLink(`/matches/${liveMatch.id}`);
  const groupAccent = showGroupAccent ? matchGroupAccentColor(liveMatch.group) : null;
  const groupColors = matchGroupColors(liveMatch.group);
  const accentStyle = groupAccent
    ? ({ "--match-group-accent": groupAccent } as CSSProperties)
    : undefined;
  const accentClass = groupAccent ? " match-card--group-accent" : "";
  const timeZone = resolveUserTimezone(preferences.city, preferences.timezone);
  const localDate = formatMatchLocalDate(liveMatch.date, liveMatch.time, timeZone);
  const localTime = formatMatchLocalTime(liveMatch.date, liveMatch.time, timeZone);
  const score = liveMatch.score?.ft;
  const isComplete = isMatchComplete(liveMatch.score);
  const isLive = isMatchInPlay(liveMatch.date, liveMatch.time, liveMatch.score);
  const liveClock = formatMatchLiveClock(liveMatch.score);
  const statusTag = isComplete ? "FT" : isLive ? (liveClock ?? "Live") : null;
  const isMinuteClock = Boolean(statusTag && isProminentLiveClock(statusTag));
  const liveClockTone = isMinuteClock ? getLiveClockTone(liveMatch.score) : "normal";
  const statusLabel =
    statusTag === "Half-time" ? "HT" : statusTag === "Extra time" ? "ET" : statusTag;
  const metaTimeLabel = localTime ?? liveMatch.time ?? null;
  const dateMeta = showDate ? (localDate ?? liveMatch.date) : null;
  const venueLabel = formatVenueLabel(liveMatch.stadium);
  const headerPrimary =
    liveMatch.round && !isMatchdayRound(liveMatch.round) ? liveMatch.round : null;
  const excitementScore = formatMatchExcitementScore(liveMatch);
  const team1Name = formatMatchCardTeamName(
    liveMatch.team1?.name || "TBD",
    liveMatch.team1?.fifa_code,
  );
  const team2Name = formatMatchCardTeamName(
    liveMatch.team2?.name || "TBD",
    liveMatch.team2?.fifa_code,
  );
  const team1Rank =
    team1Name !== "TBD"
      ? getTeamWorldRanking(liveMatch.team1?.fifa_code, liveMatch.team1?.world_ranking)
      : null;
  const team2Rank =
    team2Name !== "TBD"
      ? getTeamWorldRanking(liveMatch.team2?.fifa_code, liveMatch.team2?.world_ranking)
      : null;
  const team1Goals = liveMatch.goals1 ?? [];
  const team2Goals = liveMatch.goals2 ?? [];
  const showScorers =
    (score != null || isLive || isComplete) &&
    (team1Goals.length > 0 || team2Goals.length > 0);

  const content = (
    <>
      {(headerPrimary || liveMatch.group || excitementScore || statusTag) && (
        <div className="match-card-header">
          <div className="match-card-header-lead">
            {(headerPrimary || liveMatch.group) && (
              <div className="match-card-header-round">
                {headerPrimary && (
                  <span className="match-card-header-primary">{headerPrimary}</span>
                )}
                {headerPrimary && liveMatch.group && (
                  <span className="match-card-header-sep" aria-hidden="true">
                    ·
                  </span>
                )}
                {liveMatch.group && (
                  <span
                    className="match-card-header-group"
                    style={groupColors ? { color: groupColors.bg } : undefined}
                  >
                    {liveMatch.group}
                  </span>
                )}
              </div>
            )}
            {(excitementScore || statusTag) && (
              <div className="match-card-header-tags">
                {excitementScore && (
                  <span
                    className="match-card-excitement-tag"
                    aria-label={`Excitement factor ${excitementScore}`}
                  >
                    Excitement Factor: {excitementScore}
                  </span>
                )}
                {statusTag && (
                  <span
                    className={
                      isComplete
                        ? "match-card-status-text match-card-status-text--final"
                        : [
                            "match-card-status-text",
                            "match-card-status-text--live",
                            isMinuteClock && "match-card-status-text--clock",
                            isMinuteClock &&
                              liveClockTone === "added-time" &&
                              "match-card-status-text--added-time",
                            isMinuteClock &&
                              liveClockTone === "extra-time" &&
                              "match-card-status-text--extra-time",
                          ]
                            .filter(Boolean)
                            .join(" ")
                    }
                    aria-label={
                      isComplete
                        ? "Full time"
                        : `Match in progress, ${statusTag}`
                    }
                  >
                    {!isComplete && isMinuteClock && (
                      <span className="match-card-live-dot" aria-hidden="true" />
                    )}
                    {statusLabel}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="match-card-body">
        <div className="match-teams">
        <div className="match-team match-team--home">
          <TeamFlag
            fifaCode={liveMatch.team1?.fifa_code}
            teamName={liveMatch.team1?.name}
            flagIso={liveMatch.team1?.flag_iso}
            variant="badge"
            className="match-team-flag"
          />
          <span className="match-team-name">{team1Name}</span>
          {team1Rank != null && (
            <span
              className="match-team-rank team-world-rank"
              aria-label={`FIFA world ranking ${team1Rank}`}
            >
              {formatTeamWorldRanking(team1Rank)}
            </span>
          )}
        </div>
        <div className="match-score">
          {score ? (
            <>
              <span className="match-score-num match-score-num--home">{score[0]}</span>
              <span className="match-score-sep" aria-hidden="true">
                –
              </span>
              <span className="match-score-num match-score-num--away">{score[1]}</span>
            </>
          ) : (
            <span className="match-score-vs">vs</span>
          )}
        </div>
        <div className="match-team match-team--away">
          <span className="match-team-name">{team2Name}</span>
          <TeamFlag
            fifaCode={liveMatch.team2?.fifa_code}
            teamName={liveMatch.team2?.name}
            flagIso={liveMatch.team2?.flag_iso}
            variant="badge"
            className="match-team-flag"
          />
          {team2Rank != null && (
            <span
              className="match-team-rank team-world-rank"
              aria-label={`FIFA world ranking ${team2Rank}`}
            >
              {formatTeamWorldRanking(team2Rank)}
            </span>
          )}
        </div>
        </div>
        {showScorers && (
          <div className="match-card-scorers" aria-label="Goal scorers">
            <ul className="match-card-scorers-side match-card-scorers-side--home">
              {groupMatchGoalsByScorer(team1Goals).map((scorer) => (
                <li key={scorer.name} className="match-card-scorer-row">
                  <span className="match-card-scorer-name">{scorer.name}</span>
                  <span className="match-card-scorer-minutes">
                    {scorer.minutes.join(", ")}
                  </span>
                </li>
              ))}
            </ul>
            <ul className="match-card-scorers-side match-card-scorers-side--away">
              {groupMatchGoalsByScorer(team2Goals).map((scorer) => (
                <li key={scorer.name} className="match-card-scorer-row">
                  <span className="match-card-scorer-name">{scorer.name}</span>
                  <span className="match-card-scorer-minutes">
                    {scorer.minutes.join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      <MatchCardMeta
        dateMeta={dateMeta}
        venueLabel={venueLabel}
        kickoffTime={metaTimeLabel}
      />
      </div>
    </>
  );

  if (!linked) {
    return (
      <div
        className={`match-card${accentClass}${showBookmark ? " match-card--with-bookmark" : ""}${isLive ? " match-card--live" : ""}${isComplete ? " match-card--complete" : ""}`}
        style={accentStyle}
      >
        {showBookmark ? (
          <ViewingMatchButton matchId={liveMatch.id} className="match-card-bookmark" />
        ) : null}
        {content}
      </div>
    );
  }

  return (
    <div
      className={`match-card-wrap${showBookmark ? " match-card-wrap--with-bookmark" : ""}${isLive ? " match-card-wrap--live" : ""}`}
      style={accentStyle}
    >
      {showBookmark ? (
        <ViewingMatchButton matchId={liveMatch.id} className="match-card-bookmark" />
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
