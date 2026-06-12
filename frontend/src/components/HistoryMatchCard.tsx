import { Link } from "react-router-dom";
import type { HistoryMatch } from "../api/client";
import {
  historyMatchCardId,
  historyMatchKey,
  historyMatchPath,
} from "../utils/historyMatch";
import { formatMatchCardTeamName } from "../utils/formatMatchTeamName";
import { formatMatchVenue } from "../utils/formatMatchVenue";
import { withReturnTo } from "../utils/navigation";
import { TeamFlag } from "./TeamFlag";

export function HistoryMatchCard({
  match,
  returnTo,
  isFocused = false,
}: {
  match: HistoryMatch;
  returnTo: string;
  isFocused?: boolean;
}) {
  const score = match.score?.ft;
  const scoreText = score ? `${score[0]} – ${score[1]}` : "vs";
  const venueLabel = formatMatchVenue(match.stadium, { year: match.year });
  const matchKey = historyMatchKey(match);
  const cardId = historyMatchCardId(match.year, matchKey);

  return (
    <Link
      to={withReturnTo(historyMatchPath(match.year, matchKey), returnTo)}
      id={cardId}
      className={`match-card match-card-link history-match-card${
        isFocused ? " history-match-card--focused" : ""
      }`}
    >
      <div className="round">
        {match.round}
        {match.group ? ` · ${match.group}` : ""}
      </div>
      <div className="match-teams">
        <div className="match-team-line match-team-line--home">
          <TeamFlag
            teamName={match.team1}
            flagIso={match.team1_flag_iso}
            variant="badge"
            className="match-team-flag"
          />
          <span className="match-team-name">{formatMatchCardTeamName(match.team1)}</span>
        </div>
        <div className="match-score">{scoreText}</div>
        <div className="match-team-line match-team-line--away">
          <span className="match-team-name">{formatMatchCardTeamName(match.team2)}</span>
          <TeamFlag
            teamName={match.team2}
            flagIso={match.team2_flag_iso}
            variant="badge"
            className="match-team-flag"
          />
        </div>
      </div>
      <div className="match-meta">
        {match.date}
        {match.time ? ` · ${match.time}` : ""}
        {venueLabel ? ` · ${venueLabel}` : ""}
      </div>
    </Link>
  );
}
