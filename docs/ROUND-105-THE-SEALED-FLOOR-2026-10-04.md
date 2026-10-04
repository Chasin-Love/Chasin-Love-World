# ROUND 105 — THE SEALED FLOOR

> The author's decree, on the empty-multiverse bug report: *"when there are no
> reality in our project so it shouldn't be entered into a reality right but
> unfortunately when we go close or too close to the core itself it entered us
> reality although there is no Galaxy no planets just single anchor star …
> I want to totally delete that part of the logic that enter us into that
> thing. And obviously it shouldn't be entered into any reality just because
> we go too close to the core itself."*

## 0. TL;DR

Zooming hard into the heart of the multiverse — at the Astral Core — fired the
"multiverse floor return": the dial pushed through the floor and the engine
carried the traveler into a reality's cosmic web **with no reality existing**,
landing in the phantom view the author saw (empty web, no galaxies, no
planets, one default-palette anchor star resurrecting itself at the origin).
On the author's ruling (asked, answered: **delete entirely** — not merely the
empty case), the velocity-triggered crossing is deleted whole, the phantom
anchor can never exist without an active reality, and the floor is a wall.
Entering a reality is now exclusively the explicit Kamui doors: the marble
click (the R76 web door), the Command Palette, the hierarchy stepper. This is
the AGENTS.md R71 law finally enforced without exception: *zoom never crosses
cosmological slices; crossing is an explicit Kamui only.*

## 1. The diagnosis (verified in source before the blade)

Two unguarded writes cooperated to produce the bug:

1. **The auto-entry — the multiverse floor return** (`src/engine/engine.ts`,
   the tick's "THE LAW" block, old lines 2122-2129). On the multiverse stage,
   `tZoomT ≤ 0.802` (`MULTIVERSE_FLOOR_RETURN`) with inward
   `zoomVelocity < -0.02` (`RETURN_ZOOM_VEL`) fired
   `beginStageWarp('toWeb', 0.72)` — a zoom-velocity-triggered Kamui INTO the
   web stage. It had **no `activeReality` guard**: with zero realities
   (legal since R102) it entered the web of a nonexistent reality. It also
   contradicted its own block's comment ("the ONLY bridge between the stages
   is the Kamui, fired by explicit actions") — a survivor of the pre-R71-era
   grammar that the ten-slices law never reached.
2. **The phantom anchor star** (`engine.ts` `updateBodies`). `sysW` —
   `(1 - smoothstep(430, 860, currentDist())) * homeRealmW` — is driven by
   camera distance alone, and `anchorGroup.visible = sysW > 0.02` /
   `belt.visible = sysW > 0.02` ran every frame with **no active-reality
   guard**. `setReality(null)` hides the anchor once (R102); the per-frame
   write resurrected it. On the empty web stage (reached via the floor
   crossing) zooming below ~860 world units of the origin faded in the lone
   default-palette anchor star — *"no Galaxy no planets just single anchor
   star"*, the author's exact words.

Context that made the trap comfortable: in the empty multiverse the boot
framing (`realityFocused = true`, no active reality) degenerates the focus
parameters to the rig defaults (`focusMax = 3500`, cameraRig.ts) — the
traveler already rests deep inside the Astral Core's 20,000-unit glass shell,
so "very close to the core" is the resting state, one hard inward scroll from
the old crossing.

## 2. The changes

### 2.1 The crossing deleted whole — `src/engine/engine.ts`

- The floor-return block (comment + threshold/velocity `if` +
  `beginStageWarp('toWeb', 0.72)`) is **gone**. The reality-focus release and
  the soft floor clamp (`tZoomT < MULTIVERSE_FLOOR_CLAMP → setZoomTarget(0.8)`)
  remain: pushing into the core now stops at the membrane, the clamp is the
  last word. A decree comment records why (worded to avoid the deleted
  literals — the gauntlet reads raw source; R104's lib.rs lesson applied
  pre-emptively).
- The web→multiverse ceiling crossing (`zoomVelocity > 0.02` outward at the
  ceiling) is **kept untouched** — it *exits* to the multiverse, it never
  enters a reality. It is now the family's only velocity-gated crossing.
- Import line drops `MULTIVERSE_FLOOR_RETURN, RETURN_ZOOM_VEL`.

### 2.2 The phantom star dies with it — `src/engine/engine.ts`

- `this.anchorGroup.visible = !!this.activeReality && sysW > 0.02;`
- `this.belt.visible = !!this.activeReality && sysW > 0.02 && !birthDark;`
- The `sysW`/`homeRealmW` computation lines are **byte-identical** — round95's
  gauntlet pins them verbatim (realm hiding / the three-black-holes guard) and
  needed zero reconciliation. With no reality, `this.bodies` is empty anyway;
  the visibility gate covers the anchor, the belt, and the honest case of the
  web stage being reached by an *explicit* palette/stepper jump with no
  reality — the star must never fade in there either.

### 2.3 The dead thresholds die — `src/engine/systems/stageThresholds.ts`

- `MULTIVERSE_FLOOR_RETURN` (0.802) and `RETURN_ZOOM_VEL` (-0.02) deleted;
  the section header now says what is true: *"multiverse floor: a wall, not a
  door (R105)"*. `MULTIVERSE_FLOOR_CLAMP` and `REALITY_FLOOR` remain.
- `src/engine/stages/LevelStageSystem.ts` drops the dead import name.

### 2.4 The gauntlet reconciled — `scripts/gauntlets/round72-stage-arrival-gauntlet.ts`

The R72 gauntlet's section 5 pinned the deleted crossing verbatim
(`beginStageWarp('toWeb', 0.72)`) and section 6 pinned `RETURN_ZOOM_VEL`.
Consciously reconciled to the decree (the gauntlet serves the author, and the
round doc is the record):

- **5 (THE SEALED FLOOR)** — four checks: the two thresholds are absent from
  the engine family AND stageThresholds.ts; no `zoomVelocity <` condition
  reaches a `beginStageWarp('toWeb'` call (240-char window — measured against
  the real guard shape); the family's ONE velocity-gated crossing is the
  outward web-ceiling exit (`> 0.02`); the floor clamp line survives.
- **6** — folded into 5 (the threshold it pinned no longer exists).
- Header docstring records the reconciliation.

## 3. The receipts (R98 law: every negative proven by mutation)

**Gauntlet mutation (source):** the old crossing was temporarily reinstated
(constants + block) — the gauntlet went **3 RED** ("deleted whole",
"no inward-velocity condition", "one velocity-gated crossing"). The first
mutation run also caught a VACUOUS pin of ours: the 120-char window was too
tight for the real guard shape (~145 chars) and stayed green on the mutated
tree — widened to 240 with the measurement recorded in a comment, re-mutated,
red; reverted, ALL GREEN. Exactly the R98 lesson, caught in the act.

**Probe mutation (runtime):** the R102 independence probe gained the sealed-
floor receipt — after the empty-multiverse boot it drives the traveler as the
author did (30 sustained inward wheel notches at the floor, ~2.1 s) and
asserts the stage still reads `multiverse` and `anchorGroup.visible` is
false.

- On the FIXED tree: **ALL GREEN** (10/10, including both new R105 checks;
  capture `scripts/verify/independence/sealed-floor-hold.png`).
- On the MUTATED tree (old crossing temporarily restored): **1 FAILURE** —
  `R105: sustained inward pushes at the floor NEVER enter the web —
  cosmicStage=web`. The probe reproduces the author's bug on the old code and
  dies on it. Reverted; green again.

**Full chain:** `npx tsc --noEmit` clean; reconciled round72 gauntlet ALL
GREEN; **`npm run verify` exit 0** (typecheck + 22 gauntlets + smoke —
`SMOKE TIER — wasm`, frame pin `histL1 0.0716` vs the 0.12 max, zero console
errors — + prod smoke green). The smoke frame held: the deleted crossing only
fired on a hard multiverse-floor push, which the smoke's camera path never
makes. `npm run audit:arch -- --check` clean after an in-commit
`--snapshot` refresh (the probe's seam shifted line numbers).

## 4. What was intentionally NOT changed

- The **web→multiverse ceiling push** (zoom out hard at the web's ceiling →
  Kamui to the multiverse). It exits; the decree targets *entry by proximity*.
- The **explicit doors**: `zoomToHierarchy` (the R76 web door on a marble
  click, the palette's stage jumps, the MultiverseBar stepper), `resetView`,
  `zoomToSystem`, `enterGalaxy`, `zoomToCore` — all untouched, all still the
  lawful bridges.
- The **empty-multiverse resting framing** (focused-mode clamp at 3500 units,
  inside the Astral Core's shell) is pre-existing R102 behavior, not part of
  this decree. The traveler can admire the core from inside; the floor simply
  will never open.
- The R71 ten-slices branch work (`stageSlices.ts`) is untouched — that is
  its own ruling, still on its own branch.

## 5. Files

- `src/engine/engine.ts` — the crossing deleted; anchor/belt gated on
  `activeReality`; import trimmed; decree comment.
- `src/engine/systems/stageThresholds.ts` — two constants deleted; section
  rewritten ("a wall, not a door").
- `src/engine/stages/LevelStageSystem.ts` — dead import name dropped.
- `scripts/gauntlets/round72-stage-arrival-gauntlet.ts` — section 5 rebuilt
  as the sealed-floor negative pins (mutation-proven); header reconciled.
- `scripts/probes/round102-independence-probe.ts` — assertion 7 (the runtime
  sealed-floor receipt) + `sealed-floor-hold.png` capture.
- `scripts/architecture-snapshot.json` — refreshed (line shifts only).
- `PROJECT-BRAIN.md` §8/§9 — this round recorded.

## 6. For the author — how it behaves now

- **Empty multiverse:** boot lands on the sphere; zooming into the Astral
  Core stops at the membrane floor and *stays* on the multiverse. No web, no
  lone star, ever. Forge a reality and its marble appears; click it to enter.
- **With realities:** the push-through-the-floor gesture is gone for good.
  Enter a reality by clicking its marble (the Kamui web door), the Command
  Palette, or the hierarchy stepper. Zooming OUT of a reality's web at the
  ceiling still carries you back to the multiverse, as before.
