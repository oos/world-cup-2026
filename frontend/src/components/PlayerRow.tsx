import { Link } from "react-router-dom";
import type { Player } from "../api/client";
import { PlayerAvatar } from "./PlayerAvatar";
import { TeamFlag } from "./TeamFlag";

export function PlayerRow({
  player,
  showTeam = false,
}: {
  player: Player;
  showTeam?: boolean;
}) {
  const details = [
    player.position || "—",
    showTeam && player.team_name ? player.team_name : null,
    player.club,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link to={`/players/${player.id}`} className="player-row">
      <span className="number">{player.jersey_number ?? "–"}</span>
      <PlayerAvatar player={player} className="avatar" />
      <div className="info">
        <div className="name">{player.name}</div>
        <div className="club">{details}</div>
      </div>
      <TeamFlag
        fifaCode={player.team_fifa_code}
        teamName={player.team_name}
        variant="badge"
        className="player-row-flag"
      />
    </Link>
  );
}
