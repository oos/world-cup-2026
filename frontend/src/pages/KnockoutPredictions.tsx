import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type Match, type Team } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { WorldCup2026PredictionBracket } from "../components/WorldCup2026PredictionBracket";
import { WC_2026_PATH } from "../config/appNav";
import { usePageMeta } from "../hooks/usePageMeta";

export function KnockoutPredictions() {
  usePageMeta(
    "World Cup 2026 Knockout Predictions",
    "Predict knockout winners from the Round of 32 through to the final",
  );

  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getTeams(), api.getMatches()])
      .then(([teamsRes, matchesRes]) => {
        setTeams(teamsRes.teams);
        setMatches(matchesRes.matches);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const knockoutMeta = useMemo(() => {
    const knockoutCount = matches.filter(
      (match) => match.round && !match.round.startsWith("Matchday")
    ).length;
    return `${knockoutCount} knockout fixtures`;
  }, [matches]);

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (loading) return <div className="loading">Loading knockout predictions…</div>;

  return (
    <>
      <Link to={WC_2026_PATH} className="back-link">
        ← 2026 World Cup
      </Link>

      <PageHeader
        title="Knockout predictions"
        subtitle={`Pick winners through the bracket · ${knockoutMeta}`}
        accent="var(--palette-orange)"
        showActions={false}
      />

      <WorldCup2026PredictionBracket matches={matches} teams={teams} />

      <AdBanner />
    </>
  );
}
