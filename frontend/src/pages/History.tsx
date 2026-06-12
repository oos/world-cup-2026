import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type HistoryMatch, type HistoryTournament } from "../api/client";
import { HistoryMatchCard } from "../components/HistoryMatchCard";
import { TeamFlag } from "../components/TeamFlag";
import { HistoryRoundChart } from "../components/HistoryRoundChart";
import { PageHeader } from "../components/PageHeader";
import { SegmentedTabs } from "../components/SegmentedTabs";
import { TeamTreemap } from "../components/TeamTreemap";
import { FilterSection, FilterSelect } from "../components/FilterPanel";
import { usePageFilters } from "../context/FilterPanelContext";
import {
  historyMatchCardId,
  historyMatchKey,
  historyReturnPath,
} from "../utils/historyMatch";
import {
  buildYearPodiumMap,
  isPlaceholderPodiumTeam,
  PLACEHOLDER_PODIUM,
  UPCOMING_PODIUM_YEAR,
  type YearPodium,
} from "../utils/historyPodium";

type HistoryTab = "all" | "year";

type MatchdayGroup = {
  matchday: string;
  matches: HistoryMatch[];
};

type YearMatchdayGroup = {
  year: number;
  matchdays: MatchdayGroup[];
};

function matchesTeamSearch(match: HistoryMatch, query: string) {
  const normalized = query.toLowerCase();
  return (
    match.team1.toLowerCase().includes(normalized) ||
    match.team2.toLowerCase().includes(normalized)
  );
}

function sortMatches(matches: HistoryMatch[]) {
  return [...matches].sort((a, b) => {
    const dateCompare = (a.date ?? "").localeCompare(b.date ?? "");
    if (dateCompare !== 0) return dateCompare;
    return (a.match_number ?? 0) - (b.match_number ?? 0);
  });
}

function compareMatchdayGroups(a: MatchdayGroup, b: MatchdayGroup) {
  const aMatch = a.matches[0];
  const bMatch = b.matches[0];
  const dateCompare = (aMatch?.date ?? "").localeCompare(bMatch?.date ?? "");
  if (dateCompare !== 0) return dateCompare;
  return (aMatch?.match_number ?? 0) - (bMatch?.match_number ?? 0);
}

function groupMatchesByYearAndMatchday(matches: HistoryMatch[]): YearMatchdayGroup[] {
  const yearMap = new Map<number, Map<string, HistoryMatch[]>>();

  for (const match of matches) {
    const matchday = match.round || "Other";
    const matchdayMap = yearMap.get(match.year) ?? new Map<string, HistoryMatch[]>();
    const existing = matchdayMap.get(matchday) ?? [];
    existing.push(match);
    matchdayMap.set(matchday, existing);
    yearMap.set(match.year, matchdayMap);
  }

  return [...yearMap.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, matchdayMap]) => {
      const matchdays = [...matchdayMap.entries()]
        .map(([matchday, matchdayMatches]) => ({
          matchday,
          matches: sortMatches(matchdayMatches),
        }))
        .sort(compareMatchdayGroups);

      return { year, matchdays };
    });
}

function groupMatchesByMatchday(matches: HistoryMatch[]): MatchdayGroup[] {
  const matchdayMap = new Map<string, HistoryMatch[]>();

  for (const match of matches) {
    const matchday = match.round || "Other";
    const existing = matchdayMap.get(matchday) ?? [];
    existing.push(match);
    matchdayMap.set(matchday, existing);
  }

  return [...matchdayMap.entries()]
    .map(([matchday, matchdayMatches]) => ({
      matchday,
      matches: sortMatches(matchdayMatches),
    }))
    .sort(compareMatchdayGroups);
}

function HistoryMatchList({
  matches,
  returnSearch,
  focusMatchId,
}: {
  matches: HistoryMatch[];
  returnSearch: string;
  focusMatchId: string | null;
}) {
  let adCounter = 0;

  return (
    <>
      {matches.map((match) => {
        adCounter += 1;
        const matchKey = historyMatchKey(match);
        const cardId = historyMatchCardId(match.year, matchKey);
        return (
          <div key={`${match.year}-${match.date}-${match.team1}-${match.team2}`}>
            <HistoryMatchCard
              match={match}
              returnTo={historyReturnPath(returnSearch, cardId)}
              isFocused={focusMatchId === cardId}
            />
            {adCounter % 8 === 0 && <AdBanner />}
          </div>
        );
      })}
    </>
  );
}

function HistoryYearPodiumRow({
  place,
  team,
  asterisk = false,
}: {
  place: string;
  team: string;
  asterisk?: boolean;
}) {
  const isPlaceholder = isPlaceholderPodiumTeam(team);

  return (
    <span className="history-year-podium-item">
      <span className="history-year-podium-place">{place}</span>
      {isPlaceholder ? (
        <span
          className="history-year-podium-flag-icon"
          aria-hidden="true"
        >
          🏳️
        </span>
      ) : (
        <TeamFlag teamName={team} variant="badge" className="history-year-podium-flag" />
      )}
      <span
        className={`history-year-podium-team${
          isPlaceholder ? " history-year-podium-team--placeholder" : ""
        }`}
      >
        {team}
        {asterisk && (
          <sup className="history-year-podium-asterisk" aria-hidden="true">
            *
          </sup>
        )}
      </span>
    </span>
  );
}

function HistoryYearPodium({ podium }: { podium: YearPodium }) {
  return (
    <div className="history-year-podium">
      <HistoryYearPodiumRow place="1st" team={podium.first} />
      <HistoryYearPodiumRow place="2nd" team={podium.second} />
      {podium.third && (
        <div className="history-year-podium-third">
          <HistoryYearPodiumRow
            place="3rd"
            team={podium.third}
            asterisk={podium.thirdNoteAsterisk}
          />
          {podium.thirdNote && (
            <span className="history-year-podium-note">
              {podium.thirdNoteAsterisk && (
                <span className="history-year-podium-asterisk" aria-hidden="true">
                  *
                </span>
              )}
              {podium.thirdNote}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function HistoryYearAccordions({
  groups,
  podiums,
  returnSearch,
  focusMatchId,
}: {
  groups: YearMatchdayGroup[];
  podiums: Map<number, YearPodium>;
  returnSearch: string;
  focusMatchId: string | null;
}) {
  return (
    <div className="history-accordions">
      {groups.map((group) => {
        const matchCount = group.matchdays.reduce(
          (total, matchday) => total + matchday.matches.length,
          0
        );

        const podium =
          podiums.get(group.year) ??
          (group.year === UPCOMING_PODIUM_YEAR ? PLACEHOLDER_PODIUM : undefined);

        return (
          <details key={group.year} className="history-year-accordion">
            <summary className="history-accordion-summary history-year-summary">
              <span className="history-accordion-title">{group.year}</span>
              {podium && <HistoryYearPodium podium={podium} />}
              <span className="history-accordion-meta">
                {matchCount} {matchCount === 1 ? "match" : "matches"}
              </span>
            </summary>
            <div className="history-year-body">
              {group.matchdays.map((matchdayGroup) => (
                <details
                  key={`${group.year}-${matchdayGroup.matchday}`}
                  className="history-matchday-accordion"
                >
                  <summary className="history-accordion-summary">
                    <span className="history-accordion-title">{matchdayGroup.matchday}</span>
                    <span className="history-accordion-meta">
                      {matchdayGroup.matches.length}{" "}
                      {matchdayGroup.matches.length === 1 ? "match" : "matches"}
                    </span>
                  </summary>
                  <div className="history-matchday-body">
                    <HistoryMatchList
                      matches={matchdayGroup.matches}
                      returnSearch={returnSearch}
                      focusMatchId={focusMatchId}
                    />
                  </div>
                </details>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function HistoryMatchdayAccordions({
  groups,
  returnSearch,
  focusMatchId,
}: {
  groups: MatchdayGroup[];
  returnSearch: string;
  focusMatchId: string | null;
}) {
  return (
    <div className="history-accordions">
      {groups.map((group) => (
        <details
          key={group.matchday}
          className="history-matchday-accordion history-matchday-accordion--top"
        >
          <summary className="history-accordion-summary">
            <span className="history-accordion-title">{group.matchday}</span>
            <span className="history-accordion-meta">
              {group.matches.length} {group.matches.length === 1 ? "match" : "matches"}
            </span>
          </summary>
          <div className="history-matchday-body">
            <HistoryMatchList
              matches={group.matches}
              returnSearch={returnSearch}
              focusMatchId={focusMatchId}
            />
          </div>
        </details>
      ))}
    </div>
  );
}

export function History() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const focusMatchId = location.hash.startsWith("#history-match-")
    ? location.hash.slice(1)
    : null;
  const tab = (searchParams.get("tab") === "year" ? "year" : "all") as HistoryTab;
  const yearParam = searchParams.get("year");
  const round = searchParams.get("round") || undefined;
  const teamQuery = searchParams.get("q") || "";
  const year = yearParam ? Number(yearParam) : undefined;

  const [tournaments, setTournaments] = useState<HistoryTournament[]>([]);
  const [matches, setMatches] = useState<HistoryMatch[]>([]);
  const [yearMatches, setYearMatches] = useState<HistoryMatch[]>([]);
  const [chartMatches, setChartMatches] = useState<HistoryMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearLoading, setYearLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedYear = year ?? tournaments[tournaments.length - 1]?.year ?? 2022;
  const normalizedTeamQuery = teamQuery.trim().toLowerCase();

  useEffect(() => {
    api
      .getHistoryMatches()
      .then((res) => setChartMatches(res.matches))
      .catch(() => setChartMatches([]));
  }, []);

  useEffect(() => {
    api
      .getHistoryTournaments()
      .then((res) => setTournaments(res.tournaments))
      .catch(() => setTournaments([]));
  }, []);

  useEffect(() => {
    if (tab !== "all") return;
    setLoading(true);
    api
      .getHistoryMatches({ year, round })
      .then((matchesRes) => setMatches(matchesRes.matches))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tab, year, round]);

  useEffect(() => {
    if (tab !== "year") return;
    setYearLoading(true);
    api
      .getHistoryMatches({ year: selectedYear, round })
      .then((matchesRes) => setYearMatches(matchesRes.matches))
      .catch((e) => setError(e.message))
      .finally(() => setYearLoading(false));
  }, [tab, selectedYear, round]);

  const yearOptions = useMemo(
    () => [
      { value: "", label: "All tournaments" },
      ...[...tournaments].reverse().map((t) => ({
        value: String(t.year),
        label: `${t.year} (${t.match_count} matches)`,
      })),
    ],
    [tournaments]
  );

  const yearTabOptions = useMemo(
    () =>
      [...tournaments].reverse().map((t) => ({
        value: String(t.year),
        label: `${t.year} · ${t.match_count} matches`,
      })),
    [tournaments]
  );

  const countries = useMemo(() => {
    const teams = new Set<string>();
    for (const match of chartMatches) {
      if (match.team1) teams.add(match.team1);
      if (match.team2) teams.add(match.team2);
    }
    return [...teams].sort((a, b) => a.localeCompare(b));
  }, [chartMatches]);

  const rounds = useMemo(() => {
    const source = tab === "year" ? yearMatches : matches;
    return [...new Set(source.map((m) => m.round).filter(Boolean))].sort();
  }, [tab, matches, yearMatches]);

  const filteredMatches = useMemo(() => {
    if (!normalizedTeamQuery) return matches;
    return matches.filter((match) => matchesTeamSearch(match, normalizedTeamQuery));
  }, [matches, normalizedTeamQuery]);

  const filteredYearMatches = useMemo(() => {
    if (!normalizedTeamQuery) return yearMatches;
    return yearMatches.filter((match) => matchesTeamSearch(match, normalizedTeamQuery));
  }, [yearMatches, normalizedTeamQuery]);

  const yearGroups = useMemo(
    () => groupMatchesByYearAndMatchday(filteredMatches),
    [filteredMatches]
  );

  const yearPodiums = useMemo(
    () => buildYearPodiumMap(chartMatches),
    [chartMatches]
  );

  const matchdayGroups = useMemo(
    () => groupMatchesByMatchday(filteredYearMatches),
    [filteredYearMatches]
  );

  const activeCount =
    (teamQuery ? 1 : 0) +
    (tab === "all" && year ? 1 : 0) +
    (round ? 1 : 0);
  const returnSearch = searchParams.toString();
  const isContentReady =
    tab === "all" ? !loading : !yearLoading;

  useEffect(() => {
    if (!focusMatchId || !isContentReady) return;

    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(focusMatchId);
      if (!target) return;

      let element: HTMLElement | null = target;
      while (element) {
        if (element instanceof HTMLDetailsElement) {
          element.open = true;
        }
        element = element.parentElement;
      }

      target.scrollIntoView({ block: "center", behavior: "smooth" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [
    focusMatchId,
    isContentReady,
    tab,
    filteredMatches.length,
    filteredYearMatches.length,
  ]);

  const updateParams = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next);
  };

  const setTab = (nextTab: HistoryTab) => {
    if (nextTab === "year") {
      updateParams({
        tab: "year",
        year: String(selectedYear),
        round: undefined,
      });
      return;
    }
    updateParams({ tab: undefined, round: undefined });
  };

  const subtitle =
    tab === "all"
      ? normalizedTeamQuery
        ? `${filteredMatches.length} matches found`
        : `${filteredMatches.length} matches across ${year ? 1 : tournaments.length} tournaments`
      : normalizedTeamQuery
        ? `${filteredYearMatches.length} matches found in ${selectedYear}`
        : `${filteredYearMatches.length} matches in ${selectedYear}`;

  if (error) return <div className="error">Failed to load: {error}</div>;

  return (
    <>
      <HistoryFilters
        tab={tab}
        country={teamQuery}
        countries={countries}
        year={year}
        selectedYear={selectedYear}
        yearOptions={yearOptions}
        yearTabOptions={yearTabOptions}
        round={round}
        rounds={rounds}
        activeCount={activeCount}
        onUpdate={updateParams}
      />
      <PageHeader title="World Cup History" subtitle={subtitle}>
        <SegmentedTabs
          ariaLabel="History view"
          tabs={[
            { id: "all", label: "All" },
            { id: "year", label: "Year" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </PageHeader>

      {tab === "all" ? (
        loading ? (
          <div className="loading">Loading history…</div>
        ) : (
          <>
            <HistoryRoundChart matches={chartMatches} />
            {yearGroups.length === 0 ? (
              <p className="empty-state">
                {normalizedTeamQuery
                  ? `No matches found for "${teamQuery.trim()}".`
                  : "No matches match your filters."}
              </p>
            ) : (
              <HistoryYearAccordions
                groups={yearGroups}
                podiums={yearPodiums}
                returnSearch={returnSearch}
                focusMatchId={focusMatchId}
              />
            )}
          </>
        )
      ) : yearLoading ? (
        <div className="loading">Loading {selectedYear}…</div>
      ) : (
        <>
          <TeamTreemap year={selectedYear} matches={yearMatches} />
          {matchdayGroups.length === 0 ? (
            <p className="empty-state">
              {normalizedTeamQuery
                ? `No matches found for "${teamQuery.trim()}".`
                : "No matches found."}
            </p>
          ) : (
            <HistoryMatchdayAccordions
              groups={matchdayGroups}
              returnSearch={returnSearch}
              focusMatchId={focusMatchId}
            />
          )}
        </>
      )}
    </>
  );
}

function HistoryFilters({
  tab,
  country,
  countries,
  year,
  selectedYear,
  yearOptions,
  yearTabOptions,
  round,
  rounds,
  activeCount,
  onUpdate,
}: {
  tab: HistoryTab;
  country: string;
  countries: string[];
  year: number | undefined;
  selectedYear: number;
  yearOptions: { value: string; label: string }[];
  yearTabOptions: { value: string; label: string }[];
  round: string | undefined;
  rounds: string[];
  activeCount: number;
  onUpdate: (updates: Record<string, string | undefined>) => void;
}) {
  const filterContent = useMemo(
    () => (
      <>
        <FilterSection title="Country" layout="field">
          <FilterSelect
            id="history-country"
            value={country}
            options={[
              { value: "", label: "All countries" },
              ...countries.map((name) => ({ value: name, label: name })),
            ]}
            onChange={(value) => onUpdate({ q: value || undefined })}
          />
        </FilterSection>
        <FilterSection title="Year" layout="field">
          <FilterSelect
            id="history-year"
            value={tab === "year" ? String(selectedYear) : year ? String(year) : ""}
            options={tab === "year" ? yearTabOptions : yearOptions}
            onChange={(value) =>
              onUpdate({
                tab: tab === "year" ? "year" : undefined,
                year: value || undefined,
                round: undefined,
              })
            }
          />
        </FilterSection>
        <FilterSection title="Round" layout="field">
          <FilterSelect
            id="history-round"
            value={round ?? ""}
            options={[
              { value: "", label: "All rounds" },
              ...rounds.map((r) => ({ value: r, label: r })),
            ]}
            onChange={(value) => onUpdate({ round: value || undefined })}
          />
        </FilterSection>
      </>
    ),
    [
      tab,
      country,
      countries,
      year,
      selectedYear,
      yearOptions,
      yearTabOptions,
      round,
      rounds,
      onUpdate,
    ]
  );

  usePageFilters({
    title: "History Filters",
    content: filterContent,
    activeCount,
  });

  return null;
}
