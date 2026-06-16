import {
  WORLD_CUP_SEARCH_TREND,
  type SearchTrendPoint,
} from "../config/worldCupSearchTrend";

const PLANNER_COLORS = [
  "var(--planner-a)",
  "var(--planner-b)",
  "var(--planner-c)",
  "var(--planner-d)",
  "var(--planner-e)",
  "var(--planner-f)",
  "var(--planner-g)",
  "var(--planner-h)",
  "var(--planner-i)",
  "var(--planner-j)",
  "var(--planner-k)",
  "var(--planner-l)",
] as const;

const TRENDING_PROFILES: Record<string, { scale: number; lift: number; phase: number }> =
  {
    ENG: { scale: 0.9, lift: 6, phase: 0.4 },
    BRA: { scale: 0.86, lift: 9, phase: 0.9 },
    GER: { scale: 0.76, lift: 4, phase: 1.3 },
    ESP: { scale: 0.84, lift: 7, phase: 1.7 },
    ARG: { scale: 0.94, lift: 5, phase: 2.1 },
    POR: { scale: 0.7, lift: 11, phase: 2.5 },
    FRA: { scale: 0.8, lift: 8, phase: 2.9 },
    MEX: { scale: 0.96, lift: 14, phase: 3.2 },
  };

const TRENDING_COLORS: Record<string, string> = {
  ENG: "var(--palette-navy)",
  BRA: "var(--palette-green)",
  GER: "var(--palette-slate)",
  ESP: "var(--palette-red)",
  ARG: "var(--palette-blue)",
  POR: "var(--palette-maroon)",
  FRA: "var(--palette-teal)",
  MEX: "var(--palette-gold)",
};

const trendCache = new Map<string, SearchTrendPoint[]>();

function hashCode(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function clampTrendValue(value: number): number {
  return Math.min(100, Math.max(8, Math.round(value)));
}

function profileFromCode(fifaCode: string) {
  const tuned = TRENDING_PROFILES[fifaCode];
  if (tuned) return tuned;

  const hash = hashCode(fifaCode);
  return {
    scale: 0.52 + (hash % 42) / 100,
    lift: 2 + (hash % 12),
    phase: (hash % 100) / 18,
  };
}

function buildTeamTrend(
  profile: { scale: number; lift: number; phase: number },
  base: SearchTrendPoint[]
): SearchTrendPoint[] {
  const lastIndex = Math.max(base.length - 1, 1);

  return base.map((point, index) => {
    const progress = index / lastIndex;
    const wobble = Math.sin(index * 0.55 + profile.phase) * 3.5;
    const value = point.value * profile.scale + profile.lift * progress + wobble;

    return {
      date: point.date,
      value: clampTrendValue(value),
    };
  });
}

export function buildSquadSearchTrend(fifaCode: string): SearchTrendPoint[] {
  const cached = trendCache.get(fifaCode);
  if (cached) return cached;

  const trend = buildTeamTrend(profileFromCode(fifaCode), WORLD_CUP_SEARCH_TREND);
  trendCache.set(fifaCode, trend);
  return trend;
}

export function squadTrendColor(fifaCode: string): string {
  return (
    TRENDING_COLORS[fifaCode] ??
    PLANNER_COLORS[hashCode(fifaCode) % PLANNER_COLORS.length]
  );
}
