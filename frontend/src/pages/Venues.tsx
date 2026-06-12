import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AdBanner } from "../ads/AdBanner";
import { api, type Match } from "../api/client";
import { PageHeader } from "../components/PageHeader";
import { WorldCup2026VenuesMap } from "../components/WorldCup2026VenuesMap";
import { groupMatchesByVenue } from "../utils/worldCup2026Venues";
import { WC26_PLANNER_VENUES } from "../utils/worldCup2026Planner";

export function Venues() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getMatches()
      .then((response) => setMatches(response.matches))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const matchesByVenue = useMemo(() => groupMatchesByVenue(matches), [matches]);

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (loading) return <div className="loading">Loading host cities…</div>;

  return (
    <>
      <PageHeader
        title="World Cup 2026 host cities"
        subtitle={`${WC26_PLANNER_VENUES.length} stadium cities across the United States, Canada, and Mexico`}
        accent="var(--palette-green)"
      />

      <WorldCup2026VenuesMap matches={matches} />

      <h2 className="section-title">All host cities</h2>
      <div className="profile-card venues-list">
        {WC26_PLANNER_VENUES.map((venue) => {
          const venueMatches = matchesByVenue.get(venue) ?? [];
          return (
            <div key={venue} className="venues-list-row">
              <div>
                <div className="venues-list-name">{venue}</div>
                <div className="venues-list-meta">
                  {venueMatches.length} fixture{venueMatches.length === 1 ? "" : "s"}
                </div>
              </div>
              {venueMatches.length > 0 ? (
                <Link to="/schedule" className="venues-list-link">
                  View schedule
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>

      <AdBanner />
    </>
  );
}
