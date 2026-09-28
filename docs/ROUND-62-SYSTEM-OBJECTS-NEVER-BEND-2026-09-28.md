# ROUND 62 — SYSTEM OBJECTS NEVER BEND (2026-09-28)

**The user's report**: the lensing is good, but with consequences — the
asteroid belt is *sucking toward* the gravitational lens. Screenshot: the belt
dust streams off its band toward the hole, tearing into arcs, with a ghost
golden ellipse floating mid-sky next to it.

## Root cause — the lens was bent foreground content

Round 52 gave every point cloud built by `makePoints` the lensed vertex shader
(`POINTS_VERT_LENSED`): lift to world space, bend the direction from the
camera, capture-mirror captured rays. That was written for the SKY — but
`makePoints` also builds **system-local** clouds:

- the home asteroid belt's **dust** (4,800 specks) — while its **rocks**
  (instanced meshes, no lens) stayed rigid on the band;
- every inner system's belt dust, the anchor star's two captured-starlight
  halos and the inner stars' halos, nebula dust fields, marble spirals,
  reality halos, demon embers, multiverse boundary points, planet surface
  particles.

So when the hole's lens was on stage, the dust bent (Schwarzschild bend +
capture mirror) while the rocks it belongs to did not — a tear, not optics.
The ghost ellipse is the capture mirror: a captured direction has no image,
and `lensBendWorld` mirrors it to `cameraPosition − delta`, flinging
foreground dust to the far side of the sky.

## The law: system objects never bend

- `pointsVert` (shaders.ts) now compiles the bend **only under
  `#ifdef LENS_WORLD`**; without the define it is byte-for-byte the old
  no-lens path (`modelViewMatrix`).
- `POINTS_VERT_LENSED` = `#define LENS_WORLD` + the lens chunks + `pointsVert`.
- `pointsMaterial(px, twinkle, lens = false)` picks the shader — **rigid by
  default**; `makePoints` passes the flag through.
- Exactly **10 cosmic sky clouds opt in** (`lens = true`): the milky band,
  the marble spiral, both galaxy-disc sprays, the colliding pair, the
  supercluster streams, the web filaments, web knots, web hubs, and the
  cluster star field. Everything else — belts, star halos, nebula dust,
  embers, marbles, boundary points, planet particles — is rigid.

The sky still bends completely: dome, photo dome, star shells (USM) and the
lenized cosmic clouds share the same uniform objects, so one `setLenses()`
moves every sky layer together. A belt now holds its band from every angle;
the hole bends what is *behind* it, never what belongs to a body.

## Guardrails

- round17 R52 check updated for the define-gated composition.
- Two new R62 checks: the rigid default (both `makePoints`/`pointsMaterial`
  carry `lens = false`), and exactly 10 sky opt-ins.

## Addendum — "the hole is nowhere" (camera memory, same round)

While verifying the belt fix live, the user reported the hole missing from the
sky entirely. Root cause: the R61 **camera memory** saved only the orbit
TARGETS (theta/phi/zoomT) — not what the view orbited and not the rig's current
channels. Two failures compounded:

1. **The subject was lost.** A hole composition (phi ≈ 1.05, close zoom,
   focused on Eventide) restored around the ORIGIN: the hole orbits ~250 units
   out and never entered the frame. The memory now carries `focusId`, re-bound
   on boot only when the body exists in the rebuilt roster.
2. **The restore eased in from nowhere.** Only targets were restored, so the
   rig eases from its constructor default (a huge distance); the engine's
   focus auto-release (`dist() > 1200`) un-binds a focus before the camera
   arrives. The memory now stores the FULL rig snapshot (current + target
   channels) and the boot applies it with `rig.restore()` — a hard cut, the
   camera starts AT the saved view.

Legacy records (targets-only, or without a focus) are purged on first read —
they describe a view that can no longer be reconstructed. Verified live:
focusing Eventide → idle checkpoint writes `{focusId: 'eventide', all 6
channels}` → reload → boot restore re-binds the focus.

## Verification

- `tsc --noEmit` exit 0; round16 / round17 / round18 gauntlets GREEN.
- `scripts/smoke.ts` GREEN — hole frame unchanged vs reference (shadow
  **0.289 vs 0.290**, zero console errors): the march and the
  sky path are untouched; only system clouds stopped bending.
- New R17 checks: the rigid-cloud default, the exact 10 sky opt-ins, and the
  focus-carrying camera memory.

## Next candidates

- The belt dust could still be *attracted* physically (Living Gravity already
  models mutual gravity) — but it must never bend *optically* while its rocks
  don't. If real infall is ever wanted, both rocks and dust must follow the
  same N-body field.
- `lensBendWorld`'s capture mirror exists for the sky (no image at all); if
  any future foreground layer is lenized, it must clip captured rays instead
  of mirroring them.
