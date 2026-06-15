import { useMemo, useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";
import type { Match } from "../api/client";
import { MatchCard } from "./MatchCard";
import {
  groupMatchesByVenue,
  isHostCountry,
  WC26_VENUE_COORDINATES,
  WC26_VENUE_MAP_LABELS,
} from "../utils/worldCup2026Venues";
import { WC26_PLANNER_VENUES, type PlannerVenue } from "../utils/worldCup2026Planner";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const DEFAULT_MAP_SCALE = 620;
const MIN_MAP_SCALE = 420;
const MAX_MAP_SCALE = 1100;
const MAP_SCALE_STEP = 90;

export function WorldCup2026VenuesMap({ matches }: { matches: Match[] }) {
  const [selectedVenue, setSelectedVenue] = useState<PlannerVenue | null>(null);
  const [mapScale, setMapScale] = useState(DEFAULT_MAP_SCALE);
  const matchesByVenue = useMemo(() => groupMatchesByVenue(matches), [matches]);

  const venueMatches = selectedVenue ? matchesByVenue.get(selectedVenue) ?? [] : [];

  const toggleVenue = (venue: PlannerVenue) => {
    setSelectedVenue((current) => (current === venue ? null : venue));
  };

  return (
    <section className="wc26-venues-map" aria-label="World Cup 2026 stadium locations">
      {selectedVenue ? (
        <div className="wc26-chart-toolbar">
          <button
            type="button"
            className="btn btn-secondary wc26-venues-map-clear"
            onClick={() => setSelectedVenue(null)}
          >
            Clear selection
          </button>
        </div>
      ) : null}

      <div className="wc26-venues-map-canvas">
        <div className="wc26-venues-map-zoom" role="group" aria-label="Map zoom">
          <button
            type="button"
            className="wc26-venues-map-zoom-btn"
            aria-label="Zoom in"
            disabled={mapScale >= MAX_MAP_SCALE}
            onClick={() =>
              setMapScale((scale) => Math.min(MAX_MAP_SCALE, scale + MAP_SCALE_STEP))
            }
          >
            <ZoomIn size={18} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="wc26-venues-map-zoom-btn"
            aria-label="Zoom out"
            disabled={mapScale <= MIN_MAP_SCALE}
            onClick={() =>
              setMapScale((scale) => Math.max(MIN_MAP_SCALE, scale - MAP_SCALE_STEP))
            }
          >
            <ZoomOut size={18} strokeWidth={2} />
          </button>
        </div>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ center: [-98, 44], scale: mapScale }}
          className="wc26-venues-map-svg"
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const name = String(geo.properties?.name ?? "");
                const isHost = isHostCountry(name);

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={isHost ? "#f9b233" : "#eef1f6"}
                    stroke={isHost ? "#d88912" : "#d5dce8"}
                    strokeWidth={isHost ? 0.45 : 0.25}
                    style={{
                      default: { outline: "none" },
                      hover: {
                        fill: isHost ? "#f7a816" : "#e3e8f0",
                        outline: "none",
                      },
                      pressed: { outline: "none" },
                    }}
                  />
                );
              })
            }
          </Geographies>

          {WC26_PLANNER_VENUES.map((venue) => {
            const coordinates = WC26_VENUE_COORDINATES[venue];
            const matchCount = matchesByVenue.get(venue)?.length ?? 0;
            const isSelected = selectedVenue === venue;
            const label = WC26_VENUE_MAP_LABELS[venue];

            return (
              <Marker key={venue} coordinates={coordinates}>
                <g
                  className={`wc26-venues-map-marker${isSelected ? " is-selected" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`${label}, ${matchCount} matches`}
                  onClick={() => toggleVenue(venue)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleVenue(venue);
                    }
                  }}
                >
                  <circle
                    r={isSelected ? 10 : 8}
                    className="wc26-venues-map-marker-dot"
                  />
                  <text
                    textAnchor="middle"
                    y={-13}
                    className="wc26-venues-map-marker-label"
                  >
                    {label}
                  </text>
                  {matchCount > 0 ? (
                    <text
                      textAnchor="middle"
                      y={19}
                      className="wc26-venues-map-marker-count"
                    >
                      {matchCount}
                    </text>
                  ) : null}
                </g>
              </Marker>
            );
          })}
        </ComposableMap>
      </div>

      {selectedVenue ? (
        <div className="wc26-venues-map-matches">
          <h3 className="wc26-venues-map-matches-title">
            {selectedVenue}
            <span className="wc26-venues-map-matches-count">
              {venueMatches.length} {venueMatches.length === 1 ? "match" : "matches"}
            </span>
          </h3>
          {venueMatches.length === 0 ? (
            <p className="empty-state">No matches scheduled at this venue yet.</p>
          ) : (
            <div className="home-match-list">
              {venueMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="wc26-venues-map-hint">Select a city on the map to view its matches.</p>
      )}
    </section>
  );
}
