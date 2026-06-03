export type GroupLetter =
  | "A" | "B" | "C" | "D" | "E" | "F"
  | "G" | "H" | "I" | "J" | "K" | "L";

export type SlotSpec =
  | { kind: "winner"; group: GroupLetter }
  | { kind: "runnerUp"; group: GroupLetter }
  | { kind: "third"; allowed: GroupLetter[] };

export type R32MatchSpec = {
  matchNo: number;
  slot1: SlotSpec;
  slot2: SlotSpec;
};

const w = (group: GroupLetter): SlotSpec => ({ kind: "winner", group });
const ru = (group: GroupLetter): SlotSpec => ({ kind: "runnerUp", group });
const t3 = (...allowed: GroupLetter[]): SlotSpec => ({ kind: "third", allowed });

export const R32: R32MatchSpec[] = [
  { matchNo: 73, slot1: ru("A"), slot2: ru("B") },
  { matchNo: 74, slot1: w("E"),  slot2: t3("A", "B", "C", "D", "F") },
  { matchNo: 75, slot1: w("F"),  slot2: ru("C") },
  { matchNo: 76, slot1: w("C"),  slot2: ru("F") },
  { matchNo: 77, slot1: w("I"),  slot2: t3("C", "D", "F", "G", "H") },
  { matchNo: 78, slot1: ru("E"), slot2: ru("I") },
  { matchNo: 79, slot1: w("A"),  slot2: t3("C", "E", "F", "H", "I") },
  { matchNo: 80, slot1: w("L"),  slot2: t3("E", "H", "I", "J", "K") },
  { matchNo: 81, slot1: w("D"),  slot2: t3("B", "E", "F", "I", "J") },
  { matchNo: 82, slot1: w("G"),  slot2: t3("A", "E", "H", "I", "J") },
  { matchNo: 83, slot1: ru("K"), slot2: ru("L") },
  { matchNo: 84, slot1: w("H"),  slot2: ru("J") },
  { matchNo: 85, slot1: w("B"),  slot2: t3("E", "F", "G", "I", "J") },
  { matchNo: 86, slot1: w("J"),  slot2: ru("H") },
  { matchNo: 87, slot1: w("K"),  slot2: t3("D", "E", "I", "J", "L") },
  { matchNo: 88, slot1: ru("D"), slot2: ru("G") },
];

export const R16_PAIRINGS: ReadonlyArray<readonly [number, number]> = [
  [73, 75], // M89
  [74, 77], // M90
  [76, 78], // M91
  [79, 80], // M92
  [83, 84], // M93
  [81, 82], // M94
  [86, 88], // M95
  [85, 87], // M96
];

export const QF_PAIRINGS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], // M97  = W89 vs W90
  [4, 5], // M98  = W93 vs W94
  [2, 3], // M99  = W91 vs W92
  [6, 7], // M100 = W95 vs W96
];

export const SF_PAIRINGS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], // M101 = W97 vs W98
  [2, 3], // M102 = W99 vs W100
];

export const FINAL_PAIR: readonly [number, number] = [0, 1];

export const THIRD_SLOTS: ReadonlyArray<{
  matchNo: number;
  allowed: ReadonlySet<GroupLetter>;
}> = R32.flatMap((m) => {
  const out: Array<{ matchNo: number; allowed: ReadonlySet<GroupLetter> }> = [];
  if (m.slot1.kind === "third") out.push({ matchNo: m.matchNo, allowed: new Set(m.slot1.allowed) });
  if (m.slot2.kind === "third") out.push({ matchNo: m.matchNo, allowed: new Set(m.slot2.allowed) });
  return out;
});

import annexC from "@/data/annex-c.json";

const ANNEX_C = annexC as Record<string, Record<string, GroupLetter>>;

export type ThirdAssignmentSource = "annex-c" | "fallback-matcher";

export type ThirdAssignment = {
  byMatch: Map<number, GroupLetter>;
  source: ThirdAssignmentSource;
};

function fallbackMatch(advancingGroups: GroupLetter[]): Map<number, GroupLetter> | null {
  const ordered = [...advancingGroups].sort();
  const result = new Map<number, GroupLetter>();
  const usedMatches = new Set<number>();

  function recurse(idx: number): boolean {
    if (idx === ordered.length) return true;
    const group = ordered[idx];
    for (const slot of THIRD_SLOTS) {
      if (usedMatches.has(slot.matchNo)) continue;
      if (!slot.allowed.has(group)) continue;
      result.set(slot.matchNo, group);
      usedMatches.add(slot.matchNo);
      if (recurse(idx + 1)) return true;
      result.delete(slot.matchNo);
      usedMatches.delete(slot.matchNo);
    }
    return false;
  }

  return recurse(0) ? result : null;
}

export function assignThirdPlaceSlots(
  advancingGroups: GroupLetter[],
): Map<number, GroupLetter> | null {
  const detail = assignThirdPlaceSlotsDetailed(advancingGroups);
  return detail?.byMatch ?? null;
}

export function assignThirdPlaceSlotsDetailed(
  advancingGroups: GroupLetter[],
): ThirdAssignment | null {
  if (advancingGroups.length !== 8) return null;
  const key = [...advancingGroups].sort().join("");

  const official = ANNEX_C[key];
  if (official) {
    const byMatch = new Map<number, GroupLetter>();
    for (const [slotKey, group] of Object.entries(official)) {
      const matchNo = Number.parseInt(slotKey.slice(1), 10);
      byMatch.set(matchNo, group);
    }
    return { byMatch, source: "annex-c" };
  }

  const matched = fallbackMatch(advancingGroups);
  return matched ? { byMatch: matched, source: "fallback-matcher" } : null;
}

export function groupLetterFromTag(tag: string): GroupLetter {
  const match = tag.match(/([A-L])$/);
  if (!match) throw new Error(`Cannot parse group letter from "${tag}"`);
  return match[1] as GroupLetter;
}
