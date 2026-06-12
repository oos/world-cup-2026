import type { HistoryMatch } from "../api/client";
import {
  compareTeamSuccess,
  computeSuccessScore,
  normalizeRound,
  type RoundCategory,
} from "./historyRoundStats";
import { normalizeHistoryTeamName } from "./historyTeamNames";

export type YearTeamStats = {
  name: string;
  group: string;
  matches: number;
  goalsFor: number;
  goalsAgainst: number;
  successScore: number;
};

export type YearTreemapGroup = {
  name: string;
  teams: YearTeamStats[];
  totalMatches: number;
};

const GROUP_COLORS = [
  "#2563eb",
  "#dc2626",
  "#16a34a",
  "#ca8a04",
  "#9333ea",
  "#0891b2",
  "#ea580c",
  "#4f46e5",
  "#db2777",
  "#0d9488",
  "#65a30d",
  "#7c3aed",
];

export function groupColor(groupName: string, groups: string[]): string {
  const index = groups.indexOf(groupName);
  return GROUP_COLORS[index % GROUP_COLORS.length];
}

export function buildYearTreemapData(matches: HistoryMatch[]): YearTreemapGroup[] {
  const teamStats = new Map<
    string,
    {
      group: string | null;
      matches: number;
      goalsFor: number;
      goalsAgainst: number;
      rounds: Record<RoundCategory, number>;
    }
  >();

  const emptyRounds = (): Record<RoundCategory, number> => ({
    "Group Stage": 0,
    "Round of 16": 0,
    "Quarter-finals": 0,
    "Semi-finals": 0,
    "Third Place": 0,
    Final: 0,
  });

  for (const match of matches) {
    const score = match.score?.ft;
    const round = normalizeRound(match.round);
    for (const [team, isTeam1] of [
      [match.team1, true],
      [match.team2, false],
    ] as const) {
      if (!team) continue;
      const canonicalTeam = normalizeHistoryTeamName(team);
      const existing = teamStats.get(canonicalTeam) ?? {
        group: null,
        matches: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        rounds: emptyRounds(),
      };
      existing.matches += 1;
      existing.rounds[round] += 1;
      if (match.group && !existing.group) {
        existing.group = match.group;
      }
      if (score) {
        existing.goalsFor += isTeam1 ? score[0] : score[1];
        existing.goalsAgainst += isTeam1 ? score[1] : score[0];
      }
      teamStats.set(canonicalTeam, existing);
    }
  }

  const groups = new Map<string, YearTeamStats[]>();
  for (const [name, stats] of teamStats) {
    const groupName = stats.group ?? "Other";
    const teams = groups.get(groupName) ?? [];
    teams.push({
      name,
      group: groupName,
      matches: stats.matches,
      goalsFor: stats.goalsFor,
      goalsAgainst: stats.goalsAgainst,
      successScore: computeSuccessScore(stats.rounds),
    });
    groups.set(groupName, teams);
  }

  return [...groups.entries()]
    .map(([name, teams]) => ({
      name,
      teams: teams.sort((a, b) =>
        compareTeamSuccess(
          { name: a.name, successScore: a.successScore },
          { name: b.name, successScore: b.successScore }
        )
      ),
      totalMatches: teams.reduce((sum, team) => sum + team.matches, 0),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}
