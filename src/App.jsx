import React, { useMemo, useRef, useState } from "react";
import { WHEELS } from "./wheels.js";
import { makeCryptoRng, spin, resolve, quadrantStats, chiSquare, betEV, pnlStats, colorStats, pocketStakes, numberStats } from "./engine.js";
import Wheel from "./components/Wheel.jsx";
import RouletteMat from "./components/RouletteMat.jsx";
import BetConsole from "./components/BetConsole.jsx";
import StatsBanner from "./components/StatsBanner.jsx";
import ACBoard from "./components/ACBoard.jsx";
import QuadrantPanel from "./components/QuadrantPanel.jsx";
import FallacyLab from "./components/FallacyLab.jsx";
import SessionAnalytics from "./components/SessionAnalytics.jsx";
import SequenceAnalyzer from "./components/SequenceAnalyzer.jsx";
import { fmt, SPIN_MS } from "./ui.js";

// how long the wheel lingers on the result before the felt returns
const RESULT_HOLD_MS = 1500;

const TABS = [
  ["telemetry", "Telemetry"],
  ["analytics", "Analytics"],
  ["analyze", "Analyze"],
  ["lab", "Fallacy Lab"],
  ["log", "Log"],
];

export default function App() {
  const [wheelKey, setWheelKey] = useState("american");
  const [halfBack, setHalfBack] = useState(true);
  const [bank, setBank] = useState(1000);
  const [chip, setChip] = useState(5);
  const [bets, setBets] = useState({});
  const [betStack, setBetStack] = useState([]); // undo snapshots since last spin
  const [history, setHistory] = useState([]);
  const [records, setRecords] = useState([]); // per-spin { staked, returned, net, ev }
  const [log, setLog] = useState([]);
  const [lastOut, setLastOut] = useState(null);
  const [spinId, setSpinId] = useState(0); // increments per spin to retrigger animations
  const [spinning, setSpinning] = useState(false); // ball in flight — result hidden until it lands
  const [view, setView] = useState("mat"); // "mat" (place bets) | "wheel" (spin result)
  const [tab, setTab] = useState("telemetry");

  const rng = useRef(null);
  if (!rng.current) rng.current = makeCryptoRng();
  const timers = useRef([]);
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const stats = useMemo(() => quadrantStats(wheelKey, history), [wheelKey, history]);
  const cstats = useMemo(() => colorStats(wheelKey, history), [wheelKey, history]);
  const nstats = useMemo(() => numberStats(wheelKey, history), [wheelKey, history]);
  const chi2 = useMemo(() => chiSquare(stats), [stats]);
  const staked = useMemo(() => Object.values(bets).reduce((a, b) => a + b, 0), [bets]);
  const pnl = useMemo(() => pnlStats(records), [records]);
  const stakes = useMemo(() => pocketStakes(bets, wheelKey).stakes, [bets, wheelKey]); // split amount per pocket

  const pushLog = (line) => setLog((l) => [line, ...l].slice(0, 30));

  function switchWheel(key) {
    if (key === wheelKey) return;
    setWheelKey(key);
    setBets({});
    setBetStack([]);
    setHistory([]);
    setRecords([]);
    setLastOut(null);
    setView("mat");
    setSpinning(false);
    clearTimers();
    pushLog(`Wheel switched to ${WHEELS[key].label} — session stats reset.`);
  }

  // every bet edit snapshots the previous state so Undo can walk back
  function applyBets(next) {
    setBetStack((s) => [...s.slice(-49), bets]);
    setBets(next);
  }

  function onBet(key, e) {
    if (e && e.shiftKey) {
      if (!bets[key]) return;
      const c = { ...bets };
      delete c[key];
      applyBets(c);
      return;
    }
    applyBets({ ...bets, [key]: (bets[key] || 0) + chip });
  }

  function undoBet() {
    if (!betStack.length) return;
    setBets(betStack[betStack.length - 1]);
    setBetStack((s) => s.slice(0, -1));
  }

  function clearBets() {
    if (!staked) return;
    applyBets({});
  }

  function doSpin() {
    if (spinning) return; // ignore clicks while the ball is still in flight
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
    setSpinId((s) => s + 1);
    setView("wheel"); // flip to the wheel for the spin…
    setSpinning(true); // …with the result hidden until the ball lands
    clearTimers();
    timers.current.push(setTimeout(() => setSpinning(false), SPIN_MS)); // reveal on landing
    timers.current.push(setTimeout(() => setView("mat"), SPIN_MS + RESULT_HOLD_MS)); // then back to the felt
    setBetStack([]); // undo applies to edits since the last spin
    const qid = WHEELS[wheelKey].quadrants[out.q].id;
    const head = `#${history.length + 1}  ${out.n} ${out.color.toUpperCase()} · ${qid}`;
    pushLog(
      res.staked
        ? `${head} — staked ${fmt(res.staked)}, returned ${fmt(res.returned)} (net ${res.net >= 0 ? "+" : ""}${fmt(res.net)})`
        : `${head} — tracking only, no bets`
    );
  }

  return (
    <div className="app" style={{ "--spin-dur": `${SPIN_MS}ms` }}>
      <header className="hdr">
        <div className="hdr-brand">
          <span className="hdr-dot" aria-hidden="true" />
          <span className="hdr-mark">Roulette Trainer</span>
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
        <section className="col left">
          <div className="card wheel-card">
            <div className="table-head">
              <StatsBanner pnl={pnl} streak={cstats.streak} spins={history.length} />
              <div className="seg view-seg">
                <button className={"seg-btn" + (view === "mat" ? " on" : "")} onClick={() => setView("mat")}>
                  Table
                </button>
                <button className={"seg-btn" + (view === "wheel" ? " on" : "")} onClick={() => setView("wheel")} disabled={!lastOut}>
                  Wheel
                </button>
              </div>
            </div>

            <BetConsole
              chip={chip}
              setChip={setChip}
              onUndo={undoBet}
              onClear={clearBets}
              canUndo={betStack.length > 0}
              hasBets={staked > 0}
            />

            {view === "mat" ? (
              <div className="mat-wrap">
                <RouletteMat wheelKey={wheelKey} bets={bets} onBet={onBet} />
              </div>
            ) : (
              <div className="wheel-wrap">
                <Wheel
                  wheelKey={wheelKey}
                  lastIdx={lastOut ? lastOut.idx : null}
                  stats={stats}
                  bets={bets}
                  stakes={stakes}
                  onBet={onBet}
                  spinId={spinId}
                  spinning={spinning}
                />
              </div>
            )}

            <div className="spin-row">
              <button className={"btn spin" + (spinning ? " spinning" : "")} onClick={doSpin} disabled={spinning}>
                {spinning ? "…" : "SPIN"}
              </button>
              {view === "wheel" && !spinning && (
                <button className="btn" onClick={() => setView("mat")}>
                  ＋ New bets
                </button>
              )}
              <span className="spin-note">
                {spinning
                  ? "no more bets — the ball is in play…"
                  : view === "mat"
                  ? staked > 0
                    ? `${fmt(staked)} riding · click a line for a split, a corner for 4, edges for streets · shift-click removes`
                    : "place bets on the felt — numbers, splits, corners, streets, six-lines, outside"
                  : `result ${lastOut ? lastOut.n : ""} · chips show the split amount landing on each pocket`}
              </span>
            </div>
          </div>
        </section>

        <section className="col right">
          <ACBoard wheelKey={wheelKey} history={history} nstats={nstats} />
          <nav className="tabs" role="tablist">
            {TABS.map(([key, label]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                className={"tab-btn" + (tab === key ? " on" : "")}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="tab-body">
            <div className="tab-pane" hidden={tab !== "telemetry"}>
              <QuadrantPanel wheelKey={wheelKey} stats={stats} cstats={cstats} history={history} chi2={chi2} />
            </div>
            <div className="tab-pane" hidden={tab !== "analytics"}>
              <SessionAnalytics pnl={pnl} wheelKey={wheelKey} />
            </div>
            <div className="tab-pane" hidden={tab !== "analyze"}>
              <SequenceAnalyzer defaultWheel={wheelKey} />
            </div>
            <div className="tab-pane" hidden={tab !== "lab"}>
              <FallacyLab wheelKey={wheelKey} />
            </div>
            <div className="tab-pane" hidden={tab !== "log"}>
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
            </div>
          </div>
        </section>
      </main>

      <footer className="ftr">
        Educational play-money tool. Every bet is negative expectation (−5.26% / −2.63% half-back even-money / −7.89% basket on the 00 wheel).
        No pattern on this screen changes the next spin. Sources & math: <code>docs/RESEARCH.md</code>.
      </footer>
    </div>
  );
}
