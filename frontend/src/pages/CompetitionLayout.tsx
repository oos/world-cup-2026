import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  api,
  type Bracket,
  type Competition,
  type Match,
  type Standings,
  type Team,
} from "../api/client";
import { StandingsBlock } from "../components/StandingsBlock";
import { BracketBlock } from "../components/BracketBlock";
import { useCompetition } from "../context/CompetitionContext";

const TAB_LABELS: Record<string, string> = {
  matches: "Matches",
  table: "Table",
  standings: "Standings",
  groups: "Groups",
  bracket: "Knockout",
  teams: "Teams",
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

function MatchesTab({ slug }: { slug: string }) {
  const { data, loading, error } = useAsync(() => api.getMatches(undefined, slug), [slug]);
  if (loading) return <p className="empty-state">Loading matches…</p>;
  if (error) return <p className="empty-state">{error}</p>;
  const matches = data?.matches ?? [];
  if (!matches.length) return <p className="empty-state">No matches available yet.</p>;
  return (
    <ul className="competition-match-list">
      {matches.map((match: Match) => (
        <li key={match.id} className="competition-match-row">
          <span className="competition-match-round">{match.round || match.stage || ""}</span>
          <span className="competition-match-teams">
            <span>{match.team1?.name ?? "TBD"}</span>
            <span className="competition-match-score">
              {match.score?.ft ? `${match.score.ft[0]} – ${match.score.ft[1]}` : "v"}
            </span>
            <span>{match.team2?.name ?? "TBD"}</span>
          </span>
          <span className="competition-match-date">{match.date ?? ""}</span>
        </li>
      ))}
    </ul>
  );
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

function TeamsTab({ slug }: { slug: string }) {
  const { data, loading, error } = useAsync(() => api.getTeams(undefined, slug), [slug]);
  if (loading) return <p className="empty-state">Loading teams…</p>;
  if (error) return <p className="empty-state">{error}</p>;
  const teams = data?.teams ?? [];
  if (!teams.length) return <p className="empty-state">No teams available.</p>;
  return (
    <div className="competition-team-grid">
      {teams.map((team: Team) => (
        <div key={team.id} className="competition-team-card">
          {team.crest_url ? (
            <img src={team.crest_url} alt="" className="competition-team-crest" loading="lazy" />
          ) : null}
          <span className="competition-team-name">{team.name}</span>
        </div>
      ))}
    </div>
  );
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
      content = <TeamsTab slug={slug} />;
      break;
    case "matches":
    default:
      content = <MatchesTab slug={slug} />;
      break;
  }

  return (
    <div className="competition-page">
      <CompetitionHeader competition={competition} slug={slug} activeTab={activeTab} />
      <div className="competition-content">{content}</div>
    </div>
  );
}
