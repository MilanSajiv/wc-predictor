import Link from "next/link";
import { getAllMatches } from "@/lib/football-data";
import { runTournamentSimulation, type TeamReach } from "@/lib/tournament";
import { Eyebrow } from "../_components/data";

export const revalidate = 1800;
export const dynamic = "force-static";

const ITERATIONS = 2000;

export default async function TournamentPage() {
  let matches;
  try {
    matches = await getAllMatches();
  } catch (e) {
    return <ErrorCard message={e instanceof Error ? e.message : String(e)} />;
  }

  let result;
  try {
    result = runTournamentSimulation(matches, ITERATIONS);
  } catch (e) {
    return <ErrorCard message={e instanceof Error ? e.message : String(e)} />;
  }

  return (
    <div className="space-y-20">
      <header className="space-y-4 max-w-3xl">
        <Eyebrow>
          Monte Carlo · {ITERATIONS.toLocaleString()} simulated tournaments
        </Eyebrow>
        <h1 className="text-[44px] lg:text-[56px] font-bold tracking-tighter leading-[0.95]">
          Every group, every knockout, two thousand times over.
        </h1>
        <p className="text-base lg:text-lg text-text-secondary leading-relaxed max-w-2xl">
          Each run plays out the full group stage (real results merge in when
          known), qualifies via FIFA&apos;s official rules, and resolves the
          published knockout bracket. Annex C lookup on the third-place slots,
          Elo-weighted penalties on knockout draws.
        </p>
      </header>

      {result.teams.length >= 3 && <Podium teams={result.teams.slice(0, 3)} />}

      <section className="space-y-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[22px] font-semibold tracking-tight">
            Round-by-round probabilities
          </h2>
          <span className="text-xs font-mono uppercase tracking-[0.16em] text-text-tertiary">
            {result.teams.length} teams
          </span>
        </div>
        <ProbabilityTable teams={result.teams} />
      </section>

      <Footnote result={result} />
    </div>
  );
}

function Podium({ teams }: { teams: TeamReach[] }) {
  const [first, second, third] = teams;
  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-7 rounded-2xl bg-accent text-canvas p-8 lg:p-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.08] dot-grid" aria-hidden />
        <div className="relative space-y-6">
          <Eyebrow>
            <span className="text-canvas/70">Most likely champion</span>
          </Eyebrow>
          <div>
            <div className="text-[56px] lg:text-[80px] font-bold tracking-tighter leading-[0.92]">
              {first.team}
            </div>
            <div className="mt-3 text-sm text-canvas/75">
              Group{" "}
              <span className="text-canvas font-medium">
                {first.group?.replace("GROUP_", "") ?? "—"}
              </span>{" "}
              · qualifies in{" "}
              <span className="font-mono text-canvas tabular-nums">
                {Math.round(first.qualify * 100)}%
              </span>{" "}
              of runs
            </div>
          </div>
          <div className="flex items-end gap-3 pt-2">
            <div className="text-[88px] lg:text-[120px] font-bold tabular-nums tracking-tighter leading-[0.9]">
              {(first.champion * 100).toFixed(1)}
            </div>
            <div className="text-[40px] lg:text-[56px] font-bold mb-3 lg:mb-5">
              %
            </div>
            <div className="text-xs uppercase tracking-[0.16em] text-canvas/70 ml-4 mb-4 lg:mb-6 font-mono max-w-[120px]">
              to lift the trophy
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-5 grid grid-rows-2 gap-4">
        <PodiumChallenger rank={2} team={second} />
        <PodiumChallenger rank={3} team={third} />
      </div>
    </section>
  );
}

function PodiumChallenger({ rank, team }: { rank: number; team: TeamReach }) {
  return (
    <div className="rounded-2xl bg-surface border border-border-quiet p-6 lg:p-7 flex items-center gap-5 hover:border-border-loud transition-colors duration-150">
      <div className="text-[44px] lg:text-[56px] font-bold tabular-nums tracking-tighter text-text-quiet leading-none">
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[22px] lg:text-[26px] font-semibold tracking-tight text-text-primary truncate">
          {team.team}
        </div>
        <div className="mt-1 text-xs font-mono uppercase tracking-[0.14em] text-text-tertiary">
          Group {team.group?.replace("GROUP_", "") ?? "—"}
        </div>
      </div>
      <div className="text-right">
        <div className="text-[28px] lg:text-[32px] font-bold tabular-nums tracking-tight text-accent leading-none">
          {(team.champion * 100).toFixed(1)}%
        </div>
        <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.14em] text-text-tertiary">
          champion
        </div>
      </div>
    </div>
  );
}

function ProbabilityTable({ teams }: { teams: TeamReach[] }) {
  return (
    <div className="rounded-2xl bg-surface border border-border-quiet overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[920px]">
          <thead className="bg-shelf">
            <tr className="text-left text-[10px] font-mono uppercase tracking-[0.16em] text-text-tertiary border-b border-border-quiet">
              <th className="px-5 py-3.5 w-12">#</th>
              <th className="px-2 py-3.5">Team</th>
              <th className="px-2 py-3.5 w-12">Grp</th>
              <th className="px-3 py-3.5 text-right w-[110px]">Qualify</th>
              <th className="px-3 py-3.5 text-right w-[100px]">R16</th>
              <th className="px-3 py-3.5 text-right w-[100px]">QF</th>
              <th className="px-3 py-3.5 text-right w-[100px]">SF</th>
              <th className="px-3 py-3.5 text-right w-[100px]">Final</th>
              <th className="px-5 py-3.5 text-right w-[120px] text-accent">
                Champion
              </th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t, i) => (
              <TableRow
                key={t.team}
                team={t}
                rank={i + 1}
                showTopDivider={i === 4 || i === 16}
                tier={i === 4 ? "contenders" : i === 16 ? "longshots" : null}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TableRow({
  team,
  rank,
  showTopDivider,
  tier,
}: {
  team: TeamReach;
  rank: number;
  showTopDivider: boolean;
  tier: "contenders" | "longshots" | null;
}) {
  const isFavorite = rank <= 4;
  const rowBg = isFavorite ? "bg-accent-wash/50" : "";
  return (
    <>
      {showTopDivider && <TierDivider tier={tier} />}
      <tr
        className={`border-b border-border-quiet last:border-b-0 hover:bg-surface-raised transition-colors duration-150 ${rowBg}`}
      >
        <td className="px-5 py-3 text-text-tertiary font-mono text-[12px] tabular-nums">
          {String(rank).padStart(2, "0")}
        </td>
        <td className="px-2 py-3 font-semibold text-text-primary truncate text-[14px]">
          {team.team}
        </td>
        <td className="px-2 py-3 font-mono text-[11px] text-text-tertiary tabular-nums">
          {team.group?.replace("GROUP_", "") ?? "—"}
        </td>
        <ProbCell value={team.qualify} />
        <ProbCell value={team.r16} />
        <ProbCell value={team.qf} />
        <ProbCell value={team.sf} />
        <ProbCell value={team.final} />
        <ProbCell value={team.champion} highlight />
      </tr>
    </>
  );
}

function TierDivider({ tier }: { tier: "contenders" | "longshots" | null }) {
  const labels: Record<string, string> = {
    contenders: "Contenders",
    longshots: "Long shots",
  };
  const lineColor = tier === "contenders" ? "bg-draw" : "bg-away";
  return (
    <tr>
      <td colSpan={9} className="px-5 py-2 bg-shelf">
        <div className="flex items-center gap-3">
          <span className={`h-px flex-1 ${lineColor} opacity-60`} />
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-tertiary">
            {tier ? labels[tier] : ""}
          </span>
          <span className={`h-px flex-1 ${lineColor} opacity-60`} />
        </div>
      </td>
    </tr>
  );
}

function ProbCell({
  value,
  highlight,
}: {
  value: number;
  highlight?: boolean;
}) {
  const pct = value * 100;
  const display =
    pct >= 10 ? pct.toFixed(0) : pct >= 1 ? pct.toFixed(1) : pct.toFixed(2);
  const barColor = highlight ? "bg-accent" : "bg-accent/60";
  const numColor = highlight ? "text-accent font-bold" : "text-text-primary";
  const isZero = value < 0.001;
  return (
    <td className="px-3 py-3">
      <div className="flex items-center justify-end gap-2.5">
        <div className="hidden md:block flex-1 h-1.5 rounded-full bg-canvas overflow-hidden max-w-[64px]">
          <div
            className={barColor}
            style={{
              width: `${Math.max(value * 100, value > 0 ? 2 : 0)}%`,
              height: "100%",
            }}
          />
        </div>
        <span
          className={`font-mono text-[12px] tabular-nums ${numColor} ${isZero ? "text-text-quiet" : ""}`}
        >
          {display}
          <span className="text-[10px] text-text-quiet font-normal">%</span>
        </span>
      </div>
    </td>
  );
}

function Footnote({
  result,
}: {
  result: Awaited<ReturnType<typeof runTournamentSimulation>>;
}) {
  return (
    <div className="rounded-xl bg-surface border border-border-quiet p-6 text-xs text-text-tertiary leading-relaxed max-w-3xl space-y-3">
      <p>
        Each iteration Poisson-samples every group fixture from Elo-derived goal
        expectations (calibrated against 256 historical WC matches), ranks teams
        by points → goal difference → goals for, and slots the 12 winners, 12
        runners-up and 8 best third-placed teams into the FIFA bracket. Knockout
        draws are resolved by an Elo-weighted coin flip in place of extra time
        and penalties.
      </p>
      <p>
        <span className="font-mono text-text-secondary tabular-nums font-semibold">
          {result.annexCHits.toLocaleString()}
        </span>{" "}
        of{" "}
        <span className="font-mono text-text-secondary tabular-nums font-semibold">
          {result.iterations.toLocaleString()}
        </span>{" "}
        runs used the Annex C lookup directly.
        {result.fallbackMatcherHits > 0 && (
          <>
            {" "}
            <span className="font-mono">{result.fallbackMatcherHits}</span> fell
            back to the bipartite matcher.
          </>
        )}
      </p>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-surface border border-border-quiet p-8 max-w-2xl">
      <Eyebrow>Couldn&apos;t run the simulation</Eyebrow>
      <p className="mt-4 text-sm text-text-secondary">{message}</p>
    </div>
  );
}
