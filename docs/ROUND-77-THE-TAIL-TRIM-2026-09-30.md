# ROUND 77 — THE TAIL TRIM (2026-09-30)

The author, looking at R73's vault-Kamui telemetry: the Kamui is "a bit
boring from user experience… the most boring part is when the vortex
becomes mature" — and highlighted the **4.85s → 5.25s** row, the stretch
where the vortex is fully formed and only stabilizing before the throat
lets go. The law: **make that timeline a bit short.**

## What that window actually was

The summon's beat machine (`kamuiPhases.ts`): the build beats — rip,
wind-up, flicker, deepening — run 0 → 3.7s; the throat beat ran
3.7 → **5.5s**, and the vacuum window (the drain the telemetry measured)
was its last **1.5s**. The camera hold (`KAMUI_ENTRY_HOLD`, pinned to the
same 5.5 by the R67 law — hold expiry = last-beat completion) meant the
vortex sat **mature and merely stabilizing for the better part of a
second** before the vault opened at ≈5.65s. That plateau was the bore.

## The trim — the show keeps every frame, the plateau goes

| Constant | Was | Now |
|---|---|---|
| `KAMUI_TRIGGER_DURATION` | 5.5s | **5.0s** |
| `throat` beat | 3.7 → 5.5 | 3.7 → **5.0** |
| `KAMUI_VACUUM_WINDOW` (the drain) | 1.5s | **1.0s** |
| `KAMUI_ENTRY_HOLD` (R67 follows the trigger) | 5.5s | **5.0s** |

- The build beats are **untouched** — every frame the author found worth
  watching still plays, full speed, same spans.
- The drain is the **same surge machinery** (uVac, rumble, size drain —
  the R73 guard untouched) compressed into 1.0s: the gulp still starts at
  ≈4.0s, finishes at 5.0 instead of 5.45, and the highlighted
  4.85 → 5.25 stabilization stretch shrinks with it.
- The seam law holds: the throat still overlaps the deepening beat
  (3.7 < 4.35), so the forming vortex never blinks at the seam.
- The eject (`KAMUI_REVERSE_DURATION` 1.9s) is untouched.

## Live verification

Drove a real vault Kamui in the running app and recorded the machine
frame-by-frame: hold and Kamui count down in lockstep 4.9 → 0.1 across
**5.0s**, and the portal fires at machine + **5.3s** — against the old
hold 5.5 / vault-open ≈5.65. The vortex matures at the same moment it
did, and the vault now takes it ~half a second sooner. Round18's gauntlet
pins were reconciled consciously (5.0 / 1.0 / 5.0) — the beat-table
structure itself was never pinned and is unchanged.

## Verification status

`npm run verify` ALL GREEN — typecheck; round16/17/18/63/72/73/74/75/76
gauntlets; smoke + prod-smoke.

## Watch item

The test harness observed a click-to-arm latency of up to ~2.7s right
after a reverse Kamui's unwind (a beginPortal refused while the vortex was
still live, and the retry surfaced late). The machine itself runs clean;
if a traveler ever feels a "dead click" immediately after closing a diary
or the vault, that refusal window is where to look — its own small round.
