import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import {
  api,
  type HistoryTeam,
  type HistoryTournament,
  type Team,
} from "../api/client";
import { HistoryTeamCard } from "../components/HistoryTeamCard";
import { TeamCard } from "../components/TeamCard";
import { FilterOption, FilterSection, FilterSelect } from "../components/FilterPanel";
import { PageHeader } from "../components/PageHeader";
import { PageToolbar } from "../components/PageToolbar";
import { SearchInput } from "../components/SearchInput";
import { usePageFilters, usePageSort } from "../context/FilterPanelContext";

const CURRENT_YEAR = 2026;

type TeamSort = "name" | "-name" | "group" | "players";

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
    case "players":
      return sorted.sort(
        (a, b) => b.player_count - a.player_count || a.name.localeCompare(b.name)
      );
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

export function Teams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const yearParam = searchParams.get("year");
  const year = yearParam ? Number(yearParam) : CURRENT_YEAR;
  const isCurrentTournament = year === CURRENT_YEAR;
  const group = searchParams.get("group") || undefined;
  const confederation = searchParams.get("confederation") || undefined;
  const sortParam = searchParams.get("sort") as TeamSort | null;
  const sort: TeamSort =
    !isCurrentTournament && sortParam === "players" ? "name" : sortParam || "name";

  const [teams, setTeams] = useState<Team[]>([]);
  const [historyTeams, setHistoryTeams] = useState<HistoryTeam[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [tournaments, setTournaments] = useState<HistoryTournament[]>([]);
  const [currentTeamCount, setCurrentTeamCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    if (isCurrentTournament) {
      Promise.all([api.getTeams(group), api.getStats(), api.getHistoryTournaments()])
        .then(([teamsRes, stats, tournamentsRes]) => {
          setTeams(teamsRes.teams);
          setHistoryTeams([]);
          setGroups(stats.groups);
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
          setGroups([]);
          setCurrentTeamCount(stats.team_count);
          setTournaments(tournamentsRes.tournaments);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [year, group, isCurrentTournament]);

  const confederations = useMemo(
    () => [...new Set(teams.map((t) => t.confederation).filter(Boolean))].sort(),
    [teams]
  );

  const historyGroups = useMemo(
    () =>
      [...new Set(historyTeams.map((t) => t.group).filter(Boolean))].sort() as string[],
    [historyTeams]
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

  const sortOptions = useMemo(() => {
    const options = [
      { value: "name", label: "Name A–Z" },
      { value: "-name", label: "Name Z–A" },
      { value: "group", label: "Group" },
    ];
    if (isCurrentTournament) {
      options.push({ value: "players", label: "Squad size" });
    }
    return options;
  }, [isCurrentTournament]);

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

  const activeCount =
    (yearParam ? 1 : 0) +
    (group ? 1 : 0) +
    (isCurrentTournament && confederation ? 1 : 0);

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
            id="teams-year"
            value={String(year)}
            options={yearOptions}
            onChange={(value) => {
              const selectedYear = Number(value);
              updateParams({
                year: selectedYear === CURRENT_YEAR ? undefined : value,
                group: undefined,
                confederation: undefined,
                sort:
                  selectedYear !== CURRENT_YEAR && sortParam === "players"
                    ? undefined
                    : sortParam || undefined,
              });
            }}
          />
        </FilterSection>
        {isCurrentTournament && groups.length > 0 && (
          <FilterSection title="Group" layout="field">
            <FilterSelect
              id="teams-group"
              value={group ?? ""}
              options={[
                { value: "", label: "All groups" },
                ...groups.map((g) => ({ value: g, label: g })),
              ]}
              onChange={(value) =>
                updateParams({ group: value || undefined, confederation: undefined })
              }
            />
          </FilterSection>
        )}
        {!isCurrentTournament && historyGroups.length > 0 && (
          <FilterSection title="Group" layout="field">
            <FilterSelect
              id="teams-history-group"
              value={group ?? ""}
              options={[
                { value: "", label: "All groups" },
                ...historyGroups.map((g) => ({ value: g, label: g })),
              ]}
              onChange={(value) => updateParams({ group: value || undefined })}
            />
          </FilterSection>
        )}
        {isCurrentTournament && confederations.length > 0 && (
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
      </>
    ),
    [
      year,
      yearParam,
      isCurrentTournament,
      group,
      confederation,
      groups,
      historyGroups,
      confederations,
      tournaments,
      currentTeamCount,
      yearOptions,
      sortParam,
      searchParams,
    ]
  );

  usePageFilters({
    title: "Team Filters",
    content: filterContent,
    activeCount,
  });

  usePageSort({
    title: "Sort Teams",
    content: sortContent,
    activeCount: sort !== "name" ? 1 : 0,
  });

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (loading) return <div className="loading">Loading teams…</div>;

  return (
    <>
      <PageHeader
        title="Teams"
        toolbar={
          <PageToolbar
            search={
              <SearchInput
                id="teams-search"
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search…"
              />
            }
          />
        }
        subtitle={
          normalizedSearch
            ? `${displayedCount} teams found in ${year}`
            : `${displayedCount} nations competing in ${year}`
        }
      />

      {displayedCount === 0 ? (
        <p className="empty-state">
          {normalizedSearch ? `No teams match "${searchQuery.trim()}".` : "No teams found."}
        </p>
      ) : (
      (() => {
        let adCounter = 0;

        if (isCurrentTournament) {
          if (groupedCurrentTeams) {
            return groupedCurrentTeams.map((section) => (
              <section key={section.group} className="team-group-panel">
                <h2 className="team-group-heading">
                  {section.group}
                  <span className="team-group-count">{section.teams.length}</span>
                </h2>
                <div className="team-grid">
                  {section.teams.map((team) => {
                    adCounter += 1;
                    return (
                      <div key={team.id}>
                        <TeamCard team={team} />
                        {adCounter % 8 === 0 && <AdBanner />}
                      </div>
                    );
                  })}
                </div>
              </section>
            ));
          }

          return (
            <div className="team-grid">
              {filteredTeams.map((team) => {
                adCounter += 1;
                return (
                  <div key={team.id}>
                    <TeamCard team={team} />
                    {adCounter % 8 === 0 && <AdBanner />}
                  </div>
                );
              })}
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
              <div className="team-grid">
                {section.teams.map((team) => {
                  adCounter += 1;
                  return (
                    <div key={team.name}>
                      <HistoryTeamCard team={team} />
                      {adCounter % 8 === 0 && <AdBanner />}
                    </div>
                  );
                })}
              </div>
            </section>
          ));
        }

        return (
          <div className="team-grid">
            {filteredHistoryTeams.map((team) => {
              adCounter += 1;
              return (
                <div key={team.name}>
                  <HistoryTeamCard team={team} />
                  {adCounter % 8 === 0 && <AdBanner />}
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
