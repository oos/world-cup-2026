import { useEffect, useMemo, useState } from "react";
import { AdBanner } from "../ads/AdBanner";
import { api, type Match } from "../api/client";
import { DashboardMatchCard } from "../components/DashboardMatchCard";
import { PageHeader } from "../components/PageHeader";
import { SegmentedTabs } from "../components/SegmentedTabs";
import { WorldCup2026VenuesMap } from "../components/WorldCup2026VenuesMap";
import { groupMatchesByVenue } from "../utils/worldCup2026Venues";
import { groupVenuesByCountry } from "../utils/worldCup2026Stadiums";
import { WC26_PLANNER_VENUES } from "../utils/worldCup2026Planner";

type VenuesView = "map" | "list";

export function Venues() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<VenuesView>("map");

  useEffect(() => {
    api
      .getMatches()
      .then((response) => setMatches(response.matches))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const matchesByVenue = useMemo(() => groupMatchesByVenue(matches), [matches]);
  const venuesByCountry = useMemo(
    () => groupVenuesByCountry(WC26_PLANNER_VENUES),
    []
  );

  if (error) return <div className="error">Failed to load: {error}</div>;
  if (loading) return <div className="loading">Loading host cities…</div>;

  return (
    <>
      <PageHeader
        title="World Cup 2026 host cities"
        subtitle={`${WC26_PLANNER_VENUES.length} stadium cities across the US, Canada, and Mexico`}
        accent="var(--palette-green)"
      />

      <div className="venues-tabs">
        <SegmentedTabs
          ariaLabel="Venue views"
          tabs={[
            { id: "map", label: "Map" },
            { id: "list", label: "List" },
          ]}
          value={activeView}
          onChange={setActiveView}
        />

        {activeView === "map" ? (
          <div role="tabpanel" aria-label="Map">
            <WorldCup2026VenuesMap matches={matches} />
          </div>
        ) : (
          <div role="tabpanel" aria-label="List">
            <div className="venues-list-by-country">
              {venuesByCountry.map(({ country, venues }) => (
                <section key={country} className="venues-country-section">
                  <h2 className="venues-country-heading">{country}</h2>
                  <div className="venues-accordions history-accordions">
                    {venues.map((venue) => {
                      const venueMatches = matchesByVenue.get(venue) ?? [];
                      return (
                        <details key={venue} className="history-year-accordion venues-accordion">
                          <summary className="history-accordion-summary">
                            <span className="history-accordion-heading">
                              <span className="history-accordion-title">{venue}</span>
                            </span>
                            <span className="history-accordion-meta">
                              {venueMatches.length} fixture{venueMatches.length === 1 ? "" : "s"}
                            </span>
                          </summary>
                          <div className="venues-accordion-body">
                            {venueMatches.length === 0 ? (
                              <p className="empty-state">No fixtures scheduled at this venue yet.</p>
                            ) : (
                              <div className="home-match-list">
                                {venueMatches.map((match) => (
                                  <DashboardMatchCard key={match.id} match={match} />
                                ))}
                              </div>
                            )}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>

      <AdBanner />
    </>
  );
}
