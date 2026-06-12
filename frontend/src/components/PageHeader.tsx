import type { ReactNode } from "react";
import { FilterToggle, SortToggle } from "./FilterPanel";
import { useFilterPanel } from "../context/FilterPanelContext";

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
}

export function PageHeader({
  title,
  subtitle,
  inlineSubtitle = false,
  children,
  toolbar,
  showActions = true,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-row">
        {subtitle && inlineSubtitle ? (
          <h1 className="page-title page-title--inline-subtitle">
            <span className="page-title-text">{title}</span>
            <span className="page-subtitle page-subtitle--inline">{subtitle}</span>
          </h1>
        ) : (
          <h1 className="page-title">{title}</h1>
        )}
        {toolbar}
        {!toolbar && showActions && <PageHeaderActions />}
      </div>
      {subtitle && !inlineSubtitle && <p className="page-subtitle">{subtitle}</p>}
      {children}
    </header>
  );
}
