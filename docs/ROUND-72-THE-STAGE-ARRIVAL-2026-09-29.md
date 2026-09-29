# ROUND 72 — THE STAGE ARRIVAL (2026-09-29)

The user's law: **the multiverse Kamui must stop the way the reverse Kamui
stops — naturally, gradually — never in one frame.** Entering the multiverse
giant sphere played the tear over a scene that had already been swapped and
had already stopped moving, and then everything died out at once. The
traveler read it exactly as they said it: *"everything stops suddenly, no
gradually."* The same session named the second law: **the reverse come
belongs at the cosmic web ⇄ multiverse boundary only** — the return must
write the traveler back into the cosmic web (where every galaxy stays
choosable), never into the home stellar system, and no Kamui may be added at
the home page.

## The old timeline (membrane summon — web → multiverse)

| t | what played |
|---|---|
| 0 (same frame) | the tear fires, `cosmicStage` flips **wholesale** (the web vanishes, the giant hypersphere + glass marbles pop in), and the dial is released to the arrival framing |
| 0 → ~1.5 s | the rig's damp covers ~95% of the dial travel while the tear is still rising |
| ~1.5 → 4.0 s | the vortex crests over a scene that is already static — dead theater |
| 4.0 → 5.5 s | the throat surges (vacuum, rumble) |
| 5.5 s | expiry → unwind → everything stops at once |

The arrival *was the frame-0 pop*; the ending was a surge-then-drop with
nothing else moving. The body portal never had this problem because R67
gave it a hold, a handoff, and an unwind — the membrane crossing simply
never received that grammar.

## The chosen fix — THE STAGED STAGE-WARP (the R67 grammar, carried to the membrane)

`beginStageWarp` no longer folds the stage in the same frame it fires the
tear. A small machine (`stageWarp`) stages the crossing:

- **THE SUMMON (into the multiverse):** the traveler's own stage stays on
  screen and the dial is pinned exactly where they left it (re-pinned every
  frame, zoom momentum killed — the mirror of the portal's `portalHold`) for
  the full `KAMUI_ENTRY_HOLD` choreography. The moment the hold expires —
  the same frame the summon's throat completes — **THE THROAT HANDS THE
  STAGE OVER**: `cosmicStage` flips, the dial is released to the arrival
  framing, and the deferred orbit/pan changes apply. The multiverse
  materializes *through* the dying vortex; the R67 unwind riding the glow
  and the rig's own exponential damp land the stop **gradually** — the
  eject's own stop shape, applied to the arrival.
- **THE EJECT (back to the web):** untouched by design. It bursts at full
  strength on frame one (which masks the swap) and its own 1.9 s decay IS
  the gradual stop — the frame the traveler called good. It hands over
  instantly, exactly as before.
- **THE LIVENESS GUARD:** a warp that is already playing — or any live
  vortex / portal — refuses a new crossing. The old same-frame path would
  re-fire the tear mid-tear when a stepper chip was pressed during a summon.
- **THE STILL FRAME STAYS STILL:** the marble focus (and its sideways
  re-aim to the bubble) is withheld until the handover
  (`realityFocusLive`), so the hold plays against an unmoved framing — the
  same discipline that killed the portal's pendulum sweep.

## The second fix — THE REVERSE COME ANSWERS THE SAME PUSH

`RETURN_ZOOM_VEL` asked −0.05 dial/s of inward scroll while the outward
crossing asks +0.02 — the way home cost **twice the effort**, so a normal
scroll pinned at the multiverse floor with no crossing and no feedback,
which is why the reverse come read as *"there is no existing of reverse
come."* It now asks −0.02, matched to the way out. One threshold
recalibrated; nothing removed. **The landing is untouched:** the floor
return still ejects to the cosmic web dial (0.72) with `realityFocused`
cleared — the traveler is written back into the web where any galaxy can be
chosen next, never into the home stellar system.

## The laws honored

- No Kamui was added anywhere except the membrane: return-home (`H`),
  zoom-to-system, and the galaxy-stepper hops keep their plain glides.
- `KAMUI_TRIGGER_DURATION`, the beat choreography, `KAMUI_VACUUM_WINDOW`,
  `KAMUI_ENTRY_HOLD`, the swallow law and the eject are untouched.
- round18's pins survive verbatim (the `beginStageWarp` signature, the
  `this.triggerKamui(undefined, dir === 'toWeb');` line, the bare
  `triggerKamui();` count of 3).
- The frozen architecture-audit snapshot was NOT re-taken: `audit:arch
  --check` exits 1 on this round's tip **and on the pristine parent** with
  the identical findings (the R52-baseline drift already recorded as
  conscious debt in PROJECT-BRAIN §8). R72 added zero new findings.

## The commit map (each step its own commit — `git log` maps them)

| Commit | What it does |
|---|---|
| step 1 | **THE STAGED STAGE-WARP** — the `stageWarp` machine, the staged summon with its hold and handoff, the instant-burst eject preserved, the liveness guard, the focus guard, both crossing gates refuse mid-warp |
| step 2 | **THE REVERSE COME ANSWERS THE SAME PUSH** — `RETURN_ZOOM_VEL` −0.05 → −0.02; the web landing (0.72) pinned by the gauntlet |
| step 3 | **THE STAGE ARRIVAL GAUNTLET** — 12 source invariants, wired into `npm run verify` after round63 |
| final | this document + PROJECT-BRAIN §8/§9 |

## Verification (honest)

- `npm run verify` — **ALL GREEN**: typecheck clean; round16/17/18/63/72
  gauntlets green; smoke + prod-smoke green (zero console errors).
- round18 Kamui gauntlet — green with the machine in place (all pins held).
- round72 gauntlet — 12/12.
- `npm run audit:arch -- --check` — exits 1, **pre-existing** (identical on
  the parent commit; every finding in files this round never touched).

## Watch items (deliberately left for a future round)

- The focus re-aim toward the traveler's reality marble now rides the
  arrival decay instead of hiding inside the vortex crest — same math as
  before, new timing. If a sweep is felt, the portal's `holdFocus`
  discipline is the ready answer.
- `beginGalaxyEntry`'s Kamui garnish still races its own zoom (the same
  same-frame shape this round fixed at the membrane) — its own round.
- The velocity-gated membrane crossings themselves (the R71
  explicit-crossing law lives on `r71-ten-slices`, unmerged) — untouched.
