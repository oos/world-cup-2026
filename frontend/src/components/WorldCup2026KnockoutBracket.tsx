import type { BracketMatch, BracketRound } from "../utils/worldCup2026Bracket";
import { TeamNameWithFlag } from "./TeamNameWithFlag";

function BracketMatchRow({ match }: { match: BracketMatch }) {
  const team1Name = match.team1.name ?? match.team1.label;
  const team2Name = match.team2.name ?? match.team2.label;

  return (
    <div className={`knockout-match ${match.isPlayed ? "knockout-match--played" : ""}`}>
      <div className="knockout-match-meta">Match {match.matchNumber}</div>
      <div className="knockout-match-teams">
        <TeamNameWithFlag
          name={team1Name}
          fifaCode={match.team1.fifaCode}
          showWorldRanking={false}
          variant="badge"
          className="knockout-team"
          flagClassName="knockout-team-flag"
          nameClassName="knockout-team-name"
        />
        <span className="knockout-match-score">{match.score ?? "–"}</span>
        <TeamNameWithFlag
          name={team2Name}
          fifaCode={match.team2.fifaCode}
          showWorldRanking={false}
          variant="badge"
          className="knockout-team"
          flagClassName="knockout-team-flag"
          nameClassName="knockout-team-name"
        />
      </div>
    </div>
  );
}

export function WorldCup2026KnockoutBracket({
  rounds,
  thirdPlaceMatch,
}: {
  rounds: BracketRound[];
  thirdPlaceMatch: BracketMatch | null;
}) {
  return (
    <div className="knockout-bracket">
      {rounds.map((round) => (
        <section key={round.key} className="knockout-round">
          <h2 className="knockout-round-title">{round.label}</h2>
          <div className="knockout-round-matches">
            {round.matches.map((match) => (
              <BracketMatchRow key={match.matchNumber} match={match} />
            ))}
          </div>
        </section>
      ))}
      {thirdPlaceMatch ? (
        <section className="knockout-round">
          <h2 className="knockout-round-title">Third-place match</h2>
          <div className="knockout-round-matches">
            <BracketMatchRow match={thirdPlaceMatch} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
