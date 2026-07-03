# Quadrant — Atlantic City Roulette Trainer

### ▶ Play it live: **https://zeusnightbolt.github.io/RouletteTrainer/**

A dark-theme React trainer for double-zero (Atlantic City rules) and single-zero roulette, built
around one question: **do wheel-quadrant droughts carry any tradeable information?**

The app gives you a real-sequence wheel, a full AC betting layout, live per-quadrant telemetry
(current drought, max drought, hit share, χ² vs. fair), a **Session Analytics** card that plots
your realized bankroll against the *exact* expected-value line, and a **Fallacy Lab** that runs
100,000 spins in-browser pitting *bet-the-coldest-quadrant* against *bet-a-fixed-quadrant* and
*bet-at-random* on the **same spins**.

The answer — verified in CI on every deploy — is no.

## Project scope

**What this is.** A single-page, play-money teaching tool. It is an honest simulator of the two
roulette wheels an Atlantic City floor actually spins, wired to surface — rather than hide — the
statistics a "system" player misreads. Every claim it makes on screen is backed by an assertion in
`test/verify.js`, and CI blocks the Pages deploy if any of them drift. The thesis it exists to
demonstrate: **no display on this screen changes the next spin, and no quadrant-selection rule
changes your expected return.**

Three things it does that a typical roulette applet does not:

1. **Uses real pocket geometry, not a naïve 25 % baseline.** 38 isn't divisible by four, so the
   quadrants are 9 / 10 / 9 / 10 pockets. The app shows the exact per-arc probability everywhere
   and runs its χ² against the true expectation, so it never manufactures a fake "bias" out of
   arithmetic.
2. **Makes the house edge visible as it happens.** The Session Analytics equity curve draws your
   realized P&L against the closed-form expected line; the gap is variance, and the copy names it
   as such and explains that it shrinks with volume — never the edge itself.
3. **Lets you falsify the "cold quadrant is due" hypothesis yourself.** The Fallacy Lab resolves
   cold / fixed / random quadrant bettors on identical 100 k-spin streams and shows them converge.

**What this is not.** Not real-money gambling, not a betting system, and not a predictor. It
deliberately implements **no** history-conditioned logic in the spin path (see the honesty
constraints in `CLAUDE.md`). Physics-based prediction and hardware wheel-bias — the only methods
that have ever genuinely beaten roulette — are out of scope by design and are covered in
[`docs/RESEARCH.md`](docs/RESEARCH.md) with citations.

**Audience.** Anyone curious about the gambler's fallacy, statistics students wanting a live χ² /
drought / power-analysis sandbox, and developers who want a compact, fully-verified example of an
honest casino simulation.

## The math (all asserted by `npm run verify`)

| Bet (double-zero wheel)                      | House edge |
| -------------------------------------------- | ---------- |
| Even-money **with AC half-back** on 0/00     | **−2.63 %** |
| Even-money on a single-zero wheel (la partage)| −1.35 % |
| Any straight / split / dozen / column / sector| −5.26 % (−2.70 % single-zero) |
| Basket 0-00-1-2-3                             | −7.89 % — worst bet on the felt |

Quadrant facts the UI surfaces instead of hiding:

- 38 is not divisible by 4. The quadrants are **9 / 10 / 9 / 10** pockets (23.68 % vs 26.32 %),
  anchored so 0 opens Q1 and 00 opens Q3. Tallying quadrant hits against a naive 25 % baseline
  manufactures a fake 2.6-point "bias" out of pure arithmetic.
- P(a specific 10-pocket quadrant misses 10 straight spins) = (28/38)¹⁰ ≈ **4.7 %**
  (9-pocket: 6.7 %). With four quadrants running in parallel, *some* quadrant crosses a
  10-spin drought about **once every 18 spins** — in the CI simulation, 34,041 such events in
  600,000 spins, longest drought 50. Seeing cold quadrants constantly is what a fair wheel looks like.
- Betting the coldest quadrant, a fixed quadrant, and a random quadrant on identical spins all
  converge to the same −5.26 % (spread < 0.8 pt at 600 k spins). The drought counter is a
  scoreboard, not a forecast.
- **Session Analytics** computes the *exact* expected value of your bet mix each spin (closed form,
  asserted to 1e-9 against theory) and plots realized P&L against it. Realized edge, "luck this
  session" (realized − expected), hit rate, max drawdown, and streaks are all tracked. The realized
  line wandering around the straight expected line is the whole lesson: that wander is variance, and
  it shrinks with volume — the house edge does not.

Full literature review (physics prediction, wheel bias, dealer signature, detection-cost math)
in [`docs/RESEARCH.md`](docs/RESEARCH.md).

## Quickstart

```bash
npm install
npm run verify   # structural invariants + Monte-Carlo edge assertions + fallacy null
npm run dev      # local dev server
npm run build    # production bundle in dist/
```

Node ≥ 20. The GitHub Actions workflow (`.github/workflows/deploy.yml`) runs `verify` before
every Pages deploy — if any payout, wheel datum, or the fallacy null drifts, the build fails.

## Architecture

```
src/wheels.js      source of truth: pocket sequences, quadrant arcs, French call bets
src/engine.js      pure engine (no DOM): crypto RNG w/ rejection sampling, bet resolution,
                   exact bet EV (betEV), quadrant stats, χ², strategy simulator, session P&L (pnlStats)
test/verify.js     CI gate: 62 assertions — exact data invariants, MC edges vs theory,
                   gambler's-fallacy null, closed-form EV, session-analytics rollups
src/App.jsx        state + wiring
src/components/    Wheel (SVG + telemetry ring), Board (AC layout), QuadrantPanel,
                   SessionAnalytics (equity curve + realized-vs-expected), FallacyLab
```

Design constraints: the live table uses `crypto.getRandomValues` with rejection sampling
(exactly zero modulo bias); the seeded PRNG exists only for reproducible tests; nothing in the
spin path ever reads history. GitHub Pages is served from the `deploy.yml` workflow on every push
to `main` (Settings → Pages → Source: **GitHub Actions**); Vite's `base: "./"` keeps the bundle
working under the `/RouletteTrainer/` project subpath.

## License

MIT — see [`LICENSE`](LICENSE). Educational play-money tool; every bet simulated here is
negative expectation, and no display in this app changes the next spin.
