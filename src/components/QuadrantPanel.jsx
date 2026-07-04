import React from "react";
import { CHI2_CRIT_95, CHI2_CRIT_99 } from "../engine.js";
import { Q_CLASS } from "../ui.js";

export default function QuadrantPanel({ wheelKey, stats, cstats, history, chi2, titleOverride }) {
  const N = history.length;
  const { colors, streak } = cstats;

  const chiVerdict =
    N < 20
      ? `need ≥20 spins for a meaningful test (${N} so far)`
      : chi2 > CHI2_CRIT_99
      ? "outside 99% band — interesting, but 1-in-100 sessions do this on a fair wheel"
      : chi2 > CHI2_CRIT_95
      ? "outside 95% band — 1-in-20 fair sessions look like this by design"
      : "consistent with a fair wheel";

  return (
    <div className="card qpanel">
      <div className="qpanel-head">
        <div className="card-title">{titleOverride || "Quadrant telemetry"} — {N.toLocaleString()} spins</div>
        <div className="qpanel-note">Descriptive only. P(each quadrant) is fixed every spin, whatever the drought.</div>
      </div>

      <div className="qcards">
        {stats.map((s, k) => (
          <div key={s.id} className={"qcard " + Q_CLASS[k]}>
            <div className="qcard-top">
              <span className="qcard-id">{s.id}</span>
              <span className="qcard-p">
                {s.m} pkts · {(100 * s.p).toFixed(2)}%
              </span>
              {s.drought >= 10 && <span className="cold-badge">COLD {s.drought}</span>}
            </div>
            <div className="qcard-drought">
              <span className="big">{s.drought}</span>
              <span className="unit">spins dry</span>
            </div>
            <div className="qcard-row">
              <span>
                hits <b>{s.hits}</b> / exp {s.expected.toFixed(1)}
              </span>
              <span>
                share <b>{N ? (100 * s.share).toFixed(1) : "—"}%</b>
              </span>
            </div>
            <div className="qcard-row dim">
              <span>max drought {s.maxDrought}</span>
              <span>P(10-dry) {(100 * s.pDry10).toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="colorbar">
        {colors.map((c) => (
          <div key={c.id} className={"colorcell " + c.id}>
            <span className="colorcell-dot" />
            <span className="colorcell-id">{c.id.toUpperCase()}</span>
            <span className="colorcell-stat">
              <b>{c.hits}</b> / exp {c.expected.toFixed(1)}
            </span>
            <span className="colorcell-stat dim">
              {N ? (100 * c.share).toFixed(1) + "%" : "—"} · dry {c.drought}
            </span>
          </div>
        ))}
        <div className="colorcell streakcell">
          <span className="colorcell-id">STREAK</span>
          {streak ? (
            <span className={"streak-val " + streak.color}>
              {streak.color.toUpperCase()} ×{streak.len}
            </span>
          ) : (
            <span className="colorcell-stat dim">spin to start</span>
          )}
        </div>
      </div>

      <div className="chi">
        <span>
          χ² vs fair split = <b>{N ? chi2.toFixed(2) : "—"}</b> <em>(df 3 · 95% crit {CHI2_CRIT_95} · 99% crit {CHI2_CRIT_99})</em>
        </span>
        <span className="chi-verdict">{chiVerdict}</span>
      </div>
    </div>
  );
}
