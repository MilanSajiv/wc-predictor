#!/usr/bin/env tsx
// Validate the goal model against historical World Cup matches.
//
// For each WC match in our window: predict using the Elo ratings as they were
// just before that match (computed by rolling all prior international matches
// through the World Football Elo update), then compare to the actual outcome.
//
// Reports per-WC and overall:
//   - log loss (multinomial over H/D/A)
//   - Brier score
//   - modal accuracy
//   - calibration bins on P(home win)
//   - mean expected goals vs. mean actual goals
//
// Usage: pnpm backtest

import { fetchHistoricalMatches, evolveElos, type HistoricalMatch } from "../lib/elo-evolve";
import { lambdasFromElo } from "../lib/predict";
import { buildScoreMatrix } from "../lib/poisson";

const BACKTEST_WCS = [2010, 2014, 2018, 2022];

type Prediction = {
  match: HistoricalMatch;
  homeElo: number;
  awayElo: number;
  pH: number;
  pD: number;
  pA: number;
  expectedHomeGoals: number;
  expectedAwayGoals: number;
};

function wcYear(date: string): number | null {
  const y = Number.parseInt(date.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

function pickModal(p: { pH: number; pD: number; pA: number }): "H" | "D" | "A" {
  if (p.pH >= p.pD && p.pH >= p.pA) return "H";
  if (p.pD >= p.pA) return "D";
  return "A";
}

function actualOutcome(m: HistoricalMatch): "H" | "D" | "A" {
  if (m.homeScore > m.awayScore) return "H";
  if (m.homeScore < m.awayScore) return "A";
  return "D";
}

function score(predictions: Prediction[]) {
  let logLoss = 0;
  let brier = 0;
  let modalHits = 0;
  let sumExpGoalsHome = 0;
  let sumExpGoalsAway = 0;
  let sumActGoalsHome = 0;
  let sumActGoalsAway = 0;
  const bins: Array<{ predSum: number; actHomeWins: number; n: number }> = [];
  for (let i = 0; i < 10; i++) bins.push({ predSum: 0, actHomeWins: 0, n: 0 });

  for (const p of predictions) {
    const actual = actualOutcome(p.match);
    const probActual = actual === "H" ? p.pH : actual === "D" ? p.pD : p.pA;
    logLoss += -Math.log(Math.max(probActual, 1e-9));

    const oneHotH = actual === "H" ? 1 : 0;
    const oneHotD = actual === "D" ? 1 : 0;
    const oneHotA = actual === "A" ? 1 : 0;
    brier += (p.pH - oneHotH) ** 2 + (p.pD - oneHotD) ** 2 + (p.pA - oneHotA) ** 2;

    if (pickModal(p) === actual) modalHits++;

    sumExpGoalsHome += p.expectedHomeGoals;
    sumExpGoalsAway += p.expectedAwayGoals;
    sumActGoalsHome += p.match.homeScore;
    sumActGoalsAway += p.match.awayScore;

    const bin = Math.min(9, Math.floor(p.pH * 10));
    bins[bin].predSum += p.pH;
    bins[bin].actHomeWins += oneHotH;
    bins[bin].n += 1;
  }

  return {
    n: predictions.length,
    logLoss: logLoss / predictions.length,
    brier: brier / predictions.length,
    modalAccuracy: modalHits / predictions.length,
    meanExpHomeGoals: sumExpGoalsHome / predictions.length,
    meanExpAwayGoals: sumExpGoalsAway / predictions.length,
    meanActHomeGoals: sumActGoalsHome / predictions.length,
    meanActAwayGoals: sumActGoalsAway / predictions.length,
    bins,
  };
}

function formatRow(label: string, m: ReturnType<typeof score>): string {
  return [
    label.padEnd(10),
    String(m.n).padStart(4),
    m.logLoss.toFixed(3).padStart(7),
    m.brier.toFixed(3).padStart(6),
    (m.modalAccuracy * 100).toFixed(1).padStart(6) + "%",
    `${m.meanExpHomeGoals.toFixed(2)}-${m.meanExpAwayGoals.toFixed(2)}`.padStart(11),
    `${m.meanActHomeGoals.toFixed(2)}-${m.meanActAwayGoals.toFixed(2)}`.padStart(11),
  ].join("  ");
}

async function main() {
  console.log("Fetching historical matches…");
  const matches = await fetchHistoricalMatches();
  console.log(`  loaded ${matches.length.toLocaleString()} matches`);

  // Capture pre-match Elos for the WC matches in our window
  const captured: Map<HistoricalMatch, { homeElo: number; awayElo: number }> = new Map();
  const wantWc = (m: HistoricalMatch) =>
    m.tournament === "FIFA World Cup" &&
    BACKTEST_WCS.includes(wcYear(m.date) ?? -1);

  console.log("Rolling Elos forward, capturing WC matches…");
  const result = evolveElos(matches, { captureUpdatesFor: wantWc });
  for (const u of result.updates) {
    captured.set(u.match, { homeElo: u.homeEloBefore, awayElo: u.awayEloBefore });
  }
  console.log(`  captured ${captured.size} WC matches across ${BACKTEST_WCS.join(", ")}`);

  // Build predictions
  const allPreds: Prediction[] = [];
  const byYear = new Map<number, Prediction[]>();
  for (const [m, elos] of captured) {
    // Neutral venue for WC games not hosted in either team's country
    const isHomeHost = !m.neutral; // dataset already marks WC games as neutral=true
    const { lambdaHome, lambdaAway } = lambdasFromElo(elos.homeElo, elos.awayElo, {
      homeAdvantage: isHomeHost ? 35 : 0,
    });
    const matrix = buildScoreMatrix(lambdaHome, lambdaAway);
    const pred: Prediction = {
      match: m,
      homeElo: elos.homeElo,
      awayElo: elos.awayElo,
      pH: matrix.pHome,
      pD: matrix.pDraw,
      pA: matrix.pAway,
      expectedHomeGoals: lambdaHome,
      expectedAwayGoals: lambdaAway,
    };
    allPreds.push(pred);
    const y = wcYear(m.date)!;
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y)!.push(pred);
  }

  console.log("\n" + " ".repeat(10) + "  ".concat(
    ["   N", " log-L", " Brier", "  Acc", "  exp goals", "  act goals"].join("  "),
  ));
  for (const y of BACKTEST_WCS) {
    const preds = byYear.get(y) ?? [];
    if (preds.length === 0) {
      console.log(`${String(y).padEnd(10)}  (no matches)`);
      continue;
    }
    console.log(formatRow(String(y), score(preds)));
  }
  const overall = score(allPreds);
  console.log("─".repeat(72));
  console.log(formatRow("Overall", overall));

  console.log("\nCalibration on P(home win) — overall:");
  console.log("  bin       n     predicted    actual    gap");
  for (let i = 0; i < 10; i++) {
    const b = overall.bins[i];
    if (b.n === 0) continue;
    const predMean = b.predSum / b.n;
    const actMean = b.actHomeWins / b.n;
    const gap = actMean - predMean;
    const lo = (i / 10).toFixed(1);
    const hi = ((i + 1) / 10).toFixed(1);
    console.log(
      `  ${lo}-${hi}  ${String(b.n).padStart(3)}    ${(predMean * 100).toFixed(1).padStart(5)}%   ${(actMean * 100).toFixed(1).padStart(5)}%   ${(gap > 0 ? "+" : "") + (gap * 100).toFixed(1)}%`,
    );
  }

  console.log("\nReference baselines on the same set:");
  // "Always home wins" baseline (i.e. always pick H with full confidence — bad)
  // Use a sane "always predict 1/3 each" baseline
  const naivePreds: Prediction[] = allPreds.map((p) => ({
    ...p,
    pH: 1 / 3,
    pD: 1 / 3,
    pA: 1 / 3,
  }));
  const naive = score(naivePreds);
  console.log(`  Uniform (1/3 each):  log-L ${naive.logLoss.toFixed(3)}   Brier ${naive.brier.toFixed(3)}   Acc ${(naive.modalAccuracy * 100).toFixed(1)}%`);

  // Empirical base-rate baseline (use overall WC base rates)
  let hCount = 0, dCount = 0, aCount = 0;
  for (const p of allPreds) {
    const o = actualOutcome(p.match);
    if (o === "H") hCount++; else if (o === "D") dCount++; else aCount++;
  }
  const baseH = hCount / allPreds.length;
  const baseD = dCount / allPreds.length;
  const baseA = aCount / allPreds.length;
  const basePreds: Prediction[] = allPreds.map((p) => ({
    ...p,
    pH: baseH,
    pD: baseD,
    pA: baseA,
  }));
  const base = score(basePreds);
  console.log(
    `  Base rate (${(baseH * 100).toFixed(0)}/${(baseD * 100).toFixed(0)}/${(baseA * 100).toFixed(0)}): log-L ${base.logLoss.toFixed(3)}   Brier ${base.brier.toFixed(3)}   Acc ${(base.modalAccuracy * 100).toFixed(1)}%`,
  );

  console.log(
    `\nThe model wins if log-loss < ${Math.min(naive.logLoss, base.logLoss).toFixed(3)}  and  Brier < ${Math.min(naive.brier, base.brier).toFixed(3)}.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
