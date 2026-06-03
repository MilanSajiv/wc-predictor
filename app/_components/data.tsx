// Small primitives used across the app: ProbabilityBar, CountryChip,
// MatchCode, Eyebrow, ConfidenceTag.

type Side = "home" | "draw" | "away";

const SIDE_BG: Record<Side, string> = {
  home: "bg-accent",
  draw: "bg-draw",
  away: "bg-away",
};

const SIDE_TEXT: Record<Side, string> = {
  home: "text-accent",
  draw: "text-draw",
  away: "text-away",
};

const SIDE_WASH: Record<Side, string> = {
  home: "bg-accent-wash text-accent border-accent-line",
  draw: "bg-draw-wash text-draw border-border-quiet",
  away: "bg-away-wash text-away border-border-quiet",
};

export function ProbabilityBar({
  pHome,
  pDraw,
  pAway,
  size = "md",
  showLabels = false,
  homeLabel,
  awayLabel,
}: {
  pHome: number;
  pDraw: number;
  pAway: number;
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
  homeLabel?: string;
  awayLabel?: string;
}) {
  const h = size === "sm" ? "h-1" : size === "lg" ? "h-3" : "h-2";
  return (
    <div className="w-full">
      <div className={`flex ${h} rounded-full overflow-hidden bg-canvas`}>
        <span className={SIDE_BG.home} style={{ width: `${pHome * 100}%` }} />
        <span className={SIDE_BG.draw} style={{ width: `${pDraw * 100}%` }} />
        <span className={SIDE_BG.away} style={{ width: `${pAway * 100}%` }} />
      </div>
      {showLabels && (
        <div className="mt-2 flex justify-between text-[11px] font-mono uppercase tracking-[0.10em]">
          <span className="text-accent font-semibold">
            {Math.round(pHome * 100)}%
            <span className="text-text-tertiary font-normal"> {homeLabel}</span>
          </span>
          <span className="text-draw font-semibold">
            {Math.round(pDraw * 100)}%
            <span className="text-text-tertiary font-normal"> draw</span>
          </span>
          <span className="text-away font-semibold">
            {Math.round(pAway * 100)}%
            <span className="text-text-tertiary font-normal"> {awayLabel}</span>
          </span>
        </div>
      )}
    </div>
  );
}

export function CountryChip({
  tla,
  side = "home",
  size = "md",
}: {
  tla?: string;
  side?: Side;
  size?: "sm" | "md";
}) {
  const dims =
    size === "sm" ? "h-5 px-1.5 text-[10px]" : "h-7 px-2.5 text-[11px]";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border ${dims} ${SIDE_WASH[side]} font-mono tracking-[0.06em] font-semibold`}
    >
      {tla ?? "—"}
    </span>
  );
}

export function MatchCode({ no, prefix = "M" }: { no: number; prefix?: string }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
      {prefix}
      {no}
    </span>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-text-tertiary">
      {children}
    </div>
  );
}

export function ConfidenceTag({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const label =
    confidence >= 0.65 ? "High" : confidence >= 0.45 ? "Medium" : "Low";
  const dot =
    confidence >= 0.65
      ? "bg-accent"
      : confidence >= 0.45
        ? "bg-draw"
        : "bg-away";
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.08em] text-text-tertiary">
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${dot}`} />
      {label} · {pct}%
    </span>
  );
}

export function SideBadge({
  side,
  children,
}: {
  side: Side;
  children: React.ReactNode;
}) {
  return <span className={`${SIDE_TEXT[side]} font-medium`}>{children}</span>;
}

export type { Side };
