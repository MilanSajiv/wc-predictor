# World Cup 2026 Predictor

Match-by-match predictions for FIFA World Cup 2026.

- **Data**: [football-data.org](https://www.football-data.org/) free tier (competition code `WC`).
- **Model**: Elo ratings → Poisson goals → win/draw/loss probabilities + most-likely scorelines.
- **Commentary**: 2–3 sentence AI write-up via Vercel AI Gateway (`anthropic/claude-haiku-4-5` by default).

## Setup

```bash
pnpm install
cp .env.example .env.local
# fill in FOOTBALL_DATA_API_KEY at minimum
pnpm dev
```

Open <http://localhost:3000>.

## Environment

| Var | Required | Notes |
| --- | --- | --- |
| `FOOTBALL_DATA_API_KEY` | yes | Free key from football-data.org. 10 req/min on free tier. |
| `AI_GATEWAY_API_KEY` | no | Vercel AI Gateway key. Without it, commentary falls back to a deterministic summary. |
| `WC_COMMENTARY_MODEL` | no | Override default model. Use `provider/model` strings. |

When deployed to Vercel, `AI_GATEWAY_API_KEY` is auto-injected.

## How the model works

1. Each team gets an Elo rating from `data/elo-seed.json` (default `1600` for unseeded teams).
2. The Elo gap drives expected goals per side, calibrated to ~1.30 goals per team for an even match.
3. A Poisson goal distribution gives the score matrix → home / draw / away probabilities and most likely scorelines.
4. The numbers are handed to an LLM that writes neutral pundit-style commentary.

Tweak the constants in `lib/predict.ts` (`AVG_GOALS`, `ELO_TO_GOALS`, `HOME_ADVANTAGE_ELO`) to recalibrate.

## Pages

- `/` — upcoming matches with inline win probabilities.
- `/match/[id]` — single-match prediction page with AI commentary.
- `/bracket` — 12 group cards + FIFA-published knockout tree. `?mode=projected` fills every slot with the most-likely team and shows the predicted champion.
- `/tournament` — Monte Carlo forecast (2,000 iterations) with per-team round-by-round probabilities. Third-place R32 slots use FIFA's official 495-row Annex C lookup table.

## Refreshing Elo seeds

`data/elo-seed.json` is generated from the [martj42/international_results](https://github.com/martj42/international_results) dataset (~49k international matches since 1872) by rolling World-Football-Elo updates forward through every game:

```bash
pnpm update-elo
```

K-factors: 60 for WC, 50 for major continental tournaments, 40 for qualifiers, 30 for friendlies. Home advantage = 100 Elo. Goal-difference multiplier matches eloratings.net.

## Validating the model

```bash
pnpm backtest
```

Re-runs the Elo evolution, then for every WC match in 2010 / 2014 / 2018 / 2022 predicts using the Elos *just before* that match and scores against the actual outcome. Reports log-loss, Brier, modal accuracy, calibration bins, and expected vs. actual goals. Last run on 256 matches:

| Metric | Model | Base-rate baseline |
| --- | --- | --- |
| Log-loss | **0.977** | 1.067 |
| Brier | **0.573** | 0.647 |
| Modal accuracy | **56.6%** | 41.4% |

## Deploy

```bash
vercel
```

Set `FOOTBALL_DATA_API_KEY` in the Vercel project (AI Gateway key is auto-provisioned).
