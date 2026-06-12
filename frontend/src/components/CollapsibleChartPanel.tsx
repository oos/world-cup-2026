import type { ReactNode } from "react";

export function CollapsibleChartPanel({
  title,
  meta,
  defaultOpen = false,
  children,
}: {
  title: string;
  meta?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="wc26-chart-panel history-year-accordion" open={defaultOpen || undefined}>
      <summary className="history-accordion-summary">
        <span className="history-accordion-heading">
          <span className="history-accordion-title">{title}</span>
        </span>
        {meta ? <span className="history-accordion-meta">{meta}</span> : null}
      </summary>
      <div className="wc26-chart-panel-body">{children}</div>
    </details>
  );
}
