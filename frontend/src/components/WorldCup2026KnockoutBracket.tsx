import type { BracketMatch, BracketRound, BracketTeam } from "../utils/worldCup2026Bracket";
import { formatKnockoutSlotLabel } from "../utils/formatMatchTeamName";
import { TeamNameWithFlag } from "./TeamNameWithFlag";

function KnockoutTeamSlot({ team }: { team: BracketTeam }) {
  const displayName = formatKnockoutSlotLabel(team.name ?? team.label);
  const showProvisional = team.isProvisional && team.isResolved;

  return (
    <div
      className={`knockout-team-slot${showProvisional ? " knockout-team-slot--provisional" : ""}`}
    >
      <TeamNameWithFlag
        name={displayName}
        fifaCode={team.fifaCode}
        showWorldRanking={false}
        variant="badge"
        className="knockout-team"
        flagClassName="knockout-team-flag"
        nameClassName="knockout-team-name"
      />
      {showProvisional ? (
        <span className="knockout-team-slot-hint">
          if {formatKnockoutSlotLabel(team.label)} holds
        </span>
      ) : null}
    </div>
  );
}

function BracketMatchRow({ match }: { match: BracketMatch }) {
  const hasProvisionalTeam =
    !match.isPlayed && (match.team1.isProvisional || match.team2.isProvisional);

  return (
    <div
      className={`knockout-match${match.isPlayed ? " knockout-match--played" : ""}${
        hasProvisionalTeam ? " knockout-match--provisional" : ""
      }`}
    >
      <div className="knockout-match-meta">Match {match.matchNumber}</div>
      <div className="knockout-match-teams">
        <KnockoutTeamSlot team={match.team1} />
        <span className="knockout-match-score">{match.score ?? "–"}</span>
        <KnockoutTeamSlot team={match.team2} />
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
