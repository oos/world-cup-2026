import type { Match, MatchGoal, MatchPlayerMinutes } from "../api/client";
import { goldenBootPlayerKey } from "./goldenBootStats";

export type GoalInvolvementEntry = {
  rank: number;
  player: string;
  team: string;
  teamFifaCode: string | null;
  goals: number;
  assists: number;
  involvements: number;
  matches: number;
  minutes: number;
};

const PLACEHOLDER_PLAYER_NAMES = new Set([
  "",
  "unknown",
  "n/a",
  "na",
  "not applicable",
]);

function normalizePlayerName(name: string | undefined | null): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;

  const lowered = trimmed.toLowerCase();
  if (PLACEHOLDER_PLAYER_NAMES.has(lowered)) return null;
  if (lowered.startsWith("not applicable ")) {
    return trimmed.slice("not applicable ".length).trim() || null;
  }

  return trimmed;
}

function registerInvolvement(
  stats: Map<
    string,
    {
      player: string;
      team: string;
      teamFifaCode: string | null;
      goals: number;
      assists: number;
      matches: number;
      minutes: number;
    }
  >,
  player: string,
  team: string,
  teamFifaCode: string | null,
  kind: "goal" | "assist"
) {
  const key = goldenBootPlayerKey(player, team);
  const entry = stats.get(key) ?? {
    player,
    team,
    teamFifaCode,
    goals: 0,
    assists: 0,
    matches: 0,
    minutes: 0,
  };

  if (kind === "goal") entry.goals += 1;
  else entry.assists += 1;

  stats.set(key, entry);
}

function registerMinutes(
  stats: Map<
    string,
    {
      player: string;
      team: string;
      teamFifaCode: string | null;
      goals: number;
      assists: number;
      matches: number;
      minutes: number;
    }
  >,
  rows: MatchPlayerMinutes[] | undefined,
  teamName: string,
  teamFifaCode: string | null
) {
  for (const row of rows ?? []) {
    const player = normalizePlayerName(row.name);
    if (!player || row.minutes <= 0) continue;

    const key = goldenBootPlayerKey(player, teamName);
    const entry = stats.get(key) ?? {
      player,
      team: teamName,
      teamFifaCode,
      goals: 0,
      assists: 0,
      matches: 0,
      minutes: 0,
    };
    entry.matches += 1;
    entry.minutes += row.minutes;
    stats.set(key, entry);
  }
}

function processGoals(
  goals: MatchGoal[] | undefined,
  teamName: string,
  teamFifaCode: string | null,
  stats: Map<
    string,
    {
      player: string;
      team: string;
      teamFifaCode: string | null;
      goals: number;
      assists: number;
      matches: number;
      minutes: number;
    }
  >
) {
  for (const goal of goals ?? []) {
    if (goal.owngoal) continue;

    const scorer = normalizePlayerName(goal.name);
    if (scorer) {
      registerInvolvement(stats, scorer, teamName, teamFifaCode, "goal");
    }

    const assister = normalizePlayerName(goal.assist);
    if (assister) {
      registerInvolvement(stats, assister, teamName, teamFifaCode, "assist");
    }
  }
}

export function buildGoalInvolvementStats(matches: Match[]): GoalInvolvementEntry[] {
  const stats = new Map<
    string,
    {
      player: string;
      team: string;
      teamFifaCode: string | null;
      goals: number;
      assists: number;
      matches: number;
      minutes: number;
    }
  >();

  for (const match of matches) {
    if (!match.score?.ft) continue;

    const team1Name = match.team1?.name;
    const team2Name = match.team2?.name;
    if (!team1Name || !team2Name) continue;

    processGoals(match.goals1, team1Name, match.team1?.fifa_code ?? null, stats);
    processGoals(match.goals2, team2Name, match.team2?.fifa_code ?? null, stats);
    registerMinutes(stats, match.player_minutes1, team1Name, match.team1?.fifa_code ?? null);
    registerMinutes(stats, match.player_minutes2, team2Name, match.team2?.fifa_code ?? null);
  }

  const sorted = [...stats.values()]
    .map((entry) => ({
      ...entry,
      involvements: entry.goals + entry.assists,
    }))
    .filter((entry) => entry.involvements > 0)
    .sort(
      (a, b) =>
        b.involvements - a.involvements ||
        b.goals - a.goals ||
        b.assists - a.assists ||
        a.minutes - b.minutes ||
        a.player.localeCompare(b.player)
    );

  let rank = 0;
  let previousInvolvements = -1;

  return sorted.map((entry, index) => {
    if (entry.involvements !== previousInvolvements) {
      rank = index + 1;
      previousInvolvements = entry.involvements;
    }

    return {
      rank,
      player: entry.player,
      team: entry.team,
      teamFifaCode: entry.teamFifaCode,
      goals: entry.goals,
      assists: entry.assists,
      involvements: entry.involvements,
      matches: entry.matches,
      minutes: entry.minutes,
    };
  });
}
