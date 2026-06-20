import { FilterSidePanel } from "./FilterPanel";
import { ButtonClickTracker } from "../ads/ButtonClickTracker";
import { BookmarkAccountPromptProvider } from "../context/BookmarkAccountPromptContext";
import { FilterPanelProvider } from "../context/FilterPanelContext";
import { SideNavProvider } from "../context/SideNavContext";
import { BackToTopFab } from "./BackToTopFab";
import { MainNav } from "./MainNav";
import { ScrollToTop } from "./ScrollToTop";
import { SideNav } from "./SideNav";
import { TopBar } from "./TopBar";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SideNavProvider>
      <FilterPanelProvider>
        <BookmarkAccountPromptProvider>
          <ButtonClickTracker />
          <ScrollToTop />
          <div className="app-shell">
            <TopBar />
            <SideNav />
            <FilterSidePanel />
            <main className="main-content">{children}</main>
            <MainNav variant="bottom" />
            <BackToTopFab />
          </div>
        </BookmarkAccountPromptProvider>
      </FilterPanelProvider>
    </SideNavProvider>
  );
}
