import React from "react";
import { WHEELS, RED, quadrantSize } from "../wheels.js";
import { Q_CLASS } from "../ui.js";

function ChipBadge({ amount }) {
  if (!amount) return null;
  return <span className="chip-badge">{amount}</span>;
}

// Classic felt view. Chips/undo/clear live in the wheel console — this tab is
// the same shared bet state seen as a table, and every cell is still clickable.
export default function Board({ wheelKey, bets, onBet }) {
  const wheel = WHEELS[wheelKey];
  const rows = Array.from({ length: 12 }, (_, r) => [3 * r + 1, 3 * r + 2, 3 * r + 3]);

  return (
    <div className="card board">
      <div className="board-head">
        <div className="card-title">Atlantic City layout</div>
      </div>
      <div className="board-hint">Same bets as the wheel, shown on the felt · click adds the selected chip · shift-click removes.</div>

      <div className="layout">
        <div className={"zero-row " + wheelKey}>
          {wheel.zeroPockets.map((z) => (
            <button key={z} className="cell green" onClick={(e) => onBet("s:" + z, e)}>
              {z}
              <ChipBadge amount={bets["s:" + z]} />
            </button>
          ))}
        </div>

        <div className="num-grid">
          {rows.flat().map((n) => (
            <button key={n} className={"cell " + (RED.has(n) ? "red" : "black")} onClick={(e) => onBet("s:" + n, e)}>
              {n}
              <ChipBadge amount={bets["s:" + n]} />
            </button>
          ))}
          {[1, 2, 3].map((c) => (
            <button key={"c" + c} className="cell outside" onClick={(e) => onBet("c:" + c, e)}>
              2:1
              <ChipBadge amount={bets["c:" + c]} />
            </button>
          ))}
        </div>

        <div className="outside-grid dozens">
          {[1, 2, 3].map((d) => (
            <button key={"d" + d} className="cell outside" onClick={(e) => onBet("d:" + d, e)}>
              {d === 1 ? "1st 12" : d === 2 ? "2nd 12" : "3rd 12"}
              <ChipBadge amount={bets["d:" + d]} />
            </button>
          ))}
        </div>

        <div className="outside-grid evens">
          {[
            ["e:low", "1–18"],
            ["e:even", "EVEN"],
            ["e:red", "RED"],
            ["e:black", "BLACK"],
            ["e:odd", "ODD"],
            ["e:high", "19–36"],
          ].map(([key, label]) => (
            <button key={key} className={"cell outside " + (key === "e:red" ? "red-txt" : key === "e:black" ? "black-txt" : "")} onClick={(e) => onBet(key, e)}>
              {label}
              <ChipBadge amount={bets[key]} />
            </button>
          ))}
        </div>
      </div>

      <div className="sector-bets">
        <div className="card-title small">
          Sector bets <em>— stake split straight-up across the arc; same −{wheelKey === "american" ? "5.26" : "2.70"}% edge as any other bet</em>
        </div>
        <div className="sector-grid">
          {wheel.quadrants.map((q, k) => {
            const m = quadrantSize(wheelKey, k);
            const p = ((100 * m) / wheel.seq.length).toFixed(2);
            const mult = ((36 - m) / m).toFixed(1);
            return (
              <button key={q.id} className={"cell sector " + Q_CLASS[k]} onClick={(e) => onBet("q:" + k, e)}>
                <span className="sector-id">{q.id}</span>
                <span className="sector-meta">
                  {m} pockets · {p}% · hit nets +{mult}×
                </span>
                <ChipBadge amount={bets["q:" + k]} />
              </button>
            );
          })}
          {wheelKey === "american" && (
            <button className="cell sector basket" onClick={(e) => onBet("b:basket", e)}>
              <span className="sector-id">BASKET 0·00·1·2·3</span>
              <span className="sector-meta">pays 6:1 · edge −7.89% — worst bet on the felt</span>
              <ChipBadge amount={bets["b:basket"]} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
