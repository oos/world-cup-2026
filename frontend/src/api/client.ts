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

class ApiClient {
  private async fetch<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
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
