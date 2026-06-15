import { Link } from "react-router-dom";
import { TeamFlag } from "./TeamFlag";
import type { GroupStandings } from "../utils/worldCup2026Standings";

export function GroupStandingsPanel({ group }: { group: GroupStandings }) {
  return (
    <section className="profile-card standings-card">
      <div className="standings-card-header">
        <h2 className="standings-card-title">{group.groupLabel}</h2>
        <Link
          to={`/schedule?group=${encodeURIComponent(group.groupLabel)}`}
          className="standings-card-link"
        >
          Fixtures →
        </Link>
      </div>
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
              <th scope="col">GD</th>
              <th scope="col">Pts</th>
            </tr>
          </thead>
          <tbody>
            {group.rows.map((row) => (
              <tr key={row.team.id} className={row.position <= 2 ? "standings-row--qualified" : ""}>
                <td>{row.position}</td>
                <td>
                  <span className="standings-team">
                    <TeamFlag
                      fifaCode={row.team.fifa_code}
                      teamName={row.team.name}
                      className="standings-team-flag"
                    />
                    <span className="standings-team-name">{row.team.name}</span>
                  </span>
                </td>
                <td>{row.played}</td>
                <td>{row.won}</td>
                <td>{row.drawn}</td>
                <td>{row.lost}</td>
                <td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                <td className="standings-points">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {group.isComplete ? (
        <p className="standings-card-note">Group stage complete — top two advance.</p>
      ) : (
        <p className="standings-card-note">Table updates as group-stage results come in.</p>
      )}
    </section>
  );
}
