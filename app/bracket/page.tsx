import Link from "next/link";
import { getAllMatches } from "@/lib/football-data";
import {
  computeProjections,
  buildMostLikelyBracket,
  type GroupProjection,
  type MostLikelyBracket,
  type ProjectedBracketMatch,
} from "@/lib/projection";
import {
  R32,
  R16_PAIRINGS,
  QF_PAIRINGS,
  SF_PAIRINGS,
  FINAL_PAIR,
  type SlotSpec,
  type GroupLetter,
} from "@/lib/bracket";
import { Eyebrow, MatchCode } from "../_components/data";

export const revalidate = 1800;

const GROUP_LETTERS: GroupLetter[] = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
];

const R32_ORDER = [
  73, 75, 74, 77, 81, 82, 83, 84,
  76, 78, 79, 80, 85, 87, 86, 88,
];
const R16_ORDER = [89, 90, 94, 93, 91, 92, 96, 95];
const QF_ORDER = [97, 98, 99, 100];
const SF_ORDER = [101, 102];

const ROUND_ACCENT: Record<string, string> = {
  R32: "border-border-quiet",
  R16: "border-border-loud",
  QF: "border-accent-line",
  SF: "border-accent-line",
  Final: "border-accent-line bg-accent-wash",
};

type SearchParams = { mode?: string };

export default async function BracketPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { mode } = await searchParams;
  const isProjected = mode === "projected";

  let matches;
  try {
    matches = await getAllMatches();
  } catch (e) {
    return <ErrorCard message={e instanceof Error ? e.message : String(e)} />;
  }

  const projections = computeProjections(matches);
  const mostLikely = isProjected ? buildMostLikelyBracket(projections) : null;

  return (
    <div className="space-y-20">
      <header className="space-y-6">
        <div className="space-y-4 max-w-3xl">
          <Eyebrow>FIFA bracket · 12 groups · 32-team knockout</Eyebrow>
          <h1 className="text-[44px] lg:text-[56px] font-bold tracking-tighter leading-[0.95]">
            From the draw to MetLife, in FIFA&apos;s exact pairing order.
          </h1>
          <p className="text-base lg:text-lg text-text-secondary leading-relaxed max-w-2xl">
            Group rankings come from expected points (real results merge in as
            matches finish). Third-place slot assignments use FIFA&apos;s
            published Annex C lookup. Switch to{" "}
            <span className="text-accent font-medium">Most-likely</span> for
            one realised bracket all the way through.
          </p>
        </div>
        <ModeToggle isProjected={isProjected} />
      </header>

      {isProjected && mostLikely && <ChampionBanner bracket={mostLikely} />}
      {isProjected && !mostLikely && (
        <div className="rounded-xl bg-surface border border-border-quiet p-5 text-sm text-text-secondary">
          Can&apos;t build a projected bracket yet — fewer than 12 full groups
          in the fixture data.
        </div>
      )}

      <section className="space-y-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[22px] font-semibold tracking-tight">Groups</h2>
          {projections.size < 12 && (
            <span className="text-xs text-draw font-mono uppercase tracking-[0.14em]">
              {projections.size}/12 loaded
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {GROUP_LETTERS.map((letter) => (
            <GroupCard
              key={letter}
              letter={letter}
              group={projections.get(letter)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[22px] font-semibold tracking-tight">Knockout</h2>
          <span className="text-xs font-mono uppercase tracking-[0.16em] text-text-tertiary">
            32 → 16 → 8 → 4 → 2 → 1
          </span>
        </div>
        {isProjected && mostLikely ? (
          <ProjectedBracketDiagram bracket={mostLikely} />
        ) : (
          <StructuralBracketDiagram projections={projections} />
        )}
        <BracketFootnote isProjected={isProjected} mostLikely={mostLikely} />
      </section>
    </div>
  );
}

function ModeToggle({ isProjected }: { isProjected: boolean }) {
  return (
    <div className="inline-flex bg-surface border border-border-quiet rounded-lg p-0.5 text-sm">
      <Link
        href="/bracket"
        className={`px-4 py-2 rounded-md transition-colors duration-150 ${
          !isProjected
            ? "bg-text-primary text-canvas font-semibold"
            : "text-text-tertiary hover:text-text-primary"
        }`}
      >
        Structural
      </Link>
      <Link
        href="/bracket?mode=projected"
        className={`px-4 py-2 rounded-md transition-colors duration-150 ${
          isProjected
            ? "bg-accent text-canvas font-semibold"
            : "text-text-tertiary hover:text-text-primary"
        }`}
      >
        Most-likely
      </Link>
    </div>
  );
}

function ChampionBanner({ bracket }: { bracket: MostLikelyBracket }) {
  const finalPWinner = Math.max(bracket.final.pA, bracket.final.pB);
  const runnerUp =
    bracket.final.winner === bracket.final.teamA.team
      ? bracket.final.teamB.team
      : bracket.final.teamA.team;
  return (
    <section className="rounded-2xl bg-accent text-canvas p-8 lg:p-10 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.07] dot-grid"
        aria-hidden
      />
      <div className="relative">
        <Eyebrow>
          <span className="text-canvas/70">Projected champion</span>
        </Eyebrow>
        <div className="mt-4 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="flex items-baseline gap-5">
            <div className="text-[56px] lg:text-[80px] font-bold tracking-tighter leading-none">
              {bracket.champion}
            </div>
          </div>
          <div className="space-y-1 lg:text-right">
            <div className="text-sm text-canvas/75">
              beats <span className="font-semibold text-canvas">{runnerUp}</span>{" "}
              in the final ·{" "}
              <span className="font-mono tabular-nums">
                {Math.round(finalPWinner * 100)}%
              </span>{" "}
              match win
            </div>
            <div className="text-xs font-mono uppercase tracking-[0.14em] text-canvas/60">
              Joint path probability{" "}
              <span className="text-canvas">
                {bracket.jointProbability < 1e-4
                  ? bracket.jointProbability.toExponential(1)
                  : (bracket.jointProbability * 100).toFixed(2) + "%"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function GroupCard({
  letter,
  group,
}: {
  letter: GroupLetter;
  group: GroupProjection | undefined;
}) {
  if (!group) {
    return (
      <div className="rounded-xl border border-dashed border-border-quiet p-4 text-sm">
        <div className="font-semibold text-text-tertiary mb-1">
          Group {letter}
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-quiet">
          No data yet
        </span>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-surface border border-border-quiet p-5 space-y-3.5 hover:border-border-loud transition-colors duration-150">
      <div className="flex items-baseline justify-between">
        <span className="text-[17px] font-bold tracking-tight">
          Group {letter}
        </span>
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-text-tertiary">
          {group.finished}/{group.total}
        </span>
      </div>
      <ol className="space-y-2">
        {group.teams.map((t, i) => {
          const colour =
            i < 2
              ? "text-text-primary"
              : i === 2
                ? "text-text-secondary"
                : "text-text-quiet";
          const tier =
            i === 0 ? "bg-accent" : i === 1 ? "bg-accent-soft" : i === 2 ? "bg-draw" : "bg-border-loud";
          return (
            <li
              key={t.team}
              className={`flex items-center justify-between text-[13px] ${colour}`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span className={`inline-block w-1 h-3 rounded-full ${tier}`} />
                <span className="truncate font-medium">{t.team}</span>
              </span>
              <span className="font-mono text-[11px] tabular-nums text-text-tertiary ml-2">
                {t.expectedPoints.toFixed(1)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ---------- Structural bracket ----------

type StructuralSlot = { label: string; team?: string };

type StructuralMatch = {
  matchNo: number;
  s1: StructuralSlot;
  s2: StructuralSlot;
};

function resolveStructuralSlot(
  slot: SlotSpec,
  projections: Map<GroupLetter, GroupProjection>,
): StructuralSlot {
  if (slot.kind === "winner") {
    return {
      label: `1${slot.group}`,
      team: projections.get(slot.group)?.teams[0]?.team,
    };
  }
  if (slot.kind === "runnerUp") {
    return {
      label: `2${slot.group}`,
      team: projections.get(slot.group)?.teams[1]?.team,
    };
  }
  return { label: `3·${slot.allowed.join("/")}` };
}

function StructuralBracketDiagram({
  projections,
}: {
  projections: Map<GroupLetter, GroupProjection>;
}) {
  const r32ByNo = new Map(R32.map((m) => [m.matchNo, m]));

  const r32: StructuralMatch[] = R32_ORDER.map((no) => {
    const spec = r32ByNo.get(no)!;
    return {
      matchNo: no,
      s1: resolveStructuralSlot(spec.slot1, projections),
      s2: resolveStructuralSlot(spec.slot2, projections),
    };
  });
  const r16: StructuralMatch[] = R16_ORDER.map((no) => {
    const idx = no - 89;
    const [m1, m2] = R16_PAIRINGS[idx];
    return { matchNo: no, s1: { label: `W·${m1}` }, s2: { label: `W·${m2}` } };
  });
  const qf: StructuralMatch[] = QF_ORDER.map((no) => {
    const idx = no - 97;
    const [i1, i2] = QF_PAIRINGS[idx];
    return {
      matchNo: no,
      s1: { label: `W·${89 + i1}` },
      s2: { label: `W·${89 + i2}` },
    };
  });
  const sf: StructuralMatch[] = SF_ORDER.map((no) => {
    const idx = no - 101;
    const [i1, i2] = SF_PAIRINGS[idx];
    return {
      matchNo: no,
      s1: { label: `W·${97 + i1}` },
      s2: { label: `W·${97 + i2}` },
    };
  });
  const finalMatch: StructuralMatch = {
    matchNo: 104,
    s1: { label: `W·${101 + FINAL_PAIR[0]}` },
    s2: { label: `W·${101 + FINAL_PAIR[1]}` },
  };

  return (
    <BracketShell
      r32={r32}
      r16={r16}
      qf={qf}
      sf={sf}
      finalMatch={finalMatch}
      renderCard={(round, match) => (
        <StructuralCard round={round} match={match as StructuralMatch} />
      )}
    />
  );
}

function StructuralCard({
  round,
  match,
}: {
  round: string;
  match: StructuralMatch;
}) {
  const isFinal = round === "Final";
  return (
    <div
      className={`rounded-lg bg-surface border ${ROUND_ACCENT[round]} px-3.5 py-2.5 hover:border-accent-line transition-colors duration-150 ${
        isFinal ? "py-4" : ""
      }`}
    >
      <MatchCode no={match.matchNo} />
      <SlotRow slot={match.s1} large={isFinal} />
      <SlotRow slot={match.s2} large={isFinal} />
    </div>
  );
}

function SlotRow({
  slot,
  large = false,
}: {
  slot: StructuralSlot;
  large?: boolean;
}) {
  const sizeClass = large ? "text-[15px]" : "text-[13px]";
  if (slot.team) {
    return (
      <div
        className={`${sizeClass} font-semibold text-text-primary truncate leading-snug`}
      >
        {slot.team}
      </div>
    );
  }
  return (
    <div
      className={`${sizeClass} font-mono text-text-tertiary truncate leading-snug`}
    >
      {slot.label}
    </div>
  );
}

// ---------- Projected bracket ----------

function ProjectedBracketDiagram({ bracket }: { bracket: MostLikelyBracket }) {
  const r32 = R32_ORDER.map((no) => bracket.r32.find((m) => m.matchNo === no)!);
  const r16 = R16_ORDER.map((no) => bracket.r16.find((m) => m.matchNo === no)!);
  const qf = QF_ORDER.map((no) => bracket.qf.find((m) => m.matchNo === no)!);
  const sf = SF_ORDER.map((no) => bracket.sf.find((m) => m.matchNo === no)!);

  return (
    <BracketShell
      r32={r32}
      r16={r16}
      qf={qf}
      sf={sf}
      finalMatch={bracket.final}
      renderCard={(round, match) => (
        <ProjectedCard round={round} match={match as ProjectedBracketMatch} />
      )}
    />
  );
}

function ProjectedCard({
  round,
  match,
}: {
  round: string;
  match: ProjectedBracketMatch;
}) {
  const winnerIsA = match.winner === match.teamA.team;
  const pWinner = winnerIsA ? match.pA : match.pB;
  const isFinal = round === "Final";
  return (
    <div
      className={`rounded-lg bg-surface border ${ROUND_ACCENT[round]} px-3.5 py-2.5 hover:border-accent-line transition-colors duration-150 ${
        isFinal ? "py-4" : ""
      }`}
    >
      <div className="flex justify-between items-center">
        <MatchCode no={match.matchNo} />
        <span className="font-mono text-[10px] tabular-nums text-accent font-semibold">
          {Math.round(pWinner * 100)}%
        </span>
      </div>
      <ProjectedRow team={match.teamA.team} winner={winnerIsA} large={isFinal} />
      <ProjectedRow team={match.teamB.team} winner={!winnerIsA} large={isFinal} />
    </div>
  );
}

function ProjectedRow({
  team,
  winner,
  large,
}: {
  team: string;
  winner: boolean;
  large: boolean;
}) {
  const sizeClass = large ? "text-[15px]" : "text-[13px]";
  return (
    <div
      className={`${sizeClass} truncate leading-snug ${
        winner
          ? "font-semibold text-text-primary"
          : "text-text-quiet line-through decoration-text-quiet/40"
      }`}
    >
      {team}
    </div>
  );
}

// ---------- Shared bracket shell ----------

function BracketShell<M extends { matchNo: number }>({
  r32,
  r16,
  qf,
  sf,
  finalMatch,
  renderCard,
}: {
  r32: M[];
  r16: M[];
  qf: M[];
  sf: M[];
  finalMatch: M;
  renderCard: (round: string, match: M) => React.ReactNode;
}) {
  // Each round's vertical layout is anchored to the R32 grid: every R32 match
  // occupies one row of the same height, and later rounds span the matching
  // rows of their two predecessors so cards centre on the join. This is the
  // only way to get clean bracket alignment without manually positioning.
  const ROW = 60; // each R32 row height in px
  const GAP = 12; // gap between adjacent R32 rows
  const totalHeight = 16 * ROW + 15 * GAP;

  return (
    <div className="overflow-x-auto -mx-6 lg:-mx-14 px-6 lg:px-14 pb-2">
      <div
        className="flex gap-6 min-w-[1280px]"
        style={{ height: `${totalHeight + 32}px` }}
      >
        <RoundColumn
          label="Round of 32"
          round="R32"
          matches={r32}
          renderCard={renderCard}
          span={1}
          rowHeight={ROW}
          gap={GAP}
        />
        <RoundColumn
          label="Round of 16"
          round="R16"
          matches={r16}
          renderCard={renderCard}
          span={2}
          rowHeight={ROW}
          gap={GAP}
        />
        <RoundColumn
          label="Quarter-finals"
          round="QF"
          matches={qf}
          renderCard={renderCard}
          span={4}
          rowHeight={ROW}
          gap={GAP}
        />
        <RoundColumn
          label="Semi-finals"
          round="SF"
          matches={sf}
          renderCard={renderCard}
          span={8}
          rowHeight={ROW}
          gap={GAP}
        />
        <RoundColumn
          label="Final"
          round="Final"
          matches={[finalMatch]}
          renderCard={renderCard}
          span={16}
          rowHeight={ROW}
          gap={GAP}
        />
      </div>
    </div>
  );
}

function RoundColumn<M extends { matchNo: number }>({
  label,
  round,
  matches,
  renderCard,
  span,
  rowHeight,
  gap,
}: {
  label: string;
  round: string;
  matches: M[];
  renderCard: (round: string, match: M) => React.ReactNode;
  span: number;
  rowHeight: number;
  gap: number;
}) {
  const isFinal = round === "Final";
  // Each match's slot height = span R32 rows + (span-1) intervening gaps.
  const slotHeight = span * rowHeight + (span - 1) * gap;
  return (
    <div
      className={`flex flex-col ${isFinal ? "min-w-[220px] flex-[1.2]" : "min-w-[180px] flex-1"}`}
    >
      <div
        className={`text-[10px] font-mono uppercase tracking-[0.18em] text-center mb-4 ${
          isFinal ? "text-accent font-bold" : "text-text-tertiary"
        }`}
      >
        {label}
      </div>
      <div className="flex flex-col" style={{ gap: `${gap}px` }}>
        {matches.map((m) => (
          <div
            key={m.matchNo}
            className="flex items-center"
            style={{ height: `${slotHeight}px` }}
          >
            <div className="w-full">{renderCard(round, m)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BracketFootnote({
  isProjected,
  mostLikely,
}: {
  isProjected: boolean;
  mostLikely: MostLikelyBracket | null;
}) {
  if (!isProjected) {
    return (
      <p className="text-xs text-text-tertiary max-w-3xl leading-relaxed">
        Winner / runner-up slots resolve to the team currently top of each
        group&apos;s expected-points table. The 8 third-place slots fill via
        FIFA&apos;s Annex C lookup once you switch to Most-likely.
      </p>
    );
  }
  return (
    <div className="rounded-xl bg-surface border border-border-quiet p-5 text-xs text-text-tertiary space-y-2 max-w-3xl leading-relaxed">
      <p>
        Most-likely picks the highest-probability team at every match. Each card
        shows that team&apos;s win share (Elo-weighted coin flip on draws as a
        penalties proxy).
      </p>
      {mostLikely && (
        <p>
          Joint probability of this exact path{" "}
          <span className="font-mono text-accent font-semibold">
            {mostLikely.jointProbability < 1e-4
              ? mostLikely.jointProbability.toExponential(2)
              : (mostLikely.jointProbability * 100).toFixed(2) + "%"}
          </span>
          . Favourite-at-every-step is one of millions — see{" "}
          <Link
            href="/tournament"
            className="text-text-secondary underline underline-offset-2 decoration-border-loud hover:text-text-primary"
          >
            the Monte Carlo forecast
          </Link>{" "}
          for the full distribution.
        </p>
      )}
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-surface border border-border-quiet p-8 max-w-2xl">
      <Eyebrow>Couldn&apos;t load the bracket</Eyebrow>
      <p className="mt-4 text-sm text-text-secondary">{message}</p>
    </div>
  );
}
