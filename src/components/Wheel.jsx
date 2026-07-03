import React from "react";
import { WHEELS, colorOf, quadrantIndexOf } from "../wheels.js";

const C = 300; // center
const R_IN = 176;
const R_OUT = 254;
const R_LBL = 216;
const R_BALL = 190;
const R_QIN = 260;
const R_QOUT = 273;
const R_QLBL = 288;

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

export default function Wheel({ wheelKey, lastIdx, stats }) {
  const wheel = WHEELS[wheelKey];
  const N = wheel.seq.length;
  const step = 360 / N;

  const last = lastIdx != null ? wheel.seq[lastIdx] : null;
  const lastColor = last ? colorOf(last) : null;
  const lastQ = lastIdx != null ? quadrantIndexOf(wheelKey, lastIdx) : -1;

  return (
    <svg viewBox="0 0 600 600" className="wheel" role="img" aria-label={`${wheel.label} wheel, last result ${last ?? "none"}`}>
      {/* quadrant telemetry ring */}
      {wheel.quadrants.map((q, k) => {
        const a0 = q.start * step - step / 2;
        const a1 = (q.end + 1) * step - step / 2;
        const mid = (a0 + a1) / 2;
        const [lx, ly] = polar(R_QLBL, mid);
        const s = stats[k];
        return (
          <g key={q.id}>
            <path d={annular(R_QIN, R_QOUT, a0, a1)} fill={Q_COLORS[k]} opacity="0.92" />
            <text x={lx} y={ly} className={"q-ring-label" + (s.drought >= 10 ? " cold" : "")} textAnchor="middle" dominantBaseline="middle">
              {q.id}·{s.drought}
            </text>
          </g>
        );
      })}

      {/* pockets */}
      {wheel.seq.map((n, i) => {
        const a0 = i * step - step / 2;
        const a1 = a0 + step;
        const isLast = i === lastIdx;
        return (
          <path
            key={n}
            d={annular(R_IN, R_OUT, a0, a1)}
            fill={POCKET_FILL[colorOf(n)]}
            stroke={isLast ? "var(--bone)" : "var(--felt)"}
            strokeWidth={isLast ? 2.5 : 1}
          />
        );
      })}

      {/* pocket labels */}
      {wheel.seq.map((n, i) => {
        const ang = i * step;
        const [x, y] = polar(R_LBL, ang);
        return (
          <text key={"t" + n} x={x} y={y} className="pocket-label" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${ang} ${x} ${y})`}>
            {n}
          </text>
        );
      })}

      {/* quadrant boundary ticks */}
      {wheel.quadrants.map((q) => {
        const a = q.start * step - step / 2;
        const [x0, y0] = polar(R_IN - 6, a);
        const [x1, y1] = polar(R_QOUT + 3, a);
        return <line key={"b" + q.id} x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--felt)" strokeWidth="3" />;
      })}

      {/* ball on last result */}
      {lastIdx != null && (() => {
        const [bx, by] = polar(R_BALL, lastIdx * step);
        return <circle cx={bx} cy={by} r="7" className="ball" />;
      })()}

      {/* hub readout */}
      <circle cx={C} cy={C} r="150" fill="var(--felt-2)" stroke="var(--line)" strokeWidth="1.5" />
      {last ? (
        <>
          <text x={C} y={C - 44} className="hub-caption" textAnchor="middle">
            LAST
          </text>
          <text x={C} y={C + 26} className={"hub-number " + lastColor} textAnchor="middle">
            {last}
          </text>
          <text x={C} y={C + 72} className="hub-quadrant" textAnchor="middle" fill={Q_COLORS[lastQ]}>
            {wheel.quadrants[lastQ].id} · {lastColor.toUpperCase()}
          </text>
        </>
      ) : (
        <>
          <text x={C} y={C - 6} className="hub-caption" textAnchor="middle">
            {wheel.label.toUpperCase()}
          </text>
          <text x={C} y={C + 26} className="hub-idle" textAnchor="middle">
            {N} pockets · spin to begin
          </text>
        </>
      )}
    </svg>
  );
}
