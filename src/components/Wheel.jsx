import React from "react";
import { WHEELS, colorOf, quadrantIndexOf } from "../wheels.js";
import { ChipDefs, PlacedChip } from "./Chip.jsx";

// Geometry — 640 viewBox so the wheel renders larger and the outer betting
// ring fits without clipping. The wheel is a betting surface: pockets take
// straight-up bets, the outer quadrant ring takes sector bets.
const C = 320;
const R_HUB = 148;
const R_BALL = 160; // groove between hub and pockets, where the ball finally seats
const R_TRACK = 248; // outer ball-track radius the ball rides while spinning
const R_IN = 172;
const R_OUT = 278;
const R_LBL = 251;
const R_CHIP = 205;
const R_QIN = 286;
const R_QOUT = 314;
const R_QLBL = 300;

const POCKET_FILL = { red: "var(--pocket-red)", black: "var(--pocket-black)", green: "var(--pocket-green)" };
const Q_COLORS = ["var(--q1)", "var(--q2)", "var(--q3)", "var(--q4)"];

function polar(r, deg) {
  const a = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

function annular(r1, r2, a0, a1) {
  const large = a1 - a0 > 180 ? 1 : 0;
  const [x0, y0] = polar(r2, a0);
  const [x1, y1] = polar(r2, a1);
  const [x2, y2] = polar(r1, a1);
  const [x3, y3] = polar(r1, a0);
  return `M${x0} ${y0} A${r2} ${r2} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${r1} ${r1} 0 ${large} 0 ${x3} ${y3} Z`;
}

function ChipDot({ r, ang, amount }) {
  const [x, y] = polar(r, ang);
  return <PlacedChip cx={x} cy={y} r={13} amount={amount} />;
}

export default function Wheel({ wheelKey, lastIdx, stats, bets = {}, stakes = {}, onBet, spinId = 0, spinning = false, spinWord = "Rolling" }) {
  const wheel = WHEELS[wheelKey];
  const N = wheel.seq.length;
  const step = 360 / N;
  const ballAngle = lastIdx != null ? lastIdx * step : 0;

  const last = lastIdx != null ? wheel.seq[lastIdx] : null;
  const lastColor = last ? colorOf(last) : null;
  const lastQ = lastIdx != null ? quadrantIndexOf(wheelKey, lastIdx) : -1;

  return (
    <svg
      viewBox="0 0 640 640"
      className="wheel"
      aria-label={`${wheel.label} wheel betting surface, last result ${last ?? "none"}. Click a pocket for a straight-up bet, click the outer ring for a quadrant bet.`}
    >
      <defs>
        <ChipDefs />
        <radialGradient id="hubGrad" cx="50%" cy="42%" r="72%">
          <stop offset="0%" stopColor="#1c2f23" />
          <stop offset="70%" stopColor="var(--felt-2)" />
          <stop offset="100%" stopColor="#101c15" />
        </radialGradient>
        <radialGradient id="dishGrad" cx="50%" cy="50%" r="50%">
          <stop offset="78%" stopColor="#0a110d" />
          <stop offset="97%" stopColor="#18271e" />
          <stop offset="100%" stopColor="#0a110d" />
        </radialGradient>
        <filter id="hitGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#f6f1e4" floodOpacity="0.55" />
        </filter>
        <filter id="ballShadow" x="-80%" y="-80%" width="260%" height="260%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#000" floodOpacity="0.6" />
        </filter>
      </defs>

      {/* dish under everything */}
      <circle cx={C} cy={C} r={R_QOUT + 4} fill="url(#dishGrad)" />

      {/* quadrant bet ring — click to place a sector bet */}
      {wheel.quadrants.map((q, k) => {
        const a0 = q.start * step - step / 2;
        const a1 = (q.end + 1) * step - step / 2;
        const s = stats[k];
        const amt = bets["q:" + k];
        return (
          <g key={q.id} className="qring-seg" onClick={(e) => onBet && onBet("q:" + k, e)}>
            <title>{`${q.id} sector bet — ${s.m} pockets · ${(100 * s.p).toFixed(2)}% · ${s.drought} spins dry${amt ? ` · $${amt} riding` : ""}`}</title>
            <path d={annular(R_QIN, R_QOUT, a0 + 0.4, a1 - 0.4)} fill={Q_COLORS[k]} className="qring-arc" />
          </g>
        );
      })}

      {/* pockets — chip shows the allocated stake landing on this pocket from
          ALL number bets (a $10 split shows $5 here and $5 on its partner) */}
      {wheel.seq.map((n, i) => {
        // don't mark the winning pocket until the ball has landed — otherwise it
        // telegraphs the result before the drop
        const settled = i === lastIdx && !spinning;
        const a0 = i * step - step / 2;
        const ang = i * step;
        const amt = stakes[n] || 0;
        const [lx, ly] = polar(R_LBL, ang);
        return (
          <g key={n} className="pocket" onClick={(e) => onBet && onBet("s:" + n, e)}>
            <title>{`${n} ${colorOf(n)} — straight up pays 35:1${amt ? ` · $${amt} on this pocket` : ""}`}</title>
            <path
              d={annular(R_IN, R_OUT, a0, a0 + step)}
              fill={POCKET_FILL[colorOf(n)]}
              stroke={settled ? "var(--bone)" : "#0b1310"}
              strokeWidth={settled ? 2.5 : 1}
              filter={settled ? "url(#hitGlow)" : undefined}
            />
            <text x={lx} y={ly} className="pocket-label" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${ang} ${lx} ${ly})`}>
              {n}
            </text>
            {amt ? <ChipDot r={R_CHIP} ang={ang} amount={amt} /> : null}
          </g>
        );
      })}

      {/* quadrant boundary ticks */}
      {wheel.quadrants.map((q) => {
        const a = q.start * step - step / 2;
        const [x0, y0] = polar(R_IN - 8, a);
        const [x1, y1] = polar(R_QOUT + 2, a);
        return <line key={"b" + q.id} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#0b1310" strokeWidth="3.5" />;
      })}

      {/* ring labels — drawn after pockets so nothing overpaints them; rotated
          tangentially like the pocket numbers, flipped upright on the bottom half */}
      {wheel.quadrants.map((q, k) => {
        const a0 = q.start * step - step / 2;
        const a1 = (q.end + 1) * step - step / 2;
        const mid = (a0 + a1) / 2;
        const norm = ((mid % 360) + 360) % 360;
        const rot = norm > 90 && norm < 270 ? mid + 180 : mid;
        const [lx, ly] = polar(R_QLBL, mid);
        const s = stats[k];
        const amt = bets["q:" + k];
        return (
          <text
            key={"ql" + q.id}
            x={lx}
            y={ly}
            className={"q-ring-label" + (s.drought >= 10 ? " cold" : "")}
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(${rot} ${lx} ${ly})`}
          >
            {q.id}·{s.drought}
            {amt ? <tspan className="q-ring-bet">{`  $${amt}`}</tspan> : null}
          </text>
        );
      })}

      {/* ball — an OUTER group orbits it around the wheel (decelerating), an
          INNER group drops it radially from the ball-track into the pocket with
          a couple of taps. Keyed on spinId so each spin restarts the sequence.
          The orbit/drop animation only runs WHILE `spinning`; once the ball has
          landed the same inline transforms hold it seated in the pocket, so
          re-opening the wheel later just shows it resting — it never re-spins. */}
      {lastIdx != null && (
        <g
          key={spinId}
          className={"ball-orbit" + (spinning ? " spinning" : "")}
          style={{ "--land": `${ballAngle}deg`, transform: `rotate(${ballAngle}deg)`, transformBox: "view-box", transformOrigin: `${C}px ${C}px` }}
        >
          <g
            className={"ball-drop" + (spinning ? " spinning" : "")}
            style={{ "--r-seat": `${-R_BALL}px`, "--r-track": `${-R_TRACK}px`, transform: `translateY(${-R_BALL}px)` }}
          >
            <circle cx={C} cy={C} r="7.5" className="ball" filter="url(#ballShadow)" />
          </g>
        </g>
      )}

      {/* winning-pocket highlight — mounts only once the ball has seated
          (spinning → false), so it flashes exactly when the result is revealed,
          never before the ball lands. */}
      {lastIdx != null && !spinning && (
        <path
          key={"hl" + spinId}
          className="pocket-highlight"
          d={annular(R_IN - 1, R_OUT + 1, lastIdx * step - step / 2, lastIdx * step + step / 2)}
          fill="none"
          stroke="var(--gold)"
          strokeWidth="3.5"
          pointerEvents="none"
        />
      )}

      {/* hub readout */}
      <circle cx={C} cy={C} r={R_HUB} fill="url(#hubGrad)" stroke="var(--line)" strokeWidth="1.5" />
      <circle cx={C} cy={C} r={R_HUB - 10} fill="none" stroke="var(--line)" strokeWidth="0.75" opacity="0.6" />
      {last && !spinning ? (
        <>
          <text x={C} y={C - 46} className="hub-caption" textAnchor="middle">
            LAST
          </text>
          <text key={spinId} x={C} y={C + 26} className={"hub-number pop " + lastColor} textAnchor="middle">
            {last}
          </text>
          <text x={C} y={C + 74} className="hub-quadrant" textAnchor="middle" fill={Q_COLORS[lastQ]}>
            {wheel.quadrants[lastQ].id} · {lastColor.toUpperCase()}
          </text>
        </>
      ) : spinning ? (
        <>
          <text x={C} y={C - 4} className="hub-spin" textAnchor="middle">
            {spinWord}
            <tspan className="hub-spin-dots">…</tspan>
          </text>
          <text x={C} y={C + 30} className="hub-spin-sub" textAnchor="middle">
            rien ne va plus · no more bets
          </text>
        </>
      ) : (
        <>
          <text x={C} y={C - 8} className="hub-caption" textAnchor="middle">
            {wheel.label.toUpperCase()}
          </text>
          <text x={C} y={C + 22} className="hub-idle" textAnchor="middle">
            {N} pockets · spin to begin
          </text>
          <text x={C} y={C + 44} className="hub-idle" textAnchor="middle">
            tap pockets &amp; ring to bet
          </text>
        </>
      )}
    </svg>
  );
}
