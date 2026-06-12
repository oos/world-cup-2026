import { useMemo, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import type { Match, Team } from "../api/client";
import { TeamNameWithFlag } from "./TeamNameWithFlag";
import {
  buildPlannerGrid,
  formatPlannerDateLabel,
  WC26_PLANNER_VENUES,
} from "../utils/worldCup2026Planner";

export function WorldCup2026PlannerChart({
  matches,
  teams,
}: {
  matches: Match[];
  teams: Team[];
}) {
  const { dates, cells, legend } = useMemo(
    () => buildPlannerGrid(matches, teams),
    [matches, teams]
  );

  return (
    <section className="wc26-planner" aria-label="World Cup 2026 planner">
      <div className="wc26-planner-scroll">
        <div
          className="wc26-planner-grid"
          style={{ "--planner-days": dates.length } as CSSProperties}
        >
          <div className="wc26-planner-corner">Venue</div>
          {dates.map((date) => (
            <div key={date} className="wc26-planner-date">
              {formatPlannerDateLabel(date)}
            </div>
          ))}

          {WC26_PLANNER_VENUES.map((venue) => (
            <div key={venue} className="wc26-planner-row">
              <div className="wc26-planner-venue">{venue}</div>
              {dates.map((date) => {
                const cell = cells.get(`${venue}|${date}`);
                if (!cell) {
                  return <div key={date} className="wc26-planner-cell is-empty" />;
                }

                return (
                  <div key={date} className="wc26-planner-cell">
                    <Link
                      to={`/matches/${cell.match.id}`}
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
