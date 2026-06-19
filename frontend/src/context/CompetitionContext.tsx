import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, type Competition, type CompetitionRegion } from "../api/client";

const STORAGE_KEY = "wc26_competition";
export const DEFAULT_COMPETITION_SLUG = "world-cup-2026";
/** When false, competition is fixed to World Cup 2026 and the selector is hidden. */
export const COMPETITION_SELECTOR_ENABLED = false;

export function slugFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/c\/([^/]+)/);
  return match ? match[1] : null;
}

interface CompetitionContextValue {
  competitions: Competition[];
  regions: CompetitionRegion[];
  competition: Competition | null;
  slug: string;
  loading: boolean;
  /** True when the active route is a competition-scoped (`/c/:slug`) route. */
  isScoped: boolean;
  setCompetition: (slug: string) => void;
}

const CompetitionContext = createContext<CompetitionContextValue | undefined>(undefined);

export function CompetitionProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [regions, setRegions] = useState<CompetitionRegion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getCompetitions()
      .then((data) => {
        if (cancelled) return;
        setCompetitions(data.competitions);
        setRegions(data.regions);
      })
      .catch(() => {
        if (!cancelled) {
          setCompetitions([]);
          setRegions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const routeSlug = slugFromPathname(location.pathname);
  const storedSlug =
    typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
  const slug = COMPETITION_SELECTOR_ENABLED
    ? routeSlug || storedSlug || DEFAULT_COMPETITION_SLUG
    : DEFAULT_COMPETITION_SLUG;

  useEffect(() => {
    if (!COMPETITION_SELECTOR_ENABLED && typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, DEFAULT_COMPETITION_SLUG);
      return;
    }
    if (routeSlug && typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, routeSlug);
    }
  }, [routeSlug]);

  const competition = useMemo(
    () => competitions.find((c) => c.slug === slug) ?? null,
    [competitions, slug],
  );

  const setCompetition = useCallback(
    (nextSlug: string) => {
      if (!COMPETITION_SELECTOR_ENABLED) return;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, nextSlug);
      }
      const target = competitions.find((c) => c.slug === nextSlug);
      const defaultTab = target?.layout_config?.default_tab || "matches";
      navigate(`/c/${nextSlug}/${defaultTab}`);
    },
    [competitions, navigate],
  );

  const value = useMemo<CompetitionContextValue>(
    () => ({
      competitions,
      regions,
      competition,
      slug,
      loading,
      isScoped: COMPETITION_SELECTOR_ENABLED ? Boolean(routeSlug) : false,
      setCompetition,
    }),
    [competitions, regions, competition, slug, loading, routeSlug, setCompetition],
  );

  return <CompetitionContext.Provider value={value}>{children}</CompetitionContext.Provider>;
}

export function useCompetition(): CompetitionContextValue {
  const ctx = useContext(CompetitionContext);
  if (!ctx) {
    throw new Error("useCompetition must be used within a CompetitionProvider");
  }
  return ctx;
}
