import { Link } from "react-router-dom";
import type { Match } from "../api/client";

export function MatchCard({ match, linked = true }: { match: Match; linked?: boolean }) {
  const score = match.score?.ft;
  const scoreText = score ? `${score[0]} – ${score[1]}` : "vs";

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
      <div className="match-meta">
        {match.date}
        {match.time ? ` · ${match.time}` : ""}
        {match.stadium?.name ? ` · ${match.stadium.name}` : ""}
      </div>
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
