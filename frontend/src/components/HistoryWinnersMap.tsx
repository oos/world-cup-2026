import { useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";
import type { HistoryMatch } from "../api/client";
import { TeamFlag } from "./TeamFlag";
import {
  splitLegendColumns,
  WinnersChartLegend,
  WinnersChartLegendColumns,
} from "./WinnersChartLegend";
import { formatChartAccordionMeta } from "../utils/historyChartMeta";
import {
  TEAM_MAP_COORDINATES,
  buildWorldCupWinnerCounts,
  getTeamFromGeoName,
  getTeamMapLabelOffset,
  winnerFill,
} from "../utils/worldCupWinnerCounts";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const MAP_WIDTH = 800;
const MAP_HEIGHT = 360;
const MAP_PROJECTION = {
  scale: 165,
  center: [0, 8] as [number, number],
};

function isWinnersMapCountry(name: string) {
  return name !== "Antarctica";
}

export function HistoryWinnersMap({
  matches,
  rangeLabel,
}: {
  matches: HistoryMatch[];
  rangeLabel: string;
}) {
  const winners = useMemo(() => buildWorldCupWinnerCounts(matches), [matches]);
  const [leftLegendWinners, rightLegendWinners] = useMemo(
    () => splitLegendColumns(winners),
    [winners]
  );
  const winnerCountByTeam = useMemo(
    () => new Map(winners.map((entry) => [entry.team, entry.count])),
    [winners]
  );

  if (winners.length === 0) {
    return null;
  }

  return (
    <details className="history-chart-accordion history-year-accordion">
      <summary className="history-accordion-summary">
        <span className="history-accordion-title">Winners by Year (Map)</span>
        <span className="history-accordion-meta">
          {formatChartAccordionMeta(rangeLabel, winners.length, "country", "countries")}
        </span>
      </summary>
      <div className="history-chart-body">
        <section
          className="history-chart history-winners-map"
          aria-label="World Cup winners map"
        >
          <div className="history-winners-map-canvas">
            <ComposableMap
              projection="geoNaturalEarth1"
              projectionConfig={MAP_PROJECTION}
              width={MAP_WIDTH}
              height={MAP_HEIGHT}
              className="history-winners-map-svg"
            >
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies
                    .filter((geo) =>
                      isWinnersMapCountry(String(geo.properties?.name ?? ""))
                    )
                    .map((geo) => {
                    const team = getTeamFromGeoName(String(geo.properties?.name ?? ""));
                    const count = team ? winnerCountByTeam.get(team) ?? 0 : 0;

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={count > 0 && team ? winnerFill(team) : "var(--history-map-land)"}
                        stroke="var(--history-map-border)"
                        strokeWidth={0.4}
                        style={{
                          default: { outline: "none" },
                          hover: {
                            fill:
                              count > 0 && team
                                ? winnerFill(team)
                                : "var(--history-map-land-hover)",
                            outline: "none",
                            cursor: count > 0 ? "pointer" : "default",
                          },
                          pressed: { outline: "none" },
                        }}
                      >
                        <title>
                          {team && count > 0
                            ? `${team}: ${count} ${count === 1 ? "title" : "titles"}`
                            : String(geo.properties?.name ?? "")}
                        </title>
                      </Geography>
                    );
                  })
                }
              </Geographies>

              {winners.map((entry) => {
                const coordinates = TEAM_MAP_COORDINATES[entry.team];
                if (!coordinates) return null;

                const labelOffset = getTeamMapLabelOffset(entry.team);
                const teamColor = winnerFill(entry.team);

                return (
                  <Marker key={entry.team} coordinates={coordinates}>
                    <g className="history-winners-map-marker">
                      <circle
                        r={4}
                        fill={teamColor}
                        stroke="var(--bg-card)"
                        strokeWidth={1.5}
                      />
                      <text
                        x={labelOffset.dx}
                        y={labelOffset.dy}
                        textAnchor={labelOffset.anchor}
                        dominantBaseline="middle"
                        className="history-winners-map-marker-label"
                        stroke="var(--bg-card)"
                        strokeWidth={4}
                        paintOrder="stroke"
                      >
                        {entry.count}
                      </text>
                      <title>
                        {entry.team}: {entry.count}{" "}
                        {entry.count === 1 ? "title" : "titles"} ({entry.years.join(", ")})
                      </title>
                    </g>
                  </Marker>
                );
              })}
            </ComposableMap>
          </div>

          <WinnersChartLegend>
            <WinnersChartLegendColumns
              left={leftLegendWinners.map((entry) => (
                <div key={entry.team} className="history-winners-map-legend-item">
                  <span
                    className="history-winners-map-legend-swatch"
                    style={{ background: winnerFill(entry.team) }}
                  />
                  <span className="history-winners-map-legend-name">{entry.team}</span>
                  <TeamFlag teamName={entry.team} variant="badge" className="history-year-podium-flag" />
                  <span className="history-winners-map-legend-count">{entry.count}</span>
                </div>
              ))}
              right={rightLegendWinners.map((entry) => (
                <div key={entry.team} className="history-winners-map-legend-item">
                  <span
                    className="history-winners-map-legend-swatch"
                    style={{ background: winnerFill(entry.team) }}
                  />
                  <span className="history-winners-map-legend-name">{entry.team}</span>
                  <TeamFlag teamName={entry.team} variant="badge" className="history-year-podium-flag" />
                  <span className="history-winners-map-legend-count">{entry.count}</span>
                </div>
              ))}
            />
          </WinnersChartLegend>
        </section>
      </div>
    </details>
  );
}
