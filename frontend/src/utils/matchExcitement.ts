import type { Match } from "../api/client";
import { getTeamWorldRanking } from "./teamWorldRanking";

export type MatchSort = "date" | "excitement";

export function parseMatchSortParam(value: string | null): MatchSort {
  if (value === "excitement" || value === "ef") return "excitement";
  return "date";
}

export function matchSortParamValue(sort: MatchSort): string | undefined {
  if (sort === "excitement") return "ef";
  return undefined;
}

export function getMatchAverageWorldRanking(
  match: Pick<Match, "team1" | "team2">
): number | null {
  const team1Rank = getTeamWorldRanking(
    match.team1?.fifa_code,
    match.team1?.world_ranking
  );
  const team2Rank = getTeamWorldRanking(
    match.team2?.fifa_code,
    match.team2?.world_ranking
  );

  if (team1Rank == null || team2Rank == null) return null;
  return (team1Rank + team2Rank) / 2;
}

/** Harmonic mean — pulled toward the weaker team, so mismatches score lower. */
export function getMatchHarmonicWorldRanking(
  match: Pick<Match, "team1" | "team2">
): number | null {
  const team1Rank = getTeamWorldRanking(
    match.team1?.fifa_code,
    match.team1?.world_ranking
  );
  const team2Rank = getTeamWorldRanking(
    match.team2?.fifa_code,
    match.team2?.world_ranking
  );

  if (team1Rank == null || team2Rank == null) return null;
  return 2 / (1 / team1Rank + 1 / team2Rank);
}

/** World Cup participant range used to map rank to a 0–100 excitement score. */
const EXCITEMENT_BEST_RANK = 1;
const EXCITEMENT_WORST_RANK = 85;
const EXCITEMENT_RANK_SPAN = EXCITEMENT_WORST_RANK - EXCITEMENT_BEST_RANK;

/** Share of EF driven by how close the two FIFA ranks are (remainder is team quality). */
const RANK_CLOSENESS_WEIGHT = 0.1;

function rankToExcitementScore(rank: number): number {
  const clampedRank = Math.max(
    EXCITEMENT_BEST_RANK,
    Math.min(EXCITEMENT_WORST_RANK, rank)
  );
  const raw = ((EXCITEMENT_WORST_RANK - clampedRank) / EXCITEMENT_RANK_SPAN) * 100;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

/** 0–100: equal ranks score highest; large gaps score lower. */
function rankClosenessScore(team1Rank: number, team2Rank: number): number {
  const rankDiff = Math.abs(team1Rank - team2Rank);
  const raw = (1 - Math.min(rankDiff, EXCITEMENT_RANK_SPAN) / EXCITEMENT_RANK_SPAN) * 100;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

/** Higher values mean a more exciting fixture on a 0–100 scale. */
export function getMatchExcitementFactor(match: Pick<Match, "team1" | "team2">): number {
  const score = getMatchExcitementScore(match);
  if (score == null) return Number.NEGATIVE_INFINITY;
  return score;
}

/** User-facing score on a 0–100 scale; higher means stronger, balanced teams. */
export function getMatchExcitementScore(
  match: Pick<Match, "team1" | "team2">
): number | null {
  const team1Rank = getTeamWorldRanking(
    match.team1?.fifa_code,
    match.team1?.world_ranking
  );
  const team2Rank = getTeamWorldRanking(
    match.team2?.fifa_code,
    match.team2?.world_ranking
  );

  if (team1Rank == null || team2Rank == null) return null;

  const harmonicRank = 2 / (1 / team1Rank + 1 / team2Rank);
  const qualityScore = rankToExcitementScore(harmonicRank);
  const closenessScore = rankClosenessScore(team1Rank, team2Rank);
  const qualityWeight = 1 - RANK_CLOSENESS_WEIGHT;
  const combined =
    qualityScore * qualityWeight + closenessScore * RANK_CLOSENESS_WEIGHT;

  return Math.round(Math.max(0, Math.min(100, combined)));
}

export function formatMatchExcitementScore(
  match: Pick<Match, "team1" | "team2">
): string | null {
  const score = getMatchExcitementScore(match);
  if (score == null) return null;
  return `${score}%`;
}

export function compareMatchExcitement(a: Match, b: Match): number {
  return getMatchExcitementFactor(b) - getMatchExcitementFactor(a);
}
