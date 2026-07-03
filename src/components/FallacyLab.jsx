import React, { useRef, useState } from "react";
import { makeCryptoRng, simulateStrategies } from "../engine.js";

export default function FallacyLab({ wheelKey }) {
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const rng = useRef(null);
  if (!rng.current) rng.current = makeCryptoRng();

  function run() {
    setBusy(true);
    // yield a frame so the button state paints before the sim blocks
    requestAnimationFrame(() => {
      setRes(simulateStrategies(wheelKey, 100_000, rng.current));
      setBusy(false);
    });
  }

  return (
    <div className="card lab">
      <div className="card-title">Fallacy Lab — test the “cold quadrant is due” hypothesis</div>
      <p className="lab-copy">
        Runs 100,000 fresh spins. Three bettors ride the <b>same spins</b>, each splitting one unit straight-up across a quadrant:
        one always takes the <b>coldest</b> quadrant, one always takes <b>Q1</b>, one picks at <b>random</b>. If droughts carried
        signal, cold would win.
      </p>
      <button className="btn" onClick={run} disabled={busy}>
        {busy ? "Spinning…" : "Run 100,000 spins"}
      </button>

      {res && (
        <>
          <div className="lab-grid">
            <div className="lab-cell">
              <span className="lab-k">COLD quadrant</span>
              <span className="lab-v">{res.cold.toFixed(2)}%</span>
            </div>
            <div className="lab-cell">
              <span className="lab-k">FIXED Q1</span>
              <span className="lab-v">{res.fixed.toFixed(2)}%</span>
            </div>
            <div className="lab-cell">
              <span className="lab-k">RANDOM</span>
              <span className="lab-v">{res.random.toFixed(2)}%</span>
            </div>
            <div className="lab-cell theory">
              <span className="lab-k">house edge</span>
              <span className="lab-v">{res.theory.toFixed(2)}%</span>
            </div>
          </div>
          <p className="lab-verdict">
            A quadrant hit a 10-spin drought <b>{res.dry10Events.toLocaleString()}</b> times; the longest drought ran{" "}
            <b>{res.maxDrought}</b> spins. All three strategies converge on the house edge — the drought counter is a scoreboard,
            not a forecast.
          </p>
        </>
      )}
    </div>
  );
}
