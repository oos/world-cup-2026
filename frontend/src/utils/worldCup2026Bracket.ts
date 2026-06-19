import type { Match, Team } from "../api/client";
import { knockoutSlotLabels } from "./worldCup2026KnockoutSlots";
import {
  buildGroupStandings,
  qualifiedThirdPlaceLetters,
  resolveGroupPositionSlot,
  type GroupStandings,
} from "./worldCup2026Standings";
import { thirdPlaceComboAssignments } from "./worldCup2026ThirdPlaceTable";

export type BracketTeam = {
  label: string;
  name: string | null;
  fifaCode: string | null;
  isResolved: boolean;
  isProvisional: boolean;
};

export type BracketMatch = {
  matchNumber: number;
  round: string;
  team1: BracketTeam;
  team2: BracketTeam;
  score: string | null;
  isPlayed: boolean;
  winnerSlot: string;
  loserSlot: string;
};

export type BracketRound = {
  key: string;
  label: string;
  matches: BracketMatch[];
};

const ROUND_ORDER = [
  { key: "r32", label: "Round of 32", matchRound: "Round of 32" },
  { key: "r16", label: "Round of 16", matchRound: "Round of 16" },
  { key: "qf", label: "Quarter-finals", matchRound: "Quarter-final" },
  { key: "sf", label: "Semi-finals", matchRound: "Semi-final" },
  { key: "final", label: "Final", matchRound: "Final" },
] as const;

const KNOCKOUT_ROUNDS = new Set([
  "Round of 32",
  "Round of 16",
  "Quarter-final",
  "Semi-final",
  "Final",
  "Match for third place",
]);

function formatScore(match: Match): string | null {
  const ft = match.score?.ft;
  if (!ft) return null;
  return `${ft[0]}–${ft[1]}`;
}

function winnerSide(match: Match): "team1" | "team2" | null {
  const ft = match.score?.ft;
  if (!ft) return null;
  if (ft[0] > ft[1]) return "team1";
  if (ft[1] > ft[0]) return "team2";
  return null;
}

function unresolvedTeam(label: string): BracketTeam {
  return {
    label,
    name: null,
    fifaCode: null,
    isResolved: false,
    isProvisional: false,
  };
}

function resolvedTeam(
  label: string,
  name: string,
  fifaCode: string | null,
  isProvisional = false
): BracketTeam {
  return {
    label,
    name,
    fifaCode,
    isResolved: true,
    isProvisional,
  };
}

function matchTeamLabel(match: Match, side: "team1" | "team2"): string {
  const slots = knockoutSlotLabels(match.match_number);
  if (slots) {
    return side === "team1" ? slots.team1 : slots.team2;
  }

  const team = side === "team1" ? match.team1 : match.team2;
  return team?.name ?? "TBD";
}

function resolveSlotLabel(
  label: string,
  slotResults: Map<string, BracketTeam>,
  groups: GroupStandings[],
  qualifiedThirdLetters: Set<string>,
  thirdPlaceComboAssignment: Map<string, string>
): BracketTeam {
  const cached = slotResults.get(label);
  if (cached?.isResolved) return cached;

  if (/^W\d+$/.test(label) || /^L\d+$/.test(label)) {
    return slotResults.get(label) ?? unresolvedTeam(label);
  }

  const groupSlot = resolveGroupPositionSlot(
    label,
    groups,
    qualifiedThirdLetters,
    thirdPlaceComboAssignment
  );
  if (groupSlot) {
    return resolvedTeam(
      groupSlot.label,
      groupSlot.name,
      groupSlot.fifaCode,
      groupSlot.isProvisional
    );
  }

  return unresolvedTeam(label);
}

export function buildWorldCup2026Bracket(
  matches: Match[],
  teams: Team[]
): { groups: GroupStandings[]; rounds: BracketRound[]; thirdPlaceMatch: BracketMatch | null } {
  const groups = buildGroupStandings(matches, teams);
  const qualifiedThirdLetters = qualifiedThirdPlaceLetters(groups);
  const thirdPlaceComboAssignment = thirdPlaceComboAssignments(qualifiedThirdLetters);
  const slotResults = new Map<string, BracketTeam>();

  const knockoutMatches = matches
    .filter(
      (match) =>
        match.match_number &&
        match.round &&
        KNOCKOUT_ROUNDS.has(match.round) &&
        match.team1 !== undefined
    )
    .sort((a, b) => (a.match_number ?? 0) - (b.match_number ?? 0));

  for (const match of knockoutMatches) {
    if (!match.match_number) continue;

    const team1Label = matchTeamLabel(match, "team1");
    const team2Label = matchTeamLabel(match, "team2");
    const team1 = resolveSlotLabel(
      team1Label,
      slotResults,
      groups,
      qualifiedThirdLetters,
      thirdPlaceComboAssignment
    );
    const team2 = resolveSlotLabel(
      team2Label,
      slotResults,
      groups,
      qualifiedThirdLetters,
      thirdPlaceComboAssignment
    );

    const side = winnerSide(match);
    if (side) {
      const winner = side === "team1" ? team1 : team2;
      const loser = side === "team1" ? team2 : team1;
      const winnerResolved =
        winner.isResolved && winner.name
          ? winner
          : side === "team1" && match.team1
            ? resolvedTeam(`W${match.match_number}`, match.team1.name, match.team1.fifa_code)
            : side === "team2" && match.team2
              ? resolvedTeam(`W${match.match_number}`, match.team2.name, match.team2.fifa_code)
              : winner;

      const loserResolved =
        loser.isResolved && loser.name
          ? loser
          : side === "team1" && match.team2
            ? resolvedTeam(`L${match.match_number}`, match.team2.name, match.team2.fifa_code)
            : side === "team2" && match.team1
              ? resolvedTeam(`L${match.match_number}`, match.team1.name, match.team1.fifa_code)
              : loser;

      slotResults.set(`W${match.match_number}`, {
        ...winnerResolved,
        label: `W${match.match_number}`,
      });
      slotResults.set(`L${match.match_number}`, {
        ...loserResolved,
        label: `L${match.match_number}`,
      });
    }
  }

  const buildBracketMatch = (match: Match): BracketMatch => ({
    matchNumber: match.match_number ?? 0,
    round: match.round ?? "",
    team1: resolveSlotLabel(
      matchTeamLabel(match, "team1"),
      slotResults,
      groups,
      qualifiedThirdLetters,
      thirdPlaceComboAssignment
    ),
    team2: resolveSlotLabel(
      matchTeamLabel(match, "team2"),
      slotResults,
      groups,
      qualifiedThirdLetters,
      thirdPlaceComboAssignment
    ),
    score: formatScore(match),
    isPlayed: Boolean(match.score?.ft),
    winnerSlot: `W${match.match_number}`,
    loserSlot: `L${match.match_number}`,
  });

  const bracketMatches: BracketMatch[] = knockoutMatches
    .filter((match) => match.round !== "Match for third place")
    .map(buildBracketMatch);

  const thirdPlaceSource = knockoutMatches.find(
    (match) => match.round === "Match for third place"
  );
  const thirdPlaceMatch = thirdPlaceSource ? buildBracketMatch(thirdPlaceSource) : null;

  const rounds = ROUND_ORDER.map(({ key, label, matchRound }) => ({
    key,
    label,
    matches: bracketMatches.filter((match) => match.round === matchRound),
  })).filter((round) => round.matches.length > 0);

  return { groups, rounds, thirdPlaceMatch };
}
