import Link from "next/link";
import { getUpcomingMatches, type Match } from "@/lib/football-data";
import { predictMatch } from "@/lib/predict";
import {
  ProbabilityBar,
  CountryChip,
  Eyebrow,
  ConfidenceTag,
} from "./_components/data";

export const revalidate = 600;

export default async function Home() {
  let matches: Match[] = [];
  let error: string | null = null;

  try {
    matches = await getUpcomingMatches(40);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  if (error) {
    return <ApiKeyMissingCard message={error} />;
  }

  const [next, ...rest] = matches;
  const grouped = groupByDate(rest);

  return (
    <div className="space-y-20">
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12 lg:gap-20 items-end">
        <div className="space-y-6">
          <Eyebrow>FIFA World Cup 2026 · June 11 – July 19</Eyebrow>
          <h1 className="text-[44px] lg:text-[64px] font-bold tracking-tighter leading-[0.95] text-text-primary max-w-xl">
            Two thousand tournaments, one prediction.
          </h1>
          <p className="text-base lg:text-lg text-text-secondary max-w-md leading-relaxed">
            Calibrated Elo drives Poisson goal expectations on every fixture,
            fed through FIFA&apos;s published bracket all the way to MetLife.
            Open any match for the full score distribution.
          </p>
        </div>
        {next && <NextUpCard match={next} />}
      </section>

      {grouped.length === 0 && rest.length === 0 ? (
        <p className="text-text-tertiary">No further fixtures in the feed.</p>
      ) : (
        <section className="space-y-14">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[22px] font-semibold tracking-tight">
              Upcoming fixtures
            </h2>
            <span className="text-xs font-mono uppercase tracking-[0.16em] text-text-tertiary">
              {rest.length} matches
            </span>
          </div>

          {grouped.map(([date, ms]) => (
            <DateGroup key={date} date={date} matches={ms} />
          ))}
        </section>
      )}
    </div>
  );
}

function NextUpCard({ match }: { match: Match }) {
  const p = predictMatch(match.homeTeam.name, match.awayTeam.name);
  const pickName =
    p.recommendation.pick === "HOME"
      ? match.homeTeam.shortName ?? match.homeTeam.name
      : p.recommendation.pick === "AWAY"
        ? match.awayTeam.shortName ?? match.awayTeam.name
        : "Draw";
  const topScore = p.topScorelines[0];

  return (
    <Link
      href={`/match/${match.id}`}
      className="group block rounded-2xl bg-surface border border-border-quiet p-7 hover:border-accent-line hover:shadow-[0_8px_32px_-12px_oklch(0.54_0.22_275/0.16)] transition-all duration-150"
    >
      <div className="flex items-center justify-between mb-6">
        <Eyebrow>
          <span className="text-accent">Next match</span>
        </Eyebrow>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-tertiary">
          {formatDateTime(match.utcDate)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <TeamRow team={match.homeTeam} side="home" align="left" />
        <span className="text-text-quiet text-sm font-mono">vs</span>
        <TeamRow team={match.awayTeam} side="away" align="right" />
      </div>
      <ProbabilityBar
        pHome={p.pHome}
        pDraw={p.pDraw}
        pAway={p.pAway}
        size="lg"
        showLabels
        homeLabel={match.homeTeam.tla ?? "home"}
        awayLabel={match.awayTeam.tla ?? "away"}
      />
      <div className="mt-6 pt-5 border-t border-border-quiet flex items-center justify-between">
        <div className="text-sm">
          <span className="text-text-tertiary">Model picks </span>
          <span className="text-text-primary font-semibold">{pickName}</span>
        </div>
        <div className="text-sm text-text-tertiary">
          Likely{" "}
          <span className="font-mono text-text-primary tabular-nums font-semibold">
            {topScore.home}–{topScore.away}
          </span>
        </div>
      </div>
    </Link>
  );
}

function TeamRow({
  team,
  side,
  align,
}: {
  team: Match["homeTeam"];
  side: "home" | "away";
  align: "left" | "right";
}) {
  return (
    <div
      className={`flex items-center gap-3 min-w-0 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      <CountryChip tla={team.tla} side={side} />
      <div className="min-w-0">
        <div className="text-[17px] font-semibold tracking-tight text-text-primary truncate">
          {team.shortName ?? team.name}
        </div>
      </div>
    </div>
  );
}

function DateGroup({ date, matches }: { date: string; matches: Match[] }) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline gap-4">
        <h3 className="text-[17px] font-semibold tracking-tight text-text-primary">
          {formatDay(date)}
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
          {matches.length} {matches.length === 1 ? "match" : "matches"}
        </span>
        <div className="flex-1 ml-2 h-px bg-border-quiet" />
      </div>
      <ul className="divide-y divide-border-quiet bg-surface rounded-xl border border-border-quiet overflow-hidden">
        {matches.map((m) => (
          <MatchRow key={m.id} match={m} />
        ))}
      </ul>
    </section>
  );
}

function MatchRow({ match }: { match: Match }) {
  const p = predictMatch(match.homeTeam.name, match.awayTeam.name);
  const pickName =
    p.recommendation.pick === "HOME"
      ? match.homeTeam.shortName ?? match.homeTeam.name
      : p.recommendation.pick === "AWAY"
        ? match.awayTeam.shortName ?? match.awayTeam.name
        : "Draw";

  return (
    <li>
      <Link
        href={`/match/${match.id}`}
        className="grid grid-cols-[64px_1fr_180px_140px] gap-6 items-center py-4 px-5 hover:bg-surface-raised transition-colors duration-150"
      >
        <div className="font-mono text-[12px] text-text-tertiary tabular-nums">
          {formatTime(match.utcDate)}
        </div>
        <div className="flex items-center gap-3 min-w-0">
          <CountryChip tla={match.homeTeam.tla} side="home" size="sm" />
          <span className="text-[14px] font-medium text-text-primary truncate">
            {match.homeTeam.shortName ?? match.homeTeam.name}
          </span>
          <span className="text-text-quiet text-xs font-mono shrink-0">vs</span>
          <span className="text-[14px] font-medium text-text-primary truncate">
            {match.awayTeam.shortName ?? match.awayTeam.name}
          </span>
          <CountryChip tla={match.awayTeam.tla} side="away" size="sm" />
        </div>
        <ProbabilityBar
          pHome={p.pHome}
          pDraw={p.pDraw}
          pAway={p.pAway}
          size="sm"
        />
        <div className="flex flex-col items-end gap-1">
          <span className="text-[13px] font-semibold text-text-primary truncate max-w-full">
            {pickName}
          </span>
          <ConfidenceTag confidence={p.recommendation.confidence} />
        </div>
      </Link>
    </li>
  );
}

function ApiKeyMissingCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-surface border border-border-quiet p-10 max-w-2xl">
      <Eyebrow>Setup</Eyebrow>
      <h2 className="mt-3 text-[28px] font-semibold tracking-tight leading-tight">
        Add your football-data API key to load fixtures.
      </h2>
      <p className="mt-5 text-[15px] text-text-secondary leading-relaxed">
        The app pulls live WC matches from{" "}
        <a
          className="text-accent underline underline-offset-2 decoration-accent-line"
          href="https://www.football-data.org/client/register"
        >
          football-data.org
        </a>
        . Set{" "}
        <code className="font-mono text-text-primary bg-canvas px-1.5 py-0.5 rounded text-[13px]">
          FOOTBALL_DATA_API_KEY
        </code>{" "}
        in{" "}
        <code className="font-mono text-text-primary bg-canvas px-1.5 py-0.5 rounded text-[13px]">
          .env.local
        </code>{" "}
        and the rest comes online.
      </p>
      <p className="mt-6 text-xs font-mono text-text-quiet break-all">
        {message}
      </p>
    </div>
  );
}

function groupByDate(matches: Match[]): Array<[string, Match[]]> {
  const map = new Map<string, Match[]>();
  for (const m of matches) {
    const day = m.utcDate.slice(0, 10);
    const list = map.get(day) ?? [];
    list.push(m);
    map.set(day, list);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function formatDay(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
