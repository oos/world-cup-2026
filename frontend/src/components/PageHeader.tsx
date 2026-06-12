import type { CSSProperties, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { FilterToggle, SortToggle } from "./FilterPanel";
import { PageTitle } from "./PageTitle";
import { useFilterPanel } from "../context/FilterPanelContext";
import { getNavAccentForPath } from "../config/appNav";

export function PageHeaderActions() {
  const { hasFilters, hasSort } = useFilterPanel();

  if (!hasFilters && !hasSort) return null;

  return (
    <div className="page-header-actions">
      <SortToggle />
      <FilterToggle />
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  inlineSubtitle?: boolean;
  children?: ReactNode;
  toolbar?: ReactNode;
  showActions?: boolean;
  accent?: string;
}

export function PageHeader({
  title,
  subtitle,
  inlineSubtitle = false,
  children,
  toolbar,
  showActions = true,
  accent,
}: PageHeaderProps) {
  const location = useLocation();
  const titleColor = accent ?? getNavAccentForPath(location.pathname);
  const titleStyle = titleColor ? ({ color: titleColor } as CSSProperties) : undefined;

  return (
    <header className="page-header">
      <div className="page-header-row">
        {subtitle && inlineSubtitle ? (
          <h1 className="page-title page-title--inline-subtitle" style={titleStyle}>
            <span className="page-title-text">{title}</span>
            <span className="page-subtitle page-subtitle--inline">{subtitle}</span>
          </h1>
        ) : (
          <PageTitle accent={accent}>{title}</PageTitle>
        )}
        {toolbar}
        {!toolbar && showActions && <PageHeaderActions />}
      </div>
      {subtitle && !inlineSubtitle && <p className="page-subtitle">{subtitle}</p>}
      {children}
    </header>
  );
}
