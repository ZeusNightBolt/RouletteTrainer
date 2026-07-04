// ---------------------------------------------------------------------------
// Pure engine. No DOM, no React — importable by both the UI and test/verify.js.
//
// Honesty constraints (enforced by test/verify.js):
//   1. Every spin is uniform over all pockets. Nothing conditions on history.
//   2. Payouts are real Atlantic City payouts; realized edges are asserted
//      against theory by Monte Carlo in CI.
//   3. The "cold quadrant" strategy is asserted to have the SAME expected
//      return as fixed or random quadrant betting — the gambler's fallacy
//      null holds by construction and is verified empirically.
// ---------------------------------------------------------------------------

import { WHEELS, RED, colorOf, quadrantIndexOf } from "./wheels.js";

// --- RNG ------------------------------------------------------------------

// Buffered crypto RNG with rejection sampling (removes modulo bias — the raw
// bias for n=38 is ~1.4e-9, negligible, but rejection makes it exactly zero).
// Used by the live app.
export function makeCryptoRng() {
  const buf = new Uint32Array(1024);
  let i = buf.length;
  return function rand(n) {
    const lim = Math.floor(4294967296 / n) * n;
    for (;;) {
      if (i >= buf.length) {
        globalThis.crypto.getRandomValues(buf);
        i = 0;
      }
      const v = buf[i++];
      if (v < lim) return v % n;
    }
  };
}

// Deterministic PRNG (mulberry32) — ONLY for reproducible simulations and the
// CI verification gate. Never used for the live table.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const asIntRand = (f) => (n) => Math.floor(f() * n);

// --- Spin -------------------------------------------------------------------

export function spin(wheelKey, rand) {
  const seq = WHEELS[wheelKey].seq;
  const idx = rand(seq.length);
  const n = seq[idx];
  return { wheelKey, idx, n, color: colorOf(n), q: quadrantIndexOf(wheelKey, idx) };
}

// --- Bet resolution ---------------------------------------------------------
//
// bets: plain object { key: amount }. Keys:
//   "s:<num>"                       straight up, pays 35:1 (returned = 36x)
//   "e:red|black|odd|even|low|high" even money, pays 1:1 (returned = 2x)
//   "d:1|2|3"                       dozen,  pays 2:1 (returned = 3x)
//   "c:1|2|3"                       column, pays 2:1 (returned = 3x)
//   "b:basket"                      0-00-1-2-3, american only, pays 6:1 (7x)
//   "q:0..3"                        quadrant: stake split EQUALLY straight-up
//                                   across the arc's m pockets. A hit returns
//                                   (amount/m)*36 — i.e. net +3.0x on a
//                                   9-pocket arc, +2.6x on a 10-pocket arc.
//
// opts.halfBack: Atlantic City rule — even-money bets lose only HALF when the
// ball lands on 0 or 00 (la partage on single-zero wheels). Cuts the
// even-money edge from 5.26% to 2.63% (2.70% → 1.35% on single zero).

export function resolve(bets, outcome, opts = {}) {
  const { halfBack = true } = opts;
  const wheel = WHEELS[outcome.wheelKey];
  const isZero = wheel.zeroPockets.includes(outcome.n);
  const v = isZero ? null : Number(outcome.n);
  let staked = 0;
  let returned = 0;
  const lines = [];

  for (const [key, amount] of Object.entries(bets)) {
    if (!amount) continue;
    staked += amount;
    const t = key[0];
    const sel = key.slice(2);
    let ret = 0;

    if (t === "s") {
      if (sel === outcome.n) ret = amount * 36;
    } else if (t === "q") {
      const q = wheel.quadrants[Number(sel)];
      const m = q.end - q.start + 1;
      if (outcome.idx >= q.start && outcome.idx <= q.end) ret = (amount / m) * 36;
    } else if (t === "d") {
      if (!isZero && Math.ceil(v / 12) === Number(sel)) ret = amount * 3;
    } else if (t === "c") {
      if (!isZero && ((v - 1) % 3) + 1 === Number(sel)) ret = amount * 3;
    } else if (t === "b") {
      // Basket is only offered on the american layout (Board enforces this).
      if (isZero || v <= 3) ret = amount * 7;
    } else if (t === "e") {
      if (isZero) {
        if (halfBack) ret = amount / 2;
      } else {
        const win =
          sel === "red"   ? RED.has(v)
        : sel === "black" ? !RED.has(v)
        : sel === "odd"   ? v % 2 === 1
        : sel === "even"  ? v % 2 === 0
        : sel === "low"   ? v <= 18
        :                   v >= 19;
        if (win) ret = amount * 2;
      }
    }

    returned += ret;
    lines.push({ key, amount, returned: ret });
  }

  return { staked, returned, net: returned - staked, lines };
}

// --- Exact expected value ------------------------------------------------------
//
// Closed-form EV of a bet mix for ONE spin — no simulation. Because every bet's
// win probability and payout are known exactly, the expected net is exact to
// floating point (test/verify.js asserts each bet type against theory with a
// 1e-9 tolerance, far tighter than the Monte-Carlo edge tests). The live app
// uses this to draw the "expected P&L" reference line the realized bankroll
// wanders around: the whole point is that the wander is noise, not signal.
//
// Every straight/quadrant/dozen/column bet returns 36 units per staked unit on a
// win, so all of them price to the flat wheel edge (36/N − 1). Even-money bets
// carry the half-back/la-partage refund on zeros; the basket is its own arc.
export function betEV(bets, wheelKey, opts = {}) {
  const { halfBack = true } = opts;
  const wheel = WHEELS[wheelKey];
  const N = wheel.seq.length;
  const zeros = wheel.zeroPockets.length;
  let staked = 0;
  let ev = 0; // expected net = expected returned − staked

  for (const [key, amount] of Object.entries(bets)) {
    if (!amount) continue;
    staked += amount;
    const t = key[0];
    const sel = key.slice(2);
    let expReturned = 0;

    if (t === "s") {
      expReturned = (1 / N) * amount * 36;
    } else if (t === "q") {
      const q = wheel.quadrants[Number(sel)];
      const m = q.end - q.start + 1;
      expReturned = (m / N) * ((amount / m) * 36); // = amount * 36 / N
    } else if (t === "d" || t === "c") {
      expReturned = (12 / N) * amount * 3;
    } else if (t === "b") {
      expReturned = (5 / N) * amount * 7; // 0-00-1-2-3, american only
    } else if (t === "e") {
      // every even-money selection covers exactly 18 numbers
      expReturned = (18 / N) * amount * 2 + (halfBack ? (zeros / N) * (amount / 2) : 0);
    }
    ev += expReturned - amount;
  }

  return { staked, ev, edge: staked ? (100 * ev) / staked : 0 };
}

// --- Session statistics -------------------------------------------------------

// history: array of { n, idx, q, color } in spin order.
export function quadrantStats(wheelKey, history) {
  const wheel = WHEELS[wheelKey];
  const N = history.length;
  return wheel.quadrants.map((q, k) => {
    const m = q.end - q.start + 1;
    const p = m / wheel.seq.length;
    let hits = 0;
    let last = -1;
    let maxDrought = 0;
    let cur = 0;
    for (let i = 0; i < N; i++) {
      if (history[i].q === k) {
        hits++;
        last = i;
        if (cur > maxDrought) maxDrought = cur;
        cur = 0;
      } else {
        cur++;
      }
    }
    if (cur > maxDrought) maxDrought = cur;
    const drought = last < 0 ? N : N - 1 - last;
    return {
      id: q.id,
      k,
      m,
      p,
      hits,
      expected: N * p,
      share: N ? hits / N : 0,
      drought,
      maxDrought,
      // P(a SPECIFIC quadrant misses 10 straight spins) — descriptive context
      // for the drought counter. It says nothing about the NEXT spin.
      pDry10: Math.pow(1 - p, 10),
    };
  });
}

// Color telemetry — same descriptive-only contract as quadrantStats. Exactly
// 18 red and 18 black pockets on both wheels; green is the zero arc (2/38 or
// 1/37). Droughts and streaks are scoreboards: P(color) is identical on every
// spin no matter what the strip shows.
export function colorStats(wheelKey, history) {
  const wheel = WHEELS[wheelKey];
  const T = wheel.seq.length;
  const N = history.length;
  const defs = [
    { id: "red", p: 18 / T },
    { id: "black", p: 18 / T },
    { id: "green", p: wheel.zeroPockets.length / T },
  ];
  const out = defs.map((d) => {
    let hits = 0;
    let last = -1;
    for (let i = 0; i < N; i++) {
      if (history[i].color === d.id) {
        hits++;
        last = i;
      }
    }
    return {
      id: d.id,
      p: d.p,
      hits,
      expected: N * d.p,
      share: N ? hits / N : 0,
      drought: last < 0 ? N : N - 1 - last,
    };
  });

  // current run of the most recent color
  let streak = null;
  if (N) {
    const c = history[N - 1].color;
    let len = 0;
    for (let i = N - 1; i >= 0 && history[i].color === c; i--) len++;
    streak = { color: c, len };
  }
  return { colors: out, streak };
}

// Pearson chi-square against the fair-wheel expectation (unequal p_i because
// the quadrant split is 9/10/9/10 or 10/9/9/9). df = 3.
// Critical values: 7.815 (alpha 0.05), 11.345 (alpha 0.01).
export function chiSquare(stats) {
  return stats.reduce((s, q) => (q.expected > 0 ? s + (q.hits - q.expected) ** 2 / q.expected : s), 0);
}

export const CHI2_CRIT_95 = 7.815;
export const CHI2_CRIT_99 = 11.345;

// --- Gambler's-fallacy simulator ----------------------------------------------
//
// Three strategies, resolved on the SAME spins each iteration, each betting one
// unit split straight-up across a chosen quadrant:
//   cold   — the quadrant with the longest current drought (the user's hypothesis)
//   fixed  — always Q1
//   random — a uniformly random quadrant
// If droughts carried information, "cold" would beat "fixed". It does not, and
// test/verify.js asserts the three converge to the same house edge.

export function simulateStrategies(wheelKey, T, rand) {
  const wheel = WHEELS[wheelKey];
  const N = wheel.seq.length;
  const qs = wheel.quadrants;
  const sizes = qs.map((q) => q.end - q.start + 1);
  const qOfIdx = new Int8Array(N);
  qs.forEach((q, k) => {
    for (let i = q.start; i <= q.end; i++) qOfIdx[i] = k;
  });

  const last = [-1, -1, -1, -1];
  const net = { cold: 0, fixed: 0, random: 0 };
  let maxDrought = 0;
  let dry10Events = 0; // count of spins on which some quadrant's drought hit exactly 10

  for (let t = 0; t < T; t++) {
    // choose strategies BEFORE observing the spin
    let cold = 0;
    let best = -1;
    for (let k = 0; k < 4; k++) {
      const d = last[k] < 0 ? t : t - 1 - last[k];
      if (d > best) {
        best = d;
        cold = k;
      }
      if (d === 10) dry10Events++;
    }
    if (best > maxDrought) maxDrought = best;
    const rq = rand(4);

    const idx = rand(N);
    const hitQ = qOfIdx[idx];

    net.cold   += (hitQ === cold ? 36 / sizes[cold] : 0) - 1;
    net.fixed  += (hitQ === 0    ? 36 / sizes[0]    : 0) - 1;
    net.random += (hitQ === rq   ? 36 / sizes[rq]   : 0) - 1;

    last[hitQ] = t;
  }

  const pct = (x) => (100 * x) / T;
  return {
    T,
    maxDrought,
    dry10Events,
    cold: pct(net.cold),
    fixed: pct(net.fixed),
    random: pct(net.random),
    theory: -100 * (wheelKey === "american" ? 2 / 38 : 1 / 37),
  };
}

// --- Session P&L analytics -----------------------------------------------------
//
// Rolls the per-spin record stream into the numbers the Session Analytics card
// shows. Pure and history-blind by construction — it only summarises spins that
// already happened; nothing here feeds back into a spin. The teaching payload:
//   - `curve`   cumulative realized net after each spin (the bankroll grind)
//   - `evCurve` cumulative EXPECTED net (a straight line sloping down at the
//               house edge). The realized line wandering around this straight
//               line is the entire lesson — the wander is variance, not signal.
//   - realizedEdge vs expectedEdge: on a short session these diverge wildly;
//     the gap is the casino's marketing budget, and it shrinks with volume.
//
// records: array of { staked, returned, net, ev } in spin order. Spins placed
// with no bets contribute a flat (0,0,0,0) segment so the curve tracks spin count.
export function pnlStats(records) {
  let staked = 0;
  let returned = 0;
  let ev = 0;
  let rounds = 0; // spins that actually had money on the felt
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let curWin = 0;
  let curLoss = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let biggestWin = 0;
  let biggestLoss = 0;

  let cum = 0;
  let cumEv = 0;
  let peak = 0;
  let maxDrawdown = 0;
  const curve = [];
  const evCurve = [];

  for (const r of records) {
    cum += r.net;
    cumEv += r.ev;
    curve.push(cum);
    evCurve.push(cumEv);
    if (cum > peak) peak = cum;
    const dd = peak - cum;
    if (dd > maxDrawdown) maxDrawdown = dd;

    if (r.staked > 0) {
      rounds++;
      staked += r.staked;
      returned += r.returned;
      ev += r.ev;
      if (r.net > 1e-9) {
        wins++;
        curWin++;
        curLoss = 0;
        if (curWin > maxWinStreak) maxWinStreak = curWin;
        if (r.net > biggestWin) biggestWin = r.net;
      } else if (r.net < -1e-9) {
        losses++;
        curLoss++;
        curWin = 0;
        if (curLoss > maxLossStreak) maxLossStreak = curLoss;
        if (r.net < biggestLoss) biggestLoss = r.net;
      } else {
        pushes++;
        curWin = 0;
        curLoss = 0;
      }
    }
  }

  return {
    spins: records.length,
    rounds,
    staked,
    returned,
    net: returned - staked,
    ev,
    realizedEdge: staked ? (100 * (returned - staked)) / staked : 0,
    expectedEdge: staked ? (100 * ev) / staked : 0,
    wins,
    losses,
    pushes,
    hitRate: rounds ? wins / rounds : 0,
    maxWinStreak,
    maxLossStreak,
    biggestWin,
    biggestLoss,
    maxDrawdown,
    curve,
    evCurve,
  };
}
