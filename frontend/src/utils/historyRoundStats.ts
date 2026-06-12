import type { HistoryMatch } from "../api/client";
import { normalizeHistoryTeamName } from "./historyTeamNames";

export const ROUND_CATEGORIES = [
  "Group Stage",
  "Round of 16",
  "Quarter-finals",
  "Semi-finals",
  "Third Place",
  "Final",
] as const;

export type RoundCategory = (typeof ROUND_CATEGORIES)[number];

export const PALETTE = {
  slate: "#49516f",
  orange: "#d17a22",
  green: "#44af69",
  teal: "#2b9eb3",
  blue: "#59a5d8",
} as const;

export const ROUND_COLORS: Record<RoundCategory, string> = {
  "Group Stage": PALETTE.slate,
  "Round of 16": PALETTE.blue,
  "Quarter-finals": PALETTE.green,
  "Semi-finals": PALETTE.teal,
  "Third Place": PALETTE.orange,
  Final: PALETTE.orange,
};

export const FINISH_COLORS: Record<string, string> = {
  Champions: "#c9a227",
  "Runners-up": "#8b95a8",
  "Third place": PALETTE.orange,
  "Fourth place": PALETTE.teal,
  "Semi-finals": PALETTE.teal,
  "Quarter-finals": PALETTE.green,
  "Round of 16": PALETTE.blue,
  "Group Stage": PALETTE.slate,
};

export function roundHatchClass(round: RoundCategory): string {
  const classes: Record<RoundCategory, string> = {
    "Group Stage": "chart-hatch chart-hatch--group-stage",
    "Round of 16": "chart-hatch chart-hatch--round-of-16",
    "Quarter-finals": "chart-hatch chart-hatch--quarter-finals",
    "Semi-finals": "chart-hatch chart-hatch--semi-finals",
    "Third Place": "chart-hatch chart-hatch--third-place",
    Final: "chart-hatch chart-hatch--final",
  };
  return classes[round];
}

export function finishHatchClass(finish: string): string {
  const classes: Record<string, string> = {
    Champions: "chart-hatch chart-hatch--champion",
    "Runners-up": "chart-hatch chart-hatch--runner-up",
    "Third place": "chart-hatch chart-hatch--third-place-finish",
    "Fourth place": "chart-hatch chart-hatch--fourth-place",
    "Semi-finals": "chart-hatch chart-hatch--semi-finals-finish",
    "Quarter-finals": "chart-hatch chart-hatch--quarter-finals-finish",
    "Round of 16": "chart-hatch chart-hatch--round-of-16-finish",
    "Group Stage": "chart-hatch chart-hatch--group-stage",
  };
  return classes[finish] ?? "chart-hatch chart-hatch--group-stage";
}

export const ROUND_RANK: Record<RoundCategory, number> = {
  "Group Stage": 1,
  "Round of 16": 2,
  "Quarter-finals": 3,
  "Semi-finals": 4,
  "Third Place": 5,
  Final: 6,
};

export function computeSuccessScore(rounds: Record<RoundCategory, number>): number {
  return ROUND_CATEGORIES.reduce(
    (sum, round) => sum + rounds[round] * ROUND_RANK[round],
    0
  );
}

export function compareTeamSuccess(
  a: { name: string; successScore: number },
  b: { name: string; successScore: number }
): number {
  return b.successScore - a.successScore || a.name.localeCompare(b.name);
}

export type TeamRoundStats = {
  team: string;
  total: number;
  rounds: Record<RoundCategory, number>;
};

export function normalizeRound(round: string): RoundCategory {
  const value = round.toLowerCase();

  if (value === "final" || value === "final round") {
    return "Final";
  }
  if (
    value.includes("third") ||
    value.includes("3rd") ||
    value === "match for third place"
  ) {
    return "Third Place";
  }
  if (value.includes("semi")) {
    return "Semi-finals";
  }
  if (value.includes("quarter")) {
    return "Quarter-finals";
  }
  if (value.includes("round of 16")) {
    return "Round of 16";
  }
  if (
    value.includes("matchday") ||
    value.includes("first round") ||
    value.includes("preliminary") ||
    value.includes("play-off") ||
    value.includes("playoff")
  ) {
    return "Group Stage";
  }

  return "Group Stage";
}

export function buildTeamRoundStats(matches: HistoryMatch[]): TeamRoundStats[] {
  const stats = new Map<string, Record<RoundCategory, number>>();

  const emptyRounds = (): Record<RoundCategory, number> =>
    Object.fromEntries(ROUND_CATEGORIES.map((round) => [round, 0])) as Record<
      RoundCategory,
      number
    >;

  for (const match of matches) {
    const category = normalizeRound(match.round);
    for (const team of [match.team1, match.team2]) {
      if (!team) continue;
      const canonicalTeam = normalizeHistoryTeamName(team);
      const teamStats = stats.get(canonicalTeam) ?? emptyRounds();
      teamStats[category] += 1;
      stats.set(canonicalTeam, teamStats);
    }
  }

  return [...stats.entries()]
    .map(([team, rounds]) => {
      const successScore = computeSuccessScore(rounds);
      return {
        team,
        rounds,
        total: ROUND_CATEGORIES.reduce((sum, round) => sum + rounds[round], 0),
        successScore,
      };
    })
    .sort((a, b) =>
      compareTeamSuccess(
        { name: a.team, successScore: a.successScore },
        { name: b.team, successScore: b.successScore }
      )
    );
}
