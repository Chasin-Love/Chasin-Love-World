# ROUND 64 — THE SOURCE PORT (2026-09-28)

The user's six goals, executed literally, each one its own commit:

> 1. go to the source project & gather everything · 2. gather the black hole
> & gravitational lensing, then DELETE this black hole · 3. tighten every
> leak & loose end & error that forced the deletion · 4. add the new black
> hole, lensing & logic · 5. join all the wires · 6. check & verify
> everything, and rest.

## The commit map (the undo table)

| Commit | Goal | What it does |
|---|---|---|
| `cf272d49` | 1 — GATHER | `docs/PORT-SPEC-webgpu-black-hole.md`: the whole source read function-by-function (march, disk math, color pipeline, full parameter table) |
| `99cede5d` | 2 — DELETE | **THE OLD BLACK HOLE IS DELETED** — `blackholeRaymarch.ts` became the hidden-visual wiring stub; the app ran hole-less; round17/63 re-pinned (fixed a stale `0.42` bloom pin that had been silently red) |
| `f1ae5056` | 3 — TIGHTEN | No on-stage resolution drop at base ratio ≤ 1 (the blocky-disk leak sealed); HiDPI eases to ≥ 0.7·base; the 55 ms breaker stays |
| `52173748` | 4+5 — ADD + WIRE | **The verbatim port** (below); Peak Temp + Temp Falloff joined to the panel; `uCriticalB` re-mirrored, goldens re-pinned; the wiring contract preserved so every vault body, the focus composition, the breaker, the tier switch and the sky-lens coupling re-attached unchanged |
| (this one) | 6 — VERIFY | Probe + smoke green; this document |

## What the gather proved (and what changed because of it)

- The source's march is **64 fixed steps × stepSize 1.0** — no adaptive
  stepping, no jitter (the README overstates). Bend `rs·lensing/r²` per unit
  path; capture 1.01·rs; escape 100; **exhausted = escaped** (his budget also
  exhausts long before r=100).
- **His own pipeline double-encodes** (in-shader `pow(1/2.2)`, then ACES +
  sRGB in his renderer — verified in three's `RenderPipeline.js`). Our
  pipeline was already structurally identical; the R63 "calibration" framing
  was wrong about the cause. The real deviations were ours: the adaptive
  step, the `uIntensity 1.35` crutch, the film knee, the resolution drop.
- His "thickness"/ring/density config keys are **dead code** — never read by
  his shader. Not ported. Arc Sharpness carries that slot on the panel.

## The port (commit 4+5), deviation by deviation

**Verbatim**: the march (fixed 1.0 steps, bend, capture, escape,
exhaustion=escaped), the disk color math (temperature, Doppler D³ clamped
0.1–5, β = 0.3/√(r/r_in), edge softness, cyclic-crossfade turbulence), the
121-entry blackbody LUT used raw, the in-shader `pow(1/2.2)`, front-to-back
premultiplied compositing.

**Kept seals**: escaped rays exit transparent (the whirlpool law — the live
sky continues the bend through its own 1/θ lens, no layers, no cutout), and
the `uCriticalB` gate covers the whole captured set (the sky can never show
through the shadow). `criticalImpactParam` re-mirrors the fixed-step
integrator; goldens re-pinned: `(rs, L) → b_c` = (0.8,0.5) 1.1259 · (0.8,1)
1.8209 · (0.8,2.4) 4.4974 · (0.8,3) 5.5046 · (6,1) 11.2215 · (6,2.4) 15.9346
· (6,3) 17.9564.

**Removed crutches**: the adaptive `MARCH_STEP` (his fixed step verbatim),
the `uIntensity 1.35` bloom-threshold crutch (his disk math feeds the
threshold bare), the R63 luminance knee (his film, unmodified — the
pipeline matches so the film matches), budget-burnout-as-capture (his
exhaustion semantics).

**Documented adaptations** (integration-required, not hacks): the coarse
approach leg (our camera reaches hundreds of units; his never leaves 31 rs),
camera-true ray generation (his fixed-90° FOV would break continuity with
the live sky lens — the two bend fields must share one projection), the
disk tilt (composition), the exact receding-and-clear early-out (pure
optimization).

**Bloom**: his strength 0.68 and radius 0.2 port verbatim on stage. His
threshold 0.4 does NOT — measured TWICE with the ported renderer (0.58–0.65
void flood against the reference's own 0.33): the threshold is
scene-dependent, not pipeline-dependent. His scene is a hole on black; ours
is a hole in a living universe. The calibrated 0.90 lands our void at
**0.265** — darker than the reference's own 0.33 — with the blaze at 0.98.

## Panel

Twelve live knobs now, his labels and ranges: Mass · Grav. Lensing · Doppler
Beaming · Inner Radius · Outer Radius · Brightness · Rotation Speed · Inner
Softness · Outer Softness · Arc Sharpness · **Peak Temp (kK)** · **Temp
Falloff** (the last two newly joined from his panel).

## Verification (goal 6)

- `npm run typecheck` — clean.
- round16 (sky lens law) · round17 (port pins) · round18 (Kamui) · round63
  (void seals, goldens, bloom, panel) — ALL GREEN.
- Real-GPU probe (`scripts/round63-void-probe.ts --gate`): void mean
  **0.265** (limits 0.38; the reference's own 0.33) · blue−red −0.008 (warm,
  film dead) · flow max **0.984** · ring mean **0.658** · void/ring 0.40 —
  **GREEN**, and the frame reads like the reference: fine continuous
  streaks, the thin dotted photon-ring arc, a dark warm void.
- `npm run smoke` — GREEN, zero console errors.

## Runtime escape hatches

Cinematic Lensing switch (Auto / Always On / Off) on the tuning card; the
frame-budget breaker; `git revert <commit>` for any single goal above.
