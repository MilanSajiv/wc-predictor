# WC 2026 Predictor

## Register

**product** — design serves the data. The pages are tools for inspecting model predictions; they should make the numbers feel earned, not decorate them.

## Users

Football-literate adults (Milan + friends) who want a numerate take on World Cup 2026 fixtures: who's favoured, by how much, why, and what the bracket looks like end-to-end. They follow the sport, they understand probabilities, they will scroll. They are not casual viewers needing onboarding, and they are not bettors looking for tips.

## Product purpose

Run the model. Show its predictions clearly. Make it obvious how confident the model actually is so a 51% pick doesn't read like a foregone conclusion. The math is the brand: probabilities, score matrices, Monte Carlo distributions, calibrated Elo all sit in the open.

## Tone

Confident, specific, mildly opinionated, never breathless. Talks like a stats-Twitter pundit who's read the Dixon-Coles paper. British English. Sentences end in periods, not exclamation marks. Numbers are precise and quietly proud (56.6% accuracy, 0.974 log-loss, 495 Annex C rows).

## Anti-references

- **Bet365 / DraftKings energy** — saturated reds and greens, urgency, "lock in your pick" CTAs. We're not selling action; we're showing analysis.
- **FIFA.com corporate stiffness** — gold ribbons, photographic heroes of generic crowds, stadium overlays. Too pageantry, not enough math.
- **ESPN / Sky Sports broadcast loud** — chyron strips, oversized team crests, ticker-tape vibes. Built for TV second screen, not focused reading.
- **SaaS analytics dashboard** — generic chart cards on a 12-column grid with a sidebar of filters. The data is football, not metrics.

## Strategic principles

- **Show the spread, not just the pick.** A 50/30/20 split is not the same as 70/20/10; visual weight should make that obvious before the user reads the numbers.
- **Honest about uncertainty.** Joint probabilities, calibration gaps, fallback labels for un-resolvable third-place slots — all surfaced, not hidden.
- **One model, four lenses.** Matches list / single match / bracket / tournament forecast are four cuts of the same underlying numbers. They should feel like one product, not four pages stapled together.
- **No fixture without context.** A match is meaningless without team strengths, group standings, and what it means downstream. The UI threads those.
