import type { CSSProperties, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { getNavAccentForPath } from "../config/appNav";

type PageTitleProps = {
  children: ReactNode;
  className?: string;
  accent?: string;
};

export function PageTitle({ children, className = "page-title", accent }: PageTitleProps) {
  const location = useLocation();
  const color = accent ?? getNavAccentForPath(location.pathname);

  return (
    <h1 className={className} style={color ? ({ color } as CSSProperties) : undefined}>
      {children}
    </h1>
  );
}
