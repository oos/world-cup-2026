import type { Player, SquadGroup } from "../api/client";
import { AdBanner } from "../ads/AdBanner";
import { PlayerRow } from "./PlayerRow";

function matchesPlayerSearch(value: string | null | undefined, query: string) {
  return (value ?? "").toLowerCase().includes(query);
}

function filterPlayers(players: Player[], searchQuery: string) {
  const normalized = searchQuery.trim().toLowerCase();
  if (!normalized) return players;
  return players.filter(
    (player) =>
      matchesPlayerSearch(player.name, normalized) ||
      matchesPlayerSearch(player.club, normalized) ||
      matchesPlayerSearch(player.position, normalized)
  );
}

const SECTIONS: { key: keyof SquadGroup; label: string }[] = [
  { key: "GK", label: "Goalkeepers" },
  { key: "DEF", label: "Defenders" },
  { key: "MID", label: "Midfielders" },
  { key: "FWD", label: "Forwards" },
  { key: "OTHER", label: "Other" },
];

export function SquadList({
  squad,
  positionFilter,
  searchQuery = "",
}: {
  squad: SquadGroup;
  positionFilter?: keyof SquadGroup | null;
  searchQuery?: string;
}) {
  const normalizedSearch = searchQuery.trim();

  return (
    <>
      {SECTIONS.map(({ key, label }) => {
        if (positionFilter && key !== positionFilter) return null;
        const players = filterPlayers(squad[key] ?? [], normalizedSearch);
        if (!players.length) return null;
        return (
          <div key={key} className="squad-section">
            <h3>
              {label} ({players.length})
            </h3>
            {players.map((p) => (
              <PlayerRow key={p.id} player={p} showNationalTeam={false} />
            ))}
            <AdBanner />
          </div>
        );
      })}
    </>
  );
}
