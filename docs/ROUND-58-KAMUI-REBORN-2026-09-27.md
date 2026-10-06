# ROUND 58 — KAMUI REBORN (2026-09-27)

**The owner's ask:** bring back the dimensional traversal as a *designed* system — Obuto Uchiha's Kamui studied, real physics researched, and the teleportation rebuilt around the owner's three-phase vision: (1) a highly compressed gravitational field arms and attracts everything nearby in a bending, swirling motion, (2) the swirl turns violent and the portal opens, (3) the destination arrives — diary, vault, galaxy, or the multiverse itself. Plus: a direct jump between any two cosmic bodies, because distance should be skippable.

**The engine this replaces:** Round 57's plain zoom (the kamui purge left every traversal as a dial ride). That ride survives — it is now the camera motion *underneath* the jutsu, and the reduced-motion path.

## What was built

**`src/engine/systems/kamuiPhases.ts`** — the beat machine contract: `ARM → PULL → VORTEX → COLLAPSE → THROAT → EJECT → SETTLE`, per-profile adaptive durations (portal ≈ 2.6 s, dive ≈ 3.2 s, jump ≈ 3.7 s, warp ≈ 4.7 s; reduced ≈ 0.9 s, no tunnel), phase weights, and the signature ramp (violet → magenta → orange → gold → white-hot).

**`src/engine/systems/kamui.ts`** — `KamuiDirector`, the single owner of a traversal: `fire(spec)` / `update(ctx)` / `cancel()`. Owns the driven values (surface tear, FOV envelope, body-field strength, reverse flag, ramp mix), the camera-riding tunnel, and the throat quad (the salvaged ragged-event-horizon shader, now wearing the ramp as the throat opens). Fires `onSwap` at mid-throat (the hidden stage flip) and `onArrive` at the eject (the overlay/reveal contract).

**Shader salvage (from `35b3ba2c`, proven live before the purge):** the nearest-first vortex suction chunk for every point cloud, the log-spiral vacuum warp on the backdrop + universe surface, planet/cloud/atmo/ring deformation + tear cracks, the multiverse-boundary swirl, the photo-dome erase fade, the Demon Core crack overlay.

**The region body field (new, the owner's "even the anchor star"):** bodies inside the field radius are drawn toward the tear with a tidal shear (radial + tangential swirl), applied additively on top of the raw Kepler position every frame — exactly zero at rest. The anchor star leans in too.

**Wiring:**
- **portal** — planet/vault/nebula click: field arms at the body, shell caves (`uTear`), diary/vault arrives on the eject. Closing replays the jutsu *in reverse* (re-form → eject → settle).
- **warp** — `zoomToMultiverse` / hierarchy stage 0–1 / `zoomToCore` / `zoomToDemonCore` / `resetView` from the other side / `enterGalaxy` from the multiverse / the multiverse-floor push: the stage swaps at mid-throat, the dial rides the scripted fold.
- **dive** — galaxy click: a local tear at the galaxy's center while the camera dives into its stellar system.
- **jump** — NEW `jumpTo(id)` + Command Palette **"Kamui Jumps"** section: tear open where the traveler stands, eject at any body or galaxy of the active reality. Distance is irrelevant.

**THE LAW (restored + enforced by the gauntlet):** other realities do not exist for a reality. The dial hits the membrane at `WEB_CEILING` and can only shimmer (`membraneShimmer` — pushing at the wall glows, never crosses). `WEB_EDGE_TRIGGER` is gone; the only bridge is Kamui.

## Verify

- `scripts/round18-kamui-gauntlet.ts` (NEW, in the verify pipeline): beat-chain order, weights in range, reduced total < 1.2 s, adaptive profile ordering, ramp validity, the log-spiral warp returning unit directions over 1,000 samples (worst |d|−1 ≈ 2e−16), nearest-first monotonic suction, bounded body field, all four profiles wired, and THE LAW.
- `npm run verify` — typecheck + round16 + round17 + round18 + smoke green (smoke's reference frame unchanged: idle carries zero kamui energy).
- Note: round17's R56c capture-sweep check belongs to the parallel Round-58 capture redesign and is owned there.

## Physics & canon sources

See `docs/KAMUI-RESEARCH.md` — Kamui's two modes and the linked dimension (Narutopedia, Game Rant), Keplerian shear, Lense–Thirring frame dragging, TDE spaghettification, Morris–Thorne exotic-matter throats, white holes, ER=EPR.
