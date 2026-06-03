#!/usr/bin/env tsx
// Fetch the martj42 international-results dataset, evolve Elos through history,
// and write fresh seeds to data/elo-seed.json.
//
// Usage: pnpm update-elo

import { writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fetchHistoricalMatches, evolveElos } from "../lib/elo-evolve";

const SEED_PATH = resolve(__dirname, "..", "data", "elo-seed.json");
const MIN_MATCHES = 15;
const MIN_RECENCY_YEARS = 3;
const TODAY = "2026-06-03";

// Aliases — write Elos under both names so different data sources resolve.
const ALIASES: Record<string, string[]> = {
  "United States": ["USA"],
  Czechia: ["Czech Republic"],
  "South Korea": ["Korea Republic"],
  Iran: ["IR Iran"],
  Türkiye: ["Turkey"],
  "Ivory Coast": ["Côte d'Ivoire"],
  "Cape Verde": ["Cabo Verde"],
  "DR Congo": ["Congo DR"],
  "North Macedonia": ["Macedonia"],
};

function yearsBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / (365.25 * 24 * 3600 * 1000);
}

async function main() {
  console.log("Fetching historical matches…");
  const matches = await fetchHistoricalMatches();
  console.log(`  loaded ${matches.length.toLocaleString()} matches`);
  console.log(`  date range: ${matches[0].date} → ${matches[matches.length - 1].date}`);

  console.log("Evolving Elos…");
  const { finalElos, lastMatchDate, matchCount } = evolveElos(matches);
  console.log(`  ${finalElos.size} teams in dataset`);

  // Filter: recent activity + meaningful sample
  const eligible: Array<{ team: string; elo: number; matches: number; lastDate: string }> = [];
  for (const [team, elo] of finalElos) {
    const last = lastMatchDate.get(team)!;
    const matches = matchCount.get(team)!;
    if (matches < MIN_MATCHES) continue;
    if (yearsBetween(last, TODAY) > MIN_RECENCY_YEARS) continue;
    eligible.push({ team, elo, matches, lastDate: last });
  }
  eligible.sort((a, b) => b.elo - a.elo);
  console.log(`  ${eligible.length} teams pass filter (${MIN_MATCHES}+ matches, played within ${MIN_RECENCY_YEARS}y)`);

  // Read existing seed so unmatched aliases survive
  let existing: Record<string, number> = {};
  try {
    existing = JSON.parse(readFileSync(SEED_PATH, "utf-8"));
  } catch {
    /* first run */
  }

  const seeded: Record<string, number> = {};
  for (const { team, elo } of eligible) {
    const rounded = Math.round(elo);
    seeded[team] = rounded;
    for (const alias of ALIASES[team] ?? []) {
      seeded[alias] = rounded;
    }
  }

  // Top of the world
  console.log("\nTop 15:");
  for (const e of eligible.slice(0, 15)) {
    console.log(
      `  ${e.team.padEnd(22)} ${Math.round(e.elo).toString().padStart(5)}   (${e.matches} matches, last ${e.lastDate})`,
    );
  }

  // Diff against existing seed
  const added: string[] = [];
  const removed: string[] = [];
  const movers: Array<{ team: string; before: number; after: number; delta: number }> = [];
  for (const team of Object.keys(seeded)) {
    if (existing[team] == null) {
      added.push(team);
    } else if (existing[team] !== seeded[team]) {
      movers.push({
        team,
        before: existing[team],
        after: seeded[team],
        delta: seeded[team] - existing[team],
      });
    }
  }
  for (const team of Object.keys(existing)) {
    if (seeded[team] == null) removed.push(team);
  }
  movers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  console.log(`\nDiff vs existing seed:`);
  console.log(`  +${added.length} added, -${removed.length} removed`);
  if (movers.length > 0) {
    console.log(`  Top 10 movers:`);
    for (const m of movers.slice(0, 10)) {
      const sign = m.delta > 0 ? "+" : "";
      console.log(`    ${m.team.padEnd(22)} ${m.before} → ${m.after} (${sign}${m.delta})`);
    }
  }
  if (added.length > 0 && added.length <= 20) {
    console.log(`  Added: ${added.join(", ")}`);
  }
  if (removed.length > 0 && removed.length <= 20) {
    console.log(`  Removed: ${removed.join(", ")}`);
  }

  writeFileSync(SEED_PATH, JSON.stringify(seeded, null, 2) + "\n");
  console.log(`\nWrote ${Object.keys(seeded).length} entries to ${SEED_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
