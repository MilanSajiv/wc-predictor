import { generateText } from "ai";
import type { Prediction } from "./predict";

const MODEL = process.env.WC_COMMENTARY_MODEL ?? "anthropic/claude-haiku-4-5";

export async function generateCommentary(p: Prediction): Promise<string> {
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL) {
    return fallbackCommentary(p);
  }

  try {
    const result = await generateText({
      model: MODEL,
      prompt: buildPrompt(p),
      temperature: 0.7,
    });
    return result.text.trim();
  } catch (err) {
    console.error("commentary generation failed:", err);
    return fallbackCommentary(p);
  }
}

function buildPrompt(p: Prediction): string {
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const top = p.topScorelines
    .slice(0, 3)
    .map((s) => `${s.home}-${s.away} (${pct(s.prob)})`)
    .join(", ");

  return `You are a sharp, neutral football pundit writing for a World Cup 2026 predictions site.

Match: ${p.homeName} vs ${p.awayName}
Model output:
- Win probabilities: ${p.homeName} ${pct(p.pHome)} | Draw ${pct(p.pDraw)} | ${p.awayName} ${pct(p.pAway)}
- Expected goals: ${p.expectedHome.toFixed(2)} vs ${p.expectedAway.toFixed(2)}
- Elo ratings: ${p.homeName} ${p.homeElo}, ${p.awayName} ${p.awayElo}
- Most likely scorelines: ${top}

Write 2-3 sentences explaining the prediction. Focus on the strength gap and a likely scoreline. Don't restate every number verbatim. Don't hedge with disclaimers. British English. No emojis.`;
}

function fallbackCommentary(p: Prediction): string {
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const favourite =
    p.pHome > p.pAway
      ? `${p.homeName} are favourites at ${pct(p.pHome)}`
      : p.pAway > p.pHome
        ? `${p.awayName} are favourites at ${pct(p.pAway)}`
        : "this looks like a coin-flip";
  const score = p.topScorelines[0];
  return `${favourite}, with the model expecting ${p.expectedHome.toFixed(1)}–${p.expectedAway.toFixed(1)} on goals. The most likely scoreline is ${score.home}–${score.away}. (Set AI_GATEWAY_API_KEY for AI-written commentary.)`;
}
