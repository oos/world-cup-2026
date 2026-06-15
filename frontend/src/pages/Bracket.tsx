import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type Match, type Team } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { WorldCup2026KnockoutBracket } from "../components/WorldCup2026KnockoutBracket";
import { buildWorldCup2026Bracket } from "../utils/worldCup2026Bracket";
import { WC_2026_PATH } from "../config/appNav";

export function Bracket() {
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

  const bracket = useMemo(
    () => buildWorldCup2026Bracket(matches, teams),
    [matches, teams]
  );

  const playedKnockout = bracket.rounds.reduce(
    (count, round) => count + round.matches.filter((match) => match.isPlayed).length,
    0
  );

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (loading) return <div className="loading">Loading knockout bracket…</div>;

  return (
    <>
      <PageHeader
        title="World Cup 2026 bracket"
        subtitle={`Knockout path from the Round of 32 to the final · ${playedKnockout} results in`}
        accent="var(--palette-navy)"
      />

      <p className="guide-section-copy">
        Slots fill in as the group stage finishes and knockout results are confirmed. Want to
        predict your own path?{" "}
        <Link to={WC_2026_PATH}>Try the bracket predictor on the 2026 hub</Link>.
      </p>

      <WorldCup2026KnockoutBracket
        rounds={bracket.rounds}
        thirdPlaceMatch={bracket.thirdPlaceMatch}
      />

      <AdBanner />
    </>
  );
}
