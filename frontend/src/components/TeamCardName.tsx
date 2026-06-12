import { TeamNameWithFlag } from "./TeamNameWithFlag";

type TeamCardNameProps = {
  name: string;
  fifaCode?: string | null;
  worldRanking?: number | null;
};

export function TeamCardName({ name, fifaCode, worldRanking }: TeamCardNameProps) {
  return (
    <div className="team-card-name">
      <TeamNameWithFlag
        name={name}
        fifaCode={fifaCode}
        worldRanking={worldRanking}
        variant="badge"
        flagClassName="team-card-name-flag"
        nameClassName="team-card-name-text"
      />
    </div>
  );
}
