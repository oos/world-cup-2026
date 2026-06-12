import type { PlayerHonourGroup, PlayerHonours } from "../api/client";

function HonourGroupList({
  title,
  groups,
}: {
  title: string;
  groups: PlayerHonourGroup[];
}) {
  if (!groups.length) return null;

  return (
    <section className="player-honours-block" aria-label={title}>
      <h3 className="player-honours-heading">{title}</h3>
      <div className="player-honours-groups">
        {groups.map((group) => (
          <div key={group.key} className="player-honours-group">
            <div className="player-honours-group-title">
              <span>{group.label}</span>
              <span className="player-honours-group-count">{group.count}</span>
            </div>
            <ul className="player-honours-list">
              {group.items.map((item) => (
                <li
                  key={`${group.key}-${item.competition}-${item.team ?? "unknown"}`}
                  className="player-honours-item"
                >
                  <div className="player-honours-item-title">
                    <span>{item.competition}</span>
                    {item.team ? (
                      <span className="player-honours-item-team">{item.team}</span>
                    ) : null}
                  </div>
                  <div className="player-honours-seasons">
                    {item.seasons.join(" · ")}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PlayerHonoursSection({ honours }: { honours: PlayerHonours }) {
  const hasDetails =
    honours.domestic.length > 0 ||
    honours.cups.length > 0 ||
    honours.continental.length > 0 ||
    honours.club.length > 0 ||
    honours.individual.length > 0 ||
    honours.other.length > 0;

  if (!honours.major.length && !hasDetails) {
    return <p className="player-honours-empty">No honours data available.</p>;
  }

  return (
    <div className="player-honours-sections">
      {honours.major.length > 0 ? (
        <section className="player-honours-block" aria-label="Major honours">
          <h3 className="player-honours-heading">Major honours</h3>
          <div className="player-honours-major-grid">
            {honours.major.map((honour) => (
              <div key={honour.key} className="player-honours-major-card">
                <span className="player-honours-major-count">{honour.count}</span>
                <span className="player-honours-major-label">{honour.label}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <HonourGroupList title="Domestic leagues" groups={honours.domestic} />
      <HonourGroupList title="Domestic cups" groups={honours.cups} />
      <HonourGroupList title="Continental trophies" groups={honours.continental} />
      <HonourGroupList title="Club honours" groups={honours.club} />
      <HonourGroupList title="Individual awards" groups={honours.individual} />
      <HonourGroupList title="Other honours" groups={honours.other} />
    </div>
  );
}
