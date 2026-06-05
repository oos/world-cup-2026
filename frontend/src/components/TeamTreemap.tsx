import { useMemo } from "react";
import type { HistoryMatch } from "../api/client";
import { layoutTreemap } from "../utils/treemapLayout";
import {
  buildYearTreemapData,
  groupColor,
  type YearTeamStats,
} from "../utils/yearTreemapData";

type TeamTile = YearTeamStats & {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
};

export function TeamTreemap({
  year,
  matches,
}: {
  year: number;
  matches: HistoryMatch[];
}) {
  const tiles = useMemo(() => {
    const groups = buildYearTreemapData(matches);
    if (groups.length === 0) return [];

    const groupNames = groups.map((group) => group.name);
    const width = 100;
    const height = 100;
    const groupRects = layoutTreemap(
      groups.map((group) => ({
        id: group.name,
        value: Math.max(group.totalMatches, 1),
      })),
      0,
      0,
      width,
      height
    );

    const teamTiles: TeamTile[] = [];
    for (const groupRect of groupRects) {
      const group = groups.find((entry) => entry.name === groupRect.id);
      if (!group) continue;

      const color = groupColor(group.name, groupNames);
      const teamRects = layoutTreemap(
        group.teams.map((team) => ({
          id: team.name,
          value: Math.max(team.matches, 1),
        })),
        groupRect.x,
        groupRect.y,
        groupRect.width,
        groupRect.height
      );

      for (const teamRect of teamRects) {
        const team = group.teams.find((entry) => entry.name === teamRect.id);
        if (!team) continue;
        teamTiles.push({
          ...team,
          x: teamRect.x,
          y: teamRect.y,
          width: teamRect.width,
          height: teamRect.height,
          color,
        });
      }
    }

    return teamTiles;
  }, [matches]);

  if (tiles.length === 0) {
    return <div className="history-chart-subtitle">No teams found for {year}.</div>;
  }

  return (
    <section className="team-treemap" aria-label={`${year} World Cup team treemap`}>
      <h2 className="history-chart-title">Team Treemap</h2>
      <p className="history-chart-subtitle">
        {year} World Cup — tile size reflects matches played, colour shows group
      </p>

      <div className="team-treemap-canvas">
        {tiles.map((tile) => {
          const showLabel = tile.width > 8 && tile.height > 7;
          return (
            <div
              key={tile.name}
              className="team-treemap-tile"
              style={{
                left: `${tile.x}%`,
                top: `${tile.y}%`,
                width: `${tile.width}%`,
                height: `${tile.height}%`,
                backgroundColor: tile.color,
              }}
              title={`${tile.name} · ${tile.group} · ${tile.matches} matches · ${tile.goalsFor}-${tile.goalsAgainst} goals`}
            >
              {showLabel && (
                <>
                  <span className="team-treemap-team">{tile.name}</span>
                  <span className="team-treemap-meta">
                    {tile.matches}M · {tile.goalsFor}G
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="team-treemap-legend">
        {[...new Set(tiles.map((tile) => tile.group))].sort().map((group) => (
          <span key={group} className="history-chart-legend-item">
            <span
              className="history-chart-legend-swatch"
              style={{
                backgroundColor: groupColor(
                  group,
                  [...new Set(tiles.map((tile) => tile.group))].sort()
                ),
              }}
            />
            {group}
          </span>
        ))}
      </div>
    </section>
  );
}
