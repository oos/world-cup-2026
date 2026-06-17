import type { Standings, StandingsRow, StandingsZone } from "../api/client";
import { TeamFlag } from "./TeamFlag";

function zoneClass(row: StandingsRow): string {
  if (!row.zone) return "";
  switch (row.zone.kind) {
    case "champion":
    case "qualify":
      return "standings-row--qualified";
    case "secondary":
      return "standings-row--secondary";
    case "playoff":
      return "standings-row--playoff";
    case "out":
      return "standings-row--out";
    default:
      return "";
  }
}

function TeamBadge({ row }: { row: StandingsRow }) {
  if (row.flag_iso) {
    return (
      <TeamFlag fifaCode={row.fifa_code} teamName={row.name} className="standings-team-flag" />
    );
  }
  if (row.crest_url) {
    return <img src={row.crest_url} alt="" className="standings-team-flag" loading="lazy" />;
  }
  return null;
}

function StandingsTable({ rows }: { rows: StandingsRow[] }) {
  return (
    <div className="standings-table-wrap">
      <table className="standings-table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Team</th>
            <th scope="col">P</th>
            <th scope="col">W</th>
            <th scope="col">D</th>
            <th scope="col">L</th>
            <th scope="col">GF</th>
            <th scope="col">GA</th>
            <th scope="col">GD</th>
            <th scope="col">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.team_id} className={zoneClass(row)}>
              <td>{row.position}</td>
              <td>
                <span className="standings-team">
                  <TeamBadge row={row} />
                  <span className="standings-team-name">{row.name}</span>
                </span>
              </td>
              <td>{row.played}</td>
              <td>{row.won}</td>
              <td>{row.drawn}</td>
              <td>{row.lost}</td>
              <td>{row.goals_for}</td>
              <td>{row.goals_against}</td>
              <td>{row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}</td>
              <td className="standings-points">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ZoneLegend({ zones }: { zones: StandingsZone[] }) {
  const labelled = zones.filter((z) => z.label);
  if (labelled.length === 0) return null;
  return (
    <ul className="standings-zone-legend">
      {labelled.map((zone) => (
        <li key={`${zone.from}-${zone.to}`} className={`standings-zone-chip zone--${zone.kind}`}>
          {zone.label}
        </li>
      ))}
    </ul>
  );
}

export function StandingsBlock({ standings }: { standings: Standings }) {
  if (standings.mode === "groups" && standings.groups) {
    return (
      <div className="standings-groups-grid">
        {standings.groups.map((group) => (
          <section key={group.name} className="profile-card standings-card">
            <div className="standings-card-header">
              <h2 className="standings-card-title">{group.name}</h2>
            </div>
            <StandingsTable rows={group.rows} />
          </section>
        ))}
      </div>
    );
  }

  const rows = standings.rows ?? [];
  return (
    <section className="profile-card standings-card">
      <ZoneLegend zones={standings.zones} />
      <StandingsTable rows={rows} />
    </section>
  );
}
