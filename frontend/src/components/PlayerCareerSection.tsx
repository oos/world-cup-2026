import { ClubBadge } from "./ClubBadge";
import { TeamFlag } from "./TeamFlag";
import type { PlayerCareerStint } from "../api/client";

function formatDateRange(stint: PlayerCareerStint): string {
  const start = stint.start_date ? formatYear(stint.start_date) : null;
  const end = stint.end_date
    ? formatYear(stint.end_date)
    : stint.is_current
      ? "Present"
      : null;

  if (start && end) return `${start}–${end}`;
  if (start) return `${start}–${end ?? "Present"}`;
  if (end) return `Until ${end}`;
  return "—";
}

function formatYear(isoDate: string): string {
  const year = isoDate.slice(0, 4);
  return Number.isNaN(Number(year)) ? isoDate : year;
}

function CareerTimeline({
  stints,
  variant,
}: {
  stints: PlayerCareerStint[];
  variant: "club" | "international";
}) {
  if (stints.length === 0) {
    return <p className="player-career-empty">No {variant} history available.</p>;
  }

  return (
    <div className="player-career-timeline-wrap">
      <div className="player-career-timeline" role="list">
        {stints.map((stint, index) => (
          <div key={`${stint.team_name}-${stint.start_date ?? index}`} className="player-career-timeline-segment">
            {index > 0 ? <span className="player-career-timeline-connector" aria-hidden="true" /> : null}
            <div className="player-career-timeline-item" role="listitem">
              <div className="player-career-timeline-node" aria-hidden="true" />
              <div className="player-career-timeline-card">
                <div className="player-career-timeline-title">
                  {variant === "club" ? (
                    <ClubBadge
                      clubName={stint.team_name}
                      badgeUrl={stint.badge_url}
                      className="player-career-badge player-career-badge--inline"
                    />
                  ) : (
                    <TeamFlag
                      fifaCode={stint.fifa_code}
                      teamName={stint.team_name}
                      variant="badge"
                      className="player-career-badge player-career-badge--national player-career-badge--inline"
                    />
                  )}
                  <span className="player-career-timeline-name">{stint.team_name}</span>
                </div>
                <div className="player-career-timeline-dates">{formatDateRange(stint)}</div>
                {variant === "club" && stint.transfer_fee ? (
                  <div className="player-career-timeline-fee">{stint.transfer_fee}</div>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlayerCareerSection({
  clubHistory,
  internationalHistory,
}: {
  clubHistory: PlayerCareerStint[];
  internationalHistory: PlayerCareerStint[];
}) {
  if (clubHistory.length === 0 && internationalHistory.length === 0) {
    return null;
  }

  return (
    <div className="player-career-sections">
      <section className="player-career-section" aria-label="International history">
        <h3 className="player-career-heading">International history</h3>
        <CareerTimeline stints={internationalHistory} variant="international" />
      </section>
      <section className="player-career-section" aria-label="Club history">
        <h3 className="player-career-heading">Club history</h3>
        <CareerTimeline stints={clubHistory} variant="club" />
      </section>
    </div>
  );
}
