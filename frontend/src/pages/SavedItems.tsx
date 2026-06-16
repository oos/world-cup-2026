import { Bookmark, ChevronRight, UserRound } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type Match } from "../api/client";
import { MatchCard } from "../components/MatchCard";
import { PageHeader } from "../components/PageHeader";
import { TeamFlag } from "../components/TeamFlag";
import { useProfilePreferences } from "../hooks/useProfilePreferences";
import { useSavedItems } from "../hooks/useSavedItems";
import { useViewingMatches } from "../hooks/useViewingMatches";
import { resolveUserTimezone } from "../utils/cityTimezones";
import {
  formatDateHeading,
  getMatchLocalDate,
  getMatchSortKey,
  getTodayLocalDate,
} from "../utils/matchTime";

type SavedMatchScheduleItem =
  | { kind: "heading"; date: string }
  | { kind: "match"; match: Match };

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
  const { preferences } = useProfilePreferences();
  const timeZone = resolveUserTimezone(preferences.city, preferences.timezone);
  const todayLocal = getTodayLocalDate(timeZone);
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

  const matchScheduleItems = useMemo(() => {
    const sorted = [...savedMatches].sort(
      (a, b) => getMatchSortKey(a.date, a.time) - getMatchSortKey(b.date, b.time),
    );

    const items: SavedMatchScheduleItem[] = [];
    let lastDate: string | null = null;

    for (const match of sorted) {
      const localDate = getMatchLocalDate(match.date, match.time, timeZone) ?? match.date;
      if (!localDate) continue;
      if (localDate !== lastDate) {
        items.push({ kind: "heading", date: localDate });
        lastDate = localDate;
      }
      items.push({ kind: "match", match });
    }

    return items;
  }, [savedMatches, timeZone]);

  const hasItems = teams.length > 0 || players.length > 0 || matchIds.length > 0;
  const pageLoading = (loading || (matchIds.length > 0 && matchesLoading)) && !hasItems;

  return (
    <>
      <PageHeader
        title="Saved"
        subtitle="Matches you plan to watch, plus teams and players you have saved."
        accent="var(--palette-teal)"
      />

      {pageLoading ? (
        <div className="profile-card">
          <p className="saved-items-loading">Loading saved items…</p>
        </div>
      ) : !hasItems ? (
        <div className="profile-card">
          <div className="profile-empty">
            <UserRound size={28} strokeWidth={1.75} aria-hidden="true" />
            <p>Nothing saved yet.</p>
            <p className="saved-items-empty-hint">
              Bookmark a match, team, or player to see it here.
            </p>
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
          <section className="profile-section">
            <h2 className="profile-section-title">Viewing matches</h2>
            {matchIds.length === 0 ? (
              <div className="profile-card">
                <p className="saved-items-section-empty">
                  No matches saved yet. Bookmark a match from the schedule to build your watch
                  list.
                </p>
                <Link to="/matches" className="profile-link">
                  Browse matches
                  <ChevronRight size={16} strokeWidth={2.25} aria-hidden="true" />
                </Link>
              </div>
            ) : matchesError ? (
              <div className="error">Failed to load saved matches: {matchesError}</div>
            ) : matchesLoading ? (
              <div className="profile-card">
                <p className="saved-items-loading">Loading saved matches…</p>
              </div>
            ) : matchScheduleItems.length > 0 ? (
              <div className="viewing-matches-list">
                {matchScheduleItems.map((item) =>
                  item.kind === "heading" ? (
                    <h3 key={`heading-${item.date}`} className="match-date-heading">
                      {formatDateHeading(item.date, todayLocal)}
                    </h3>
                  ) : (
                    <MatchCard key={item.match.id} match={item.match} showDate={false} />
                  ),
                )}
              </div>
            ) : (
              <div className="profile-card">
                <p className="saved-items-section-empty">Your saved matches could not be found.</p>
              </div>
            )}
          </section>

          <section className="profile-section">
            <h2 className="profile-section-title">Teams</h2>
            {teams.length > 0 ? (
              <div className="profile-card saved-items-list">
                {teams.map((team) => (
                  <SavedItemLink
                    key={`team-${team.itemId}`}
                    to={`/teams/${team.itemId}?year=2026`}
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
            ) : (
              <div className="profile-card">
                <p className="saved-items-section-empty">
                  No teams saved yet. Bookmark a team from its profile page.
                </p>
                <Link to="/teams" className="profile-link">
                  Browse teams
                  <ChevronRight size={16} strokeWidth={2.25} aria-hidden="true" />
                </Link>
              </div>
            )}
          </section>

          <section className="profile-section">
            <h2 className="profile-section-title">Players</h2>
            {players.length > 0 ? (
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
            ) : (
              <div className="profile-card">
                <p className="saved-items-section-empty">
                  No players saved yet. Bookmark a player from their profile page.
                </p>
                <Link to="/players" className="profile-link">
                  Browse players
                  <ChevronRight size={16} strokeWidth={2.25} aria-hidden="true" />
                </Link>
              </div>
            )}
          </section>
        </div>
      )}

      <AdBanner />
    </>
  );
}
