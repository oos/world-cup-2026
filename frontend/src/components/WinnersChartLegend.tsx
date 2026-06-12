import type { ReactNode } from "react";

export function splitLegendColumns<T>(items: T[]): [T[], T[]] {
  const midpoint = Math.ceil(items.length / 2);
  return [items.slice(0, midpoint), items.slice(midpoint)];
}

export function WinnersChartLegend({ children }: { children: ReactNode }) {
  return <div className="history-winners-legend">{children}</div>;
}

export function WinnersChartLegendColumns({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <>
      <div className="history-winners-legend-column">{left}</div>
      <div className="history-winners-legend-divider" aria-hidden="true" />
      <div className="history-winners-legend-column">{right}</div>
    </>
  );
}
