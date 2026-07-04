import React from "react";
import { CHIPS } from "../ui.js";

// Chip selector + undo/clear, docked at the wheel so every betting action
// happens in one place. Undo pops the last bet edit since the previous spin.
export default function BetConsole({ chip, setChip, onUndo, onClear, canUndo, hasBets }) {
  return (
    <div className="console">
      <div className="chip-row">
        {CHIPS.map((c) => (
          <button key={c} className={"chip sm" + (chip === c ? " on" : "")} onClick={() => setChip(c)} title={`bet in $${c} chips`}>
            {c}
          </button>
        ))}
      </div>
      <div className="console-actions">
        <button className="btn ghost" onClick={onUndo} disabled={!canUndo} title="undo the last bet placed or removed">
          ⟲ Undo
        </button>
        <button className="btn ghost" onClick={onClear} disabled={!hasBets}>
          Clear bets
        </button>
      </div>
    </div>
  );
}
