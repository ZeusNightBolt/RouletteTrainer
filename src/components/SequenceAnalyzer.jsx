import React, { useMemo, useState } from "react";
import { WHEELS } from "../wheels.js";
import { parseSequence, quadrantStats, colorStats, chiSquare, numberStats, recommendBets } from "../engine.js";
import QuadrantPanel from "./QuadrantPanel.jsx";
import ResultsTicker from "./ResultsTicker.jsx";
import FrequencyWheel from "./FrequencyWheel.jsx";
import BetRecommendations from "./BetRecommendations.jsx";

// once a pasted history has more than this many observations, the frequency
// wheel + heuristic bet recommendations unlock (below it there's too little to
// read a "pattern" into, honestly or otherwise)
const REC_MIN = 6;

const SAMPLE = "0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5";

// Paste-your-own-numbers tab. Runs any comma/space/newline-separated list of
// results through the exact same stats engine the live table uses, so you can
// audit a real logged session for quadrant/colour skew and its χ² significance.
// Wheel choice is local — you might be analyzing single-zero data while playing
// the American table.
export default function SequenceAnalyzer({ defaultWheel = "american" }) {
  const [text, setText] = useState("");
  const [wk, setWk] = useState(defaultWheel);

  const parsed = useMemo(() => parseSequence(wk, text), [wk, text]);
  const stats = useMemo(() => quadrantStats(wk, parsed.history), [wk, parsed.history]);
  const cstats = useMemo(() => colorStats(wk, parsed.history), [wk, parsed.history]);
  const chi2 = useMemo(() => chiSquare(stats), [stats]);

  const N = parsed.count;
  const showRecs = N > REC_MIN;
  const nstats = useMemo(() => (showRecs ? numberStats(wk, parsed.history) : null), [showRecs, wk, parsed.history]);
  const rec = useMemo(() => (showRecs ? recommendBets(wk, parsed.history) : null), [showRecs, wk, parsed.history]);

  return (
    <div className="analyzer">
      <div className="card">
        <div className="card-title">
          Analyze a sequence <em>— paste real results, get the quadrant breakdown</em>
        </div>
        <p className="an-help">
          Enter numbers separated by commas, spaces, or new lines (use <code>00</code> for the double-zero pocket). They run
          through the same descriptive stats as the live table — quadrant hits vs. expectation, colour split, and a χ²
          goodness-of-fit test. It measures what happened; it says nothing about the next spin.
        </p>

        <div className="an-tools">
          <div className="seg small">
            {Object.values(WHEELS).map((w) => (
              <button key={w.key} className={"seg-btn" + (wk === w.key ? " on" : "")} onClick={() => setWk(w.key)}>
                {w.label}
              </button>
            ))}
          </div>
          <div className="an-toolbtns">
            <button className="btn ghost" onClick={() => setText(SAMPLE)}>
              Load sample
            </button>
            <button className="btn ghost" onClick={() => setText("")} disabled={!text}>
              Clear
            </button>
          </div>
        </div>

        <textarea
          className="an-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          spellCheck={false}
          placeholder="e.g.  17, 32, 0, 26, 3, 00, 11, 8, 19, 4 …"
          aria-label="comma-separated roulette results"
        />

        <div className="an-summary">
          <span>
            <b>{N.toLocaleString()}</b> valid result{N === 1 ? "" : "s"} on the {WHEELS[wk].label} wheel
          </span>
          {parsed.invalid.length > 0 && (
            <span className="an-invalid">
              skipped {parsed.invalid.length}: {parsed.invalid.slice(0, 8).join(", ")}
              {parsed.invalid.length > 8 ? " …" : ""}
            </span>
          )}
        </div>
      </div>

      {N > 0 ? (
        <>
          <div className="card">
            <ResultsTicker wheelKey={wk} history={parsed.history} limit={40} label="parsed" />
          </div>

          {showRecs && nstats && (
            <div className="card freq-card">
              <div className="card-title">
                Frequency wheel <em>— where the {N} results landed</em>
              </div>
              <div className="freq-wrap">
                <FrequencyWheel wheelKey={wk} ns={nstats} stats={stats} />
              </div>
              <div className="freq-foot">
                Brighter pockets hit more often; the arc labels total each quadrant. A descriptive map of the past — the wheel
                is still uniform on the next spin.
              </div>
            </div>
          )}

          {showRecs && rec && <BetRecommendations rec={rec} />}

          <QuadrantPanel wheelKey={wk} stats={stats} cstats={cstats} history={parsed.history} chi2={chi2} titleOverride="Quadrant breakdown" />

          {!showRecs && (
            <div className="card an-note-more">
              Paste more than {REC_MIN} results to unlock the frequency wheel and the momentum / mean-reversion bet suggestions.
            </div>
          )}
        </>
      ) : (
        <div className="card an-empty">Paste a sequence above (or load the sample) to see its quadrant and colour breakdown.</div>
      )}
    </div>
  );
}
