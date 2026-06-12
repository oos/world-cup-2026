import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type MatchDetail as MatchDetailType } from "../api/client";
import { MatchCard } from "../components/MatchCard";
import { PageHeaderActions } from "../components/PageHeader";
import { PredictedLineup } from "../components/PredictedLineup";
import { SegmentedTabs } from "../components/SegmentedTabs";
import { useBackPath } from "../hooks/useNavigation";

type TeamTab = "team1" | "team2";

export function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const returnTo = useBackPath("/matches");
  const [match, setMatch] = useState<MatchDetailType | null>(null);
  const [activeTeam, setActiveTeam] = useState<TeamTab>("team1");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .getMatch(Number(id))
      .then(setMatch)
      .catch((e) => setError(e.message));
  }, [id]);

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

  const activeLineup = match.predicted_lineups[activeTeam];

  return (
    <>
      <Link to={returnTo} className="back-link">
        ← Matches
      </Link>
      <div className="page-header-row page-header-row--end">
        <PageHeaderActions />
      </div>
      <MatchCard match={match} linked={false} />
      {tabs.length > 0 ? (
        <>
          <h2 className="section-title">Predicted lineups</h2>
          <SegmentedTabs
            ariaLabel="Team lineups"
            tabs={tabs}
            value={activeTeam}
            onChange={setActiveTeam}
          />
          {activeLineup ? (
            <PredictedLineup lineup={activeLineup} />
          ) : (
            <p className="empty-state">Lineup not available for this team.</p>
          )}
        </>
      ) : (
        <p className="empty-state">Teams not yet confirmed for this match.</p>
      )}
      <AdBanner />
    </>
  );
}
