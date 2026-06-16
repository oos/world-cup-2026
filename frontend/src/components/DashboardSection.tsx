import { useState, type ReactNode } from "react";

export function DashboardSection({
  id,
  title,
  subtitle,
  subtitleExtra,
  action,
  children,
  defaultOpen = true,
}: {
  id: string;
  title: string;
  subtitle?: string;
  subtitleExtra?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      id={id}
      className="dashboard-section"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="dashboard-section-summary">
        <div className="dashboard-section-header">
          <div className="dashboard-section-heading">
            <div className="dashboard-section-title-row">
              <h2 className="dashboard-section-title">{title}</h2>
              <span className="dashboard-section-chevron" aria-hidden="true" />
            </div>
            {subtitle ? (
              <p className="dashboard-section-subtitle">{subtitle}</p>
            ) : null}
            {subtitleExtra ? (
              <div
                className="dashboard-section-subtitle-extra"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                {subtitleExtra}
              </div>
            ) : null}
          </div>
          {action ? (
            <div
              className="dashboard-section-actions"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {action}
            </div>
          ) : null}
        </div>
      </summary>
      <div className="dashboard-section-body">{children}</div>
    </details>
  );
}
