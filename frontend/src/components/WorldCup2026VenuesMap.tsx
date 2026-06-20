import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";
import { slugifyTrackName } from "../ads/buttonTracking";
import type { Match } from "../api/client";
import { DashboardMatchCard } from "./DashboardMatchCard";
import {
  getFinalPlannerVenue,
  getHostCountryMapColors,
  getVenueMapDisplayLabel,
  getVenueMapLabelMetrics,
  groupMatchesByVenue,
  isHostCountry,
  WC26_VENUE_COORDINATES,
} from "../utils/worldCup2026Venues";
import { WC26_PLANNER_VENUES, type PlannerVenue } from "../utils/worldCup2026Planner";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const BASE_MAP_SCALE = 620;
const MIN_MAP_SCALE = 420;
const MAX_MAP_SCALE = 1100;
const MAP_SCALE_STEP = 90;
const DEFAULT_MAP_SCALE = BASE_MAP_SCALE - MAP_SCALE_STEP;
const DEFAULT_MAP_CENTER: [number, number] = [-98, 38];

type MapDragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startCenter: [number, number];
  moved: boolean;
};

function getMapPanFactors(scale: number) {
  const scaleRatio = DEFAULT_MAP_SCALE / scale;
  return {
    lon: 0.38 * scaleRatio,
    lat: 0.24 * scaleRatio,
  };
}

export function WorldCup2026VenuesMap({ matches }: { matches: Match[] }) {
  const [selectedVenue, setSelectedVenue] = useState<PlannerVenue | null>(
    () => getFinalPlannerVenue(matches) ?? "New York"
  );
  const [mapScale, setMapScale] = useState(DEFAULT_MAP_SCALE);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_MAP_CENTER);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<MapDragState | null>(null);
  const suppressMarkerClickRef = useRef(false);
  const matchesByVenue = useMemo(() => groupMatchesByVenue(matches), [matches]);

  const venueMatches = selectedVenue ? matchesByVenue.get(selectedVenue) ?? [] : [];
  const orderedVenues = useMemo(() => {
    if (!selectedVenue) return WC26_PLANNER_VENUES;
    return [
      ...WC26_PLANNER_VENUES.filter((venue) => venue !== selectedVenue),
      selectedVenue,
    ];
  }, [selectedVenue]);

  const toggleVenue = (venue: PlannerVenue) => {
    setSelectedVenue((current) => (current === venue ? null : venue));
  };

  const handleMapPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if ((event.target as Element).closest(".wc26-venues-map-marker")) return;
    if ((event.target as Element).closest(".wc26-venues-map-zoom")) return;

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startCenter: mapCenter,
      moved: false,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handleMapPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      drag.moved = true;
      suppressMarkerClickRef.current = true;
    }

    const { lon, lat } = getMapPanFactors(mapScale);
    setMapCenter([
      drag.startCenter[0] - dx * lon,
      drag.startCenter[1] + dy * lat,
    ]);
  };

  const finishMapDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    dragStateRef.current = null;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    window.setTimeout(() => {
      suppressMarkerClickRef.current = false;
    }, 0);
  };

  return (
    <section className="wc26-venues-map" aria-label="World Cup 2026 stadium locations">
      <div
        className={`wc26-venues-map-canvas${isDragging ? " is-dragging" : " is-pannable"}`}
        onPointerDown={handleMapPointerDown}
        onPointerMove={handleMapPointerMove}
        onPointerUp={finishMapDrag}
        onPointerCancel={finishMapDrag}
      >
        <div className="wc26-venues-map-zoom" role="group" aria-label="Map zoom">
          <button
            type="button"
            className="wc26-venues-map-zoom-btn"
            aria-label="Zoom in"
            disabled={mapScale >= MAX_MAP_SCALE}
            data-track-button="map_zoom_in"
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
            data-track-button="map_zoom_out"
            onClick={() =>
              setMapScale((scale) => Math.max(MIN_MAP_SCALE, scale - MAP_SCALE_STEP))
            }
          >
            <ZoomOut size={18} strokeWidth={2} />
          </button>
        </div>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ center: mapCenter, scale: mapScale }}
          className="wc26-venues-map-svg"
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const name = String(geo.properties?.name ?? "");
                const isHost = isHostCountry(name);
                const colors = getHostCountryMapColors(name);

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth={isHost ? 0.45 : 0.25}
                    style={{
                      default: { outline: "none" },
                      hover: {
                        fill: colors.hoverFill,
                        outline: "none",
                      },
                      pressed: { outline: "none" },
                    }}
                  />
                );
              })
            }
          </Geographies>

          {orderedVenues.map((venue) => {
            const coordinates = WC26_VENUE_COORDINATES[venue];
            const matchCount = matchesByVenue.get(venue)?.length ?? 0;
            const isSelected = selectedVenue === venue;
            const label = getVenueMapDisplayLabel(venue);

            return (
              <Marker key={`${venue}-pin`} coordinates={coordinates}>
                <g
                  className={`wc26-venues-map-marker${isSelected ? " is-selected" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`${label}, ${matchCount} fixtures`}
                  data-track-button={`venue_${slugifyTrackName(venue)}`}
                  onClick={() => {
                    if (suppressMarkerClickRef.current) return;
                    toggleVenue(venue);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleVenue(venue);
                    }
                  }}
                >
                  <circle
                    r={isSelected ? 22 : 18}
                    className="wc26-venues-map-marker-dot"
                  />
                </g>
              </Marker>
            );
          })}

          {orderedVenues.map((venue) => {
            const coordinates = WC26_VENUE_COORDINATES[venue];
            const isSelected = selectedVenue === venue;
            const { lines, offset, fontSize, lineHeight, box, leader } = getVenueMapLabelMetrics(
              venue,
              isSelected
            );
            const startY = offset.dy - ((lines.length - 1) * lineHeight) / 2;

            return (
              <Marker key={`${venue}-label`} coordinates={coordinates}>
                <g pointerEvents="none" aria-hidden="true">
                  <line
                    x1={leader.x1}
                    y1={leader.y1}
                    x2={leader.x2}
                    y2={leader.y2}
                    className="wc26-venues-map-marker-leader"
                  />
                  <rect
                    x={box.x}
                    y={box.y}
                    width={box.width}
                    height={box.height}
                    rx={4}
                    className={`wc26-venues-map-marker-label-bg${isSelected ? " is-selected" : ""}`}
                  />
                  <text
                    x={offset.dx}
                    y={startY}
                    textAnchor={offset.anchor}
                    dominantBaseline="middle"
                    fontSize={fontSize}
                    className={`wc26-venues-map-marker-label${isSelected ? " is-selected" : ""}`}
                  >
                    {lines[0]}
                  </text>
                </g>
              </Marker>
            );
          })}
        </ComposableMap>
      </div>

      {selectedVenue ? (
        <div className="wc26-venues-map-clear-row">
          <button
            type="button"
            className="btn btn-secondary wc26-venues-map-clear"
            onClick={() => setSelectedVenue(null)}
            data-track-button="clear_venue_selection"
          >
            Clear selection
          </button>
        </div>
      ) : null}

      {selectedVenue ? (
        <div className="wc26-venues-map-matches">
          <h3 className="wc26-venues-map-matches-title">
            {selectedVenue}
            <span className="wc26-venues-map-matches-count">
              {venueMatches.length} {venueMatches.length === 1 ? "fixture" : "fixtures"}
            </span>
          </h3>
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
      ) : (
        <p className="wc26-venues-map-hint">Select a city on the map to view its fixtures.</p>
      )}
    </section>
  );
}
