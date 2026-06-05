import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type HistoryTournament, type Player } from "../api/client";
import { FilterOption, FilterSection, FilterSelect } from "../components/FilterPanel";
import { PageHeader } from "../components/PageHeader";
import { PageToolbar } from "../components/PageToolbar";
import { PlayerRow } from "../components/PlayerRow";
import { SearchInput } from "../components/SearchInput";
import { usePageFilters, usePageSort } from "../context/FilterPanelContext";

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

export function Players() {
  const [searchParams, setSearchParams] = useSearchParams();
  const yearParam = searchParams.get("year");
  const year = yearParam ? Number(yearParam) : CURRENT_YEAR;
  const isCurrentTournament = year === CURRENT_YEAR;
  const group = searchParams.get("group") || undefined;
  const position = searchParams.get("position") || undefined;
  const sortParam = searchParams.get("sort") as PlayerSort | null;
  const sort: PlayerSort =
    !isCurrentTournament && sortParam === "jersey" ? "name" : sortParam || "name";

  const [players, setPlayers] = useState<Player[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [tournaments, setTournaments] = useState<HistoryTournament[]>([]);
  const [playerCount2026, setPlayerCount2026] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    api
      .getHistoryTournaments()
      .then((res) => setTournaments(res.tournaments))
      .catch(() => setTournaments([]));
    api
      .getStats()
      .then((stats) => {
        setGroups(stats.groups);
        setPlayerCount2026(stats.player_count);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .getPlayers({ year, group, position })
      .then((res) => setPlayers(res.players))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [year, group, position]);

  const yearOptions = useMemo(
    () => [
      { value: String(CURRENT_YEAR), label: `${CURRENT_YEAR} (${playerCount2026} players)` },
      ...[...tournaments].reverse().map((t) => ({
        value: String(t.year),
        label: `${t.year} (${t.match_count} matches)`,
      })),
    ],
    [tournaments, playerCount2026]
  );

  const sortOptions = useMemo(() => {
    const options = [
      { value: "name", label: "Name A–Z" },
      { value: "-name", label: "Name Z–A" },
      { value: "team", label: "Team" },
      { value: "position", label: "Position" },
    ];
    if (isCurrentTournament) {
      options.push({ value: "jersey", label: "Jersey number" });
    }
    return options;
  }, [isCurrentTournament]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredPlayers = useMemo(() => {
    let filtered = players;

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
  }, [players, normalizedSearch, sort]);

  const groupedPlayers = useMemo(
    () => (sort === "team" ? groupPlayersByTeam(filteredPlayers) : null),
    [filteredPlayers, sort]
  );

  const displayedCount = filteredPlayers.length;

  const activeCount =
    (yearParam ? 1 : 0) + (group ? 1 : 0) + (isCurrentTournament && position ? 1 : 0);

  const updateParams = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next);
  };

  const sortContent = useMemo(
    () => (
      <FilterSection title="Sort by">
        {sortOptions.map((option) => (
          <FilterOption
            key={option.value}
            label={option.label}
            active={sort === option.value}
            onClick={() =>
              updateParams({ sort: option.value === "name" ? undefined : option.value })
            }
          />
        ))}
      </FilterSection>
    ),
    [sort, sortOptions, searchParams]
  );

  const filterContent = useMemo(
    () => (
      <>
        <FilterSection title="Year" layout="field">
          <FilterSelect
            id="players-year"
            value={String(year)}
            options={yearOptions}
            onChange={(value) => {
              const selectedYear = Number(value);
              updateParams({
                year: selectedYear === CURRENT_YEAR ? undefined : value,
                group: undefined,
                position: undefined,
                sort:
                  selectedYear !== CURRENT_YEAR && sortParam === "jersey"
                    ? undefined
                    : sortParam || undefined,
              });
            }}
          />
        </FilterSection>
        {isCurrentTournament && groups.length > 0 && (
          <FilterSection title="Group" layout="field">
            <FilterSelect
              id="players-group"
              value={group ?? ""}
              options={[
                { value: "", label: "All groups" },
                ...groups.map((g) => ({ value: g, label: g })),
              ]}
              onChange={(value) => updateParams({ group: value || undefined })}
            />
          </FilterSection>
        )}
        {isCurrentTournament && (
          <FilterSection title="Position" layout="field">
            <FilterSelect
              id="players-position"
              value={position ?? ""}
              options={[
                { value: "", label: "All positions" },
                ...POSITIONS.map(({ key, label }) => ({ value: key, label })),
              ]}
              onChange={(value) => updateParams({ position: value || undefined })}
            />
          </FilterSection>
        )}
      </>
    ),
    [
      year,
      yearParam,
      isCurrentTournament,
      group,
      position,
      groups,
      yearOptions,
      sortParam,
      searchParams,
    ]
  );

  usePageFilters({
    title: "Player Filters",
    content: filterContent,
    activeCount,
  });

  usePageSort({
    title: "Sort Players",
    content: sortContent,
    activeCount: sort !== "name" ? 1 : 0,
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
                onChange={setSearchQuery}
                placeholder="Search…"
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
                  {section.team}
                  <span className="team-group-count">{section.players.length}</span>
                </h2>
                <div className="player-list">
                  {section.players.map((player) => {
                    adCounter += 1;
                    return (
                      <div key={player.id}>
                        <PlayerRow player={player} showTeam={false} />
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
                    <PlayerRow player={player} showTeam />
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
