import type { HistoryMatch } from "../api/client";
import {
  buildYearPodiumMap,
  isPlaceholderPodiumTeam,
} from "./historyPodium";
import { normalizeHistoryTeamName } from "./historyTeamNames";

export type WorldCupWinnerEntry = {
  team: string;
  count: number;
  years: number[];
};

const GEO_NAME_TO_TEAM: Record<string, string> = {
  Brazil: "Brazil",
  Germany: "Germany",
  Italy: "Italy",
  Argentina: "Argentina",
  France: "France",
  Uruguay: "Uruguay",
  Spain: "Spain",
  "United Kingdom": "England",
};

export const TEAM_MAP_COORDINATES: Record<string, [number, number]> = {
  Brazil: [-54, -10],
  Germany: [10.5, 51],
  Italy: [12.5, 42.5],
  Argentina: [-64, -34],
  France: [2, 46],
  Uruguay: [-56, -33],
  England: [-1.5, 52.5],
  Spain: [-3.7, 40],
};

export type MapLabelOffset = {
  dx: number;
  dy: number;
  anchor: "start" | "end" | "middle";
};

export const TEAM_MAP_LABEL_OFFSETS: Record<string, MapLabelOffset> = {
  Brazil: { dx: 14, dy: 4, anchor: "start" },
  Germany: { dx: 14, dy: 0, anchor: "start" },
  Italy: { dx: 14, dy: 0, anchor: "start" },
  Argentina: { dx: 14, dy: 0, anchor: "start" },
  France: { dx: -14, dy: 0, anchor: "end" },
  Uruguay: { dx: 14, dy: 4, anchor: "start" },
  England: { dx: -14, dy: 0, anchor: "end" },
  Spain: { dx: -14, dy: 0, anchor: "end" },
};

const DEFAULT_MAP_LABEL_OFFSET: MapLabelOffset = {
  dx: 14,
  dy: 0,
  anchor: "start",
};

export function getTeamMapLabelOffset(team: string): MapLabelOffset {
  return TEAM_MAP_LABEL_OFFSETS[team] ?? DEFAULT_MAP_LABEL_OFFSET;
}

export function buildWorldCupWinnerCounts(
  matches: HistoryMatch[]
): WorldCupWinnerEntry[] {
  const podiums = buildYearPodiumMap(matches);
  const counts = new Map<string, { count: number; years: number[] }>();

  for (const [year, podium] of podiums) {
    if (isPlaceholderPodiumTeam(podium.first)) continue;

    const team = normalizeHistoryTeamName(podium.first);
    const entry = counts.get(team) ?? { count: 0, years: [] };
    entry.count += 1;
    entry.years.push(year);
    counts.set(team, entry);
  }

  return [...counts.entries()]
    .map(([team, { count, years }]) => ({
      team,
      count,
      years: years.sort((a, b) => b - a),
    }))
    .sort((a, b) => b.count - a.count || a.team.localeCompare(b.team));
}

export function getTeamFromGeoName(name: string): string | null {
  return GEO_NAME_TO_TEAM[name] ?? null;
}

import { winnerTeamColor } from "./historyChartColors";

export function winnerFill(team: string): string {
  return winnerTeamColor(team);
}
