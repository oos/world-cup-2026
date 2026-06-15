import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import type { Match, Team } from "../api/client";
import { useProfilePreferences } from "../hooks/useProfilePreferences";
import { resolveUserTimezone } from "../utils/cityTimezones";
import { getTodayLocalDate } from "../utils/matchTime";
import { withReturnTo } from "../utils/navigation";
import { TeamNameWithFlag } from "./TeamNameWithFlag";
import {
  buildPlannerGrid,
  buildPlannerReturnPath,
  formatPlannerDateLabel,
  parsePlannerVenueParam,
  plannerCellElementId,
  plannerDateElementId,
  WC26_PLANNER_DATE_PARAM,
  WC26_PLANNER_VENUE_PARAM,
  WC26_PLANNER_VENUES,
} from "../utils/worldCup2026Planner";

export function WorldCup2026PlannerChart({
  matches,
  teams,
}: {
  matches: Match[];
  teams: Team[];
}) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { preferences } = useProfilePreferences();
  const timeZone = resolveUserTimezone(preferences.city, preferences.timezone);
  const todayLocal = getTodayLocalDate(timeZone);
  const focusDate = searchParams.get(WC26_PLANNER_DATE_PARAM);
  const focusVenue = parsePlannerVenueParam(searchParams.get(WC26_PLANNER_VENUE_PARAM));
  const [showHistoricalDates, setShowHistoricalDates] = useState(false);
  const { dates, cells, legend } = useMemo(
    () => buildPlannerGrid(matches, teams),
    [matches, teams]
  );
  const historicalDateCount = useMemo(
    () => dates.filter((date) => date < todayLocal).length,
    [dates, todayLocal]
  );
  const visibleDates = useMemo(
    () =>
      showHistoricalDates
        ? dates
        : dates.filter((date) => date >= todayLocal),
    [dates, showHistoricalDates, todayLocal]
  );
  const isPastDate = (date: string) => date < todayLocal;

  useEffect(() => {
    if (!focusDate || !dates.includes(focusDate)) return;
    if (focusDate < todayLocal && !showHistoricalDates) {
      setShowHistoricalDates(true);
    }
  }, [focusDate, dates, showHistoricalDates, todayLocal]);

  useEffect(() => {
    if (!focusDate || !visibleDates.includes(focusDate)) return;

    const timer = window.setTimeout(() => {
      const targetId = focusVenue
        ? plannerCellElementId(focusVenue, focusDate)
        : plannerDateElementId(focusDate);
      document.getElementById(targetId)?.scrollIntoView({
        block: "nearest",
        inline: "center",
        behavior: "smooth",
      });
    }, 200);

    return () => window.clearTimeout(timer);
  }, [focusDate, focusVenue, visibleDates]);

  return (
    <section className="wc26-planner" aria-label="World Cup 2026 planner">
      {historicalDateCount > 0 ? (
        <div className="wc26-chart-toolbar">
          <button
            type="button"
            className="btn btn-secondary wc26-planner-past-toggle"
            aria-pressed={showHistoricalDates}
            onClick={(event) => {
              setShowHistoricalDates((current) => !current);
              event.currentTarget.blur();
            }}
          >
            {showHistoricalDates
              ? "Hide past dates"
              : `Show past dates (${historicalDateCount})`}
          </button>
        </div>
      ) : null}
      <div className="wc26-planner-scroll">
        <div
          className="wc26-planner-grid"
          style={{ "--planner-days": visibleDates.length } as CSSProperties}
        >
          <div className="wc26-planner-corner">Venue</div>
          {visibleDates.map((date) => (
            <div
              key={date}
              id={plannerDateElementId(date)}
              className={`wc26-planner-date${isPastDate(date) ? " is-past-date" : ""}`}
            >
              {formatPlannerDateLabel(date)}
            </div>
          ))}

          {WC26_PLANNER_VENUES.map((venue) => (
            <div key={venue} className="wc26-planner-row">
              <div className="wc26-planner-venue">{venue}</div>
              {visibleDates.map((date) => {
                const cell = cells.get(`${venue}|${date}`);
                const pastClass = isPastDate(date) ? " is-past-date" : "";
                if (!cell) {
                  return (
                    <div key={date} className={`wc26-planner-cell is-empty${pastClass}`} />
                  );
                }

                return (
                  <div
                    key={date}
                    id={plannerCellElementId(venue, date)}
                    className={`wc26-planner-cell${pastClass}`}
                  >
                    <Link
                      to={withReturnTo(
                        `/matches/${cell.match.id}`,
                        buildPlannerReturnPath(location, cell.date, cell.venue)
                      )}
                      className={`wc26-planner-block${cell.score ? " is-played" : ""}`}
                      style={{
                        backgroundColor: cell.colors.bg,
                        color: cell.colors.text,
                      }}
                      aria-label={`${cell.matchup}, ${cell.kickoff ?? "time TBD"}${
                        cell.score ? `, final score ${cell.score}` : ""
                      }`}
                    >
                      <span className="wc26-planner-matchup">{cell.matchup}</span>
                      <span className="wc26-planner-time">
                        {cell.score ?? cell.kickoff ?? "TBD"}
                      </span>
                    </Link>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="wc26-planner-legend" aria-label="Group colours">
        {legend.map((group) => (
          <div key={group.letter} className="wc26-planner-legend-group">
            <div
              className="wc26-planner-legend-heading"
              style={{
                backgroundColor: group.colors.bg,
                color: group.colors.text,
              }}
            >
              {group.label}
            </div>
            <ul className="wc26-planner-legend-teams">
              {group.teams.map((team) => (
                <li key={team.id}>
                  <TeamNameWithFlag
                    name={team.name}
                    fifaCode={team.fifa_code}
                    worldRanking={team.world_ranking}
                    variant="badge"
                    flagClassName="wc26-group-flag"
                    nameClassName="wc26-group-team-name"
                    rankClassName="wc26-group-team-rank"
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
