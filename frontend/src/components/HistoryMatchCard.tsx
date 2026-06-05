import type { HistoryMatch } from "../api/client";

export function HistoryMatchCard({ match }: { match: HistoryMatch }) {
  const score = match.score?.ft;
  const scoreText = score ? `${score[0]} – ${score[1]}` : "vs";

  return (
    <div className="match-card">
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
    </div>
  );
}
