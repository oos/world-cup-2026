const API_BASE = "/api/v1";

export interface Team {
  id: number;
  name: string;
  fifa_code: string;
  flag_iso?: string | null;
  group: string;
  confederation: string;
  flag_icon: string;
  continent: string;
  crest_url?: string | null;
  is_club?: boolean;
  player_count: number;
  world_ranking?: number | null;
}

export interface WorldRankingEntry {
  rank: number;
  fifa_code: string;
  name: string;
  flag_iso: string;
  confederation: string;
  qualified: boolean;
  team_id: number | null;
  group: string | null;
  player_count: number | null;
}

export interface Player {
  id: number;
  name: string;
  position: string | null;
  dob: string | null;
  height_cm: number | null;
  club: string | null;
  club_status?: "none" | "unavailable" | "retired" | null;
  club_label?: string;
  image_url: string | null;
  nationality: string | null;
  jersey_number: number | null;
  team_name: string | null;
  team_fifa_code: string | null;
  major_honours?: PlayerMajorHonour[];
}

export interface PlayerMajorHonour {
  key: string;
  label: string;
  count: number;
}

export interface PlayerHonourGroupItem {
  competition: string;
  team: string | null;
  seasons: string[];
}

export interface PlayerHonourGroup {
  key: string;
  label: string;
  tier: string;
  count: number;
  items: PlayerHonourGroupItem[];
}

export interface PlayerHonours {
  major: PlayerMajorHonour[];
  domestic: PlayerHonourGroup[];
  cups: PlayerHonourGroup[];
  continental: PlayerHonourGroup[];
  club: PlayerHonourGroup[];
  individual: PlayerHonourGroup[];
  other: PlayerHonourGroup[];
  source: string | null;
  synced_at: string | null;
}

export interface PlayerCareerStint {
  team_name: string;
  fifa_code: string | null;
  badge_url: string | null;
  start_date: string | null;
  end_date: string | null;
  transfer_fee: string | null;
  is_current: boolean;
}

export interface PlayerCareer {
  club_history: PlayerCareerStint[];
  international_history: PlayerCareerStint[];
  source: string | null;
}

export interface SquadGroup {
  GK: Player[];
  DEF: Player[];
  MID: Player[];
  FWD: Player[];
  OTHER: Player[];
}

export interface Match {
  id: number;
  round: string;
  stage?: string | null;
  leg?: number | null;
  match_number: number | null;
  date: string | null;
  time: string | null;
  group: string | null;
  team1: Team | null;
  team2: Team | null;
  stadium: { name: string; city: string | null; country: string | null } | null;
  score: { ft?: number[]; ht?: number[] } | null;
}

export interface LineupPlayer extends Player {
  lineup_role: string;
}

export interface PredictedLineup {
  formation: string;
  players: LineupPlayer[];
  substitutes: Player[];
}

export type MatchLineupStatus = "available" | "pending" | "unavailable";

export interface MatchLineup {
  formation: string | null;
  players: LineupPlayer[];
  substitutes: Player[];
}

export interface MatchLineups {
  status: MatchLineupStatus;
  team1: MatchLineup | null;
  team2: MatchLineup | null;
}

export interface MatchDetail extends Match {
  lineups: MatchLineups;
}

export interface Stats {
  team_count: number;
  player_count: number;
  groups: string[];
  player_counts_by_year?: Record<string, number>;
}

export type CompetitionFormat =
  | "league"
  | "knockout"
  | "groups_knockout"
  | "league_phase_knockout"
  | "league_with_playoffs";

export interface StandingsZone {
  from: number;
  to: number;
  kind: string;
  label?: string;
}

export interface LayoutConfig {
  format: CompetitionFormat;
  tabs: string[];
  default_tab?: string;
  standings?: { mode: "single" | "groups" | "league_phase"; zones: StandingsZone[] } | null;
  bracket?: { two_legged?: boolean; entry_round?: string; label?: string } | null;
}

export interface Competition {
  slug: string;
  name: string;
  year: number;
  kind: string;
  format: CompetitionFormat;
  country: string | null;
  confederation: string | null;
  tier: number | null;
  season_label: string | null;
  logo_url: string | null;
  layout_config: LayoutConfig;
  region_key: string;
  region_label: string;
  sort_order: number;
}

export interface CompetitionRegion {
  key: string;
  label: string;
  competitions: Competition[];
}

export interface StandingsRow {
  team_id: number;
  name: string;
  fifa_code: string;
  flag_iso: string | null;
  crest_url: string | null;
  group: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  position: number;
  zone: { kind: string; label?: string } | null;
}

export interface StandingsGroup {
  name: string;
  rows: StandingsRow[];
}

export interface Standings {
  mode: "single" | "groups" | "league_phase";
  zones: StandingsZone[];
  rows?: StandingsRow[];
  groups?: StandingsGroup[];
}

export interface BracketTeam {
  id: number;
  name: string;
  fifa_code: string;
  flag_iso: string | null;
  crest_url: string | null;
}

export interface BracketLeg {
  leg: number | null;
  ft: number[] | null;
  home: string | null;
  away: string | null;
}

export interface BracketTie {
  team1: BracketTeam | null;
  team2: BracketTeam | null;
  score1: number | null;
  score2: number | null;
  legs: BracketLeg[];
  winner_team_id: number | null;
}

export interface BracketRound {
  key: string;
  label: string;
  ties: BracketTie[];
}

export interface Bracket {
  two_legged: boolean;
  rounds: BracketRound[];
}

export interface BroadcastCountrySummary {
  code: string;
  name: string;
  flag_iso: string;
  broadcaster_count: number;
  has_rights: boolean;
}

export interface Broadcaster {
  name: string;
  type: string;
  url?: string | null;
  notes?: string | null;
}

export interface BroadcastCountry {
  code: string;
  name: string;
  flag_iso: string;
  broadcasters: Broadcaster[];
  coverage: string | null;
  notes: string | null;
  last_updated: string;
  fifa_broadcasts_url: string;
}

export interface HistoryTournament {
  year: number;
  name: string;
  match_count: number;
}

export interface HistoryGoalEvent {
  name: string;
  minute: number | null;
  label: string;
}

export interface HistoryRawGoal {
  name: string;
  minute?: number | null;
  penalty?: boolean;
  owngoal?: boolean;
}

export interface HistoryMatch {
  year: number;
  round: string;
  match_number: number | null;
  date: string | null;
  time: string | null;
  group: string | null;
  team1: string;
  team2: string;
  team1_flag_iso?: string | null;
  team2_flag_iso?: string | null;
  stadium: string | null;
  score: { ft?: number[]; ht?: number[]; et?: number[]; pens?: number[]; p?: number[] } | null;
  goals1?: HistoryRawGoal[];
  goals2?: HistoryRawGoal[];
}

export interface HistoryMatchDetail extends HistoryMatch {
  match_key: string;
  team1_score: number;
  team2_score: number;
  went_to_extra_time: boolean;
  penalty_score: { team1: number; team2: number } | null;
  half_time_score: { team1: number; team2: number } | null;
  full_time_score: { team1: number; team2: number } | null;
  extra_time_score: { team1: number; team2: number } | null;
  team1_goals: HistoryGoalEvent[];
  team2_goals: HistoryGoalEvent[];
  timeline: TeamMatchTimelineEvent[];
}

export interface HistoryTeam {
  name: string;
  group: string | null;
}

export interface TeamGoalEvent {
  name: string;
  minute: number | null;
  label: string;
}

export interface TeamPenaltyScore {
  team: number;
  opponent: number;
}

export interface TeamScorePair {
  team: number;
  opponent: number;
}

export interface TeamMatchTimelineEvent {
  type: string;
  minute: number;
  label: string;
  side?: "team" | "opponent";
  team_name?: string;
  scorer?: string;
  penalty?: boolean;
  own_goal?: boolean;
  team_score?: number;
  opponent_score?: number;
}

export interface TeamMatchResult {
  match_key: string;
  year: number;
  round: string;
  group: string | null;
  date: string | null;
  time: string | null;
  stadium: string | null;
  opponent: string;
  score: string;
  team_score: number;
  opponent_score: number;
  went_to_extra_time: boolean;
  penalty_score: TeamPenaltyScore | null;
  full_time_score: TeamScorePair;
  half_time_score: TeamScorePair | null;
  extra_time_score: TeamScorePair | null;
  outcome: string;
  team_goals: TeamGoalEvent[];
  opponent_goals: TeamGoalEvent[];
  timeline: TeamMatchTimelineEvent[];
}

export interface TeamWorldCupMatchDetail {
  team_name: string;
  year: number;
  match: TeamMatchResult;
}

export interface TeamWorldCupResult {
  year: number;
  participated: boolean;
  status?: "in_progress";
  group?: string;
  team_count?: number;
  group_count?: number;
  absence_reason?: string;
  absence_label?: string;
  absence_detail?: string | null;
  finish?: string;
  wins?: number;
  draws?: number;
  losses?: number;
  goals_for?: number;
  goals_against?: number;
  match_results?: TeamMatchResult[];
}

export interface TeamTournamentHistory {
  year: number;
  finish: string;
  best_round: string;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  round_matches: Record<string, number>;
  match_results?: TeamMatchResult[];
}

export interface TeamHistoryStats {
  team_name?: string;
  appearances: number;
  world_cups_played: number[];
  titles: number;
  title_years: number[];
  runners_up: number;
  best_finish: string | null;
  best_finish_year: number | null;
  total_matches: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  knockout_appearances: number;
  rounds_reached: Record<string, number>;
  round_matches: Record<string, number>;
  tournaments: TeamTournamentHistory[];
  world_cup_results: TeamWorldCupResult[];
}

export interface AuthUser {
  id: number;
  email: string;
  display_name: string;
  city: string;
  timezone: string;
  preferred_team_fifa_code: string;
  default_view_mode: "grid" | "list";
  match_reminders: boolean;
  match_reminder_minutes: number[];
}

export type AuthProfilePatch = Partial<{
  display_name: string;
  city: string;
  timezone: string;
  preferred_team_fifa_code: string;
  default_view_mode: "grid" | "list";
  match_reminders: boolean;
  match_reminder_minutes: number[];
}>;

export type SavedItemType = "team" | "player";

export interface SavedItemRecord {
  item_type: SavedItemType;
  item_id: number;
  saved_at: string | null;
  name: string;
  fifa_code?: string;
  team_name?: string | null;
  team_fifa_code?: string | null;
  position?: string | null;
}

class ApiClient {
  private async fetch<T>(
    path: string,
    init?: RequestInit & { auth?: boolean },
  ): Promise<T> {
    const { auth = false, ...requestInit } = init ?? {};
    const res = await fetch(`${API_BASE}${path}`, {
      ...requestInit,
      credentials: auth ? "include" : requestInit.credentials,
      headers: {
        "Content-Type": "application/json",
        ...(requestInit.headers ?? {}),
      },
    });
    if (!res.ok) {
      let message = `API error: ${res.status}`;
      try {
        const payload = (await res.json()) as { error?: string };
        if (payload.error) message = payload.error;
      } catch {
        // ignore parse errors
      }
      throw new Error(message);
    }
    if (res.status === 204) {
      return undefined as T;
    }
    return res.json();
  }

  requestMagicLink(email: string) {
    return this.fetch<{ sent: boolean }>("/auth/magic-link", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  loginWithPassword(email: string, password: string) {
    return this.fetch<{ user: AuthUser }>("/auth/login", {
      method: "POST",
      auth: true,
      body: JSON.stringify({ email, password }),
    }).then((payload) => payload.user);
  }

  registerWithPassword(email: string, password: string) {
    return this.fetch<{ user: AuthUser }>("/auth/register", {
      method: "POST",
      auth: true,
      body: JSON.stringify({ email, password }),
    }).then((payload) => payload.user);
  }

  getOAuthStartUrl(provider: "google" | "apple" | "github") {
    return this.fetch<{ url: string }>(`/auth/oauth/${provider}`, {
      method: "POST",
      body: JSON.stringify({}),
    }).then((payload) => payload.url);
  }

  verifyToken(token: string) {
    return this.fetch<{ user: AuthUser }>("/auth/verify", {
      method: "POST",
      auth: true,
      body: JSON.stringify({ token }),
    });
  }

  getMe() {
    return this.fetch<{ user: AuthUser }>("/auth/me", { auth: true }).then(
      (payload) => payload.user,
    );
  }

  updateProfile(patch: AuthProfilePatch) {
    return this.fetch<{ user: AuthUser }>("/auth/me", {
      method: "PATCH",
      auth: true,
      body: JSON.stringify(patch),
    }).then((payload) => payload.user);
  }

  logout() {
    return this.fetch<{ logged_out: boolean }>("/auth/logout", {
      method: "POST",
      auth: true,
    });
  }

  getSavedItems() {
    return this.fetch<{ items: SavedItemRecord[] }>("/auth/saved", { auth: true });
  }

  addSavedItem(payload: { item_type: SavedItemType; item_id: number }) {
    return this.fetch<{ item: SavedItemRecord }>("/auth/saved", {
      method: "POST",
      auth: true,
      body: JSON.stringify(payload),
    }).then((response) => response.item);
  }

  removeSavedItem(itemType: SavedItemType, itemId: number) {
    return this.fetch<void>(`/auth/saved/${itemType}/${itemId}`, {
      method: "DELETE",
      auth: true,
    });
  }

  getStats(competition?: string) {
    const search = new URLSearchParams();
    if (competition) search.set("competition", competition);
    const q = search.toString();
    return this.fetch<Stats>(`/teams/stats${q ? `?${q}` : ""}`);
  }

  getCompetitions() {
    return this.fetch<{ competitions: Competition[]; regions: CompetitionRegion[] }>(
      "/competitions",
    );
  }

  getCompetition(slug: string) {
    return this.fetch<Competition>(`/competitions/${encodeURIComponent(slug)}`);
  }

  getStandings(slug: string) {
    return this.fetch<Standings>(`/competitions/${encodeURIComponent(slug)}/standings`);
  }

  getBracket(slug: string) {
    return this.fetch<Bracket>(`/competitions/${encodeURIComponent(slug)}/bracket`);
  }

  getTeams(group?: string, competition?: string) {
    const search = new URLSearchParams();
    if (group) search.set("group", group);
    if (competition) search.set("competition", competition);
    const q = search.toString();
    return this.fetch<{ teams: Team[] }>(`/teams${q ? `?${q}` : ""}`);
  }

  getWorldRankings() {
    return this.fetch<{ as_of: string; rankings: WorldRankingEntry[] }>("/teams/world-rankings");
  }

  getTeam(id: number) {
    return this.fetch<Team & { squad: SquadGroup }>(`/teams/${id}`);
  }

  getTeamHistory(id: number) {
    return this.fetch<TeamHistoryStats>(`/teams/${id}/history`);
  }

  getTeamHistoryMatch(teamId: number, year: number, matchKey: string) {
    return this.fetch<TeamWorldCupMatchDetail>(
      `/teams/${teamId}/history/${year}/matches/${encodeURIComponent(matchKey)}`
    );
  }

  getSquad(teamId: number) {
    return this.fetch<{ squad: SquadGroup }>(`/teams/${teamId}/squad`);
  }

  getPlayer(id: number) {
    return this.fetch<Player>(`/players/${id}`);
  }

  getPlayerCareer(id: number) {
    return this.fetch<PlayerCareer>(`/players/${id}/career`);
  }

  getPlayerHonours(id: number) {
    return this.fetch<PlayerHonours>(`/players/${id}/honours`);
  }

  getPlayers(params?: {
    year?: number;
    group?: string;
    position?: string;
    team_id?: number;
    competition?: string;
  }) {
    const search = new URLSearchParams();
    if (params?.year) search.set("year", String(params.year));
    if (params?.group) search.set("group", params.group);
    if (params?.position) search.set("position", params.position);
    if (params?.team_id) search.set("team_id", String(params.team_id));
    if (params?.competition) search.set("competition", params.competition);
    const q = search.toString();
    return this.fetch<{ players: Player[]; year: number }>(`/players${q ? `?${q}` : ""}`);
  }

  getMatches(group?: string, competition?: string) {
    const search = new URLSearchParams();
    if (group) search.set("group", group);
    if (competition) search.set("competition", competition);
    const q = search.toString();
    return this.fetch<{ matches: Match[] }>(`/matches${q ? `?${q}` : ""}`);
  }

  getMatch(id: number) {
    return this.fetch<MatchDetail>(`/matches/${id}`);
  }

  getHistoryTournaments() {
    return this.fetch<{ tournaments: HistoryTournament[] }>("/history/tournaments");
  }

  getHistoryMatches(params?: { year?: number; round?: string; group?: string }) {
    const search = new URLSearchParams();
    if (params?.year) search.set("year", String(params.year));
    if (params?.round) search.set("round", params.round);
    if (params?.group) search.set("group", params.group);
    const q = search.toString();
    return this.fetch<{ matches: HistoryMatch[] }>(`/history/matches${q ? `?${q}` : ""}`);
  }

  getHistoryTeams(year: number) {
    return this.fetch<{ teams: HistoryTeam[] }>(`/history/teams?year=${year}`);
  }

  getHistoryMatch(year: number, matchKey: string) {
    return this.fetch<HistoryMatchDetail>(
      `/history/matches/${year}/${encodeURIComponent(matchKey)}`
    );
  }

  getBroadcastCountries() {
    return this.fetch<{ countries: BroadcastCountrySummary[] }>("/broadcast/countries");
  }

  getBroadcastCountry(countryCode: string) {
    return this.fetch<BroadcastCountry>(
      `/broadcast/countries/${encodeURIComponent(countryCode)}`
    );
  }
}

export const api = new ApiClient();
