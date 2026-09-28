# ROUND 63 — THE ABSOLUTE VOID AND THE SOURCE'S BLAZE (2026-09-28)

Two laws from the user, one renderer:

1. **THE VOID LAW** — the black part of the black hole is a hole torn in the
   surface of the universe by colliding cosmic waves and energy release. It
   is absolute emptiness: nothing inside it reaches the eye, so it must read
   as absolute darkness. No mirror, no haze, no sky showing through.
2. **THE BLAZE LAW** — the yellow-white energy flows must pour over that void
   exactly like the reference (`webgpu-black-hole`), soft and thick. And the
   bending must never be a geometric cutout — no sphere/box region with its
   own private background; the live space surface itself bends, like a
   whirlpool (the ice-cream-cone-in-water law). No layers, ever.

## What was wrong (found by measurement, not guessing)

The marcher was already a line-for-line port of the source's shader (same
`bend = rs·lensing/r²` law, capture 1.01·rs, blackbody LUT, Doppler D³,
turbulence). The look diverged for four reasons:

1. **The sky showed through the void** — the march's early-out gate
   (`b ≤ diskOuter + 2.5`) sat INSIDE the true shadow whenever the panel's
   diskOuter was low or mass high (the lensing multiplier grows the shadow);
   and step-budget burnout exited transparent. Both pasted the live bent sky
   inside the shadow — the "mirror".
2. **The blue film wash** — the turbulence film leaks ~0.6% opacity per disk
   crossing, and this pipeline gamma-encodes twice (the quad's gamma step +
   the composer OutputPass), lifting that residue into a ~40%-bright blue
   haze. The source single-encodes, so its film stays invisible.
3. **Bloom** — the source's soft blaze is its post-processing: strength
   0.68 / radius 0.2 / threshold 0.4 (main.js verbatim). Ours ran threshold
   0.90 with strength ~0.6 — thin and hard.
4. **Resolution** — while a hole was on stage the composer dropped to 0.5×
   pixel ratio: the blocky pixelated band and the arcs broken into dots in
   the user's screenshot.

## What changed (each step its own commit — `git log` maps them)

- **Commit 0** `r63-baseline` — the state before this round's look work
  (the void seals from earlier in the round: `uCriticalB` gate, budget
  burnout → capture, the captured-pixel luminance knee, `criticalImpactParam`
  TS mirror, probe + gauntlet). The undo point.
- **Commit 1** — the source's bloom on stage: strength eases to 0.68,
  radius to 0.2 (his main.js values), relaxing when you fly away.
- **Commit 2** — on-stage resolution floor 0.5 → 0.8: the flow renders
  continuously; the R53 frame-budget breaker stays as the safety net.
- **Commit 3** — the source's appearance trio on the tuning panel: Inner
  Softness (0.18), Outer Softness (0.5), Arc Sharpness (7.4) — his ui.js
  ranges verbatim, wired store → uniforms → sliders. (His "thickness"
  sliders are dead config — his shader ignores them — so Arc Sharpness
  carries that slot.) Mass / Grav. Lensing / Doppler Beaming / Inner / Outer
  Radius were already live on the panel with his labels.
- **Commit 4** — calibration + docs (this file).

## The calibration the data forced

His bloomThreshold 0.4 does **not** port. Our pipeline double-encodes (the
quad's gamma step + OutputPass) and lifts every mid-tone; measured on the
GPU probe, his 0.4 here floods the void to **0.65** luminance — the shadow
glows away. Our 0.90 admits the equivalent energy: interior **0.26–0.33**
against the reference's own **0.33** (dimmest-6 interior, same measurement).
The threshold stays 0.90 and the gauntlet forbids the easing.

A pre-bloom restore disc (swap the unbloomed frame back inside the shadow)
was also tried and removed: at close focus its disc covers the whole screen
and washes every flow out — the "washed" look in the user's screenshot. No
post-process mask ever touches the frame now; the void is black at the
source and the blaze rides bloom.

## Size

Unchanged — the hole is already the "bit smaller side character" (radius
2.6, its own orbit around the anchor) versus the source, where the hole is
the whole subject. The panel's Mass slider scales it live for anyone who
wants it bigger or smaller.

## Verification

- `npm run typecheck` — clean.
- `scripts/round63-void-gauntlet.ts` (in `npm run verify`) — ALL GREEN.
- `scripts/round63-void-probe.ts --gate` (real-GPU headless, focuses the
  Eventide hole through the engine API, measures 12 angles per ring):
  void mean **0.326** vs the reference's own **0.33** · blue−red **−0.015**
  (warm, film dead) · flow max **0.976** · ring mean **0.726** — GREEN.
- `npm run smoke` — GREEN, zero console errors, the system-view reference
  frame unchanged (the on-stage bloom easing never touches it).

## Undo map

```
git log --oneline            # see the R63 commits
git revert <commit>          # undo exactly one step
git checkout <commit> -- .   # or restore files from any point
```
