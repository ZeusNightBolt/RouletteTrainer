import React from "react";
import { colorOf } from "../wheels.js";
import { fmt } from "../ui.js";

// Two side-by-side "bet slips" the Analyze tab builds from a pasted history via
// engine.recommendBets: one from momentum (ride the hot hand), one from mean
// reversion (back the overdue). They intentionally contradict — the point is
// that both are just stories over noise. Sizes follow the user's usual ticket
// ($25–50 outside, $5/number inside). NONE of this is an edge: see the banner.

function NumberChips({ numbers }) {
  return (
    <div className="rec-nums">
      {numbers.map((x) => (
        <span key={x.n} className={"rec-numchip c-" + colorOf(x.n)} title={`$${x.amount} on ${x.n} · ${x.meta}`}>
          <b>{x.n}</b>
          <em>{x.meta}</em>
        </span>
      ))}
    </div>
  );
}

function Slip({ variant, title, tagline, slip }) {
  const outside = slip.items.filter((i) => i.cat !== "Numbers");
  const numbers = slip.items.find((i) => i.cat === "Numbers");
  return (
    <div className={"rec-slip " + variant}>
      <div className="rec-slip-head">
        <div>
          <div className="rec-slip-title">{title}</div>
          <div className="rec-slip-tag">{tagline}</div>
        </div>
        <div className="rec-slip-total">
          <span className="rec-total-k">slip</span>
          <span className="rec-total-v">{fmt(slip.total)}</span>
        </div>
      </div>

      <ul className="rec-lines">
        {outside.map((it) => (
          <li key={it.cat} className="rec-line">
            <span className="rec-cat">{it.cat}</span>
            <span className="rec-pick">{it.label}</span>
            <span className="rec-amt">{fmt(it.amount)}</span>
            <span className="rec-why">{it.reason}</span>
          </li>
        ))}
      </ul>

      {numbers && numbers.numbers.length > 0 && (
        <div className="rec-numbers">
          <div className="rec-line rec-line-num">
            <span className="rec-cat">Numbers</span>
            <span className="rec-pick">{numbers.numbers.length} straight-up</span>
            <span className="rec-amt">{fmt(numbers.amount)}</span>
            <span className="rec-why">{fmt(numbers.numbers[0].amount)} each</span>
          </div>
          <NumberChips numbers={numbers.numbers} />
        </div>
      )}
    </div>
  );
}

export default function BetRecommendations({ rec }) {
  if (!rec) return null;
  return (
    <div className="card recs">
      <div className="card-title">
        Suggested bets <em>— two theories, one pasted history</em>
      </div>

      <div className="rec-disclaimer">
        <b>For pattern-play only — not an edge.</b> Roulette has no memory: every number is still
        1/{rec.wheelKey === "american" ? 38 : 37} on the very next spin, whatever these numbers "say." Both slips below are
        negative-expectation like every roulette bet. This is a best-guess read of the streaks you pasted, nothing more.
      </div>

      <div className="rec-grid">
        <Slip
          variant="hot"
          title="Momentum"
          tagline="ride what's running hot"
          slip={rec.momentum}
        />
        <Slip
          variant="cold"
          title="Mean reversion"
          tagline="back what's overdue"
          slip={rec.reversion}
        />
      </div>

      <div className="rec-foot">
        Each slip leads with a <b>quadrant (sector)</b> play — momentum on the arc the ball keeps landing in,
        reversion on the arc that's gone coldest (with its inside picks pulled from that arc <em>and the numbers
        straddling its two borders</em>). Sizing follows your usual ticket — ${25}–{50} on colour/outside, $5 per
        number across {rec.k} inside picks, $5 on each pocket of a sector. Both slips are guesses over noise.
      </div>
    </div>
  );
}
