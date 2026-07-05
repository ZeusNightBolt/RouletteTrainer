# Quadrant — Atlantic City Roulette Trainer

### ▶ Play it live: **https://zeusnightbolt.github.io/RouletteTrainer/**

A dark-theme, play-money roulette game **and** a statistics sandbox for double-zero (Atlantic City
rules) and single-zero wheels. It looks and plays like a real online roulette app — bet on the felt,
watch a ball spin and drop into the pocket — but it is built around one honest question:

> **Do wheel-quadrant droughts (or hot/cold numbers, or streaks) carry any information you can bet on?**

The answer — asserted in CI on every deploy — is **no**. The app exists to show you *why*, with real
math instead of hand-waving: nothing on the screen ever changes the next spin, and no bet-selection
rule changes your expected return.

---

## Tech stack

| Layer | Choice | Notes |
| ----- | ------ | ----- |
| UI framework | **React 18** (`react` / `react-dom` 18.3) | function components + hooks only; no state library |
| Build tool | **Vite 5** (`@vitejs/plugin-react`) | dev server, HMR, production bundle to `dist/` |
| Language | Modern **JavaScript (ESM)**, JSX | no TypeScript, no compile step beyond Vite |
| Graphics | **Hand-rolled SVG** | the wheel and the felt are SVG the app computes from geometry — no canvas, no chart lib |
| Styling | **Plain CSS** with custom properties (`src/styles.css`) | no Tailwind, no CSS-in-JS; dark felt theme, light/system-agnostic |
| Fonts | Saira Condensed (display) + IBM Plex Mono (data) | loaded from Google Fonts |
| Randomness | `crypto.getRandomValues` with **rejection sampling** | exactly zero modulo bias for the live table; a seeded `mulberry32` PRNG is used **only** for reproducible tests |
| Tests / gate | **Node** script (`test/verify.js`), zero test deps | 137 assertions: data invariants, Monte-Carlo edges, closed-form EV, the gambler's-fallacy null |
| CI / hosting | **GitHub Actions → GitHub Pages** (`.github/workflows/deploy.yml`) | runs `verify` → `build` → deploy on every push to `main` |
| Runtime deps | **React + ReactDOM only** | the entire engine, stats, and charts are dependency-free |

Requirements: **Node ≥ 20**. Total source is ~2.4k lines; the production bundle is ~180 KB JS
(~59 KB gzipped).

---

## How to play

The table is a **dual view** that mimics a real online roulette round:

1. **Place bets on the felt.** The left panel opens on a **vertical Atlantic City mat** with a
   session stats banner above it (spins · P&L · hit rate · streak) and a chip console (chip
   denominations, **Undo**, **Clear**). The felt is laid out like a real AC / Resorts World table
   rotated to portrait — reading left → right: the **even-money outside bets stacked down the
   leftmost column** (1–18, EVEN, **RED**, **BLACK**, ODD, 19–36 — RED and BLACK are actual coloured
   boxes), the **three dozens** in the next column, the **0 / 00 head** on top of the **1–36 grid**,
   and the **2:1 column bets** across the bottom. Pick a chip and click the felt. Every real bet is
   clickable:

   | Bet | Where you click | Covers | Pays | House edge (00 wheel) |
   | --- | --------------- | ------ | ---- | --------------------- |
   | **Straight** | a number cell | 1 | 35:1 | −5.26 % |
   | **Split** | the line between two numbers | 2 | 17:1 | −5.26 % |
   | **Street** | the right edge of a row of three | 3 | 11:1 | −5.26 % |
   | **Corner** | the point where four numbers meet | 4 | 8:1 | −5.26 % |
   | **Six-line** | the right edge between two rows | 6 | 5:1 | −5.26 % |
   | **Dozen** | the tall bars in the second-from-left column | 12 | 2:1 | −5.26 % |
   | **Column** | the three `2:1` cells across the bottom | 12 | 2:1 | −5.26 % |
   | **Even-money** | the leftmost column: 1–18 / 19–36 / red / black / odd / even | 18 | 1:1 | **−2.63 %** with AC half-back |
   | **Basket** | 0-00-1-2-3 corner (american only) | 5 | 6:1 | −7.89 % (worst bet) |

   **Double-tap a tile** (or **shift-click** on desktop) removes that tile's whole bet; **Undo** walks
   back one edit at a time; **Clear** wipes the felt (and is itself undoable). Bets ride from spin to
   spin until you change them.

2. **Hit SPIN.** The view flips to a **realistic animated wheel**. The ball rides the outer track,
   decelerates, and **taps into a pocket** — the result stays hidden until it lands (a playful
   "*Gallivanting… / Skedaddling… / Traipsing…*" caption plays while it's in flight, under a
   "rien ne va plus — no more bets" line). When it seats, the winning pocket lights up gold.

3. **See the payout, then the felt returns.** Because a split/corner/etc. is really one chip spread
   across several numbers, the wheel shows the **per-pocket split amount** — a $10 split shows **$5
   on each** of its two pockets, a $100 corner shows **$25 on each** of four (computed from real math,
   `pocketStakes`, not faked). The result holds for **5 seconds**, then the view auto-reverts to the
   felt and **pauses on the outcome, like a live table**: a **dealer puck (dolly)** drops onto the
   winning number and a **net-this-round bar** shows the landed number/colour/sector and your **net
   inclusive of every bet** (staked / returned, win- or loss-toned). It holds until the next round —
   **SPIN repeats the same bets**, or touching the felt starts fresh. A manual **Table / Wheel**
   toggle and a **New bets** button are there too.

Switch between the **American 00** and **European 0** wheels, and toggle **AC half-back / la partage**
(even-money bets lose only half on a zero) in the header. Top up the play-money bankroll with
**+$1,000** anytime.

### The Atlantic City results board

To the right is the electronic tote you'd see over a live AC table, updating every spin:

- the **current number** with its properties (colour, odd/even, high/low, sector),
- the **recent run** of results, colour-coded,
- **red (left) / green / black (right)** counts with a proportion bar,
- **odd-even / low-high / dozen / column** tallies,
- **hot** (most hits) and **cold** (longest dry) numbers, each with its count.

Every panel is descriptive — the board's own footer reminds you each number stays **1/38** no matter
how hot or cold it looks.

### Analysis tabs

Below the board:

- **Telemetry** — live per-quadrant *and* per-colour stats: current/max drought, hit share, streak,
  and a live **χ² goodness-of-fit** test against the *true* (unequal) per-quadrant expectation.
- **Analytics** — an **equity curve** plotting your realized bankroll against the *exact*
  expected-value line, plus realized-vs-expected edge ("luck this session"), hit rate, max drawdown,
  and streaks.
- **Analyze** — paste any comma/space/newline-separated list of results (e.g. a real logged session;
  `00` supported on the double-zero wheel) and get its full quadrant + colour + χ² breakdown through
  the *same* stats engine the live table uses. Junk tokens are flagged, not silently dropped.
- **Fallacy Lab** — runs **100,000 spins** in the browser, pitting three bettors on the *same*
  spin stream: always-coldest quadrant, always-Q1, and uniform-random. They converge on the same
  house edge — the drought counter is a scoreboard, not a forecast.
- **Log** — a plain running log of every spin and settlement.

---

## The math (all asserted by `npm run verify`)

| Bet (double-zero wheel) | House edge |
| ----------------------- | ---------- |
| Even-money **with AC half-back** on 0/00 | **−2.63 %** |
| Even-money on a single-zero wheel (la partage) | −1.35 % |
| Any straight / split / street / corner / six-line / dozen / column / sector | −5.26 % (−2.70 % single-zero) |
| Basket 0-00-1-2-3 | −7.89 % — worst bet on the felt |

Every inside bet covering *k* numbers pays the fair `36/k`-for-one ratio (straight 35:1, split 17:1,
street 11:1, corner 8:1, six-line 5:1), so they all price to the same −5.26 % — checked by **both**
Monte Carlo and closed-form EV. The lone exception is the 5-number basket, whose 6:1 payout is short
of the `36/5` fair line, giving −7.89 %.

Quadrant facts the UI surfaces instead of hiding:

- **38 is not divisible by 4.** The quadrants are **9 / 10 / 9 / 10** pockets (23.68 % vs 26.32 %),
  anchored so 0 opens Q1 and 00 opens Q3. Tallying quadrant hits against a naive 25 % line
  manufactures a fake 2.6-point "bias" out of pure arithmetic; the app's χ² uses the exact
  per-quadrant expectations.
- **P(a specific 10-pocket quadrant misses 10 straight spins)** = (28/38)¹⁰ ≈ **4.7 %** (9-pocket:
  6.7 %). With four quadrants running in parallel, *some* quadrant crosses a 10-spin drought about
  **once every 18 spins** — in CI, 34,041 such events in 600,000 spins, longest drought 50. Seeing
  cold quadrants constantly is exactly what a fair wheel looks like.
- **Coldest ≈ fixed ≈ random.** Betting the coldest quadrant, a fixed quadrant, and a random
  quadrant on identical spins all converge to −5.26 % (spread < 0.8 pt at 600 k spins).
- **The house edge is variance, made visible.** Session Analytics computes the exact EV of your bet
  mix each spin (closed form, asserted to 1e-9) and draws realized P&L against it. The realized line
  wandering around the straight expected line *is* the lesson: the wander shrinks with volume; the
  edge does not.

Full literature review (physics prediction, wheel bias, dealer signature, detection-cost power
analysis, with citations) lives in [`docs/RESEARCH.md`](docs/RESEARCH.md).

---

## Honesty constraints (why you can trust it)

- **Nothing in the spin path reads history.** Every spin is uniform over all pockets via
  `crypto.getRandomValues` with rejection sampling. Droughts, χ², hot/cold, and the Fallacy Lab are
  strictly *descriptive*.
- **Real payouts, verified.** Realized house edges are asserted against closed-form theory by Monte
  Carlo in CI, and the exact-EV engine is asserted against theory to 1e-9.
- **Exact probabilities, never rounded to a convenient lie.** The UI shows 9/38 vs 10/38 (23.68 % /
  26.32 %), never a flat 25 %.

Out of scope by design: real-money play, betting systems, and outcome prediction. The only methods
that have ever genuinely beaten roulette — physics-based prediction of the *current* spin and
hardware wheel-bias detection over thousands of logged spins — are discussed (with citations) in the
research doc, not implemented.

---

## Project structure

```
index.html                         dark-root shell + fonts + inline SVG roulette-wheel favicon
src/main.jsx                       React entry
src/ui.js                          shared constants/formatters: SPIN_MS, RESULT_HOLD_MS,
                                   SPIN_WORDS / pickSpinWord, Q_CLASS, CHIPS, fmt/signed/pct
src/wheels.js                      SOURCE OF TRUTH: pocket sequences, quadrant arcs, French call bets,
                                   colorOf / quadrantIndexOf helpers
src/engine.js                      pure engine (no DOM, Node-importable):
                                     makeCryptoRng / mulberry32 · spin · parseSequence · resolve
                                     (incl. inside "i:" bets) · betEV · pocketStakes · quadrantStats ·
                                     colorStats · numberStats · chiSquare · simulateStrategies · pnlStats ·
                                     recommendBets (Analyze-tab heuristic; descriptive, no edge claim)
src/App.jsx                        state, undo stack, the mat → wheel → paused-result flow, layout
src/components/
  RouletteMat.jsx                  vertical AC-style SVG felt: even-money outside bets down the leftmost
                                   column, dozens beside them, 1–36 grid, 2:1 columns on the bottom;
                                   geometry-derived split/street/corner/six-line hotspots + basket;
                                   dealer puck (dolly) drops on the winning number after a spin
  Wheel.jsx                        SVG wheel as a betting surface; orbit + drop/tap ball animation
                                   (result hidden until the ball seats); per-pocket split amounts + highlight
  BetConsole.jsx                   chip selector + undo/clear
  StatsBanner.jsx                  compact spins / P&L / hit-rate / streak strip
  ResultBar.jsx                    paused-result bar over the felt: landed number + net-this-round (all bets)
  RouletteMark.jsx                 mini roulette-wheel logo (header) — same geometry as the SVG favicon
  ACBoard.jsx                      Atlantic City results tote (current, recent, red/black, tallies, hot/cold)
  QuadrantPanel.jsx                quadrant cards + colour/streak bar + live χ²  (Telemetry tab)
  SessionAnalytics.jsx             realized-vs-expected equity curve + P&L tiles  (Analytics tab)
  SequenceAnalyzer.jsx             paste-a-sequence analyzer; >6 results unlock the below  (Analyze tab)
  FrequencyWheel.jsx               pasted history mapped onto the wheel: per-pocket heat + quadrant totals
  BetRecommendations.jsx           momentum + mean-reversion bet slips from recommendBets (+ "not an edge")
  FallacyLab.jsx                   100k-spin cold/fixed/random comparison          (Fallacy Lab tab)
  ResultsTicker.jsx               recent-numbers marquee (used by the analyzer)
src/styles.css                     full dark-felt theme + responsive/viewport-fit layout + animations
test/verify.js                     the 137-assertion CI gate
docs/RESEARCH.md                   literature + detection-cost math, all citations
.github/workflows/deploy.yml       verify → build → GitHub Pages
```

`src/engine.js` and `src/wheels.js` are DOM-free and imported directly by both the React app and the
Node test gate — the exact same code that pays the table is the code that CI verifies.

---

## Development

```bash
npm install
npm run verify    # 137-assertion gate (~10 s) — run before every commit
npm run dev       # Vite dev server (HMR)
npm run build     # production bundle → dist/
npm run preview   # serve the built dist/ locally
```

Working rules for contributors live in [`CLAUDE.md`](CLAUDE.md). The short version: `src/wheels.js`
is the single source of truth; `src/engine.js` stays pure; **new bet types ship verification-first**
(resolution → closed-form edge → Monte-Carlo assertion → `verify` passes → *then* wire the UI); and
nothing in the spin path may condition on history.

## Deployment

Pushes to `main` trigger `.github/workflows/deploy.yml`, which runs `npm ci` → **`npm run verify`**
→ `npm run build` → `actions/deploy-pages`. If any payout, wheel datum, or the fallacy null drifts,
`verify` fails and the site is **not** deployed. Vite's `base: "./"` makes the bundle work under the
`/RouletteTrainer/` project subpath. To host your own fork: enable **Settings → Pages → Source:
GitHub Actions**.

## What `verify` checks (137 assertions)

- **Exact structural invariants** of both wheels (38 / 37 pockets, no dupes; the real geometric
  property that every odd *n* sits opposite *n+1* and 0 opposite 00; 18 red per wheel; quadrant and
  French-call-bet partitions).
- **Monte-Carlo house edges** for every bet type (straight, split, street, corner, six-line, dozen,
  column, sector, basket, even-money with/without half-back) on both wheels, vs closed-form theory.
- **Closed-form EV** (`betEV`) matching theory to 1e-9, additivity across a mix, and agreement with
  the `resolve()`-based Monte-Carlo edge.
- **Per-pocket stake conservation** (`pocketStakes`): a chip on *k* numbers puts `amount/k` on each,
  and the distributed total equals the staked total.
- **The gambler's-fallacy null**: coldest ≈ fixed ≈ random quadrant over 600 k spins.
- **Descriptive rollups**: quadrant/colour/number stats, the sequence parser, and the
  session-analytics equity curves, each checked by hand on known inputs.

## License

MIT — see [`LICENSE`](LICENSE). Educational play-money tool: every bet simulated here is negative
expectation, and no display in this app changes the next spin.
