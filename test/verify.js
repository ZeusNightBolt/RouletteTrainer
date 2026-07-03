// ---------------------------------------------------------------------------
// Verification gate. Run: npm run verify   (CI runs it before every deploy)
//
// Part 1 — EXACT structural invariants of the wheel data (no tolerance).
// Part 2 — Monte-Carlo house-edge assertions for every bet type, using a
//          deterministic seed, compared against closed-form theory.
// Part 3 — The gambler's-fallacy null: betting the coldest quadrant must
//          converge to the same edge as betting a fixed or random quadrant.
// Exits 1 on any failure.
// ---------------------------------------------------------------------------

import { WHEELS, RED, CALL_BETS_EU, colorOf, quadrantIndexOf } from "../src/wheels.js";
import { spin, resolve, mulberry32, asIntRand, simulateStrategies, betEV, pnlStats } from "../src/engine.js";

let failures = 0;
const ok = (cond, label, detail = "") => {
  const mark = cond ? "PASS" : "FAIL";
  if (!cond) failures++;
  console.log(`  ${mark}  ${label}${detail ? "  " + detail : ""}`);
};
const near = (x, target, tol) => Math.abs(x - target) <= tol;

// --- Part 1: structural invariants -----------------------------------------

console.log("\n[1/3] Wheel data invariants");

const A = WHEELS.american;
const E = WHEELS.european;

ok(A.seq.length === 38, "American wheel has 38 pockets");
ok(E.seq.length === 37, "European wheel has 37 pockets");

const expectAmerican = new Set(["0", "00", ...Array.from({ length: 36 }, (_, i) => String(i + 1))]);
const expectEuropean = new Set(["0", ...Array.from({ length: 36 }, (_, i) => String(i + 1))]);
ok(new Set(A.seq).size === 38 && A.seq.every((n) => expectAmerican.has(n)), "American pockets = {0, 00, 1..36}, no dupes");
ok(new Set(E.seq).size === 37 && E.seq.every((n) => expectEuropean.has(n)), "European pockets = {0, 1..36}, no dupes");

// Known geometric property of the real double-zero wheel: every odd n sits
// directly opposite n+1 (19 pockets away), and 0 sits opposite 00.
{
  const pos = new Map(A.seq.map((n, i) => [n, i]));
  let all = true;
  for (let n = 1; n <= 35; n += 2) {
    const d = Math.abs(pos.get(String(n)) - pos.get(String(n + 1)));
    if (Math.min(d, 38 - d) !== 19) all = false;
  }
  ok(all, "American: every odd n is directly opposite n+1");
  const dz = Math.abs(pos.get("0") - pos.get("00"));
  ok(Math.min(dz, 38 - dz) === 19, "American: 0 directly opposite 00");
}

ok([...A.seq, ...E.seq].filter((n) => colorOf(n) === "red").length === 36, "18 red pockets per wheel");
ok(RED.size === 18, "Red set has 18 numbers");

for (const [key, W] of Object.entries(WHEELS)) {
  const covered = new Set();
  W.quadrants.forEach((q) => {
    for (let i = q.start; i <= q.end; i++) covered.add(i);
  });
  ok(covered.size === W.seq.length, `${key}: quadrants partition all pockets exactly once`);
  const sizes = W.quadrants.map((q) => q.end - q.start + 1).join("/");
  ok(
    (key === "american" && sizes === "9/10/9/10") || (key === "european" && sizes === "10/9/9/9"),
    `${key}: quadrant sizes ${sizes} (documented asymmetry)`
  );
}

// French call bets must partition the single-zero wheel 17 / 12 / 8 and each
// must be a contiguous arc on the wheel.
{
  const all = [...CALL_BETS_EU.voisins, ...CALL_BETS_EU.tiers, ...CALL_BETS_EU.orphelins];
  ok(new Set(all).size === 37 && all.length === 37, "EU call bets partition all 37 pockets");
  ok(CALL_BETS_EU.voisins.length === 17 && CALL_BETS_EU.tiers.length === 12 && CALL_BETS_EU.orphelins.length === 8, "Call bet sizes 17 / 12 / 8");
  const idxs = CALL_BETS_EU.voisins.map((n) => E.seq.indexOf(n)).sort((a, b) => a - b);
  // voisins wraps through zero: indices 28..36 and 0..7
  ok(idxs.join(",") === "0,1,2,3,4,5,6,7,28,29,30,31,32,33,34,35,36", "Voisins du zéro is the contiguous arc through 0");
  const tiersIdx = CALL_BETS_EU.tiers.map((n) => E.seq.indexOf(n)).sort((a, b) => a - b);
  ok(tiersIdx[0] === 11 && tiersIdx[11] === 22 && new Set(tiersIdx).size === 12, "Tiers du cylindre is the contiguous arc opposite 0");
}

// --- Part 2: Monte-Carlo house edges ----------------------------------------

console.log("\n[2/3] Monte-Carlo house edges (deterministic seed, realized vs theory, % of stake)");

function edgeOf(wheelKey, bets, opts, N, seed) {
  const rand = asIntRand(mulberry32(seed));
  let staked = 0;
  let returned = 0;
  for (let i = 0; i < N; i++) {
    const out = spin(wheelKey, rand);
    const r = resolve(bets, out, opts);
    staked += r.staked;
    returned += r.returned;
  }
  return (100 * (returned - staked)) / staked;
}

const cases = [
  // label, wheel, bets, opts, theory %, tolerance (abs pts), N, seed
  ["straight 17            (00 wheel)", "american", { "s:17": 1 }, {}, -5.263, 1.2, 1_500_000, 11],
  ["quadrant Q1 (9 pkts)   (00 wheel)", "american", { "q:0": 1 }, {}, -5.263, 0.6, 800_000, 12],
  ["quadrant Q2 (10 pkts)  (00 wheel)", "american", { "q:1": 1 }, {}, -5.263, 0.6, 800_000, 13],
  ["red, half-back ON      (00 wheel)", "american", { "e:red": 1 }, { halfBack: true }, -2.632, 0.4, 800_000, 14],
  ["red, half-back OFF     (00 wheel)", "american", { "e:red": 1 }, { halfBack: false }, -5.263, 0.4, 800_000, 15],
  ["dozen 1                (00 wheel)", "american", { "d:1": 1 }, {}, -5.263, 0.5, 800_000, 16],
  ["column 2               (00 wheel)", "american", { "c:2": 1 }, {}, -5.263, 0.5, 800_000, 17],
  ["basket 0-00-1-2-3      (00 wheel)", "american", { "b:basket": 1 }, {}, -7.895, 0.7, 800_000, 18],
  ["straight 17             (0 wheel)", "european", { "s:17": 1 }, {}, -2.703, 1.2, 1_500_000, 19],
  ["quadrant Q1 (10 pkts)   (0 wheel)", "european", { "q:0": 1 }, {}, -2.703, 0.6, 800_000, 20],
  ["red, la partage ON      (0 wheel)", "european", { "e:red": 1 }, { halfBack: true }, -1.351, 0.4, 800_000, 21],
];

for (const [label, wheelKey, bets, opts, theory, tol, N, seed] of cases) {
  const realized = edgeOf(wheelKey, bets, opts, N, seed);
  ok(near(realized, theory, tol), label, `realized ${realized.toFixed(3)}% vs theory ${theory.toFixed(3)}% (tol ±${tol})`);
}

// --- Part 3: the gambler's-fallacy null --------------------------------------

console.log("\n[3/3] Gambler's-fallacy null (cold-quadrant vs fixed vs random, same spins)");

for (const wheelKey of ["american", "european"]) {
  const r = simulateStrategies(wheelKey, 600_000, asIntRand(mulberry32(42)));
  const tol = 0.8;
  ok(near(r.cold, r.theory, tol), `${wheelKey}: COLD-quadrant return ≈ house edge`, `${r.cold.toFixed(3)}% vs ${r.theory.toFixed(3)}%`);
  ok(near(r.fixed, r.theory, tol), `${wheelKey}: FIXED-quadrant return ≈ house edge`, `${r.fixed.toFixed(3)}%`);
  ok(near(r.random, r.theory, tol), `${wheelKey}: RANDOM-quadrant return ≈ house edge`, `${r.random.toFixed(3)}%`);
  ok(Math.abs(r.cold - r.fixed) < tol, `${wheelKey}: cold vs fixed spread < ${tol} pts`, `Δ ${(r.cold - r.fixed).toFixed(3)}`);
  console.log(`        (longest drought seen in ${r.T.toLocaleString()} spins: ${r.maxDrought}; drought-hit-10 events: ${r.dry10Events.toLocaleString()})`);
}

// --- Part 4: exact expected-value engine (betEV) -----------------------------
//
// betEV is closed-form, so it must match theory to floating point (tol 1e-9),
// a far tighter gate than the Monte-Carlo edges above. We also confirm it agrees
// with the empirical resolve() edge on a mixed bet, tying the analytic EV that
// draws the "expected P&L" line to the same code that pays the table.

console.log("\n[4/5] Exact expected value (betEV closed-form vs theory, tol 1e-9)");

const evCases = [
  // label, wheel, bets, opts, theory %
  ["straight 17          (00 wheel)", "american", { "s:17": 1 }, {}, -100 / 19],
  ["quadrant Q1 (9)      (00 wheel)", "american", { "q:0": 1 }, {}, -100 / 19],
  ["quadrant Q2 (10)     (00 wheel)", "american", { "q:1": 1 }, {}, -100 / 19],
  ["dozen 1              (00 wheel)", "american", { "d:1": 1 }, {}, -100 / 19],
  ["column 2             (00 wheel)", "american", { "c:2": 1 }, {}, -100 / 19],
  ["basket 0-00-1-2-3    (00 wheel)", "american", { "b:basket": 1 }, {}, -300 / 38],
  ["red, half-back ON    (00 wheel)", "american", { "e:red": 1 }, { halfBack: true }, -100 / 38],
  ["red, half-back OFF   (00 wheel)", "american", { "e:red": 1 }, { halfBack: false }, -200 / 38],
  ["straight 17           (0 wheel)", "european", { "s:17": 1 }, {}, -100 / 37],
  ["quadrant Q1 (10)      (0 wheel)", "european", { "q:0": 1 }, {}, -100 / 37],
  ["red, la partage ON    (0 wheel)", "european", { "e:red": 1 }, { halfBack: true }, -50 / 37],
  ["red, la partage OFF   (0 wheel)", "european", { "e:red": 1 }, { halfBack: false }, -100 / 37],
];

for (const [label, wheelKey, bets, opts, theory] of evCases) {
  const { edge } = betEV(bets, wheelKey, opts);
  ok(near(edge, theory, 1e-9), label, `edge ${edge.toFixed(6)}% vs theory ${theory.toFixed(6)}%`);
}

// EV is additive across a mix, and matches the resolve()-based Monte-Carlo edge.
{
  const mix = { "e:red": 3, "s:7": 1, "q:2": 2, "d:3": 1 };
  const opts = { halfBack: true };
  const { ev, staked, edge } = betEV(mix, "american", opts);
  const parts = Object.entries(mix).reduce((s, [k, a]) => s + betEV({ [k]: a }, "american", opts).ev, 0);
  ok(near(ev, parts, 1e-9), "betEV is additive across a mixed bet", `mix ev ${ev.toFixed(6)} vs Σ parts ${parts.toFixed(6)}`);
  ok(near(staked, 7, 1e-9), "betEV stake sums the mix", `staked ${staked}`);
  const mc = edgeOf("american", mix, opts, 1_500_000, 77);
  ok(near(edge, mc, 0.3), "betEV edge matches resolve() Monte-Carlo on the mix", `analytic ${edge.toFixed(4)}% vs MC ${mc.toFixed(4)}%`);
}

// --- Part 5: session P&L analytics (pnlStats) --------------------------------
//
// Deterministic hand-built round stream — every rollup number is checked against
// values computed by hand, including the two equity curves the UI draws.

console.log("\n[5/5] Session P&L analytics (pnlStats on a hand-built stream)");

{
  const recs = [
    { staked: 10, returned: 0, net: -10, ev: -0.5 }, // L
    { staked: 0, returned: 0, net: 0, ev: 0 },       // tracking-only spin
    { staked: 10, returned: 0, net: -10, ev: -0.5 }, // L  (loss streak → 2)
    { staked: 10, returned: 36, net: 26, ev: -0.5 }, // W
    { staked: 10, returned: 0, net: -10, ev: -0.5 }, // L
  ];
  const p = pnlStats(recs);
  ok(p.spins === 5 && p.rounds === 4, "counts spins (5) and betting rounds (4)", `${p.spins}/${p.rounds}`);
  ok(p.staked === 40 && p.returned === 36 && near(p.net, -4, 1e-9), "totals: staked 40, returned 36, net −4", `net ${p.net}`);
  ok(near(p.ev, -2, 1e-9) && near(p.expectedEdge, -5, 1e-9), "expected net −2 → expected edge −5%", `ev ${p.ev}, edge ${p.expectedEdge}%`);
  ok(near(p.realizedEdge, -10, 1e-9), "realized edge −10% (net/staked)", `${p.realizedEdge}%`);
  ok(p.wins === 1 && p.losses === 3 && p.pushes === 0, "1 win / 3 losses / 0 push", `${p.wins}/${p.losses}/${p.pushes}`);
  ok(p.maxWinStreak === 1 && p.maxLossStreak === 2, "streaks: max 1W, 2L", `${p.maxWinStreak}W/${p.maxLossStreak}L`);
  ok(near(p.biggestWin, 26, 1e-9) && near(p.biggestLoss, -10, 1e-9), "biggest win +26, biggest loss −10");
  ok(near(p.maxDrawdown, 20, 1e-9), "max drawdown 20 (peak 0 → trough −20)", `${p.maxDrawdown}`);
  ok(p.curve.join(",") === "-10,-10,-20,6,-4", "realized equity curve matches by hand", p.curve.join(","));
  ok(p.evCurve.map((x) => x.toFixed(1)).join(",") === "-0.5,-0.5,-1.0,-1.5,-2.0", "expected equity curve matches by hand", p.evCurve.join(","));
}

// Empty session is well-defined (no divide-by-zero).
{
  const e = pnlStats([]);
  ok(e.spins === 0 && e.rounds === 0 && e.net === 0 && e.realizedEdge === 0 && e.curve.length === 0, "empty session → all-zero, no NaN");
}

// --- Result -------------------------------------------------------------------

console.log("");
if (failures) {
  console.error(`VERIFY FAILED — ${failures} assertion(s) drifted.`);
  process.exit(1);
} else {
  console.log("VERIFY PASSED — data invariants exact, all edges within tolerance, fallacy null holds.");
}
