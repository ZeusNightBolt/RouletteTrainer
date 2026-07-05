# CLAUDE.md — working rules for this repo

## Non-negotiables

1. **`npm run verify` must pass before any commit.** CI runs it before build/deploy and blocks
   on failure. It asserts exact wheel-data invariants, Monte-Carlo house edges vs closed-form
   theory for every bet type, and the gambler's-fallacy null (cold ≈ fixed ≈ random quadrant).
2. **`src/wheels.js` is the single source of truth** for pocket sequences, quadrant arcs, and
   call bets. Never edit sequences by hand without re-running verify; the odd-opposite-even and
   0-opposite-00 geometric invariants will catch transcription errors.
3. **`src/engine.js` stays pure** — no DOM, no React, importable by Node tests. The live table
   uses the rejection-sampled crypto RNG only; `mulberry32` is for reproducible tests, never
   the UI.
4. **Verification-first for new bets.** Any new bet type ships in this order:
   (a) resolution logic in `engine.js` → (b) closed-form edge worked out →
   (c) Monte-Carlo assertion added to `test/verify.js` `cases` → (d) verify passes →
   (e) only then wire the UI. Same pattern used in the prior craps/blackjack/baccarat trainers.
5. **Honesty constraints in the UI.** Nothing in the spin path may condition on history.
   Drought counters, χ², and the Fallacy Lab are descriptive; keep the "descriptive, not
   predictive" copy and exact per-quadrant probabilities (9/38 vs 10/38 — never display 25 %).

## Styling constraints (user preference — do not regress)

- Dark background set at the **root**: `:root { color-scheme: dark }` and
  `html, body, #root { background: var(--bg) }` (mirrored inline in `index.html` to avoid
  pre-CSS flash). `body { min-height: 100vh }`.
- Sticky/fixed headers get an **explicit opaque background** (`.hdr` in `src/styles.css`).
- No Tailwind. Plain CSS with variables in `src/styles.css`. If Tailwind is ever introduced,
  core utility classes only — no arbitrary `bg-[#...]` values.
- Fonts: Saira Condensed (display numerals), IBM Plex Mono (data). Quadrant palette:
  `--q1..--q4` = #ffb020 / #45a8ff / #b388ff / #2dd4bf; cold accent #ff5470; gold CTA #e2b755.

## Commands

```bash
npm install
npm run verify    # 133-assertion gate (~10 s)
npm run dev       # Vite dev server
npm run build     # production bundle → dist/
npm run preview   # serve dist/
```

## File map

```
index.html                    dark-root shell, fonts, inline SVG roulette-wheel favicon (data-URI)
src/main.jsx                  entry
src/ui.js                     shared UI constants + formatters (SPIN_MS, RESULT_HOLD_MS, SPIN_WORDS,
                              Q_CLASS, CHIPS, fmt/signed/pct)
src/App.jsx                   state (wheel, bets + undo stack, bankroll, history, log, settled result)
                              + flow: vertical MAT + banner → SPIN flips to WHEEL → auto-reverts
                              to felt and PAUSES on the result (dealer puck on the winning number +
                              net-this-round bar) until the next round; AC board + tabs on the right
src/wheels.js                 wheel data + quadrant helpers (SOURCE OF TRUTH)
src/engine.js                 RNG, spin, parseSequence, resolve (incl. inside "i:" bets), betEV,
                              pocketStakes, quadrantStats, colorStats, numberStats, chiSquare,
                              simulateStrategies, pnlStats, recommendBets (Analyze-tab heuristic:
                              momentum + mean-reversion bet slips; descriptive, makes no edge claim)
src/components/RouletteMat.jsx VERTICAL AC-felt betting surface: even-money outside bets down the
                              LEFTMOST column (1-18/EVEN/RED/BLACK/ODD/19-36, RED+BLACK coloured),
                              dozens beside them, 1-36 grid, 2:1 columns on the bottom; geometry-derived
                              split/street/corner/six-line hotspots + basket; + dealer puck (dolly) on
                              the winning number after a spin (winner prop)
src/components/Wheel.jsx      SVG wheel AS betting surface (pockets = straight-up, ring = sector);
                              ball orbits + drops/taps into the pocket (result hidden until it lands,
                              gated by App's `spinning`), then shows per-pocket split amounts + highlight
src/components/BetConsole.jsx chip selector + undo/clear, docked above the mat/wheel
src/components/StatsBanner.jsx compact session banner (spins / P&L / hit rate / streak) above the mat
src/components/ResultBar.jsx  paused-result bar over the felt: landed number/colour/sector + net this
                              round (all bets); holds until the next round begins
src/components/RouletteMark.jsx  mini roulette-wheel logo (red/black wedges + green hub + ball) used in
                              the header; same geometry mirrored as the index.html SVG favicon
src/components/ACBoard.jsx    Atlantic City results board: current number, recent run, red/black tote,
                              odd-even/low-high/dozen/column tallies, hot & cold numbers
src/components/ResultsTicker.jsx  recent-numbers marquee (used by the Analyze tab)
src/components/QuadrantPanel.jsx  4 quadrant cards, color/streak bar, live χ² (strip extracted)
src/components/SessionAnalytics.jsx  equity curve (realized vs exact-EV), P&L / edge / streak tiles
src/components/SequenceAnalyzer.jsx  Analyze tab: paste numbers → parseSequence → QuadrantPanel;
                              at >6 results also unlocks the FrequencyWheel + BetRecommendations
src/components/FrequencyWheel.jsx  Analyze tab: pasted history mapped back onto the wheel — per-pocket
                              hit counts + gold heat + quadrant totals (descriptive map of the past)
src/components/BetRecommendations.jsx  Analyze tab: two sized bet slips from recommendBets (momentum
                              vs mean-reversion) + prominent "not an edge" disclaimer
src/components/FallacyLab.jsx 100k-spin cold/fixed/random comparison
src/styles.css                full theme
test/verify.js                CI gate
docs/RESEARCH.md              literature + detection-cost math, all citations
.github/workflows/deploy.yml  verify → build → GitHub Pages
```

## Ideas parked for later (verify-gated like everything else)

- Biased-wheel sandbox: hidden quadrant weights + "detect it with χ² before the budget runs
  out" game, teaching the §3 detection-cost lesson interactively.
- CSV/file spin-log import — the Analyze tab (paste comma/space/newline results → full
  quadrant + colour + χ² breakdown via `parseSequence`) covers the paste case; a file/CSV
  uploader on top of it is the remaining bit.
- EU racetrack call bets (voisins/tiers/orphelins) — data already in `wheels.js` with
  invariants tested; needs resolution + edge assertions + UI.
