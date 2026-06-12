import type { TeamMatchTimelineEvent } from "../api/client";

function formatMinute(minute: number) {
  if (minute <= 0) return "0'";
  if (minute === 45) return "45'";
  if (minute === 90) return "90'";
  if (minute === 120) return "120'";
  return `${minute}'`;
}

function scoreText(teamScore?: number, opponentScore?: number) {
  if (teamScore === undefined || opponentScore === undefined) return null;
  return `${teamScore} : ${opponentScore}`;
}

export function WorldCupMatchTimeline({
  teamName,
  opponent,
  events,
}: {
  teamName: string;
  opponent: string;
  events: TeamMatchTimelineEvent[];
}) {
  return (
    <div className="wc-match-timeline" aria-label="Match timeline">
      <div className="wc-match-timeline-track">
        {events.map((event, index) => {
          const isGoal = event.type === "goal";
          const isTeamGoal = event.side === "team";

          return (
            <article
              key={`${event.type}-${event.minute}-${index}`}
              className={`wc-match-timeline-event wc-match-timeline-event--${event.type}${
                isGoal
                  ? isTeamGoal
                    ? " wc-match-timeline-event--team-goal"
                    : " wc-match-timeline-event--opponent-goal"
                  : ""
              }`}
            >
              <div className="wc-match-timeline-marker">
                <span className="wc-match-timeline-minute">
                  {formatMinute(event.minute ?? 0)}
                </span>
              </div>
              <div className="wc-match-timeline-card">
                <h4 className="wc-match-timeline-title">{event.label}</h4>
                {isGoal ? (
                  <p className="wc-match-timeline-detail">
                    {event.team_name}
                    {event.own_goal ? " (own goal)" : ""}
                  </p>
                ) : null}
                {scoreText(event.team_score, event.opponent_score) ? (
                  <p className="wc-match-timeline-score">
                    {teamName}{" "}
                    {scoreText(event.team_score, event.opponent_score)}{" "}
                    {opponent}
                  </p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
