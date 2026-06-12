import { Bookmark, ChevronRight, UserRound } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api, type Match } from "../api/client";
import { MatchCard } from "../components/MatchCard";
import { TeamFlag } from "../components/TeamFlag";
import { useSavedItems } from "../hooks/useSavedItems";
import { useViewingMatches } from "../hooks/useViewingMatches";
import { getMatchSortKey } from "../utils/matchTime";

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
  const { matchIds } = useViewingMatches();
  const [savedMatches, setSavedMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);

  useEffect(() => {
    if (matchIds.length === 0) {
      setSavedMatches([]);
      setMatchesLoading(false);
      setMatchesError(null);
      return;
    }

    setMatchesLoading(true);
    setMatchesError(null);
    api
      .getMatches()
      .then((response) => {
        const matchIdSet = new Set(matchIds);
        setSavedMatches(response.matches.filter((match) => matchIdSet.has(match.id)));
      })
      .catch((e) => setMatchesError(e.message))
      .finally(() => setMatchesLoading(false));
  }, [matchIds]);

  const sortedSavedMatches = useMemo(
    () =>
      [...savedMatches].sort(
        (a, b) => getMatchSortKey(a.date, a.time) - getMatchSortKey(b.date, b.time),
      ),
    [savedMatches],
  );

  const hasItems =
    teams.length > 0 || players.length > 0 || sortedSavedMatches.length > 0;
  const pageLoading =
    (loading || (matchIds.length > 0 && matchesLoading)) && !hasItems;

  return (
    <>
      <h1 className="page-title">Saved items</h1>
      <p className="page-subtitle">Matches, teams, and players you have saved</p>

      {pageLoading ? (
        <div className="profile-card">
          <p className="saved-items-loading">Loading saved items…</p>
        </div>
      ) : !hasItems ? (
        <div className="profile-card">
          <div className="profile-empty">
            <UserRound size={28} strokeWidth={1.75} aria-hidden="true" />
            <p>No saved items yet.</p>
            <Link to="/matches" className="profile-link">
              Browse matches
              <ChevronRight size={16} strokeWidth={2.25} aria-hidden="true" />
            </Link>
            <Link to="/teams" className="profile-link">
              Browse teams
              <ChevronRight size={16} strokeWidth={2.25} aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="saved-items-sections">
          {matchIds.length > 0 ? (
            <section className="profile-section">
              <h2 className="profile-section-title">Matches</h2>
              {matchesError ? (
                <div className="error">Failed to load saved matches: {matchesError}</div>
              ) : matchesLoading ? (
                <div className="profile-card">
                  <p className="saved-items-loading">Loading saved matches…</p>
                </div>
              ) : sortedSavedMatches.length > 0 ? (
                <div className="viewing-matches-list">
                  {sortedSavedMatches.map((match) => (
                    <MatchCard key={match.id} match={match} showDate={false} />
                  ))}
                </div>
              ) : (
                <div className="profile-card">
                  <p className="saved-items-loading">
                    Your saved matches could not be found.
                  </p>
                </div>
              )}
            </section>
          ) : null}

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
