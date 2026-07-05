import React from "react";
import { WHEELS, colorOf } from "../wheels.js";

const colorClass = (n) => colorOf(n);

// Atlantic City electronic results board. Mirrors what the tote display over a
// live AC table shows: the current number, the recent run, red/black/green tote
// (red on the left, black on the right), the even-money + dozen + column tallies,
// and hot / cold numbers. Everything is descriptive — none of it changes the
// next spin (P(each number) is 1/38 no matter how hot or cold it looks).
export default function ACBoard({ wheelKey, history, nstats }) {
  const wheel = WHEELS[wheelKey];
  const N = history.length;
  const recent = history.slice(-16).reverse();
  const last = N ? history[N - 1] : null;
  const { red, black, green, odd, even, low, high, dozens, columns, hot, cold } = nstats;

  const rbTotal = red + black || 1;
  const pct = (n) => (N ? Math.round((100 * n) / N) : 0);

  const NumChip = ({ n, color, sub }) => (
    <span className={"acnum c-" + color} title={sub != null ? `${n} · ${sub}` : n}>
      {n}
      {sub != null && <em>{sub}</em>}
    </span>
  );

  const Tally = ({ label, a, b, la, lb }) => (
    <div className="ac-tally">
      <span className="ac-tally-side left">
        <b>{a}</b>
        <span>{la}</span>
      </span>
      <span className="ac-tally-label">{label}</span>
      <span className="ac-tally-side right">
        <span>{lb}</span>
        <b>{b}</b>
      </span>
    </div>
  );

  return (
    <div className="card acboard">
      <div className="ac-head">
        <div className="card-title">Table board</div>
        <span className="ac-count">{N.toLocaleString()} spins · {wheel.label}</span>
      </div>

      {/* current number — keyed on the spin count so it flashes in when a new
          result lands (the board only updates once the ball seats, see App) */}
      <div className="ac-current">
        {last ? (
          <>
            <span key={N} className={"ac-cur-num flash c-" + last.color}>{last.n}</span>
            <span className="ac-cur-meta">
              {last.color.toUpperCase()}
              {last.color !== "green" && (
                <> · {Number(last.n) % 2 ? "ODD" : "EVEN"} · {Number(last.n) <= 18 ? "1–18" : "19–36"}</>
              )}
              <br />
              <span className="dim">{wheel.quadrants[last.q].id} sector</span>
            </span>
          </>
        ) : (
          <span className="ac-cur-idle">spin to populate the board</span>
        )}
      </div>

      {/* recent run */}
      <div className="ac-recent">
        {recent.length === 0 && <span className="dim">no numbers yet</span>}
        {recent.map((h, i) => (
          <NumChip key={N - i} n={h.n} color={h.color} />
        ))}
      </div>

      {/* red / black / green tote — red left, black right */}
      <div className="ac-rb">
        <div className="ac-rb-cell red">
          <span className="ac-rb-k">RED</span>
          <span className="ac-rb-v">{red}</span>
          <span className="ac-rb-p">{pct(red)}%</span>
        </div>
        <div className="ac-rb-cell green">
          <span className="ac-rb-k">0{wheelKey === "american" ? "/00" : ""}</span>
          <span className="ac-rb-v">{green}</span>
          <span className="ac-rb-p">{pct(green)}%</span>
        </div>
        <div className="ac-rb-cell black">
          <span className="ac-rb-k">BLACK</span>
          <span className="ac-rb-v">{black}</span>
          <span className="ac-rb-p">{pct(black)}%</span>
        </div>
      </div>
      <div className="ac-rb-bar">
        <span className="seg-red" style={{ flex: red / rbTotal }} />
        <span className="seg-black" style={{ flex: black / rbTotal }} />
      </div>

      {/* even-money + dozen/column tallies */}
      <div className="ac-tallies">
        <Tally label="odd · even" a={odd} b={even} la="odd" lb="even" />
        <Tally label="low · high" a={low} b={high} la="1–18" lb="19–36" />
        <div className="ac-triple">
          <span className="ac-triple-lbl">dozens</span>
          {dozens.map((d, i) => (
            <span key={i} className="ac-triple-cell">
              <em>{i + 1}st</em>
              <b>{d}</b>
            </span>
          ))}
        </div>
        <div className="ac-triple">
          <span className="ac-triple-lbl">columns</span>
          {columns.map((c, i) => (
            <span key={i} className="ac-triple-cell">
              <em>c{i + 1}</em>
              <b>{c}</b>
            </span>
          ))}
        </div>
      </div>

      {/* hot / cold */}
      <div className="ac-hotcold">
        <div className="ac-hc">
          <span className="ac-hc-k hot">HOT · most hits</span>
          <div className="ac-hc-row">
            {hot.length ? hot.map((x) => <NumChip key={"h" + x.n} n={x.n} color={colorClass(x.n)} sub={x.hits} />) : <span className="dim">—</span>}
          </div>
        </div>
        <div className="ac-hc">
          <span className="ac-hc-k cold">COLD · longest dry</span>
          <div className="ac-hc-row">
            {N ? cold.map((x) => <NumChip key={"c" + x.n} n={x.n} color={colorClass(x.n)} sub={x.drought} />) : <span className="dim">—</span>}
          </div>
        </div>
      </div>

      <div className="ac-foot">Descriptive only — hot/cold say nothing about the next spin. Every number stays 1/{wheel.seq.length}.</div>
    </div>
  );
}
