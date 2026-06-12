import type { ReactNode } from "react";
import { PageHeaderActions } from "./PageHeader";

interface PageToolbarProps {
  search?: ReactNode;
  actions?: ReactNode;
}

export function PageToolbar({ search, actions }: PageToolbarProps) {
  return (
    <div className="page-toolbar">
      {search && <div className="page-toolbar-search">{search}</div>}
      {actions && <div className="page-toolbar-actions">{actions}</div>}
      <PageHeaderActions />
    </div>
  );
}
