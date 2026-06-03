function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
}

export type Scoreline = { home: number; away: number; prob: number };

export type ScoreMatrix = {
  pHome: number;
  pDraw: number;
  pAway: number;
  expectedHome: number;
  expectedAway: number;
  topScorelines: Scoreline[];
};

export function buildScoreMatrix(
  lambdaHome: number,
  lambdaAway: number,
  maxGoals = 8,
): ScoreMatrix {
  let pHome = 0;
  let pDraw = 0;
  let pAway = 0;
  const scorelines: Scoreline[] = [];

  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const p = poissonPmf(h, lambdaHome) * poissonPmf(a, lambdaAway);
      scorelines.push({ home: h, away: a, prob: p });
      if (h > a) pHome += p;
      else if (h < a) pAway += p;
      else pDraw += p;
    }
  }

  scorelines.sort((x, y) => y.prob - x.prob);

  return {
    pHome,
    pDraw,
    pAway,
    expectedHome: lambdaHome,
    expectedAway: lambdaAway,
    topScorelines: scorelines.slice(0, 5),
  };
}
