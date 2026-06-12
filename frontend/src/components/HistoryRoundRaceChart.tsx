import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { HistoryMatch } from "../api/client";
import { TeamFlag } from "./TeamFlag";
import { getHistoryTeamContinent } from "../utils/historyTeamContinent";
import { buildRoundRaceTimeline, type RoundRaceEntry } from "../utils/historyRoundRace";
import { ROUND_COLORS } from "../utils/historyChartColors";
import { formatChartAccordionMeta } from "../utils/historyChartMeta";
import { ROUND_CATEGORIES, type RoundCategory } from "../utils/historyRoundStats";

const SPLIT_LEGEND_LABELS: Partial<Record<RoundCategory, [string, string]>> = {
  "Round of 16": ["Round", "of 16"],
  "Semi-finals": ["Semi-", "finals"],
  "Third Place": ["Third", "Place"],
};

function RoundLegendLabel({ round }: { round: RoundCategory }) {
  const splitLabel = SPLIT_LEGEND_LABELS[round];

  if (!splitLabel) {
    return <>{round}</>;
  }

  return (
    <>
      {splitLabel[0]}
      <br />
      {splitLabel[1]}
    </>
  );
}

const ROW_HEIGHT = 2.15;
const VISIBLE_TEAMS = 30;
const RACE_TRANSITION_MS = 1100;

type DisplayRow = {
  entry: RoundRaceEntry;
  rank: number;
  exiting: boolean;
};

type HistoryRoundRaceChartProps = {
  matches: HistoryMatch[];
  frameIndex: number;
  rangeLabel: string;
  playing: boolean;
  searchQuery?: string;
  filterContinent?: string;
  filterTeam?: string;
};

function RoundRaceBarTooltip({ entry }: { entry: RoundRaceEntry }) {
  return (
    <div className="history-round-race-bar-tooltip" role="tooltip">
      <div className="history-round-race-bar-tooltip-title">{entry.team}</div>
      <ul className="history-round-race-bar-tooltip-list">
        {ROUND_CATEGORIES.map((round) => {
          const count = entry.rounds[round];
          if (count === 0) return null;
          return (
            <li key={round} className="history-round-race-bar-tooltip-item">
              <span
                className="history-round-race-bar-tooltip-swatch"
                style={{ backgroundColor: ROUND_COLORS[round] }}
              />
              <span className="history-round-race-bar-tooltip-round">{round}</span>
              <span className="history-round-race-bar-tooltip-count">{count}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function HistoryRoundRaceChart({
  matches,
  frameIndex,
  rangeLabel,
  playing,
  searchQuery = "",
  filterContinent = "",
  filterTeam = "",
}: HistoryRoundRaceChartProps) {
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);
  const [transitionFrom, setTransitionFrom] = useState(false);
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const timeline = useMemo(() => {
    const base = buildRoundRaceTimeline(matches, VISIBLE_TEAMS);
    if (!base) return null;

    const normalizedSearch = searchQuery.trim().toLowerCase();

    const frames = base.frames.map((frame) => ({
      year: frame.year,
      teams: frame.teams
        .filter((entry) => {
          if (filterTeam && entry.team !== filterTeam) return false;
          if (
            filterContinent &&
            getHistoryTeamContinent(entry.team) !== filterContinent
          ) {
            return false;
          }
          if (
            normalizedSearch &&
            !entry.team.toLowerCase().includes(normalizedSearch)
          ) {
            return false;
          }
          return true;
        })
        .slice(0, VISIBLE_TEAMS),
    }));

    return { frames };
  }, [matches, searchQuery, filterContinent, filterTeam]);

  const safeFrameIndex =
    timeline && timeline.frames.length > 0
      ? Math.min(Math.max(frameIndex, 0), timeline.frames.length - 1)
      : 0;

  useEffect(() => {
    setHoveredTeam(null);
  }, [playing, safeFrameIndex]);

  useEffect(() => {
    prevRanksRef.current = new Map();
  }, [matches, searchQuery, filterContinent, filterTeam]);

  const displayRows = useMemo((): DisplayRow[] => {
    if (!timeline || timeline.frames.length === 0) return [];

    const frame = timeline.frames[safeFrameIndex];
    const prevFrame =
      safeFrameIndex > 0 ? timeline.frames[safeFrameIndex - 1] : undefined;
    const currentByTeam = new Map(
      frame.teams.map((entry, rank) => [entry.team, { entry, rank }])
    );
    const prevTeams = prevFrame?.teams ?? [];
    const allTeams = new Set([
      ...frame.teams.map((entry) => entry.team),
      ...prevTeams.map((entry) => entry.team),
    ]);

    return [...allTeams].map((team) => {
      const current = currentByTeam.get(team);
      if (current) {
        return {
          entry: current.entry,
          rank: current.rank,
          exiting: false,
        };
      }

      const previous = prevTeams.find((entry) => entry.team === team)!;

      return {
        entry: previous,
        rank: VISIBLE_TEAMS,
        exiting: true,
      };
    });
  }, [timeline, safeFrameIndex]);

  useLayoutEffect(() => {
    if (!timeline || timeline.frames.length === 0) return;

    if (prevRanksRef.current.size === 0) {
      const initialRanks = new Map<string, number>();
      displayRows.forEach((row) => {
        if (!row.exiting) initialRanks.set(row.entry.team, row.rank);
      });
      prevRanksRef.current = initialRanks;
      return;
    }

    setTransitionFrom(true);
    const startFrame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setTransitionFrom(false));
    });
    const settleTimer = window.setTimeout(() => {
      const nextRanks = new Map<string, number>();
      displayRows.forEach((row) => {
        if (!row.exiting) nextRanks.set(row.entry.team, row.rank);
      });
      prevRanksRef.current = nextRanks;
    }, RACE_TRANSITION_MS);

    return () => {
      cancelAnimationFrame(startFrame);
      window.clearTimeout(settleTimer);
    };
  }, [timeline, safeFrameIndex, displayRows]);

  const getVisualRank = (row: DisplayRow): number => {
    if (!transitionFrom) return row.rank;

    const previousRank = prevRanksRef.current.get(row.entry.team);
    return previousRank ?? VISIBLE_TEAMS;
  };

  if (!timeline || timeline.frames.length === 0 || matches.length === 0) {
    return null;
  }

  const frame = timeline.frames[safeFrameIndex];
  const frameMaxTotal = Math.max(...frame.teams.map((team) => team.total), 1);
  const viewportHeight = VISIBLE_TEAMS * ROW_HEIGHT;

  return (
    <details className="history-chart-accordion history-year-accordion">
      <summary className="history-accordion-summary">
        <span className="history-accordion-title">Success by Year</span>
        <span className="history-accordion-meta">
          {formatChartAccordionMeta(rangeLabel, frame.teams.length, "team", "teams")}
        </span>
      </summary>
      <div className="history-chart-body">
        <section
          className="history-chart history-round-race"
          aria-label="Animated World Cup success by year"
        >
          <div className="history-chart-legend history-round-race-legend team-success-round-legend">
            {ROUND_CATEGORIES.map((round) => (
              <span key={round} className="history-chart-legend-item">
                <span
                  className="history-chart-legend-swatch"
                  style={{ backgroundColor: ROUND_COLORS[round] }}
                />
                <span className="history-chart-legend-label history-chart-legend-label--split">
                  <RoundLegendLabel round={round} />
                </span>
              </span>
            ))}
          </div>

          {frame.teams.length === 0 ? (
            <p className="history-chart-empty">No teams match your search or filters.</p>
          ) : (
            <div className="history-round-race-chart-area">
              <div className="history-round-race-body">
                <div
                  className="history-round-race-ranks"
                  style={{ height: `${viewportHeight}rem` }}
                  aria-hidden="true"
                >
                  {Array.from({ length: VISIBLE_TEAMS }, (_, index) => (
                    <span
                      key={index}
                      className="history-round-race-rank history-round-race-rank--fixed"
                      style={{ transform: `translateY(${index * ROW_HEIGHT}rem)` }}
                    >
                      {index + 1}
                    </span>
                  ))}
                </div>
                <div
                  className="history-round-race-viewport"
                  style={{ height: `${viewportHeight}rem` }}
                >
              {displayRows.map((row) => {
                const { entry, exiting } = row;
                const visualRank = getVisualRank(row);

                return (
                <div
                  key={entry.team}
                  className={`history-round-race-row${
                    exiting && !transitionFrom
                      ? " history-round-race-row--exiting"
                      : ""
                  }${
                    transitionFrom ? " history-round-race-row--instant" : ""
                  }${
                    !playing && hoveredTeam === entry.team
                      ? " history-round-race-row--hovered"
                      : ""
                  }`}
                  style={{
                    transform: `translateY(${visualRank * ROW_HEIGHT}rem)`,
                    transitionDuration: transitionFrom
                      ? "0ms"
                      : `${RACE_TRANSITION_MS}ms`,
                  }}
                >
                  <TeamFlag
                    teamName={entry.team}
                    flagIso={entry.teamFlagIso}
                    variant="badge"
                    className="history-round-race-flag"
                  />
                  <span className="history-round-race-team" title={entry.team}>
                    {entry.team}
                  </span>
                  <div
                    className={`history-round-race-bar-track${
                      !playing ? " history-round-race-bar-track--interactive" : ""
                    }`}
                    onMouseEnter={() => {
                      if (!playing) setHoveredTeam(entry.team);
                    }}
                    onMouseLeave={() => setHoveredTeam(null)}
                  >
                    {!playing && hoveredTeam === entry.team && (
                      <RoundRaceBarTooltip entry={entry} />
                    )}
                    <div
                      className="history-round-race-bar"
                      style={{
                        width: `${(entry.total / frameMaxTotal) * 100}%`,
                        transitionDuration: transitionFrom
                          ? "0ms"
                          : `${RACE_TRANSITION_MS}ms`,
                      }}
                    >
                      {ROUND_CATEGORIES.map((round) => {
                        const count = entry.rounds[round];
                        if (count === 0) return null;
                        return (
                          <span
                            key={round}
                            className="history-chart-segment"
                            style={{
                              flexGrow: count,
                              backgroundColor: ROUND_COLORS[round],
                            }}
                          >
                            <span className="history-chart-segment-label">{count}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
              })}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </details>
  );
}
