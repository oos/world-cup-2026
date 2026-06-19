import type { Match, MatchGoal } from "../api/client";
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

function matchId(match: Match): string {
  return String(match.id);
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
      matches: Set<string>;
    }
  >,
  player: string,
  team: string,
  teamFifaCode: string | null,
  matchKey: string,
  kind: "goal" | "assist"
) {
  const key = goldenBootPlayerKey(player, team);
  const entry = stats.get(key) ?? {
    player,
    team,
    teamFifaCode,
    goals: 0,
    assists: 0,
    matches: new Set<string>(),
  };

  if (kind === "goal") entry.goals += 1;
  else entry.assists += 1;

  entry.matches.add(matchKey);
  stats.set(key, entry);
}

function processGoals(
  goals: MatchGoal[] | undefined,
  teamName: string,
  teamFifaCode: string | null,
  matchKey: string,
  stats: Map<
    string,
    {
      player: string;
      team: string;
      teamFifaCode: string | null;
      goals: number;
      assists: number;
      matches: Set<string>;
    }
  >
) {
  for (const goal of goals ?? []) {
    if (goal.owngoal) continue;

    const scorer = normalizePlayerName(goal.name);
    if (scorer) {
      registerInvolvement(stats, scorer, teamName, teamFifaCode, matchKey, "goal");
    }

    const assister = normalizePlayerName(goal.assist);
    if (assister) {
      registerInvolvement(stats, assister, teamName, teamFifaCode, matchKey, "assist");
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
      matches: Set<string>;
    }
  >();

  for (const match of matches) {
    if (!match.score?.ft) continue;

    const id = matchId(match);
    const team1Name = match.team1?.name;
    const team2Name = match.team2?.name;
    if (!team1Name || !team2Name) continue;

    processGoals(match.goals1, team1Name, match.team1?.fifa_code ?? null, id, stats);
    processGoals(match.goals2, team2Name, match.team2?.fifa_code ?? null, id, stats);
  }

  const sorted = [...stats.values()]
    .map((entry) => ({
      ...entry,
      involvements: entry.goals + entry.assists,
      matches: entry.matches.size,
    }))
    .sort(
      (a, b) =>
        b.involvements - a.involvements ||
        b.goals - a.goals ||
        b.assists - a.assists ||
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
    };
  });
}
