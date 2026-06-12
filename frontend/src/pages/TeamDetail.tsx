import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { api, type Player, type SquadGroup, type Team, type TeamHistoryStats } from "../api/client";
import { FilterSection, FilterSelect, FilterToggle } from "../components/FilterPanel";
import { SaveItemButton } from "../components/SaveItemButton";
import { SearchInput } from "../components/SearchInput";
import { SquadList } from "../components/SquadList";
import { TeamNameWithFlag } from "../components/TeamNameWithFlag";
import { TeamHistoryPanel } from "../components/TeamHistoryPanel";
import { SegmentedTabs } from "../components/SegmentedTabs";
import { usePageFilters } from "../context/FilterPanelContext";
import { useBackPath } from "../hooks/useNavigation";
import { updateSearchParams } from "../utils/navigation";

type TeamTab = "stats" | "players";

const CURRENT_SQUAD_YEAR = 2026;

const POSITIONS: { key: keyof SquadGroup; label: string; chipClass: string }[] = [
  { key: "GK", label: "GKP", chipClass: "filter-chip--gkp" },
  { key: "DEF", label: "DEF", chipClass: "filter-chip--def" },
  { key: "MID", label: "MID", chipClass: "filter-chip--mid" },
  { key: "FWD", label: "FWD", chipClass: "filter-chip--fwd" },
  { key: "OTHER", label: "Other", chipClass: "filter-chip--other" },
];

const RESULT_ORDER = [
  "Champions",
  "Runners-up",
  "Third place",
  "Fourth place",
  "Semi-finals",
  "Quarter-finals",
  "Round of 16",
  "Group Stage",
  "In Progress",
  "Did not qualify",
  "Withdrew",
  "Boycotted",
  "Banned",
  "Did not participate",
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

const SQUAD_POSITIONS = new Set<keyof SquadGroup>(["GK", "DEF", "MID", "FWD", "OTHER"]);

function parsePositionFilter(value: string | null): keyof SquadGroup | null {
  if (!value || !SQUAD_POSITIONS.has(value as keyof SquadGroup)) return null;
  return value as keyof SquadGroup;
}

function parseYearFilter(value: string | null): number | null {
  if (!value) return null;
  const year = Number(value);
  return Number.isFinite(year) ? year : null;
}

function matchesPlayerSearch(value: string | null | undefined, query: string) {
  return (value ?? "").toLowerCase().includes(query);
}

function filterSquadBySearch(squad: SquadGroup, searchQuery: string): SquadGroup {
  const normalized = searchQuery.trim().toLowerCase();
  if (!normalized) return squad;

  const filterPlayers = (players: Player[]) =>
    players.filter(
      (player) =>
        matchesPlayerSearch(player.name, normalized) ||
        matchesPlayerSearch(player.club, normalized) ||
        matchesPlayerSearch(player.position, normalized)
    );

  return {
    GK: filterPlayers(squad.GK ?? []),
    DEF: filterPlayers(squad.DEF ?? []),
    MID: filterPlayers(squad.MID ?? []),
    FWD: filterPlayers(squad.FWD ?? []),
    OTHER: filterPlayers(squad.OTHER ?? []),
  };
}

function countSquadPlayers(
  squad: SquadGroup,
  positionFilter?: keyof SquadGroup | null
): number {
  if (positionFilter) return squad[positionFilter]?.length ?? 0;
  return (
    (squad.GK?.length ?? 0) +
    (squad.DEF?.length ?? 0) +
    (squad.MID?.length ?? 0) +
    (squad.FWD?.length ?? 0) +
    (squad.OTHER?.length ?? 0)
  );
}

function worldCupResultLabel(entry: TeamHistoryStats["world_cup_results"][number]) {
  return entry.finish ?? entry.absence_label ?? "Did not participate";
}

export function TeamDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const returnTo = useBackPath("/teams");
  const focusMatchId = location.hash.startsWith("#wc-match-")
    ? location.hash.slice(1)
    : null;
  const activeTab: TeamTab =
    searchParams.get("tab") === "players" ? "players" : "stats";
  const positionFilter = parsePositionFilter(searchParams.get("position"));
  const searchQuery = searchParams.get("q") || "";
  const yearFilter = parseYearFilter(searchParams.get("year"));
  const resultFilter = searchParams.get("result") || undefined;
  const [team, setTeam] = useState<(Team & { squad: SquadGroup }) | null>(null);
  const [history, setHistory] = useState<TeamHistoryStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateParams = (updates: Record<string, string | undefined>) => {
    updateSearchParams(searchParams, setSearchParams, updates);
  };

  useEffect(() => {
    if (!focusMatchId || !history) return;

    updateParams({ tab: undefined, position: undefined, q: undefined });

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

  const yearOptions = useMemo(() => {
    const years = [...new Set((history?.world_cup_results ?? []).map((entry) => entry.year))].sort(
      (a, b) => b - a
    );
    return [
      { value: "", label: "All years" },
      ...years.map((year) => ({ value: String(year), label: String(year) })),
    ];
  }, [history]);

  const resultOptions = useMemo(() => {
    const labels = new Set<string>();
    for (const entry of history?.world_cup_results ?? []) {
      labels.add(worldCupResultLabel(entry));
    }
    const ordered = RESULT_ORDER.filter((label) => labels.has(label));
    const extras = [...labels]
      .filter((label) => !RESULT_ORDER.includes(label))
      .sort((a, b) => a.localeCompare(b));
    return [
      { value: "", label: "All results" },
      ...[...ordered, ...extras].map((label) => ({ value: label, label })),
    ];
  }, [history]);

  const filterContent = useMemo(
    () =>
      history ? (
        <>
          <FilterSection title="Year" layout="field">
            <FilterSelect
              id="team-detail-year"
              value={yearFilter != null ? String(yearFilter) : ""}
              options={yearOptions}
              onChange={(value) => updateParams({ year: value || undefined })}
            />
          </FilterSection>
          <FilterSection title="Tournament result" layout="field">
            <FilterSelect
              id="team-detail-result"
              value={resultFilter ?? ""}
              options={resultOptions}
              onChange={(value) => updateParams({ result: value || undefined })}
            />
          </FilterSection>
        </>
      ) : null,
    [history, yearFilter, resultFilter, yearOptions, resultOptions, searchParams]
  );

  usePageFilters({
    title: "World Cup Filters",
    content: filterContent,
    activeCount: (yearFilter != null ? 1 : 0) + (resultFilter ? 1 : 0),
  });

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (!team || !history) return <div className="loading">Loading squad…</div>;

  const filteredSquad = filterSquadBySearch(team.squad, searchQuery);
  const squadPlayerCount = countSquadPlayers(filteredSquad, positionFilter);
  const squadYear = yearFilter ?? CURRENT_SQUAD_YEAR;
  const showCurrentSquad = yearFilter == null || yearFilter === CURRENT_SQUAD_YEAR;
  const displaySquadCount = showCurrentSquad ? squadPlayerCount : 0;
  const hasVisiblePlayers = showCurrentSquad && squadPlayerCount > 0;

  return (
    <>
      <Link to={returnTo} className="back-link team-detail-back-link">
        ← Teams
      </Link>
      <div className="hero team-detail-hero">
        <div className="team-detail-hero-header">
          <h1>
            <TeamNameWithFlag
              name={team.name}
              fifaCode={team.fifa_code}
              worldRanking={team.world_ranking}
              variant="hero"
              flagClassName="team-detail-hero-flag"
              nameClassName="team-detail-hero-name"
            />
          </h1>
          <SaveItemButton
            itemType="team"
            itemId={team.id}
            snapshot={{ name: team.name, fifaCode: team.fifa_code }}
          />
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
          onChange={(next) =>
            updateParams({
              tab: next === "stats" ? undefined : next,
              position: next === "stats" ? undefined : positionFilter ?? undefined,
              q: next === "stats" ? undefined : searchQuery || undefined,
            })
          }
        />

        {activeTab === "players" && (
          <>
            <h2 className="team-detail-squad-title">
              {displaySquadCount} {displaySquadCount === 1 ? "Player" : "Players"} in the{" "}
              {squadYear} Squad
            </h2>
            <div className="team-detail-players-toolbar">
            <div
              className="filter-chips team-detail-position-filters"
              role="group"
              aria-label="Filter by position"
            >
              <button
                type="button"
                className={`filter-chip ${!positionFilter ? "active" : ""}`}
                onClick={() => updateParams({ position: undefined })}
              >
                All
              </button>
              {availablePositions.map(({ key, label, chipClass }) => (
                <button
                  key={key}
                  type="button"
                  className={`filter-chip ${chipClass} ${positionFilter === key ? "active" : ""}`}
                  onClick={() =>
                    updateParams({
                      tab: "players",
                      position: key,
                    })
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <SearchInput
              id="team-squad-search"
              value={searchQuery}
              onChange={(value) => updateParams({ q: value.trim() || undefined })}
              placeholder="Search…"
            />
            <FilterToggle />
            </div>
          </>
        )}

        {activeTab === "stats" ? (
          <div className="team-detail-panel" role="tabpanel" aria-label="Team Stats">
            <TeamHistoryPanel
              history={history ?? EMPTY_HISTORY}
              teamId={team.id}
              teamName={team.name}
              focusMatchId={focusMatchId}
              yearFilter={yearFilter}
              resultFilter={resultFilter}
            />
          </div>
        ) : (
          <div className="team-detail-panel" role="tabpanel" aria-label="Players">
            {!showCurrentSquad ? (
              <p className="empty-state">
                Squad data is only available for {CURRENT_SQUAD_YEAR}. Clear the year filter to
                view the current squad.
              </p>
            ) : hasVisiblePlayers ? (
              <SquadList
                squad={filteredSquad}
                positionFilter={positionFilter}
                searchQuery={searchQuery}
              />
            ) : (
              <p className="empty-state">
                {searchQuery.trim()
                  ? `No players match "${searchQuery.trim()}".`
                  : "No players in this position."}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
