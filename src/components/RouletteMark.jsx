import React from "react";

// Mini roulette-wheel mark for the header (and mirrored as the SVG favicon in
// index.html). Alternating red/black wedges around a green felt hub with a lone
// white ball on the rim — unmistakably roulette at any size.
const RED = "#d23a33";
const BLACK = "#151515";
const N = 12;
const R = 45;
const rad = (d) => (d * Math.PI) / 180;

function wedge(i) {
  const a0 = (i * 360) / N - 90;
  const a1 = ((i + 1) * 360) / N - 90;
  const x0 = (50 + R * Math.cos(rad(a0))).toFixed(2);
  const y0 = (50 + R * Math.sin(rad(a0))).toFixed(2);
  const x1 = (50 + R * Math.cos(rad(a1))).toFixed(2);
  const y1 = (50 + R * Math.sin(rad(a1))).toFixed(2);
  return `M50 50 L${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1} Z`;
}

export default function RouletteMark({ size = 22, className = "" }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} role="img" aria-label="Roulette wheel">
      <circle cx="50" cy="50" r="49" fill="#e2b755" />
      {Array.from({ length: N }, (_, i) => (
        <path key={i} d={wedge(i)} fill={i % 2 ? BLACK : RED} stroke="#0b1310" strokeWidth="1" />
      ))}
      <circle cx="50" cy="50" r="18" fill="#1f7a4d" stroke="#e2b755" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="6.5" fill="#0b1310" />
      <circle cx="50" cy="7.5" r="4.6" fill="#f6f1e4" stroke="#0b1310" strokeWidth="0.8" />
    </svg>
  );
}
