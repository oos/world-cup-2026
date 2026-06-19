import type { Match, Team } from "../api/client";
import { WORLD_CUP_2026_KNOCKOUT_SLOTS } from "./worldCup2026KnockoutSlots";
import {
  buildGroupStandings,
  qualifiedThirdPlaceLetters,
  resolveGroupPositionSlot,
  type GroupStandings,
} from "./worldCup2026Standings";
import { thirdPlaceComboAssignments } from "./worldCup2026ThirdPlaceTable";

export type PredictionScore = {
  ft: [number, number];
  pens?: [number, number];
};

export type BracketParticipant = {
  name: string | null;
  fifaCode: string | null;
  label: string;
  isResolved: boolean;
};

export type PredictionBracketMatch = {
  matchNumber: number;
  round: string;
  roundKey: string;
  team1: BracketParticipant;
  team2: BracketParticipant;
  prediction: PredictionScore | null;
  winnerSide: "team1" | "team2" | null;
};

export type PredictionBracketRound = {
  key: string;
  label: string;
  matches: PredictionBracketMatch[];
};

export type PredictionPodium = {
  first: BracketParticipant | null;
  second: BracketParticipant | null;
  third: BracketParticipant | null;
};

export type PredictionBracketState = {
  rounds: PredictionBracketRound[];
  thirdPlaceMatch: PredictionBracketMatch | null;
  podium: PredictionPodium;
};

export const KNOCKOUT_PREDICTIONS_KEY = "wc26-knockout-predictions-v1";

const ROUND_META = [
  { key: "r32", label: "Round of 32", round: "Round of 32", from: 73, to: 88 },
  { key: "r16", label: "Round of 16", round: "Round of 16", from: 89, to: 96 },
  { key: "qf", label: "Quarterfinals", round: "Quarter-final", from: 97, to: 100 },
  { key: "sf", label: "Semifinals", round: "Semi-final", from: 101, to: 102 },
  { key: "final", label: "Final", round: "Final", from: 104, to: 104 },
] as const;

const MATCH_ROUNDS: Record<number, string> = {
  ...Object.fromEntries(
    Array.from({ length: 16 }, (_, index) => [73 + index, "Round of 32"])
  ),
  ...Object.fromEntries(
    Array.from({ length: 8 }, (_, index) => [89 + index, "Round of 16"])
  ),
  ...Object.fromEntries(
    Array.from({ length: 4 }, (_, index) => [97 + index, "Quarter-final"])
  ),
  101: "Semi-final",
  102: "Semi-final",
  103: "Match for third place",
  104: "Final",
};

function unresolvedParticipant(label: string): BracketParticipant {
  return { name: null, fifaCode: null, label, isResolved: false };
}

function resolvedParticipant(
  label: string,
  name: string,
  fifaCode: string | null
): BracketParticipant {
  return { name, fifaCode, label, isResolved: true };
}

function resolveSlotLabel(
  label: string,
  slotResults: Map<string, BracketParticipant>,
  groups: GroupStandings[],
  qualifiedThirdLetters: Set<string>,
  thirdPlaceComboAssignment: Map<string, string>
): BracketParticipant {
  const cached = slotResults.get(label);
  if (cached?.isResolved) return cached;

  if (/^W\d+$/.test(label) || /^L\d+$/.test(label)) {
    return slotResults.get(label) ?? unresolvedParticipant(label);
  }

  const groupSlot = resolveGroupPositionSlot(
    label,
    groups,
    qualifiedThirdLetters,
    thirdPlaceComboAssignment
  );
  if (groupSlot) {
    return resolvedParticipant(groupSlot.label, groupSlot.name, groupSlot.fifaCode);
  }

  return unresolvedParticipant(label);
}

export function parseActualScore(match: Match): PredictionScore | null {
  const ft = match.score?.ft;
  if (!ft) return null;
  return { ft: [ft[0], ft[1]] };
}

export function determineWinnerSide(
  score: PredictionScore | null
): "team1" | "team2" | null {
  if (!score) return null;

  const [a, b] = score.ft;
  if (a > b) return "team1";
  if (b > a) return "team2";

  if (score.pens) {
    if (score.pens[0] > score.pens[1]) return "team1";
    if (score.pens[1] > score.pens[0]) return "team2";
  }

  return null;
}

export function formatPredictionScore(score: PredictionScore | null): string {
  if (!score) return "";

  const [a, b] = score.ft;
  if (score.pens && a === b) {
    return `${a} (${score.pens[0]})`;
  }
  return String(a);
}

export function formatPredictionScoreAway(score: PredictionScore | null): string {
  if (!score) return "";

  const [a, b] = score.ft;
  if (score.pens && a === b) {
    return `${b} (${score.pens[1]})`;
  }
  return String(b);
}

function downstreamMatchNumbers(changedMatchNumber: number): number[] {
  return Object.keys(WORLD_CUP_2026_KNOCKOUT_SLOTS)
    .map(Number)
    .filter((matchNumber) => matchNumber > changedMatchNumber);
}

export function prunePredictionsAfterChange(
  predictions: Record<number, PredictionScore>,
  changedMatchNumber: number
): Record<number, PredictionScore> {
  const next = { ...predictions };
  for (const matchNumber of downstreamMatchNumbers(changedMatchNumber)) {
    delete next[matchNumber];
  }
  return next;
}

export function seedPredictionsFromMatches(
  matches: Match[]
): Record<number, PredictionScore> {
  const seeded: Record<number, PredictionScore> = {};
  for (const match of matches) {
    if (!match.match_number) continue;
    const parsed = parseActualScore(match);
    if (parsed) {
      seeded[match.match_number] = parsed;
    }
  }
  return seeded;
}

export function loadStoredPredictions(): Record<number, PredictionScore> {
  try {
    const raw = localStorage.getItem(KNOCKOUT_PREDICTIONS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, PredictionScore>;
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [Number(key), value])
    );
  } catch {
    return {};
  }
}

export function saveStoredPredictions(predictions: Record<number, PredictionScore>) {
  localStorage.setItem(KNOCKOUT_PREDICTIONS_KEY, JSON.stringify(predictions));
}

export function buildPredictionBracket(
  matches: Match[],
  teams: Team[],
  predictions: Record<number, PredictionScore>
): PredictionBracketState {
  const groups = buildGroupStandings(matches, teams);
  const qualifiedThirdLetters = qualifiedThirdPlaceLetters(groups);
  const thirdPlaceComboAssignment = thirdPlaceComboAssignments(qualifiedThirdLetters);
  const slotResults = new Map<string, BracketParticipant>();
  const builtMatches = new Map<number, PredictionBracketMatch>();

  const matchNumbers = Object.keys(WORLD_CUP_2026_KNOCKOUT_SLOTS)
    .map(Number)
    .sort((a, b) => a - b);

  for (const matchNumber of matchNumbers) {
    const slots = WORLD_CUP_2026_KNOCKOUT_SLOTS[matchNumber];
    const team1 = resolveSlotLabel(
      slots.team1,
      slotResults,
      groups,
      qualifiedThirdLetters,
      thirdPlaceComboAssignment
    );
    const team2 = resolveSlotLabel(
      slots.team2,
      slotResults,
      groups,
      qualifiedThirdLetters,
      thirdPlaceComboAssignment
    );
    const prediction = predictions[matchNumber] ?? null;
    const winnerSide = determineWinnerSide(prediction);

    if (winnerSide) {
      const winner = winnerSide === "team1" ? team1 : team2;
      const loser = winnerSide === "team1" ? team2 : team1;
      slotResults.set(`W${matchNumber}`, {
        ...winner,
        label: `W${matchNumber}`,
      });
      slotResults.set(`L${matchNumber}`, {
        ...loser,
        label: `L${matchNumber}`,
      });
    }

    builtMatches.set(matchNumber, {
      matchNumber,
      round: MATCH_ROUNDS[matchNumber] ?? "Knockout",
      roundKey:
        ROUND_META.find(
          (round) => matchNumber >= round.from && matchNumber <= round.to
        )?.key ?? "other",
      team1,
      team2,
      prediction,
      winnerSide,
    });
  }

  const rounds = ROUND_META.map(({ key, label, from, to }) => ({
    key,
    label,
    matches: matchNumbers
      .filter((matchNumber) => matchNumber >= from && matchNumber <= to)
      .map((matchNumber) => builtMatches.get(matchNumber)!)
      .filter(Boolean),
  }));

  const thirdPlaceMatch = builtMatches.get(103) ?? null;

  const finalMatch = builtMatches.get(104);
  const finalWinner =
    finalMatch?.winnerSide === "team1"
      ? finalMatch.team1
      : finalMatch?.winnerSide === "team2"
        ? finalMatch.team2
        : null;
  const finalLoser =
    finalMatch?.winnerSide === "team1"
      ? finalMatch.team2
      : finalMatch?.winnerSide === "team2"
        ? finalMatch.team1
        : null;

  const thirdWinner =
    thirdPlaceMatch?.winnerSide === "team1"
      ? thirdPlaceMatch.team1
      : thirdPlaceMatch?.winnerSide === "team2"
        ? thirdPlaceMatch.team2
        : null;

  return {
    rounds,
    thirdPlaceMatch,
    podium: {
      first: finalWinner?.isResolved ? finalWinner : null,
      second: finalLoser?.isResolved ? finalLoser : null,
      third: thirdWinner?.isResolved ? thirdWinner : null,
    },
  };
}

export const PREDICTION_BRACKET_TRACK_SLOTS = 16;

export function getMatchSlotIndex(matchNumber: number, roundKey: string): number {
  if (roundKey === "r32") return matchNumber - 73;
  if (roundKey === "r16") return (matchNumber - 89) * 2;
  if (roundKey === "qf") return (matchNumber - 97) * 4;
  if (roundKey === "sf") return (matchNumber - 101) * 8;
  if (roundKey === "final") return 0;
  return 0;
}

export function getMatchGridSpan(matchNumber: number): number {
  if (matchNumber >= 73 && matchNumber <= 88) return 1;
  if (matchNumber >= 89 && matchNumber <= 96) return 2;
  if (matchNumber >= 97 && matchNumber <= 100) return 4;
  if (matchNumber === 101 || matchNumber === 102) return 8;
  if (matchNumber === 104) return 16;
  return 1;
}

export type MatchConnectorRole = "pair-top" | "pair-bottom" | "none";

export function getMatchConnectorRole(
  matchNumber: number,
  roundKey: string
): MatchConnectorRole {
  if (roundKey === "final") return "none";

  let indexInRound = -1;
  if (roundKey === "r32") indexInRound = matchNumber - 73;
  else if (roundKey === "r16") indexInRound = matchNumber - 89;
  else if (roundKey === "qf") indexInRound = matchNumber - 97;
  else if (roundKey === "sf") indexInRound = matchNumber - 101;
  else return "none";

  if (indexInRound < 0) return "none";
  return indexInRound % 2 === 0 ? "pair-top" : "pair-bottom";
}
