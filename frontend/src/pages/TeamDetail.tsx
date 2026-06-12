import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api, type SquadGroup, type Team, type TeamHistoryStats } from "../api/client";
import { SquadList } from "../components/SquadList";
import { TeamFlag } from "../components/TeamFlag";
import { TeamHistoryPanel } from "../components/TeamHistoryPanel";
import { FilterLink, FilterOption, FilterSection } from "../components/FilterPanel";
import { PageHeaderActions } from "../components/PageHeader";
import { SegmentedTabs } from "../components/SegmentedTabs";
import { useFilterPanel, usePageFilters } from "../context/FilterPanelContext";

type TeamTab = "stats" | "players";

const POSITIONS: { key: keyof SquadGroup; label: string }[] = [
  { key: "GK", label: "Goalkeepers" },
  { key: "DEF", label: "Defenders" },
  { key: "MID", label: "Midfielders" },
  { key: "FWD", label: "Forwards" },
  { key: "OTHER", label: "Other" },
];

const EMPTY_HISTORY: TeamHistoryStats = {
  appearances: 0,
  world_cups_played: [],
  titles: 0,
  title_years: [],
  runners_up: 0,
  best_finish: null,
  best_finish_year: null,
  total_matches: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  goals_for: 0,
  goals_against: 0,
  goal_difference: 0,
  knockout_appearances: 0,
  rounds_reached: {},
  round_matches: {},
  tournaments: [],
  world_cup_results: [],
};

export function TeamDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const focusMatchId = location.hash.startsWith("#wc-match-")
    ? location.hash.slice(1)
    : null;
  const [activeTab, setActiveTab] = useState<TeamTab>("stats");
  const [positionFilter, setPositionFilter] = useState<keyof SquadGroup | null>(null);
  const [team, setTeam] = useState<(Team & { squad: SquadGroup }) | null>(null);
  const [history, setHistory] = useState<TeamHistoryStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { close } = useFilterPanel();

  useEffect(() => {
    if (activeTab === "stats") close();
  }, [activeTab, close]);

  useEffect(() => {
    if (!focusMatchId || !history) return;

    setActiveTab("stats");

    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(focusMatchId);
      const accordion = target?.closest("details");
      if (accordion instanceof HTMLDetailsElement) {
        accordion.open = true;
      }
      target?.scrollIntoView({ block: "center", behavior: "smooth" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [focusMatchId, history]);

  useEffect(() => {
    if (!id) return;
    const teamId = Number(id);
    Promise.all([api.getTeam(teamId), api.getTeamHistory(teamId)])
      .then(([teamData, historyData]) => {
        setTeam(teamData);
        setHistory(historyData);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const availablePositions = useMemo(
    () => POSITIONS.filter(({ key }) => team?.squad[key]?.length),
    [team]
  );

  const filterContent = useMemo(
    () =>
      team && activeTab === "players" ? (
        <>
          <FilterSection title="Position">
            <FilterOption
              label="All positions"
              active={!positionFilter}
              onClick={() => setPositionFilter(null)}
            />
            {availablePositions.map(({ key, label }) => (
              <FilterOption
                key={key}
                label={label}
                active={positionFilter === key}
                onClick={() => setPositionFilter(key)}
              />
            ))}
          </FilterSection>
          <FilterSection title="Related">
            <FilterLink
              label={`Teams in ${team.group}`}
              to={`/teams?group=${encodeURIComponent(team.group)}`}
            />
          </FilterSection>
        </>
      ) : null,
    [team, positionFilter, availablePositions, activeTab]
  );

  usePageFilters({
    title: "Squad Filters",
    content: filterContent,
    activeCount: activeTab === "players" && positionFilter ? 1 : 0,
  });

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (!team || !history) return <div className="loading">Loading squad…</div>;

  return (
    <>
      <Link to="/teams" className="back-link">
        ← Teams
      </Link>
      <div className="page-header-row page-header-row--end">
        <PageHeaderActions />
      </div>
      <div className="hero team-detail-hero">
        <div className="team-detail-hero-header">
          <TeamFlag
            fifaCode={team.fifa_code}
            teamName={team.name}
            variant="badge"
            className="team-detail-hero-flag"
          />
          <h1>{team.name}</h1>
        </div>
      </div>

      <div className="team-detail-tabs">
        <SegmentedTabs
          ariaLabel="Team sections"
          tabs={[
            { id: "stats", label: "Team Stats" },
            { id: "players", label: "Players" },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === "stats" ? (
          <div className="team-detail-panel" role="tabpanel" aria-label="Team Stats">
            <TeamHistoryPanel
              history={history ?? EMPTY_HISTORY}
              teamId={team.id}
              teamName={team.name}
              focusMatchId={focusMatchId}
            />
          </div>
        ) : (
          <div className="team-detail-panel" role="tabpanel" aria-label="Players">
            <SquadList squad={team.squad} positionFilter={positionFilter} />
          </div>
        )}
      </div>
    </>
  );
}
