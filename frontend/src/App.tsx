import { Navigate, Route, Routes } from "react-router-dom";
import { CookieConsent } from "./ads/CookieConsent";
import { Layout } from "./components/Layout";
import { Auth } from "./pages/Auth";
import { AuthCallback } from "./pages/AuthCallback";
import { History } from "./pages/History";
import { HistoryMatchDetail } from "./pages/HistoryMatchDetail";
import { Home } from "./pages/Home";
import { MatchDetail } from "./pages/MatchDetail";
import { Matches } from "./pages/Matches";
import { PlayerDetail } from "./pages/PlayerDetail";
import { Players } from "./pages/Players";
import { Profile } from "./pages/Profile";
import { About } from "./pages/About";
import { Guide } from "./pages/Guide";
import { Groups } from "./pages/Groups";
import { Schedule } from "./pages/Schedule";
import { Squads } from "./pages/Squads";
import { Venues } from "./pages/Venues";
import { SavedItems } from "./pages/SavedItems";
import { TeamDetail } from "./pages/TeamDetail";
import { TeamWorldCupMatchDetail } from "./pages/TeamWorldCupMatchDetail";
import { Teams } from "./pages/Teams";
import { ViewingMatches } from "./pages/ViewingMatches";
import { Watch } from "./pages/Watch";
import { WorldCup2026 } from "./pages/WorldCup2026";

export default function App() {
  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Home />} />
          <Route path="/26" element={<WorldCup2026 />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/teams/:id" element={<TeamDetail />} />
          <Route
            path="/teams/:id/history/:year/:matchKey"
            element={<TeamWorldCupMatchDetail />}
          />
          <Route path="/players" element={<Players />} />
          <Route path="/players/:id" element={<PlayerDetail />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/matches/:id" element={<MatchDetail />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/venues" element={<Venues />} />
          <Route path="/squads" element={<Squads />} />
          <Route path="/watch" element={<Watch />} />
          <Route path="/watch/:countryCode" element={<Watch />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:year/:matchKey" element={<HistoryMatchDetail />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/saved" element={<SavedItems />} />
          <Route path="/viewing-matches" element={<ViewingMatches />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </Layout>
      <CookieConsent />
    </>
  );
}
