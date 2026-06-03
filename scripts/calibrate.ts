#!/usr/bin/env tsx
// Grid-search AVG_GOALS × ELO_TO_GOALS on the historical WC backtest set.
// Reports the best combos, current params for reference, and a by-year
// cross-validation so we can sanity-check that the winner isn't an in-sample
// artefact.
//
// Usage: pnpm calibrate

import {
  fetchHistoricalMatches,
  evolveElos,
  type HistoricalMatch,
} from "../lib/elo-evolve";
import { buildScoreMatrix } from "../lib/poisson";

const BACKTEST_WCS = [2010, 2014, 2018, 2022];

// Current params (live in lib/predict.ts) — re-run pnpm calibrate after editing.
const CURRENT_AVG = 1.35;
const CURRENT_ETG = 0.0017;

const AVG_GRID = arange(1.00, 1.45, 0.025);
const ETG_GRID = arange(0.0010, 0.0028, 0.0001);

function arange(start: number, stop: number, step: number): number[] {
  const out: number[] = [];
  for (let v = start; v <= stop + 1e-9; v += step) out.push(Number(v.toFixed(6)));
  return out;
}

type Capture = {
  homeElo: number;
  awayElo: number;
  homeScore: number;
  awayScore: number;
  neutral: boolean;
  year: number;
};

function wcYear(date: string): number {
  return Number.parseInt(date.slice(0, 4), 10);
}

function predict(c: Capture, avg: number, etg: number) {
  const homeAdvantage = c.neutral ? 0 : 35;
  const eloDiff = c.homeElo + homeAdvantage - c.awayElo;
  const lambdaHome = Math.max(0.15, avg * Math.exp(etg * eloDiff));
  const lambdaAway = Math.max(0.15, avg * Math.exp(-etg * eloDiff));
  const matrix = buildScoreMatrix(lambdaHome, lambdaAway);
  return { lambdaHome, lambdaAway, ...matrix };
}

type Metrics = {
  logLoss: number;
  brier: number;
  acc: number;
  meanExpTotal: number;
  meanActTotal: number;
  n: number;
};

function score(captures: Capture[], avg: number, etg: number): Metrics {
  let logLoss = 0;
  let brier = 0;
  let modalHits = 0;
  let sumExp = 0;
  let sumAct = 0;

  for (const c of captures) {
    const p = predict(c, avg, etg);
    const actual = c.homeScore > c.awayScore ? "H" : c.homeScore < c.awayScore ? "A" : "D";
    const probActual = actual === "H" ? p.pHome : actual === "D" ? p.pDraw : p.pAway;
    logLoss += -Math.log(Math.max(probActual, 1e-9));

    const oneH = actual === "H" ? 1 : 0;
    const oneD = actual === "D" ? 1 : 0;
    const oneA = actual === "A" ? 1 : 0;
    brier += (p.pHome - oneH) ** 2 + (p.pDraw - oneD) ** 2 + (p.pAway - oneA) ** 2;

    const modal =
      p.pHome >= p.pDraw && p.pHome >= p.pAway
        ? "H"
        : p.pDraw >= p.pAway
          ? "D"
          : "A";
    if (modal === actual) modalHits++;

    sumExp += p.lambdaHome + p.lambdaAway;
    sumAct += c.homeScore + c.awayScore;
  }

  const n = captures.length;
  return {
    logLoss: logLoss / n,
    brier: brier / n,
    acc: modalHits / n,
    meanExpTotal: sumExp / n,
    meanActTotal: sumAct / n,
    n,
  };
}

function gridSearch(captures: Capture[]) {
  const results: Array<{ avg: number; etg: number; metrics: Metrics }> = [];
  for (const avg of AVG_GRID) {
    for (const etg of ETG_GRID) {
      results.push({ avg, etg, metrics: score(captures, avg, etg) });
    }
  }
  results.sort((a, b) => a.metrics.logLoss - b.metrics.logLoss);
  return results;
}

async function main() {
  console.log("Fetching historical matches…");
  const matches = await fetchHistoricalMatches();
  console.log(`  loaded ${matches.length.toLocaleString()} matches`);

  const wantWc = (m: HistoricalMatch) =>
    m.tournament === "FIFA World Cup" && BACKTEST_WCS.includes(wcYear(m.date));

  console.log("Capturing WC pre-match Elos…");
  const result = evolveElos(matches, { captureUpdatesFor: wantWc });
  const captures: Capture[] = result.updates.map((u) => ({
    homeElo: u.homeEloBefore,
    awayElo: u.awayEloBefore,
    homeScore: u.match.homeScore,
    awayScore: u.match.awayScore,
    neutral: u.match.neutral,
    year: wcYear(u.match.date),
  }));
  console.log(`  ${captures.length} matches across ${BACKTEST_WCS.join(", ")}`);

  console.log(
    `Grid: ${AVG_GRID.length} × ${ETG_GRID.length} = ${AVG_GRID.length * ETG_GRID.length} combos`,
  );

  const sorted = gridSearch(captures);
  const currentScore = score(captures, CURRENT_AVG, CURRENT_ETG);

  console.log("\nTop 10 (min log-loss):");
  console.log(
    `  ${"AVG".padStart(6)} ${"ETG".padStart(7)}    log-L    Brier    Acc      Exp/Act tot`,
  );
  for (const r of sorted.slice(0, 10)) {
    console.log(
      `  ${r.avg.toFixed(3).padStart(6)} ${r.etg.toFixed(4).padStart(7)}   ${r.metrics.logLoss.toFixed(4)}  ${r.metrics.brier.toFixed(4)}   ${(r.metrics.acc * 100).toFixed(1).padStart(5)}%   ${r.metrics.meanExpTotal.toFixed(2)} / ${r.metrics.meanActTotal.toFixed(2)}`,
    );
  }

  console.log(
    `\nCurrent (${CURRENT_AVG}, ${CURRENT_ETG}):  log-L ${currentScore.logLoss.toFixed(4)}   Brier ${currentScore.brier.toFixed(4)}   Acc ${(currentScore.acc * 100).toFixed(1)}%   Exp/Act ${currentScore.meanExpTotal.toFixed(2)}/${currentScore.meanActTotal.toFixed(2)}`,
  );

  const best = sorted[0];
  const improvement = ((currentScore.logLoss - best.metrics.logLoss) / currentScore.logLoss) * 100;
  console.log(
    `Best        (${best.avg}, ${best.etg}):  log-L ${best.metrics.logLoss.toFixed(4)}   Brier ${best.metrics.brier.toFixed(4)}   Acc ${(best.metrics.acc * 100).toFixed(1)}%   improvement: ${improvement.toFixed(2)}%`,
  );

  // By-year CV: pick optimal on 3 WCs, evaluate on the held-out
  console.log("\nLeave-one-out cross-validation by WC year:");
  console.log("  held-out  N    best (avg, etg) on rest    eval log-L / Brier / Acc");
  const cvParams: Array<{ avg: number; etg: number }> = [];
  for (const heldOut of BACKTEST_WCS) {
    const train = captures.filter((c) => c.year !== heldOut);
    const test = captures.filter((c) => c.year === heldOut);
    if (test.length === 0) continue;

    const trainSorted = gridSearch(train);
    const winner = trainSorted[0];
    cvParams.push({ avg: winner.avg, etg: winner.etg });
    const eval_ = score(test, winner.avg, winner.etg);
    console.log(
      `  ${heldOut}      ${String(test.length).padStart(3)}   (${winner.avg.toFixed(3)}, ${winner.etg.toFixed(4)})           ${eval_.logLoss.toFixed(4)} / ${eval_.brier.toFixed(4)} / ${(eval_.acc * 100).toFixed(1)}%`,
    );
  }
  const avgMean = cvParams.reduce((s, p) => s + p.avg, 0) / cvParams.length;
  const etgMean = cvParams.reduce((s, p) => s + p.etg, 0) / cvParams.length;
  console.log(
    `\n  Mean of CV winners: AVG = ${avgMean.toFixed(3)}, ETG = ${etgMean.toFixed(4)}`,
  );

  // Robust recommendation: use full-data winner if CV winners cluster around it.
  const fullMatchesCV = cvParams.filter(
    (p) => Math.abs(p.avg - best.avg) < 0.05 && Math.abs(p.etg - best.etg) < 0.0003,
  ).length;
  console.log(
    `  ${fullMatchesCV}/${cvParams.length} CV folds picked a combo within (±0.05, ±0.0003) of the full-data winner.`,
  );

  console.log(
    `\nRecommendation: update lib/predict.ts to AVG_GOALS = ${best.avg}, ELO_TO_GOALS = ${best.etg}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
