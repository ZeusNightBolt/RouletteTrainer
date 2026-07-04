import React from "react";

function Badge({ amount }) {
  if (!amount) return null;
  return <span className="chip-badge">{amount}</span>;
}

const EVENS = [
  ["e:low", "1–18"],
  ["e:even", "EVEN"],
  ["e:red", "RED"],
  ["e:black", "BLACK"],
  ["e:odd", "ODD"],
  ["e:high", "19–36"],
];

// Compact outside-bet strip docked under the wheel: even-money props, dozens,
// columns, and the basket (american only). Same bet keys as the table layout,
// so chips placed here mirror onto the Table tab and vice versa.
export default function OutsideBets({ wheelKey, bets, onBet }) {
  return (
    <div className="props">
      <div className="props-row">
        {EVENS.map(([key, label]) => (
          <button
            key={key}
            className={"cell mini " + (key === "e:red" ? "red-txt" : key === "e:black" ? "black-txt" : "")}
            onClick={(e) => onBet(key, e)}
            title={`${label} — pays 1:1${wheelKey === "american" ? " · AC half-back on 0/00" : " · la partage on 0"}`}
          >
            {label}
            <Badge amount={bets[key]} />
          </button>
        ))}
      </div>
      <div className="props-row">
        {[1, 2, 3].map((d) => (
          <button key={"d" + d} className="cell mini" onClick={(e) => onBet("d:" + d, e)} title={`dozen ${d} — pays 2:1`}>
            {d === 1 ? "1st 12" : d === 2 ? "2nd 12" : "3rd 12"}
            <Badge amount={bets["d:" + d]} />
          </button>
        ))}
        {[1, 2, 3].map((c) => (
          <button key={"c" + c} className="cell mini" onClick={(e) => onBet("c:" + c, e)} title={`column ${c} — pays 2:1`}>
            COL {c}
            <Badge amount={bets["c:" + c]} />
          </button>
        ))}
      </div>
      {wheelKey === "american" && (
        <button className="cell mini basket-mini" onClick={(e) => onBet("b:basket", e)} title="0-00-1-2-3 — pays 6:1 · edge −7.89%, worst bet on the felt">
          BASKET 0·00·1·2·3 — 6:1 · worst bet on the felt
          <Badge amount={bets["b:basket"]} />
        </button>
      )}
    </div>
  );
}
