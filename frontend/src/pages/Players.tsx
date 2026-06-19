import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownAZ, ArrowDownZA, Flag, Hash, LayoutList } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type HistoryTournament, type Player } from "../api/client";
import {
  FilterMultiSelect,
  FilterPanelFooter,
  FilterSection,
  FilterSelect,
} from "../components/FilterPanel";
import { ActiveFilterBar, type ActiveFilter } from "../components/ActiveFilterBar";
import { PageHeader } from "../components/PageHeader";
import { PageToolbar } from "../components/PageToolbar";
import { SortCycleToggle } from "../components/SortCycleToggle";
import { PlayerRow } from "../components/PlayerRow";
import { TeamNameWithFlag } from "../components/TeamNameWithFlag";
import { SearchInput } from "../components/SearchInput";
import { useFilterPanel, usePageFilters } from "../context/FilterPanelContext";
import { useCompetitionScope } from "../hooks/useCompetitionScope";
import { updateSearchParams } from "../utils/navigation";
import { getTeamWorldRanking } from "../utils/teamWorldRanking";

const CURRENT_YEAR = 2026;

const POSITIONS = [
  { key: "GK", label: "Goalkeepers" },
  { key: "DEF", label: "Defenders" },
  { key: "MID", label: "Midfielders" },
  { key: "FWD", label: "Forwards" },
] as const;

type PlayerSort = "name" | "-name" | "team" | "position" | "jersey";

const DEFAULT_SORT: PlayerSort = "team";

const POSITION_ORDER: Record<string, number> = {
  GK: 0,
  DEF: 1,
  MID: 2,
  FWD: 3,
};

function positionSortKey(position: string | null): number {
  if (!position) return 9;
  const key = position.toUpperCase();
  if (key.startsWith("GK")) return POSITION_ORDER.GK;
  if (key.startsWith("DF") || key.startsWith("DEF")) return POSITION_ORDER.DEF;
  if (key.startsWith("MF") || key.startsWith("MID")) return POSITION_ORDER.MID;
  if (key.startsWith("FW") || key.startsWith("FWD")) return POSITION_ORDER.FWD;
  return 9;
}

function teamSortKey(player: Player): string {
  return player.team_fifa_code?.toUpperCase() || player.team_name || "";
}

function compareTeamsByRanking(
  teamNameA: string,
  playersA: Player[],
  teamNameB: string,
  playersB: Player[]
): number {
  const rankA =
    getTeamWorldRanking(playersA[0]?.team_fifa_code) ?? Number.POSITIVE_INFINITY;
  const rankB =
    getTeamWorldRanking(playersB[0]?.team_fifa_code) ?? Number.POSITIVE_INFINITY;
  return rankA - rankB || teamNameA.localeCompare(teamNameB);
}

function sortPlayers(players: Player[], sort: PlayerSort): Player[] {
  const sorted = [...players];
  switch (sort) {
    case "-name":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "team":
      return sorted.sort(
        (a, b) =>
          compareTeamsByRanking(
            a.team_name || "",
            [a],
            b.team_name || "",
            [b]
          ) ||
          positionSortKey(a.position) - positionSortKey(b.position) ||
          (a.jersey_number ?? 999) - (b.jersey_number ?? 999) ||
          a.name.localeCompare(b.name)
      );
    case "position":
      return sorted.sort(
        (a, b) =>
          positionSortKey(a.position) - positionSortKey(b.position) ||
          (a.team_name || "").localeCompare(b.team_name || "") ||
          a.name.localeCompare(b.name)
      );
    case "jersey":
      return sorted.sort(
        (a, b) =>
          (a.jersey_number ?? 999) - (b.jersey_number ?? 999) ||
          (a.team_name || "").localeCompare(b.team_name || "") ||
          a.name.localeCompare(b.name)
      );
    default:
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
}

function groupPlayersByTeam(players: Player[]): {
  team: string;
  fifaCode: string | null;
  worldRanking: number | null;
  players: Player[];
}[] {
  const grouped = new Map<string, Player[]>();
  for (const player of players) {
    const key = player.team_name || "Unknown";
    const existing = grouped.get(key) ?? [];
    existing.push(player);
    grouped.set(key, existing);
  }

  return [...grouped.entries()]
    .sort(([teamA, playersA], [teamB, playersB]) =>
      compareTeamsByRanking(teamA, playersA, teamB, playersB)
    )
    .map(([team, teamPlayers]) => ({
      team,
      fifaCode: teamPlayers[0]?.team_fifa_code ?? null,
      worldRanking: getTeamWorldRanking(teamPlayers[0]?.team_fifa_code),
      players: teamPlayers.sort(
        (a, b) =>
          positionSortKey(a.position) - positionSortKey(b.position) ||
          (a.jersey_number ?? 999) - (b.jersey_number ?? 999) ||
          a.name.localeCompare(b.name)
      ),
    }));
}

function buildTeamFilterOptions(players: Player[]) {
  const teams = new Map<string, { name: string; fifaCode: string | null }>();
  for (const player of players) {
    const key = teamSortKey(player);
    if (!key || teams.has(key)) continue;
    teams.set(key, {
      name: player.team_name || key,
      fifaCode: player.team_fifa_code,
    });
  }

  const sorted = [...teams.entries()].sort(([, a], [, b]) => {
    const rankA = getTeamWorldRanking(a.fifaCode) ?? Number.POSITIVE_INFINITY;
    const rankB = getTeamWorldRanking(b.fifaCode) ?? Number.POSITIVE_INFINITY;
    return rankA - rankB || a.name.localeCompare(b.name);
  });

  return [
    { value: "", label: "All teams" },
    ...sorted.map(([value, { name, fifaCode }]) => {
      const rank = getTeamWorldRanking(fifaCode);
      return {
        value,
        label: rank != null ? `${name} (#${rank})` : name,
      };
    }),
  ];
}

function matchesPlayerSearch(value: string | null | undefined, query: string) {
  return (value ?? "").toLowerCase().includes(query);
}

function playerPositionKey(position: string | null): string | null {
  if (!position) return null;
  const key = position.toUpperCase();
  if (key.startsWith("GK")) return "GK";
  if (key.startsWith("DF") || key.startsWith("DEF")) return "DEF";
  if (key.startsWith("MF") || key.startsWith("MID")) return "MID";
  if (key.startsWith("FW") || key.startsWith("FWD")) return "FWD";
  return null;
}

const POSITION_KEYS = new Set(POSITIONS.map(({ key }) => key));

function parsePositions(param: string | null | undefined): string[] {
  if (!param) return [];
  return param
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter((value) => POSITION_KEYS.has(value as (typeof POSITIONS)[number]["key"]));
}

function formatYearLabel(year: number, playerCountsByYear: Record<string, number>) {
  const count = playerCountsByYear[String(year)] ?? 0;
  return `${year} (${count} players)`;
}

type PlayersProps = {
  embedded?: boolean;
};

export function Players({ embedded = false }: PlayersProps = {}) {
  const {
    competition,
    supportsHistory,
    competitionApiSlug,
  } = useCompetitionScope(embedded ? undefined : "players");
  const [searchParams, setSearchParams] = useSearchParams();
  const { isOpen, activePanel, close } = useFilterPanel();
  const yearParam = searchParams.get("year");
  const year = supportsHistory ? Number(yearParam ?? CURRENT_YEAR) : CURRENT_YEAR;
  const isCurrentTournament = !supportsHistory || year === CURRENT_YEAR;
  const positionParam = searchParams.get("position");
  const selectedPositions = useMemo(() => parsePositions(positionParam), [positionParam]);
  const teamParam = searchParams.get("team") || "";
  const sortParam = searchParams.get("sort") as PlayerSort | null;
  const sort: PlayerSort =
    !isCurrentTournament && sortParam === "jersey"
      ? DEFAULT_SORT
      : sortParam || DEFAULT_SORT;
  const searchQuery = searchParams.get("q") || "";

  const [players, setPlayers] = useState<Player[]>([]);
  const [tournaments, setTournaments] = useState<HistoryTournament[]>([]);
  const [playerCountsByYear, setPlayerCountsByYear] = useState<Record<string, number>>({});
  const [draftYear, setDraftYear] = useState(year);
  const [draftPositions, setDraftPositions] = useState<string[]>(selectedPositions);
  const [draftTeam, setDraftTeam] = useState(teamParam);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (supportsHistory) {
      api
        .getHistoryTournaments()
        .then((res) => setTournaments(res.tournaments))
        .catch(() => setTournaments([]));
    }
    api
      .getStats(competitionApiSlug)
      .then((stats) => {
        setPlayerCountsByYear(stats.player_counts_by_year ?? {});
      })
      .catch(() => {});
  }, [competitionApiSlug, supportsHistory]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    let changed = false;
    if (supportsHistory && !next.get("year")) {
      next.set("year", String(CURRENT_YEAR));
      changed = true;
    }
    if (!next.get("sort")) {
      next.set("sort", DEFAULT_SORT);
      changed = true;
    }
    if (changed) {
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, supportsHistory]);

  useEffect(() => {
    if (isOpen && activePanel === "filter") {
      setDraftYear(year);
      setDraftPositions(parsePositions(positionParam));
      setDraftTeam(teamParam);
    }
  }, [isOpen, activePanel, year, positionParam, teamParam]);

  useEffect(() => {
    setLoading(true);
    api
      .getPlayers({
        year: supportsHistory ? year : undefined,
        competition: competitionApiSlug,
      })
      .then((res) => setPlayers(res.players))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [year, competitionApiSlug, supportsHistory]);

  const yearOptions = useMemo(
    () => [
      {
        value: String(CURRENT_YEAR),
        label: formatYearLabel(CURRENT_YEAR, playerCountsByYear),
      },
      ...[...tournaments].reverse().map((t) => ({
        value: String(t.year),
        label: formatYearLabel(t.year, playerCountsByYear),
      })),
    ],
    [tournaments, playerCountsByYear]
  );

  const draftIsCurrentTournament = draftYear === CURRENT_YEAR;

  const sortOptions = useMemo(() => {
    const options: {
      value: PlayerSort;
      label: string;
      icon: typeof ArrowDownAZ;
    }[] = [
      { value: "name", label: "Name A–Z", icon: ArrowDownAZ },
      { value: "-name", label: "Name Z–A", icon: ArrowDownZA },
      { value: "team", label: "Team", icon: Flag },
      { value: "position", label: "Position", icon: LayoutList },
    ];
    if (isCurrentTournament) {
      options.push({ value: "jersey", label: "Jersey number", icon: Hash });
    }
    return options;
  }, [isCurrentTournament]);

  const teamFilterOptions = useMemo(() => buildTeamFilterOptions(players), [players]);

  const draftTeamFilterOptions = useMemo(
    () => (draftYear === year ? teamFilterOptions : [{ value: "", label: "All teams" }]),
    [draftYear, year, teamFilterOptions]
  );

  const selectedTeamLabel = useMemo(
    () => teamFilterOptions.find((option) => option.value === teamParam)?.label ?? teamParam,
    [teamFilterOptions, teamParam]
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredPlayers = useMemo(() => {
    let filtered = players;

    if (teamParam) {
      filtered = filtered.filter((player) => teamSortKey(player) === teamParam);
    }

    if (selectedPositions.length > 0) {
      filtered = filtered.filter((player) => {
        const positionKey = playerPositionKey(player.position);
        return positionKey != null && selectedPositions.includes(positionKey);
      });
    }

    if (normalizedSearch) {
      filtered = filtered.filter(
        (player) =>
          matchesPlayerSearch(player.name, normalizedSearch) ||
          matchesPlayerSearch(player.team_name, normalizedSearch) ||
          matchesPlayerSearch(player.club, normalizedSearch) ||
          matchesPlayerSearch(player.position, normalizedSearch) ||
          String(player.jersey_number ?? "").includes(normalizedSearch)
      );
    }

    return sortPlayers(filtered, sort);
  }, [players, teamParam, selectedPositions, normalizedSearch, sort]);

  const groupedPlayers = useMemo(
    () => (sort === "team" ? groupPlayersByTeam(filteredPlayers) : null),
    [filteredPlayers, sort]
  );

  const displayedCount = filteredPlayers.length;

  const updateParams = (updates: Record<string, string | undefined>) => {
    updateSearchParams(searchParams, setSearchParams, updates);
  };

  const activeCount =
    (searchQuery ? 1 : 0) +
    (year !== CURRENT_YEAR ? 1 : 0) +
    (teamParam ? 1 : 0) +
    (isCurrentTournament && selectedPositions.length > 0 ? selectedPositions.length : 0);

  const hasClearableFilters =
    year !== CURRENT_YEAR ||
    Boolean(teamParam) ||
    selectedPositions.length > 0 ||
    Boolean(searchQuery.trim());

  const clearAllFilters = useCallback(() => {
    setDraftYear(CURRENT_YEAR);
    setDraftPositions([]);
    setDraftTeam("");
    updateParams({
      year: String(CURRENT_YEAR),
      team: undefined,
      position: undefined,
      q: undefined,
      sort: sortParam === "jersey" ? "jersey" : DEFAULT_SORT,
    });
  }, [sortParam, searchParams, setSearchParams]);

  const activeFilters = useMemo((): ActiveFilter[] => {
    const filters: ActiveFilter[] = [];

    if (supportsHistory) {
      filters.push({
        key: "year",
        label: String(year),
        onRemove: () => {
          setDraftYear(CURRENT_YEAR);
          setDraftPositions([]);
          setDraftTeam("");
          updateParams({
            year: String(CURRENT_YEAR),
            team: undefined,
            position: undefined,
            sort: sortParam === "jersey" ? "jersey" : DEFAULT_SORT,
          });
        },
      });
    }

    if (teamParam) {
      filters.push({
        key: "team",
        label: selectedTeamLabel,
        onRemove: () => {
          setDraftTeam("");
          updateParams({ team: undefined });
        },
      });
    }

    if (isCurrentTournament) {
      for (const positionKey of selectedPositions) {
        const positionLabel =
          POSITIONS.find(({ key }) => key === positionKey)?.label ?? positionKey;
        filters.push({
          key: `position-${positionKey}`,
          label: positionLabel,
          onRemove: () =>
            updateParams({
              position: selectedPositions.filter((value) => value !== positionKey).join(",") ||
                undefined,
            }),
        });
      }
    }

    if (searchQuery.trim()) {
      filters.push({
        key: "search",
        label: `Search: ${searchQuery.trim()}`,
        onRemove: () => updateParams({ q: undefined }),
      });
    }

    return filters;
  }, [
    year,
    teamParam,
    selectedTeamLabel,
    isCurrentTournament,
    selectedPositions,
    searchQuery,
    sortParam,
    searchParams,
    supportsHistory,
  ]);

  const handleApplyFilters = useCallback(() => {
    const nextIsCurrent = draftYear === CURRENT_YEAR;
    updateParams({
      year: String(draftYear),
      team: draftTeam || undefined,
      position:
        nextIsCurrent && draftPositions.length > 0 ? draftPositions.join(",") : undefined,
      sort:
        !nextIsCurrent && sortParam === "jersey"
          ? DEFAULT_SORT
          : sortParam || DEFAULT_SORT,
    });
    close();
  }, [draftYear, draftTeam, draftPositions, sortParam, close, searchParams, setSearchParams]);

  const handleClearFilters = useCallback(() => {
    setDraftYear(CURRENT_YEAR);
    setDraftPositions([]);
    setDraftTeam("");
    updateParams({
      year: String(CURRENT_YEAR),
      team: undefined,
      position: undefined,
      sort: sortParam === "jersey" ? "jersey" : DEFAULT_SORT,
    });
    close();
  }, [sortParam, close, searchParams, setSearchParams]);

  const filterContent = useMemo(
    () => (
      <>
        <div className="filter-panel-body-scroll">
          {supportsHistory ? (
            <FilterSection title="Year" layout="field">
              <FilterSelect
                id="players-year"
                value={String(draftYear)}
              options={yearOptions}
              onChange={(value) => {
                const selectedYear = Number(value);
                setDraftYear(selectedYear);
                if (selectedYear !== CURRENT_YEAR) {
                  setDraftPositions([]);
                }
                if (selectedYear !== year) {
                  setDraftTeam("");
                }
              }}
            />
          </FilterSection>
          ) : null}
          <FilterSection title="Team" layout="field">
            <FilterSelect
              id="players-team"
              value={draftYear === year ? draftTeam : ""}
              options={draftTeamFilterOptions}
              onChange={setDraftTeam}
            />
          </FilterSection>
          {draftIsCurrentTournament ? (
            <FilterSection title="Position" layout="field">
              <FilterMultiSelect
                id="players-position"
                values={draftPositions}
                options={POSITIONS.map(({ key, label }) => ({ value: key, label }))}
                placeholder="All positions"
                onChange={setDraftPositions}
              />
            </FilterSection>
          ) : null}
        </div>
        <FilterPanelFooter onClear={handleClearFilters} onApply={handleApplyFilters} />
      </>
    ),
    [
      yearOptions,
      draftYear,
      year,
      draftTeam,
      draftTeamFilterOptions,
      draftPositions,
      draftIsCurrentTournament,
      handleApplyFilters,
      handleClearFilters,
      supportsHistory,
    ]
  );

  usePageFilters({
    title: "Player Filters",
    content: filterContent,
    activeCount,
  });

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (loading) return <div className="loading">Loading players…</div>;

  return (
    <>
      {!embedded ? (
        <PageHeader
          title="Players"
        toolbar={
          <PageToolbar
            search={
              <SearchInput
                id="players-search"
                value={searchQuery}
                onChange={(value) => updateParams({ q: value.trim() || undefined })}
                placeholder="Search…"
              />
            }
            actions={
              <SortCycleToggle
                value={sort}
                options={sortOptions}
                defaultValue={DEFAULT_SORT}
                onChange={(next) => updateParams({ sort: next })}
              />
            }
          />
        }
        subtitle={
          normalizedSearch
            ? `${displayedCount} players found in ${competition?.season_label ?? year}`
            : `${displayedCount} players in ${competition?.season_label ?? year}`
        }
      />
      ) : null}

      <ActiveFilterBar
        filters={activeFilters}
        onClearAll={clearAllFilters}
        showClearAll={hasClearableFilters}
      />

      {players.length === 0 ? (
        <p className="empty-state">No squad data available for {year}.</p>
      ) : displayedCount === 0 ? (
        <p className="empty-state">No players match "{searchQuery.trim()}".</p>
      ) : (
        (() => {
          let adCounter = 0;

          if (groupedPlayers) {
            return groupedPlayers.map((section) => (
              <section key={section.team} className="team-group-panel">
                <h2 className="team-group-heading">
                  <TeamNameWithFlag
                    name={section.team}
                    fifaCode={section.fifaCode}
                    worldRanking={section.worldRanking}
                    inlineWorldRanking
                    flagClassName="team-group-heading-flag"
                  />
                  <span className="team-group-count">
                    {section.players.length} Players
                  </span>
                </h2>
                <div className="player-list">
                  {section.players.map((player) => {
                    adCounter += 1;
                    return (
                      <div key={player.id}>
                        <PlayerRow player={player} showNationalTeam={false} />
                        {adCounter % 12 === 0 && <AdBanner />}
                      </div>
                    );
                  })}
                </div>
              </section>
            ));
          }

          return (
            <div className="player-list">
              {filteredPlayers.map((player) => {
                adCounter += 1;
                return (
                  <div key={player.id}>
                    <PlayerRow player={player} />
                    {adCounter % 12 === 0 && <AdBanner />}
                  </div>
                );
              })}
            </div>
          );
        })()
      )}
    </>
  );
}
