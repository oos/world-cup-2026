import { TeamNameWithFlag } from "./TeamNameWithFlag";

type TeamCardNameProps = {
  name: string;
  fifaCode?: string | null;
};

export function TeamCardName({ name, fifaCode }: TeamCardNameProps) {
  return (
    <div className="team-card-name">
      <TeamNameWithFlag
        name={name}
        fifaCode={fifaCode}
        variant="badge"
        flagClassName="team-card-name-flag"
        nameClassName="team-card-name-text"
      />
    </div>
  );
}
