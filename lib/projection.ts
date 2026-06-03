import { lambdasFor } from "./predict";
import { buildScoreMatrix } from "./poisson";
import {
  R32,
  R16_PAIRINGS,
  QF_PAIRINGS,
  SF_PAIRINGS,
  FINAL_PAIR,
  assignThirdPlaceSlots,
  groupLetterFromTag,
  type GroupLetter,
  type SlotSpec,
} from "./bracket";
import type { Match } from "./football-data";

export type ProjectedStanding = {
  team: string;
  matchesPlayed: number;
  matchesProjected: number;
  expectedPoints: number;
  expectedGD: number;
  expectedGF: number;
  realPoints: number;
  realGD: number;
  realGF: number;
};

export type GroupProjection = {
  group: GroupLetter;
  teams: ProjectedStanding[];
  finished: number;
  total: number;
};

function newStanding(team: string): ProjectedStanding {
  return {
    team,
    matchesPlayed: 0,
    matchesProjected: 0,
    expectedPoints: 0,
    expectedGD: 0,
    expectedGF: 0,
    realPoints: 0,
    realGD: 0,
    realGF: 0,
  };
}

export function computeProjections(
  matches: Match[],
): Map<GroupLetter, GroupProjection> {
  const byGroup = new Map<string, Match[]>();
  for (const m of matches) {
    if (!m.group) continue;
    if (m.stage && m.stage !== "GROUP_STAGE") continue;
    const list = byGroup.get(m.group) ?? [];
    list.push(m);
    byGroup.set(m.group, list);
  }

  const out = new Map<GroupLetter, GroupProjection>();

  for (const [tag, groupMatches] of byGroup) {
    const letter = groupLetterFromTag(tag);
    const standings = new Map<string, ProjectedStanding>();
    const ensure = (t: string) => {
      let s = standings.get(t);
      if (!s) {
        s = newStanding(t);
        standings.set(t, s);
      }
      return s;
    };

    let finished = 0;

    for (const m of groupMatches) {
      const home = ensure(m.homeTeam.name);
      const away = ensure(m.awayTeam.name);
      const isFinished =
        m.status === "FINISHED" &&
        m.score?.fullTime?.home != null &&
        m.score?.fullTime?.away != null;

      if (isFinished) {
        const gh = m.score!.fullTime!.home!;
        const ga = m.score!.fullTime!.away!;
        home.matchesPlayed++;
        away.matchesPlayed++;
        home.realGF += gh;
        home.realGD += gh - ga;
        away.realGF += ga;
        away.realGD += ga - gh;
        home.expectedGF += gh;
        home.expectedGD += gh - ga;
        away.expectedGF += ga;
        away.expectedGD += ga - gh;
        if (gh > ga) {
          home.realPoints += 3;
          home.expectedPoints += 3;
        } else if (ga > gh) {
          away.realPoints += 3;
          away.expectedPoints += 3;
        } else {
          home.realPoints += 1;
          away.realPoints += 1;
          home.expectedPoints += 1;
          away.expectedPoints += 1;
        }
        finished++;
      } else {
        const { lambdaHome, lambdaAway } = lambdasFor(
          m.homeTeam.name,
          m.awayTeam.name,
        );
        const matrix = buildScoreMatrix(lambdaHome, lambdaAway);
        home.matchesProjected++;
        away.matchesProjected++;
        home.expectedPoints += 3 * matrix.pHome + matrix.pDraw;
        away.expectedPoints += 3 * matrix.pAway + matrix.pDraw;
        home.expectedGF += lambdaHome;
        away.expectedGF += lambdaAway;
        home.expectedGD += lambdaHome - lambdaAway;
        away.expectedGD += lambdaAway - lambdaHome;
      }
    }

    const sorted = Array.from(standings.values()).sort((a, b) => {
      if (b.expectedPoints !== a.expectedPoints)
        return b.expectedPoints - a.expectedPoints;
      if (b.expectedGD !== a.expectedGD) return b.expectedGD - a.expectedGD;
      return b.expectedGF - a.expectedGF;
    });

    out.set(letter, {
      group: letter,
      teams: sorted,
      finished,
      total: groupMatches.length,
    });
  }

  return out;
}

export type ProjectedSlot = { team: string; label: string };

export type ProjectedBracketMatch = {
  matchNo: number;
  teamA: ProjectedSlot;
  teamB: ProjectedSlot;
  pA: number;
  pB: number;
  winner: string;
};

export type MostLikelyBracket = {
  r32: ProjectedBracketMatch[];
  r16: ProjectedBracketMatch[];
  qf: ProjectedBracketMatch[];
  sf: ProjectedBracketMatch[];
  final: ProjectedBracketMatch;
  champion: string;
  jointProbability: number;
  thirdAssignment: Map<number, GroupLetter>;
};

function knockoutPick(teamA: string, teamB: string) {
  const { lambdaHome, lambdaAway } = lambdasFor(teamA, teamB, {
    neutralVenue: true,
  });
  const matrix = buildScoreMatrix(lambdaHome, lambdaAway);
  const norm = matrix.pHome + matrix.pAway;
  const drawSplit = norm > 0 ? matrix.pHome / norm : 0.5;
  const pA = matrix.pHome + matrix.pDraw * drawSplit;
  const pB = 1 - pA;
  return { pA, pB, winner: pA >= pB ? teamA : teamB };
}

export function buildMostLikelyBracket(
  projections: Map<GroupLetter, GroupProjection>,
): MostLikelyBracket | null {
  for (const proj of projections.values()) {
    if (proj.teams.length < 3) return null;
  }

  const thirds = Array.from(projections.values())
    .map((p) => ({
      group: p.group,
      ep: p.teams[2].expectedPoints,
      egd: p.teams[2].expectedGD,
      egf: p.teams[2].expectedGF,
    }))
    .sort((a, b) => {
      if (b.ep !== a.ep) return b.ep - a.ep;
      if (b.egd !== a.egd) return b.egd - a.egd;
      return b.egf - a.egf;
    });

  const advancing = thirds.slice(0, 8).map((t) => t.group);
  const assignment = assignThirdPlaceSlots(advancing);
  if (!assignment) return null;

  const resolveSlot = (slot: SlotSpec, matchNo: number): ProjectedSlot => {
    if (slot.kind === "winner") {
      return {
        team: projections.get(slot.group)!.teams[0].team,
        label: `1${slot.group}`,
      };
    }
    if (slot.kind === "runnerUp") {
      return {
        team: projections.get(slot.group)!.teams[1].team,
        label: `2${slot.group}`,
      };
    }
    const group = assignment.get(matchNo);
    if (!group) throw new Error(`Missing 3rd-place assignment for M${matchNo}`);
    return {
      team: projections.get(group)!.teams[2].team,
      label: `3${group}`,
    };
  };

  let jointProbability = 1;

  const r32: ProjectedBracketMatch[] = [];
  const r32Winners = new Map<number, string>();
  for (const spec of R32) {
    const teamA = resolveSlot(spec.slot1, spec.matchNo);
    const teamB = resolveSlot(spec.slot2, spec.matchNo);
    const { pA, pB, winner } = knockoutPick(teamA.team, teamB.team);
    r32.push({ matchNo: spec.matchNo, teamA, teamB, pA, pB, winner });
    r32Winners.set(spec.matchNo, winner);
    jointProbability *= Math.max(pA, pB);
  }

  const r16Winners: string[] = [];
  const r16: ProjectedBracketMatch[] = R16_PAIRINGS.map(([m1, m2], i) => {
    const teamA: ProjectedSlot = {
      team: r32Winners.get(m1)!,
      label: `W ${m1}`,
    };
    const teamB: ProjectedSlot = {
      team: r32Winners.get(m2)!,
      label: `W ${m2}`,
    };
    const { pA, pB, winner } = knockoutPick(teamA.team, teamB.team);
    r16Winners.push(winner);
    jointProbability *= Math.max(pA, pB);
    return { matchNo: 89 + i, teamA, teamB, pA, pB, winner };
  });

  const qfWinners: string[] = [];
  const qf: ProjectedBracketMatch[] = QF_PAIRINGS.map(([i1, i2], i) => {
    const teamA: ProjectedSlot = {
      team: r16Winners[i1],
      label: `W ${89 + i1}`,
    };
    const teamB: ProjectedSlot = {
      team: r16Winners[i2],
      label: `W ${89 + i2}`,
    };
    const { pA, pB, winner } = knockoutPick(teamA.team, teamB.team);
    qfWinners.push(winner);
    jointProbability *= Math.max(pA, pB);
    return { matchNo: 97 + i, teamA, teamB, pA, pB, winner };
  });

  const sfWinners: string[] = [];
  const sf: ProjectedBracketMatch[] = SF_PAIRINGS.map(([i1, i2], i) => {
    const teamA: ProjectedSlot = {
      team: qfWinners[i1],
      label: `W ${97 + i1}`,
    };
    const teamB: ProjectedSlot = {
      team: qfWinners[i2],
      label: `W ${97 + i2}`,
    };
    const { pA, pB, winner } = knockoutPick(teamA.team, teamB.team);
    sfWinners.push(winner);
    jointProbability *= Math.max(pA, pB);
    return { matchNo: 101 + i, teamA, teamB, pA, pB, winner };
  });

  const finalA: ProjectedSlot = {
    team: sfWinners[FINAL_PAIR[0]],
    label: `W ${101 + FINAL_PAIR[0]}`,
  };
  const finalB: ProjectedSlot = {
    team: sfWinners[FINAL_PAIR[1]],
    label: `W ${101 + FINAL_PAIR[1]}`,
  };
  const { pA, pB, winner } = knockoutPick(finalA.team, finalB.team);
  jointProbability *= Math.max(pA, pB);
  const finalMatch: ProjectedBracketMatch = {
    matchNo: 104,
    teamA: finalA,
    teamB: finalB,
    pA,
    pB,
    winner,
  };

  return {
    r32,
    r16,
    qf,
    sf,
    final: finalMatch,
    champion: winner,
    jointProbability,
    thirdAssignment: assignment,
  };
}
