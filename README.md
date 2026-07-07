# 🎡 Quadrant — Atlantic City Roulette Trainer

[![▶ Play live](https://img.shields.io/badge/▶_Play-live-e2b755?style=for-the-badge)](https://zeusnightbolt.github.io/RouletteTrainer/)
[![verify](https://img.shields.io/badge/verify-147_assertions-3bda8d?style=for-the-badge)](test/verify.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-45a8ff?style=for-the-badge)](LICENSE)

![React](https://img.shields.io/badge/React_18-20232A?logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite_5-646CFF?logo=vite&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript_ESM-F7DF1E?logo=javascript&logoColor=black)
![Plain CSS](https://img.shields.io/badge/Plain_CSS-1572B6?logo=css3&logoColor=white)
![Hand-rolled SVG](https://img.shields.io/badge/Graphics-hand--rolled_SVG-FFB020?logo=svg&logoColor=white)
![Node ≥ 20](https://img.shields.io/badge/Node-%E2%89%A5_20-339933?logo=nodedotjs&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?logo=githubactions&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub_Pages-222222?logo=github&logoColor=white)
![deps: React only](https://img.shields.io/badge/runtime_deps-React_only-b388ff)

A dark-theme, **play-money roulette game *and* statistics sandbox** for double-zero (Atlantic City) and single-zero wheels. It plays like a real online table — bet on the felt, watch the ball ride the track and drop, a dealer dolly marks the winner — while answering one honest question:

> **Do quadrant droughts, hot/cold numbers, or streaks carry any signal you can bet on?**

The answer, **asserted in CI on every deploy, is _no_.** Nothing on screen ever changes the next spin, and no bet-selection rule changes your expected return — the app exists to show you *why*, with real math instead of hand-waving.

### ▶ Play it live → **https://zeusnightbolt.github.io/RouletteTrainer/**

---

## Features

- 🎯 **Real Atlantic City felt** — vertical layout with even-money bets + dozens down the left, the 1–36 grid, and geometry-derived straight / split / street / corner / six-line / basket hotspots. Tap to bet, **double-tap a tile to clear it**.
- 🎡 **Animated wheel** — a crypto-random spin; the ball rides the track, taps across the frets, and seats in the pocket (result hidden until it lands). Then a **dealer dolly** and a **net-this-round bar** pause on the felt, just like a live table.
- 💸 **"No more bets" wager timing** — chips on the felt stay freely movable (undo, clear, double-tap) and are **never charged** until you spin; the instant the ball is in flight the **stake leaves the bankroll**, and the landing credits the return — exactly the cadence of a live table. Wheel switching locks mid-spin.
- 📊 **Telemetry** — live per-quadrant *and* per-colour drought, hit share, streaks, and a **χ² goodness-of-fit** test against the *true* 9/38 – 10/38 expectation.
- 📈 **Analytics** — your realized P&L drawn against the **exact-EV** line, plus edge, hit rate, max drawdown, and streaks.
- 🔍 **Analyze** — paste any result log → quadrant / colour / χ² breakdown, a **frequency wheel**, and momentum / mean-reversion **bet suggestions** (incl. hot & cold *quadrant sectors* + edge numbers) — all clearly flagged *pattern-play, not an edge*.
- 🧪 **Fallacy Lab** — 100 000 spins pitting **coldest vs fixed vs random** quadrant on the same stream; they converge on the identical house edge.

## The math (all asserted by `npm run verify`)

| Bet (double-zero wheel) | House edge |
| --- | --- |
| Even-money, **AC half-back** on 0/00 | **−2.63 %** |
| Any straight / split / street / corner / six-line / dozen / column / sector | −5.26 % |
| Basket 0-00-1-2-3 | −7.89 % (worst bet) |

Every inside bet covering *k* numbers pays the fair `36/k`-for-one ratio, so they all price to **−5.26 %** (the 5-number basket's 6:1 is the lone short-payout exception). Quadrants are **9 / 10 / 9 / 10** pockets — the UI shows **23.68 % / 26.32 %**, never a convenient flat 25 %. Full literature review + citations: [`docs/RESEARCH.md`](docs/RESEARCH.md).

## Run it

```bash
npm install
npm run verify    # 147-assertion gate (~10 s) — run before every commit
npm run dev       # Vite dev server (HMR)
npm run build     # production bundle → dist/
npm run preview   # serve the built dist/ locally
```

## How it's built

The pure, DOM-free **`src/engine.js`** + **`src/wheels.js`** (single source of truth) power **both** the React UI and the Node `verify` gate — *the same code that pays the table is the code CI checks.* Spins use `crypto.getRandomValues` with **rejection sampling** (a seeded `mulberry32` PRNG is used only in tests). The wheel and felt are **hand-rolled SVG** from geometry; styling is **plain CSS** variables (no Tailwind); runtime deps are **React + ReactDOM only**.

`verify` (147 assertions) checks: exact wheel geometry (38/37 pockets, odd-opposite-even, 0-opposite-00), Monte-Carlo house edges vs theory for **every** bet type, closed-form EV to `1e-9`, per-pocket stake conservation, and the **gambler's-fallacy null** (coldest ≈ fixed ≈ random quadrant over 600 000 spins). Pushes to `main` run `verify → build → deploy-pages`; a drifted payout fails the gate and blocks the deploy.

Contributor rules live in [`CLAUDE.md`](CLAUDE.md) — new bet types ship **verification-first** (resolution → closed-form edge → Monte-Carlo assertion → `verify` passes → *then* wire the UI), and nothing in the spin path may read history.

## License

**MIT** — see [`LICENSE`](LICENSE). Educational play-money tool: every bet simulated here is negative expectation, and no display in this app changes the next spin.
