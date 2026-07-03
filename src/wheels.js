// ---------------------------------------------------------------------------
// SOURCE OF TRUTH for wheel geometry. Everything (UI, engine, tests, docs)
// derives from this file. Sequences verified against Wizard of Odds
// (wizardofodds.com/games/roulette/number-sequence/) and Wikipedia "Roulette".
// test/verify.js asserts the structural invariants below on every CI run.
// ---------------------------------------------------------------------------

export const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export const WHEELS = {
  // American double-zero wheel — the standard Atlantic City main-floor game.
  // Clockwise pocket order. Invariant: every odd n (1..35) sits directly
  // opposite n+1 (index distance 19 mod 38). 0 and 00 are opposite.
  american: {
    key: "american",
    label: "American 00",
    seq: [
      "0", "28", "9", "26", "30", "11", "7", "20", "32", "17",
      "5", "22", "34", "15", "3", "24", "36", "13", "1", "00",
      "27", "10", "25", "29", "12", "8", "19", "31", "18", "6",
      "21", "33", "16", "4", "23", "35", "14", "2",
    ],
    zeroPockets: ["0", "00"],
    // Four contiguous arcs. 38 does not divide by 4, so the split is
    // 9 / 10 / 9 / 10 pockets — anchored so 0 opens Q1 and 00 opens Q3
    // (they sit opposite each other). Per-quadrant probability is therefore
    // NOT uniform: 9/38 = 23.68% vs 10/38 = 26.32%. The UI displays the
    // exact probability everywhere a quadrant is shown.
    quadrants: [
      { id: "Q1", start: 0, end: 8 },   //  9 pockets: 0 28 9 26 30 11 7 20 32
      { id: "Q2", start: 9, end: 18 },  // 10 pockets: 17 5 22 34 15 3 24 36 13 1
      { id: "Q3", start: 19, end: 27 }, //  9 pockets: 00 27 10 25 29 12 8 19 31
      { id: "Q4", start: 28, end: 37 }, // 10 pockets: 18 6 21 33 16 4 23 35 14 2
    ],
  },

  // European single-zero wheel. Clockwise pocket order.
  // 37 is prime, so the split is 10 / 9 / 9 / 9 — the zero arc gets the
  // extra pocket. Probabilities: 10/37 = 27.03% vs 9/37 = 24.32%.
  european: {
    key: "european",
    label: "European 0",
    seq: [
      "0", "32", "15", "19", "4", "21", "2", "25", "17", "34",
      "6", "27", "13", "36", "11", "30", "8", "23", "10", "5",
      "24", "16", "33", "1", "20", "14", "31", "9", "22", "18",
      "29", "7", "28", "12", "35", "3", "26",
    ],
    zeroPockets: ["0"],
    quadrants: [
      { id: "Q1", start: 0, end: 9 },   // 10 pockets: 0 32 15 19 4 21 2 25 17 34
      { id: "Q2", start: 10, end: 18 }, //  9 pockets: 6 27 13 36 11 30 8 23 10
      { id: "Q3", start: 19, end: 27 }, //  9 pockets: 5 24 16 33 1 20 14 31 9
      { id: "Q4", start: 28, end: 36 }, //  9 pockets: 22 18 29 7 28 12 35 3 26
    ],
  },
};

// French call bets — the real-world vocabulary for wheel-SECTOR betting on
// single-zero wheels (racetrack bets). Listed in wheel order. These partition
// all 37 pockets into 17 + 12 + 8. American wheels have no standard call bets;
// sector bettors there split chips straight-up across the arc, which is
// exactly what this trainer's quadrant bet does.
export const CALL_BETS_EU = {
  voisins:   ["22", "18", "29", "7", "28", "12", "35", "3", "26", "0", "32", "15", "19", "4", "21", "2", "25"],
  tiers:     ["27", "13", "36", "11", "30", "8", "23", "10", "5", "24", "16", "33"],
  orphelins: ["17", "34", "6", "1", "20", "14", "31", "9"],
};

export function colorOf(n) {
  if (n === "0" || n === "00") return "green";
  return RED.has(Number(n)) ? "red" : "black";
}

export function quadrantIndexOf(wheelKey, idx) {
  const qs = WHEELS[wheelKey].quadrants;
  for (let k = 0; k < 4; k++) if (idx >= qs[k].start && idx <= qs[k].end) return k;
  return -1;
}

export function quadrantSize(wheelKey, k) {
  const q = WHEELS[wheelKey].quadrants[k];
  return q.end - q.start + 1;
}
