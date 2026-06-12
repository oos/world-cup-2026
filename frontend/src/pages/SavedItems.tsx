import { Bookmark, ChevronRight, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { TeamFlag } from "../components/TeamFlag";
import { useSavedItems } from "../hooks/useSavedItems";

function SavedItemLink({
  to,
  label,
  meta,
  leading,
}: {
  to: string;
  label: string;
  meta?: string;
  leading?: ReactNode;
}) {
  return (
    <Link to={to} className="saved-item-link">
      <span className="saved-item-link-leading">{leading}</span>
      <span className="saved-item-link-copy">
        <span className="saved-item-link-label">{label}</span>
        {meta ? <span className="saved-item-link-meta">{meta}</span> : null}
      </span>
      <ChevronRight size={16} strokeWidth={2.25} aria-hidden="true" />
    </Link>
  );
}

export function SavedItems() {
  const { teams, players, loading } = useSavedItems();
  const hasItems = teams.length > 0 || players.length > 0;

  return (
    <>
      <h1 className="page-title">Saved items</h1>
      <p className="page-subtitle">Teams and players you have saved</p>

      {loading && !hasItems ? (
        <div className="profile-card">
          <p className="saved-items-loading">Loading saved items…</p>
        </div>
      ) : !hasItems ? (
        <div className="profile-card">
          <div className="profile-empty">
            <UserRound size={28} strokeWidth={1.75} aria-hidden="true" />
            <p>No saved teams or players yet.</p>
            <Link to="/teams" className="profile-link">
              Browse teams
              <ChevronRight size={16} strokeWidth={2.25} aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="saved-items-sections">
          {teams.length > 0 ? (
            <section className="profile-section">
              <h2 className="profile-section-title">Teams</h2>
              <div className="profile-card saved-items-list">
                {teams.map((team) => (
                  <SavedItemLink
                    key={`team-${team.itemId}`}
                    to={`/teams/${team.itemId}`}
                    label={team.name}
                    meta={team.fifaCode || undefined}
                    leading={
                      team.fifaCode ? (
                        <TeamFlag
                          fifaCode={team.fifaCode}
                          teamName={team.name}
                          variant="badge"
                          className="saved-item-flag"
                        />
                      ) : (
                        <Bookmark size={16} strokeWidth={2} aria-hidden="true" />
                      )
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}

          {players.length > 0 ? (
            <section className="profile-section">
              <h2 className="profile-section-title">Players</h2>
              <div className="profile-card saved-items-list">
                {players.map((player) => (
                  <SavedItemLink
                    key={`player-${player.itemId}`}
                    to={`/players/${player.itemId}`}
                    label={player.name}
                    meta={
                      player.teamName
                        ? [player.position, player.teamName].filter(Boolean).join(" · ")
                        : player.position || undefined
                    }
                    leading={
                      player.teamFifaCode ? (
                        <TeamFlag
                          fifaCode={player.teamFifaCode}
                          teamName={player.teamName ?? undefined}
                          variant="badge"
                          className="saved-item-flag"
                        />
                      ) : (
                        <Bookmark size={16} strokeWidth={2} aria-hidden="true" />
                      )
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}
