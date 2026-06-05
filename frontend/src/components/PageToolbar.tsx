import type { ReactNode } from "react";
import { PageHeaderActions } from "./PageHeader";

interface PageToolbarProps {
  search?: ReactNode;
}

export function PageToolbar({ search }: PageToolbarProps) {
  return (
    <div className="page-toolbar">
      {search && <div className="page-toolbar-search">{search}</div>}
      <PageHeaderActions />
    </div>
  );
}
