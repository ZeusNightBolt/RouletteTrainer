import React, { useMemo } from "react";
import { fmt, signed, pct } from "../ui.js";

// Cumulative-net equity curve. Two series on one frame:
//   realized  — the bankroll grind (solid, gold up / cold down by final sign)
//   expected  — closed-form EV path (dashed): a near-straight downhill line.
// The realized line wandering around the straight expected line IS the lesson.
function EquityCurve({ curve, evCurve }) {
  const W = 460;
  const H = 150;
  const PAD = 8;

  const path = useMemo(() => {
    const n = curve.length;
    if (n < 2) return null;
    // loop, not Math.min(...spread) — spread overflows the arg stack on very long sessions
    let lo = 0;
    let hi = 0;
    for (const arr of [curve, evCurve]) {
      for (const v of arr) {
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    if (hi - lo < 1e-6) {
      lo -= 1;
      hi += 1;
    }
    const x = (i) => PAD + (i / (n - 1)) * (W - 2 * PAD);
    const y = (v) => PAD + (1 - (v - lo) / (hi - lo)) * (H - 2 * PAD);
    const line = (arr) => arr.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
    const area = `${line(curve)} L${x(n - 1).toFixed(1)} ${y(0).toFixed(1)} L${x(0).toFixed(1)} ${y(0).toFixed(1)} Z`;
    return { realized: line(curve), expected: line(evCurve), area, zeroY: y(0), up: curve[n - 1] >= 0 };
  }, [curve, evCurve]);

  if (!path) {
    return (
      <div className="equity-empty">Place a bet and spin — the realized-vs-expected P&amp;L curve builds here.</div>
    );
  }

  const stroke = path.up ? "var(--q4)" : "var(--cold)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="equity" role="img" aria-label="Cumulative profit and loss curve, realized versus expected">
      <line x1={PAD} y1={path.zeroY} x2={W - PAD} y2={path.zeroY} className="equity-zero" />
      <path d={path.area} fill={stroke} opacity="0.08" />
      <path d={path.expected} className="equity-exp" fill="none" />
      <path d={path.realized} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function SessionAnalytics({ pnl, wheelKey }) {
  const { rounds, net, staked, realizedEdge, expectedEdge, hitRate, wins, losses, maxWinStreak, maxLossStreak, maxDrawdown, biggestWin, curve, evCurve } = pnl;

  const flatEdge = wheelKey === "american" ? -5.263 : -2.703;
  const edgeGap = realizedEdge - expectedEdge; // luck this session, in points of stake
  // Rough guide: χ²-style, the realized edge is "trustworthy" to ±1 SE once
  // volume is large. Straight-up variance dominates; ~30 rounds is the point
  // where the ev line starts to bite through the noise for typical mixes.
  const converged = rounds >= 30;

  return (
    <div className="card analytics">
      <div className="card-title">
        Session analytics <em>— realized P&amp;L vs the exact expected line</em>
      </div>

      <EquityCurve curve={curve} evCurve={evCurve} />
      <div className="equity-legend">
        <span className="lg lg-real">realized net</span>
        <span className="lg lg-exp">expected net (house edge)</span>
        <span className="lg lg-zero">break-even</span>
      </div>

      <div className="an-grid">
        <div className={"an-cell wide " + (net >= 0 ? "pos" : "neg")}>
          <span className="an-k">Net P&amp;L</span>
          <span className="an-v">{rounds ? signed(net) : "—"}</span>
          <span className="an-sub">{fmt(staked)} wagered over {rounds.toLocaleString()} rounds</span>
        </div>
        <div className="an-cell">
          <span className="an-k">Realized edge</span>
          <span className="an-v">{rounds ? pct(realizedEdge) : "—"}</span>
          <span className="an-sub">expected {rounds ? pct(expectedEdge) : `${flatEdge.toFixed(2)}%`}</span>
        </div>
        <div className="an-cell">
          <span className="an-k">Luck this session</span>
          <span className={"an-v " + (edgeGap >= 0 ? "pos" : "neg")}>{rounds ? pct(edgeGap) : "—"}</span>
          <span className="an-sub">realized − expected</span>
        </div>
      </div>

      <div className="an-grid four">
        <div className="an-cell sm">
          <span className="an-k">Hit rate</span>
          <span className="an-v">{rounds ? (100 * hitRate).toFixed(1) + "%" : "—"}</span>
          <span className="an-sub">{wins}W · {losses}L</span>
        </div>
        <div className="an-cell sm">
          <span className="an-k">Max drawdown</span>
          <span className="an-v">{rounds ? fmt(maxDrawdown) : "—"}</span>
          <span className="an-sub">peak → trough</span>
        </div>
        <div className="an-cell sm">
          <span className="an-k">Longest streak</span>
          <span className="an-v">{rounds ? `${maxWinStreak}W` : "—"}</span>
          <span className="an-sub">worst {maxLossStreak}L run</span>
        </div>
        <div className="an-cell sm">
          <span className="an-k">Biggest win</span>
          <span className="an-v">{rounds ? signed(biggestWin) : "—"}</span>
          <span className="an-sub">single round</span>
        </div>
      </div>

      <p className="an-verdict">
        {rounds === 0 ? (
          <>The expected line is fixed the instant you place a bet — every wager here prices at the house edge (−{Math.abs(flatEdge).toFixed(2)}% flat, −{wheelKey === "american" ? "2.63" : "1.35"}% even-money with the zero refund). Play and watch realized P&amp;L wander around it.</>
        ) : converged ? (
          <>At {rounds.toLocaleString()} rounds the realized edge is closing on the expected <b>{pct(expectedEdge)}</b>. The gap is <b>{pct(edgeGap)}</b> of variance — it shrinks toward zero the longer you play, never the house edge itself.</>
        ) : (
          <>Only {rounds} round{rounds === 1 ? "" : "s"} in: realized edge (<b>{pct(realizedEdge)}</b>) is still mostly noise around the expected <b>{pct(expectedEdge)}</b>. Short sessions swing wildly in both directions — that variance is what keeps players seated, not an exploitable signal.</>
        )}
      </p>
    </div>
  );
}
