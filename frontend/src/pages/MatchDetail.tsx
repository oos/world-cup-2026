import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type MatchDetail as MatchDetailType } from "../api/client";
import { MatchCard } from "../components/MatchCard";
import { MatchLineup } from "../components/MatchLineup";
import { PageHeaderActions } from "../components/PageHeader";
import { SegmentedTabs } from "../components/SegmentedTabs";
import { FIXTURES_PATH } from "../config/appNav";
import { useBackPath } from "../hooks/useNavigation";
import { useMatchRefresh } from "../hooks/useMatchRefresh";
import { isMatchInPlay } from "../utils/matchTime";

type TeamTab = "team1" | "team2";

export function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const returnTo = useBackPath(FIXTURES_PATH);
  const [match, setMatch] = useState<MatchDetailType | null>(null);
  const [activeTeam, setActiveTeam] = useState<TeamTab>("team1");
  const [error, setError] = useState<string | null>(null);

  const loadMatch = useCallback(() => {
    if (!id) return Promise.resolve();
    return api
      .getMatch(Number(id))
      .then(setMatch)
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    void loadMatch();
  }, [loadMatch]);

  const shouldPoll = match ? isMatchInPlay(match.date, match.time, match.score) : false;
  useMatchRefresh(loadMatch, shouldPoll);

  const tabs = useMemo(() => {
    if (!match) return [];
    const items: { id: TeamTab; label: string }[] = [];
    if (match.team1) {
      items.push({ id: "team1", label: match.team1.name });
    }
    if (match.team2) {
      items.push({ id: "team2", label: match.team2.name });
    }
    return items;
  }, [match]);

  useEffect(() => {
    if (tabs.length > 0 && !tabs.some((tab) => tab.id === activeTeam)) {
      setActiveTeam(tabs[0].id);
    }
  }, [tabs, activeTeam]);

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (!match) return <div className="loading">Loading match…</div>;

  const activeLineup = match.lineups[activeTeam];
  const hasLineupData = match.lineups.status === "available";

  return (
    <>
      <Link to={returnTo} className="back-link">
        ← Fixtures
      </Link>
      <PageHeaderActions />
      <MatchCard match={match} linked={false} showBookmark liveRefresh={false} />
      {tabs.length > 0 ? (
        <>
          <h2 className="section-title">Lineups</h2>
          {hasLineupData ? (
            <>
              <SegmentedTabs
                ariaLabel="Team lineups"
                tabs={tabs}
                value={activeTeam}
                onChange={setActiveTeam}
              />
              {activeLineup ? (
                <MatchLineup lineup={activeLineup} />
              ) : (
                <p className="empty-state">Lineup not available for this team.</p>
              )}
            </>
          ) : match.lineups.status === "pending" ? (
            <p className="lineup-pending-notice">
              Official lineups are usually published about an hour before kickoff. Check
              back closer to the match.
            </p>
          ) : (
            <p className="empty-state">Lineups are not available for this match.</p>
          )}
        </>
      ) : (
        <p className="empty-state">Teams not yet confirmed for this match.</p>
      )}
      <AdBanner />
    </>
  );
}
