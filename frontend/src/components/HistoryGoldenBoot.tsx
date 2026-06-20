import { useEffect, useLayoutEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import type { HistoryMatch } from "../api/client";
import { TeamFlag } from "./TeamFlag";
import { formatChartAccordionMeta } from "../utils/historyChartMeta";
import {
  buildGoldenBootStats,
  buildGoldenBootTimeline,
  goldenBootPlayerKey,
  type GoldenBootEntry,
} from "../utils/goldenBootStats";

const INITIAL_VISIBLE = 30;
const SHOW_MORE_STEP = 10;
const ROW_HEIGHT = 2.5;
const GOLDEN_BOOT_TRANSITION_MS = 1100;

type DisplayRow = {
  entry: GoldenBootEntry;
  rank: number;
  exiting: boolean;
};

type HistoryGoldenBootProps = {
  matches: HistoryMatch[];
  frameIndex: number;
  rangeLabel: string;
  playing: boolean;
  panelId?: string;
  open?: boolean;
  onToggle?: (event: SyntheticEvent<HTMLDetailsElement>) => void;
};

export function HistoryGoldenBoot({
  matches,
  frameIndex,
  rangeLabel,
  playing,
  panelId,
  open,
  onToggle,
}: HistoryGoldenBootProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [transitionFrom, setTransitionFrom] = useState(false);
  const prevRanksRef = useRef<Map<string, number>>(new Map());

  const timeline = useMemo(
    () => buildGoldenBootTimeline(matches, visibleCount),
    [matches, visibleCount]
  );

  const safeFrameIndex =
    timeline && timeline.frames.length > 0
      ? Math.min(Math.max(frameIndex, 0), timeline.frames.length - 1)
      : 0;

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
    prevRanksRef.current = new Map();
  }, [matches]);

  const displayRows = useMemo((): DisplayRow[] => {
    if (!timeline || timeline.frames.length === 0) return [];

    const frame = timeline.frames[safeFrameIndex];
    const prevFrame =
      safeFrameIndex > 0 ? timeline.frames[safeFrameIndex - 1] : undefined;
    const currentByPlayer = new Map(
      frame.scorers.map((entry, rank) => [
        goldenBootPlayerKey(entry.player, entry.team),
        { entry, rank },
      ])
    );
    const prevScorers = prevFrame?.scorers ?? [];
    const allPlayers = new Set([
      ...frame.scorers.map((entry) => goldenBootPlayerKey(entry.player, entry.team)),
      ...prevScorers.map((entry) => goldenBootPlayerKey(entry.player, entry.team)),
    ]);

    return [...allPlayers].map((playerKey) => {
      const current = currentByPlayer.get(playerKey);
      if (current) {
        return {
          entry: current.entry,
          rank: current.rank,
          exiting: false,
        };
      }

      const previous = prevScorers.find(
        (entry) => goldenBootPlayerKey(entry.player, entry.team) === playerKey
      )!;

      return {
        entry: previous,
        rank: visibleCount,
        exiting: true,
      };
    });
  }, [timeline, safeFrameIndex, visibleCount]);

  useLayoutEffect(() => {
    if (!timeline || timeline.frames.length === 0) return;

    if (prevRanksRef.current.size === 0) {
      const initialRanks = new Map<string, number>();
      displayRows.forEach((row) => {
        if (!row.exiting) {
          initialRanks.set(
            goldenBootPlayerKey(row.entry.player, row.entry.team),
            row.rank
          );
        }
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
        if (!row.exiting) {
          nextRanks.set(
            goldenBootPlayerKey(row.entry.player, row.entry.team),
            row.rank
          );
        }
      });
      prevRanksRef.current = nextRanks;
    }, GOLDEN_BOOT_TRANSITION_MS);

    return () => {
      cancelAnimationFrame(startFrame);
      window.clearTimeout(settleTimer);
    };
  }, [timeline, safeFrameIndex, displayRows]);

  const totalScorerCount = useMemo(() => {
    if (!timeline || timeline.frames.length === 0) return 0;

    const year = timeline.frames[safeFrameIndex]?.year;
    if (year == null) return 0;

    return buildGoldenBootStats(matches.filter((match) => match.year <= year)).length;
  }, [timeline, safeFrameIndex, matches]);

  const getVisualRank = (row: DisplayRow): number => {
    if (!transitionFrom) return row.rank;

    const playerKey = goldenBootPlayerKey(row.entry.player, row.entry.team);
    const previousRank = prevRanksRef.current.get(playerKey);
    return previousRank ?? visibleCount;
  };

  if (!timeline || timeline.frames.length === 0 || matches.length === 0) {
    return (
      <details
        id={panelId}
        className="history-chart-accordion history-year-accordion"
        open={open}
        onToggle={onToggle}
      >
        <summary className="history-accordion-summary">
          <span className="history-accordion-title">Golden Boot by Year</span>
          <span className="history-accordion-meta">{rangeLabel}</span>
        </summary>
        <div className="history-chart-body">
          <p className="history-chart-empty">No goal scorers found for {rangeLabel}.</p>
        </div>
      </details>
    );
  }

  const frame = timeline.frames[safeFrameIndex];
  const maxGoals = Math.max(...frame.scorers.map((entry) => entry.goals), 1);
  const hasMore = visibleCount < totalScorerCount;
  const nextBatch = Math.min(SHOW_MORE_STEP, totalScorerCount - visibleCount);
  const viewportHeight = visibleCount * ROW_HEIGHT;

  if (frame.scorers.length === 0) {
    return (
      <details
        id={panelId}
        className="history-chart-accordion history-year-accordion"
        open={open}
        onToggle={onToggle}
      >
        <summary className="history-accordion-summary">
          <span className="history-accordion-title">Golden Boot by Year</span>
          <span className="history-accordion-meta">{rangeLabel}</span>
        </summary>
        <div className="history-chart-body">
          <p className="history-chart-empty">No goal scorers found for {rangeLabel}.</p>
        </div>
      </details>
    );
  }

  return (
    <details
      id={panelId}
      className="history-chart-accordion history-year-accordion"
      open={open}
      onToggle={onToggle}
    >
      <summary className="history-accordion-summary">
        <span className="history-accordion-title">Golden Boot by Year</span>
        <span className="history-accordion-meta">
          {formatChartAccordionMeta(rangeLabel, frame.scorers.length, "player", "players")}
        </span>
      </summary>
      <div className="history-chart-body">
        <section className="history-chart history-golden-boot" aria-label="Golden Boot leaderboard">
          <div className="history-golden-boot-table" role="table">
            <div className="history-golden-boot-header" role="row">
              <span className="history-golden-boot-rank" role="columnheader">
                #
              </span>
              <span className="history-golden-boot-name" role="columnheader">
                Name
              </span>
              <span
                className="history-golden-boot-played history-golden-boot-played-header"
                role="columnheader"
              >
                WC's
              </span>
              <span className="history-golden-boot-goals" role="columnheader">
                Goals
              </span>
            </div>

            <div
              className="history-golden-boot-viewport"
              style={{ height: `${viewportHeight}rem` }}
            >
              {displayRows.map((row) => {
                const { entry, exiting } = row;
                const visualRank = getVisualRank(row);

                return (
                  <div
                    key={goldenBootPlayerKey(entry.player, entry.team)}
                    className={`history-golden-boot-row${
                      exiting && !transitionFrom
                        ? " history-golden-boot-row--exiting"
                        : ""
                    }${
                      transitionFrom ? " history-golden-boot-row--instant" : ""
                    }`}
                    role="row"
                    style={{
                      transform: `translateY(${visualRank * ROW_HEIGHT}rem)`,
                      transitionDuration: transitionFrom
                        ? "0ms"
                        : `${GOLDEN_BOOT_TRANSITION_MS}ms`,
                    }}
                  >
                    <span className="history-golden-boot-rank" role="cell">
                      {exiting || transitionFrom ? "" : entry.rank}
                    </span>
                    <div className="history-golden-boot-name" role="cell">
                      <TeamFlag
                        teamName={entry.team}
                        variant="badge"
                        className="history-golden-boot-flag"
                      />
                      <span className="history-golden-boot-player-block">
                        <span className="history-golden-boot-player">{entry.player}</span>
                        <span className="history-golden-boot-team">{entry.team}</span>
                      </span>
                    </div>
                    <span className="history-golden-boot-played" role="cell">
                      {entry.played}
                    </span>
                    <div className="history-golden-boot-goals" role="cell">
                      <div className="history-golden-boot-goals-track">
                        <div
                          className="history-golden-boot-goals-bar"
                          style={{
                            width: `${(entry.goals / maxGoals) * 100}%`,
                            transitionDuration: transitionFrom
                              ? "0ms"
                              : `${GOLDEN_BOOT_TRANSITION_MS}ms`,
                          }}
                        >
                          <span className="history-golden-boot-goals-count">{entry.goals}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {hasMore && !playing && (
            <div className="history-chart-more">
              <button
                type="button"
                className="btn-secondary history-chart-more-btn"
                onClick={() =>
                  setVisibleCount((count) =>
                    Math.min(count + SHOW_MORE_STEP, totalScorerCount)
                  )
                }
                data-track-button="show_more_scorers"
              >
                Show {nextBatch} more
              </button>
            </div>
          )}
        </section>
      </div>
    </details>
  );
}
