# ROUND 76 — THE STEADY HERALD & THE WEB DOOR (2026-09-30)

The author's two laws, straight from the session: **the hover card must be
stable enough to roam** — "I can't even roam my cursor on top of this
popup… if I want to click the left bottom side I can't, because even before
I go there it vanishes" — and **clicking a reality sphere must start the
Kamui and arrive on the Cosmic Web** — "it takes us directly to stellar
system, which is a problem from lack of logic".

## 1. THE STEADY HERALD — why the card vanished mid-roam

R75 kept the card ALIVE across the crossing, but its PLACEMENT was still
coupled to the live hover. The card body is click-transparent, so every
roam over it re-picks empty space; the engine then emits `onHover(null,…)`,
and App answered `setHoverDisk(disk ?? null)` — erasing the mounted card's
disk anchor. `placeHoloCard` fell back to the cursor-adjacent placement:
**the card teleported the instant the rim was crossed**, the stem
vanished, and every boundary graze between disk and empty space flipped the
card between two placements. A traveler aiming for where the card WAS now
crossed empty space outside corridor and card — the goodbye armed — a
pause — gone. That is the whole instability, end to end.

**The fix (one line of law):** the disk state is set only by a real disk
emission. A null emission never touches it; `clearHoverCard` — the single
shared goodbye — remains the only eraser. The mounted card keeps its
anchored placement and its stem for the whole journey; the honest R75
goodbye still ends it when the pointer truly leaves.

**Live verification** (the new reality's "Test One Grand Spiral", disk
r 125 px at screen center, card 781,205–1141,516): the card's rect is
bit-identical at all five checkpoints — anchored on disk → rim+6 crossing →
on card body → **roamed to the bottom-left corner (the author's exact
gesture)** → paused 700 ms there — alive at every one, never moved
(`cardNeverMoved: true`). The telemetry carries the proof of the old bug:
`hovering` flips to null at every post-crossing sample — precisely the
emissions that used to re-anchor the card onto the cursor.

## 2. THE WEB DOOR — the reality sphere click

`onSelectReality` ended in `engineRef.resetView()` — the home stellar
system, skipping every stage between. The explicit-crossing law (R71/R72)
already owns the carrier: `zoomToHierarchy(2)` from the multiverse stage
fires `beginStageWarp('toWeb', HIERARCHY_DIALS[2])` — the Kamui eject —
and lands on that reality's web.

**The fix:** the reality click now calls `zoomToHierarchy(2)`. The
reality switch itself is untouched (`actions.switchReality` → the
store's `setReality` sync is camera-neutral; a queued galaxy dive still
executes on the roster landing, unchanged).

**Live verification:** from the multiverse stage, a synthetic click on the
sol-prime sphere → the active reality switched, the Kamui fired, and the
camera landed at dial **0.858 — exactly `HIERARCHY_DIALS[2]`** — where the
scale label reads **COSMIC WEB**. No stellar-system dive.

## Gauntlets

- New `scripts/round76-gauntlet.ts` — nine source invariants: the disk
  state set only under `if (disk)`, the cursor-fallback re-anchor retired,
  exactly one `setHoverDisk(null)` (the shared clear), the web door wired
  to `zoomToHierarchy(2)`, `resetView()` gone from the door, the staged
  warp carrier and the shared dial table untouched, the R75 honest goodbye
  surviving. Wired into `npm run verify` after round75.
- Reconciled in place: round74's "App carries the disk state" check now
  asserts the steady-herald contract; round75's keeper check matches the
  evolved `if (disk) { … }` line (same law, same intent).

## Verification status

`npm run verify` ALL GREEN — typecheck; round16/17/18/63/72/73/74/75/**76**
gauntlets; smoke frame (zero console errors); prod-smoke.

## Watch items discovered on the way

- **The remembered camera can be a mid-dive placement.** A dive left the
  camera inside a galaxy; the camera memory saved it, and every reload
  booted inside the disc until `resetView()` forgot it. A save-time
  guard (never remember a dive/focus-clamped frame) is its own small round.
- A galaxy dive queued before a reality switch executes on the roster
  landing (`pendingGalaxyEntry`) — correct per R54, but it can surprise a
  traveler who queued it accidentally; worth a look in a later round.
