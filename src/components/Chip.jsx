import React from "react";
import { chipClass, chipFace } from "../ui.js";

// Polished casino chip rendered in SVG: a coloured rim carrying white edge spots,
// a domed (radial-gradient) face, an inner ring, a top gloss, and a soft drop
// shadow — so it reads as a real chip standing on the felt, not a flat disc.
// Shared by the mat and the wheel. Colours follow Atlantic City denominations;
// the red is a deeper crimson so a $5 chip never blends into the red felt cells.

// per-denomination domed gradient (light highlight → base → dark edge)
const TIERS = [
  { id: "red", light: "#f0637a", base: "#cf1d45", dark: "#8c0f2a" },
  { id: "green", light: "#5cc888", base: "#1f9b52", dark: "#0e5f31" },
  { id: "black", light: "#565e69", base: "#2b3139", dark: "#14171d" },
  { id: "purple", light: "#a878d6", base: "#6d3a9c", dark: "#431f66" },
  { id: "orange", light: "#f8c072", base: "#e2841f", dark: "#a4560a" },
];

// dropped once into each SVG's <defs>: the shadow filter + the tier gradients
export function ChipDefs() {
  return (
    <>
      <filter id="chipShadow" x="-45%" y="-45%" width="190%" height="190%">
        <feDropShadow dx="0" dy="1" stdDeviation="1.1" floodColor="#000" floodOpacity="0.55" />
      </filter>
      {TIERS.map((t) => (
        <radialGradient key={t.id} id={"chipg-" + t.id} cx="36%" cy="30%" r="72%">
          <stop offset="0%" stopColor={t.light} />
          <stop offset="52%" stopColor={t.base} />
          <stop offset="100%" stopColor={t.dark} />
        </radialGradient>
      ))}
    </>
  );
}

export function PlacedChip({ cx, cy, r = 12, amount }) {
  if (!amount) return null;
  const cls = chipClass(amount); // "chip-red" …
  const tier = cls.slice(5);
  const face = chipFace(amount);
  // six white edge spots around the rim band
  const rr = r * 0.86;
  const seg = (2 * Math.PI * rr) / 6;
  const fs = r * (face.length > 3 ? 0.5 : face.length > 2 ? 0.58 : 0.68);
  return (
    <g className={"pchip " + cls} pointerEvents="none" filter="url(#chipShadow)">
      <circle cx={cx} cy={cy} r={r} className="pchip-rim" />
      <circle
        cx={cx}
        cy={cy}
        r={rr}
        className="pchip-spots"
        fill="none"
        strokeWidth={r * 0.28}
        strokeDasharray={`${(seg * 0.42).toFixed(2)} ${(seg * 0.58).toFixed(2)}`}
      />
      <circle cx={cx} cy={cy} r={r * 0.72} fill={`url(#chipg-${tier})`} stroke="rgba(0,0,0,0.28)" strokeWidth="0.5" />
      <circle cx={cx} cy={cy} r={r * 0.72} className="pchip-inner" fill="none" />
      <ellipse cx={cx} cy={cy - r * 0.26} rx={r * 0.44} ry={r * 0.22} className="pchip-gloss" />
      <text x={cx} y={cy + r * 0.03} className="pchip-text" fontSize={fs} textAnchor="middle" dominantBaseline="middle">
        {face}
      </text>
    </g>
  );
}
