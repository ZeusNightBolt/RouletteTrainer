import React from "react";
import { WHEELS, RED } from "../wheels.js";

// Vertical felt (portrait, like a live table viewed head-on and most mobile
// roulette apps) as an SVG betting surface. Laid out to mirror a real Atlantic
// City / Resorts World felt rotated to portrait, reading left → right:
//   • even-money outside bets (1–18, EVEN, RED, BLACK, ODD, 19–36) — the
//     LEFTMOST column, six stacked bars (their felt order, low → high)
//   • the three dozens (1st/2nd/3rd 12) — the next column of tall bars
//   • the 0 / 00 head at top, then 12 rows × 3 cols of 1–36
//   • the three 2:1 column bets across the bottom (aligned to the columns)
//   • a right strip carrying the street / six-line hotspots
// Every real inside bet is a geometry-derived clickable hotspot:
//   • straight (35:1) — a number cell
//   • split    (17:1) — the line shared by two adjacent numbers
//   • street   (11:1) — the right edge of a row of three
//   • corner   ( 8:1) — the point where four numbers meet
//   • six-line ( 5:1) — the right edge between two rows
// plus the american 0-00-1-2-3 basket. Inside bets are keyed
// "i:<sorted-hyphen-numbers>"; the engine derives payout (36/count) and the
// per-pocket split from that. Shift-click removes.

// Portrait felt: 12 rows tall, so heights stay trim enough that the whole mat
// still fits one phone screen (the SVG is height-driven inside its card). Cell
// sizes here run ~10% larger than the first compact pass, for readier tiles.
const CW = 73; // number cell width (wide → readable numerals)
const CH = 39; // number cell height
const ZH = 44; // 0/00 row height (top)
const OW = 48; // even-money outside gutter (LEFTMOST column)
const DGW = 46; // dozen gutter (between the outside bets and the numbers)
const RS = 22; // right strip (street / six-line hotspots)
const COLH = 39; // 2:1 column-bet row (bottom of grid)

const GX = OW + DGW; // number grid starts after the outside + dozen gutters
const GY = ZH;
const GRID_W = 3 * CW;
const GRID_BOTTOM = GY + 12 * CH;
const W = OW + DGW + GRID_W + RS;
const H = ZH + 12 * CH + COLH;

const colorOf = (n) => (RED.has(n) ? "red" : "black");
// vertical grid: row r (0..11 top→bottom), col c (0..2) → number 3r + c + 1
const numAt = (r, c) => 3 * r + c + 1;
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

// The rectangle of the cell for a given pocket, so the dealer puck can sit dead
// centre on the winning number (0/00 live in the top row at half width).
function cellRectOf(n, american) {
  if (n === "0") return { x: GX, y: 0, w: american ? GRID_W / 2 : GRID_W, h: ZH };
  if (n === "00") return { x: GX + GRID_W / 2, y: 0, w: GRID_W / 2, h: ZH };
  const v = Number(n);
  if (!Number.isInteger(v) || v < 1 || v > 36) return null;
  const r = Math.floor((v - 1) / 3);
  const c = (v - 1) % 3;
  return { x: GX + c * CW, y: GY + r * CH, w: CW, h: CH };
}

// Dealer's dolly — the tall standing marker a live dealer stands on the winning
// number: a footed base, a fluted bottle body, and a knob on top. Upright and
// opaque (not a flat disc), so it reads exactly like the marker on an Atlantic
// City table. Purely a result marker — no bet, no click target.
function DealerPuck({ cx, cy }) {
  return (
    <g className="mat-puck" pointerEvents="none">
      {/* cast shadow on the felt */}
      <ellipse cx={cx} cy={cy + 15} rx="10.5" ry="3" className="puck-shadow" />
      {/* footed base */}
      <ellipse cx={cx} cy={cy + 13} rx="9.5" ry="3.2" className="puck-base" />
      {/* fluted bottle body — wide foot pinching to a neck */}
      <path
        d={`M ${cx - 7.5} ${cy + 13} C ${cx - 8} ${cy + 5} ${cx - 5.5} ${cy + 1} ${cx - 3.5} ${cy - 4} C ${cx - 2.8} ${cy - 6} ${cx - 2.8} ${cy - 7} ${cx - 2.8} ${cy - 8} L ${cx + 2.8} ${cy - 8} C ${cx + 2.8} ${cy - 7} ${cx + 2.8} ${cy - 6} ${cx + 3.5} ${cy - 4} C ${cx + 5.5} ${cy + 1} ${cx + 8} ${cy + 5} ${cx + 7.5} ${cy + 13} Z`}
        className="puck-body"
      />
      {/* collar under the knob */}
      <ellipse cx={cx} cy={cy - 8} rx="3.6" ry="1.5" className="puck-collar" />
      {/* knob / head */}
      <circle cx={cx} cy={cy - 11.5} r="4.8" className="puck-head" />
      {/* highlights (glassy body streak + head glint) */}
      <path d={`M ${cx - 2.6} ${cy + 9} C ${cx - 3} ${cy + 2} ${cx - 2} ${cy - 3} ${cx - 1.3} ${cy - 6}`} className="puck-shine" />
      <circle cx={cx - 1.5} cy={cy - 13} r="1.4" className="puck-glint" />
    </g>
  );
}

export default function RouletteMat({ wheelKey, bets, onBet, winner = null }) {
  const wheel = WHEELS[wheelKey];
  const american = wheelKey === "american";
  const winRect = winner != null ? cellRectOf(winner, american) : null;

  // --- inside-bet hotspots from the grid geometry --------------------------
  const spots = [];
  const pushRect = (key, cx, cy, w, h, title) => spots.push({ key, cx, cy, w, h, shape: "rect", title });
  const pushDot = (key, cx, cy, r, title) => spots.push({ key, cx, cy, r, shape: "dot", title });
  const lbl = (nums) => nums.slice().sort((a, b) => a - b).join("-");

  for (let r = 0; r < 12; r++) {
    for (let c = 0; c < 3; c++) {
      const n = numAt(r, c);
      const x = GX + c * CW;
      const y = GY + r * CH;
      // split with the cell to the right (same row)
      if (c < 2) {
        const nums = [n, numAt(r, c + 1)];
        pushRect(iKey(nums), x + CW, y + CH / 2, 16, CH * 0.5, `Split ${lbl(nums)} · 17:1`);
      }
      // split with the cell below (same column)
      if (r < 11) {
        const nums = [n, numAt(r + 1, c)];
        pushRect(iKey(nums), x + CW / 2, y + CH, CW * 0.5, 15, `Split ${lbl(nums)} · 17:1`);
      }
      // corner — point shared with right, below, below-right
      if (c < 2 && r < 11) {
        const nums = [n, numAt(r, c + 1), numAt(r + 1, c), numAt(r + 1, c + 1)];
        pushDot(iKey(nums), x + CW, y + CH, 10, `Corner ${lbl(nums)} · 8:1`);
      }
    }
    // street — this row of three, hotspot on the right edge
    const street = [numAt(r, 0), numAt(r, 1), numAt(r, 2)];
    pushRect(iKey(street), GX + GRID_W + RS / 2, GY + r * CH + CH / 2, RS - 4, CH * 0.5, `Street ${lbl(street)} · 11:1`);
    // six-line — this row + the next, hotspot on the right edge between rows
    if (r < 11) {
      const six = [...street, numAt(r + 1, 0), numAt(r + 1, 1), numAt(r + 1, 2)];
      pushRect(iKey(six), GX + GRID_W + RS / 2, GY + (r + 1) * CH, RS - 4, 16, `Six-line ${lbl(six)} · 5:1`);
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mat" aria-label={`${wheel.label} vertical betting felt`}>
      {/* 0 / 00 row on top */}
      {american ? (
        <>
          <MatCell key="0" x={GX} y={0} w={GRID_W / 2} h={ZH} cls="green" label="0" onClick={(e) => onBet("s:0", e)} amount={bets["s:0"]} />
          <MatCell key="00" x={GX + GRID_W / 2} y={0} w={GRID_W / 2} h={ZH} cls="green" label="00" onClick={(e) => onBet("s:00", e)} amount={bets["s:00"]} />
        </>
      ) : (
        <MatCell key="0" x={GX} y={0} w={GRID_W} h={ZH} cls="green" label="0" onClick={(e) => onBet("s:0", e)} amount={bets["s:0"]} />
      )}

      {/* even-money outside bets — the LEFTMOST column, six stacked bars beside
          the dozens, exactly like an AC / Resorts World felt (order runs the
          felt's low → high sequence; each bar spans two number rows). RED and
          BLACK boxes are actually coloured, as on a real layout. */}
      {[
        ["e:low", "1–18", ""],
        ["e:even", "EVEN", ""],
        ["e:red", "RED", "evred"],
        ["e:black", "BLACK", "evblack"],
        ["e:odd", "ODD", ""],
        ["e:high", "19–36", ""],
      ].map(([key, label, tint], i) => (
        <MatCell
          key={key}
          x={0}
          y={GY + i * 2 * CH}
          w={OW}
          h={2 * CH}
          cls={"outside " + tint}
          label={label}
          rotate
          onClick={(e) => onBet(key, e)}
          amount={bets[key]}
        />
      ))}

      {/* dozens — tall bars in the next gutter, each spanning four rows */}
      {[1, 2, 3].map((d) => (
        <MatCell
          key={"d" + d}
          x={OW}
          y={GY + (d - 1) * 4 * CH}
          w={DGW}
          h={4 * CH}
          cls="outside"
          label={d === 1 ? "1st 12" : d === 2 ? "2nd 12" : "3rd 12"}
          rotate
          onClick={(e) => onBet("d:" + d, e)}
          amount={bets["d:" + d]}
        />
      ))}

      {/* number grid */}
      {Array.from({ length: 12 }, (_, r) =>
        Array.from({ length: 3 }, (_, c) => {
          const n = numAt(r, c);
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

      {/* 2:1 column bets across the bottom (one per column) */}
      {[0, 1, 2].map((c) => {
        const col = c + 1; // col 0 → numbers 1,4,7… = column 1
        return (
          <MatCell
            key={"col" + col}
            x={GX + c * CW}
            y={GRID_BOTTOM}
            w={CW}
            h={COLH}
            cls="outside"
            label="2:1"
            title={`Column ${col} · 2:1`}
            onClick={(e) => onBet("c:" + col, e)}
            amount={bets["c:" + col]}
          />
        );
      })}

      {/* american basket 0-00-1-2-3 — the boundary between the zeros and row 1 */}
      {american && (
        <g className="mat-spot" onClick={(e) => onBet("b:basket", e)}>
          <title>Basket 0-00-1-2-3 · 6:1 (edge −7.89%)</title>
          <circle cx={GX} cy={GY} r="9" className="mat-hot" />
          <Chip cx={GX} cy={GY} amount={bets["b:basket"]} />
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

      {/* dealer puck on the winning number after the ball lands (drawn last so it
          sits on top of the felt + any chips, just like the real dolly) */}
      {winRect && (
        <g className="mat-winner" pointerEvents="none">
          <rect x={winRect.x + 1} y={winRect.y + 1} width={winRect.w - 2} height={winRect.h - 2} rx="4" className="mat-winner-cell" />
          <DealerPuck cx={winRect.x + winRect.w / 2} cy={winRect.y + winRect.h / 2} />
        </g>
      )}
    </svg>
  );
}

function MatCell({ x, y, w, h, cls, label, onClick, amount, title, rotate }) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    <g className="mat-cell" onClick={onClick}>
      <title>{title || `${label}`}</title>
      <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx="4" className={"mat-rect " + cls} />
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        className="mat-label"
        transform={rotate ? `rotate(-90 ${cx} ${cy})` : undefined}
      >
        {label}
      </text>
      <Chip cx={x + w - 12} cy={y + 12} amount={amount} />
    </g>
  );
}
