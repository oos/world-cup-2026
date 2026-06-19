import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type HistoryMatch, type HistoryTournament } from "../api/client";
import { HistoryMatchCard } from "../components/HistoryMatchCard";
import { TeamFlag } from "../components/TeamFlag";
import { HistoryRoundRaceChart } from "../components/HistoryRoundRaceChart";
import { HistoryTimelineBar } from "../components/HistoryTimelineBar";
import { HistoryGoldenBoot } from "../components/HistoryGoldenBoot";
import { HistoryWinnersMap } from "../components/HistoryWinnersMap";
import { HistoryWinnersSankey } from "../components/HistoryWinnersSankey";
import { PageHeader } from "../components/PageHeader";
import { PageTitle } from "../components/PageTitle";
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
import { formatChartAccordionMeta } from "../utils/historyChartMeta";
import {
  historyPanelElementId,
  hasExplicitHistoryPanels,
  HISTORY_PANEL_IDS,
  isHistoryPanelOpen,
  parseHistoryPanelFocus,
  updateHistoryPanelSearchParams,
  type HistoryPanelId,
} from "../utils/historyPanelFocus";

const HISTORY_PANEL_SCROLL_ORDER: HistoryPanelId[] = [
  HISTORY_PANEL_IDS.winnersSankey,
  HISTORY_PANEL_IDS.roundRace,
  HISTORY_PANEL_IDS.winnersMap,
  HISTORY_PANEL_IDS.goldenBoot,
  HISTORY_PANEL_IDS.podium,
];
import { getTournamentYears } from "../utils/historyRoundRace";

const TIMELINE_BASE_INTERVAL_MS = 1400;
const TIMELINE_SPEEDS = [0.5, 0.75, 1, 1.5, 2, 3] as const;
const TIMELINE_DEFAULT_SPEED_INDEX = 2;

type MatchdayGroup = {
  matchday: string;
  matches: HistoryMatch[];
};

type YearMatchdayGroup = {
  year: number;
  matchdays: MatchdayGroup[];
};

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
      <TeamFlag
        teamName={isPlaceholder ? null : team}
        variant="badge"
        className="history-year-podium-flag"
      />
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
  if (groups.length === 0) {
    return <p className="history-chart-empty">No fixtures found for this period.</p>;
  }

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
                {matchCount} {matchCount === 1 ? "fixture" : "fixtures"}
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
                      {matchdayGroup.matches.length === 1 ? "fixture" : "fixtures"}
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

function HistoryMatchesPanel({
  groups,
  podiums,
  rangeLabel,
  returnSearch,
  focusMatchId,
  panelId,
  open,
  onToggle,
}: {
  groups: YearMatchdayGroup[];
  podiums: Map<number, YearPodium>;
  rangeLabel: string;
  returnSearch: string;
  focusMatchId: string | null;
  panelId?: string;
  open?: boolean;
  onToggle?: (event: SyntheticEvent<HTMLDetailsElement>) => void;
}) {
  const matchCount = groups.reduce(
    (total, group) =>
      total + group.matchdays.reduce((sum, matchday) => sum + matchday.matches.length, 0),
    0
  );

  return (
    <details
      id={panelId}
      className="history-chart-accordion history-year-accordion history-matches-panel"
      open={open}
      onToggle={onToggle}
    >
      <summary className="history-accordion-summary">
        <span className="history-accordion-title">Podium by Year</span>
        <span className="history-accordion-meta">
          {formatChartAccordionMeta(rangeLabel, matchCount, "fixture", "fixtures")}
        </span>
      </summary>
      <div className="history-chart-body">
        <HistoryYearAccordions
          groups={groups}
          podiums={podiums}
          returnSearch={returnSearch}
          focusMatchId={focusMatchId}
        />
      </div>
    </details>
  );
}

export function History() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const stickyHeaderRef = useRef<HTMLDivElement>(null);
  const focusMatchId = location.hash.startsWith("#history-match-")
    ? location.hash.slice(1)
    : null;
  const focusedPanel = parseHistoryPanelFocus(searchParams);

  const handlePanelToggle =
    (panelId: HistoryPanelId) =>
    (event: SyntheticEvent<HTMLDetailsElement>) => {
      const isOpen = event.currentTarget.open;
      setSearchParams(
        (current) =>
          updateHistoryPanelSearchParams(
            current,
            panelId,
            isOpen
          ),
        { replace: true }
      );

      if (isOpen) {
        window.requestAnimationFrame(() => {
          document
            .getElementById(historyPanelElementId(panelId))
            ?.scrollIntoView({ block: "start", behavior: "smooth" });
        });
      }
    };

  const [tournaments, setTournaments] = useState<HistoryTournament[]>([]);
  const [chartMatches, setChartMatches] = useState<HistoryMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timelineFrameIndex, setTimelineFrameIndex] = useState(0);
  const [timelinePlaying, setTimelinePlaying] = useState(true);
  const [timelineSpeedIndex, setTimelineSpeedIndex] = useState(
    TIMELINE_DEFAULT_SPEED_INDEX
  );

  const timelineSpeed = TIMELINE_SPEEDS[timelineSpeedIndex];
  const timelineIntervalMs = TIMELINE_BASE_INTERVAL_MS / timelineSpeed;

  useEffect(() => {
    document.documentElement.classList.add("history-page-scroll-snap");
    return () => {
      document.documentElement.classList.remove("history-page-scroll-snap");
      document.documentElement.style.removeProperty("--history-sticky-header-height");
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getHistoryMatches(), api.getHistoryTournaments()])
      .then(([matchesRes, tournamentsRes]) => {
        setChartMatches(matchesRes.matches);
        setTournaments(tournamentsRes.tournaments);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const timelineYears = useMemo(
    () => getTournamentYears(chartMatches),
    [chartMatches]
  );

  useEffect(() => {
    const stickyHeader = stickyHeaderRef.current;
    if (!stickyHeader) return;

    const updateStickyHeaderHeight = () => {
      document.documentElement.style.setProperty(
        "--history-sticky-header-height",
        `${stickyHeader.offsetHeight}px`
      );
    };

    updateStickyHeaderHeight();

    const observer = new ResizeObserver(updateStickyHeaderHeight);
    observer.observe(stickyHeader);

    return () => observer.disconnect();
  }, [loading, timelineYears.length]);

  useEffect(() => {
    setTimelineFrameIndex(0);
  }, [timelineYears]);

  useEffect(() => {
    if (!timelinePlaying || timelineYears.length < 2) return;

    const timer = window.setInterval(() => {
      setTimelineFrameIndex((index) => (index + 1) % timelineYears.length);
    }, timelineIntervalMs);

    return () => window.clearInterval(timer);
  }, [timelinePlaying, timelineYears, timelineIntervalMs]);

  const currentTimelineYear =
    timelineYears[timelineFrameIndex] ??
    timelineYears[timelineYears.length - 1];

  const displayedChartMatches = useMemo(() => {
    if (currentTimelineYear == null) return chartMatches;
    return chartMatches.filter((match) => match.year <= currentTimelineYear);
  }, [chartMatches, currentTimelineYear]);

  const displayedYearGroups = useMemo(
    () => groupMatchesByYearAndMatchday(displayedChartMatches),
    [displayedChartMatches]
  );

  const yearPodiums = useMemo(
    () => buildYearPodiumMap(chartMatches),
    [chartMatches]
  );

  const chartRangeLabel =
    currentTimelineYear != null ? String(currentTimelineYear) : "All tournaments";

  const returnSearch = searchParams.toString();

  useEffect(() => {
    if (!focusMatchId || loading) return;

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
  }, [focusMatchId, loading, chartMatches.length]);

  useEffect(() => {
    if (!hasExplicitHistoryPanels(focusedPanel) || loading) return;

    const panelToScroll = HISTORY_PANEL_SCROLL_ORDER.find((panel) =>
      focusedPanel.has(panel)
    );
    if (!panelToScroll) return;

    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(historyPanelElementId(panelToScroll));
      target?.scrollIntoView({ block: "start", behavior: "smooth" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [focusedPanel, loading, chartMatches.length]);

  const displayedTournamentCount =
    currentTimelineYear != null
      ? timelineYears.filter((year) => year <= currentTimelineYear).length
      : timelineYears.length || tournaments.length;
  const displayedMatchCount = displayedChartMatches.length;
  const subtitle = `${displayedTournamentCount} ${
    displayedTournamentCount === 1 ? "tournament" : "tournaments"
  } · ${displayedMatchCount.toLocaleString()} ${
    displayedMatchCount === 1 ? "fixture" : "fixtures"
  }`;

  if (error) return <div className="error">Failed to load: {error}</div>;

  return (
    <div className="history-page">
      <PageTitle>History</PageTitle>
      <div ref={stickyHeaderRef} className="history-sticky-header">
        <PageHeader
          title="World Cup History"
          subtitle={subtitle}
          inlineSubtitle
          showActions={false}
        >
          <p className="page-subtitle history-page-subtitle">
            View the history of a specific year or watch history unfold for all years...
          </p>
        </PageHeader>
        {!loading && timelineYears.length > 0 && (
          <HistoryTimelineBar
            years={timelineYears}
            frameIndex={timelineFrameIndex}
            playing={timelinePlaying}
            speed={timelineSpeed}
            canDecreaseSpeed={timelineSpeedIndex > 0}
            canIncreaseSpeed={timelineSpeedIndex < TIMELINE_SPEEDS.length - 1}
            onFrameSelect={setTimelineFrameIndex}
            onPlayingChange={setTimelinePlaying}
            onSpeedDecrease={() =>
              setTimelineSpeedIndex((index) => Math.max(0, index - 1))
            }
            onSpeedIncrease={() =>
              setTimelineSpeedIndex((index) =>
                Math.min(TIMELINE_SPEEDS.length - 1, index + 1)
              )
            }
          />
        )}
      </div>

      {loading ? (
        <div className="loading">Loading history…</div>
      ) : (
        <div className="history-charts-snap">
          <HistoryWinnersSankey
            matches={displayedChartMatches}
            rangeLabel={chartRangeLabel}
            includeYear={UPCOMING_PODIUM_YEAR}
            panelId={historyPanelElementId(HISTORY_PANEL_IDS.winnersSankey)}
            open={isHistoryPanelOpen(HISTORY_PANEL_IDS.winnersSankey, focusedPanel)}
            onToggle={handlePanelToggle(HISTORY_PANEL_IDS.winnersSankey)}
          />
          <HistoryRoundRaceChart
            matches={chartMatches}
            frameIndex={timelineFrameIndex}
            rangeLabel={chartRangeLabel}
            playing={timelinePlaying}
            panelId={historyPanelElementId(HISTORY_PANEL_IDS.roundRace)}
            open={isHistoryPanelOpen(HISTORY_PANEL_IDS.roundRace, focusedPanel)}
            onToggle={handlePanelToggle(HISTORY_PANEL_IDS.roundRace)}
          />
          <HistoryWinnersMap
            matches={displayedChartMatches}
            rangeLabel={chartRangeLabel}
            panelId={historyPanelElementId(HISTORY_PANEL_IDS.winnersMap)}
            open={isHistoryPanelOpen(HISTORY_PANEL_IDS.winnersMap, focusedPanel)}
            onToggle={handlePanelToggle(HISTORY_PANEL_IDS.winnersMap)}
          />
          <HistoryGoldenBoot
            matches={chartMatches}
            frameIndex={timelineFrameIndex}
            rangeLabel={chartRangeLabel}
            playing={timelinePlaying}
            panelId={historyPanelElementId(HISTORY_PANEL_IDS.goldenBoot)}
            open={isHistoryPanelOpen(HISTORY_PANEL_IDS.goldenBoot, focusedPanel)}
            onToggle={handlePanelToggle(HISTORY_PANEL_IDS.goldenBoot)}
          />
          <HistoryMatchesPanel
            groups={displayedYearGroups}
            podiums={yearPodiums}
            rangeLabel={chartRangeLabel}
            returnSearch={returnSearch}
            focusMatchId={focusMatchId}
            panelId={historyPanelElementId(HISTORY_PANEL_IDS.podium)}
            open={isHistoryPanelOpen(HISTORY_PANEL_IDS.podium, focusedPanel)}
            onToggle={handlePanelToggle(HISTORY_PANEL_IDS.podium)}
          />
        </div>
      )}
    </div>
  );
}
