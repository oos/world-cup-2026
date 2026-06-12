import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";

interface PagePanel {
  title: string;
  content: ReactNode;
  activeCount: number;
}

type PanelType = "filter" | "sort";

interface FilterPanelContextValue {
  isOpen: boolean;
  activePanel: PanelType | null;
  filterTitle: string;
  filterActiveCount: number;
  filterContent: ReactNode | null;
  hasFilters: boolean;
  sortTitle: string;
  sortActiveCount: number;
  sortContent: ReactNode | null;
  hasSort: boolean;
  openFilter: () => void;
  openSort: () => void;
  close: () => void;
  toggleFilter: () => void;
  toggleSort: () => void;
}

const FilterPanelContext = createContext<FilterPanelContextValue | null>(null);
const PageFiltersRegistrationContext = createContext<
  ((filters: PagePanel | null) => void) | null
>(null);
const PageSortRegistrationContext = createContext<
  ((sort: PagePanel | null) => void) | null
>(null);

export function FilterPanelProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [panelState, setPanelState] = useState<{
    isOpen: boolean;
    activePanel: PanelType | null;
  }>({ isOpen: false, activePanel: null });
  const [pageFilters, setPageFilters] = useState<PagePanel | null>(null);
  const [pageSort, setPageSort] = useState<PagePanel | null>(null);

  useEffect(() => {
    setPanelState({ isOpen: false, activePanel: null });
  }, [location.pathname, location.search]);

  const openFilter = useCallback(() => {
    setPanelState({ isOpen: true, activePanel: "filter" });
  }, []);

  const openSort = useCallback(() => {
    setPanelState({ isOpen: true, activePanel: "sort" });
  }, []);

  const close = useCallback(() => {
    setPanelState({ isOpen: false, activePanel: null });
  }, []);

  const toggleFilter = useCallback(() => {
    setPanelState((prev) =>
      prev.isOpen && prev.activePanel === "filter"
        ? { isOpen: false, activePanel: null }
        : { isOpen: true, activePanel: "filter" }
    );
  }, []);

  const toggleSort = useCallback(() => {
    setPanelState((prev) =>
      prev.isOpen && prev.activePanel === "sort"
        ? { isOpen: false, activePanel: null }
        : { isOpen: true, activePanel: "sort" }
    );
  }, []);

  const { isOpen, activePanel } = panelState;

  const value: FilterPanelContextValue = {
    isOpen,
    activePanel,
    filterTitle: pageFilters?.title ?? "Filters",
    filterActiveCount: pageFilters?.activeCount ?? 0,
    filterContent: pageFilters?.content ?? null,
    hasFilters: pageFilters !== null && pageFilters.content != null,
    sortTitle: pageSort?.title ?? "Sort",
    sortActiveCount: pageSort?.activeCount ?? 0,
    sortContent: pageSort?.content ?? null,
    hasSort: pageSort !== null,
    openFilter,
    openSort,
    close,
    toggleFilter,
    toggleSort,
  };

  return (
    <FilterPanelContext.Provider value={value}>
      <PageFiltersRegistrationContext.Provider value={setPageFilters}>
        <PageSortRegistrationContext.Provider value={setPageSort}>
          {children}
        </PageSortRegistrationContext.Provider>
      </PageFiltersRegistrationContext.Provider>
    </FilterPanelContext.Provider>
  );
}

export function useFilterPanel() {
  const ctx = useContext(FilterPanelContext);
  if (!ctx) throw new Error("useFilterPanel must be used within FilterPanelProvider");
  return ctx;
}

export function usePageFilters(filters: PagePanel) {
  const register = useContext(PageFiltersRegistrationContext);
  if (!register) throw new Error("usePageFilters must be used within FilterPanelProvider");

  useEffect(() => {
    register(filters);
    return () => register(null);
  }, [register, filters.title, filters.activeCount, filters.content]);
}

export function usePageSort(sort: PagePanel) {
  const register = useContext(PageSortRegistrationContext);
  if (!register) throw new Error("usePageSort must be used within FilterPanelProvider");

  useEffect(() => {
    register(sort);
    return () => register(null);
  }, [register, sort.title, sort.activeCount, sort.content]);
}
