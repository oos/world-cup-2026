import type { ReactNode } from "react";

export function CollapsibleChartPanel({
  id,
  title,
  meta,
  defaultOpen = false,
  forceOpen = false,
  children,
}: {
  id?: string;
  title: string;
  meta?: string;
  defaultOpen?: boolean;
  forceOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      id={id}
      className="wc26-chart-panel history-year-accordion"
      open={forceOpen || defaultOpen || undefined}
    >
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
