import { FilterSidePanel } from "./FilterPanel";
import { FilterPanelProvider } from "../context/FilterPanelContext";
import { SideNavProvider } from "../context/SideNavContext";
import { BackToTopFab } from "./BackToTopFab";
import { MainNav } from "./MainNav";
import { SideNav } from "./SideNav";
import { TopBar } from "./TopBar";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SideNavProvider>
      <FilterPanelProvider>
        <div className="app-shell">
          <TopBar />
          <SideNav />
          <FilterSidePanel />
          <main className="main-content">{children}</main>
          <MainNav variant="bottom" />
          <BackToTopFab />
        </div>
      </FilterPanelProvider>
    </SideNavProvider>
  );
}
