import type { SquadGroup } from "../api/client";
import { AdBanner } from "../ads/AdBanner";
import { PlayerRow } from "./PlayerRow";

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
}: {
  squad: SquadGroup;
  positionFilter?: keyof SquadGroup | null;
}) {
  return (
    <>
      {SECTIONS.map(({ key, label }) => {
        if (positionFilter && key !== positionFilter) return null;
        const players = squad[key];
        if (!players?.length) return null;
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
