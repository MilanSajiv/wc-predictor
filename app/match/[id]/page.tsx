import Link from "next/link";
import { getMatchById } from "@/lib/football-data";
import { predictMatch, type Prediction } from "@/lib/predict";
import { generateCommentary } from "@/lib/commentary";
import { ProbabilityBar, CountryChip, Eyebrow } from "../../_components/data";

export const revalidate = 300;

type Params = { id: string };

export default async function MatchPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const match = await getMatchById(id);
  const prediction = predictMatch(match.homeTeam.name, match.awayTeam.name);
  const commentary = await generateCommentary(prediction);

  const kickoff = new Date(match.utcDate).toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="max-w-[920px] mx-auto space-y-20">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.16em] text-text-tertiary hover:text-text-primary transition-colors"
      >
        ← All matches
      </Link>

      <header className="space-y-10">
        <Eyebrow>
          {match.stage?.replace(/_/g, " ") ?? "Group stage"}
          {match.group ? ` · ${match.group.replace(/_/g, " ")}` : ""}{" "}
          · {kickoff}
        </Eyebrow>
        <HeadlineRow prediction={prediction} match={match} />
        <ProbabilityBar
          pHome={prediction.pHome}
          pDraw={prediction.pDraw}
          pAway={prediction.pAway}
          size="lg"
          showLabels
          homeLabel={match.homeTeam.tla ?? "home"}
          awayLabel={match.awayTeam.tla ?? "away"}
        />
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat
          eyebrow="Expected goals"
          value={`${prediction.expectedHome.toFixed(2)} – ${prediction.expectedAway.toFixed(2)}`}
          caption={`${match.homeTeam.tla ?? "home"} vs ${match.awayTeam.tla ?? "away"}`}
        />
        <Stat
          eyebrow="Elo rating"
          value={`${prediction.homeElo} – ${prediction.awayElo}`}
          caption={`Gap ${Math.abs(prediction.homeElo - prediction.awayElo)} pts`}
        />
        <Stat
          eyebrow="Model lean"
          value={leanLabel(prediction)}
          caption={`${Math.round(prediction.recommendation.confidence * 100)}% pick · ${leanQuality(prediction.recommendation.confidence)}`}
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12">
        <div className="space-y-5">
          <Eyebrow>Commentary</Eyebrow>
          <p className="text-[19px] leading-[1.55] text-text-primary max-w-prose font-medium">
            {commentary}
          </p>
        </div>
        <Scorelines prediction={prediction} />
      </section>

      {(!prediction.homeSeeded || !prediction.awaySeeded) && (
        <p className="text-xs text-text-tertiary border-t border-border-quiet pt-5">
          {!prediction.homeSeeded ? match.homeTeam.name : ""}
          {!prediction.homeSeeded && !prediction.awaySeeded ? " and " : ""}
          {!prediction.awaySeeded ? match.awayTeam.name : ""} fell back to a
          default Elo of 1600. Run{" "}
          <span className="font-mono text-text-secondary">
            pnpm update-elo
          </span>{" "}
          to refresh from the historical-match feed.
        </p>
      )}
    </div>
  );
}

function HeadlineRow({
  prediction,
  match,
}: {
  prediction: Prediction;
  match: Awaited<ReturnType<typeof getMatchById>>;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-6 lg:gap-10">
      <SideBlock
        team={match.homeTeam}
        side="home"
        prob={prediction.pHome}
        align="left"
      />
      <DrawBlock prob={prediction.pDraw} />
      <SideBlock
        team={match.awayTeam}
        side="away"
        prob={prediction.pAway}
        align="right"
      />
    </div>
  );
}

function SideBlock({
  team,
  side,
  prob,
  align,
}: {
  team: { name: string; shortName?: string; tla?: string };
  side: "home" | "away";
  prob: number;
  align: "left" | "right";
}) {
  const colour = side === "home" ? "text-accent" : "text-away";
  return (
    <div
      className={`flex flex-col gap-3 min-w-0 ${
        align === "right" ? "items-end text-right" : "items-start"
      }`}
    >
      <CountryChip tla={team.tla} side={side} />
      <div className="min-w-0">
        <div className="text-[24px] lg:text-[28px] font-semibold tracking-tight text-text-primary truncate leading-none">
          {team.shortName ?? team.name}
        </div>
        <div
          className={`mt-3 text-[44px] lg:text-[56px] font-bold tabular-nums tracking-tighter leading-none ${colour}`}
        >
          {Math.round(prob * 100)}
          <span className="text-[24px] lg:text-[28px] font-semibold align-top">
            %
          </span>
        </div>
      </div>
    </div>
  );
}

function DrawBlock({ prob }: { prob: number }) {
  return (
    <div className="text-center pb-2">
      <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-text-tertiary">
        Draw
      </div>
      <div className="mt-3 text-[32px] lg:text-[40px] font-bold tabular-nums tracking-tighter leading-none text-draw">
        {Math.round(prob * 100)}
        <span className="text-[18px] font-semibold align-top">%</span>
      </div>
    </div>
  );
}

function Stat({
  eyebrow,
  value,
  caption,
}: {
  eyebrow: string;
  value: string;
  caption?: string;
}) {
  return (
    <div className="bg-surface border border-border-quiet rounded-xl px-5 py-5 space-y-1.5">
      <Eyebrow>{eyebrow}</Eyebrow>
      <div className="text-[20px] font-bold tracking-tight tabular-nums text-text-primary">
        {value}
      </div>
      {caption && (
        <div className="text-[12px] text-text-tertiary">{caption}</div>
      )}
    </div>
  );
}

function Scorelines({ prediction }: { prediction: Prediction }) {
  const top = prediction.topScorelines[0];
  return (
    <div className="space-y-4">
      <Eyebrow>Most likely scorelines</Eyebrow>
      <ol className="space-y-2.5">
        {prediction.topScorelines.map((s, i) => {
          const isModal = i === 0;
          const widthScale = (s.prob / top.prob) * 100;
          return (
            <li
              key={`${s.home}-${s.away}`}
              className="grid grid-cols-[20px_56px_1fr_auto] items-center gap-3 text-sm"
            >
              <span className="font-mono text-[11px] text-text-tertiary tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={`font-mono tabular-nums font-semibold ${
                  isModal ? "text-accent text-[15px]" : "text-text-secondary"
                }`}
              >
                {s.home}–{s.away}
              </span>
              <div className="h-1.5 rounded-full bg-canvas overflow-hidden">
                <div
                  className={`h-full ${isModal ? "bg-accent" : "bg-border-loud"}`}
                  style={{ width: `${widthScale}%` }}
                />
              </div>
              <span className="font-mono text-[11px] text-text-tertiary tabular-nums">
                {(s.prob * 100).toFixed(1)}%
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function leanLabel(p: Prediction): string {
  if (p.recommendation.pick === "DRAW") return "Stalemate";
  const winner = p.recommendation.pick === "HOME" ? p.homeName : p.awayName;
  const loser = p.recommendation.pick === "HOME" ? p.awayName : p.homeName;
  return `${winner} > ${loser}`;
}

function leanQuality(confidence: number): string {
  if (confidence >= 0.65) return "high conviction";
  if (confidence >= 0.45) return "medium conviction";
  return "low conviction";
}
