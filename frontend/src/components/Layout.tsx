import { FilterSidePanel } from "./FilterPanel";
import { FilterPanelProvider } from "../context/FilterPanelContext";
import { MainNav } from "./MainNav";
import { TopBar } from "./TopBar";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <FilterPanelProvider>
      <div className="app-shell">
        <TopBar />
        <FilterSidePanel />
        <main className="main-content">{children}</main>
        <MainNav variant="bottom" />
      </div>
    </FilterPanelProvider>
  );
}
