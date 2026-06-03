// World Football Elo–style rolling rating computation from the
// martj42/international_results dataset.
//
// Dataset: https://github.com/martj42/international_results
// CSV: date,home_team,away_team,home_score,away_score,tournament,city,country,neutral

const DATASET_URL =
  "https://raw.githubusercontent.com/martj42/international_results/master/results.csv";

export type HistoricalMatch = {
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  tournament: string;
  neutral: boolean;
};

export type EloUpdate = {
  match: HistoricalMatch;
  homeEloBefore: number;
  awayEloBefore: number;
  homeEloAfter: number;
  awayEloAfter: number;
  expectedHome: number;
};

const STARTING_ELO = 1500;
const HOME_ADVANTAGE = 100;

function competitionK(tournament: string): number {
  const t = tournament.toLowerCase();
  if (t === "fifa world cup") return 60;
  if (
    t.includes("uefa euro") ||
    t.includes("copa américa") ||
    t.includes("copa america") ||
    t.includes("africa cup of nations") ||
    t.includes("afc asian cup") ||
    t.includes("gold cup") ||
    t.includes("ofc nations cup") ||
    t === "confederations cup"
  ) {
    if (t.includes("qualification")) return 40;
    return 50;
  }
  if (t.includes("qualification") || t.includes("nations league")) return 40;
  return 30;
}

function goalDiffFactor(gd: number): number {
  const a = Math.abs(gd);
  if (a <= 1) return 1;
  if (a === 2) return 1.5;
  return (11 + a) / 8;
}

function expectedScore(homeElo: number, awayElo: number, homeAdv: number): number {
  return 1 / (1 + Math.pow(10, (awayElo - homeElo - homeAdv) / 400));
}

function actualScore(homeScore: number, awayScore: number): number {
  if (homeScore > awayScore) return 1;
  if (homeScore < awayScore) return 0;
  return 0.5;
}

// Simple CSV parser handling quoted fields.
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      out.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  out.push(current);
  return out;
}

export async function fetchHistoricalMatches(): Promise<HistoricalMatch[]> {
  const res = await fetch(DATASET_URL);
  if (!res.ok) throw new Error(`Dataset fetch failed: ${res.status}`);
  const text = await res.text();
  const lines = text.split("\n");
  const header = parseCsvLine(lines[0]);
  const idx = {
    date: header.indexOf("date"),
    home_team: header.indexOf("home_team"),
    away_team: header.indexOf("away_team"),
    home_score: header.indexOf("home_score"),
    away_score: header.indexOf("away_score"),
    tournament: header.indexOf("tournament"),
    neutral: header.indexOf("neutral"),
  };
  const out: HistoricalMatch[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const fields = parseCsvLine(line);
    if (fields.length < header.length) continue;
    const hs = Number.parseInt(fields[idx.home_score], 10);
    const as = Number.parseInt(fields[idx.away_score], 10);
    if (!Number.isFinite(hs) || !Number.isFinite(as)) continue;
    out.push({
      date: fields[idx.date],
      homeTeam: fields[idx.home_team],
      awayTeam: fields[idx.away_team],
      homeScore: hs,
      awayScore: as,
      tournament: fields[idx.tournament],
      neutral: fields[idx.neutral].toLowerCase() === "true",
    });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

export type EloEvolutionResult = {
  finalElos: Map<string, number>;
  lastMatchDate: Map<string, string>;
  matchCount: Map<string, number>;
  updates: EloUpdate[];
};

export function evolveElos(
  matches: HistoricalMatch[],
  options: {
    captureUpdatesFor?: (m: HistoricalMatch) => boolean;
  } = {},
): EloEvolutionResult {
  const ratings = new Map<string, number>();
  const lastMatchDate = new Map<string, string>();
  const matchCount = new Map<string, number>();
  const updates: EloUpdate[] = [];

  const getR = (t: string) => ratings.get(t) ?? STARTING_ELO;

  for (const m of matches) {
    const homeBefore = getR(m.homeTeam);
    const awayBefore = getR(m.awayTeam);
    const homeAdv = m.neutral ? 0 : HOME_ADVANTAGE;

    const expHome = expectedScore(homeBefore, awayBefore, homeAdv);
    const actHome = actualScore(m.homeScore, m.awayScore);
    const K = competitionK(m.tournament);
    const G = goalDiffFactor(m.homeScore - m.awayScore);
    const delta = K * G * (actHome - expHome);

    if (options.captureUpdatesFor?.(m)) {
      updates.push({
        match: m,
        homeEloBefore: homeBefore,
        awayEloBefore: awayBefore,
        homeEloAfter: homeBefore + delta,
        awayEloAfter: awayBefore - delta,
        expectedHome: expHome,
      });
    }

    ratings.set(m.homeTeam, homeBefore + delta);
    ratings.set(m.awayTeam, awayBefore - delta);
    lastMatchDate.set(m.homeTeam, m.date);
    lastMatchDate.set(m.awayTeam, m.date);
    matchCount.set(m.homeTeam, (matchCount.get(m.homeTeam) ?? 0) + 1);
    matchCount.set(m.awayTeam, (matchCount.get(m.awayTeam) ?? 0) + 1);
  }

  return { finalElos: ratings, lastMatchDate, matchCount, updates };
}
