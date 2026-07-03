import React, { useMemo, useRef, useState } from "react";
import { WHEELS } from "./wheels.js";
import { makeCryptoRng, spin, resolve, quadrantStats, chiSquare, betEV, pnlStats } from "./engine.js";
import Wheel from "./components/Wheel.jsx";
import Board from "./components/Board.jsx";
import QuadrantPanel from "./components/QuadrantPanel.jsx";
import FallacyLab from "./components/FallacyLab.jsx";
import SessionAnalytics from "./components/SessionAnalytics.jsx";

const fmt = (n) =>
  (n < 0 ? "−$" : "$") + Math.abs(Math.round(n * 100) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 });

export default function App() {
  const [wheelKey, setWheelKey] = useState("american");
  const [halfBack, setHalfBack] = useState(true);
  const [bank, setBank] = useState(1000);
  const [chip, setChip] = useState(5);
  const [bets, setBets] = useState({});
  const [history, setHistory] = useState([]);
  const [records, setRecords] = useState([]); // per-spin { staked, returned, net, ev }
  const [log, setLog] = useState([]);
  const [lastOut, setLastOut] = useState(null);

  const rng = useRef(null);
  if (!rng.current) rng.current = makeCryptoRng();

  const stats = useMemo(() => quadrantStats(wheelKey, history), [wheelKey, history]);
  const chi2 = useMemo(() => chiSquare(stats), [stats]);
  const staked = useMemo(() => Object.values(bets).reduce((a, b) => a + b, 0), [bets]);
  const pnl = useMemo(() => pnlStats(records), [records]);

  const pushLog = (line) => setLog((l) => [line, ...l].slice(0, 12));

  function switchWheel(key) {
    if (key === wheelKey) return;
    setWheelKey(key);
    setBets({});
    setHistory([]);
    setRecords([]);
    setLastOut(null);
    pushLog(`Wheel switched to ${WHEELS[key].label} — session stats reset.`);
  }

  function onBet(key, e) {
    if (e && e.shiftKey) {
      setBets((b) => {
        const c = { ...b };
        delete c[key];
        return c;
      });
      return;
    }
    setBets((b) => ({ ...b, [key]: (b[key] || 0) + chip }));
  }

  function doSpin() {
    if (staked > bank) {
      pushLog(`Staked ${fmt(staked)} exceeds bankroll ${fmt(bank)} — clear bets or rebuy.`);
      return;
    }
    const out = spin(wheelKey, rng.current);
    const res = resolve(bets, out, { halfBack });
    const ev = betEV(bets, wheelKey, { halfBack }).ev; // exact expected net of these bets
    setBank((b) => b - res.staked + res.returned);
    setHistory((h) => [...h, { n: out.n, idx: out.idx, q: out.q, color: out.color }]);
    setRecords((r) => [...r, { staked: res.staked, returned: res.returned, net: res.net, ev }]);
    setLastOut(out);
    const qid = WHEELS[wheelKey].quadrants[out.q].id;
    const head = `#${history.length + 1}  ${out.n} ${out.color.toUpperCase()} · ${qid}`;
    pushLog(
      res.staked
        ? `${head} — staked ${fmt(res.staked)}, returned ${fmt(res.returned)} (net ${res.net >= 0 ? "+" : ""}${fmt(res.net).replace("−$", "−$")})`
        : `${head} — tracking only, no bets`
    );
  }

  return (
    <div className="app">
      <header className="hdr">
        <div className="hdr-brand">
          <span className="hdr-mark">QUADRANT</span>
          <span className="hdr-sub">AC roulette trainer · fair RNG · droughts are descriptive, not predictive</span>
        </div>
        <div className="hdr-controls">
          <div className="seg">
            {Object.values(WHEELS).map((w) => (
              <button key={w.key} className={"seg-btn" + (wheelKey === w.key ? " on" : "")} onClick={() => switchWheel(w.key)}>
                {w.label}
              </button>
            ))}
          </div>
          <label className="toggle">
            <input type="checkbox" checked={halfBack} onChange={(e) => setHalfBack(e.target.checked)} />
            <span>
              {wheelKey === "american" ? "AC half-back" : "La partage"} <em>(even-money on zeros → −{wheelKey === "american" ? "2.63" : "1.35"}%)</em>
            </span>
          </label>
          <div className="bank">
            <span className="bank-label">Bankroll</span>
            <span className="bank-val">{fmt(bank)}</span>
            <button className="btn ghost" onClick={() => setBank((b) => b + 1000)}>
              +$1,000
            </button>
          </div>
        </div>
      </header>

      <main className="grid">
        <section className="col">
          <div className="card wheel-card">
            <Wheel wheelKey={wheelKey} lastIdx={lastOut ? lastOut.idx : null} stats={stats} />
            <div className="spin-row">
              <button className="btn spin" onClick={doSpin}>
                SPIN
              </button>
              <span className="spin-note">
                {staked > 0 ? `${fmt(staked)} riding — bets stay on the felt until cleared` : "no bets — quadrant tracking only"}
              </span>
            </div>
          </div>
          <SessionAnalytics pnl={pnl} wheelKey={wheelKey} halfBack={halfBack} />
          <FallacyLab wheelKey={wheelKey} />
        </section>

        <section className="col">
          <QuadrantPanel wheelKey={wheelKey} stats={stats} history={history} chi2={chi2} />
          <Board wheelKey={wheelKey} bets={bets} chip={chip} setChip={setChip} onBet={onBet} onClear={() => setBets({})} />
          <div className="card log">
            <div className="card-title">Session log</div>
            {log.length === 0 ? (
              <div className="log-empty">Spin to start. Every spin is uniform over all {WHEELS[wheelKey].seq.length} pockets — with or without bets.</div>
            ) : (
              <ul>
                {log.map((l, i) => (
                  <li key={log.length - i}>{l}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      <footer className="ftr">
        Educational play-money tool. Every bet here is negative expectation (−5.26% / −2.63% half-back even-money / −7.89% basket on the 00 wheel).
        No pattern on this screen changes the next spin. Sources & math: <code>docs/RESEARCH.md</code>.
      </footer>
    </div>
  );
}
