# Probability & RNG Audit — Roulette Trainer

**Date:** 2026-07-07 · **Branch:** `claude/casino-gateway-probability-check-cpfzy1`
**Scope:** `src/engine.js` (RNG, spin, resolve, betEV, chiSquare, simulators),
`src/wheels.js` (wheel data + quadrant helpers), `test/verify.js` (CI gate), and the
RNG/probability surface of the UI (`src/App.jsx`, `src/components/*`).
Literature, citations, and the bias-detection cost math live in
[`docs/RESEARCH.md`](./RESEARCH.md) — this audit does not duplicate them; it checks the
code against the closed-form mathematics of American double-zero (and European
single-zero) roulette.

## Verdict

**SOUND.** No probability, payout, or RNG defect found. `npm run verify` passes with
**147 assertions, 0 failures**, and spot-derivation of every assertion's target value
confirms the gate asserts the *correct* numbers (i.e., the tests themselves are not
wrong). No code changes were required.

## Methodology

1. Read `src/wheels.js`, `src/engine.js`, and `test/verify.js` in full.
2. Re-derived every house edge and payout from first principles (per-bet win
   probability × return ratio on a 38-pocket wheel) and compared against both the
   engine's closed-form `betEV` and the Monte-Carlo targets hard-coded in
   `test/verify.js` `cases` / `evCases`.
3. Checked the rejection-sampling bound in `makeCryptoRng` analytically for modulo
   bias, and audited every RNG call site in `src/` for which generator it uses.
4. Verified both pocket sequences against the standard published wheel orders
   (Wizard of Odds "number sequence"; see RESEARCH.md for citations) and confirmed
   the geometric invariants (odd-opposite-even, 0-opposite-00) that the gate asserts.
5. Ran `npm run verify` and counted PASS/FAIL lines.

## Findings

| # | Area | Severity | Finding | Status |
|---|------|----------|---------|--------|
| 1 | RNG — live table | None (pass) | `makeCryptoRng` fills a 1024-word `Uint32Array` from `crypto.getRandomValues` and rejects any word `v ≥ ⌊2³²/n⌋·n` before returning `v % n`. For n = 38 the acceptance bound is 4 294 967 276, so every pocket 0..37 is hit by exactly 113 025 454 accepted words — **exactly uniform, zero modulo bias**. | Verified, no change |
| 2 | RNG — seeding/separation | None (pass) | `mulberry32` is defined in `engine.js` and used **only** in `test/verify.js` (seeds 11–99, 42). The live table (`App.jsx` line 44) and the FallacyLab both construct `makeCryptoRng()`. No `Math.random` in any outcome path. | Verified, no change |
| 3 | RNG — cosmetic `Math.random` | Informational | `src/ui.js` `pickSpinWord` (in-flight caption word) and `src/components/Wheel.jsx` line 100 (3–8 rail-tumble animation count) use `Math.random`. Both run **after** the pocket is already drawn by the crypto RNG and feed nothing back into outcomes, stats, or payouts. Purely presentational; compliant with the CLAUDE.md rule as written (the *table* uses crypto only). | No change needed |
| 4 | Wheel data — pocket sets | None (pass) | American: 38 pockets = {0, 00, 1..36}, no duplicates. European: 37 = {0, 1..36}. Sequences match the standard published clockwise orders. | Verified by gate (exact assertions) |
| 5 | Wheel data — geometry | None (pass) | American: every odd n (1..35) sits exactly 19 pockets (mod 38) from n+1; 0 sits exactly opposite 00. RED set is the standard 18 numbers; 18 red / 18 black per wheel. Quadrants partition all pockets exactly once, sizes 9/10/9/10 (US) and 10/9/9/9 (EU), anchored so 0 opens Q1 and 00 opens Q3. EU call bets partition 37 pockets 17/12/8 as contiguous arcs. | Verified by gate |
| 6 | Spin path — history blindness | None (pass) | `spin()` is `seq[rand(38)]` — a pure uniform draw. Nothing in `App.jsx`'s `doSpin` reads history, droughts, or bets before drawing. `simulateStrategies` chooses the "cold" quadrant **before** observing each spin (correct ordering for the fallacy null). | Verified, no change |
| 7 | Edge math — inside/outside bets | None (pass) | All derivations below check out in `resolve`, `betEV`, and the gate's targets. | Verified |
| 8 | Edge math — even-money default | Informational | `resolve`/`betEV` default `halfBack: true` (Atlantic City surrender: even-money bets lose half on 0/00), so the table's even-money edge is **2.632 %**, not 5.263 %. This is deliberate, documented in the code, and both settings are asserted in the gate (−100/38 with, −200/38 without). Not a bug — just note that "everything is 5.26 %" holds only with half-back off. | No change needed |
| 9 | Displayed probabilities | None (pass) | `QuadrantPanel` renders `(100 * s.p).toFixed(2)` % from the exact `m/38` (or `m/37`) — 23.68 % / 26.32 % on the US wheel, 27.03 % / 24.32 % on the EU wheel. No hard-coded "25 %" anywhere in `src/`. | Verified (grep + code read) |
| 10 | Gate assertion correctness | None (pass) | Every theory target in `cases`/`evCases` matches the independent derivation (table below), including the exact-fraction forms (−100/19, −300/38, −100/37, −50/37). Monte-Carlo tolerances are ≈2.5σ or wider at the chosen N and are deterministic (fixed seeds), so the gate cannot flake. | Verified |

## Edge & probability verification (independent derivation vs code)

American wheel, N = 38 pockets. Edge = (expected return per unit − 1) × 100 %.

| Bet | Covers | Pays | Win prob | Edge (derived) | `betEV` / gate target | Match |
|-----|--------|------|----------|----------------|------------------------|-------|
| Straight up | 1 | 35:1 (36×) | 1/38 | 36/38 − 1 = **−5.263 %** | −100/19 | Yes |
| Split (`i:a-b`, incl. 0-00) | 2 | 17:1 (18×) | 2/38 | −5.263 % | −100/19 | Yes |
| Street / trio (incl. 00-2-3) | 3 | 11:1 (12×) | 3/38 | −5.263 % | −100/19 | Yes |
| Corner | 4 | 8:1 (9×) | 4/38 | −5.263 % | −100/19 | Yes |
| Six line | 6 | 5:1 (6×) | 6/38 | −5.263 % | −100/19 | Yes |
| Dozen / column | 12 | 2:1 (3×) | 12/38 | 36/38 − 1 = −5.263 % | −100/19 | Yes |
| **Basket 0-00-1-2-3** | 5 | 6:1 (7×) | 5/38 | 35/38 − 1 = **−7.895 %** | −300/38 = −7.8947 % | Yes |
| Even money, half-back OFF | 18 | 1:1 (2×) | 18/38 | 36/38 − 1 = −5.263 % | −200/38 | Yes |
| Even money, half-back ON (AC) | 18 | 1:1; ½ back on 0/00 | 18/38 | (36 + 2·½)/38 − 1 = −1/38 = **−2.632 %** | −100/38 | Yes |
| Quadrant (9 pockets) | 9 | stake/9 straight-up each | 9/38 = **23.68 %** | (9/38)·(36/9) − 1 = −5.263 % | −100/19 | Yes |
| Quadrant (10 pockets) | 10 | stake/10 each | 10/38 = **26.32 %** | (10/38)·(36/10) − 1 = −5.263 % | −100/19 | Yes |

European cross-checks (N = 37): straight/split/corner/quadrant = −1/37 = **−2.703 %**;
even money with la partage = −1/74 = **−1.351 %**. All asserted and passing.

Every US bet type prices to the flat 2/38 edge except the five-number basket (3/38) and
half-back even money (1/38) — exactly the real Atlantic City schedule. `betEV` is
closed-form and gate-checked to 1e-9; the Monte-Carlo `resolve()` edges agree within
their deterministic tolerances; the two are tied together by the mixed-bet
analytic-vs-MC assertion.

`chiSquare` is the standard Pearson statistic with **unequal** expected counts (the
9/10/9/10 split), df = 3, criticals 7.815 (α = 0.05) / 11.345 (α = 0.01) — correct.

## Gambler's-fallacy null

`simulateStrategies` (600 000 spins per wheel, seed 42): cold-quadrant, fixed-quadrant,
and random-quadrant betting all converge to the house edge (−5.263 % US / −2.703 % EU)
within ±0.8 pts, and cold−fixed spread < 0.8 pts. The cold pick is chosen before each
spin is observed, so the null holds by construction and empirically. Passing.

## Test run

```
npm run verify
→ 147 assertions: 147 PASS, 0 FAIL
→ "VERIFY PASSED — data invariants exact, all edges within tolerance, fallacy null holds."
```

Matches the "147-assertion gate" documented in CLAUDE.md.

## Recommendations (no code changes made)

1. **Pin the assertion count in CI** (optional): a one-line check that the PASS count
   equals 147 would catch a future edit that silently deletes assertions while still
   "passing".
2. **Comment the cosmetic `Math.random` sites** (optional): a one-line note at
   `src/ui.js` `pickSpinWord` and `Wheel.jsx` `bounces` saying "presentation only —
   never an outcome" would pre-empt future audits flagging them.
3. **RNG uniformity smoke test** (optional): the gate exercises `makeCryptoRng` only
   indirectly (the MC edges use mulberry32 for determinism, correctly). A cheap
   supplementary assertion — e.g. 380 000 draws from `makeCryptoRng()` with a χ²
   (df = 37) bound — would directly regression-test the rejection sampler. Left as a
   recommendation because adding a non-deterministic test to a strict gate is a
   flakiness trade-off the maintainers should decide on.
4. When the parked EU racetrack call bets ship, follow the CLAUDE.md order: voisins
   (17 pockets, mixed splits/trio/corner in the real bet) does **not** price to a
   single flat ratio the way the current `q:` sector bet does — work the closed form
   first, then the MC assertion, then UI.

*Audited by Claude (Fable 5). No probability-affecting code was modified; the tree at
audit time already satisfied every checked invariant.*
