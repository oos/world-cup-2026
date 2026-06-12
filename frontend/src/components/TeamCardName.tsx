type TeamCardNameProps = {
  name: string;
};

export function TeamCardName({ name }: TeamCardNameProps) {
  return (
    <div className="team-card-name">
      <span className="team-card-name-text">{name}</span>
    </div>
  );
}
