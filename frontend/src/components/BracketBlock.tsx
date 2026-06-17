import type { Bracket, BracketTeam, BracketTie } from "../api/client";
import { TeamFlag } from "./TeamFlag";

function TeamBadge({ team }: { team: BracketTeam | null }) {
  if (!team) return null;
  if (team.flag_iso) {
    return <TeamFlag fifaCode={team.fifa_code} teamName={team.name} className="bracket-team-flag" />;
  }
  if (team.crest_url) {
    return <img src={team.crest_url} alt="" className="bracket-team-flag" loading="lazy" />;
  }
  return null;
}

function TieSide({
  team,
  score,
  isWinner,
}: {
  team: BracketTeam | null;
  score: number | null;
  isWinner: boolean;
}) {
  return (
    <div className={`bracket-tie-side ${isWinner ? "bracket-tie-side--winner" : ""}`}>
      <span className="bracket-tie-team">
        <TeamBadge team={team} />
        <span className="bracket-team-name">{team?.name ?? "TBD"}</span>
      </span>
      <span className="bracket-tie-score">{score ?? "-"}</span>
    </div>
  );
}

function TieCard({ tie }: { tie: BracketTie }) {
  const twoLegged = tie.legs.length > 1;
  return (
    <div className="bracket-tie">
      <TieSide
        team={tie.team1}
        score={tie.score1}
        isWinner={tie.winner_team_id === tie.team1?.id}
      />
      <TieSide
        team={tie.team2}
        score={tie.score2}
        isWinner={tie.winner_team_id === tie.team2?.id}
      />
      {twoLegged ? (
        <div className="bracket-tie-legs">
          {tie.legs.map((leg, index) => (
            <span key={index} className="bracket-tie-leg">
              {leg.ft ? `${leg.ft[0]}–${leg.ft[1]}` : "–"}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function BracketBlock({ bracket }: { bracket: Bracket }) {
  if (!bracket.rounds.length) {
    return <p className="empty-state">No knockout matches yet.</p>;
  }
  return (
    <div className="bracket-board">
      {bracket.rounds.map((round) => (
        <div key={round.key} className="bracket-round">
          <h3 className="bracket-round-title">{round.label}</h3>
          <div className="bracket-round-ties">
            {round.ties.map((tie, index) => (
              <TieCard key={index} tie={tie} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
