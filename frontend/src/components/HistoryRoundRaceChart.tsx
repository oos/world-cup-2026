import { useEffect, useMemo, useState } from "react";
import type { HistoryMatch } from "../api/client";
import { TeamFlag } from "./TeamFlag";
import { getHistoryTeamContinent } from "../utils/historyTeamContinent";
import { buildRoundRaceTimeline, type RoundRaceEntry } from "../utils/historyRoundRace";
import { ROUND_COLORS } from "../utils/historyChartColors";
import { formatChartAccordionMeta } from "../utils/historyChartMeta";
import { ROUND_CATEGORIES } from "../utils/historyRoundStats";

const ROW_HEIGHT = 2.15;
const VISIBLE_TEAMS = 18;

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

  if (!timeline || timeline.frames.length === 0 || matches.length === 0) {
    return null;
  }

  const frame = timeline.frames[safeFrameIndex];
  const frameMaxTotal = Math.max(...frame.teams.map((team) => team.total), 1);
  const viewportHeight = Math.max(frame.teams.length, 1) * ROW_HEIGHT;

  return (
    <details className="history-chart-accordion history-year-accordion">
      <summary className="history-accordion-summary">
        <span className="history-accordion-title">Appearances by Year</span>
        <span className="history-accordion-meta">
          {formatChartAccordionMeta(rangeLabel, frame.teams.length, "team", "teams")}
        </span>
      </summary>
      <div className="history-chart-body">
        <section
          className="history-chart history-round-race"
          aria-label="Animated World Cup appearances by round"
        >
          <div className="history-chart-legend history-round-race-legend team-success-round-legend">
            {ROUND_CATEGORIES.map((round) => (
              <span key={round} className="history-chart-legend-item">
                <span
                  className="history-chart-legend-swatch"
                  style={{ backgroundColor: ROUND_COLORS[round] }}
                />
                <span className="history-chart-legend-label">{round}</span>
              </span>
            ))}
          </div>

          {frame.teams.length === 0 ? (
            <p className="history-chart-empty">No teams match your search or filters.</p>
          ) : (
            <div
              className="history-round-race-viewport"
              style={{ height: `${viewportHeight}rem` }}
            >
              {frame.teams.map((entry, rank) => (
                <div
                  key={entry.team}
                  className={`history-round-race-row${
                    !playing && hoveredTeam === entry.team
                      ? " history-round-race-row--hovered"
                      : ""
                  }`}
                  style={{
                    transform: `translateY(${rank * ROW_HEIGHT}rem)`,
                  }}
                >
                  <span className="history-round-race-rank">{rank + 1}</span>
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
                  <span className="history-round-race-total">{entry.total}</span>
                </div>
              ))}
            </div>
          )}

          {frame.teams.length > 0 && (
            <div className="history-round-race-axis">
              <span>0</span>
              <span>{Math.round(frameMaxTotal / 2)}</span>
              <span>{frameMaxTotal}</span>
            </div>
          )}
        </section>
      </div>
    </details>
  );
}
