import { useEffect, useMemo, useState } from "react";
import { ArrowDownAZ, ArrowDownZA, Layers, Trophy } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import {
  api,
  type HistoryTeam,
  type HistoryTournament,
  type Team,
} from "../api/client";
import { HistoryTeamCard } from "../components/HistoryTeamCard";
import { HistoryTeamRow } from "../components/HistoryTeamRow";
import { TeamCard } from "../components/TeamCard";
import { TeamRow } from "../components/TeamRow";
import { SortCycleToggle } from "../components/SortCycleToggle";
import { ViewModeToggle, type ViewMode } from "../components/ViewModeToggle";
import { FilterSection, FilterSelect } from "../components/FilterPanel";
import { ActiveFilterBar, type ActiveFilter } from "../components/ActiveFilterBar";
import { PageHeader } from "../components/PageHeader";
import { PageToolbar } from "../components/PageToolbar";
import { SearchInput } from "../components/SearchInput";
import { usePageFilters } from "../context/FilterPanelContext";
import { useProfilePreferences } from "../hooks/useProfilePreferences";
import { useCompetitionScope } from "../hooks/useCompetitionScope";
import { updateSearchParams } from "../utils/navigation";

const CURRENT_YEAR = 2026;
const DEFAULT_HISTORY_SORT: TeamSort = "name";

type TeamSort = "name" | "-name" | "group" | "ranking";

const TEAM_SORT_OPTIONS: {
  value: TeamSort;
  label: string;
  icon: typeof ArrowDownAZ;
}[] = [
  { value: "name", label: "Name A–Z", icon: ArrowDownAZ },
  { value: "-name", label: "Name Z–A", icon: ArrowDownZA },
  { value: "group", label: "Group", icon: Layers },
  { value: "ranking", label: "World ranking", icon: Trophy },
];

function sortCurrentTeams(teams: Team[], sort: TeamSort): Team[] {
  const sorted = [...teams];
  switch (sort) {
    case "-name":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "group":
      return sorted.sort(
        (a, b) =>
          (a.group || "").localeCompare(b.group || "") || a.name.localeCompare(b.name)
      );
    case "ranking":
      return sorted.sort((a, b) => {
        const rankA = a.world_ranking ?? Number.POSITIVE_INFINITY;
        const rankB = b.world_ranking ?? Number.POSITIVE_INFINITY;
        return rankA - rankB || a.name.localeCompare(b.name);
      });
    default:
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
}

function groupTeamsByGroup<T extends { group: string | null; name: string }>(
  teams: T[]
): { group: string; teams: T[] }[] {
  const grouped = new Map<string, T[]>();
  for (const team of teams) {
    const key = team.group || "Other";
    const existing = grouped.get(key) ?? [];
    existing.push(team);
    grouped.set(key, existing);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([groupName, groupTeams]) => ({
      group: groupName,
      teams: groupTeams.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

function matchesTeamSearch(value: string | null | undefined, query: string) {
  return (value ?? "").toLowerCase().includes(query);
}

function sortHistoryTeams(teams: HistoryTeam[], sort: TeamSort): HistoryTeam[] {
  const sorted = [...teams];
  switch (sort) {
    case "-name":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "group":
      return sorted.sort(
        (a, b) =>
          (a.group || "").localeCompare(b.group || "") || a.name.localeCompare(b.name)
      );
    default:
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
}

function parseTeamSort(
  sortParam: string | null,
  isCurrentTournament: boolean,
  defaultCurrentSort: TeamSort,
): TeamSort {
  if (sortParam === "-name" || sortParam === "group") return sortParam;
  if (sortParam === "ranking") return isCurrentTournament ? "ranking" : DEFAULT_HISTORY_SORT;
  if (sortParam === "name") return "name";
  return isCurrentTournament ? defaultCurrentSort : DEFAULT_HISTORY_SORT;
}

type TeamsProps = {
  embedded?: boolean;
};

export function Teams({ embedded = false }: TeamsProps = {}) {
  const {
    competition,
    supportsHistory,
    competitionApiSlug,
    defaultTeamSort,
  } = useCompetitionScope(embedded ? undefined : "teams");
  const [searchParams, setSearchParams] = useSearchParams();
  const yearParam = searchParams.get("year");
  const year = supportsHistory ? Number(yearParam ?? CURRENT_YEAR) : CURRENT_YEAR;
  const isCurrentTournament = !supportsHistory || year === CURRENT_YEAR;
  const group = searchParams.get("group") || undefined;
  const confederation = searchParams.get("confederation") || undefined;
  const sortParam = searchParams.get("sort");
  const sort = parseTeamSort(sortParam, isCurrentTournament, defaultTeamSort);
  const defaultSort = isCurrentTournament ? defaultTeamSort : DEFAULT_HISTORY_SORT;
  const { preferences } = useProfilePreferences();
  const viewParam = searchParams.get("view");
  const viewMode: ViewMode =
    viewParam === "list" ? "list" : viewParam === "grid" ? "grid" : preferences.defaultViewMode;
  const searchQuery = searchParams.get("q") || "";

  const [teams, setTeams] = useState<Team[]>([]);
  const [historyTeams, setHistoryTeams] = useState<HistoryTeam[]>([]);
  const [tournaments, setTournaments] = useState<HistoryTournament[]>([]);
  const [currentTeamCount, setCurrentTeamCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    let changed = false;

    if (supportsHistory && !next.get("year")) {
      next.set("year", String(CURRENT_YEAR));
      changed = true;
    }

    const resolvedYear = supportsHistory ? Number(next.get("year") ?? CURRENT_YEAR) : CURRENT_YEAR;
    if (resolvedYear === CURRENT_YEAR && !next.get("sort")) {
      next.set("sort", defaultTeamSort);
      changed = true;
    }

    if (changed) {
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, supportsHistory, defaultTeamSort]);

  useEffect(() => {
    setLoading(true);
    if (isCurrentTournament) {
      Promise.all([
        api.getTeams(group, competitionApiSlug),
        api.getStats(competitionApiSlug),
        supportsHistory ? api.getHistoryTournaments() : Promise.resolve({ tournaments: [] }),
      ])
        .then(([teamsRes, stats, tournamentsRes]) => {
          setTeams(teamsRes.teams);
          setHistoryTeams([]);
          setCurrentTeamCount(stats.team_count);
          setTournaments(tournamentsRes.tournaments);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    } else {
      Promise.all([api.getHistoryTeams(year), api.getHistoryTournaments(), api.getStats()])
        .then(([teamsRes, tournamentsRes, stats]) => {
          setTeams([]);
          setHistoryTeams(teamsRes.teams);
          setCurrentTeamCount(stats.team_count);
          setTournaments(tournamentsRes.tournaments);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [year, group, isCurrentTournament, competitionApiSlug, supportsHistory]);

  const confederations = useMemo(
    () => [...new Set(teams.map((t) => t.confederation).filter(Boolean))].sort(),
    [teams]
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredTeams = useMemo(() => {
    let filtered = confederation
      ? teams.filter((t) => t.confederation === confederation)
      : teams;

    if (normalizedSearch) {
      filtered = filtered.filter(
        (team) =>
          matchesTeamSearch(team.name, normalizedSearch) ||
          matchesTeamSearch(team.fifa_code, normalizedSearch) ||
          matchesTeamSearch(team.group, normalizedSearch) ||
          matchesTeamSearch(team.confederation, normalizedSearch)
      );
    }

    return sortCurrentTeams(filtered, sort);
  }, [teams, confederation, sort, normalizedSearch]);

  const filteredHistoryTeams = useMemo(() => {
    let filtered = group ? historyTeams.filter((t) => t.group === group) : historyTeams;

    if (normalizedSearch) {
      filtered = filtered.filter(
        (team) =>
          matchesTeamSearch(team.name, normalizedSearch) ||
          matchesTeamSearch(team.group, normalizedSearch)
      );
    }

    return sortHistoryTeams(filtered, sort);
  }, [historyTeams, group, sort, normalizedSearch]);

  const yearOptions = useMemo(
    () => [
      { value: String(CURRENT_YEAR), label: `${CURRENT_YEAR} (${currentTeamCount} teams)` },
      ...[...tournaments].reverse().map((t) => ({
        value: String(t.year),
        label: `${t.year} (${t.match_count} matches)`,
      })),
    ],
    [tournaments, currentTeamCount]
  );

  const displayedCount = isCurrentTournament
    ? filteredTeams.length
    : filteredHistoryTeams.length;

  const groupedCurrentTeams = useMemo(
    () => (sort === "group" ? groupTeamsByGroup(filteredTeams) : null),
    [filteredTeams, sort]
  );

  const groupedHistoryTeams = useMemo(
    () => (sort === "group" ? groupTeamsByGroup(filteredHistoryTeams) : null),
    [filteredHistoryTeams, sort]
  );

  const sortOptions = useMemo(
    () =>
      isCurrentTournament
        ? TEAM_SORT_OPTIONS.filter(
            (option) => option.value !== "ranking" || defaultTeamSort === "ranking"
          )
        : TEAM_SORT_OPTIONS.filter((option) => option.value !== "ranking"),
    [isCurrentTournament, defaultTeamSort]
  );

  const seasonLabel = competition?.season_label ?? String(year);
  const teamNoun = supportsHistory ? "nations" : "clubs";

  const activeCount =
    (supportsHistory && year !== CURRENT_YEAR ? 1 : 0) +
    (isCurrentTournament && confederation ? 1 : 0) +
    (searchQuery ? 1 : 0);

  const hasClearableFilters =
    (supportsHistory && year !== CURRENT_YEAR) ||
    (isCurrentTournament && confederation != null) ||
    searchQuery.trim().length > 0;

  const updateParams = (updates: Record<string, string | undefined>) => {
    updateSearchParams(searchParams, setSearchParams, updates);
  };

  const clearAllFilters = () => {
    updateParams({
      year: supportsHistory ? String(CURRENT_YEAR) : undefined,
      sort: defaultTeamSort,
      confederation: undefined,
      q: undefined,
    });
  };

  const activeFilters = useMemo((): ActiveFilter[] => {
    const filters: ActiveFilter[] = [];

    if (supportsHistory) {
      filters.push({
        key: "year",
        label: String(year),
        onRemove: () => {
          updateParams({
            year: String(CURRENT_YEAR),
            confederation: undefined,
          });
        },
      });
    }

    if (isCurrentTournament && confederation) {
      filters.push({
        key: "confederation",
        label: confederation,
        onRemove: () => updateParams({ confederation: undefined }),
      });
    }

    if (searchQuery.trim()) {
      filters.push({
        key: "search",
        label: `Search: ${searchQuery.trim()}`,
        onRemove: () => updateParams({ q: undefined }),
      });
    }

    return filters;
  }, [year, isCurrentTournament, confederation, searchQuery, searchParams, supportsHistory]);

  const filterContent = useMemo(
    () => (
      <>
        {supportsHistory ? (
          <FilterSection title="Year" layout="field">
            <FilterSelect
              id="teams-year"
              value={String(year)}
              options={yearOptions}
              onChange={(value) => {
                const selectedYear = Number(value);
                updateParams({
                  year: value,
                  group: undefined,
                  confederation: undefined,
                  sort:
                    selectedYear === CURRENT_YEAR
                      ? sortParam && sortParam !== defaultTeamSort
                        ? sortParam
                        : defaultTeamSort
                      : sortParam === "-name" || sortParam === "group" || sortParam === "name"
                        ? sortParam
                        : undefined,
                });
              }}
            />
          </FilterSection>
        ) : null}
        {isCurrentTournament && supportsHistory && confederations.length > 0 && (
          <FilterSection title="Confederation" layout="field">
            <FilterSelect
              id="teams-confederation"
              value={confederation ?? ""}
              options={[
                { value: "", label: "All confederations" },
                ...confederations.map((c) => ({ value: c, label: c })),
              ]}
              onChange={(value) => updateParams({ confederation: value || undefined })}
            />
          </FilterSection>
        )}
        {activeCount > 0 && (
          <button
            type="button"
            className="btn-secondary active-filter-panel-clear"
            onClick={clearAllFilters}
          >
            Clear all filters
          </button>
        )}
      </>
    ),
    [
      year,
      isCurrentTournament,
      confederation,
      confederations,
      yearOptions,
      sortParam,
      activeCount,
      searchParams,
      supportsHistory,
      defaultTeamSort,
    ]
  );

  usePageFilters({
    title: "Team Filters",
    content: filterContent,
    activeCount,
  });

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (loading) return <div className="loading">Loading teams…</div>;

  return (
    <>
      {!embedded ? (
        <PageHeader
          title={competition?.name ? `${competition.name} teams` : "Teams"}
          toolbar={
            <PageToolbar
              search={
                <SearchInput
                  id="teams-search"
                  value={searchQuery}
                  onChange={(value) => updateParams({ q: value.trim() || undefined })}
                  placeholder="Search…"
                />
              }
              actions={
                <>
                  <SortCycleToggle
                    value={sort}
                    options={sortOptions}
                    defaultValue={defaultSort}
                    onChange={(next) =>
                      updateParams({ sort: next === defaultSort ? undefined : next })
                    }
                  />
                  <ViewModeToggle
                    value={viewMode}
                    onToggle={() => {
                      const next = viewMode === "grid" ? "list" : "grid";
                      updateParams({ view: next === "grid" ? undefined : next });
                    }}
                  />
                </>
              }
            />
          }
          subtitle={
            normalizedSearch
              ? `${displayedCount} teams found in ${seasonLabel}`
              : `${displayedCount} ${teamNoun} in ${seasonLabel}`
          }
        />
      ) : (
        <PageToolbar
          search={
            <SearchInput
              id="teams-search"
              value={searchQuery}
              onChange={(value) => updateParams({ q: value.trim() || undefined })}
              placeholder="Search…"
            />
          }
          actions={
            <>
              <SortCycleToggle
                value={sort}
                options={sortOptions}
                defaultValue={defaultSort}
                onChange={(next) =>
                  updateParams({ sort: next === defaultSort ? undefined : next })
                }
              />
              <ViewModeToggle
                value={viewMode}
                onToggle={() => {
                  const next = viewMode === "grid" ? "list" : "grid";
                  updateParams({ view: next === "grid" ? undefined : next });
                }}
              />
            </>
          }
        />
      )}

      <ActiveFilterBar
        filters={activeFilters}
        onClearAll={clearAllFilters}
        showClearAll={hasClearableFilters}
      />

      {displayedCount === 0 ? (
        <p className="empty-state">
          {normalizedSearch ? `No teams match "${searchQuery.trim()}".` : "No teams found."}
        </p>
      ) : (
      (() => {
        let adCounter = 0;
        const containerClass = viewMode === "list" ? "team-list" : "team-grid";

        const renderCurrentTeam = (team: Team) => {
          adCounter += 1;
          return (
            <div key={team.id}>
              {viewMode === "list" ? <TeamRow team={team} /> : <TeamCard team={team} />}
              {adCounter % 8 === 0 && <AdBanner />}
            </div>
          );
        };

        const renderHistoryTeam = (team: HistoryTeam) => {
          adCounter += 1;
          return (
            <div key={team.name}>
              {viewMode === "list" ? (
                <HistoryTeamRow team={team} />
              ) : (
                <HistoryTeamCard team={team} />
              )}
              {adCounter % 8 === 0 && <AdBanner />}
            </div>
          );
        };

        if (isCurrentTournament) {
          if (groupedCurrentTeams) {
            return groupedCurrentTeams.map((section) => (
              <section key={section.group} className="team-group-panel">
                <h2 className="team-group-heading">
                  {section.group}
                  <span className="team-group-count">{section.teams.length}</span>
                </h2>
                <div className={containerClass}>
                  {section.teams.map(renderCurrentTeam)}
                </div>
              </section>
            ));
          }

          return (
            <div className={containerClass}>
              {filteredTeams.map(renderCurrentTeam)}
            </div>
          );
        }

        if (groupedHistoryTeams) {
          return groupedHistoryTeams.map((section) => (
            <section key={section.group} className="team-group-panel">
              <h2 className="team-group-heading">
                {section.group}
                <span className="team-group-count">{section.teams.length}</span>
              </h2>
              <div className={containerClass}>
                {section.teams.map(renderHistoryTeam)}
              </div>
            </section>
          ));
        }

        return (
          <div className={containerClass}>
            {filteredHistoryTeams.map(renderHistoryTeam)}
          </div>
        );
      })()
      )}
    </>
  );
}
