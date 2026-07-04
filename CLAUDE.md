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
npm run verify    # 79-assertion gate (~10 s)
npm run dev       # Vite dev server
npm run build     # production bundle → dist/
npm run preview   # serve dist/
```

## File map

```
index.html                    dark-root shell, fonts
src/main.jsx                  entry
src/ui.js                     shared UI constants + formatters (Q_CLASS, CHIPS, fmt/signed/pct)
src/App.jsx                   state (wheel, bets + undo stack, bankroll, history, log)
                              + viewport-fit layout: wheel console left, tabbed panel right
src/wheels.js                 wheel data + quadrant helpers (SOURCE OF TRUTH)
src/engine.js                 RNG, spin, parseSequence, resolve, betEV, quadrantStats,
                              colorStats, chiSquare, simulateStrategies, pnlStats
src/components/Wheel.jsx      SVG wheel AS betting surface (pockets = straight-up,
                              outer ring = sector) + drought ring + hub + ball-orbit anim
src/components/BetConsole.jsx chip selector + undo/clear, docked at the wheel
src/components/OutsideBets.jsx evens/dozens/columns/basket strip under the wheel
src/components/ResultsTicker.jsx  recent-numbers marquee (top of wheel col + Analyze tab)
src/components/Board.jsx      classic felt (Table tab) — same shared bet state
src/components/QuadrantPanel.jsx  4 quadrant cards, color/streak bar, live χ² (strip extracted)
src/components/SessionAnalytics.jsx  equity curve (realized vs exact-EV), P&L / edge / streak tiles
src/components/SequenceAnalyzer.jsx  Analyze tab: paste numbers → parseSequence → QuadrantPanel
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
