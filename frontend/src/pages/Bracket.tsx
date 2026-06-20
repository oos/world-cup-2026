import { useEffect, useMemo, useState } from "react";
import { AdBanner } from "../ads/AdBanner";
import { api, type Match, type Team } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { UiButton } from "../components/UiButton";
import { WorldCup2026KnockoutBracket } from "../components/WorldCup2026KnockoutBracket";
import { buildWorldCup2026Bracket } from "../utils/worldCup2026Bracket";
import { usePageMeta } from "../hooks/usePageMeta";
import { useReturnToLink } from "../hooks/useNavigation";

export function Bracket() {
  usePageMeta(
    "World Cup 2026 Knockout Bracket",
    "Round of 32 through to the final",
  );

  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyExpanded, setCopyExpanded] = useState(false);
  const predictorLink = useReturnToLink("/knockout-predictions");

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

  const hasProvisionalTeams = useMemo(() => {
    const allMatches = [
      ...bracket.rounds.flatMap((round) => round.matches),
      ...(bracket.thirdPlaceMatch ? [bracket.thirdPlaceMatch] : []),
    ];
    return allMatches.some(
      (match) =>
        !match.isPlayed && (match.team1.isProvisional || match.team2.isProvisional)
    );
  }, [bracket]);

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
        {hasProvisionalTeams ? (
          <>
            Teams below reflect <strong>current group standings</strong>.{" "}
            {copyExpanded ? (
              <>
                Positions can still change until the group stage ends, and third-place slots
                stay as placeholders until FIFA confirms the eight best third-place teams.{" "}
                <button
                  type="button"
                  className="inline-read-more"
                  onClick={() => setCopyExpanded(false)}
                  data-track-button="bracket_show_less"
                >
                  Show less
                </button>
              </>
            ) : (
              <>
                …{" "}
                <button
                  type="button"
                  className="inline-read-more"
                  onClick={() => setCopyExpanded(true)}
                  data-track-button="bracket_read_more"
                >
                  Read more
                </button>
              </>
            )}
          </>
        ) : (
          <>Slots fill in as the group stage finishes and knockout results are confirmed.</>
        )}
      </p>

      <div className="bracket-predictor-cta">
        <UiButton to={predictorLink} variant="history">
          Knockout Predictor
        </UiButton>
      </div>

      <WorldCup2026KnockoutBracket
        rounds={bracket.rounds}
        thirdPlaceMatch={bracket.thirdPlaceMatch}
      />

      <AdBanner />
    </>
  );
}
