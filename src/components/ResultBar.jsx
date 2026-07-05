import React from "react";
import { WHEELS } from "../wheels.js";
import { fmt } from "../ui.js";

// The paused-result bar shown over the felt after a spin: the landed number (as
// a coloured chip, matching the dealer puck now sitting on that number on the
// mat) and the NET for the round, inclusive of every bet on the felt. It holds
// until the next round begins (a spin, or touching the felt), so you get a clean
// "here's where it landed and here's what you won/lost" beat instead of an
// instant reset.
export default function ResultBar({ result, wheelKey }) {
  const { n, color, q, net, staked, returned } = result;
  const qid = WHEELS[wheelKey].quadrants[q].id;
  const v = Number(n);
  const isZero = color === "green";
  const tone = staked <= 0 ? "flat" : net > 1e-9 ? "win" : net < -1e-9 ? "loss" : "push";

  return (
    <div className={"result-bar " + tone}>
      <div className="rb-left">
        <span className={"rb-num c-" + color}>{n}</span>
        <span className="rb-meta">
          <b>{color.toUpperCase()}</b>
          {!isZero && (
            <>
              {" · "}
              {v % 2 ? "ODD" : "EVEN"}
              {" · "}
              {v <= 18 ? "1–18" : "19–36"}
            </>
          )}
          <br />
          <span className="rb-sub">{qid} sector · puck on {n}</span>
        </span>
      </div>

      <div className="rb-right">
        {staked > 0 ? (
          <>
            <span className="rb-k">net this round</span>
            <span className="rb-net">{net >= 0 ? "+" : "−"}{fmt(Math.abs(net))}</span>
            <span className="rb-detail">
              staked {fmt(staked)} · returned {fmt(returned)}
            </span>
          </>
        ) : (
          <>
            <span className="rb-k">no bets</span>
            <span className="rb-net">—</span>
            <span className="rb-detail">tracking only</span>
          </>
        )}
      </div>
    </div>
  );
}
