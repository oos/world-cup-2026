import { PLANNER_PALETTE } from "../theme/plannerColors";

/** Shared palette aligned with the World Cup planner table. */
export const HISTORY_CHART_PALETTE = {
  slate: PLANNER_PALETTE.slate,
  blue: PLANNER_PALETTE.blue,
  green: PLANNER_PALETTE.green,
  teal: PLANNER_PALETTE.teal,
  orange: PLANNER_PALETTE.orange,
  gold: PLANNER_PALETTE.gold,
  navy: PLANNER_PALETTE.navy,
  purple: PLANNER_PALETTE.purple,
  red: PLANNER_PALETTE.rose,
  muted: PLANNER_PALETTE.periwinkle,
} as const;

export const WINNER_TEAM_COLORS: Record<string, string> = {
  Uruguay: HISTORY_CHART_PALETTE.green,
  Italy: HISTORY_CHART_PALETTE.navy,
  Germany: HISTORY_CHART_PALETTE.gold,
  Brazil: HISTORY_CHART_PALETTE.orange,
  England: HISTORY_CHART_PALETTE.teal,
  Argentina: HISTORY_CHART_PALETTE.blue,
  France: HISTORY_CHART_PALETTE.purple,
  Spain: HISTORY_CHART_PALETTE.red,
};

export const DEFAULT_WINNER_COLOR = HISTORY_CHART_PALETTE.muted;

export const ROUND_COLORS = {
  "Group Stage": HISTORY_CHART_PALETTE.slate,
  "Round of 16": HISTORY_CHART_PALETTE.blue,
  "Quarter-finals": HISTORY_CHART_PALETTE.green,
  "Semi-finals": HISTORY_CHART_PALETTE.teal,
  "Third Place": HISTORY_CHART_PALETTE.gold,
  Final: HISTORY_CHART_PALETTE.orange,
} as const;

export const FINISH_COLORS: Record<string, string> = {
  Champions: HISTORY_CHART_PALETTE.gold,
  "Runners-up": HISTORY_CHART_PALETTE.muted,
  "Third place": HISTORY_CHART_PALETTE.purple,
  "Fourth place": HISTORY_CHART_PALETTE.teal,
  "Semi-finals": HISTORY_CHART_PALETTE.teal,
  "Quarter-finals": HISTORY_CHART_PALETTE.green,
  "Round of 16": HISTORY_CHART_PALETTE.blue,
  "Group Stage": HISTORY_CHART_PALETTE.slate,
};

export function winnerTeamColor(team: string): string {
  return WINNER_TEAM_COLORS[team] ?? DEFAULT_WINNER_COLOR;
}

export function finishChartColor(finish: string): string {
  return FINISH_COLORS[finish] ?? FINISH_COLORS["Group Stage"];
}
