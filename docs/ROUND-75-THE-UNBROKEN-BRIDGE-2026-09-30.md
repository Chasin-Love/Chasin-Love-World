# ROUND 75 — THE UNBROKEN BRIDGE (2026-09-30)

R74 put the herald card OUTSIDE the object's projected disk. That solved
"the card stands on the thing it heralds" and created a new journey: the
traveler's path from the disk to the card's own buttons now crosses empty
space. The user's law for this round: **the card is alive while the pointer
is on the disk, and it must STILL be alive when they arrive at its own
"Dive In" button** — the card used to die mid-path.

## What was wrong (traced, then fixed)

- The engine reports "not hovering" the moment the rim is crossed
  (`updateHover` re-picks only on pointer movement, and the leave is
  emitted once). App's sticky branch then armed a 550 ms goodbye.
- Crossing the rim **armed the goodbye on the crossing move itself** — so a
  traveler who paused in the gap (the whole point of walking to the card)
  watched the card die under a stationary pointer.
- The R75 keep-alive (cancel-on-move over card/corridor) fixed the traveler
  who kept moving, but a **full stop emitted no events**, so nothing
  cancelled the armed goodbye. A pause is silent; the goodbye had to be
  silent-proof.

## The bridge (App.tsx)

- **`hoverDiskRef`** — the last disk the engine emitted. A `null` disk never
  erases it: the corridor to the card stays bridged after the rim.
- **`pointerRef`** — the pointer's true resting place, fed by the
  window-level keep-alive on every move. A pause emits no events; the
  goodbye must be able to re-check where the traveler actually stopped.
- **`pointerOnBridge(x, y)`** — the two lifelines in one predicate: over
  the card's rect (±8 px grace) or inside the corridor between the disk's
  rim and the card (`rim + 48` — the card's near edge sits at rim + ~26, so
  a path that cuts the corner never reads as a goodbye).
- **THE HONEST GOODBYE** — every arm (`setTimeout(goodbye, 550)`, from the
  sticky branch and the keep-alive alike) fires into the same check: if the
  resting pointer is still on the bridge, the goodbye quietly re-arms;
  only a pointer that has truly left both lifelines takes the one shared
  `clearHoverCard()`. One goodbye, one clear path, honest at fire time.

## The click discipline (the live audit's settlement)

The interrupted session's live audit flagged "children computing
pointer-events: auto" inside a mounted card. The finding dissolved under
inspection: the flagged `DIV.flex items-center…` is the **lineage button's
own header** — a descendant of a real `<button class="pointer-events-auto">`,
inheriting its clickability. The adopted R74 design stands unchanged and is
now pinned by the gauntlet: **the shell is pointer-events-none throughout;
inside the herald cards only real buttons take clicks** (their content rides
along). Stripping the buttons would have made "Dive In" unclickable — the
audit's chunk-11 plan was a regression; chunk-12's reading was correct.

## The gauntlet — `scripts/round75-bridge-gauntlet.ts`

Eleven source invariants, wired into `npm run verify` after round74:
the bridge state (last-disk + resting-pointer refs), the null-disk keeper,
the shared `pointerOnBridge` predicate (card ±8, corridor rim+48), the
keep-alive feeding the resting pointer, the honest goodbye (every arm
re-checks, still-bridged re-arms, `clearHoverCard` has exactly one caller),
the shell root pointer-events-none, **every clickable region in all three
cards is a real `<button>`**, and the stem svg never intercepts.

## Live verification (the traveler's own galaxy, "Aurora Test Grand Spiral")

Driven on the live app with synthetic pointer moves against the engine's
own projected disk (center 640,360, r 106; card 762,205–1122,516; nearest
card edge 122 px past the rim):

| Checkpoint | Scenario | Result |
|---|---|---|
| Hover the disk | card mounts OUTSIDE the disk, stem plugged in | ✓ |
| **Rim crossing, then a full 1 s stop — zero events** | the exact kill of the old code (goodbye fired at 550 ms under a still pointer) | **✓ card alive** |
| Corridor hop (d 136), 650 ms stop | pause mid-crossing | ✓ card alive |
| Card's near half (d 163), 650 ms stop | pause on the card body | ✓ card alive |
| Arrive at "Dive In" (1060,432), 650 ms stop | the destination | ✓ card alive; `elementFromPoint` = the button's own label |
| Leave both lifelines, +900 ms | the goodbye must still exist | ✓ alive at +300 ms (sticky window), gone at +900 ms |

## Also settled this round

- The session's second named complaint — the "rivers" glitch — decoded from
  the transcript as **"reverse Kamui"**: the return trip must never land on
  the home page, always back in the cosmic web with the galaxies choosable.
  That is R72's law, already implemented, gauntlet-pinned and green
  (`round72-stage-arrival-gauntlet.ts`: "the reverse come lands in the web
  at 0.72"). Nothing new to build; the round document records the decoding.

## Verification status

`npm run verify` ALL GREEN — typecheck; round16/17/18/63/72/73/74/**75**
gauntlets; smoke frame (zero console errors, reference frame matches);
prod-smoke (the built dist boots).
