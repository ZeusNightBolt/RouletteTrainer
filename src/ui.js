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

// chip denominations offered by the bet console
export const CHIPS = [1, 5, 25, 100, 500];

// "$1,234.5" / "−$50" — money, cents only when needed
export const fmt = (n) =>
  (n < 0 ? "−$" : "$") + Math.abs(Math.round(n * 100) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 });

// "+26" / "−10" — signed integer-ish amount (P&L deltas)
export const signed = (n) =>
  (n >= 0 ? "+" : "−") + Math.abs(Math.round(n * 100) / 100).toLocaleString("en-US");

// "+1.35%" / "−5.26%" — signed percentage to 2 dp
export const pct = (n) => (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(2) + "%";
