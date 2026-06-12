import type { HistoryMatch } from "../api/client";
import { WINNER_TEAM_COLORS, winnerTeamColor } from "./historyChartColors";
import { buildYearPodiumMap, isPlaceholderPodiumTeam } from "./historyPodium";
import { normalizeHistoryTeamName } from "./historyTeamNames";

export const WORLD_CUP_TOURNAMENT_YEARS = [
  1930, 1934, 1938, 1950, 1954, 1958, 1962, 1966, 1970, 1974, 1978, 1982, 1986,
  1990, 1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022,
] as const;

export { WINNER_TEAM_COLORS };

export type WinnerSankeyTeamNode = {
  team: string;
  color: string;
  y0: number;
  y1: number;
  wins: number;
};

export type WinnerSankeyYearNode = {
  year: number;
  y0: number;
  y1: number;
  team: string | null;
};

export type WinnerSankeyLink = {
  team: string;
  year: number;
  color: string;
  sourceY0: number;
  sourceY1: number;
  targetY0: number;
  targetY1: number;
};

export const WINNER_SANKEY_FLAG_WIDTH = 26;
export const WINNER_SANKEY_FLAG_HEIGHT = 18;
export const WINNER_SANKEY_FLAG_X = 4;

export type WinnerSankeyLayout = {
  teams: WinnerSankeyTeamNode[];
  years: WinnerSankeyYearNode[];
  links: WinnerSankeyLink[];
  width: number;
  height: number;
  sourceX: number;
  targetX: number;
  nodeWidth: number;
  flagX: number;
  flagWidth: number;
  flagHeight: number;
};

function winnerColor(team: string) {
  return winnerTeamColor(team);
}

function ribbonPath(
  x0: number,
  y0Top: number,
  y0Bottom: number,
  x1: number,
  y1Top: number,
  y1Bottom: number
) {
  const mid = (x0 + x1) / 2;
  return [
    `M ${x0} ${y0Top}`,
    `C ${mid} ${y0Top}, ${mid} ${y1Top}, ${x1} ${y1Top}`,
    `L ${x1} ${y1Bottom}`,
    `C ${mid} ${y1Bottom}, ${mid} ${y0Bottom}, ${x0} ${y0Bottom}`,
    "Z",
  ].join(" ");
}

export function buildWorldCupWinnerSankey(
  matches: HistoryMatch[],
  options?: { includeYear?: number }
): WinnerSankeyLayout | null {
  const podiums = buildYearPodiumMap(matches);
  const winnersByYear = new Map<number, string>();

  for (const [year, podium] of podiums) {
    if (isPlaceholderPodiumTeam(podium.first)) continue;
    winnersByYear.set(year, normalizeHistoryTeamName(podium.first));
  }

  if (winnersByYear.size === 0) return null;

  const maxYear =
    matches.length > 0 ? Math.max(...matches.map((match) => match.year)) : undefined;
  const years: number[] = [...WORLD_CUP_TOURNAMENT_YEARS]
    .filter((year) => maxYear == null || year <= maxYear)
    .sort((a, b) => b - a);
  if (options?.includeYear && !years.includes(options.includeYear)) {
    years.push(options.includeYear);
    years.sort((a, b) => b - a);
  }

  const winsByTeam = new Map<string, number[]>();
  for (const [year, team] of winnersByYear) {
    const teamYears = winsByTeam.get(team) ?? [];
    teamYears.push(year);
    winsByTeam.set(team, teamYears);
  }

  const teams = [...winsByTeam.entries()]
    .map(([team, teamYears]) => ({
      team,
      wins: teamYears.length,
      firstWin: Math.min(...teamYears),
    }))
    .sort((a, b) => a.firstWin - b.firstWin || a.team.localeCompare(b.team));

  const slotHeight = 14;
  const innerGap = 4;
  const blockGap = 10;
  const paddingTop = 20;
  const paddingBottom = 16;
  const nodeWidth = 10;
  const flagWidth = WINNER_SANKEY_FLAG_WIDTH;
  const flagHeight = WINNER_SANKEY_FLAG_HEIGHT;
  const flagX = WINNER_SANKEY_FLAG_X;
  const sourceX = flagX + flagWidth + 6;
  const width = 720 - (120 - sourceX);
  const targetX = width - 72;

  const yearColumnHeight =
    years.length * slotHeight + Math.max(0, years.length - 1) * innerGap;
  const teamColumnHeight = teams.reduce((total, { wins }, index) => {
    const blockHeight = wins * slotHeight + Math.max(0, wins - 1) * innerGap;
    const blockSpacing = index < teams.length - 1 ? blockGap : 0;
    return total + blockHeight + blockSpacing;
  }, 0);
  const columnHeight = Math.max(yearColumnHeight, teamColumnHeight);
  const height = columnHeight + paddingTop + paddingBottom;
  const teamOffsetY = paddingTop + (columnHeight - teamColumnHeight) / 2;
  const yearOffsetY = paddingTop + (columnHeight - yearColumnHeight) / 2;

  const yearNodes: WinnerSankeyYearNode[] = years.map((year, index) => {
    const y0 = yearOffsetY + index * (slotHeight + innerGap);
    return {
      year,
      y0,
      y1: y0 + slotHeight,
      team: winnersByYear.get(year) ?? null,
    };
  });

  const yearPositions = new Map(yearNodes.map((node) => [node.year, node]));
  const teamSlotOffsets = new Map<string, number>();
  const links: WinnerSankeyLink[] = [];

  let teamCursor = teamOffsetY;
  const teamNodes: WinnerSankeyTeamNode[] = teams.map(({ team, wins }, index) => {
    const blockHeight = wins * slotHeight + Math.max(0, wins - 1) * innerGap;
    const y0 = teamCursor;
    const y1 = y0 + blockHeight;
    teamCursor = y1 + (index < teams.length - 1 ? blockGap : 0);
    teamSlotOffsets.set(team, y0);

    const teamYears = [...(winsByTeam.get(team) ?? [])].sort((a, b) => a - b);
    for (const year of teamYears) {
      const yearNode = yearPositions.get(year);
      if (!yearNode) continue;

      const sourceY0 = teamSlotOffsets.get(team) ?? y0;
      const sourceY1 = sourceY0 + slotHeight;
      teamSlotOffsets.set(team, sourceY1 + innerGap);

      links.push({
        team,
        year,
        color: winnerColor(team),
        sourceY0,
        sourceY1,
        targetY0: yearNode.y0,
        targetY1: yearNode.y1,
      });
    }

    return {
      team,
      color: winnerColor(team),
      y0,
      y1,
      wins,
    };
  });

  return {
    teams: teamNodes,
    years: yearNodes,
    links,
    width,
    height,
    sourceX,
    targetX,
    nodeWidth,
    flagX,
    flagWidth,
    flagHeight,
  };
}

export function winnerSankeyRibbonPath(link: WinnerSankeyLink, layout: WinnerSankeyLayout) {
  const x0 = layout.sourceX + layout.nodeWidth;
  const x1 = layout.targetX;
  return ribbonPath(x0, link.sourceY0, link.sourceY1, x1, link.targetY0, link.targetY1);
}
