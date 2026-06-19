import { useMemo, type SyntheticEvent } from "react";
import type { HistoryMatch } from "../api/client";
import { TeamFlag } from "./TeamFlag";
import { getTeamFlagUrl } from "../utils/teamFlag";
import {
  splitLegendColumns,
  WinnersChartLegend,
  WinnersChartLegendColumns,
} from "./WinnersChartLegend";
import { formatChartAccordionMeta } from "../utils/historyChartMeta";
import {
  buildWorldCupWinnerSankey,
  winnerSankeyRibbonPath,
  type WinnerSankeyLayout,
} from "../utils/worldCupWinnerSankey";

type HistoryWinnersSankeyProps = {
  matches: HistoryMatch[];
  rangeLabel: string;
  includeYear?: number;
  collapsible?: boolean;
  showLegend?: boolean;
  panelId?: string;
  open?: boolean;
  onToggle?: (event: SyntheticEvent<HTMLDetailsElement>) => void;
};

export function HistoryWinnersSankey({
  matches,
  rangeLabel,
  includeYear,
  collapsible = true,
  showLegend = true,
  panelId,
  open,
  onToggle,
}: HistoryWinnersSankeyProps) {
  const layout = useMemo(
    () => buildWorldCupWinnerSankey(matches, { includeYear }),
    [matches, includeYear]
  );
  const currentYear = Number(rangeLabel);

  const legendTeams = useMemo(() => {
    if (!layout || !showLegend) return [];
    return [...layout.teams].sort(
      (a, b) => b.wins - a.wins || a.team.localeCompare(b.team)
    );
  }, [layout, showLegend]);

  const [leftLegendTeams, rightLegendTeams] = useMemo(
    () => splitLegendColumns(legendTeams),
    [legendTeams]
  );

  if (!layout) {
    return null;
  }

  const chart = (
    <WinnersSankeyChart
      layout={layout}
      currentYear={currentYear}
      leftLegendTeams={leftLegendTeams}
      rightLegendTeams={rightLegendTeams}
      showLegend={showLegend}
    />
  );

  if (!collapsible) {
    return <div className="history-chart-body history-chart-body--static">{chart}</div>;
  }

  return (
    <details
      id={panelId}
      className="history-chart-accordion history-year-accordion"
      open={open}
      onToggle={onToggle}
    >
      <summary className="history-accordion-summary">
        <span className="history-accordion-title">Winners by Year</span>
        <span className="history-accordion-meta">
          {formatChartAccordionMeta(rangeLabel, layout.teams.length, "country", "countries")}
        </span>
      </summary>
      <div className="history-chart-body">{chart}</div>
    </details>
  );
}

function WinnersSankeyChart({
  layout,
  currentYear,
  leftLegendTeams,
  rightLegendTeams,
  showLegend,
}: {
  layout: WinnerSankeyLayout;
  currentYear: number;
  leftLegendTeams: WinnerSankeyLayout["teams"];
  rightLegendTeams: WinnerSankeyLayout["teams"];
  showLegend: boolean;
}) {
  const {
    teams,
    years,
    links,
    width,
    height,
    sourceX,
    targetX,
    nodeWidth,
    flagX,
    flagWidth,
    flagHeight,
    yearLabelX,
    axisLabelY,
    yearLabelFontSize,
    yearLabelCurrentFontSize,
  } = layout;

  return (
    <section
      className="history-chart history-winners-sankey"
      aria-label="World Cup winners by year"
    >
      <div className="history-winners-sankey-canvas">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="history-winners-sankey-svg"
          role="img"
          aria-label="Sankey diagram of World Cup winners by year"
        >
          <text
            x={yearLabelX}
            y={axisLabelY}
            textAnchor="start"
            dominantBaseline="middle"
            fontWeight="bold"
            className="history-winners-sankey-axis-label"
          >
            YEAR
          </text>

          {links.map((link) => {
            const isCurrentYearLink =
              !Number.isNaN(currentYear) && link.year === currentYear;

            return (
              <path
                key={`${link.team}-${link.year}`}
                d={winnerSankeyRibbonPath(link, layout)}
                fill={link.color}
                fillOpacity={isCurrentYearLink ? 0.92 : 0.55}
                className={`history-winners-sankey-link${
                  isCurrentYearLink ? " history-winners-sankey-link--current" : ""
                }`}
              >
                <title>
                  {link.team} won in {link.year}
                </title>
              </path>
            );
          })}

          {teams.map((team) => {
            const flagUrl = getTeamFlagUrl(null, team.team);
            const flagY = (team.y0 + team.y1) / 2 - flagHeight / 2;

            const flagClipId = `history-winners-sankey-flag-${team.team.replace(/[^a-z0-9]+/gi, "-")}`;

            return (
              <g key={team.team}>
                <defs>
                  <clipPath id={flagClipId}>
                    <rect
                      x={flagX}
                      y={flagY}
                      width={flagWidth}
                      height={flagHeight}
                      rx={2}
                    />
                  </clipPath>
                </defs>
                <rect
                  x={sourceX}
                  y={team.y0}
                  width={nodeWidth}
                  height={team.y1 - team.y0}
                  fill={team.color}
                  rx={2}
                />
                {flagUrl ? (
                  <image
                    href={flagUrl}
                    x={flagX}
                    y={flagY}
                    width={flagWidth}
                    height={flagHeight}
                    clipPath={`url(#${flagClipId})`}
                    className="history-winners-sankey-team-flag"
                    preserveAspectRatio="xMidYMid slice"
                  >
                    <title>{team.team}</title>
                  </image>
                ) : (
                  <rect
                    x={flagX}
                    y={flagY}
                    width={flagWidth}
                    height={flagHeight}
                    fill={team.color}
                    rx={2}
                  >
                    <title>{team.team}</title>
                  </rect>
                )}
              </g>
            );
          })}

          {years.map((yearNode) => {
            const isCurrentYear =
              !Number.isNaN(currentYear) && yearNode.year === currentYear;

            return (
              <g
                key={yearNode.year}
                className={
                  isCurrentYear ? "history-winners-sankey-year--current" : undefined
                }
              >
                <rect
                  x={targetX}
                  y={yearNode.y0}
                  width={nodeWidth}
                  height={yearNode.y1 - yearNode.y0}
                  fill={
                    yearNode.team
                      ? winnerSankeyTeamColor(yearNode.team, teams)
                      : "var(--bg-elevated)"
                  }
                  stroke={isCurrentYear ? "var(--accent)" : "var(--border)"}
                  strokeWidth={isCurrentYear ? 2 : yearNode.team ? 0 : 1}
                  rx={2}
                />
                <text
                  x={yearLabelX}
                  y={yearNode.centerY}
                  textAnchor="start"
                  dominantBaseline="central"
                  alignmentBaseline="central"
                  fontSize={isCurrentYear ? yearLabelCurrentFontSize : yearLabelFontSize}
                  className={`history-winners-sankey-year-label${
                    isCurrentYear ? " history-winners-sankey-year-label--current" : ""
                  }`}
                >
                  {yearNode.year}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {showLegend && (
        <WinnersChartLegend>
          <WinnersChartLegendColumns
            left={leftLegendTeams.map((team) => (
              <div key={team.team} className="history-winners-sankey-legend-item">
                <span
                  className="history-winners-sankey-legend-swatch"
                  style={{ background: team.color }}
                />
                <span className="history-winners-sankey-legend-name">{team.team}</span>
                <TeamFlag teamName={team.team} variant="badge" className="history-year-podium-flag" />
                <span className="history-winners-sankey-legend-count">{team.wins}</span>
              </div>
            ))}
            right={rightLegendTeams.map((team) => (
              <div key={team.team} className="history-winners-sankey-legend-item">
                <span
                  className="history-winners-sankey-legend-swatch"
                  style={{ background: team.color }}
                />
                <span className="history-winners-sankey-legend-name">{team.team}</span>
                <TeamFlag teamName={team.team} variant="badge" className="history-year-podium-flag" />
                <span className="history-winners-sankey-legend-count">{team.wins}</span>
              </div>
            ))}
          />
        </WinnersChartLegend>
      )}
    </section>
  );
}

function winnerSankeyTeamColor(
  team: string,
  teams: Array<{ team: string; color: string }>
) {
  return teams.find((entry) => entry.team === team)?.color ?? "var(--bg-elevated)";
}
