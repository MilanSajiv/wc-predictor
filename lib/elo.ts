import seed from "@/data/elo-seed.json";

const DEFAULT_ELO = 1600;

const ratings = seed as Record<string, number>;

const normalised = new Map<string, number>(
  Object.entries(ratings).map(([k, v]) => [normalise(k), v]),
);

function normalise(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "");
}

export function getElo(teamName: string): number {
  if (ratings[teamName] != null) return ratings[teamName];
  const hit = normalised.get(normalise(teamName));
  return hit ?? DEFAULT_ELO;
}

export function isSeeded(teamName: string): boolean {
  return ratings[teamName] != null || normalised.has(normalise(teamName));
}
