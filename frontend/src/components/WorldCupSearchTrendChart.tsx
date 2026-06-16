import { useMemo } from "react";
import type { Team } from "../api/client";
import {
  WORLD_CUP_SEARCH_TREND,
  WORLD_CUP_SEARCH_TREND_SOURCE,
  type SearchTrendPoint,
} from "../config/worldCupSearchTrend";
import {
  buildSquadSearchTrend,
  squadTrendColor,
} from "../utils/squadSearchTrend";

const CHART_WIDTH = 100;
const CHART_HEIGHT = 56;
const PADDING = { top: 6, right: 3, bottom: 14, left: 3 };

type TrendSeries = {
  code: string;
  label: string;
  color: string;
  linePath: string;
  peakValue: number;
};

export type TrendChartInputSeries = {
  id: string;
  label: string;
  color: string;
  points: SearchTrendPoint[];
};

function formatMonthLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  });
}

function buildLinePath(
  points: { value: number }[],
  innerWidth: number,
  innerHeight: number
): string {
  const lastIndex = Math.max(points.length - 1, 1);

  return points
    .map((point, index) => {
      const x = PADDING.left + (index / lastIndex) * innerWidth;
      const y = PADDING.top + (1 - point.value / 100) * innerHeight;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function buildChartSeries(
  inputSeries: TrendChartInputSeries[],
  innerWidth: number,
  innerHeight: number
): TrendSeries[] {
  return inputSeries
    .map((entry) => {
      const peakValue = Math.max(...entry.points.map((point) => point.value));

      return {
        code: entry.id,
        label: entry.label,
        color: entry.color,
        linePath: buildLinePath(entry.points, innerWidth, innerHeight),
        peakValue,
      };
    })
    .sort((a, b) => b.peakValue - a.peakValue || a.label.localeCompare(b.label));
}

function buildSquadInputSeries(teams: Team[]): TrendChartInputSeries[] {
  return [...teams]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((team) => ({
      id: team.fifa_code,
      label: team.name,
      color: squadTrendColor(team.fifa_code),
      points: buildSquadSearchTrend(team.fifa_code),
    }));
}

export function WorldCupSearchTrendChart({
  teams,
  customSeries,
  subtitle,
  hideSubtitle = false,
  showSource = true,
  legendScroll,
}: {
  teams?: Team[];
  customSeries?: TrendChartInputSeries[];
  subtitle?: string;
  hideSubtitle?: boolean;
  showSource?: boolean;
  legendScroll?: boolean;
}) {
  const chart = useMemo(() => {
    const dates = WORLD_CUP_SEARCH_TREND.map((point) => point.date);
    const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
    const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
    const inputSeries = customSeries ?? buildSquadInputSeries(teams ?? []);
    const series = buildChartSeries(inputSeries, innerWidth, innerHeight);

    return {
      series,
      startLabel: formatMonthLabel(dates[0]),
      endLabel: formatMonthLabel(dates[dates.length - 1]),
    };
  }, [teams, customSeries]);

  const resolvedSubtitle =
    subtitle ??
    `Google search interest · past 12 months · worldwide · ${chart.series.length} squads`;
  const scrollLegend = legendScroll ?? chart.series.length > 8;

  return (
    <section
      className="wc26-trend-chart"
      aria-label="Squad search interest trends"
    >
      {!hideSubtitle ? (
        <p className="wc26-trend-chart-subtitle">{resolvedSubtitle}</p>
      ) : null}

      <div className="wc26-trend-chart-canvas">
        <svg
          className="wc26-trend-chart-svg"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Search trend lines for ${chart.series.length} World Cup squads`}
        >
          {[0.25, 0.5, 0.75].map((fraction) => {
            const y =
              PADDING.top +
              (1 - fraction) * (CHART_HEIGHT - PADDING.top - PADDING.bottom);
            return (
              <line
                key={fraction}
                x1={PADDING.left}
                y1={y}
                x2={CHART_WIDTH - PADDING.right}
                y2={y}
                className="wc26-trend-chart-grid"
              />
            );
          })}

          {chart.series.map((entry) => (
            <path
              key={entry.code}
              d={entry.linePath}
              className="wc26-trend-chart-line"
              style={{ stroke: entry.color }}
            />
          ))}
        </svg>

        <div className="wc26-trend-chart-axis">
          <span>{chart.startLabel}</span>
          <span>Search interest index (0–100)</span>
          <span>{chart.endLabel}</span>
        </div>
      </div>

      <div
        className={`wc26-trend-chart-legend${scrollLegend ? " wc26-trend-chart-legend--scroll" : ""}`}
        aria-label="All squads"
      >
        {chart.series.map((entry) => (
          <span key={entry.code} className="wc26-trend-chart-legend-item">
            <span
              className="wc26-trend-chart-legend-swatch"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className="wc26-trend-chart-legend-label">{entry.label}</span>
            <span className="wc26-trend-chart-legend-peak">{entry.peakValue}</span>
          </span>
        ))}
      </div>

      {showSource ? (
        <a
          href={WORLD_CUP_SEARCH_TREND_SOURCE}
          target="_blank"
          rel="noopener noreferrer"
          className="wc26-trend-chart-source"
        >
          View on Google Trends →
        </a>
      ) : null}
    </section>
  );
}
