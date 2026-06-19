import type { Match } from "../api/client";

export type GroupScore = [number, number];

export const GROUP_PREDICTIONS_KEY = "wc26-group-predictions-v1";

export function isGroupStageMatch(match: Match): boolean {
  return Boolean(
    match.match_number &&
      match.group &&
      match.round?.startsWith("Matchday") &&
      match.team1 &&
      match.team2
  );
}

export function hasActualResult(match: Match): boolean {
  return Boolean(match.score?.ft && match.score.ft.length === 2);
}

export function loadStoredGroupPredictions(): Record<number, GroupScore> {
  try {
    const raw = localStorage.getItem(GROUP_PREDICTIONS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, GroupScore>;
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, value]) => Array.isArray(value) && value.length === 2)
        .map(([key, value]) => [Number(key), [value[0], value[1]] as GroupScore])
    );
  } catch {
    return {};
  }
}

export function saveStoredGroupPredictions(predictions: Record<number, GroupScore>) {
  localStorage.setItem(GROUP_PREDICTIONS_KEY, JSON.stringify(predictions));
}

/**
 * Inject predicted full-time scores into group-stage matches that do not yet
 * have a real result, so downstream standings + knockout slot resolution treat
 * the predictions as if they had been played.
 */
export function mergeGroupPredictions(
  matches: Match[],
  predictions: Record<number, GroupScore>
): Match[] {
  return matches.map((match) => {
    if (!isGroupStageMatch(match) || hasActualResult(match)) return match;
    const prediction = match.match_number ? predictions[match.match_number] : undefined;
    if (!prediction) return match;
    return {
      ...match,
      score: {
        ...(match.score ?? {}),
        ft: [prediction[0], prediction[1]],
        final: false,
      },
    };
  });
}

export type GroupFixtureBucket = {
  groupLetter: string;
  groupLabel: string;
  matches: Match[];
};

function groupLetterFromLabel(group: string | null | undefined): string | null {
  if (!group) return null;
  const match = group.match(/Group\s+([A-L])/i);
  return match ? match[1].toUpperCase() : null;
}

export function groupStageFixturesByGroup(matches: Match[]): GroupFixtureBucket[] {
  const buckets = new Map<string, Match[]>();
  for (const match of matches) {
    if (!isGroupStageMatch(match)) continue;
    const letter = groupLetterFromLabel(match.group);
    if (!letter) continue;
    const existing = buckets.get(letter) ?? [];
    existing.push(match);
    buckets.set(letter, existing);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, groupMatches]) => ({
      groupLetter: letter,
      groupLabel: `Group ${letter}`,
      matches: groupMatches.sort(
        (a, b) => (a.match_number ?? 0) - (b.match_number ?? 0)
      ),
    }));
}

export function countGroupPredictions(
  predictions: Record<number, GroupScore>
): number {
  return Object.keys(predictions).length;
}
