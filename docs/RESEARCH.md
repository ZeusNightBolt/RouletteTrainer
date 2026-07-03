# Research notes — quadrant droughts, dealer signature, and what actually beats roulette

Scope: the claim under test is *"a wheel quadrant that hasn't hit in ~10 spins is due."*
This document separates (1) what the mathematics says, (2) what peer-reviewed and field
evidence says, and (3) what it would cost to detect a real quadrant bias if one existed.
Numbers marked **[verified]** are asserted by `test/verify.js` on every CI run.

---

## 1. The drought math

Spins are i.i.d. uniform over the pockets. For a quadrant covering *m* of 38 pockets,
p = m/38, and the probability it misses the next *k* spins is (1−p)^k regardless of history:

- 10-pocket quadrant, k = 10: (28/38)¹⁰ ≈ **4.72 %**
- 9-pocket quadrant, k = 10: (29/38)¹⁰ ≈ **6.71 %**

Two base-rate effects make droughts *feel* meaningful:

**Four hypotheses run in parallel.** You are not watching one quadrant; you are watching four.
In 600,000 simulated spins, a quadrant's live drought counter crossed 10 on **34,041** spins —
about once every 17.6 spins, i.e. 2–3 times per hour at a live table pace of ~45 spins/hr.
The longest drought observed was **50 spins** (51 on the single-zero wheel). **[verified]**

**The baseline isn't 25 %.** 38 ∤ 4, so the arcs are 9/10/9/10 pockets → 23.68 % vs 26.32 %
(single-zero: 10/9/9/9 → 27.03 % vs 24.32 %). Any hit-tally compared to a naive 25 % line
"finds" a ~2.6-point bias that is pure arithmetic. The app's χ² uses the exact per-quadrant
expectations. **[verified structurally]**

**The null, tested the only fair way.** Three bettors resolve the *same* spin stream, each
splitting one unit straight-up across a quadrant chosen before the spin: always-coldest,
always-Q1, and uniform-random. At 600 k spins all three converge on the house edge
(−5.26 % / −2.70 %), spread < 0.8 pt. **[verified]** If droughts carried signal, "coldest"
would separate. It does not — the drought counter is descriptive, not predictive.

Field corroboration: Croson & Sundali (2005), analyzing casino security footage of real
roulette players, document that bettors systematically increase wagers after streaks (both
gambler's-fallacy and hot-hand behavior) with no associated payoff difference.

**Variance vs. edge, made visible.** The app's Session Analytics card computes the closed-form
expected value of the exact bet mix each spin — `betEV`, asserted against theory to 1e-9 in
`test/verify.js` **[verified]** — and plots cumulative realized P&L against that expected line.
Over a short session the realized line swings far above and below expectation; the standard error
of the mean return falls as 1/√n, so the *gap* narrows with volume while the expected line's slope
(the house edge) never moves. This is the same distinction the χ² power table in §3 quantifies:
short samples are dominated by variance, and mistaking that variance for signal is exactly the
error the trainer is built to expose.

## 2. What has actually beaten roulette (and what hasn't)

**Physics-based prediction — real, peer-reviewed.** Thorp (1969) laid out the theory of
favorable-game exploitation; Thorp & Shannon built and casino-tested a wearable predictor in
1960–61 (Thorp, 1998). The Eudaemons repeated it with shoe computers in the late 1970s
(Bass, 1985). Small & Tse (2012, *Chaos* 22:033150; arXiv:1204.6412) showed that measuring
ball and rotor state *during the spin* shifts expected return from −2.7 % to roughly **+18 %**.
Common thread: the edge comes from measurement of the current spin's physics — never from
outcome history.

**Wheel bias — real, hardware-based, mostly extinct.** Joseph Jagger (Monte Carlo, 1873) and
the García-Pelayo family (1990s; Spanish courts ruled the practice legal) profited from
manufacturing defects detected across *thousands* of logged spins on a single physical wheel.
Modern low-profile pockets and rotation/maintenance schedules largely closed this.

**Dealer signature — no peer-reviewed support.** The claim (dealers release with consistent
speed, producing predictable landing sectors) exists only in practitioner literature
(Barnhart, 1992; L. Scott). No controlled study demonstrates exploitable release consistency;
ball scatter after the ball leaves the track is the standard objection (see Wizard of Odds'
treatments of sector betting and signature claims). Treat it as an untested hypothesis — and
§3 shows it is close to untestable at table data rates.

## 3. Detection cost: why you can't even test the hypothesis at the table

Suppose a dealer/wheel really pushed +5 points of probability into one quadrant
(23.68 % → 28.68 %). A χ² goodness-of-fit test (df = 3, α = 0.05) needs noncentrality
λ ≈ 10.90 for 80 % power, giving required sample sizes:

| True bias on one quadrant | Spins for 80 % power | Hours @ 45 spins/hr |
| ------------------------- | -------------------- | ------------------- |
| +5 pts                    | ~845                 | ~19 h               |
| +3 pts                    | ~2,347               | ~52 h               |
| +2 pts                    | ~5,281               | ~117 h              |

Monte-Carlo check: at n = 845 with a true +5-pt bias, the test detected it in **79 %** of
2,000 simulated sessions, with a **5.1 %** false-alarm rate on fair wheels — matching theory.

Atlantic City dealers rotate roughly every 20–40 minutes (~15–30 spins). The sample you can
collect under one stationary "regime" is two orders of magnitude short of the requirement, so
the signature hypothesis cannot reach statistical power before the regime changes. In trading
terms: the signal, if it exists, cannot be estimated within its own holding period.

The app's χ² readout is therefore framed honestly: with typical session lengths, values
outside the 95 % band are expected in 1 of 20 fair sessions by construction.

## 4. If you play anyway

- **Growth-optimal stake is zero.** Kelly (1956) allocates f* = 0 to any negative-EV bet
  (see also Thorp, 2006).
- **Target-hitting: bet boldly.** In subfair games, if you must convert a bankroll into a
  target, minimizing the number of times the edge taxes you is optimal — bold play
  (Dubins & Savage, 1965). Grinding small bets maximizes exposure to the edge.
- **Edge ranking.** AC even-money with half-back (−2.63 %) is the best-priced bet on a
  double-zero floor — it even prices better than *any* bet on a no-la-partage single-zero
  wheel (−2.70 %). Everything else is −5.26 %, and the basket is −7.89 %. Which quadrant you
  pick changes nothing **[verified]**.

## References

- Bass, T. (1985). *The Eudaemonic Pie.* Houghton Mifflin.
- Barnhart, R. T. (1992). *Beating the Wheel.* Lyle Stuart.
- Cohen, J. (1988). *Statistical Power Analysis for the Behavioral Sciences* (2nd ed.). Erlbaum.
- Croson, R., & Sundali, J. (2005). The gambler's fallacy and the hot hand: Empirical data
  from casinos. *Journal of Risk and Uncertainty*, 30(3), 195–209.
- Dubins, L. E., & Savage, L. J. (1965). *How to Gamble If You Must: Inequalities for
  Stochastic Processes.* McGraw-Hill.
- Kelly, J. L. (1956). A new interpretation of information rate. *Bell System Technical
  Journal*, 35(4), 917–926.
- Small, M., & Tse, C. K. (2012). Predicting the outcome of roulette. *Chaos*, 22(3), 033150.
  arXiv:1204.6412.
- Thorp, E. O. (1969). Optimal gambling systems for favorable games. *Review of the
  International Statistical Institute*, 37(3), 273–293.
- Thorp, E. O. (1998). The invention of the first wearable computer. *Proc. 2nd IEEE
  International Symposium on Wearable Computers*, 4–8.
- Thorp, E. O. (2006). The Kelly criterion in blackjack, sports betting, and the stock
  market. In *Handbook of Asset and Liability Management* (Vol. 1). North-Holland.
- Wheel sequences cross-checked against Wizard of Odds (wizardofodds.com) and standard
  references; structural invariants asserted in `test/verify.js`.
