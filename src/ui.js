// Shared UI constants + formatters. Pure, DOM-free; keeps money/percentage
// formatting and the quadrant/chip vocabulary in one place so every component
// renders them identically.

// Spin animation length. Single source of truth: the CSS timings derive from
// the `--spin-dur` custom property (App sets it from this), and the JS timer
// that reveals the result after the ball lands uses the same value. Keep the
// two in lockstep by reading from here.
export const SPIN_MS = 16800;

// how long the winning result stays on the wheel before the felt returns
export const RESULT_HOLD_MS = 5000;

// playful "the ball is in play" verbs (Claude-Code-style gerunds) shown while
// the wheel spins. Pick one per spin with pickSpinWord().
export const SPIN_WORDS = [
  "Rolling",
  "Spinning",
  "Whirring",
  "Gallivanting",
  "Skedaddling",
  "Galloping",
  "Tumbling",
  "Moseying",
  "Careening",
  "Twirling",
  "Bouncing",
  "Ricocheting",
  "Rattling",
  "Scurrying",
  "Meandering",
  "Cavorting",
  "Frolicking",
  "Orbiting",
  "Traipsing",
  "Sashaying",
  "Vibing",
  "Noodling",
];
export const pickSpinWord = () => SPIN_WORDS[Math.floor(Math.random() * SPIN_WORDS.length)];

// quadrant → CSS class (palette lives in styles.css: --q1..--q4)
export const Q_CLASS = ["q1", "q2", "q3", "q4"];

// chip denominations offered by the bet console, in Atlantic City colours:
// $5 red · $25 green · $100 black · $500 purple · $1000 orange.
export const CHIPS = [5, 25, 100, 500, 1000];

// AC chip colour tiers, high → low. chipClass() returns the colour for an
// arbitrary bet total (the largest chip that fits it — how a real stack reads).
const CHIP_TIERS = [
  { min: 1000, cls: "chip-orange" },
  { min: 500, cls: "chip-purple" },
  { min: 100, cls: "chip-black" },
  { min: 25, cls: "chip-green" },
  { min: 0, cls: "chip-red" },
];
export const chipClass = (amount) => (CHIP_TIERS.find((t) => amount >= t.min) || CHIP_TIERS[CHIP_TIERS.length - 1]).cls;

// short chip face label: 1000 → "1K", else the number
export const chipFace = (amount) => (amount >= 1000 ? `${amount / 1000}K` : String(amount));

// "$1,234.5" / "−$50" — money, cents only when needed
export const fmt = (n) =>
  (n < 0 ? "−$" : "$") + Math.abs(Math.round(n * 100) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 });

// "+26" / "−10" — signed integer-ish amount (P&L deltas)
export const signed = (n) =>
  (n >= 0 ? "+" : "−") + Math.abs(Math.round(n * 100) / 100).toLocaleString("en-US");

// "+1.35%" / "−5.26%" — signed percentage to 2 dp
export const pct = (n) => (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(2) + "%";
