import { lambdasFor } from "./predict";
import type { Match } from "./football-data";
import {
  R32,
  R16_PAIRINGS,
  QF_PAIRINGS,
  SF_PAIRINGS,
  FINAL_PAIR,
  assignThirdPlaceSlotsDetailed,
  groupLetterFromTag,
  type GroupLetter,
  type SlotSpec,
} from "./bracket";

type Round = "r32" | "r16" | "qf" | "sf" | "final" | "champion";

export type TeamReach = {
  team: string;
  group: string | null;
  qualify: number;
  r16: number;
  qf: number;
  sf: number;
  final: number;
  champion: number;
};

export type SimulationResult = {
  iterations: number;
  groups: Array<{ group: string; teams: string[] }>;
  teams: TeamReach[];
  unresolvedThirdAssignments: number;
  annexCHits: number;
  fallbackMatcherHits: number;
};

function poissonSample(lambda: number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  while (p > L) {
    k++;
    p *= Math.random();
  }
  return k - 1;
}

type LambdaCache = Map<string, { lH: number; lA: number; pH: number; pA: number }>;

function cacheKey(home: string, away: string, neutral: boolean) {
  return `${home}|${away}|${neutral ? "n" : "h"}`;
}

function getCachedLambdas(
  cache: LambdaCache,
  home: string,
  away: string,
  neutral: boolean,
) {
  const key = cacheKey(home, away, neutral);
  let entry = cache.get(key);
  if (!entry) {
    const { lambdaHome, lambdaAway } = lambdasFor(home, away, {
      neutralVenue: neutral,
    });
    const pH = lambdaHome / (lambdaHome + lambdaAway);
    entry = { lH: lambdaHome, lA: lambdaAway, pH, pA: 1 - pH };
    cache.set(key, entry);
  }
  return entry;
}

function sampleGoals(
  cache: LambdaCache,
  home: string,
  away: string,
  neutral: boolean,
) {
  const { lH, lA } = getCachedLambdas(cache, home, away, neutral);
  return { h: poissonSample(lH), a: poissonSample(lA) };
}

function sampleKnockoutWinner(
  cache: LambdaCache,
  home: string,
  away: string,
): string {
  const { h, a } = sampleGoals(cache, home, away, true);
  if (h > a) return home;
  if (a > h) return away;
  const { pH } = getCachedLambdas(cache, home, away, true);
  return Math.random() < pH ? home : away;
}

type GroupedMatches = Map<string, Match[]>;

export function groupMatchesByGroup(matches: Match[]): GroupedMatches {
  const out: GroupedMatches = new Map();
  for (const m of matches) {
    if (!m.group) continue;
    if (m.stage && m.stage !== "GROUP_STAGE") continue;
    const list = out.get(m.group) ?? [];
    list.push(m);
    out.set(m.group, list);
  }
  return out;
}

export function teamsInGroups(grouped: GroupedMatches): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const [g, matches] of grouped) {
    const set = new Set<string>();
    for (const m of matches) {
      set.add(m.homeTeam.name);
      set.add(m.awayTeam.name);
    }
    out.set(g, Array.from(set));
  }
  return out;
}

type Standing = {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
};

function newStanding(team: string): Standing {
  return {
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0,
  };
}

function applyResult(s: Standing, gf: number, ga: number) {
  s.played++;
  s.gf += gf;
  s.ga += ga;
  s.gd = s.gf - s.ga;
  if (gf > ga) {
    s.won++;
    s.points += 3;
  } else if (gf < ga) {
    s.lost++;
  } else {
    s.drawn++;
    s.points++;
  }
}

function compareStandings(a: Standing, b: Standing): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.gd !== a.gd) return b.gd - a.gd;
  if (b.gf !== a.gf) return b.gf - a.gf;
  return Math.random() - 0.5;
}

function simulateGroupStage(
  grouped: GroupedMatches,
  cache: LambdaCache,
): Map<GroupLetter, Standing[]> {
  const out = new Map<GroupLetter, Standing[]>();
  for (const [groupTag, matches] of grouped) {
    const letter = groupLetterFromTag(groupTag);
    const standings = new Map<string, Standing>();
    const ensure = (t: string) => {
      let s = standings.get(t);
      if (!s) {
        s = newStanding(t);
        standings.set(t, s);
      }
      return s;
    };

    for (const m of matches) {
      const homeName = m.homeTeam.name;
      const awayName = m.awayTeam.name;
      const sHome = ensure(homeName);
      const sAway = ensure(awayName);

      let gh: number;
      let ga: number;

      if (
        m.status === "FINISHED" &&
        m.score?.fullTime?.home != null &&
        m.score?.fullTime?.away != null
      ) {
        gh = m.score.fullTime.home;
        ga = m.score.fullTime.away;
      } else {
        const sampled = sampleGoals(cache, homeName, awayName, false);
        gh = sampled.h;
        ga = sampled.a;
      }

      applyResult(sHome, gh, ga);
      applyResult(sAway, ga, gh);
    }

    out.set(letter, Array.from(standings.values()).sort(compareStandings));
  }
  return out;
}

function pickAdvancingThirds(tables: Map<GroupLetter, Standing[]>): GroupLetter[] {
  const thirds: Array<{ group: GroupLetter; standing: Standing }> = [];
  for (const [g, table] of tables) {
    if (table[2]) thirds.push({ group: g, standing: table[2] });
  }
  thirds.sort((a, b) => compareStandings(a.standing, b.standing));
  return thirds.slice(0, 8).map((x) => x.group);
}

function resolveSlot(
  slot: SlotSpec,
  matchNo: number,
  tables: Map<GroupLetter, Standing[]>,
  thirdsByMatch: Map<number, GroupLetter>,
): string {
  if (slot.kind === "winner") return tables.get(slot.group)![0].team;
  if (slot.kind === "runnerUp") return tables.get(slot.group)![1].team;
  const group = thirdsByMatch.get(matchNo);
  if (!group) throw new Error(`No third-place team assigned to match ${matchNo}`);
  return tables.get(group)![2].team;
}

type IterationOutcome =
  | { ok: true; reached: Map<string, Round>; usedAnnexC: boolean }
  | { ok: false; reason: "missing_qualifiers" | "no_third_assignment" };

function simulateOneTournament(
  grouped: GroupedMatches,
  cache: LambdaCache,
): IterationOutcome {
  const tables = simulateGroupStage(grouped, cache);

  for (const table of tables.values()) {
    if (table.length < 3) return { ok: false, reason: "missing_qualifiers" };
  }

  const advancingThirds = pickAdvancingThirds(tables);
  if (advancingThirds.length < 8) {
    return { ok: false, reason: "missing_qualifiers" };
  }

  const detail = assignThirdPlaceSlotsDetailed(advancingThirds);
  if (!detail) return { ok: false, reason: "no_third_assignment" };
  const thirdAssignment = detail.byMatch;
  const usedAnnexC = detail.source === "annex-c";

  const reached = new Map<string, Round>();

  const r32Teams = new Map<number, [string, string]>();
  for (const m of R32) {
    const t1 = resolveSlot(m.slot1, m.matchNo, tables, thirdAssignment);
    const t2 = resolveSlot(m.slot2, m.matchNo, tables, thirdAssignment);
    r32Teams.set(m.matchNo, [t1, t2]);
    reached.set(t1, "r32");
    reached.set(t2, "r32");
  }

  const r32Winners = new Map<number, string>();
  for (const [matchNo, [t1, t2]] of r32Teams) {
    const w = sampleKnockoutWinner(cache, t1, t2);
    r32Winners.set(matchNo, w);
    reached.set(w, "r16");
  }

  const r16Winners: string[] = [];
  for (const [m1, m2] of R16_PAIRINGS) {
    const w1 = r32Winners.get(m1)!;
    const w2 = r32Winners.get(m2)!;
    const w = sampleKnockoutWinner(cache, w1, w2);
    r16Winners.push(w);
    reached.set(w, "qf");
  }

  const qfWinners: string[] = [];
  for (const [i1, i2] of QF_PAIRINGS) {
    const w = sampleKnockoutWinner(cache, r16Winners[i1], r16Winners[i2]);
    qfWinners.push(w);
    reached.set(w, "sf");
  }

  const sfWinners: string[] = [];
  for (const [i1, i2] of SF_PAIRINGS) {
    const w = sampleKnockoutWinner(cache, qfWinners[i1], qfWinners[i2]);
    sfWinners.push(w);
    reached.set(w, "final");
  }

  const champion = sampleKnockoutWinner(
    cache,
    sfWinners[FINAL_PAIR[0]],
    sfWinners[FINAL_PAIR[1]],
  );
  reached.set(champion, "champion");

  return { ok: true, reached, usedAnnexC };
}

const ROUND_RANK: Record<Round, number> = {
  r32: 0,
  r16: 1,
  qf: 2,
  sf: 3,
  final: 4,
  champion: 5,
};

export function runTournamentSimulation(
  matches: Match[],
  iterations: number,
): SimulationResult {
  const grouped = groupMatchesByGroup(matches);

  if (grouped.size < 12) {
    throw new Error(
      `Tournament simulator needs all 12 groups (found ${grouped.size}). The full WC fixture list may not be in football-data.org yet.`,
    );
  }

  const expectedGroups: GroupLetter[] = [
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
  ];
  const presentGroups = new Set(
    Array.from(grouped.keys(), groupLetterFromTag),
  );
  const missing = expectedGroups.filter((g) => !presentGroups.has(g));
  if (missing.length > 0) {
    throw new Error(`Missing groups in fixture data: ${missing.join(", ")}`);
  }

  const teamsByGroup = teamsInGroups(grouped);
  const allTeams = new Set<string>();
  const teamGroup = new Map<string, string>();
  for (const [g, ts] of teamsByGroup) {
    for (const t of ts) {
      allTeams.add(t);
      teamGroup.set(t, g);
    }
  }

  type Counter = {
    qualify: number;
    r16: number;
    qf: number;
    sf: number;
    final: number;
    champion: number;
  };
  const counters = new Map<string, Counter>();
  for (const t of allTeams) {
    counters.set(t, { qualify: 0, r16: 0, qf: 0, sf: 0, final: 0, champion: 0 });
  }

  const lambdaCache: LambdaCache = new Map();
  let unresolvedThirdAssignments = 0;
  let annexCHits = 0;
  let fallbackMatcherHits = 0;
  let completed = 0;

  for (let iter = 0; iter < iterations; iter++) {
    const outcome = simulateOneTournament(grouped, lambdaCache);
    if (!outcome.ok) {
      if (outcome.reason === "no_third_assignment") unresolvedThirdAssignments++;
      continue;
    }
    completed++;
    if (outcome.usedAnnexC) annexCHits++;
    else fallbackMatcherHits++;

    for (const [team, round] of outcome.reached) {
      const c = counters.get(team);
      if (!c) continue;
      const rank = ROUND_RANK[round];
      c.qualify++;
      if (rank >= 1) c.r16++;
      if (rank >= 2) c.qf++;
      if (rank >= 3) c.sf++;
      if (rank >= 4) c.final++;
      if (rank >= 5) c.champion++;
    }
  }

  const denom = Math.max(1, completed);
  const teams: TeamReach[] = Array.from(allTeams)
    .map((team) => {
      const c = counters.get(team)!;
      return {
        team,
        group: teamGroup.get(team) ?? null,
        qualify: c.qualify / denom,
        r16: c.r16 / denom,
        qf: c.qf / denom,
        sf: c.sf / denom,
        final: c.final / denom,
        champion: c.champion / denom,
      };
    })
    .sort((a, b) => b.champion - a.champion);

  return {
    iterations: completed,
    groups: Array.from(teamsByGroup, ([group, teams]) => ({ group, teams })),
    teams,
    unresolvedThirdAssignments,
    annexCHits,
    fallbackMatcherHits,
  };
}
