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
  children?: ReactNode;
  toolbar?: ReactNode;
  showActions?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  children,
  toolbar,
  showActions = true,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-row">
        <h1 className="page-title">{title}</h1>
        {toolbar}
        {!toolbar && showActions && <PageHeaderActions />}
      </div>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
      {children}
    </header>
  );
}
