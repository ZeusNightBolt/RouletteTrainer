import React from "react";
import { WHEELS, colorOf } from "../wheels.js";

// Frequency wheel for the Analyze tab: the pasted history laid back onto the
// physical wheel so you can SEE where it clustered. Each pocket is tinted by how
// often it hit (a gold heat overlay ∝ its share of the max), shows its hit
// count, and the four quadrant arcs carry their totals. Purely descriptive — it
// visualises what landed, and says nothing about the next spin.

const C = 320;
const R_HUB = 150;
const R_IN = 172;
const R_OUT = 278;
const R_LBL = 258; // pocket number (outer)
const R_CNT = 208; // hit count (inner)
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

export default function FrequencyWheel({ wheelKey, ns, stats }) {
  const wheel = WHEELS[wheelKey];
  const seqLen = wheel.seq.length;
  const step = 360 / seqLen;
  const N = ns.total;

  const hitOf = Object.fromEntries(ns.perNumber.map((x) => [x.n, x.hits]));
  const maxHits = ns.perNumber.reduce((m, x) => Math.max(m, x.hits), 0) || 1;
  const hottest = ns.hot[0] || null;
  const coldest = ns.cold[0] || null;

  return (
    <svg viewBox="0 0 640 640" className="freqwheel" aria-label={`${wheel.label} frequency wheel over ${N} results`}>
      <defs>
        <radialGradient id="fwHub" cx="50%" cy="42%" r="72%">
          <stop offset="0%" stopColor="#1c2f23" />
          <stop offset="70%" stopColor="var(--felt-2)" />
          <stop offset="100%" stopColor="#101c15" />
        </radialGradient>
        <radialGradient id="fwDish" cx="50%" cy="50%" r="50%">
          <stop offset="78%" stopColor="#0a110d" />
          <stop offset="97%" stopColor="#18271e" />
          <stop offset="100%" stopColor="#0a110d" />
        </radialGradient>
      </defs>

      <circle cx={C} cy={C} r={R_QOUT + 4} fill="url(#fwDish)" />

      {/* quadrant arcs with their hit totals */}
      {wheel.quadrants.map((q, k) => {
        const a0 = q.start * step - step / 2;
        const a1 = (q.end + 1) * step - step / 2;
        const mid = (a0 + a1) / 2;
        const norm = ((mid % 360) + 360) % 360;
        const rot = norm > 90 && norm < 270 ? mid + 180 : mid;
        const [lx, ly] = polar(R_QLBL, mid);
        const s = stats[k];
        return (
          <g key={q.id}>
            <path d={annular(R_QIN, R_QOUT, a0 + 0.4, a1 - 0.4)} fill={Q_COLORS[k]} className="fw-qarc" />
            <text x={lx} y={ly} className="fw-qlabel" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${rot} ${lx} ${ly})`}>
              {q.id}·{s.hits}
            </text>
          </g>
        );
      })}

      {/* pockets — base colour + gold heat overlay ∝ hit share, count in-pocket */}
      {wheel.seq.map((n, i) => {
        const a0 = i * step - step / 2;
        const ang = i * step;
        const hits = hitOf[n] || 0;
        const heat = hits ? 0.18 + 0.62 * (hits / maxHits) : 0;
        const [lx, ly] = polar(R_LBL, ang);
        const [cx, cy] = polar(R_CNT, ang);
        return (
          <g key={n} className="fw-pocket">
            <title>{`${n} ${colorOf(n)} — hit ${hits}× of ${N} (${N ? Math.round((100 * hits) / N) : 0}%)`}</title>
            <path d={annular(R_IN, R_OUT, a0, a0 + step)} fill={POCKET_FILL[colorOf(n)]} stroke="#0b1310" strokeWidth="1" />
            {heat > 0 && (
              <path d={annular(R_IN, R_OUT, a0, a0 + step)} fill="var(--gold)" opacity={heat} stroke="var(--gold)" strokeWidth="0.75" />
            )}
            <text x={lx} y={ly} className="fw-num" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${ang} ${lx} ${ly})`}>
              {n}
            </text>
            {hits > 0 && (
              <text x={cx} y={cy} className="fw-count" textAnchor="middle" dominantBaseline="middle" transform={`rotate(${ang} ${cx} ${cy})`}>
                {hits}
              </text>
            )}
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

      {/* hub summary */}
      <circle cx={C} cy={C} r={R_HUB} fill="url(#fwHub)" stroke="var(--line)" strokeWidth="1.5" />
      <circle cx={C} cy={C} r={R_HUB - 10} fill="none" stroke="var(--line)" strokeWidth="0.75" opacity="0.6" />
      <text x={C} y={C - 58} className="fw-hub-cap" textAnchor="middle">
        FREQUENCY
      </text>
      <text x={C} y={C - 14} className="fw-hub-n" textAnchor="middle">
        {N}
      </text>
      <text x={C} y={C + 16} className="fw-hub-sub" textAnchor="middle">
        result{N === 1 ? "" : "s"} mapped
      </text>
      {hottest && (
        <text x={C} y={C + 50} className="fw-hub-hot" textAnchor="middle">
          hot {hottest.n} · {hottest.hits}×
        </text>
      )}
      {coldest && N > 0 && (
        <text x={C} y={C + 72} className="fw-hub-cold" textAnchor="middle">
          cold {coldest.n} · {coldest.drought >= N ? "never" : `${coldest.drought} dry`}
        </text>
      )}
    </svg>
  );
}
