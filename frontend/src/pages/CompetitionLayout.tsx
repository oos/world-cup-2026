import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  api,
  type Bracket,
  type Competition,
  type Standings,
} from "../api/client";
import { StandingsBlock } from "../components/StandingsBlock";
import { BracketBlock } from "../components/BracketBlock";
import { useCompetition } from "../context/CompetitionContext";
import { Matches } from "./Matches";
import { Players } from "./Players";
import { Teams } from "./Teams";

const TAB_LABELS: Record<string, string> = {
  matches: "Fixtures",
  table: "Table",
  standings: "Standings",
  groups: "Groups",
  bracket: "Knockout",
  teams: "Teams",
  players: "Players",
};

function CompetitionHeader({
  competition,
  slug,
  activeTab,
}: {
  competition: Competition;
  slug: string;
  activeTab: string;
}) {
  const tabs = competition.layout_config?.tabs ?? [];
  return (
    <header className="competition-header">
      <div className="competition-header-meta">
        <p className="competition-header-region">
          {competition.region_label}
          {competition.tier ? ` · Tier ${competition.tier}` : ""}
        </p>
        <h1 className="competition-header-title">{competition.name}</h1>
        {competition.season_label ? (
          <p className="competition-header-season">{competition.season_label}</p>
        ) : null}
      </div>
      <nav className="competition-tabs">
        {tabs.map((tab) => (
          <Link
            key={tab}
            to={`/c/${slug}/${tab}`}
            className={`competition-tab ${tab === activeTab ? "active" : ""}`}
          >
            {TAB_LABELS[tab] ?? tab}
          </Link>
        ))}
      </nav>
    </header>
  );
}

function useAsync<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loader()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, loading, error };
}

function StandingsTab({ slug }: { slug: string }) {
  const { data, loading, error } = useAsync<Standings>(() => api.getStandings(slug), [slug]);
  if (loading) return <p className="empty-state">Loading table…</p>;
  if (error) return <p className="empty-state">{error}</p>;
  if (!data) return <p className="empty-state">No standings available.</p>;
  return <StandingsBlock standings={data} />;
}

function BracketTab({ slug }: { slug: string }) {
  const { data, loading, error } = useAsync<Bracket>(() => api.getBracket(slug), [slug]);
  if (loading) return <p className="empty-state">Loading bracket…</p>;
  if (error) return <p className="empty-state">{error}</p>;
  if (!data) return <p className="empty-state">No bracket available.</p>;
  return <BracketBlock bracket={data} />;
}

export function CompetitionLayout() {
  const { slug = "", tab } = useParams<{ slug: string; tab?: string }>();
  const { competition, loading } = useCompetition();

  useEffect(() => {
    if (competition) {
      document.title = `${competition.name} · Football Stats`;
    }
  }, [competition]);

  if (loading && !competition) {
    return <p className="empty-state">Loading competition…</p>;
  }
  if (!competition) {
    return <p className="empty-state">Competition not found.</p>;
  }

  const tabs = competition.layout_config?.tabs ?? ["matches"];
  const defaultTab = competition.layout_config?.default_tab || tabs[0] || "matches";

  if (!tab) {
    return <Navigate to={`/c/${slug}/${defaultTab}`} replace />;
  }

  const activeTab = tabs.includes(tab) ? tab : defaultTab;
  const basePath = `/c/${slug}/${activeTab}`;

  let content: ReactNode;
  switch (activeTab) {
    case "table":
    case "standings":
    case "groups":
      content = <StandingsTab slug={slug} />;
      break;
    case "bracket":
      content = <BracketTab slug={slug} />;
      break;
    case "teams":
      content = <Teams embedded />;
      break;
    case "players":
      content = <Players embedded />;
      break;
    case "matches":
    default:
      content = (
        <Matches
          embedded
          basePath={basePath}
          pageTitle={`${competition.name} fixtures`}
        />
      );
      break;
  }

  return (
    <div className="competition-page">
      <CompetitionHeader competition={competition} slug={slug} activeTab={activeTab} />
      <div className="competition-content">{content}</div>
    </div>
  );
}
