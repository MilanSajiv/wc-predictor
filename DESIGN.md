# Design system

## Theme

Light by default. Scene: a football-literate user at their desk in good daylight, switching between fixtures during lunch. Reads like Stripe or Linear at their boldest — refined, but with enough personality that opening the page feels like an event, not a dashboard.

## Color (OKLCH)

Three saturated roles do the heavy lifting. Indigo carries the favourite / model lean / "this team is good." Amber carries the draw / ambiguous middle. Coral carries the underdog / opposing side. Together they form a directional spectrum on every probability bar without falling into bet-app green/red.

Backgrounds are warm cream, never pure white — pure white in a light premium feels like a Word doc.

| Token | OKLCH | Use |
| --- | --- | --- |
| `--canvas` | `oklch(0.985 0.004 75)` | App background. Warm-tinted cream. |
| `--shelf` | `oklch(0.965 0.005 75)` | Sticky header strip. |
| `--surface` | `oklch(1 0 0)` | Cards, panels — the elevated layer is the brightest. |
| `--surface-raised` | `oklch(0.975 0.004 75)` | Hover state on cards / table rows. |
| `--border-quiet` | `oklch(0.91 0.005 75)` | Default card / row borders. |
| `--border-loud` | `oklch(0.82 0.006 75)` | Active / focused borders. |
| `--text-primary` | `oklch(0.20 0.014 275)` | Headings, lead numbers. Slightly indigo-tinted ink. |
| `--text-secondary` | `oklch(0.42 0.010 275)` | Body. |
| `--text-tertiary` | `oklch(0.58 0.009 275)` | Labels, eyebrows. |
| `--text-quiet` | `oklch(0.72 0.008 275)` | Disabled, dimmed losers, table grout. |
| `--accent` | `oklch(0.54 0.22 275)` | Indigo. Primary signal — favourite, champion, model agreement. |
| `--accent-deep` | `oklch(0.42 0.20 275)` | Hover / pressed accent. |
| `--accent-wash` | `oklch(0.96 0.04 275)` | Tinted background for accented surfaces. |
| `--accent-line` | `oklch(0.88 0.08 275)` | Border for accented surfaces. |
| `--draw` | `oklch(0.72 0.165 75)` | Warm amber. Draw probability, ambiguous middle. |
| `--draw-wash` | `oklch(0.97 0.04 75)` | Tinted amber background. |
| `--away` | `oklch(0.66 0.21 30)` | Coral / sunset red. Underdog side. |
| `--away-wash` | `oklch(0.96 0.04 30)` | Tinted coral background. |

Probability bars always read favourite → draw → underdog left to right, in indigo → amber → coral. Same vocabulary on the matches list, single match page, and bracket.

## Typography

Geist Sans for everything; Geist Mono for numbers and codes. Both already loaded via `next/font/google`. No display font — Geist Sans Bold at 56px does the work a serif would.

Light premium needs more typographic contrast than a dashboard. Display tier goes up.

| Step | Size | Use |
| --- | --- | --- |
| `xs` | 11px | Eyebrows, table headers, micro labels |
| `sm` | 13px | Body, secondary text, table content |
| `base` | 15px | Default body, list rows |
| `md` | 17px | Card titles, group letters |
| `lg` | 22px | Section heads |
| `xl` | 30px | Page hero values |
| `2xl` | 44px | Champion banner |
| `3xl` | 64px | Single-match score, champion probability |

Headings ≥ `lg`: weight 600, `tracking-tight` (-0.02em). Display tier (`2xl`+): weight 700, `tracking-tighter` (-0.025em).

`tabular-nums` on every numeric span. `font-feature-settings: "ss01", "cv11"` on body for cleaner Geist forms.

## Layout

- Max widths: **1320px** on data-dense pages (tournament, bracket), **920px** on text-heavy pages (single match).
- Container padding: 24px on mobile, 56px on desktop. Generous.
- Section spacing: 64–80px between major sections, 16–24px within.
- Top header: cream shelf, no shadow, 1px border-bottom in `border-quiet`.

## Components

### Probability bar
3-segment: indigo | amber | coral, in favourite → draw → underdog order. Heights: 4px in dense rows, 8px on cards, 12px on hero. Always paired with three percentages in mono below.

### Team / country chip
Small inset, tinted background matching the team's side in current matchup. Three-letter TLA from football-data.org. No flag emojis (cross-platform mess).

### Match card (bracket)
Larger than the previous pass — minimum height 64px, generous padding. Round-indexed accent intensity: R32 cards use border-quiet, R16 uses border-loud, QF/SF/Final use accent borders. The Final card is 1.5× the rest by height; the projected champion gets a filled indigo card.

### Probability cell (tournament table)
Number on right (tabular mono), micro bar on left (horizontal, filled to value with the round's accent intensity). Top-3 rows get a subtle accent-wash background.

### Tier divider (tournament table)
Between rank 4 and 5, a thin amber line marks the favourites/contenders boundary. Between rank 16 and 17 a fainter coral line marks the contenders/long-shots boundary.

## Motion

State change only. 150ms ease-out (`cubic-bezier(0.4, 0, 0.2, 1)`). No load orchestration, no count-ups.

## What we're explicitly not doing

- **No pure white** (`#fff`) for backgrounds. Cream-leaning warm.
- **No dark mode** in this pass.
- **No emerald/rose** — the indigo/amber/coral system replaces it.
- **No flag emojis** (rendering inconsistency).
- **No connecting-line SVG** in the bracket (every implementation looks janky); rely on column rhythm + accent-graded borders + a clear Final card.
- **No nested cards.** The bracket cards are not inside other cards.
- **No side-stripe borders. No gradient text.** (Shared bans.)
