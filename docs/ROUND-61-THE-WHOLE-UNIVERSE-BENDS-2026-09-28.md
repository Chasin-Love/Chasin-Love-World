# ROUND 61 — THE WHOLE UNIVERSE BENDS (2026-09-28)

**The user's reports, in order**: (1) the black hole must never vanish when the
app closes; (2) it is a HOLE IN THE SURFACE OF REALITY — gradual well, no
layered bands; (3) lensing works… but only in Sol-Prime's home system. In every
other reality and every other galaxy the sky refuses to bend around the hole.

## Root cause of the Sol-Prime-only bug

Two rosters, one fed. Every real hole in the universe is built with the same
geodesic renderer (`attachBlackHole`), but the **sky lens** (`updateSpacetimeLens`)
read only `this.bodies`:

- **Sol-Prime** — Eventide and the other home worlds are built through
  `syncBodies`, which stamps `lensHalo = lensHaloFor(kind)` on every body.
  Their lenses reach the sky. ✓
- **Every other galaxy** — `buildGalaxyStageNode` builds a REAL isolated inner
  system per galaxy, and any vault there (the Eventide grammar, kind `'vault'`
  with `p.hole` = the geodesic renderer) is pushed into `sys.planets` — never
  into `this.bodies`, never a `lensHalo`. The hole rendered; the sky never
  received it. ✗

Secondary find: the constructor's boot path builds bodies via `buildBody`
directly (line ~825), and only `syncBodies` assigns the halo — so even a home
hole could boot without a sky lens until the first `setReality` resync.

## The fixes

1. **Cross-galaxy lens feed (the user's report)** — `updateSpacetimeLens` now
   feeds the 16 lens slots in two tiers: **every hole and vault first** (home
   roster + the inner systems of all galaxy-stage nodes), then ordinary
   masses. Inner-system holes pass the exact gate their renderer obeys
   (`node.inner.visible` — the <1,600-unit dive gate) and are measured in
   **world space** through the rotated galaxy node (`getWorldPosition`), so
   the well lands on the right patch of sky.
2. **One slot law** — the per-lens math (camera direction, silhouette rim
   `asin(R/d)`, halo multiplier, behind-view cull) lives in one writer,
   `pushSurfaceLens`, used by both rosters. No second law to drift.
3. **Halo fallback** — the lens feed derives holes' multiplier from
   `lensHaloFor(kind)` when the record's `lensHalo` was never stamped, closing
   the boot-path gap (halo is still *assigned* only in `syncBodies`; the feed
   no longer depends on it).
4. **The hole paints in the sky band** — `quad.renderOrder −80`, between the
   sky shells (−98) and the stellar system (0+): from no camera angle can the
   hole appear in front of the system.
5. **The one-law well** — `lensWellDarken` (x = ang/b_c, b_c = 2.5980762·rsA,
   1/x², C¹ zero at 4·b_c) consumed by dome, photo dome and all three star
   shells — the gradual 1→4 band, no layered steps.
6. **Camera memory** — the last resting view persists (localStorage) and is
   restored on boot; pagehide checkpoints it, so closing the window no longer
   loses the frame.

## The march is untouched

The hard constraint held: `blackholeRaymarch.ts` physics (bend −rs/r², capture
1.01·rs, disk LUT/Doppler) unchanged; smoke frame still matches the reference
(shadow **0.289 vs 0.290**, histL1 0.0091, zero console errors).

## Verification

- `tsc --noEmit` — exit 0
- round16 / round17 / round18 gauntlets — **GREEN** (round17 gains two R61
  checks: the one slot law, and the holes-first dive-gated world-space
  cross-galaxy feed)
- `scripts/smoke.ts` — **GREEN** (clean boot, reference frame matches;
  the previous run's `waitForFunction` timeout did not reproduce)
- package.json `verify` = typecheck + all gauntlets + smoke + prod:smoke

## Next candidates

- The 16-slot cap is now holes-first; a universe with >16 visible holes
  silently drops ordinary-mass lenses — acceptable, but worth a telemetry
  line if it ever bites.
- Ordinary stars/worlds of inner systems still carry no lens (only holes do
  there) — consistent with "only the surface in contact with the hole bends".
