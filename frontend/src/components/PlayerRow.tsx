import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { Player } from "../api/client";
import { useReturnToLink } from "../hooks/useNavigation";
import { ClubBadge } from "./ClubBadge";
import { PlayerAvatar } from "./PlayerAvatar";
import { PlayerHonoursSummary } from "./PlayerHonoursSummary";
import { TeamNameWithFlag } from "./TeamNameWithFlag";
import { getClubDisplayLabel, hasClubName } from "../utils/playerClub";
import { getTeamFlagUrl } from "../utils/teamFlag";

function positionAbbrev(position: string | null): string | null {
  if (!position) return null;
  const key = position.toUpperCase();
  if (key.startsWith("GK")) return "GKP";
  if (key.startsWith("DF") || key.startsWith("DEF")) return "DEF";
  if (key.startsWith("MF") || key.startsWith("MID")) return "MID";
  if (key.startsWith("FW") || key.startsWith("FWD")) return "FWD";
  return position;
}

function positionTagClass(label: string): string {
  switch (label) {
    case "GKP":
      return "player-position-tag--gkp";
    case "DEF":
      return "player-position-tag--def";
    case "MID":
      return "player-position-tag--mid";
    case "FWD":
      return "player-position-tag--fwd";
    default:
      return "player-position-tag--other";
  }
}

function playerAge(dob: string | null): number | null {
  if (!dob) return null;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const monthDelta = today.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < born.getDate())) {
    age -= 1;
  }
  return age;
}

export function PlayerRow({
  player,
  showNationalTeam = true,
}: {
  player: Player;
  showNationalTeam?: boolean;
}) {
  const href = useReturnToLink(`/players/${player.id}`);
  const position = positionAbbrev(player.position);
  const age = playerAge(player.dob);
  const height =
    player.height_cm != null ? `${Math.round(player.height_cm)} cm` : null;

  const clubLabel = getClubDisplayLabel(player);
  const showClubBadge = hasClubName(player);
  const flagUrl = getTeamFlagUrl(player.team_fifa_code, player.team_name);
  const flagAccentStyle = flagUrl
    ? ({ "--player-row-flag-url": `url("${flagUrl}")` } as CSSProperties)
    : undefined;

  return (
    <Link
      to={href}
      className={`player-row${flagUrl ? " player-row--flag-accent" : ""}`}
      style={flagAccentStyle}
    >
      {player.jersey_number != null ? (
        <span className="number">{player.jersey_number}</span>
      ) : null}
      <PlayerAvatar className="avatar" />
      <div className="info">
        <div className="name">{player.name}</div>
        <div className="player-row-meta">
          {showNationalTeam && player.team_name ? (
            <div className="player-row-meta-line player-row-team">
              <span className="player-row-label">Country:</span>
              <TeamNameWithFlag
                name={player.team_name}
                fifaCode={player.team_fifa_code}
                flagClassName="player-row-team-flag"
                nameClassName="player-row-value"
                flagAfter
              />
            </div>
          ) : null}
          <div className="player-row-meta-line player-row-club">
            <span className="player-row-label">Club:</span>
            <span className="player-row-club-value">
              <span
                className={`player-row-value${showClubBadge ? "" : " player-row-value--status"}`}
              >
                {clubLabel}
              </span>
              {showClubBadge ? (
                <ClubBadge clubName={player.club} className="player-row-club-badge" />
              ) : null}
            </span>
          </div>
        </div>
        <PlayerHonoursSummary honours={player.major_honours} />
      </div>
      {(position || age != null || height) && (
        <div className="player-row-stats" aria-label="Player stats">
          {position ? (
            <span className={`player-position-tag ${positionTagClass(position)}`}>
              {position}
            </span>
          ) : null}
          {age != null ? <span className="player-row-stat">{age}</span> : null}
          {height ? <span className="player-row-stat">{height}</span> : null}
        </div>
      )}
    </Link>
  );
}
