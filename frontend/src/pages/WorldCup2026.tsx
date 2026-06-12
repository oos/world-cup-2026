import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type Match, type Stats, type Team } from "../api/client";
import { MatchCard } from "../components/MatchCard";
import { WorldCup2026Chart } from "../components/WorldCup2026Chart";
import { FilterSection, FilterSelect } from "../components/FilterPanel";
import { PageHeader } from "../components/PageHeader";
import { usePageFilters } from "../context/FilterPanelContext";
import { useProfilePreferences } from "../hooks/useProfilePreferences";
import {
  formatResolvedTimezoneLabel,
  resolveUserTimezone,
} from "../utils/cityTimezones";
import {
  formatDateHeading,
  getMatchLocalDate,
  getMatchSortKey,
  getTodayLocalDate,
} from "../utils/matchTime";

const TOURNAMENT_YEAR = 2026;

export function WorldCup2026() {
  const { preferences } = useProfilePreferences();
  const timeZone = resolveUserTimezone(preferences.city, preferences.timezone);
  const timezoneLabel = formatResolvedTimezoneLabel(
    preferences.city,
    preferences.timezone,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const group = searchParams.get("group") || undefined;
  const [stats, setStats] = useState<Stats | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getStats(),
      api.getTeams(),
      api.getMatches(),
      group ? api.getMatches(group) : Promise.resolve(null),
    ])
      .then(([statsRes, allTeamsRes, allMatchesRes, filteredMatchesRes]) => {
        setStats(statsRes);
        setTeams(allTeamsRes.teams);
        setAllMatches(allMatchesRes.matches);
        setMatches(
          filteredMatchesRes ? filteredMatchesRes.matches : allMatchesRes.matches
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [group]);

  const todayLocal = getTodayLocalDate(timeZone);

  const todayMatches = useMemo(
    () =>
      matches
        .filter(
          (match) => getMatchLocalDate(match.date, match.time, timeZone) === todayLocal
        )
        .sort(
          (a, b) =>
            getMatchSortKey(a.date, a.time) - getMatchSortKey(b.date, b.time)
        ),
    [matches, timeZone, todayLocal]
  );

  const recentResults = useMemo(
    () =>
      matches
        .filter((match) => match.score?.ft)
        .sort(
          (a, b) =>
            getMatchSortKey(b.date, b.time) - getMatchSortKey(a.date, a.time)
        )
        .slice(0, 6),
    [matches]
  );

  const activeCount = group ? 1 : 0;

  const updateParams = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next);
  };

  const filterContent = useMemo(
    () => (
      <FilterSection title="Group" layout="field">
        <FilterSelect
          id="wc26-group"
          value={group ?? ""}
          options={[
            { value: "", label: "All groups" },
            ...(stats?.groups ?? []).map((g) => ({ value: g, label: g })),
          ]}
          onChange={(value) => updateParams({ group: value || undefined })}
        />
      </FilterSection>
    ),
    [group, stats?.groups, searchParams]
  );

  usePageFilters({
    title: "2026 Filters",
    content: filterContent,
    activeCount,
  });

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (loading || !stats) return <div className="loading">Loading World Cup 2026…</div>;

  return (
    <>
      <PageHeader
        title={`${TOURNAMENT_YEAR} World Cup`}
        subtitle={`${stats.team_count} teams · ${matches.length} fixtures · ${stats.player_count} players`}
      />

      <WorldCup2026Chart matches={allMatches} teams={teams} />

      <div className="stats-row">
        <Link to="/26?group=Group%20A" className="stat-chip stat-chip-link">
          <div className="value">{stats.groups.length}</div>
          <div className="label">Groups</div>
        </Link>
        <Link to="/teams" className="stat-chip stat-chip-link">
          <div className="value">{stats.team_count}</div>
          <div className="label">Teams</div>
        </Link>
        <Link to="/players" className="stat-chip stat-chip-link">
          <div className="value">{stats.player_count}</div>
          <div className="label">Players</div>
        </Link>
      </div>

      <section className="home-today-matches">
        <div className="home-section-header">
          <div>
            <h2 className="home-section-title">
              {formatDateHeading(todayLocal, todayLocal)}
            </h2>
            <p className="home-section-subtitle">
              Times in {timezoneLabel}
              {" · "}
              <Link to="/profile#profile-location" className="matches-timezone-link">
                Change
              </Link>
            </p>
          </div>
          <Link to="/matches" className="btn btn-secondary home-section-btn">
            All matches →
          </Link>
        </div>
        {todayMatches.length === 0 ? (
          <p className="empty-state">No World Cup matches scheduled for today.</p>
        ) : (
          <div className="home-match-list">
            {todayMatches.map((match) => (
              <MatchCard key={match.id} match={match} showDate={false} />
            ))}
          </div>
        )}
      </section>

      {recentResults.length > 0 && (
        <section className="wc26-recent-results">
          <h2 className="home-section-title">Latest results</h2>
          <div className="home-match-list">
            {recentResults.map((match) => (
              <MatchCard key={match.id} match={match} showDate />
            ))}
          </div>
        </section>
      )}

      <AdBanner />
    </>
  );
}
