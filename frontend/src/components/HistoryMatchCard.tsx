import { Link } from "react-router-dom";
import type { HistoryMatch } from "../api/client";
import {
  historyMatchCardId,
  historyMatchKey,
  historyMatchPath,
} from "../utils/historyMatch";
import { withReturnTo } from "../utils/navigation";
import { TeamNameWithFlag } from "./TeamNameWithFlag";

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
        <div className="match-team">
          <TeamNameWithFlag
            name={match.team1}
            flagIso={match.team1_flag_iso}
            flagClassName="match-team-flag"
          />
        </div>
        <div className="match-score">{scoreText}</div>
        <div className="match-team match-team--away">
          <TeamNameWithFlag
            name={match.team2}
            flagIso={match.team2_flag_iso}
            flagClassName="match-team-flag"
            flagAfter
          />
        </div>
      </div>
      <div className="match-meta">
        {match.date}
        {match.time ? ` · ${match.time}` : ""}
        {match.stadium ? ` · ${match.stadium}` : ""}
      </div>
    </Link>
  );
}
