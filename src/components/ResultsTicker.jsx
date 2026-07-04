import React from "react";
import { WHEELS } from "../wheels.js";
import { Q_CLASS } from "../ui.js";

// Recent-results marquee. Newest first, color-inked numbers with a
// quadrant-colored underline. The first cell pops in when a new result lands
// (keyed by the result count via the parent). Reused by the live table (top of
// the wheel column) and the Analyze tab (over pasted data).
export default function ResultsTicker({ wheelKey, history, limit = 24, label = "recent" }) {
  const wheel = WHEELS[wheelKey];
  const N = history.length;
  const recent = history.slice(-limit).reverse();

  return (
    <div className="ticker">
      <span className="ticker-label">{label}</span>
      <div className="ticker-cells">
        {recent.length === 0 && <span className="ticker-empty">no results yet — spin or paste a sequence</span>}
        {recent.map((h, i) => (
          <span
            key={N - i}
            className={`ticker-cell ${Q_CLASS[h.q]} c-${h.color}` + (i === 0 ? " fresh" : "")}
            title={`${h.n} · ${h.color} · ${wheel.quadrants[h.q].id}`}
          >
            {h.n}
          </span>
        ))}
      </div>
    </div>
  );
}
