const API_BASE = "/api/v1";

export interface Team {
  id: number;
  name: string;
  fifa_code: string;
  group: string;
  confederation: string;
  flag_icon: string;
  continent: string;
  player_count: number;
}

export interface Player {
  id: number;
  name: string;
  position: string | null;
  dob: string | null;
  height_cm: number | null;
  club: string | null;
  image_url: string | null;
  nationality: string | null;
  jersey_number: number | null;
  team_name: string | null;
  team_fifa_code: string | null;
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
  match_number: number | null;
  date: string | null;
  time: string | null;
  group: string | null;
  team1: Team | null;
  team2: Team | null;
  stadium: { name: string; city: string | null } | null;
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

export interface MatchDetail extends Match {
  predicted_lineups: {
    team1?: PredictedLineup;
    team2?: PredictedLineup;
  };
}

export interface Stats {
  team_count: number;
  player_count: number;
  groups: string[];
}

export interface HistoryTournament {
  year: number;
  name: string;
  match_count: number;
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
  stadium: string | null;
  score: { ft?: number[]; ht?: number[] } | null;
}

export interface HistoryTeam {
  name: string;
  group: string | null;
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
}

export interface TeamHistoryStats {
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
}

export interface AuthUser {
  id: number;
  email: string;
  display_name: string;
  city: string;
  default_view_mode: "grid" | "list";
  match_reminders: boolean;
}

export type AuthProfilePatch = Partial<{
  display_name: string;
  city: string;
  default_view_mode: "grid" | "list";
  match_reminders: boolean;
}>;

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

  getStats() {
    return this.fetch<Stats>("/teams/stats");
  }

  getTeams(group?: string) {
    const q = group ? `?group=${encodeURIComponent(group)}` : "";
    return this.fetch<{ teams: Team[] }>(`/teams${q}`);
  }

  getTeam(id: number) {
    return this.fetch<Team & { squad: SquadGroup }>(`/teams/${id}`);
  }

  getTeamHistory(id: number) {
    return this.fetch<TeamHistoryStats>(`/teams/${id}/history`);
  }

  getSquad(teamId: number) {
    return this.fetch<{ squad: SquadGroup }>(`/teams/${teamId}/squad`);
  }

  getPlayer(id: number) {
    return this.fetch<Player>(`/players/${id}`);
  }

  getPlayers(params?: { year?: number; group?: string; position?: string; team_id?: number }) {
    const search = new URLSearchParams();
    if (params?.year) search.set("year", String(params.year));
    if (params?.group) search.set("group", params.group);
    if (params?.position) search.set("position", params.position);
    if (params?.team_id) search.set("team_id", String(params.team_id));
    const q = search.toString();
    return this.fetch<{ players: Player[]; year: number }>(`/players${q ? `?${q}` : ""}`);
  }

  getMatches(group?: string) {
    const q = group ? `?group=${encodeURIComponent(group)}` : "";
    return this.fetch<{ matches: Match[] }>(`/matches${q}`);
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
}

export const api = new ApiClient();
