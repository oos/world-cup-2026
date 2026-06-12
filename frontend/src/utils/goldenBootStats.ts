import type { HistoryMatch, HistoryRawGoal } from "../api/client";
import { getTournamentYears } from "./historyRoundRace";
import { normalizeHistoryTeamName } from "./historyTeamNames";

export type GoldenBootEntry = {
  rank: number;
  player: string;
  team: string;
  goals: number;
  played: number;
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

export function goldenBootPlayerKey(name: string, team: string) {
  return `${name}::${team}`;
}

function matchId(match: HistoryMatch) {
  return `${match.year}-${match.date ?? "unknown"}-${match.team1}-${match.team2}`;
}

function* goalScorers(
  goals: HistoryRawGoal[] | undefined,
  team: string
): Generator<{ name: string; team: string }> {
  if (!goals?.length) return;

  const canonicalTeam = normalizeHistoryTeamName(team);
  for (const goal of goals) {
    if (goal.owngoal) continue;

    const name = normalizePlayerName(goal.name);
    if (!name) continue;

    yield { name, team: canonicalTeam };
  }
}

export function buildGoldenBootStats(matches: HistoryMatch[]): GoldenBootEntry[] {
  const playerGoals = new Map<string, { player: string; team: string; goals: number }>();
  const teamMatches = new Map<string, Set<string>>();
  const playerMatches = new Map<string, Set<string>>();
  const tournamentYears = new Set(matches.map((match) => match.year));
  const singleTournament = tournamentYears.size === 1;

  for (const match of matches) {
    const id = matchId(match);

    for (const team of [match.team1, match.team2]) {
      if (!team) continue;
      const canonicalTeam = normalizeHistoryTeamName(team);
      const played = teamMatches.get(canonicalTeam) ?? new Set<string>();
      played.add(id);
      teamMatches.set(canonicalTeam, played);
    }

    const registerGoal = (goal: { name: string; team: string }) => {
      const key = goldenBootPlayerKey(goal.name, goal.team);
      const entry = playerGoals.get(key) ?? {
        player: goal.name,
        team: goal.team,
        goals: 0,
      };
      entry.goals += 1;
      playerGoals.set(key, entry);

      const appearances = playerMatches.get(key) ?? new Set<string>();
      appearances.add(id);
      playerMatches.set(key, appearances);
    };

    for (const goal of goalScorers(match.goals1, match.team1)) {
      registerGoal(goal);
    }

    for (const goal of goalScorers(match.goals2, match.team2)) {
      registerGoal(goal);
    }
  }

  const sorted = [...playerGoals.values()].sort(
    (a, b) => b.goals - a.goals || a.player.localeCompare(b.player)
  );

  let rank = 0;
  let previousGoals = -1;

  return sorted.map((entry, index) => {
    if (entry.goals !== previousGoals) {
      rank = index + 1;
      previousGoals = entry.goals;
    }

    const key = goldenBootPlayerKey(entry.player, entry.team);
    const played = singleTournament
      ? teamMatches.get(entry.team)?.size ?? 0
      : playerMatches.get(key)?.size ?? 0;

    return {
      rank,
      player: entry.player,
      team: entry.team,
      goals: entry.goals,
      played,
    };
  });
}

export type GoldenBootFrame = {
  year: number;
  scorers: GoldenBootEntry[];
};

export type GoldenBootTimeline = {
  frames: GoldenBootFrame[];
};

export function buildGoldenBootTimeline(
  matches: HistoryMatch[],
  topScorers = 30
): GoldenBootTimeline | null {
  const years = getTournamentYears(matches);
  if (years.length === 0) return null;

  const frames = years.map((year) => ({
    year,
    scorers: buildGoldenBootStats(matches.filter((match) => match.year <= year)).slice(
      0,
      topScorers
    ),
  }));

  return { frames };
}
