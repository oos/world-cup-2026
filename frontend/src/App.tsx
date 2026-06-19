import { Navigate, Route, Routes, useParams } from "react-router-dom";
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
import { Roadmap } from "./pages/Roadmap";
import { Guide } from "./pages/Guide";
import { Groups } from "./pages/Groups";
import { Bracket } from "./pages/Bracket";
import { Schedule } from "./pages/Schedule";
import { Squads } from "./pages/Squads";
import { Standings } from "./pages/Standings";
import { Today } from "./pages/Today";
import { Trends } from "./pages/Trends";
import { Venues } from "./pages/Venues";
import { GoalInvolvements } from "./pages/GoalInvolvements";
import { Winners } from "./pages/Winners";
import { SavedItems } from "./pages/SavedItems";
import { TeamDetail } from "./pages/TeamDetail";
import { TeamWorldCupMatchDetail } from "./pages/TeamWorldCupMatchDetail";
import { Teams } from "./pages/Teams";
import { Watch } from "./pages/Watch";
import { KnockoutPredictions } from "./pages/KnockoutPredictions";
import { WorldCup2026 } from "./pages/WorldCup2026";
import { WorldRankings } from "./pages/WorldRankings";
import { CompetitionLayout } from "./pages/CompetitionLayout";
import { WC_2026_PATH, FIXTURES_PATH, HOST_CITIES_PATH } from "./config/appNav";

function RedirectLegacyFixtureDetail() {
  const { id } = useParams();
  return <Navigate to={`${FIXTURES_PATH}/${id ?? ""}`} replace />;
}

export default function App() {
  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Home />} />
          <Route path="/c/:slug" element={<CompetitionLayout />} />
          <Route path="/c/:slug/:tab" element={<CompetitionLayout />} />
          <Route path={WC_2026_PATH} element={<WorldCup2026 />} />
          <Route path="/26" element={<Navigate to={WC_2026_PATH} replace />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/world-rankings" element={<WorldRankings />} />
          <Route path="/teams/:id" element={<TeamDetail />} />
          <Route
            path="/teams/:id/history/:year/:matchKey"
            element={<TeamWorldCupMatchDetail />}
          />
          <Route path="/players" element={<Players />} />
          <Route path="/players/:id" element={<PlayerDetail />} />
          <Route path={FIXTURES_PATH} element={<Matches />} />
          <Route path={`${FIXTURES_PATH}/:id`} element={<MatchDetail />} />
          <Route path="/matches" element={<Navigate to={FIXTURES_PATH} replace />} />
          <Route path="/matches/:id" element={<RedirectLegacyFixtureDetail />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/today" element={<Today />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/standings" element={<Standings />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/bracket" element={<Bracket />} />
          <Route path="/knockout-predictions" element={<KnockoutPredictions />} />
          <Route path={HOST_CITIES_PATH} element={<Venues />} />
          <Route path="/venues" element={<Navigate to={HOST_CITIES_PATH} replace />} />
          <Route path="/squads" element={<Squads />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/winners" element={<Winners />} />
          <Route path="/goal-involvements" element={<GoalInvolvements />} />
          <Route path="/watch" element={<Watch />} />
          <Route path="/watch/:countryCode" element={<Watch />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:year/:matchKey" element={<HistoryMatchDetail />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/saved" element={<SavedItems />} />
          <Route path="/viewing-matches" element={<Navigate to="/saved" replace />} />
          <Route path="/about" element={<About />} />
          <Route path="/roadmap" element={<Roadmap />} />
        </Routes>
      </Layout>
      <CookieConsent />
    </>
  );
}
