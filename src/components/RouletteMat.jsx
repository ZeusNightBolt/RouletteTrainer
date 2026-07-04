import React from "react";
import { WHEELS, RED } from "../wheels.js";

// Classic horizontal felt as an SVG betting surface. Numbers are a 12×3 grid
// (0 / 00 on the left), and the exact inside-bet positions a real table offers
// are clickable hotspots computed from the grid geometry — no guessing:
//   • straight (1 number, 35:1)  — click a number cell
//   • split    (2 numbers, 17:1) — the line shared by two adjacent numbers
//   • street   (3 numbers, 11:1) — the outer edge at the end of a column-of-3
//   • corner   (4 numbers,  8:1) — the point where four numbers meet
//   • six-line (6 numbers,  5:1) — the outer edge between two streets
// plus dozens / columns / even-money and (american) the 0-00-1-2-3 basket.
// Every inside bet is keyed "i:<sorted-hyphen-numbers>"; the engine derives the
// payout (36 / count) and the per-pocket split from that. Shift-click removes.

const CW = 56; // number cell width
const CH = 52; // number cell height
const ZW = 44; // zero column width
const TM = 17; // top strip (street / six-line hotspots)
const RW = 44; // right column (2:1) width
const DH = 40; // dozens row height
const EH = 40; // even-money row height

const GX = ZW;
const GY = TM;
const GRID_W = 12 * CW;
const GRID_BOTTOM = GY + 3 * CH;
const W = ZW + GRID_W + RW;
const H = GY + 3 * CH + DH + EH;

const colorOf = (n) => (RED.has(n) ? "red" : "black");
// physical grid: column c (0..11), rowFromTop r (0..2) → number 3c + (3 − r)
const numAt = (c, r) => 3 * c + (3 - r);
const iKey = (nums) => "i:" + [...nums].sort((a, b) => a - b).join("-");

function Chip({ cx, cy, amount }) {
  if (!amount) return null;
  const label =
    amount >= 1000 ? `${(amount / 1000).toFixed(amount % 1000 ? 1 : 0)}k` : Number.isInteger(amount) ? amount : amount.toFixed(1);
  return (
    <g className="mat-chip" pointerEvents="none">
      <circle cx={cx} cy={cy} r="12" />
      <circle cx={cx} cy={cy} r="8.6" className="mat-chip-ring" />
      <text x={cx} y={cy + 0.5} textAnchor="middle" dominantBaseline="middle">
        {label}
      </text>
    </g>
  );
}

export default function RouletteMat({ wheelKey, bets, onBet }) {
  const wheel = WHEELS[wheelKey];
  const american = wheelKey === "american";

  // --- assemble inside-bet hotspots from grid geometry ---------------------
  const spots = []; // { key, cx, cy, w, h, shape, title }
  const pushRect = (key, cx, cy, w, h, title) => spots.push({ key, cx, cy, w, h, shape: "rect", title });
  const pushDot = (key, cx, cy, r, title) => spots.push({ key, cx, cy, r, shape: "dot", title });

  for (let c = 0; c < 12; c++) {
    for (let r = 0; r < 3; r++) {
      const n = numAt(c, r);
      const x = GX + c * CW;
      const y = GY + r * CH;
      // vertical split — shared edge with the cell to the right (same row)
      if (c < 11) {
        const nums = [n, numAt(c + 1, r)];
        pushRect(iKey(nums), x + CW, y + CH / 2, 16, CH * 0.52, `Split ${nums.sort((a, b) => a - b).join("-")} · 17:1`);
      }
      // horizontal split — shared edge with the cell below (same column)
      if (r < 2) {
        const nums = [n, numAt(c, r + 1)];
        pushRect(iKey(nums), x + CW / 2, y + CH, CW * 0.52, 16, `Split ${nums.sort((a, b) => a - b).join("-")} · 17:1`);
      }
      // corner — the point shared by this cell, right, below, below-right
      if (c < 11 && r < 2) {
        const nums = [n, numAt(c + 1, r), numAt(c, r + 1), numAt(c + 1, r + 1)];
        pushDot(iKey(nums), x + CW, y + CH, 10, `Corner ${nums.slice().sort((a, b) => a - b).join("-")} · 8:1`);
      }
    }
    // street — the three numbers in this column, hotspot in the top strip
    const street = [numAt(c, 0), numAt(c, 1), numAt(c, 2)];
    pushRect(iKey(street), GX + c * CW + CW / 2, GY - TM / 2, CW * 0.5, TM - 3, `Street ${street.slice().sort((a, b) => a - b).join("-")} · 11:1`);
    // six-line — this street + the next, hotspot on the boundary in the top strip
    if (c < 11) {
      const six = [...street, numAt(c + 1, 0), numAt(c + 1, 1), numAt(c + 1, 2)];
      pushRect(iKey(six), GX + (c + 1) * CW, GY - TM / 2, 18, TM - 3, `Six-line ${six.slice().sort((a, b) => a - b).join("-")} · 5:1`);
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mat" aria-label={`${wheel.label} betting felt`}>
      {/* zero column */}
      {american ? (
        <>
          <MatCell key="0" x={0} y={GY} w={ZW} h={1.5 * CH} cls="green" label="0" onClick={(e) => onBet("s:0", e)} amount={bets["s:0"]} />
          <MatCell key="00" x={0} y={GY + 1.5 * CH} w={ZW} h={1.5 * CH} cls="green" label="00" onClick={(e) => onBet("s:00", e)} amount={bets["s:00"]} />
        </>
      ) : (
        <MatCell key="0" x={0} y={GY} w={ZW} h={3 * CH} cls="green" label="0" onClick={(e) => onBet("s:0", e)} amount={bets["s:0"]} />
      )}

      {/* number grid */}
      {Array.from({ length: 12 }, (_, c) =>
        Array.from({ length: 3 }, (_, r) => {
          const n = numAt(c, r);
          return (
            <MatCell
              key={"n" + n}
              x={GX + c * CW}
              y={GY + r * CH}
              w={CW}
              h={CH}
              cls={colorOf(n)}
              label={n}
              onClick={(e) => onBet("s:" + n, e)}
              amount={bets["s:" + n]}
            />
          );
        })
      )}

      {/* right-side 2:1 column bets (one per felt row) */}
      {[0, 1, 2].map((r) => {
        const col = 3 - r; // row of 3,6,.. is column 3; 2,5,.. col 2; 1,4,.. col 1
        return (
          <MatCell
            key={"col" + col}
            x={GX + GRID_W}
            y={GY + r * CH}
            w={RW}
            h={CH}
            cls="outside"
            label="2:1"
            title={`Column ${col} · 2:1`}
            onClick={(e) => onBet("c:" + col, e)}
            amount={bets["c:" + col]}
          />
        );
      })}

      {/* dozens */}
      {[1, 2, 3].map((d) => (
        <MatCell
          key={"d" + d}
          x={GX + (d - 1) * 4 * CW}
          y={GRID_BOTTOM}
          w={4 * CW}
          h={DH}
          cls="outside"
          label={d === 1 ? "1st 12" : d === 2 ? "2nd 12" : "3rd 12"}
          onClick={(e) => onBet("d:" + d, e)}
          amount={bets["d:" + d]}
        />
      ))}

      {/* even-money row */}
      {[
        ["e:low", "1–18"],
        ["e:even", "EVEN"],
        ["e:red", "RED"],
        ["e:black", "BLACK"],
        ["e:odd", "ODD"],
        ["e:high", "19–36"],
      ].map(([key, label], i) => (
        <MatCell
          key={key}
          x={GX + i * 2 * CW}
          y={GRID_BOTTOM + DH}
          w={2 * CW}
          h={EH}
          cls={"outside " + (key === "e:red" ? "red-ink" : key === "e:black" ? "black-ink" : "")}
          label={label}
          onClick={(e) => onBet(key, e)}
          amount={bets[key]}
        />
      ))}

      {/* american basket 0-00-1-2-3 (top-left corner of the number grid) */}
      {american && (
        <g className="mat-spot" onClick={(e) => onBet("b:basket", e)}>
          <title>Basket 0-00-1-2-3 · 6:1 (edge −7.89%)</title>
          <circle cx={GX} cy={GY - TM / 2} r="9" className="mat-hot" />
          <Chip cx={GX} cy={GY - TM / 2} amount={bets["b:basket"]} />
        </g>
      )}

      {/* inside-bet hotspots (splits / corners / streets / six-lines) */}
      {spots.map((s) => (
        <g key={s.key} className="mat-spot" onClick={(e) => onBet(s.key, e)}>
          <title>{s.title}</title>
          {s.shape === "rect" ? (
            <rect x={s.cx - s.w / 2} y={s.cy - s.h / 2} width={s.w} height={s.h} rx="3" className="mat-hot" />
          ) : (
            <circle cx={s.cx} cy={s.cy} r={s.r} className="mat-hot" />
          )}
          <Chip cx={s.cx} cy={s.cy} amount={bets[s.key]} />
        </g>
      ))}
    </svg>
  );
}

function MatCell({ x, y, w, h, cls, label, onClick, amount, title }) {
  return (
    <g className="mat-cell" onClick={onClick}>
      <title>{title || `${label}`}</title>
      <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx="4" className={"mat-rect " + cls} />
      <text x={x + w / 2} y={y + h / 2 + 1} textAnchor="middle" dominantBaseline="middle" className="mat-label">
        {label}
      </text>
      <Chip cx={x + w - 12} cy={y + 12} amount={amount} />
    </g>
  );
}
