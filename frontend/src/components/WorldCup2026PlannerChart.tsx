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
  getPlannerDateParts,
  parsePlannerVenueParam,
  plannerCellElementId,
  plannerDateElementId,
  truncatePlannerTeamName,
  WC26_PLANNER_DATE_PARAM,
  WC26_PLANNER_VENUE_PARAM,
  WC26_PLANNER_VENUES,
} from "../utils/worldCup2026Planner";

export type WorldCup2026PlannerChartVariant = "full" | "groups";

export function WorldCup2026PlannerChart({
  matches,
  teams,
  variant = "full",
}: {
  matches: Match[];
  teams: Team[];
  variant?: WorldCup2026PlannerChartVariant;
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
    () =>
      variant === "groups"
        ? buildPlannerGrid([], teams)
        : buildPlannerGrid(matches, teams),
    [matches, teams, variant]
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
    <section
      className={`wc26-planner${variant === "groups" ? " wc26-planner--groups-only" : ""}`}
      aria-label={variant === "groups" ? "World Cup 2026 groups" : "World Cup 2026 planner"}
    >
      {variant === "full" && historicalDateCount > 0 ? (
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
      {variant === "full" ? (
      <div className="wc26-planner-scroll">
        <div
          className="wc26-planner-grid"
          style={{ "--planner-days": visibleDates.length } as CSSProperties}
        >
          <div className="wc26-planner-corner">Host City</div>
          {visibleDates.map((date, dateIndex) => {
            const { day, month } = getPlannerDateParts(date);
            return (
            <div
              key={date}
              id={plannerDateElementId(date)}
              className={`wc26-planner-date${isPastDate(date) ? " is-past-date" : ""}${
                dateIndex % 2 === 1 ? " is-alt-column" : ""
              }`}
            >
              <span className="wc26-planner-date-day">{day}</span>
              <span className="wc26-planner-date-month">{month}</span>
            </div>
            );
          })}

          {WC26_PLANNER_VENUES.map((venue) => (
            <div key={venue} className="wc26-planner-row">
              <div className="wc26-planner-venue">{venue}</div>
              {visibleDates.map((date, dateIndex) => {
                const cell = cells.get(`${venue}|${date}`);
                const pastClass = isPastDate(date) ? " is-past-date" : "";
                const altClass = dateIndex % 2 === 1 ? " is-alt-column" : "";
                if (!cell) {
                  return (
                    <div
                      key={date}
                      className={`wc26-planner-cell is-empty${pastClass}${altClass}`}
                    />
                  );
                }

                return (
                  <div
                    key={date}
                    id={plannerCellElementId(venue, date)}
                    className={`wc26-planner-cell${pastClass}${altClass}`}
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
                      <span className="wc26-planner-matchup">
                        <span className="wc26-planner-team" title={cell.team1Name}>
                          <span className="wc26-planner-team-name">
                            {truncatePlannerTeamName(cell.team1Name)}
                          </span>
                        </span>
                        <span className="wc26-planner-vs" aria-hidden="true">
                          v
                        </span>
                        <span className="wc26-planner-team" title={cell.team2Name}>
                          <span className="wc26-planner-team-name">
                            {truncatePlannerTeamName(cell.team2Name)}
                          </span>
                        </span>
                      </span>
                      <span className="wc26-planner-time">
                        {cell.score ?? (cell.kickoff ? `(${cell.kickoff})` : "(TBD)")}
                      </span>
                    </Link>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      ) : null}

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
                <li key={team.id} title={team.name}>
                  <TeamNameWithFlag
                    name={team.name}
                    fifaCode={team.fifa_code}
                    worldRanking={team.world_ranking}
                    inlineWorldRanking
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
