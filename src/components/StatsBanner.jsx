import React from "react";
import { fmt } from "../ui.js";

// Compact session banner that rides above the mat — the at-a-glance line a
// player wants while betting: spins, session P&L, hit rate, and the current
// colour streak. Descriptive; it never hints at the next spin.
export default function StatsBanner({ pnl, streak, spins }) {
  const net = pnl.net;
  return (
    <div className="banner">
      <div className="banner-cell">
        <span className="banner-k">Spins</span>
        <span className="banner-v">{spins.toLocaleString()}</span>
      </div>
      <div className={"banner-cell " + (net > 0 ? "pos" : net < 0 ? "neg" : "")}>
        <span className="banner-k">Session P&amp;L</span>
        <span className="banner-v">{pnl.rounds ? (net >= 0 ? "+" : "−") + fmt(Math.abs(net)).replace("$", "$") : "—"}</span>
      </div>
      <div className="banner-cell">
        <span className="banner-k">Hit rate</span>
        <span className="banner-v">{pnl.rounds ? (100 * pnl.hitRate).toFixed(0) + "%" : "—"}</span>
      </div>
      <div className="banner-cell">
        <span className="banner-k">Streak</span>
        <span className={"banner-v streak-" + (streak ? streak.color : "")}>
          {streak ? `${streak.color[0].toUpperCase()}×${streak.len}` : "—"}
        </span>
      </div>
    </div>
  );
}
