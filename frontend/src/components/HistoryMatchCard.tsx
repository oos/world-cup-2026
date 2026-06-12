import { Link } from "react-router-dom";
import type { HistoryMatch } from "../api/client";
import {
  historyMatchCardId,
  historyMatchKey,
  historyMatchPath,
} from "../utils/historyMatch";

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
      to={historyMatchPath(match.year, matchKey)}
      state={{ returnTo }}
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
        <div className="match-team">{match.team1}</div>
        <div className="match-score">{scoreText}</div>
        <div className="match-team">{match.team2}</div>
      </div>
      <div className="match-meta">
        {match.date}
        {match.time ? ` · ${match.time}` : ""}
        {match.stadium ? ` · ${match.stadium}` : ""}
      </div>
    </Link>
  );
}
