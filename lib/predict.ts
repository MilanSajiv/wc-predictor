import { getElo, isSeeded } from "./elo";
import { buildScoreMatrix, type ScoreMatrix } from "./poisson";

// Calibrated against 256 WC matches (2010, 2014, 2018, 2022) via pnpm calibrate.
// Grid-search winner; sits on a very flat optimum so values within ±0.025 / ±0.0002
// give near-identical log-loss.
export const AVG_GOALS = 1.35;
export const ELO_TO_GOALS = 0.0017;
export const HOME_ADVANTAGE_ELO = 35;
export const HOSTS_2026 = new Set(["United States", "USA", "Canada", "Mexico"]);

export type Lambdas = {
  lambdaHome: number;
  lambdaAway: number;
  homeElo: number;
  awayElo: number;
  homeAdvantage: number;
};

export function lambdasFromElo(
  homeElo: number,
  awayElo: number,
  options: { homeAdvantage?: number } = {},
): Lambdas {
  const homeAdvantage = options.homeAdvantage ?? 0;
  const eloDiff = homeElo + homeAdvantage - awayElo;
  const lambdaHome = Math.max(0.15, AVG_GOALS * Math.exp(ELO_TO_GOALS * eloDiff));
  const lambdaAway = Math.max(0.15, AVG_GOALS * Math.exp(-ELO_TO_GOALS * eloDiff));
  return { lambdaHome, lambdaAway, homeElo, awayElo, homeAdvantage };
}

export function lambdasFor(
  homeName: string,
  awayName: string,
  options: { neutralVenue?: boolean } = {},
): Lambdas {
  const homeAdvantage =
    options.neutralVenue || !HOSTS_2026.has(homeName) ? 0 : HOME_ADVANTAGE_ELO;
  return lambdasFromElo(getElo(homeName), getElo(awayName), { homeAdvantage });
}

export type Prediction = ScoreMatrix & {
  homeName: string;
  awayName: string;
  homeElo: number;
  awayElo: number;
  homeSeeded: boolean;
  awaySeeded: boolean;
  homeAdvantage: number;
  recommendation: { pick: "HOME" | "DRAW" | "AWAY"; confidence: number };
};

export function predictMatch(homeName: string, awayName: string): Prediction {
  const { lambdaHome, lambdaAway, homeElo, awayElo, homeAdvantage } = lambdasFor(
    homeName,
    awayName,
  );

  const matrix = buildScoreMatrix(lambdaHome, lambdaAway);

  const probs: Array<{ pick: "HOME" | "DRAW" | "AWAY"; p: number }> = [
    { pick: "HOME", p: matrix.pHome },
    { pick: "DRAW", p: matrix.pDraw },
    { pick: "AWAY", p: matrix.pAway },
  ];
  probs.sort((a, b) => b.p - a.p);

  return {
    ...matrix,
    homeName,
    awayName,
    homeElo,
    awayElo,
    homeSeeded: isSeeded(homeName),
    awaySeeded: isSeeded(awayName),
    homeAdvantage,
    recommendation: { pick: probs[0].pick, confidence: probs[0].p },
  };
}
