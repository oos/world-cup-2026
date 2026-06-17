import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  DEFAULT_COMPETITION_SLUG,
  useCompetition,
} from "../context/CompetitionContext";

const SCOPED_SEGMENTS = ["teams", "players", "matches"] as const;
export type CompetitionScopedSegment = (typeof SCOPED_SEGMENTS)[number];

export function useCompetitionScope(segment?: CompetitionScopedSegment) {
  const navigate = useNavigate();
  const { slug, competition, isScoped, loading } = useCompetition();
  const isWorldCup = slug === DEFAULT_COMPETITION_SLUG;
  const supportsHistory = isWorldCup;
  /** Pass to API calls — always set on `/c/:slug` routes; for clubs also when selected off-route. */
  const competitionApiSlug = !isWorldCup || isScoped ? slug : undefined;
  const defaultTeamSort = isWorldCup ? ("ranking" as const) : ("name" as const);

  useEffect(() => {
    if (!segment || loading || isWorldCup || isScoped) return;
    navigate(`/c/${slug}/${segment}${window.location.search}`, { replace: true });
  }, [segment, loading, isWorldCup, isScoped, slug, navigate]);

  return {
    slug,
    competition,
    isScoped,
    isWorldCup,
    supportsHistory,
    competitionApiSlug,
    defaultTeamSort,
    competitionPath: (tab: string) => `/c/${slug}/${tab}`,
  };
}

export function resolveAppNavPath(path: string, competitionSlug: string): string {
  if (competitionSlug === DEFAULT_COMPETITION_SLUG) return path;
  const segment = path.replace(/^\//, "");
  if ((SCOPED_SEGMENTS as readonly string[]).includes(segment)) {
    return `/c/${competitionSlug}/${segment}`;
  }
  return path;
}
