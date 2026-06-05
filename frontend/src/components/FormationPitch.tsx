import { Link } from "react-router-dom";
import type { LineupPlayer } from "../api/client";
import { PlayerAvatar } from "./PlayerAvatar";

type Slot = { x: number; y: number };

const FORMATION_SLOTS: Record<string, Record<string, Slot[]>> = {
  "4-3-3": {
    GK: [{ x: 50, y: 90 }],
    DEF: [
      { x: 18, y: 70 },
      { x: 38, y: 73 },
      { x: 62, y: 73 },
      { x: 82, y: 70 },
    ],
    MID: [
      { x: 28, y: 48 },
      { x: 50, y: 45 },
      { x: 72, y: 48 },
    ],
    FWD: [
      { x: 22, y: 20 },
      { x: 50, y: 14 },
      { x: 78, y: 20 },
    ],
  },
};

const ROLE_ORDER = ["GK", "DEF", "MID", "FWD"];

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : name;
}

function groupByRole(players: LineupPlayer[]) {
  const groups = new Map<string, LineupPlayer[]>();
  for (const player of players) {
    const role = player.lineup_role;
    const existing = groups.get(role) ?? [];
    existing.push(player);
    groups.set(role, existing);
  }
  return groups;
}

function assignSlots(formation: string, players: LineupPlayer[]) {
  const slots = FORMATION_SLOTS[formation] ?? FORMATION_SLOTS["4-3-3"];
  const groups = groupByRole(players);
  const positioned: { player: LineupPlayer; slot: Slot }[] = [];

  for (const role of ROLE_ORDER) {
    const rolePlayers = groups.get(role) ?? [];
    const roleSlots = slots[role] ?? [];
    rolePlayers.forEach((player, index) => {
      const slot = roleSlots[index] ?? roleSlots[roleSlots.length - 1] ?? { x: 50, y: 50 };
      positioned.push({ player, slot });
    });
  }

  return positioned;
}

export function FormationPitch({
  formation,
  players,
}: {
  formation: string;
  players: LineupPlayer[];
}) {
  const positioned = assignSlots(formation, players);

  return (
    <div className="formation-pitch" aria-label={`${formation} formation pitch`}>
      <svg className="formation-pitch-markings" viewBox="0 0 100 150" preserveAspectRatio="none" aria-hidden>
        <rect x="4" y="4" width="92" height="142" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6" />
        <line x1="4" y1="75" x2="96" y2="75" stroke="rgba(255,255,255,0.55)" strokeWidth="0.5" />
        <circle cx="50" cy="75" r="10" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.5" />
        <circle cx="50" cy="75" r="0.8" fill="rgba(255,255,255,0.7)" />
        <rect x="22" y="4" width="56" height="20" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.5" />
        <rect x="22" y="126" width="56" height="20" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.5" />
        <rect x="34" y="4" width="32" height="8" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.4" />
        <rect x="34" y="138" width="32" height="8" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.4" />
        <circle cx="50" cy="16" r="0.8" fill="rgba(255,255,255,0.55)" />
        <circle cx="50" cy="134" r="0.8" fill="rgba(255,255,255,0.55)" />
      </svg>

      {positioned.map(({ player, slot }) => (
        <Link
          key={player.id}
          to={`/players/${player.id}`}
          className="formation-pitch-player"
          style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
          title={player.name}
        >
          <div className="formation-pitch-player-avatar">
            <PlayerAvatar player={player} size="sm" />
            <span className="formation-pitch-player-number">
              {player.jersey_number ?? "–"}
            </span>
          </div>
          <span className="formation-pitch-player-name">{shortName(player.name)}</span>
        </Link>
      ))}
    </div>
  );
}
