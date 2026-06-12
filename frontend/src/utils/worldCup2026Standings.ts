import type { Match, Team } from "../api/client";

export type GroupStandingRow = {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  position: number;
  groupLetter: string;
};

export type GroupStandings = {
  groupLetter: string;
  groupLabel: string;
  rows: GroupStandingRow[];
  isComplete: boolean;
};

const GROUP_MATCHDAYS = 3;

function groupLetterFromLabel(group: string | null | undefined): string | null {
  if (!group) return null;
  const match = group.match(/Group\s+([A-L])/i);
  return match ? match[1].toUpperCase() : null;
}

function compareStandingRows(a: GroupStandingRow, b: GroupStandingRow): number {
  return (
    b.points - a.points ||
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor ||
    a.team.name.localeCompare(b.team.name)
  );
}

function emptyRow(team: Team, groupLetter: string): GroupStandingRow {
  return {
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    position: 0,
    groupLetter,
  };
}

export function buildGroupStandings(matches: Match[], teams: Team[]): GroupStandings[] {
  const teamsByGroup = new Map<string, Team[]>();
  for (const team of teams) {
    const letter = groupLetterFromLabel(team.group);
    if (!letter) continue;
    const existing = teamsByGroup.get(letter) ?? [];
    existing.push(team);
    teamsByGroup.set(letter, existing);
  }

  const standingsByGroup = new Map<string, Map<number, GroupStandingRow>>();
  for (const [letter, groupTeams] of teamsByGroup) {
    const rows = new Map<number, GroupStandingRow>();
    for (const team of groupTeams) {
      rows.set(team.id, emptyRow(team, letter));
    }
    standingsByGroup.set(letter, rows);
  }

  const groupMatches = matches.filter(
    (match) =>
      match.group &&
      match.round?.startsWith("Matchday") &&
      match.team1 &&
      match.team2 &&
      match.score?.ft
  );

  for (const match of groupMatches) {
    const letter = groupLetterFromLabel(match.group);
    if (!letter) continue;
    const rows = standingsByGroup.get(letter);
    if (!rows || !match.team1 || !match.team2) continue;

    const [homeGoals, awayGoals] = match.score!.ft!;
    const home = rows.get(match.team1.id);
    const away = rows.get(match.team2.id);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.goalsFor += homeGoals;
    home.goalsAgainst += awayGoals;
    away.goalsFor += awayGoals;
    away.goalsAgainst += homeGoals;
    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;

    if (homeGoals > awayGoals) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (homeGoals < awayGoals) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  return [...standingsByGroup.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, rowMap]) => {
      const sortedRows = [...rowMap.values()].sort(compareStandingRows);
      sortedRows.forEach((row, index) => {
        row.position = index + 1;
      });
      const isComplete = sortedRows.every((row) => row.played >= GROUP_MATCHDAYS);
      return {
        groupLetter: letter,
        groupLabel: `Group ${letter}`,
        rows: sortedRows,
        isComplete,
      };
    });
}

export function rankThirdPlaceTeams(groups: GroupStandings[]): GroupStandingRow[] {
  const thirdPlace = groups
    .filter((group) => group.rows.length >= 3)
    .map((group) => group.rows[2])
    .filter((row) => row.played > 0);

  return [...thirdPlace].sort(compareStandingRows);
}

export function qualifiedThirdPlaceLetters(groups: GroupStandings[]): Set<string> {
  const allComplete = groups.every((group) => group.isComplete);
  if (!allComplete) return new Set();

  return new Set(
    rankThirdPlaceTeams(groups)
      .slice(0, 8)
      .map((row) => row.groupLetter)
  );
}

export function resolveGroupPositionSlot(
  slot: string,
  groups: GroupStandings[],
  qualifiedThirdLetters: Set<string>
): { name: string; fifaCode: string | null; label: string } | null {
  const direct = slot.match(/^([123])([A-L])$/);
  if (direct) {
    const position = Number(direct[1]);
    const letter = direct[2];
    const group = groups.find((entry) => entry.groupLetter === letter);
    const row = group?.rows[position - 1];
    if (!row) return null;
    if (position === 3 && group?.isComplete && !qualifiedThirdLetters.has(letter)) {
      return null;
    }
    return {
      name: row.team.name,
      fifaCode: row.team.fifa_code,
      label: `${position}${letter}`,
    };
  }

  const combo = slot.match(/^3([A-L](?:\/[A-L])*)$/);
  if (combo) {
    const letters = combo[1].split("/");
    const candidates = letters
      .map((letter) => {
        const group = groups.find((entry) => entry.groupLetter === letter);
        const row = group?.rows[2];
        if (!row || !group?.isComplete || !qualifiedThirdLetters.has(letter)) {
          return null;
        }
        return row;
      })
      .filter((row): row is GroupStandingRow => row !== null);

    if (candidates.length === 1) {
      return {
        name: candidates[0].team.name,
        fifaCode: candidates[0].team.fifa_code,
        label: slot,
      };
    }
  }

  return null;
}
