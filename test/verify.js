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
import { spin, resolve, mulberry32, asIntRand, simulateStrategies, betEV, pnlStats, colorStats, parseSequence, pocketStakes, numberStats, recommendBets } from "../src/engine.js";

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
  ["split 1-2  (17:1)      (00 wheel)", "american", { "i:1-2": 1 }, {}, -5.263, 0.7, 1_000_000, 31],
  ["street 1-2-3 (11:1)    (00 wheel)", "american", { "i:1-2-3": 1 }, {}, -5.263, 0.6, 900_000, 32],
  ["corner 1-2-4-5 (8:1)   (00 wheel)", "american", { "i:1-2-4-5": 1 }, {}, -5.263, 0.6, 900_000, 33],
  ["six-line 1..6 (5:1)    (00 wheel)", "american", { "i:1-2-3-4-5-6": 1 }, {}, -5.263, 0.5, 900_000, 34],
  ["split 0-00  (17:1)     (00 wheel)", "american", { "i:0-00": 1 }, {}, -5.263, 0.7, 1_000_000, 99],
  ["trio 00-2-3 (11:1)     (00 wheel)", "american", { "i:2-3-00": 1 }, {}, -5.263, 0.6, 900_000, 42],
  ["split 1-2  (17:1)       (0 wheel)", "european", { "i:1-2": 1 }, {}, -2.703, 0.7, 1_000_000, 35],
  ["corner 1-2-4-5 (8:1)    (0 wheel)", "european", { "i:1-2-4-5": 1 }, {}, -2.703, 0.6, 900_000, 36],
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
  ["split 1-2            (00 wheel)", "american", { "i:1-2": 1 }, {}, -100 / 19],
  ["street 1-2-3         (00 wheel)", "american", { "i:1-2-3": 1 }, {}, -100 / 19],
  ["corner 1-2-4-5       (00 wheel)", "american", { "i:1-2-4-5": 1 }, {}, -100 / 19],
  ["six-line 1..6        (00 wheel)", "american", { "i:1-2-3-4-5-6": 1 }, {}, -100 / 19],
  ["split 0-00           (00 wheel)", "american", { "i:0-00": 1 }, {}, -100 / 19],
  ["trio 00-2-3          (00 wheel)", "american", { "i:2-3-00": 1 }, {}, -100 / 19],
  ["split 1-2             (0 wheel)", "european", { "i:1-2": 1 }, {}, -100 / 37],
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

// Inside-bet resolution pays the exact ratio on the covered numbers only.
{
  const split = { "i:1-2": 10 };
  ok(resolve(split, { wheelKey: "american", n: "1" }).returned === 180, "split 1-2 pays 18× when 1 hits (17:1)");
  ok(resolve(split, { wheelKey: "american", n: "2" }).returned === 180, "split 1-2 pays 18× when 2 hits");
  ok(resolve(split, { wheelKey: "american", n: "3" }).returned === 0, "split 1-2 loses when 3 hits");
  ok(resolve({ "i:1-2-4-5": 8 }, { wheelKey: "american", n: "5" }).returned === 72, "corner 1-2-4-5 pays 9× when 5 hits (8:1)");
  ok(resolve({ "i:1-2-3-4-5-6": 12 }, { wheelKey: "american", n: "6" }).returned === 72, "six-line 1..6 pays 6× when 6 hits (5:1)");
  ok(resolve({ "i:1-2": 10 }, { wheelKey: "american", n: "0" }).returned === 0, "inside bet loses on 0");
  // zero-covering inside bets now resolve (the 0-00 split + trios)
  ok(resolve({ "i:0-00": 10 }, { wheelKey: "american", n: "0" }).returned === 180, "split 0-00 pays 18× when 0 hits (17:1)");
  ok(resolve({ "i:0-00": 10 }, { wheelKey: "american", n: "00" }).returned === 180, "split 0-00 pays 18× when 00 hits");
  ok(resolve({ "i:0-00": 10 }, { wheelKey: "american", n: "7" }).returned === 0, "split 0-00 loses on a numbered pocket");
  ok(resolve({ "i:2-3-00": 12 }, { wheelKey: "american", n: "00" }).returned === 144, "trio 00-2-3 pays 12× when 00 hits (11:1)");
  ok(resolve({ "i:2-3-00": 12 }, { wheelKey: "american", n: "2" }).returned === 144, "trio 00-2-3 pays 12× when 2 hits");
  // per-pocket split conservation includes the zeros
  {
    const ps = pocketStakes({ "i:0-00": 10 }, "american");
    ok(ps.stakes["0"] === 5 && ps.stakes["00"] === 5 && Math.abs(ps.total - 10) < 1e-9, "pocketStakes splits a 0-00 bet $5/$5 across the two zeros");
  }
}

// Per-pocket stake distribution — the "split amount" shown on the wheel. Real
// math: a chip on k numbers puts amount/k on each of those pockets.
{
  const bets = { "s:17": 10, "i:1-2": 10, "i:1-2-4-5": 8, "b:basket": 5 };
  const { stakes, total } = pocketStakes(bets, "american");
  // 1: 10/2 + 8/4 + 5/5 = 5 + 2 + 1 = 8 ; 2 same = 8 ; 4,5: 8/4=2 ; 17: 10
  ok(near(stakes["17"], 10, 1e-9), "pocketStakes: straight 17 → full 10 on pocket 17");
  ok(near(stakes["1"], 8, 1e-9) && near(stakes["2"], 8, 1e-9), "pocketStakes: pocket 1 & 2 = 5(split)+2(corner)+1(basket) = 8", `${stakes["1"]}/${stakes["2"]}`);
  ok(near(stakes["4"], 2, 1e-9) && near(stakes["5"], 2, 1e-9), "pocketStakes: corner puts 8/4=2 on 4 & 5");
  ok(near(stakes["0"], 1, 1e-9) && near(stakes["00"], 1, 1e-9) && near(stakes["3"], 1, 1e-9), "pocketStakes: basket puts 5/5=1 on 0, 00, 3");
  // total distributed must equal total staked on number bets (conservation)
  ok(near(total, 10 + 10 + 8 + 5, 1e-9), "pocketStakes: total distributed = total number-bet stake (conserved)", `${total}`);
  // outside bets are not pocket-localized
  ok(Object.keys(pocketStakes({ "e:red": 5, "d:1": 5, "q:0": 5 }, "american").stakes).length === 0, "pocketStakes: outside/sector bets excluded");
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

// Color telemetry — descriptive rollup checked by hand, plus the exact color
// probabilities (18 red / 18 black / zero-arc green on both wheels).
{
  const hist = ["red", "red", "black", "green", "red"].map((color) => ({ color }));
  const { colors, streak } = colorStats("american", hist);
  const byId = Object.fromEntries(colors.map((c) => [c.id, c]));
  ok(byId.red.hits === 3 && byId.black.hits === 1 && byId.green.hits === 1, "color hits 3R / 1B / 1G on hand-built history");
  ok(byId.red.drought === 0 && byId.black.drought === 2 && byId.green.drought === 1, "color droughts 0R / 2B / 1G", `${byId.red.drought}/${byId.black.drought}/${byId.green.drought}`);
  ok(streak.color === "red" && streak.len === 1, "current streak RED ×1");
  ok(near(byId.red.expected, 5 * 18 / 38, 1e-9) && near(byId.green.expected, 5 * 2 / 38, 1e-9), "color expectations use exact 18/38 and 2/38");
  for (const wk of ["american", "european"]) {
    const { colors: c } = colorStats(wk, []);
    ok(near(c.reduce((s, x) => s + x.p, 0), 1, 1e-9), `${wk}: color probabilities sum to 1`);
    ok(c.every((x) => x.hits === 0 && x.drought === 0 && x.share === 0), `${wk}: empty history → zeroed color stats`);
  }
}

// Number telemetry (Atlantic City results board) — per-pocket hits/drought and
// the tote-board tallies, all checked by hand on a known sequence.
{
  const { history } = parseSequence("american", "7 7 2 0 32 7");
  const s = numberStats("american", history);
  ok(s.total === 6, "numberStats: total 6");
  ok(s.red === 4 && s.black === 1 && s.green === 1, "numberStats: 4 red / 1 black / 1 green", `${s.red}/${s.black}/${s.green}`);
  ok(s.odd === 3 && s.even === 2, "numberStats: 3 odd / 2 even (zeros excluded)", `${s.odd}/${s.even}`);
  ok(s.low === 4 && s.high === 1, "numberStats: 4 low / 1 high", `${s.low}/${s.high}`);
  ok(s.dozens.join(",") === "4,0,1", "numberStats: dozens [4,0,1]", s.dozens.join(","));
  ok(s.columns.join(",") === "3,2,0", "numberStats: columns [3,2,0]", s.columns.join(","));
  const by = Object.fromEntries(s.perNumber.map((x) => [x.n, x]));
  ok(by["7"].hits === 3 && by["7"].drought === 0, "numberStats: 7 hit 3× and is current (drought 0)");
  ok(by["2"].drought === 3, "numberStats: 2's drought is 3", `${by["2"].drought}`);
  ok(by["1"].hits === 0 && by["1"].drought === 6, "numberStats: an unhit number has drought = spin count");
  ok(s.hot[0].n === "7" && s.hot[0].hits === 3, "numberStats: hottest number is 7 (3 hits)");
  ok(s.cold[0].drought === 6, "numberStats: coldest number has never hit (drought 6)");
  ok(s.perNumber.length === 38, "numberStats: covers all 38 american pockets");
  const empty = numberStats("european", []);
  ok(empty.total === 0 && empty.hot.length === 0 && empty.perNumber.every((x) => x.hits === 0), "numberStats: empty history → zeroed, no hot list, no throw");
}

// Manual sequence parser — the Analyze tab feeds pasted numbers through this and
// then through the SAME quadrantStats/colorStats/chiSquare as the live table.
{
  // american: mixes commas/spaces/newlines, a leading-zero token, both zeros,
  // and two junk tokens that must be flagged, not dropped.
  const { history, invalid, count, total } = parseSequence("american", "0, 00, 07,14\n32 99 red");
  ok(count === 5 && total === 7, "parseSequence: 5 valid of 7 tokens", `${count}/${total}`);
  ok(invalid.join(",") === "99,red", "parseSequence: flags junk tokens (99, red)", invalid.join(","));
  ok(history.map((h) => h.n).join(",") === "0,00,7,14,32", "parseSequence: normalizes '07'→'7', keeps '00'", history.map((h) => h.n).join(","));
  ok(history.every((h) => WHEELS.american.seq[h.idx] === h.n), "parseSequence: idx maps back to the pocket");
  // quadrant + color classification agrees with the live helpers
  ok(history[0].q === quadrantIndexOf("american", WHEELS.american.seq.indexOf("0")), "parseSequence: quadrant tag matches quadrantIndexOf");
  ok(history[3].color === colorOf("14"), "parseSequence: color tag matches colorOf");
  // european: "00" is not a pocket, so it must be rejected there
  const eu = parseSequence("european", "00, 0, 36");
  ok(eu.count === 2 && eu.invalid.join(",") === "00", "parseSequence: '00' invalid on the single-zero wheel", `${eu.count} valid, invalid ${eu.invalid.join(",")}`);
  // parsed history is a drop-in for the stats engine
  const cs = colorStats("american", history);
  const byId = Object.fromEntries(cs.colors.map((c) => [c.id, c]));
  ok(byId.green.hits === 2 && byId.red.hits === 3 && byId.black.hits === 0, "parseSequence: feeds colorStats (2G / 3R / 0B)", `${byId.green.hits}G/${byId.red.hits}R/${byId.black.hits}B`);
  ok(parseSequence("american", "   ").count === 0, "parseSequence: whitespace-only → empty, no throw");
}

// Heuristic recommender (Analyze tab) — a descriptive, no-edge pattern reader.
// These assertions pin the mechanical behaviour (which side is "hot"/"cold",
// bet sizing, slip totals); they make no claim that the picks win, and cannot,
// because the recommender never touches the RNG.
{
  // 12 spins skewed hard red / odd / low, 1 the hottest number, zeros never hit.
  const { history } = parseSequence("american", "1 3 5 7 9 1 3 5 1 2 4 1");
  const r = recommendBets("american", history, { outsideBase: 25, outsideStrong: 50, perNumber: 5 });
  const m = Object.fromEntries(r.momentum.items.map((i) => [i.cat, i]));
  const c = Object.fromEntries(r.reversion.items.map((i) => [i.cat, i]));

  ok(r.n === 12, "recommendBets: sees 12 observations", `${r.n}`);
  ok(m.Colour.label === "RED" && m.Colour.key === "e:red", "recommendBets: momentum rides the leading colour (RED)", m.Colour.label);
  ok(c.Colour.label === "BLACK" && c.Colour.key === "e:black", "recommendBets: reversion backs the trailing colour (BLACK)", c.Colour.label);
  ok(m["Even/Odd"].label === "ODD" && c["Even/Odd"].label === "EVEN", "recommendBets: parity hot=ODD / cold=EVEN");
  ok(m["Low/High"].label === "1–18" && c["Low/High"].label === "19–36", "recommendBets: half hot=1–18 / cold=19–36");
  ok(m.Dozen.label === "1st 12" && m.Dozen.key === "d:1", "recommendBets: hottest dozen is the 1st (all 12 spins there)", m.Dozen.label);
  ok(c.Dozen.label !== "1st 12" && c.Dozen.key !== "d:1", "recommendBets: coldest dozen is not the hot one", c.Dozen.label);
  ok(m.Numbers.numbers[0].n === "1", "recommendBets: hottest number (1, 4 hits) leads the momentum inside list", m.Numbers.numbers[0].n);
  ok(r.k === 5 && m.Numbers.numbers.length === 5 && c.Numbers.numbers.length === 5, "recommendBets: names 5 inside numbers each (5–10 clamp)", `k=${r.k}`);
  ok(c.Numbers.numbers.every((x) => x.meta === "never"), "recommendBets: cold inside numbers are all never-hit");
  ok(new Set(m.Numbers.numbers.map((x) => x.n)).size === 5, "recommendBets: momentum inside numbers are distinct");
  // sizing: strong lean → $50 even-money, dozen at base $25, inside $5/number
  ok(m.Colour.amount === 50 && m["Even/Odd"].amount === 50 && m["Low/High"].amount === 50, "recommendBets: strong even-money leans stake $50");
  ok(m.Dozen.amount === 25, "recommendBets: dozen stakes the outside base $25");
  ok(m.Numbers.numbers.every((x) => x.amount === 5) && m.Numbers.amount === 25, "recommendBets: inside is $5/number (5 → $25)");
  ok(r.momentum.items.filter((i) => i.key.startsWith("e:")).every((i) => i.amount === 25 || i.amount === 50), "recommendBets: every even-money stake is 25 or 50");

  // quadrant lens: hot arc = the most-hit quadrant (Q2, 8 hits here); cold arc =
  // the longest-dry quadrant (Q3, never hit). Sector bet = $5 on each arc pocket.
  ok(r.signals.hotQ === 1 && r.signals.coldQ === 2, "recommendBets: hot arc = Q2 (most hits), cold arc = Q3 (longest dry)", `hot ${r.signals.hotQ} / cold ${r.signals.coldQ}`);
  ok(m.Sector.key === "q:1" && m.Sector.label === "Q2 arc", "recommendBets: momentum leads with the hot Q2 sector", m.Sector.label);
  ok(c.Sector.key === "q:2" && c.Sector.label === "Q3 arc", "recommendBets: reversion leads with the overdue Q3 sector", c.Sector.label);
  ok(m.Sector.amount === 50 && c.Sector.amount === 45, "recommendBets: sector stakes $5 × arc pockets (Q2=10→$50, Q3=9→$45)", `${m.Sector.amount}/${c.Sector.amount}`);
  // reversion inside numbers are drawn from the cold arc + its two border pockets
  const coldZone = new Set(["00", "27", "10", "25", "29", "12", "8", "19", "31", "1", "18"]);
  ok(c.Numbers.numbers.every((x) => coldZone.has(x.n)), "recommendBets: reversion numbers sit in the cold Q3 arc + its edges", c.Numbers.numbers.map((x) => x.n).join(","));
  ok(r.momentum.total === 250 && r.reversion.total === 245, "recommendBets: slip totals = sum of items incl. the sector", `${r.momentum.total}/${r.reversion.total}`);

  // a balanced sample (no lean, no long streak) sizes even-money at the base $25
  const flat = parseSequence("american", "1 2 3 4 1 2 3 4").history;
  const rf = recommendBets("american", flat);
  const mf = Object.fromEntries(rf.momentum.items.map((i) => [i.cat, i]));
  ok(mf.Colour.amount === 25, "recommendBets: a flat 50/50 split stakes the base $25, not $50", `${mf.Colour.amount}`);

  // european (single-zero) path runs without throwing and still totals cleanly
  const reu = recommendBets("european", parseSequence("european", "5 5 5 17 17 32 0 5").history);
  ok(reu.momentum.total === reu.momentum.items.reduce((s, i) => s + i.amount, 0), "recommendBets: european slip total is internally consistent");
}

// --- Result -------------------------------------------------------------------

console.log("");
if (failures) {
  console.error(`VERIFY FAILED — ${failures} assertion(s) drifted.`);
  process.exit(1);
} else {
  console.log("VERIFY PASSED — data invariants exact, all edges within tolerance, fallacy null holds.");
}
