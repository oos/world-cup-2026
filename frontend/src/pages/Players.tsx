import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownAZ, ArrowDownZA, Flag, Hash, LayoutList } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type HistoryTournament, type Player } from "../api/client";
import {
  FilterCheckboxOption,
  FilterOption,
  FilterPanelFooter,
  FilterSection,
} from "../components/FilterPanel";
import { PageHeader } from "../components/PageHeader";
import { PageToolbar } from "../components/PageToolbar";
import { SortCycleToggle } from "../components/SortCycleToggle";
import { PlayerRow } from "../components/PlayerRow";
import { TeamNameWithFlag } from "../components/TeamNameWithFlag";
import { SearchInput } from "../components/SearchInput";
import { useFilterPanel, usePageFilters } from "../context/FilterPanelContext";
import { updateSearchParams } from "../utils/navigation";

const CURRENT_YEAR = 2026;

const POSITIONS = [
  { key: "GK", label: "Goalkeepers" },
  { key: "DEF", label: "Defenders" },
  { key: "MID", label: "Midfielders" },
  { key: "FWD", label: "Forwards" },
] as const;

type PlayerSort = "name" | "-name" | "team" | "position" | "jersey";

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

function sortPlayers(players: Player[], sort: PlayerSort): Player[] {
  const sorted = [...players];
  switch (sort) {
    case "-name":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "team":
      return sorted.sort(
        (a, b) =>
          (a.team_name || "").localeCompare(b.team_name || "") ||
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

function groupPlayersByTeam(players: Player[]): { team: string; players: Player[] }[] {
  const grouped = new Map<string, Player[]>();
  for (const player of players) {
    const key = player.team_name || "Unknown";
    const existing = grouped.get(key) ?? [];
    existing.push(player);
    grouped.set(key, existing);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([team, teamPlayers]) => ({
      team,
      players: teamPlayers.sort(
        (a, b) =>
          positionSortKey(a.position) - positionSortKey(b.position) ||
          (a.jersey_number ?? 999) - (b.jersey_number ?? 999) ||
          a.name.localeCompare(b.name)
      ),
    }));
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

export function Players() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isOpen, activePanel, close } = useFilterPanel();
  const yearParam = searchParams.get("year");
  const year = yearParam ? Number(yearParam) : CURRENT_YEAR;
  const isCurrentTournament = year === CURRENT_YEAR;
  const positionParam = searchParams.get("position");
  const selectedPositions = useMemo(() => parsePositions(positionParam), [positionParam]);
  const sortParam = searchParams.get("sort") as PlayerSort | null;
  const sort: PlayerSort =
    !isCurrentTournament && sortParam === "jersey" ? "name" : sortParam || "name";
  const searchQuery = searchParams.get("q") || "";

  const [players, setPlayers] = useState<Player[]>([]);
  const [tournaments, setTournaments] = useState<HistoryTournament[]>([]);
  const [playerCountsByYear, setPlayerCountsByYear] = useState<Record<string, number>>({});
  const [draftYear, setDraftYear] = useState(year);
  const [draftPositions, setDraftPositions] = useState<string[]>(selectedPositions);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getHistoryTournaments()
      .then((res) => setTournaments(res.tournaments))
      .catch(() => setTournaments([]));
    api
      .getStats()
      .then((stats) => {
        setPlayerCountsByYear(stats.player_counts_by_year ?? {});
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isOpen && activePanel === "filter") {
      setDraftYear(year);
      setDraftPositions(parsePositions(positionParam));
    }
  }, [isOpen, activePanel, year, positionParam]);

  useEffect(() => {
    setLoading(true);
    api
      .getPlayers({ year })
      .then((res) => setPlayers(res.players))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [year]);

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

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredPlayers = useMemo(() => {
    let filtered = players;

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
  }, [players, selectedPositions, normalizedSearch, sort]);

  const groupedPlayers = useMemo(
    () => (sort === "team" ? groupPlayersByTeam(filteredPlayers) : null),
    [filteredPlayers, sort]
  );

  const displayedCount = filteredPlayers.length;

  const activeCount =
    (searchQuery ? 1 : 0) +
    (yearParam ? 1 : 0) +
    (isCurrentTournament && selectedPositions.length > 0 ? 1 : 0);

  const updateParams = (updates: Record<string, string | undefined>) => {
    updateSearchParams(searchParams, setSearchParams, updates);
  };

  const handleApplyFilters = useCallback(() => {
    const nextIsCurrent = draftYear === CURRENT_YEAR;
    updateParams({
      year: draftYear === CURRENT_YEAR ? undefined : String(draftYear),
      position:
        nextIsCurrent && draftPositions.length > 0 ? draftPositions.join(",") : undefined,
      sort:
        !nextIsCurrent && sortParam === "jersey" ? undefined : sortParam || undefined,
    });
    close();
  }, [draftYear, draftPositions, sortParam, close, searchParams, setSearchParams]);

  const handleClearFilters = useCallback(() => {
    setDraftYear(CURRENT_YEAR);
    setDraftPositions([]);
    updateParams({
      year: undefined,
      position: undefined,
      sort: sortParam === "jersey" ? sortParam : undefined,
    });
    close();
  }, [sortParam, close, searchParams, setSearchParams]);

  const toggleDraftPosition = useCallback((positionKey: string, checked: boolean) => {
    setDraftPositions((current) =>
      checked
        ? [...current, positionKey]
        : current.filter((value) => value !== positionKey)
    );
  }, []);

  const filterContent = useMemo(
    () => (
      <>
        <div className="filter-panel-body-scroll">
          <FilterSection title="Year">
            {yearOptions.map((option) => (
              <FilterOption
                key={option.value}
                label={option.label}
                active={String(draftYear) === option.value}
                onClick={() => {
                  const selectedYear = Number(option.value);
                  setDraftYear(selectedYear);
                  if (selectedYear !== CURRENT_YEAR) {
                    setDraftPositions([]);
                  }
                }}
              />
            ))}
            {draftIsCurrentTournament && (
              <div className="filter-options filter-options--nested">
                <h4 className="filter-section-subtitle">Position</h4>
                {POSITIONS.map(({ key, label }) => (
                  <FilterCheckboxOption
                    key={key}
                    label={label}
                    checked={draftPositions.includes(key)}
                    onChange={(checked) => toggleDraftPosition(key, checked)}
                  />
                ))}
              </div>
            )}
          </FilterSection>
        </div>
        <FilterPanelFooter onClear={handleClearFilters} onApply={handleApplyFilters} />
      </>
    ),
    [
      yearOptions,
      draftYear,
      draftPositions,
      draftIsCurrentTournament,
      handleApplyFilters,
      handleClearFilters,
      toggleDraftPosition,
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
                defaultValue="name"
                onChange={(next) =>
                  updateParams({ sort: next === "name" ? undefined : next })
                }
              />
            }
          />
        }
        subtitle={
          normalizedSearch
            ? `${displayedCount} players found in ${year}`
            : `${displayedCount} players in ${year}`
        }
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
                    fifaCode={section.players[0]?.team_fifa_code}
                    flagClassName="team-group-heading-flag"
                  />
                  <span className="team-group-count">{section.players.length}</span>
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
