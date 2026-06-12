import { createContext, useCallback, useContext, useMemo, useState } from "react";

type SideNavContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const SideNavContext = createContext<SideNavContextValue | null>(null);

export function SideNavProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((current) => !current), []);

  const value = useMemo(
    () => ({ isOpen, open, close, toggle }),
    [isOpen, open, close, toggle],
  );

  return <SideNavContext.Provider value={value}>{children}</SideNavContext.Provider>;
}

export function useSideNav() {
  const context = useContext(SideNavContext);
  if (!context) {
    throw new Error("useSideNav must be used within SideNavProvider");
  }
  return context;
}
