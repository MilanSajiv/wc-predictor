const BASE = "https://api.football-data.org/v4";
const COMPETITION_CODE = "WC";

export type Team = {
  id: number;
  name: string;
  shortName?: string;
  tla?: string;
  crest?: string;
};

export type Match = {
  id: number;
  utcDate: string;
  status: string;
  matchday?: number;
  stage?: string;
  group?: string | null;
  homeTeam: Team;
  awayTeam: Team;
  score?: {
    fullTime?: { home: number | null; away: number | null };
    winner?: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
  };
  venue?: string;
};

async function fdFetch<T>(path: string, revalidate = 600): Promise<T> {
  const token = process.env.FOOTBALL_DATA_API_KEY;
  if (!token) {
    throw new Error(
      "FOOTBALL_DATA_API_KEY is not set. Add it to .env.local — see README.",
    );
  }
  const res = await fetch(`${BASE}${path}`, {
    headers: { "X-Auth-Token": token },
    next: { revalidate },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`football-data ${res.status} for ${path}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export async function getUpcomingMatches(limit = 30): Promise<Match[]> {
  const data = await fdFetch<{ matches: Match[] }>(
    `/competitions/${COMPETITION_CODE}/matches?status=SCHEDULED,TIMED`,
  );
  return data.matches
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate))
    .slice(0, limit);
}

export async function getRecentResults(limit = 10): Promise<Match[]> {
  const data = await fdFetch<{ matches: Match[] }>(
    `/competitions/${COMPETITION_CODE}/matches?status=FINISHED`,
  );
  return data.matches
    .sort((a, b) => b.utcDate.localeCompare(a.utcDate))
    .slice(0, limit);
}

export async function getMatchById(id: string | number): Promise<Match> {
  return fdFetch<Match>(`/matches/${id}`, 60);
}

export async function getAllMatches(): Promise<Match[]> {
  const data = await fdFetch<{ matches: Match[] }>(
    `/competitions/${COMPETITION_CODE}/matches`,
    600,
  );
  return data.matches;
}

export async function getTeams(): Promise<Team[]> {
  const data = await fdFetch<{ teams: Team[] }>(
    `/competitions/${COMPETITION_CODE}/teams`,
    3600,
  );
  return data.teams;
}
