# 🧠 PROJECT BRAIN — MY UNIVERSE (aka *Chasin Love World*)

> **Purpose:** the one file to hand to ANY AI (chat or coding agent) so it understands this
> project in one read — what it is, what it is NOT, where it stands, and where it is going.
> **Reference state:** `main` is the author's blessed reference at R107 commit `0723578d`.
> **Last updated:** 2026-10-05 after the author-authorized R106/R107 fast-forward;
> the merge is local and has not been pushed to `origin/main`.

> **Maintenance law:** at the end of every round, the agent of that round updates §8 (current
> state) and §9 (where it's going) of this file. A stale brain is a dead brain.

---

## 0. CONTRACT FOR THE AI READING THIS

1. **Read this file fully before answering anything.** Everything in it was verified against
   the repository and its history on the date above. Trust it over your priors.
2. **This project is unlike what it may superficially resemble.** Read §2 (what it is NOT)
   with the same care as §1 (what it is). Most AI failures on this project come from
   pattern-matching it to something generic.
3. **Never invent features, numbers, or file contents.** If something isn't in this file and
   you have repo access, go read the source. If you only have this file and a question,
   answer from it — and say plainly when the answer isn't here, rather than predicting.
4. **Weird-looking things are usually deliberate.** This project has dozens of decisions that
   look like bugs but are laws (see §6 and §10). Check §11's glossary and the round documents
   before proposing a "fix".
5. **The author is the final authority.** Several past changes were built, reviewed by the
   author, and reverted by explicit decision ("the user's call"). Re-proposing them without
   being asked is a failure.

---

## 1. WHAT THIS PROJECT IS

**10-second version:** an offline-first personal cosmos — a real-time 3D universe where the
author's life data is embodied as celestial bodies, with an encrypted vault hidden inside a
physically-accurate black hole. Built with React + raw Three.js + custom GLSL, runs in the
browser and as a Tauri desktop app.

**2-minute version:**

- **Planets are memories.** Every planet, dwarf, nebula and star in a reality carries a human
  meaning (`memory`, `dream`, `person`, `project`, `moment`, `idea`, `chapter`, `unresolved`).
  Each planet hosts a **living diary**; **every diary entry becomes a moon orbiting that
  planet**; every entry's mood feeds the star's aurora. This loop — *attention is gravity: what
  you look upon begins to orbit you* — is the thesis of the whole product.
- **The Anchor Star** is each reality's sun: a real-physics G2V star with convection
  granulation, sunspots, corona, and a sentiment-driven aurora. Its thermal and gravitational
  output governs the system.
- **The Eventide Black Hole** is the gateway to the **Universal Vault** — a real encrypted,
  copy-on-write filesystem (Argon2id + AES-GCM-256) with a Monaco code editor, a 21-command
  terminal, and sandboxed execution of JS / Python (vendored Pyodide) / HTML / PDF / ISO 9660 /
  ZIP. The black hole is a door, not decoration.
- **The Multiverse** holds parallel realities as glass marbles in a navigable void. Deleted
  realities collapse into the **Quantum Bin** (a real recycle bin on disk) — nothing is ever
  abruptly destroyed.
- **The physics is real, not fake:** Keplerian ellipses solved by Newton–Raphson, vis-viva
  velocities, Stefan–Boltzmann temperatures, Roche limits, Schwarzschild radii, gravitational
  time dilation. An 11-stage cosmological hierarchy (Multiverse → Cosmic Web → … → Stellar
  System) with a lore-complete lineage for the home reality.
- **The black hole renderer** is a verbatim, calibrated port of the
  `dgreenheck/webgpu-black-hole` reference (geodesic raymarcher, 121-entry blackbody LUT,
  Doppler-beamed accretion disk), with a zero-fail composite fallback beneath it.
- **Kamui** is the portal traversal engine (named for the Naruto space–time ninjutsu): the
  swirling-violet-to-white-hot sequence that carries the traveler between places and stages —
  into planets (diary), into the black hole (vault), and (since R71) explicitly between
  cosmological slices.

**Scale of the codebase:** ~150 code files, ~45k lines (the auditor's count, incl.
server + scripts). `src/engine/engine.ts` alone is ~7.0k lines (the orchestrator).
Strict TypeScript throughout.

---

## 2. WHAT THIS PROJECT IS NOT — anti-misconceptions

This section exists because AIs keep ruining the project by assuming one of these:

1. **NOT a game.** No score, no objectives, no NPCs. It is a personal instrument — a diary,
   a vault, and a cosmos that are one thing.
2. **NOT a website with a 3D background.** The universe IS the app. The React UI is an
   instrument panel over a live Three.js cosmos, not the other way around.
3. **NOT a generic Three.js demo.** Do NOT reach for react-three-fiber, drei, pmndrs
   ecosystems, or post-processing libraries beyond what's vendored. The stack is
   **raw Three.js + hand-written GLSL** — this is a hard architectural choice, not an
   oversight.
4. **NOT a cloud app.** No backend database, no cloud auth, no external services. Offline-first
   is a sovereignty law. The Express server only dev-hosts and mirrors reality folders to disk;
   the desktop app (Tauri) replaces it natively.
5. **NOT using a state library.** No zustand / redux / jotai. There is a custom observable
   store (`src/state/`) on `useSyncExternalStore`, with ALL mutations funneled through
   `src/state/actions.ts`.
6. **NOT decorative astronomy.** The numbers are the identity. Changing "magic numbers" that
   are actually measured calibrations or canonical seeds destroys the soul (see §10).
7. **NOT a code-gen template project.** The `src/realities/` content packs are path-locked and
   discovered by `import.meta.glob`. Moving files breaks discovery.
8. **NOT tolerant of dependency upgrades.** Pinning is deliberate (React 18.2, three 0.185,
   Tailwind 4.1, TS 5.9 strict). Do not chase versions mid-project.

---

## 3. THE THREE SACRED PILLARS (and the sacred loop)

If a change would damage one of these, stop and ask the author.

1. **PILLAR I — THE ANCHOR STAR.** Always `bodies[0]`, id `'anchor'`, kind `'star'`,
   undeletable. Double-click enters Core Mode. Its palette/aura comes from
   `RealityConfig.starColor`; diary moods drive its corona aurora.
2. **PILLAR II — THE WORLDS.** Planets = memories with a 41-field physics solve; the diary is
   alive: **entry → moon**, mood → aurora, writing streak → brightening streak-ring. Do not
   decouple diary from planet.
3. **PILLAR III — THE BLACK HOLE (Eventide).** Always `id 'eventide'`, kind `'vault'`,
   undeletable, mass 10 M☉, real relativistic physics, two-tier renderer with a zero-fail
   fallback, and the door to the vault (press `V` / click the body → Kamui portal → vault
   mode). Do not decouple vault from singularity.

The canonical home reality is **Sol-Prime** (`src/realities/solPrime/`) — a literal seed with
10 bodies (Cinder, Veil, Aurelia, Rust, Goliath, Mirror, Hollow, Wisp Nebula, Eventide + the
Anchor Star), 3 diary entries, and frozen cluster/galaxy literals. The full seed tables,
palettes, orbits and the entire shader library are embedded verbatim in `README.md`
Appendix A. **`README.md` is the single source of truth for reconstruction and creative DNA —
228 KB, built so the universe can be rebuilt from this repo alone.**
**R102 amendment — the home is a SHIPPED reality, not a load-bearing one.** Since R102 (author's
decree), every reality folder stands alone: deleting any of them — Sol-Prime included — leaves
the project fully functional, booting onto the empty multiverse sphere; purge leaves zero trace
of the deleted reality (container, payloads, session memory all die with it). The seed's
*content* is still canon (its tables, palettes, orbits); only its structural privilege is gone.

---

## 4. STACK & NON-NEGOTIABLE CHOICES

| Domain | Choice | Law |
| :-- | :-- | :-- |
| UI | React 18 + TypeScript 5.9 strict | `tsc --noEmit` is the type law |
| 3D | **Raw Three.js 0.185, custom GLSL** (`src/engine/shaders.ts`) | NO react-three-fiber, NO drei |
| Animation | framer-motion (imported as `framer-motion`, not `motion/react`) | |
| Styling | Tailwind CSS v4 (`@theme` tokens, glassmorphism) | |
| State | custom observable store, single mutation surface `src/state/actions.ts` | components never mutate directly |
| Bundler | Vite 6 (monaco manualChunks; 8 GB heap build) | |
| Server | Express 5 — dev host + reality disk mirror ONLY | never import `src/` from server |
| Desktop | Tauri 2 (Rust shell, C++ core compiled in; FFI `cosmos.rs`) | C++→WASM→TS tier chain for physics |
| Crypto | Argon2id (hash-wasm, 64 MiB / 3 iters) + AES-GCM-256; bytes encrypted before ANY storage tier | |
| Python | Pyodide vendored offline in `public/pyodide/` | CDN-free |
| Tests | Playwright smoke + per-round "gauntlet" scripts asserting source invariants | see §12 |

---

## 5. REPO MAP (compact)

```
├── README.md               ← THE RESURRECTION BLUEPRINT (228 KB rebuild spec + all shader code verbatim)
├── PROJECT-BRAIN.md        ← this file — current state + navigation
├── note.txt                ← friendly folder guide
├── docs/                   ← ARCHITECTURE.md (the architecture record, refreshed R96) ·
│                             ROUND-*.md (per-round reports) · EXPERIENCE-REPORT (baseline)
│                             · architecture-diagram.html/.mmd (generated) · research corpus
├── scripts/                ← THE HOUSEKEEPERS (regrouped R96; see scripts/README.md):
│                             gauntlets/ (25 per-round gates + 2 shared readers — ALL in npm run verify) ·
│                             probes/ (12 hand-run diagnostics) · tools/ (6: wasm, icons,
│                             updater manifest, diagram, toolchain, process-tree) · audit-architecture.ts
│                             + its frozen snapshot · smoke.ts · prod-smoke.ts · verify/ (golden frames)
├── server/                 ← Express dev host + reality disk daemon (3s self-healing scan)
├── src-tauri/              ← desktop shell — REBORN R104, GPU-first (31 Rust commands, C++
│                              core compile; ~2.0k ln / 6 .rs files; additionalBrowserArgs
│                              force ANGLE D3D11 — the round104 gauntlet pins it)
├── src/
│   ├── domain/             ← pure data contracts (universe.ts, vault.ts)
│   ├── state/              ← THE single mutation surface (store + persistence + actions.ts)
│   │                          actions.ts is a barrel over actions/ (R97: shared · realities ·
│   │                          bodies · entries · vault · portability — import path unchanged)
│   ├── platform/           ← native C++ core + bridge, desktop adapter, sky, sync, sentiment, storage keys
│   │                          cpp_bridge.ts records WHY each tier was rejected (R98: DegradationReason
│   │                          → CosmosStatus.degraded[] — degradation is a value, not a shrug)
│   ├── engine/             ← THE SHELL (engine.ts, 2.8k ln: boot / 22-step tickFrame /
│   │                          updateBodies the ONE write seam / interaction / dispose) + the
│   │                          subsystem family (R97): sky/SkyFxSystem · blackhole/BlackHoleSystem ·
│   │                          kamui/KamuiPortalSystem · worlds/InnerGalaxySystem · worlds/BodyBuilders ·
│   │                          stages/LevelStageSystem; plus the older extractees — cameraRig.ts,
│   │                          shaders.ts, math.ts, capability.ts, raymarchPolicy.ts,
│   │                          blackholeRaymarch/-Params/-Tier,
│   │                          cameraMemory.ts, surface/, systems/ (kamuiPhases, stageThresholds,
│   │                          levelSystem)
│   ├── physics/            ← physicsEngine.ts (41-field solve, Kepler solver) · nbody.ts (Living Gravity)
│   │                          · sessionDriver.ts (THE N-body session) · simTwin.ts (read-only lab)
│   ├── realities/          ← path-locked content packs; solPrime/ = canonical seed; bin/ = Quantum Bin
│   ├── vault/              ← EFS (copy-on-write fs), crypto (Argon2id/AES-GCM), executors (JS/Py/HTML/PDF/ISO)
│   └── ui/                 ← ALL React surfaces (console, hud, vault, diary, lineage…)
└── public/                 ← vendored pyodide + fonts + the compiled WASM core (wasm/) — offline capability, keep committed
│                              R99: rebuilt from the R98-fixed source (emsdk 6.0.10 lives at
│                              ~/Desktop/emsdk — off the PATH; build-wasm.sh activates it itself), and
│                              the physics batch is WIRED (primePhysics → installNativePhysics). A
│                              stale artifact is a hard gauntlet FAIL, full stop.
```

---

## 6. THE LAWS (violating any of these = the change is wrong even if it "works")

**Architecture laws (enforced by `scripts/audit-architecture.ts --check` against a frozen
snapshot):**

1. Engine ⇄ React communicate ONLY through the typed `EngineCallbacks` interface
   (`src/engine/engine.ts` header comment). Engine never imports React; React never reaches
   into engine internals.
2. `src/state/` is the single mutation surface — only actions mutate state.
3. `server/` never imports `src/`. Browser owns truth; disk is a mirror.
4. Route strings, Tauri command names, localStorage key literals (`src/platform/storageKeys.ts`),
   and `window.__*` seams are locked contracts across `server/routes` ⇄ `src/platform/desktop/adapter.ts`
   ⇄ `src-tauri/src/lib.rs`.
5. `src/realities/*/index.ts` paths are load-bearing (discovered by `import.meta.glob`).
6. Generated docs (`docs/architecture-diagram.*`) are never hand-edited.
7. Domain contracts (`src/domain/`) are pure data — no logic.

**Creative/physics laws (deliberate — do not "fix"):**

- Real SI physics constants and the scaling baselines: `a_AU = orbit.a / 52` (Aurelia = 1 AU),
  `radiusKm = (radius / 2.05) · 6371` (Aurelia = Earth). BODY_PROFILES are real solar-system
  analogues (Veil has Venus's retrograde 177.4° tilt; Mirror rolls at 97.77° like Uranus).
- Black-hole reference parameters ARE dgreenheck's demo config verbatim (mass 0.4, lensing 2.4,
  rotation −8.7, disk 4.1–14.5 …) — pinned, goldens re-pin in gauntlets.
- "Einstein keeps the truth, Newton keeps the peace": the hole's dynamic N-body mass is
  tempered ×1e-3 while its lens acts at full 10 M☉.
- Absolute void: the void around the hole is calibrated (measured 0.265 vs reference 0.33).
  Black-hole background deflection is a signed second-order Schwarzschild thin-lens
  approximation with no finite-radius deflection cutoff; its mass scale and capture edge
  come from the live raymarch capture measurement when present. The separate local
  photometric well darkening is bounded to 4·b_c. The accretion disk remains on its
  existing geodesic raymarch; the sky approximation is not a full null-geodesic trace.
  System objects remain rigid and never bend (R62).
- Zero-fail rendering: composite fallback beneath the raymarcher, shader-error disarm,
  55 ms frame-budget breaker. Never remove a safety net.
- **R86 authorial decree on reduced motion:** the author REJECTS engine-side
  reduced-motion variants for the portal beats — "the violence IS the Kamui." The
  `engine.reducedMotion` probe was deleted with the decree and the beats will never
  honor `prefers-reduced-motion`. Do not resurrect unasked (same standing as the R66b
  revert). The CSS-level `prefers-reduced-motion` handling for console UI remains as
  shipped.
- The time-driven vortex variant (R66b commit `0c2d67e8`) was REVERTED by the author's
  explicit decision. Do not resurrect it unasked (it stays restorable in history).
- **R71 container law:** the zoom dial (`zoomT`, `dist = 3 · 800000^zoomT`, explorable range
  0.10–0.94) is cut into TEN ordered per-stage slices (`src/engine/systems/stageSlices.ts`).
  Law 1: total freedom INSIDE a slice; the dial clamps softly at slice edges. Law 2:
  **explicit crossings only** — a Kamui fired by the hierarchy stepper is the ONLY carrier
  between slices. No velocity trigger, no scroll side-effect, ever.
- **R91 authorial decree — THE REAL UNIVERSE (branch `the-real-universe`):** *"my universe
  should never be like a music box… make the real physical program the MAIN program."*
  **The canon seeds; the session drives; the clockwork is the fallback and the heal.**
  The N-body session (R87's C++/WASM/TS simulator) becomes the main driver of rendered
  world positions through the single `updateBodies` seam — real mutual gravity, real
  masses, the vault at its full 10 M☉ ("Newton keeps the peace" is superseded **while
  the session drives**; it stands unchanged for clockwork mode and the lens). The Kepler
  canon keeps three jobs: the seed every session is configured from, the automatic
  fallback whenever a readback is stale or the core is unavailable, and the Restore
  Ephemeris heal (re-seed from canon). Real chaos is accepted (no hidden guardrails);
  the simulated state persists and resumes. The R88 hybrid read-only law NARROWS to
  `simTwin.ts` (the lab stays read-only); the driver lives in `src/physics/sessionDriver.ts`
  and is gauntleted separately. Safety nets and the R71 container law are untouched —
  the driver moves bodies, never the camera.
- **R98 law — A CONTRACT EXISTS ONLY IF SOMETHING CAN FAIL WHEN IT BREAKS.** R98
  found three implementations of contracts this project believed were single (the
  TS physics law vs the C++ port, the Node daemon vs the Rust shell, the source
  vs the shipped binary) and **no gate could see any of them**. The follow-on
  rule, learned the hard way three times in one round:
  - **Every negative must be proven by MUTATION, not by inspection.** A check
    that reads the wrong file, an allowlist whose paths never match (so `every()`
    passes vacuously over an empty list), and a scanner blind to an indirect
    caller all reported GREEN while proving nothing. Ask "what would make this
    check unable to fail?", then break the code on purpose and watch it go red.
  - **Degradation is a VALUE, never a shrug.** A tier that fails silently must
    name *why* (`DegradationReason`), surface it to the UI, and be asserted on by
    `smoke.ts`. "It fell back and nobody noticed" is a bug report waiting to happen.
  - **A shipped binary is not its source.** `public/wasm/` is committed, so
    editing `cosmos_engine.cpp` changes nothing for the web tier until it is
    rebuilt. Conformance must be checked against the ARTIFACT's bytes, and the
    severity of a stale artifact must follow REACHABILITY: dormant is a WARN,
    reachable is a hard FAIL.

---

## 7. THE JOURNEY (round history, compressed)

Rounds (R-numbers) are the project's epochs; each ends with a round document `docs/ROUND-*.md`.

| Wave | Rounds | What happened |
| :-- | :-- | :-- |
| Foundation & rebuild spec | R7–R21 | Core pillars, vault, Key Ring, Black Hole Studio, Tauri desktop + auto-updater |
| Architecture consolidation | R52 | Architecture auditor + frozen snapshot, locked paths, dead-code discipline |
| Black hole renaissance | R53–R64 | Single-renderer decision; absolute-void law; **the verbatim port** of `webgpu-black-hole` (fixed 64-step march, his disk math, 121-entry blackbody LUT, bloom calibrated 0.68/0.2/0.90); old renderer deleted |
| The Living Lens | R65–R66 | The hole's blaze learns distance; the sky is dragged by the hole's measured velocity (engine tracker → `uLensVel` → shader); lens is local, melts at 6·b_c; time-vortex variant built then **reverted by the author** |
| Kamui reborn | R58–R66 tail | The 9-phase portal machine rebuilt through ~10 fix commits; `src/ui/kamuiBend.ts` per-pixel DOM bend for the reverse swallow; round18 gauntlet guards it |
| The throat hands off | R67 | Overlay fires at the exact frame the summon's hold expires; the throat UNWINDS instead of snapping; post-swallow dive becomes a 60% arrival settle; destination code chunks preheat |
| Explorer upgrade | R68–R69 *(on branch `r68-explorer-upgrade` / `r71-ten-slices`, NOT yet in main)* | Left-drag glide vs orbit grammar; cursor-anchored wheel dive; touch grammar (tap-inspect, tap-act, long-press menu); exploration margins; orbit restored everywhere; forward Kamui compressed 5.5 s → 3.5 s |
| Ten Slices | R71 *(on branch `r71-ten-slices`, NOT in main — verified 2026-09-29)* | The zoom dial cut into ten ordered per-stage slices (`stageSlices.ts` exists only on the branch; a stale brain once claimed it sat on `main`). Step 3 ("zoom never crosses" — explicit `crossSlice` Kamui doors) is also branch-only, in flight |
| The stage arrival | R72 *(on main)* | The membrane Kamui STAGED: the summon holds the web still and the throat hands the multiverse over through the dying vortex (the R67 grammar carried to `beginStageWarp`); the eject untouched; the reverse come matched to the way out and always landing back in the cosmic web, never the home page |
| The throat is not swallowed | R73 *(on main)* | The vault Kamui's vacuum gulp no longer drains a hole/vault body's group — the live telemetry caught Eventide shrinking to 24% and vanishing whole in the last second before the vault opened; the door now stays whole through its own jutsu while planets and galaxies keep the canon drain. New round73 gauntlet in the verify chain |
| The holographic herald | R74 *(on main)* | Hover discipline: honest colliders (web galaxy 1.35×→the disc, multiverse galaxy 0.18×→the glow), the engine projects each hovered object's screen disk and re-emits it at ~8 Hz, and the shared `HoloCardShell` anchors every hover card OUTSIDE that disk with a stem into the rim — 3D entrance, spinning holo border, sheen; pointer-events-none everywhere except real buttons. The cluster card no longer steals clicks. New round74 gauntlet in the verify chain |
| The unbroken bridge | R75 *(on main)* | The journey from the disk to the card's own buttons no longer kills the card: the last disk and the pointer's resting place live in refs, one `pointerOnBridge` predicate guards the card rect (±8) and the rim+48 corridor, and the 550 ms goodbye is HONEST — it re-checks where the pointer rests before clearing (a pause emits no events; a still traveler on the bridge re-arms it instead of dying). Click discipline pinned: only real buttons inside the cards take clicks. New round75 gauntlet in the verify chain |
| The steady herald & the web door | R76 *(on main)* | The card is now stable enough to ROAM: the disk state is set only by a real disk emission (the old null-erasing write re-anchored the mounted card onto the cursor fallback the moment the rim was crossed — teleport + flicker + vanish), and clearHoverCard stays the only eraser. And clicking a reality sphere is an explicit Kamui: zoomToHierarchy(2) carries the traveler to that reality's COSMIC WEB (dial 0.858) — the old resetView() dove straight into the home stellar system. New round76 gauntlet in the verify chain; R74/R75 checks reconciled to the evolved contract |
| The tail trim | R77 *(on main)* | The Kamui's mature-vortex plateau — the stretch the author highlighted in R73's telemetry (4.85→5.25s) where the vortex is fully formed and merely stabilizing — is trimmed: the summon ends at 5.0s (was 5.5), the throat beat with it, the vacuum drain compressed to 1.0s (same surge machinery), the R67 hold following to 5.0. The build beats and the eject are untouched. Round18's timing pins reconciled consciously |
| The living spin | R78 *(on main)* | The mature vortex no longer sits frozen: the tear's twist was a static bend saturating in the first half-second, so between the tear and the throat nothing moved. The engine now integrates the vortex's own rotation (uSpin) for as long as the tear is visible — differential in the shader (inner band winds faster), surging with the gulp, coasting to a stop with the fade — the ripple marches inward on the summon (outward on the eject), and the early bite is a touch sharper (twist 6.5→7.0, pull 0.28/0.22→0.32/0.26). Round18 reconciled + a new living-spin check |
| The one sky | R79 *(on main)* | The Sky Studio's photo sky becomes THE sky: the vertical barrier died (the vignette sat on the atan branch cut + mipmaps collapsed there — now a camera-relative seam-free vignette and a mip-free texture), the procedural family stands down while a photo owns the view (no ghost floor, no glow tint, blend 1.0 across all three contract tiers), and the dome rides the camera — full-screen at every cosmological stage, the equirect always 1:1. Deactivation rides the crossfade out; uploads rasterize at 4096×2048 when light. New round79 gauntlet in the verify chain |
| The mark | R80 *(on main)* | The placeholder icon replaced by the author's star sigil (photo pipeline: crop, sharpen, levels) with the analytic Eventide mark as fallback, shipped to the desktop icons and the web's first favicon; the first v15.0.5 tag caught a Windows-only RC2175 ICO defect, the generator was made DIB-correct, released as v15.0.5 via the proven tag-push ritual |
| The herald reborn | R81 *(on main)* | The updater card redesigned as an artifact — framer-motion spring entrance, lucide star glyph with breathing/spinning halo rings, orbital download progress ring, per-phase copy and glyphs, a real `later` dismiss — zero new deps (vendored framer-motion + lucide), presentation split into `UpdaterCardBody` for staging; released as v15.0.6, the card that delivers its own release |
| The voice | R82 *(on main)* | The Kamui speaks: the author's chosen cinematic sequence synthesized in-house (blooming riser on the vortex's eased-strength curve, tear rip, B♭ Perseus-homage drone, sub-drop gulp with stereo collapse), then R82.2 removed the arrival exhale (it stacked on the app's own chimes), R82.3 gave the eject the zip-close "knit" voice, R82.4 replaced it with THE TIME MIRROR (the forward sequence rendered offline and sample-flipped — the jutsu un-happening), R82.5 prewarmed the mirror at audio-init and seam-faded its silent head so the seal lands on frame one. Mute law intact, zero files, zero deps. `docs/ROUND-82-THE-VOICE-2026-09-30.md` |
| The deep audit | R83 *(on main)* | The author's decree: report-only census of every bug, orphan, dead end and hidden seam, plus a deep debug of their own changes (testOne sky swap, the Version 17.1 mirror churn, the Version 18 license deletion). Six real findings — headline: the desktop `sky/status` seam can never match (exact-path switch vs query-bearing caller), so desktop never shows a boot sky. NOTHING in the app changed. `docs/ROUND-83-THE-DEEP-AUDIT-2026-09-30.md` is the decision queue |
| The ascending nodes | R84 *(on main)* | The author's realism decree: orbits may not all ride one flat sheet. The missing logic was found (every node line was hardwired to +X; no periapsis angle) and added end-to-end: `Orbit.node`/`Orbit.argP`, the exact R(Ω)·R(i)·R(ω) composition in one shared helper used by solver, moons, star-wobble and Living Gravity, C++/WASM/Rust/bridge parity, real J2000 elements pinned into Sol-Prime (JPL Table 1), exoplanet-spice codegen (steep + near-polar tail, full-circle nodes), toroidal asteroid belts. The four test realities deleted at the author's ruling. New round84 gauntlet in the verify chain |
| The six seams | R85 *(on branch `r85-the-six-seams`, NOT in main — verified 2026-10-01)* | The author's ruling on the R83 decision queue, executed on an isolated branch: the desktop sky/status seam finally matches (one line — the boot photo sky lives again), `/api/realities/write-data` gains its Tauri twin (the reality mirror lands on desktop; the deterministic 5-retry burn dies), both chain-dead routes deleted at every layer (`list_folders` stays — the daemon uses it), `releaseBlackHolesUnder` disposes every hole visual at all three teardown paths (the listener/marcher leak dies), both void events removed (R55's full-erase honored — removal, not re-wiring), the lying vault facade tail deleted and `isNova` adopted by `novaScan` (the keyring shadow renamed `isBreached`); then the mechanical sweep iterated to the audit's fixed point — **zero dead value/type exports, 1147 unused imports removed**; `THIRD-PARTY-NOTICES.md` restored verbatim and `BUILD` → R85. `docs/ROUND-85-THE-SIX-SEAMS-2026-10-01.md` |
| The full purge | R86 *(on branch `r85-the-six-seams`, NOT in main — verified 2026-10-01)* | The author's three-bucket ruling on the R83 Part III census, executed: Bucket A deleted (two orphaned engine methods, five write-only fields, the false-parity `__ACTIONS__` seam, the dead `subjectBadge` prop, the console-tab CSS family + `--color-danger`, the 512×512 orphan icon, 11 historical verify PNGs, the never-invoked `store_payload_list/stats` pair at both Rust layers). Bucket B wired (persist.ts uses `STORAGE_KEYS.universeStateRecovery` — one source of truth on the locked surface; `realityDaemon.stop()` finally called from SIGINT/SIGTERM; the R83-2 seed guard refuses Sol-Prime mirror writes at client, server and desktop twin). Bucket C kept with reasons (`__MY_UNIVERSE_PERF__`, state timestamps, `note.txt`, `cosmos_sim_*`; `reducedMotion` was kept as a law-gap hook — then the author's same-day decree REJECTED engine-side reduced motion outright and the field was deleted). THE ROUND'S LESSON: `.kamui-disappear`/`kamuiVortexOut` were deleted as audit-dead CSS and round18's gauntlet instantly failed — restored verbatim; the census ledger gains "looks dead but is gauntlet-pinned" (the gauntlets outrank the auditor). `docs/ROUND-86-THE-FULL-PURGE-2026-10-01.md` |
| The native simulator | R87 *(merged to main and SHIPPED in v15.0.9 — verified 2026-10-01)* | The author accepted the hybrid ruling: Kepler stays the clockwork sky, the stateful N-body simulator (which the C++ core had hosted all along — RK4, SI units, 4096 bodies) becomes the verified interactive layer. The bridge gained `simConfigure/simStep/simBody` on all three tiers (native invoke with the no-args-envelope trap documented, WASM session handle, and a line-faithful TS RK4 twin of the C++ integrator) + `verifyTwinParity()`; the **Native Simulator Twin** card joined the Core Console (button-driven only — the frame loop never touches the session, nothing can move the rendered sky); round87-simulator-gauntlet (14 checks) joined the verify chain. AND A HIDDEN BUG DIED: build-wasm.sh declared no EXPORTED_FUNCTIONS, so -O3 dead-stripped every cosmos_* symbol — the whole WASM tier, batches included, had been silently degrading to TypeScript since the artifact first existed; the script now pins the full bridge surface. `docs/ROUND-87-THE-NATIVE-SIMULATOR-2026-10-01.md` |
| The per-frame twin | R88 *(on branch `r88-per-frame-twin`, branched from main at v15.0.9, NOT merged — verified 2026-10-01)* | The author's "yeah please": the stateful simulator now runs ALONGSIDE the live universe — `src/physics/simTwin.ts` accumulates the live clock, fires the shared native session every ~2 sim-days (fire-and-forget, never blocking the frame), reads every body back, and publishes per-body drift-from-Kepler-canon in AU to its own module map (real physical masses — the vault is 10 M☉ here). The engine hook is one gated call (OFF by law, flipped from the twin card through `__ENGINE__`); the card gains the RUN/STOP toggle and a 1 Hz live drift readout; session ownership explicit (Verify Twin rests while the twin runs). round88-per-frame-twin-gauntlet (12 checks) machine-enforces the hybrid law: simTwin.ts must never write rendered state. The drift curve is the evidence base for any future round that lets the simulator drive. `docs/ROUND-88-THE-PER-FRAME-TWIN-2026-10-01.md` |
| The everywhere core | R89 *(same branch as R88 — verified 2026-10-01)* | The author's "build the best, at once": the browser tier comes alive automatically, forever. The WASM artifact moves to `public/wasm/` (Vite serves it at root in dev AND copies it into dist — the old in-source probe path could NEVER load in the bundled app), the build gains EXPORT_ES6 (a true importable module; the bridge accepts default-export or global glue), build-wasm.sh tolerates the AVX2 CMake stage and hard-gates on em++, and CI gains a `wasm` job: pinned cached emsdk, builds + uploads the artifact, **commits it back to the tree on main pushes** (bot, `[skip ci]`, on-change only) and the release job attaches it to every v* release. After the first green run the compiled C++ core ships everywhere — the browser badge reads WASM KERNEL and the twin card runs compiled physics in a plain tab. `docs/ROUND-89-THE-EVERYWHERE-CORE-2026-10-01.md` |
| The reachable twin | R90 *(on main, on top of v15.0.10 — verified 2026-10-01)* | The author's report that the Native Simulator Twin card (and Verify Twin with it) could not be scrolled into view reproduced as a **cascade-layer trap**: `.cc-root { position: relative }` — unlayered author CSS — silently defeated the markup's Tailwind v4 `fixed inset-0` (unlayered beats layered, always), the deck fell into document flow at 2023 px inside an `overflow: hidden` page, its internal scroller engaged only 26 px, and the twin card sat at y=1059 of an 800 px viewport, unreachable. Fix: `.cc-root` declares `position: fixed; inset: 0` in CSS itself (utilities now only agree) — scroll range 26 px → 1249 px. Plus the Twin Jump: an always-visible top-bar seal that lands the dashboard tab, scrolls `#simulator-twin-card` into view and flashes it — with a measured safety net (a frame-starved window advances no smooth scroll, so the jump snaps instantly if the card hasn't arrived in 900 ms) and `overscroll-contain` on the deck's scroll body. Live-verified end-to-end: seal click → card in view → Verify Twin → receipt. `docs/ROUND-90-THE-REACHABLE-TWIN-2026-10-01.md` |
| The real universe — the session gets a memory and a wide eye | R91 *(on branch `the-real-universe`, cut from main's R90 tip — NOT in main — verified 2026-10-01)* | THE AUTHOR'S DECREE (the founding charter, `docs/ROUND-91-THE-REAL-UNIVERSE-DECREE.md`): *"my universe should never be like a music box… make the real physical program the MAIN program"* — **the canon seeds; the session drives; the clockwork is the fallback and the heal**, phased R91→R94 on a truly separate branch (`--no-ff` merges only, main frozen while the arc runs). R91 ships the machinery, zero rendered change: the batched session read end-to-end (`cosmos_get_body_states` C++/Rust-stub-lockstep/Tauri command/WASM export pin/bridge `simStates()` on all three tiers), the driver module `src/physics/sessionDriver.ts` under the narrowed hybrid law (no scene objects, no store, own telemetry map — the canon seeds with real kg masses and the vault at full 10 M☉, the freshness law extrapolates readbacks with a 2.5-day trust window, save/restore over the locked key `my-universe:sim-session:v1` configures FROM SAVED STATES, roster churn preserves drift by carrying states per id, `healDriver` is Restore Ephemeris driver-edition), and round91-session-memory-gauntlet (21 checks) in the verify chain. Architecture snapshot consciously refreshed. Honest limits: no emsdk/MSVC locally — C++/WASM receipts certify on CI; the engine stays Kepler-driven until R92's gate. `docs/ROUND-91-THE-REAL-UNIVERSE-DECREE.md` |
| The driver in shadow | R92 *(same branch — verified 2026-10-01)* | The session takes the wheel — behind a gate that is OFF by law this round. The engine gains `setUniverseDriver` (twin lab force-stopped on enable — one session, one owner; the session memory saved on disable and dispose) and THE SEAM: one line in `updateBodies` feeds the driver's extrapolated readback through the SAME `b.group.position.set` the Kepler solve always used — camera, hover, diaries, lens all follow free; a stale readback (2.5-day trust window) returns null and the Kepler solve renders that frame. Living Gravity's writer stands down while driving (the session IS the living gravity — the vault at full 10 M☉); Restore Ephemeris heals both the field and the session. The switch persists (`universeDriver` flag, absent = OFF this round — R94 flips it) through the store's single mutation surface; the twin card becomes the driver's face (badge CLOCKWORK/DRIVING THE SKY, the switch, steps-run/session-clock/memories-saved/max-drift readout, honest session ownership). A pre-existing console-open WASM-probe 404 died (Vite's HTML fallback answered the HEAD with 200 — the probe now verifies content-type, the silent-fallback contract restored). LIVE RECEIPT: `scripts/round92-live-check.ts` drives a real headless Chromium as the author would — nine PASSes including **the session actually stepping while the sky kept rendering**, then a clean revert. round92-driver-shadow-gauntlet (22 checks) in the chain; R88's ownership check consciously reconciled (Verify rests for either owner); snapshot refreshed; full verify green. Honest limits: TS-tier receipt locally (no artifact — CI compiles); the sky is unchanged until the author flips the switch or R94 lands. `docs/ROUND-92-THE-DRIVER-IN-SHADOW-2026-10-01.md` |
| The real moons | R93 *(same branch — verified 2026-10-01)* | Every diary moon becomes a real body. Deterministic identity (`${planetId}:moon:${index}` + radius stamped by syncMoons — churn keys that survive diary changes; the story never resets for a moon being born), the moon mass law (rock at 3500 kg/m³ — the BODY_PROFILES fallback — via the shared radius→kg conversion, ~10²² kg for an Earth-analogue's moon), the moon canon (parent's Kepler canon + the engine's own tilted-orbit formula INCLUDING the vertical bob, so the seed is exactly what the ornament sky shows and the flip is seamless at t=0; velocities finite-difference the composition — parent motion plus local orbit), and THE MOON SEAM (`driverMoonReadback` — the same extrapolation keyed by moon id, same 2.5-day trust window; world → local by subtracting the parent group position, exact because body groups never rotate; stale readbacks fall back to the ornament closed-form, so planet and moons always agree — both session or both canon). Tolerance: moons without id/radius (inner systems, pre-R93 meshes) stay ornament-only — R94's scope. round93-real-moons-gauntlet (16 checks) in the chain; full verify green; the R92 live check re-run ALL GREEN with moons in the roster. Honest limits: TS-tier receipt locally; moon chaos is real — Restore Ephemeris remains the one heal. `docs/ROUND-93-THE-REAL-MOONS-2026-10-01.md` |
| THE FLIP | R94 *(same branch — THE ARC IS COMPLETE, verified 2026-10-01)* | The decree lands: the universe BOOTS on true N-body gravity — absent flag = ON in both derivations (App + card; the console switch restores the clockwork on demand; devices without the core get the clockwork through the freshness law automatically). EVERYTHING EVERYWHERE with one session per tier: `activateScope` swaps the session by proximity — the engine declares the camera's realm each frame (home, or `galaxy:${id}` from updateInnerSystem); activating saves the resting scope's memory and resumes the target's own with a BOUNDED CATCH-UP BURST (250-day chunks of 1000 × 0.25-day sub-steps — moon orbits resolved; a 5-real-minute absence ≈ 8 calls; beyond 100,000 days the memory re-seeds). THE INNER SEAM: the STAR leads each galaxy scope's roster and its ensemble (corona, halos, belt) follows its real barycenter wobble — big with a 10 M☉ companion; planets consume the readback at index+1; inner moons (deterministic ids, both the natural court and diary moons) ride the R93 world→local seam; the home seam is scope-checked (inside a galaxy the home session rests, its sky on Kepler). UI honesty: the Physics Laws panel wears "TRUE GRAVITY · DRIVING" and rests the Living Gravity toggle ("Gravity · In the Session"); Restore Ephemeris' tooltip admits it re-seeds the session. The R88 gauntlet needed no rewrite (it guards simTwin.ts, the untouched lab); the R91/R92/R93 checks were consciously reconciled to the evolved contract. LIVE RECEIPT: the app BOOTS DRIVING, the session steps from frame one, the clockwork reverts on demand, zero console errors — eight PASSes. round94-the-flip-gauntlet (14 checks) in the chain; full verify green — 18 gauntlets + smoke + prod smoke, with the boot smoke itself running on the session-driven sky. THE MERGE (--no-ff) AND THE v16.0.0 TAG AWAIT THE AUTHOR'S WORD. `docs/ROUND-94-THE-FLIP-2026-10-01.md` |
| THE STEADY SKY | R95 *(same branch — the stability round, verified 2026-10-01)* | R94 was real and **unstable** — worlds plunged, moons flew, the sky flickered. Measured: **R94's sky survived ~40 sim-days.** FIVE faults, and the deepest was neither the seed table nor the softening: **(1) THE SUBSTEP LAW — the tick ran the physics 24× ahead of the clock.** `simStep(dt, iterations)` advances `dt × iterations` (every tier steps the same dt once per iteration), but `driverTick` passed the WHOLE 2-day span as `dt` with 24 sub-steps — so the readback's stamp and the integrator's real time disagreed by 24×, the star's barycentric arc never closed (it walked straight off the origin), and the planets wound up on enormous fictional eccentricities. `catchUpSession` already divided; the tick did not. Fixed by `.simStep(dt / DRIVER_SUBSTEPS, DRIVER_SUBSTEPS)`. (2) **No central mass**: the home roster began at the first planet and `buildBody` never renders the anchor, so the session had **no star at all**. THE STAR LEADS EVERY ROSTER: index 0 is the star (engine-registered via `setScopeStar`, already leading, or synthesized); planets read at index+1, the anchor group follows index 0. (3) **Cinematic speeds vs real gravity**: the canon table's 2–4× outer periods are hyperbolic seeds. THE ORBIT-TRUE SEED keeps each world's canon position/direction/plane but re-seeds speed as the circular-orbit speed √(GM/r); the barycenter frame centres VELOCITY ONLY (a full barycentric origin shift would put the session ~23 units from the clockwork canon and slide the sky on every crossfade — and the star's resulting bounded wobble is physics, the real thing the anchor group has always shown). (4) **THE VAULT + HILL TEMPERS**: a vault's in-session mass is what its own canon orbit implies (v²·r/G), **and ≤ 1/1000 of the star** — 0.1 M☉ is not a stable companion in a real planetary system (it scattered the inner worlds out within ~600 sim-days, found by elimination with `R95_NO_VAULT=1`); at 0.001 M☉ the vault sits deep in its own Hill sphere, still a real body tugging the star. The 10 M☉ display law stays untouched in physicsEngine (a separate quantity; both are pinned). (5) **Impossible moons** (the R93 amendment): the canon 14–30-day moon laps are unbound at real gravity, so moons left the roster and render as parent-session-position + their own R84 inclined orbit — permanent, home AND galaxy. (6) **A per-frame snap**: the 2.5-day trust window was narrower than one frame's sim-delta — *that* was the flicker. THE STEADY SEAM: the crossfade (`drvBlend`, up 0.4 s / down 0.15 s from frozen last positions) plus an **8-day trust window**; THE LIVING RINGS (hover ellipses rebuilt ~1 Hz from the session's **osculating elements**, unbound states refusing rather than faking a ring); the C++ Kepler cache retires while the session is fresh. REALM HIDING eases the home system out during a galaxy dive — this killed the "three black holes" bug — with dive-gate HYSTERESIS (enter 1600 / leave 2000). SOFTENING 1e4 → **1e12** m² (ε = 1000 km) in the C++ core and TS twin in lockstep. The universe remembers honestly: `resetUniverse` forgets the session memory, memories carry a **seedLaw stamp** (now **3** — law-2 memories re-seed once), a memory ahead of the boot clock is **ADOPTED**, and the tick accumulates BEFORE the pending guard. `setSimTwin` refuses engine-side while the session drives. **THE RECEIPTS:** `scripts/round95-physics-probe.ts` (NEW) drives the REAL `driverTick` headlessly — R94 ~40 days → +substep ~594 → **+Hill temper 5000+ days, zero detonation**; it is what found every real bug, because the 21-check regex gauntlet passed on a sky that died in 40 days (**no regex can tell you whether an integrator is stable**). round95-steady-sky-gauntlet (25 checks — the doc's first count was off by one) in the chain; R87's two softening pins updated `1e4` → `1e12` (that pin exists to hold the twin in lockstep — changing the constant MUST change it). LIVE: headless Chromium, 3 minutes, every body's radius held within [0.2×, 4×], clock advancing, frame loop alive, star bounded. Two harness bugs recorded in the round doc: a page-side `import('/src/physics/sessionDriver.ts')` returns a **SECOND module instance** that never sees the engine's session (faked three failures — observe `window.__ENGINE__` instead), and `page.evaluate` given a **string** evaluates it as an expression. Honest limits: the probe stays TS-tier by design, 5000 days is not forever, galaxy scopes are probe-untested. Chaos is the point — Restore Ephemeris remains the one heal. POST-SESSION COMPLETION (the same evening, begun on the author's own hand): emsdk 6.0.10 installed at `~/Desktop/emsdk` and `public/wasm/` built from this tree — the branch's first local artifact — which surfaced and killed two latent dev-tier bugs on first contact: the dev import arrived as `/wasm/…?import` and 404'd (Vite's injectQuery rewrite; `loadWasm` now imports an absolute runtime URL) and emscripten 4+ no longer exposes HEAPF64 on the module (`build-wasm.sh` now pins it beside ccall/cwrap — without it the tier silently fell back to TypeScript and the session never drove). The artifact was rebuilt and the live receipt ran **ALL GREEN ON THE COMPILED CORE** — boots DRIVING, crossfade full, readback whole, three real minutes, zero console errors — and the architecture snapshot was refreshed (the R95 plan's one dropped receipt; audit clean). CI (emsdk 3.1.74) remains the canonical release receipt. `docs/ROUND-95-THE-STEADY-SKY-2026-10-01.md` |

---

## 8. CURRENT STATE (as of 2026-10-06 — the tip is the author's `Version 20.1` at `40ca4f9a`; R108 the first crossing shipped v16.2.0 toward the main repository)


- **R108 (this round, 2026-10-06 — THE FIRST CROSSING):** the author's decree: *"make a
  pull request to my main github inspite of test version … & add new version of app
  also."* TWO findings before the ship: (1) the smoke's first failure was the documented
  cold-boot trap — the first page.goto after a cold Vite start measured ~67 s (> the 60 s
  goto timeout); warm cache boots instantly, ports verified zombie-free; (2) the second
  failure was HONEST CONTENT — with the Sol-Prime Continuum re-added (the author's
  `Version 20.1`), the glob-discovered home reality changed (boot shows
  `activeRealityId: "sol-prime"`, five vault bodies), the boot sky's composition
  legitimately moved, and the golden frame drifted (histL1 0.3338 > 0.12) — while
  `git diff 0723578d..HEAD` proves engine/physics/vault/state/server untouched since
  R107. THE RE-PIN (the documented ritual): `smoke.ts --capture` wrote a fresh
  reference from the new sky; SMOKE GREEN at histL1 0.0095, prod smoke green, full
  verify green (24 gauntlets). THE CROSSING: the test-version `origin` synced (it had
  trailed 28+ commits); release branch `release/v16.2.0` carries an explicit
  history-adoption merge (`-s ours` — the main repository's `main` is one unrelated-
  history snapshot commit, "Upload upgraded version") so the PR diff is the true file
  delta; PR `main ← release/v16.2.0` opened on `Chasin-Love/Chasin-Love-World`; tag
  **v16.2.0** (version bump 16.1.0 → 16.2.0 in the R104 LOCKSTEP: tauri.conf.json ⇄
  Cargo.toml ⇄ Cargo.lock) pushed to BOTH repos — the main repository becomes the
  release home, the test-version repo keeps serving `latest.json` because the installed
  apps' updater endpoint still points there (repointing is a locked-contract change left
  for the author). `docs/ROUND-108-THE-FIRST-CROSSING-2026-10-06.md`
- **`main` is the blessed reference.** Its tip is the author's **`Version 20.1`** commit
  **`40ca4f9a`** — the Sol-Prime Continuum reality pack re-added through the app — on
  top of the R107 commit **`0723578d`**,
  the author-authorized R106/R107 fast-forward, on top of the **Version 20** merge
  (R105: the vanished marble + the sealed floor) on top of the R104 merge (the
  desktop rebirth) on top of the merged R96–R103 chain —
  the tidy house, the engine divided, the real contract, the wheels connected,
  the self-contained exe — merged --no-ff and pushed on the author's word
  (2026-10-03, after a fresh full verify on the exact merged tree) — on top of
  the R91–R95 REAL UNIVERSE arc on top of **v16.0.0** (merged --no-ff and tagged on the author's word, 2026-10-02) on top of R90 on top of **v15.0.10**
  (R88 the per-frame twin + R89 the everywhere core, merged from `r88-per-frame-twin`
  and shipped 2026-10-01 — CI commits the WASM artifact back and attaches it to releases)
  on top of **v15.0.9** (R85 the six seams → R86 the full purge → R87 the native
  simulator) on top of the R84 ascending nodes
  on top of the R82 voice chain
  (R82 the Kamui speaks → R82.2 exhale removed → R82.3 return voice → R82.4 the time
  mirror → R82.5 the prewarmed mirror) on top of the R79 one sky
  (the photo sky's barrier/double-sky/zoom trio → its gauntlet) on top of
  the R78 living spin
  (the vortex's own rotation → its round18 reconciliation), the R77 trim (the Kamui tail → its round18 reconciliation), the R76 work (the steady
  herald & the web door → its gauntlet), the R75 pair (the unbroken
  bridge → its gauntlet), the R74 pair (the holographic herald → its
  gauntlet), the R73 pair (the throat-is-not-swallowed guard → its gauntlet)
  and the R72 four-commit train, all on the R67-final engine state.
  **Correction (verified in R72):** the earlier claim that R71 step 2's slice table sat on
  `main` was stale — `src/engine/systems/stageSlices.ts` does NOT exist on `main`; the Ten
  Slices work lives only on the branches below.
- **In flight (branches, not final):** `r71-ten-slices` carries R68/R69 explorer-upgrade work
  (cameraRig orbit/glide grammar, touch grammar, 3.5 s summon, ROUND-68/69 docs) plus R71
  step 3 ("zoom never crosses"; changes in `engine.ts`, `stageThresholds.ts`, `kamuiPhases.ts`,
  `cameraRig.ts`, round18 gauntlet) and uncommitted step-3 transform scripts. `r85-the-six-seams`
  and `r88-per-frame-twin` are both **merged to `main` and SHIPPED** (v15.0.9 = R85+R86+R87;
  v15.0.10 = R88+R89, tagged 2026-10-01). `the-real-universe` (cut from main's R90 tip,
  2026-10-01) carries the author's R91 decree — **THE REAL UNIVERSE**: the N-body session
  becomes the main driver of the sky, phased R91 (session memory: batched read,
  save/restore) → R92 (the driver in shadow, default OFF) → R93 (real moons) → R94 (THE
  FLIP, default ON, v16.0.0) → **R95 (THE STEADY SKY — the stability round: the
  flip detonated; star-led rosters, the orbit-true seed, the vault temper, the
  crossfade seam, 1e12 softening; the arc's arc ends in a sky that holds)**. MERGED 2026-10-02 on the author's word: `--no-ff` into main, tagged
  **v16.0.0** — the real universe is the blessed reference now. R96/R97/R98/
  R99+R100 (branch chain `r96-the-tidy-house` → `r97-the-engine-divided` →
  `r98-the-real-contract` → `r99-the-wheels-connected`) **MERGED 2026-10-03 on
  the author's word: `--no-ff` from `r99-the-wheels-connected`, pushed to
  origin — after a fresh full verify on the exact merged tree.** (The older
  ISOLATED branches — `risk-take-kamui` (Sep 29, the author's own "disaster"),
  `r68-explorer-upgrade`, `r71-ten-slices` — remain exactly as they
  were, awaiting their own rulings; the merged chain's branch pointers
  (`r82-the-voice`, `r85-the-six-seams`, `r87-native-simulator`,
  `r88-per-frame-twin`, `the-real-universe`) are historical signposts, fully
  contained in main.)
- **R105 (this round, on branch `r105-the-vanished-marble`, cut from main's R104 tip):**
  THE VANISHED MARBLE — the author's report after test-driving the R102 decree on the
  R104 desktop: *"I can delete all the folders but I can't delete Sol-Prime… even after
  I delete them I can see the reflection in the multiverse giants view."* THREE verified
  findings, three closures. **(1) THE GHOST MARBLE:** the multiverse scene's ONLY runtime
  rebuild — App.tsx's EXISTENCE SYNC effect — carried a `skipFirstRebuild` guard that the
  engine's ASYNC arrival never consumed at mount (`if (!eng) return` bailed before the
  guard), so the guard was STOLEN by the first real change of every session — typically
  the first `deleteReality` — which returned WITHOUT rebuilding: the deleted reality's
  glass sphere + galaxy disc + orbit rings + click collider kept rendering on the
  multiverse stage (hover resolved it through `getReality`'s survivor fallback to the
  wrong universe) until some unrelated sig change or a restart. Fixed by carrying
  `engineReady` in the effect's deps — the exact law the physics-toggles effect above it
  has obeyed since Round 14 — so the engine's arrival consumes the guard and the FIRST
  delete/edit/rename/create of every session performs its rebuild. **(2) THE LYING DISK
  LEG:** in the compiled desktop app a committed pack (Sol-Prime included) has no folder
  in the app-data tree, so both backend twins' bin verbs errored "Directory … does not
  exist", the app toasted "could not reach the bin", and the 5-retry queue burned — for
  a deletion whose state side had fully landed. Now a bin verb resolving to NOTHING on
  disk is a success no-op on BOTH twins in one commit (R98 lockstep): realityDaemon's
  move/restore/purge gained explicit nothing-on-disk branches; realities.rs returns
  `BinOutcome {target, noop}` shaped by lib.rs as `{success:true, noop:true}`. **(3) THE
  RESURRECTION WINDOW:** R102's tombstone-in-state was the ONLY thing keeping a deleted
  pack dead on desktop — a wiped/fresh/corrupt state re-seeded it straight from the
  bundle (the R102 comment's premise "the glob no longer matches anything" is true only
  in dev). THE TOMBSTONE LEDGER: both twins record every deliberate deletion as
  `bin/.tombstones/<id>.tombstone` (move writes, purge writes AND KEEPS — permanent
  death, restore clears — the reality may live again, empty keeps all — the last word),
  the bin lists carry an additive `tombstoned: string[]`, dot-directories are filtered
  from every listing AND from empty-bin itself (the live check's catch: emptyBin
  measured EATING the ledger, count 1 — fixed on both twins, re-measured 0, ledger
  survives), and the client adopts the ledger at boot + on every realitySync poll
  through the new `adoptDiskTombstones(ids)` action (skips re-created ids: creation
  outranks a tombstone; prunes any freshly-seeded phantom container payload-and-all;
  forgetSession; recompute; surfaces the traveler if the pack was booted into).
  RECEIPTS: round105-vanished-marble gauntlet (17 checks, in the verify chain after
  round104) — mutation-proven three ways, and it caught its own vacuous empty-bin pin
  during construction (a lazy whole-file regex satisfied by the getStatus filter — the
  R98 disease; every lifecycle pin is now scoped by a bodyBetween slice);
  round105-vanished-marble probe (13 assertions) deletes Sol-Prime through the REAL UI
  (Core Console → Realities Grid → Collapse → Confirm Erase, all-DOM clicks —
  Playwright's actioned clicks measurably lose races with the card's hover/layout
  animations) on a fresh server + headless Chromium with a document token defeating any
  Vite full-reload, and grants THE RECEIPT only on the SAME engine instance that
  rendered the marble (ghost gone, traveler at the multiverse, folder in the bin,
  tombstone written, persisted state carrying the bin entry, zero errors) — ALL GREEN
  twice back-to-back, and with engineReady removed it fails at exactly THE RECEIPT
  naming the stolen guard; live daemon scratch checks 9/9; tsc clean; cargo check
  green; round98 conformance + round104 shell ALL GREEN; audit --check clean after the
  in-commit --snapshot refresh; full verify green (23 gauntlets, smoke, prod smoke).
  NOT TOUCHED: getReality's survivor fallback (load-bearing R102 contract — with
  ghosts dead it has nothing to mis-resolve), the restore flow, the R83-2 seed guard.
  Limits: the probe is the dev/web tier (the desktop legs are gauntlet-pinned +
  compile-verified; a built-exe probe receipt waits for the author's call); the ledger
  dies only with the machine's app data itself.
  `docs/ROUND-105-THE-VANISHED-MARBLE-2026-10-04.md`
- **R101 (this round, on branch `r101-the-frost-deck`):** THE FROST DECK — the author's
  decree, with a visionOS-manner frosted-glass dashboard screenshot: *"time to upgrade our
  core console to these style & manner"*. The Core Console consciously REVERSES its R8-era
  "no blur anywhere" smoked-glass law: true frosted glass over the Crimson Watch night, with
  the new GPU law written into the CSS header — only top-level panes carry backdrop-filter;
  tiles nested inside a frosted pane use translucent fills. MIXED luminance per the author's
  pick: dark frost panes, LIGHT frost hero tiles + clock chip. The screenshot's layout manner
  adopted: a bottom pill view dock (`.cc-pillbar`/`.cc-pill`, active pill reading the per-tab
  `--cc` accent via `[data-active]`), a left tool rail (`.cc-rail`: Twin Jump / Backdrop
  Studio / Forge / Close as seals with right-positioned thought clouds), a ClockChip (the
  traveler's wall clock over the live Universe Epoch), hero VitalTiles (26–30px Unbounded
  numerals), and **WorldsPerRealityBars** — one real bar per reality (live body counts, the
  anchored reality burning in the tab accent); real data only, nothing invented. The rail
  move surfaced and killed a real bug: the studio popover's `fixed inset-0` catcher stopped
  covering the viewport because the rail's `backdrop-filter` makes the rail the containing
  block for fixed descendants (it only covered the rail; the popover could not be dismissed
  by clicking elsewhere) — replaced with a document-level mousedown outside-close on
  `[data-studio-root]`. CoreSigil's silent accent failure fixed: it read `closest('.core-plate')`
  (an ancestor that exists only on the Command Palette, never in the console), so the sigil
  sat on its teal fallback forever — it now reads `.cc-root` under the existing
  MutationObserver. `.cc-root`'s load-bearing `position: fixed; inset: 0` block kept
  BYTE-VERBATIM (round90 passes unchanged); every gauntlet-pinned literal survived (twin ids,
  snap logic, R94 badge strings + disabled attr, R92 driver comment, R87 receipt, R63 slider
  labels); nested `backdrop-blur` purged from all now-frosted interiors (GPU law in the
  markup); the Forge Reality modal was already glassmorphic and stayed untouched. Receipts:
  typecheck + full verify ALL GREEN TWICE (21 gauntlets, `SMOKE TIER — wasm`, frame unmoved —
  histL1 0.0699–0.0720 vs the 0.12 pin, zero console errors, prod smoke green);
  `audit:arch --check` clean after an in-commit snapshot refresh (the new probe's
  `window.__ENGINE__` reference — the same boot-contract seam smoke.ts consumes). VISUAL
  RECEIPT: `scripts/probes/round101-frost-visual.ts` (NEW hand-run probe) drives a real
  headless Chromium through the author's keyboard door (Ctrl+K → "Open Core Console" — the
  MultiverseBar CORE badge only exists after a demon-core interaction) through all four pill
  views, the Twin Jump (card flashed, live driver telemetry: steps 12 · clock 25d · max drift
  0.2393 AU — the session was DRIVING during capture), the Studio popover and the Forge
  modal → seven PNGs in `scripts/verify/frost/`, reviewed against the reference manner; the
  pass produced two legibility fixes (cloud chip 0.55→0.78, studio popover 0.60→0.85),
  re-captured green. Scope lines: HUD + hover cards + Command Palette untouched (HoloCard
  CSS is gauntlet-pinned); ScenicBackdrop untouched (it is what the frost blurs); zero new
  deps, zero engine/physics/state changes.
  **R101.1 (same day, the author's follow-on):** THE RAIL ABSORBS THE DOCK — the four view
  tabs left the bottom pill bar and joined the tools on the left rail (one unified frost
  column: view seals on top with the active seal burning in the tab accent + the Bin badge,
  separators, then Twin Jump / Studio / Forge / Close); the dock and its `.cc-pillbar`/
  `.cc-pill` CSS deleted together (deadCss law); the rail's entrance keyframe re-scoped to
  an X-slide (`ccRailIn`) because the rail centers via Tailwind v4's `translate` property,
  which composes with `transform`. The probe was caught lying — its `innerHTML > 3000`
  readiness check was satisfied by the EXITING view mid-swap, producing two visually-empty
  captures while an instrumented run proved the DOM always held the content at opacity 1 —
  and now waits for each view's unique marker text plus computed opacity 1 before
  screenshotting. Receipts: full verify ALL GREEN (histL1 0.0725, zero console errors),
  audit clean, all seven captures re-taken green under the honest wait.
  **R101.2 (same day, the author's three-point follow-on):** THE WORDS RISE — (1) every
  thought cloud now clamps to the viewport on BOTH axes: ThinkingCloudTooltip's class-
  arithmetic edge-guess (whose surviving `-translate-x-1/2` half-shifted flipped clouds
  off-screen, clipping pods' and rail clouds' first word) was replaced by measuring the
  mounted cloud and shifting it by exactly the overflow; (2) THE QUIET CARD — the Native
  Simulator Twin rebuilt in the anime thinking-bubble manner: the new ThoughtCloud widget
  (`src/ui/console/ThoughtCloud.tsx`, frost bubble + thinking-dot chain, viewport-clamped)
  carries every paragraph, the drift list and the receipt fine print on hover, while the
  card keeps only name + WASM/DRIVING badges + three control chips + one live-numbers line
  (the R87/R88/R92/R94 logic and all pinned literals untouched; ~70 % shorter card); (3)
  the probe gained frost-twin-cloud.png (eight captures, all green). The card STAYS — it is
  the universe driver's only face (the R91–R94 decree's user-facing switch); only its words
  were redundant. Receipts: full verify ALL GREEN (histL1 0.0712, zero console errors),
  audit clean.
  `docs/ROUND-101-THE-FROST-DECK-2026-10-03.md`
- **R101.3 (same day, the author's ruling on the thought clouds):** THE CLOUDS NEVER
  COVER THEIR BUTTONS — the author's screenshot showed bubbles covering their own
  controls; the cause was a viewport-clamp oscillation bug in `ThoughtCloud.tsx`
  (each render measured the already-shifted bubble and applied a replacement
  transform, oscillating forever — Maximum update depth exceeded). Fixed with
  **cumulative correction**: the clamp adds deltas converging to zero; the effect
  depends only on `[open, below]` so it cannot chase its own `setState`. The
  placement law encoded: bubble never covers its trigger; prefers above; flips
  below when no honest room above (trigger within bubble-height + 28px of top);
  viewport clamp is last-resort straightener. Two more cards quieted (Physics
  Laws panel, Astrophysics Core card) — their words now live in hover clouds.
  Receipts: typecheck clean; verify unchanged (R92 driver-heal failure persists);
  smoke passes; audit clean; probe gained `frost-twin-cloud-below.png` (forced
  flip below with viewport 340px), all captures green.
- **R101.4 (same day, the author's screenshot completion):** THE THREE MISSING
  DASHBOARD ELEMENTS — three live elements from the original R101 spec, now
  built: (1) **Living Gravity Indicator Chip** in the top bar (RESTING cyan /
  AWAKE violet / IN THE SESSION emerald, hover cloud explains each state); (2)
  **Worlds per Reality Bar Chart** in Vitals panel (horizontal flex bars, hover
  clouds show exact counts, anchored reality in `--cc` accent); (3) **Science
  Verdict Card** in dashboard bento (4-col panel with real physics metrics:
  GOODNESS OF FIT from driver deviation, GR = 1/τ from timeDilationAtSurface,
  Rs = schwarzschildRadiusKm, MODIFIED = Living Gravity coupling ratio, Taylor
  remainder = simTwin deviation per sim-day; each metric has a ThoughtCloud
  hover explanation). Implementation: new `simClock.ts` publish/subscribe for
  simDays, engine callback, `ScienceVerdictCard.tsx` aggregating live physics.
  Receipts: typecheck clean; verify green; smoke histL1 0.0707; audit clean;
  probe gained `frost-living-gravity-chip.png` and `frost-science-verdict.png`.
  `docs/ROUND-101-THE-FROST-DECK-2026-10-03.md`
- **R102 (this round, on branch `r102-the-independent-realities`):** THE
  INDEPENDENT REALITIES — the author's decree: *"the back end and the reality
  folders need to be separate completely… if a reality got compromised I can just
  easily delete them and that virus is totally gone with the deleted file —
  it's supposed to look like it doesn't even exist, not now, not before."*
  Under the decree, **no reality is load-bearing — not even Sol-Prime, the
  canonical home.**
  THE CUT LIST (every place the home was wired into the core):
  `src/realities/index.ts` dropped the static `solPrimeReality` import and the
  forced `map.set('sol-prime', …)` / hardcoded `folderById` seed — discovery is
  pure `import.meta.glob`; `getReality()` may now return `undefined` and every
  caller was swept (typecheck-driven, ~40 sites). The engine's
  `activeRealityId` is `string | null`; `setReality(null)` is legal (anchor
  hidden, driver stands down, stage snaps to the multiverse); the boot frame's
  `bootIntro` finalize no longer hard-opens the home — with no home it lands
  on the multiverse sphere. `setUniverseDriver`/`healLivingGravity` are
  reality-gated. The surface dome falls back to a `NEUTRAL_SURFACE` preset
  instead of sol-prime's own. The store stops conjuring a phantom `'sol-prime'`
  bucket; the snapshot's views are honestly empty. `persist.loadState`
  reconciles the active pointer to a KNOWN reality or `''`, and prunes any
  ghost container at load (a reality with no folder, no custom registry, no
  bin entry leaves zero trace — payloads destroyed via `delPayload`).
  `createInitialSeed` takes `homeExists` and seeds the EMPTY multiverse when
  the folder is gone. The deletion guards die everywhere: the action, the
  console card, the multiverse bar, the Node daemon, and the Rust twin
  (`is_protected` now shields only `bin`/`.bin`).
  ZERO-TRACE PURGE (the decree's virus test): bin-purge now destroys the
  world container, every referenced encrypted payload (vault + vault trash +
  diary attachments), the folder-map entry, AND the N-body session memory —
  new `forgetSession(id)` in `sessionDriver.ts` wipes the scope's memory from
  the locked key. `emptyRealityBin` sweeps the same way.
  RECONCILED PINS (negatives proven by mutation): round98's old
  "protect sol-prime from rename" pin inverted to the decree pin
  (`R102: neither backend single-cases sol-prime in rename or move-to-bin`);
  round92's heal pin updated to the reality-gated form. The R83-2 law stands:
  the committed seed `data.json` mirror still refuses browser writes — that
  guard protects the committed *file*, never the deletion right.
  **MUTATION PROOF:** `scripts/probes/round102-independence-probe.ts` —
  physically moves `src/realities/solPrime` out of the tree, boots a fresh
  server, verifies the veil lifts, engine ignites, `activeRealityId === null`,
  stage = multiverse, zero marbles, console + palette open, zero page/console
  errors — then always restores the folder. ALL GREEN with captures in
  `scripts/verify/independence/`. Receipts: typecheck clean; full verify ALL
  GREEN (21 gauntlets; smoke 0.0690 standalone after one in-chain cold-boot
  flake; prod smoke green); audit clean with in-commit snapshot refresh.
  SESSION ARTIFACT, RECORDED: two interleaved commits (R101.3/R101.4) landed
  mid-round carrying part of this round's edits; the close-out commit on top
  carries the remainder (the boot snap + gauntlet reconciliations + captures).
  The tree is the truth and it verifies green.
  `docs/ROUND-102-THE-INDEPENDENT-REALITIES-2026-10-03.md`
- **R103 (this round, on branch `r103-the-wall-clock-jutsu`):** THE WALL-CLOCK
  JUTSU — the author's two complaints: the spacetime bending around the black
  hole missing on localhost, and the reverse Kamui sticking at its last second
  while the audio always plays right. INVESTIGATED WITH INSTRUMENTS (the R98
  law), one root found and fixed, one myth retired by GPU truth. THE BUG
  (measured, not guessed): the Kamui choreography ran on the physics-capped dt
  (≤ 50 ms per frame — the initial-commit clamp), so under any slow rendering
  stretch the 1.9 s eject took **19.7 measured wall seconds** (a 2 fps
  software-GL pipeline; the author's iGPU dev sessions hit the same wall
  whenever the geodesic march + portal pass stack up) while the R82 voice —
  synthesized on the AudioContext WALL clock — finished on schedule. The
  repair is the TWO-CLOCK TICK: `rawDt` → `wallDt = min(0.5, rawDt)` drives
  the four choreography updates and `applyKamuiFrame` (the theater now tracks
  real seconds, resuming at the point of its curve the voice already reached —
  the author's smooth-parabola uninterrupted return), while physics, the rig,
  the session driver and every relaxation keep the capped dt. Post-fix
  measurements: eject 1.64 s wall and summon 5.02 s wall **on the author's own
  Intel/D3D11 silicon**, 19.7 → 4.94 s on the tar-pit pipeline; zero console
  errors; the R77 "dead click after a reverse" window is now wall-bounded.
  THE LENS, ACQUITTED: on the real GPU the geodesic tier attaches, uniforms
  are driven (`uCriticalB` 4.497), the dome's capture shadow + well render
  even in software, and the lensed disk shows in capture; the author's
  missing-lens is a STATE (software-GL session / Studio tier `off` / quality
  `low`), not a regression — and it now SPEAKS: a once-per-session console
  witness names `tier-low`/`override-off` with the remedy (BlackHoleSystem).
   HARNESS REPAIR, measured-first: the smoke's 40 s camera-settle window lies
   below the rig's wall-clock asymptote under software GL (measured worst 51 s
   on a quiet machine; nothing in the tick's easing changed) —
   `SETTLE_TIMEOUT_MS` → 150 s with the rationale recorded, PLUS the §9-
   recommended boot-retry guard (a red carrying the cold-boot signature gets
   ONE fresh retry on a rebooted server; a red without it fails at once).
   DISCOVERY QUEUED TO THE AUTHOR (not
  acted on in R103): the R20/53 55 ms breaker was unreachable BY CONSTRUCTION — the
  guard averaged the same capped dt, and 0.05 < 0.055 could never trip. R107
  resolved this while preserving the 55 ms / 180-frame / three-strike safety law:
  the breaker now receives capped wall-frame time and clears its sample window while
  the document is hidden. Receipts: typecheck
  clean; round17/18/63/72 head gauntlets green (pinned bodies byte-untouched —
  only call-site arguments moved); bug probe ALL GREEN on the real GPU, 4/5→green
   on SwiftShader with the witness firing; standalone smoke GREEN
   (histL1 0.0681 vs 0.12, zero console errors); **full verify exit 0 on the
   final tree** (21 gauntlets, smoke green first attempt, prod smoke green;
   two mid-session in-chain reds were the documented cold-boot race, the new
   retry guard reporting honestly);
   `audit:arch --check` clean with in-commit snapshot refresh (three new probe
   instruments absorbed). `docs/ROUND-103-THE-WALL-CLOCK-JUTSU-2026-10-03.md`
- **R105 (this round, on branch `r105-the-sealed-floor`):** THE SEALED
  FLOOR — the author's bug report and decree: with zero realities (legal
  since R102), zooming hard into the Astral Core pushed the dial through the
  multiverse floor and the "multiverse floor return" fired a zoom-velocity
  Kamui INTO a reality's cosmic web with NO reality (the crossing had no
  `activeReality` guard), landing in the phantom view — empty web, and the
  lone default-palette anchor star resurrecting itself from camera distance
  alone (`anchorGroup.visible = sysW > 0.02` re-evaluated every frame with no
  reality guard, overriding `setReality(null)`'s one-time hide; "no Galaxy no
  planets just single anchor star", the author's exact symptom — the empty
  boot's degenerate focus even RESTS the camera inside the Astral Core's
  glass shell, one inward scroll from the crossing). Asked, the author ruled
  **DELETE ENTIRELY** — not just the empty case. THE CUT: the floor-return
  block deleted whole (the floor clamp stays — the membrane is a wall now,
  pushing into the core stops there), `MULTIVERSE_FLOOR_RETURN` /
  `RETURN_ZOOM_VEL` die in stageThresholds.ts ("a wall, not a door"), the
  anchor/belt per-frame visibility writes gain the `!!this.activeReality`
  gate (the round95-pinned `sysW`/`homeRealmW` lines byte-identical — zero
  reconciliation there), and the web→multiverse ceiling push STAYS (it
  exits; it never enters). Entering a reality is now exclusively the
  explicit Kamui doors (marble click / palette / stepper) — the AGENTS.md
  R71 law enforced without exception. GAUNTLET RECONCILED: round72's
  section 5 (which pinned the deleted crossing verbatim) rebuilt as the
  sealed-floor NEGATIVE pins (thresholds absent from engine + thresholds; no
  `zoomVelocity <` reaching a toWeb call within a 240-char window; exactly
  one velocity-gated crossing left in the family — the outward ceiling exit;
  clamp held) — and the first mutation run caught OUR OWN VACUOUS PIN (a
  120-char window too tight for the ~145-char guard shape stayed green on
  the mutated tree; widened with the measurement recorded — R98's lesson
  caught in the act). RUNTIME PROOF: the R102 independence probe gained
  assertion 7 — after the empty boot, 30 sustained inward wheel notches at
  the floor (the author's own gesture, wheel-up = zoom-in) — ALL GREEN on
  the fix, and RED (`cosmicStage=web`) with the old crossing temporarily
  restored, then green again: the probe reproduces the author's bug on the
  old code. Receipts: typecheck clean; full verify exit 0 (22 gauntlets,
  smoke histL1 0.0716 vs 0.12 on the wasm tier, zero console errors, prod
  smoke green); audit `--check` clean after an in-commit snapshot refresh.
  `docs/ROUND-105-THE-SEALED-FLOOR-2026-10-04.md`
- **R104 (this round, on branch `r104-the-desktop-rebirth`, cut from main's
  R103 tip — **MERGED --no-ff into main on the author's word, 2026-10-04,
  after the author's hands-on test drive of the built app: "everything is
  working"; the branch deleted after the merge — only main remains**):
  THE DESKTOP REBIRTH — the
  author's decree: the website is *"at its best shape"* but the installed
  desktop app is *"total disaster"* — *"delete and rebuild the desktop
  version from zero."* THE DIAGNOSIS BEFORE THE BLADE (measured-first): the
  old shell's `tauri.conf.json` launched WebView2 with **ZERO GPU
  configuration** — no additionalBrowserArgs, no webview2 section, nothing in
  Rust — so when WebView2's GPU process stumbles on the Intel iGPU it
  silently falls to SwiftShader, and R103 had already measured that exact
  state at **~2.9 fps** with the lens off: the author's disaster, by
  construction. THE DELETION (commit `c953a476`): `git rm -r src-tauri/` in
  its own commit, fully restorable. THE REBIRTH (commit `8ba899de`): the
  shell rebuilt from zero with the birth-right the old one never had — the
  main window carries `additionalBrowserArgs` = wry's defaults +
  **`--use-angle=d3d11`** (the exact SwiftShader escape the project's own
  probes use); identity/version/CSP/bundle/updater carried verbatim;
  `main.rs`/`lib.rs` re-authored with the 31-command surface byte-equal
  (12-space handler entries for the round98 parse); `Cargo.lock` regenerated;
  the three shipped icons REGENERATED through the R80 pipeline from
  `logo-master.jpg` (`public/favicon.png` came out BYTE-IDENTICAL — the
  website untouched; the R86-purged 512 orphan not resurrected). **STAGE 2B —
  THE DECREE COMPLETED (the author's ruling: "when I tell you to rebuild
  everything but first delete everything I really need EVERYTHING"):** stage 2
  had resurrected six files verbatim from history (`build.rs`, `cosmos.rs`,
  `store.rs`, `realities.rs`, `sky.rs`, `tauri.updater.conf.json`); they were
  deleted in their own commit (`f02effee`, tree does not compile on it —
  exactly like stage 1) and RE-AUTHORED FROM ZERO — cosmos.rs derived from
  cosmos_engine.hpp (the C++ header IS the FFI contract), build.rs restructured
  into three functions, store.rs re-organized around one id-guard + one atomic
  write helper, realities.rs's four copy-pasted lookup loops FACTORED into one
  `locate_folder()`, sky.rs re-expressed with its R98 whitelist history — while
  every behavioral pin, on-disk format, JSON shape and generated template
  survived the rewrite: **all seven shell gauntlets green on the first run
  after the rewrite** (79/84/87/91/98×2/104), cargo check clean, audit
  snapshot refreshed for the shifted realities.rs line numbers. HONESTY FROM BIRTH: `src/platform/desktop/bootWitness.ts` —
  a once-per-session desktop-gated console line naming GPU renderer + tier +
  physics backend + webview version (web mode: a no-op). THE LAW LOCKED:
  `round104-desktop-shell-gauntlet.ts` (16 checks — GPU-first args,
  wry-defaults preservation, the never-again GPU-killing flag negative,
  version lockstep AS A GATE, updater overlay, devtools, welded core,
  vswhere, capabilities, 31/31 commands, witness, probe) joined to the verify
  chain; its first run caught a real landmine (the lib.rs header mentioning
  the literal macro string hijacked the round98 handler parse — the gauntlet
  now anchors on `lastIndexOf`). THE MEASURED VERDICT (commit `186b9e67`;
  new probe `scripts/probes/round104-desktop-perf-probe.ts`: spawns the BUILT
  exe with the WebView2 remote-debugging port, attaches Playwright over CDP,
  drives the author's real saved state): the webview renders on the REAL GPU
  — `ANGLE (Intel, Intel(R) UHD Graphics (0x000046A3) Direct3D11 vs_5_0
  ps_5_0, D3D11)` — the geodesic lens attaches at defaults, physics is
  native-cpp, the witness speaks, zero console errors. THE FPS CONTRACT,
  REFRAMED BY EVIDENCE: the shell's job is to beat the same-class browser
  pipeline — desktop **11.0 fps** vs GPU-forced Chromium **1.9 fps** on the
  same machine, same dist (p95 104 ms vs 267 ms) — ~6×, PASS; the old 2.9 fps
  SwiftShader disaster is unreachable. THE ABSOLUTE 50 FPS BAR REASSIGNED:
  at default weight the SCENE is the limiter (geodesic raymarcher + the
  author's cosmic-web state on the iGPU) — the butter recipe measured
  (quality=low + Studio off → 15.9 fps on the same heaviest scene, keys
  restored after), the auto-path is the R103 §7 breaker (still the author's
  call, see §9). Probe hardening earned in live fire: app-page pick by URL
  (WebView2's pre-navigation about:blank INHERITS the app CSP — a blind
  attach turns every string evaluate into a violation), retry-polling engine
  wait, the empty-results ALL GREEN bug killed, the ledger merging across
  invocations, stage + activeRealityId riding the receipt. IPC ACQUITTED:
  0 kepler invokes in the steady window (the R95 retire holds). Receipts:
  typecheck clean; cargo check green; `desktop:build` green (20.4 MB exe,
  core welded); round104 gauntlet 16/16; probe ALL GREEN; audit `--check`
  clean with in-commit snapshot refresh; **full verify exit 0 on the final
  tree** (22 gauntlets, smoke histL1 0.0738 vs 0.12, zero console errors,
  prod smoke green); ledger + captures in `scripts/verify/round104/`.
  `docs/ROUND-104-THE-DESKTOP-REBIRTH-2026-10-03.md`
  the tree — "the frontend looks genuinely good, but the backend is total mess"
  — audited and answered. THE AUDIT: there is no backend (offline-first is the
  law); the Rust shell is 1,715 lines / 31 commands / six documented files;
  `src-tauri/target`, `dist`, `node_modules` are untracked build cache (0
  tracked files among them); the architecture is real and audit-enforced. The
  ONE genuine mess was `scripts/` — 32 files flat, named by round number.
  THE TIDY HOUSE: 19 gauntlets → `scripts/gauntlets/`, 4 probes →
  `scripts/probes/`, 5 tools → `scripts/tools/` (top level: 5 files + 5
  folders, cataloged in the new `scripts/README.md`); every reference followed
  the move (package.json verify chain ×19, the auditor's path-encode lists,
  AGENTS.md, CI ×2, ~132 relative-root rewrites, the three probes' ROOT,
  build-wasm.sh's root, two cross-gauntlet reads); the snapshot regenerated in
  the same commit. THE VISIBILITY: `docs/ARCHITECTURE.md` rewritten from the
  stale R52 record to post-v16.0.0 truth (the tier chain, the session driver,
  updated locked-path and persistence tables, the debt register); the diagram
  regenerated (120 files / 379 edges); README §3 and note.txt surgically
  refreshed; §5's map rewritten. Canary receipts: round16/17/63 green
  from their new homes (63 proves its own chain path), the physics probe 30
  sim-days clean, `audit:arch --check` clean. Full chain: the first
  `npm run verify` run went 19-for-19 on gauntlets then hit the SMOKE cold-boot
  flake (R84's sighting, now a second — green on the immediate re-run,
  histL1 0.0707); the second full chain was GREEN end-to-end (histL1 0.0716,
  prod smoke green, zero console errors). NO law, constant, seed, or gauntlet
  touched — the gauntlets moved, they did not change; `src/` is byte-identical.
  Historical round docs keep the old paths (records, not rewritten).
  `docs/ROUND-96-THE-TIDY-HOUSE-2026-10-02.md`
- **R97 (this round, on branch `r97-the-engine-divided`):** THE ENGINE, DIVIDED
  — the author's follow-on verdict: the house is tidy but the engine is still a
  monolith; the round decomposes it for real. COMMIT 0 — the union harness:
  `scripts/gauntlets/engineSource.ts` joins engine.ts and the coming subsystem
  modules (fixed order, shell first) so all 14 engine-reading gauntlets keep
  their 235 source pins intact over the whole family. THE SIX EXTRACTIONS,
  each independently green (typecheck + 19 gauntlets + smoke + prod smoke,
  audit snapshot refreshed in the same commit): **sky/SkyFxSystem.ts** (meteors,
  Cosmic Echo, aurora, surface dressing — first cut, beat the R62 rigid-default
  pin honestly with a `lens?` pass-through), **blackhole/BlackHoleSystem.ts**
  (attach/release, tier switch, breaker, adaptive resolution, camera checkpoint
  — round63 caught the one wrong cut; answered architecturally by leaving
  `bloomHoleBoost` engine-owned since the pinned bloom line stays in the shell),
  **kamui/KamuiPortalSystem.ts** (vortex + portal + hold + stage-warp moved as
  ONE machine because they share the pass and the beat clock — the four
  tickFrame segments became updateKamuiBeats/updatePortalHold/updateStageWarp/
  updatePortalPhases called in the same order; one reconciliation: round72's
  `private stageWarp {` shape pin), **worlds/InnerGalaxySystem.ts** (the dive
  realms + lifecycle; two round92 union reconciliations — driverReadback count
  3→4, and both legitimate seams now stripped before the negative scan),
  **worlds/BodyBuilders.ts** (anchor/bodies/belt/moons/plates/rebuilders — one
  recovery: a mis-bounded sed was caught by typecheck, file checked out and the
  cut redone in a single verified pass), **stages/LevelStageSystem.ts**
  (multiverse builder + level stages + the per-frame arbiter; 129 generated
  name-preserving getter/setter pairs typed `UniverseEngine[...]`).
  THE BARREL: `state/actions.ts` (1,275) → a 16-line barrel over
  `actions/shared|realities|bodies|entries|vault|portability`, same import
  path, byte-identical slices, plus `scripts/gauntlets/stateSource.ts` as the
  state-side union (round92/84/95 pins green verbatim). RESULT: `engine.ts`
  6,983 → 2,785 (the shell: boot, frozen tickFrame order, updateBodies the
  one write seam, interaction, dispose); public API frozen — `App.tsx` and
  `SimulatorTwinCard.tsx` untouched; dispose order verbatim; every commit in
  the chain is independently green. engine.ts's perceptible shape did not
  change — the smoke frame-pin keeps passing (0.0716 L1 distance in the last
  full run). Diagram regenerated (132 files / 464 edges).
  Docs: ARCHITECTURE.md §1/§2/§3/§7 refreshed (register #1 and #2 struck),
  README §3 repointed, scripts/README.md updated, and the round doc records the
  full reconciliation ledger.
  `docs/ROUND-97-THE-ENGINE-DIVIDED-2026-10-02.md`
- **R98 (this round, on branch `r98-the-real-contract`, cut from R97's tip):** THE
  REAL CONTRACT — the author's verdict, in the car metaphor: *"the C++ engine is
  in the boot but not connected to the wheels"*, *"two gearboxes have started
  disagreeing"*, *"something that tells us this has gone wrong"*. One theme under
  all three: **the project had three implementations of contracts it believed were
  single** — the TS physics law vs the C++ port, the Node daemon vs the Rust
  desktop shell, and the SOURCE vs the SHIPPED BINARY — and **nothing in the
  verify chain could see any of the disagreement**. Every one was invisible by
  construction. COMMIT 1 — repair the test net: R97 commit 1 moved `windowFn`/
  `hash`/`vnoise`/`cpuFbm` into `engine/math.ts` but `ENGINE_FILES` was never
  updated, so any future pin on them would have matched nothing and passed
  VACUOUSLY; plus the dead-code sweep (a dead `coreHoverT` setter was removed,
  TS2540 restored it — compound assignment through a getter is true at runtime
  and false at compile time, and the compiler was right). COMMIT 2 — make
  degradation VISIBLE (the author's question): five bare `return null` paths in
  `loadWasm` became NAMED rejection reasons; `CosmosStatus.degraded[]`/`fellBack`
  reaches `CppNativeEngineCard`; a one-time `console.warn` names the reason and
  the tier used; and **hard assertions** in `round95-steady-sky-live.ts` +
  `smoke.ts` fail on a silently lost tier. That assertion is the receipt that
  proves the whole round — and it was **negative-tested** (with the artifact moved
  aside it fires; without that move the TS branch is never reached and the test
  proves nothing). COMMIT 3 — the physics conformance gauntlet, which went RED on
  today's drift **on purpose**. COMMIT 4 — closed it: goliath ecc
  `0.0489`→`0.0453`, `BodyProfile` gained `tiltDeg` so the three retrograde
  worlds (veil 177.4 / hollow 122.5 / mirror 97.77) stop being flattened to
  Earth's 23.44° by a `kind ==` ternary, and the false "identical ids, values
  and defaults" comment rewritten to state what is actually guaranteed.
  **Proven at runtime with real MSVC-compiled C++: 8 mismatches → 0.** COMMIT 5 —
  the backend conformance gauntlet (89 checks: every route has a Tauri command
  AND an adapter arm, sanitisation parity, rename derivation, containment before
  destructive per bin op, Sky Studio caps/MIME, the asset whitelist). COMMIT 6 —
  the two gearboxes resynchronised, three real drifts closed: the Rust rename
  patched only `index.ts` while Node patched `index.ts` AND `surface.ts` (one
  world, two names); the Rust sky whitelist took the **LAST FOUR BYTES** and
  matched patterns **including the dot**, so only 4-char extensions had ever
  worked and `.jpeg`/`.webp`/`.avif` silently failed on desktop while its own
  `MIME_BY_EXT` listed them; and it accepted the empty id `sky-.png` that Node
  rejects while being byte-exact where Node's regex carries `/i`. **Proven with a
  standalone `rustc` harness: 8 divergences → 0 over 17 cases.** (Neither form was
  a path escape — `is_inside` holds either way; these were contract drift.)
  COMMIT 7 — **the wheels stayed UNWIRED, deliberately.** `cosmos_physics_batch`
  is the profile table's ONLY consumer and has no production caller, so the plan's
  final wiring step was not performed: the committed `cosmos_engine.wasm` is
  STALE (proved by content — the pre-fix `0.0489` hits the binary's bytes, the
  fixed `0.0453` does not) and there is no emsdk/clang/wasm-ld on this machine,
  so wiring it would have made **web and desktop return different per-body
  physics** — the exact divergence the round exists to kill, reintroduced by the
  step meant to close it. The guard is a **severity that follows reachability**:
  WARN while dormant, hard FAIL the moment a production caller appears
  (negative-tested both directions). The Kepler path IS connected and always was
  — `refreshKeplerCache` calls `keplerBatch`, smoke prints `SMOKE TIER — wasm`
  with `keplerCache.valid: true`. **THE LESSON:** three times this round a check
  passed green while proving nothing (read the source not the artifact; an
  allowlist path mismatch making `every()` vacuous over an empty array; a scanner
  blind to the indirect `verifyParity`→`physicsBatch` caller). Each was caught by
  asking "what would make this check unable to fail?" and then mutating the code
  to find out. Every negative in R98 is proven by mutation, not by inspection.
  Chain: typecheck + **21 gauntlets, 398 checks** + smoke + prod smoke all green,
  frame unmoved (histL1 0.0725 vs the 0.12 pin); `audit:arch --check` clean.
  Standing debt: the stale WASM artifact (`npm run wasm:build`, added this round,
  needs emsdk), the by-design unknown-body tilt gap (TS seeded, C++ constant),
  and `verifyParity` still UI-button-only.
  `docs/ROUND-98-THE-REAL-CONTRACT-2026-10-02.md`
- **R99 (this round, on branch `r99-the-wheels-connected`, cut from R98's tip):** THE
  WHEELS CONNECTED — the author asked for a review of the R98 session and for the
  plan's final step to actually happen. THE REVIEW: R98's engineering held up (the
  drift closures, the degradation ledger, the staleness gate all verified against
  the tree), but its load-bearing premise was FALSE — **emsdk 6.0.10 has lived at
  `~/Desktop/emsdk` since R95's post-session completion (recorded in §7!), off the
  PATH, and R98 probed only the PATH** and concluded "no emsdk on this machine".
  COMMIT 1 — build-wasm.sh activates emsdk itself (probing ~/Desktop/emsdk then
  ~/emsdk) and the artifact is REBUILT from the R98-fixed source (0.0453 in the
  binary's bytes; the staleness WARN fell silent). COMMIT 2 — the last divergence
  R98 recorded (the unknown-body tilt: TS seeded, C++ constant) is CLOSED — the C
  API always carried the seed's three ingredients (id, radius, kind) and
  `seededDefaultTilt` now derives the same number line-for-line — and the numerical
  half R98's header promised but never implemented now EXISTS: the gauntlet
  executes the shipped artifact under Node through the EXACT production marshalling
  and decoder, comparing every field against the TS law (12 bodies, **91 green
  checks**), and the execution caught TWO latent bugs before the wiring shipped
  them: (a) the wasm path marshalled kinds/hasRings as f64 while the C takes
  `const int*` — 1.0 reads as 0x3FF00000, every non-zero kind arrived as garbage
  and even indices read as kind 0, a STAR (latent since the artifact first existed;
  fixed by the extracted, exported `marshalPhysicsBatch` over Int32Array); (b)
  `-ffast-math` does not preserve NaN stores — the C's NaN for a non-rel body's GR
  fields ships as 0, so the decoder keys off the isRelativistic FLAG (field 29),
  verifyParity treats either-side NaN as absence, and loadWasm validates the whole
  ccall/malloc/free/HEAPF64 surface. COMMIT 3 — THE WIRING: `engine.syncBodies`
  hands the roster to `cosmosBridge.primePhysics` (fire-and-forget, one batch per
  roster change); on wasm the compiled core answers, on desktop
  `invoke('cosmos_physics_batch')` does, and `installNativePhysics` overlays the 41
  contract fields onto the memo `calculatePhysics` serves — the TS reference stays
  the synchronous zero-fail path and keeps the two Einstein-only fields.
  **PROVENANCE, NOT VALUES:** the gauntlet executes the chain field-for-field and
  the smoke ran the real app — `SMOKE TIER — wasm`, histL1 0.0712 vs the 0.12 pin
  (R96–R98: 0.0716–0.0725), zero console errors, prod smoke green. Reachability
  law consciously reconciled: primePhysics is the blessed production consumer
  (three checks pin the seam at both ends), no file outside the bridge may call
  physicsBatch/verifyParity, and since the method is reachable BY CONSTRUCTION a
  stale artifact is a hard FAIL without qualification. Mutation-proven both ways
  (unwire → red → rewire → green). Snapshot refreshed; scope lines drawn: the
  session driver, simTwin and the galaxy-dive inner systems stay on the TS
  reference by law (the driver's determinism is its own contract).
  **R99.1 (same day):** the last silent path — primePhysics' bare catch — became
  a VALUE: counted on `CosmosStatus.primeFailures`, warned once on the console,
  and asserted at ZERO by the smoke ("the boot is not clean even though the
  frame may match") — mutation-proven red on a forced failure.
  `docs/ROUND-99-THE-WHEELS-CONNECTED-2026-10-02.md`
- **R100 (this round, same branch, 2026-10-03):** THE SELF-CONTAINED EXE — the
  author said *"I have MSVC — check please"*, and the disk proved them right
  TWICE over: Visual Studio 18 Community (VC tools 14.44 and 14.51) plus Build
  Tools 2022, on the machine whose every desktop build printed "No C++ compiler
  found — building with cosmos FFI stubs" since the port began. The build.rs
  probe looked only at the PATH; MSVC is famously not on the PATH outside a
  developer prompt — R98's emsdk lesson, repeated verbatim, corrected the same
  day. COMMIT 1 — the gate asks vswhere what the cc crate asks; `desktop:check`
  now runs with ZERO stub warnings and `libcosmos_engine.a` (888 KB) freshly
  compiled from the R99-fixed source: **cargo check is compile-verified on the
  author's laptop — the standing debt since R85 is CLOSED** (R84's FFI
  extension, R85's write-data twin, R86's seed guard, R98's Rust edits — all
  now compiled). COMMIT 2 — THE WELD: dumpbin showed the shipped exe demanding
  **MSVCP140.dll** (the VC++ Redistributable — a machine without it refuses to
  START the app); `cc::Build::static_crt(true)` (the crate's own supported /MT
  switch — a raw .flag("/MT") loses to cc's appended /MD, found empirically)
  makes the C++ core link `libcpmt` (static) instead of `msvcprt` (dynamic),
  and the exe's redistributable imports drop **1 → 0** — the remaining
  api-ms-win-crt-* imports are the Universal CRT, built into Windows 10+
  itself, not a download. crt-static for the Rust half was attempted and
  REVERTED with the lesson recorded (proc-macro crates like `syn` cannot link
  a static CRT — and the baseline proved it unnecessary: the Rust side demanded
  no redist DLL). Linux twins (-static-libstdc++/-static-libgcc, no-ops where
  unknown) weld libstdc++/libgcc; glibc stays dynamic by design (static glibc
  breaks NSS) — and the Linux dependency story is the distro's own: .deb
  resolves deps via apt, AppImage bundles them, and WebKitGTK is the one
  system library no Tauri app can weld (by design). Receipts read from the
  binaries themselves: dumpbin 1 → 0, the exe LAUNCHES under the new linkage,
  desktop:check green, cc 1.5.1 pinned in Cargo.lock so CI inherits it.
  NEW watch item: CI builds Linux on ubuntu-latest (24.04) — pinning to the
  OLDEST supported LTS is its own small round (the workflow's 24.04
  workarounds would need re-checking).
  `docs/ROUND-100-THE-SELF-CONTAINED-EXE-2026-10-03.md`
- **R90 (this round, on main):** the author's report — the Native Simulator Twin card
  (Verify Twin with it) could not be scrolled into view in the Core Console — reproduced
  by live measurement and traced to a **Tailwind v4 cascade-layer trap**: `.cc-root`'s
  unlayered `position: relative` silently beat the markup's layered `fixed inset-0`, so
  the deck rendered as a 2023 px in-flow block inside an `overflow: hidden` page, its
  internal scroller engaged only 26 px, and the twin card sat 259 px below the fold —
  unreachable. The fix is load-bearing and in CSS itself: `.cc-root` declares
  `position: fixed; inset: 0` (scroll range 26 px → 1249 px). On top of it, the **Twin
  Jump**: an always-visible top-bar seal (`#cc-twin-jump-btn`) that lands the dashboard
  tab, scrolls `#simulator-twin-card` into view, flashes it (2.2 s violet ring, instant
  under reduced motion), and carries a measured safety net — a frame-starved window
  (0 rAF ticks in 2 s, measured) never advances a smooth scroll, so the jump snaps
  instantly if the card hasn't arrived in 900 ms. `overscroll-contain` on the deck's
  scroll body. Full verify chain green twice; live end-to-end: seal click → card in
  view → Verify Twin → verified receipt.
- **R85 (this round, on branch `r85-the-six-seams`):** the R83 decision queue executed at the
  author's ruling. The six seams: `mapRealityEndpoint` switches on the bare route (the boot
  photo sky lives on desktop again); the `write-data` desktop twin (`reality_write_data`,
  the server's resolve→contain→skip-identical semantics in `realities.rs`) makes the reality
  mirror real and kills the 5-retry burn; the chain-dead `/folders` + `/delete-folder` routes
  deleted at every layer (`list_folders` kept for the daemon); `releaseBlackHolesUnder`
  releases every hole visual (listener + LUT + material + dead per-frame bisection) at
  `syncBodies`, the galaxy-stage rebuild and `Engine.dispose()` — `blackholeRaymarch.ts`
  untouched (round17 pins it); `eventide-vault-pulse` and `eventide-camera-memory` removed
  not re-wired (R55 law; camera persistence untouched); the vault facade's stranded tail
  deleted, `novaScan` calls the real `isNova` (module-private now) and the keyring's shadow
  is `isBreached`. The sweep: 121 dead exports de-exported (never deleted) and 1147 unused
  imported names removed across 26 files — near four× the census estimate — to the audit's
  fixed point: **zero dead value exports, zero dead type exports**. Extras: the MIT notice
  file restored verbatim from history and `BUILD` = 'R85'. Watch item: `cargo check` still
  unprovable here (no MSVC toolchain — covers R84's FFI and R85's `reality_write_data`
  alike); the 3 dead CSS classes and the remaining R83 ledger rows wait for their own
  rulings.
- **R86 (this round, same branch):** the R83 Part III census settled by the author's
  three-bucket ruling. Deleted: `zoomToDemonCore`, `portalBodyRadiusForReverse`,
  `scripts/test-upload.ts`, the five write-only engine fields (`arrivalZoom`,
  `_camMemStable`, `echoShowerClock`, `skyApplying`, `timeScale`), `__ACTIONS__`,
  `subjectBadge`, the console-tab CSS + `--color-danger`, the 512×512 icon, 11 historical
  verify PNGs, the dead `store_payload_list/stats` Rust pair. Wired: the recovery-key
  constant in persist.ts, `realityDaemon.stop()` on shutdown signals, and the R83-2 seed
  guard (Sol-Prime mirror writes refused at client/server/desktop — the Version 17.1
  churn is now impossible). Kept with reasons: `__MY_UNIVERSE_PERF__`, the state
  timestamps, `note.txt`, `cosmos_sim_*`. Then the author's same-day decree REJECTED
  engine-side reduced motion outright ("the violence IS the Kamui") and the
  `reducedMotion` probe was deleted with it (§6's law note). The lesson:
  `.kamui-disappear`/`kamuiVortexOut` were deleted as audit-dead CSS, round18's gauntlet
  failed, both restored — the census's new category is "looks dead but is gauntlet-pinned."
- **R87 (this round, on branch `r87-native-simulator`, branched from `r85-the-six-seams`):**
  the author accepted the hybrid ruling — Kepler stays the clockwork, the stateful native
  simulator (RK4, SI, 4096 bodies — hosted by the C++ core since its first build) becomes
  the verified interactive layer. The bridge speaks the session on all three tiers
  (`simConfigure/simStep/simBody` + `verifyTwinParity()` with a line-faithful TS RK4 twin),
  the Native Simulator Twin card joined the Core Console (button-driven only — the frame
  loop never touches it, the rendered sky cannot move), round87-simulator-gauntlet (14
  checks) joined the verify chain, and a HIDDEN BUG died: build-wasm.sh had no
  EXPORTED_FUNCTIONS, so -O3 dead-stripped every cosmos_* symbol and the whole WASM tier
  (batches included) had been silently degrading to TypeScript since the artifact first
  existed — the script now pins the full bridge surface. Limits: emsdk absent locally
  (artifact rebuild is CI), cargo caveat unchanged (no Rust touched), native numeric
  receipt provable only on a toolchained host. Next gated step: the per-frame twin, then
  any interactive-layer driving — only after these receipts.
- **R72 (this round):** the membrane Kamui arrival is STAGED — the summon holds the traveler's
  stage and dial for the full choreography and the throat hands the multiverse over through the
  dying vortex (the R67 grammar carried to `beginStageWarp`); the eject face is untouched (its
  decay IS the arrival); a live warp/vortex/portal now refuses a second crossing. The reverse
  come's push was matched to the way out (`RETURN_ZOOM_VEL` −0.05 → −0.02) and always lands
  back in the cosmic web (dial 0.72), never the home stellar system — the author's explicit
  law: no reverse Kamui at the home page, the galaxies stay choosable after returning.
- **R73:** the vault Kamui's "the black hole totally vanishes" — the vacuum gulp
  drained the hole/vault body's own group (caught at 24% and collapsing live); the swallow
  resolver now refuses hole/vault subjects (THE THROAT IS NOT SWALLOWED) while planets and
  galaxies keep the canon drain. The gulp's surge/rumble/vortex are untouched.
- **R74:** the hover herald — honest colliders, the projected-disk anchor (cards stand
  OUTSIDE the hovered object, riding it at ~8 Hz), the shared holographic shell (3D entrance,
  spinning holo border, sheen, stem), pointer-events-none except real buttons. The user's
  three hover complaints (too-early pop, card covering the target, click stealing) are fixed
  and live-verified on their own galaxy.
- **R75:** the unbroken bridge — the card used to die mid-journey to its own buttons: the
  rim crossing armed a 550 ms goodbye that fired under a paused pointer (a pause emits no
  events, so cancel-on-move could not save it). Now the last disk and the pointer's resting
  place are refs, `pointerOnBridge` guards card ±8 and the rim+48 corridor, and the honest
  goodbye re-checks the resting place at fire time and re-arms while the traveler is still
  on the bridge. Live-verified on the user's own galaxy: rim crossing + full 1 s stop, two
  corridor pauses, arrival at "Dive In" — alive at every checkpoint; leaving both lifelines
  still departs the card on schedule. The interrupted session's "rivers" complaint decoded
  as "reverse Kamui" — R72's law, already green.
- **R76:** the steady herald & the web door. The card is stable enough to roam: the disk
  state survives null hover emissions (the card keeps its anchored placement + stem for the
  whole crossing; the old code teleported it onto the cursor fallback at the rim and
  flickered it at every boundary graze — the "vanishes before I get there" report). And a
  reality-sphere click now fires the Kamui and lands on that reality's COSMIC WEB (dial
  0.858) instead of resetView's home stellar system. Both live-verified; watch items
  queued: the camera memory can remember a mid-dive placement (boots inside a galaxy until
  resetView), and a dive queued before a reality switch executes on the roster landing.
- **R77:** the tail trim — the Kamui's mature-vortex plateau (the stretch highlighted in
  R73's telemetry) is cut: the summon ends at 5.0s, the vacuum drain at 1.0s, the R67 hold
  follows to 5.0; the build beats and the eject are untouched. Live-verified (hold and
  Kamui in lockstep 4.9→0.1 over 5.0s; the vault opens at machine +5.3s vs ≈5.65 before).
  New watch item: a click can be refused while a reverse Kamui is still unwinding — if a
  traveler ever feels a dead click right after closing a diary/vault, that refusal window
  is where to look.
- **R78:** the living spin — the mature vortex no longer sits frozen. The tear's twist
  was a static bend (uTwist, a running max saturating in the first half-second), so from
  ~0.5s to the gulp the vortex geometry did not move. The engine now integrates the
  vortex's own rotation (`kamuiSpinPhase` → `uSpin`) for as long as the tear is visible:
  the rate rides the eased strength, surges with the gulp, and coasts to a stop with the
  fading glow (the R67 unwind law honored); the shader folds it in through the existing
  falloff, making the spin differential (the inner band winds visibly faster), and the
  ripple marches inward on the summon / outward on the eject. The early bite is a touch
  sharper (twist 6.5→7.0, pull 0.28/0.22→0.32/0.26). The R66b revert boundary is respected:
  that revert was the Universe Surface sky lens — this round touches only the portal pass,
  at the author's explicit request.
- **R79:** the one sky — the author's three photo-sky complaints, solved as
  one law: while a photo hangs in a reality's sky, the photo IS the sky. The
  vertical barrier was TWO defects on the same meridian (the vignette centered
  on the atan branch cut, jumping 0→full across it; mipmaps collapsing to the
  1×1 gray average at the derivative spike) — now a camera-relative angular
  vignette and a mip-free texture. The double sky was by construction (blend
  0.85, a 6% ghost floor, glow tint, star shells over the photo) — now the
  one-sky gate stands the whole procedural family down (dome, nebulae, far
  stars, neighborhood) whenever the photo owns the view at full strength, and
  returns it for the crossfade, the Kamui tear, the multiverse rest and
  deactivation (which rides the fade out — no pop). The zooming sky was the
  static world-sphere dome the camera exits between cluster and web — now the
  dome rides the camera every frame, the equirect always 1:1 from the eye
  point, full-screen at every stage. `blend` defaults to 1.0 in all three
  contract tiers (registry / server / Tauri); chasinLove's sky.json migrated;
  uploads rasterize at 4096×2048 when the JPEG stays light.
- **R79 hotfix — THE UNBROKEN BOOT (commits `8bbfacdd` / `9da562bd` / v15.0.4):**
  the installed 15.0.3 desktop app looped the intro animation forever.
  `hydrateDesktopSnapshot` compared the desktop state file (mtime 2026-09-27,
  missing the boot-default keys `loadState` adds every session) against the
  WebView cache and on any difference clobbered the cache with the file and
  called `window.location.reload()`. The cache was enriched by `loadState`;
  the next mount found file ≠ cache; threw the migration away; reloaded — the
  loop never converged because the reload always fired before the debounced
  persist could write the file. Fix: a `sessionStorage` one-time guard
  (`STORAGE_KEYS.hydrateAdopted`). The adoption+reload fires at most once per
  webview session; the second disagreement (boot after the reload) adopts the
  cache back into the file instead of clobbering, so both stores converge
  permanently. The `UNCLAIMED-hydrate-adopted-fix.patch` has been applied,
  committed as the hotfix, and deleted from the tree. Full verification green
  (typecheck + all gauntlets + smoke). Pushed to `main`; v15.0.4 installer
  built by the release pipeline, published, and confirmed live on the author's
  machine (the updater card could never fire on 15.0.3 — the boot loop killed
  the card's 8-second update-check timer first — so v15.0.4 was installed
  once manually; every later version arrives via the card).
- **R80 — THE MARK (2026-09-30, v15.0.5):** the placeholder icon died.
  The OFFICIAL face is the AUTHOR'S SIGIL — their blue four-pointed-star
  photo (`src-tauri/icons/logo-master.jpg`), rendered per-size through a
  Playwright-Chromium photo pipeline in `scripts/make-icons.mjs` (center-
  crop to fill, unsharp mask, S-curve contrast, gamma + white-point lift,
  tighter crop at small sizes; each size drawn directly from the source).
  The FALLBACK face (`--eventide`) is the analytic Eventide-at-rest mark
  (black horizon pit, teal→gold accretion ring, violet lens halo, abyss
  square) — both faces saved as PNGs on the author's desktop. Ships as
  `src-tauri/icons/` (128/32/512/ico) AND the web's first favicon
  (`public/favicon.png`, linked in `index.html`). THE RC2175 LESSON: the
  first v15.0.5 tag failed on Windows only — the old generator's ICO wrapped
  a PNG and mislabeled itself a cursor; Windows RC requires 32bpp DIB
  entries (the repo hit this by hand once, commit `a7a299c5`); the generator
  now writes proper DIBs and is immune. Housekeeping: `Cargo.toml` version
  drift (15.0.2 vs 15.0.4) fixed — `tauri.conf.json` + `Cargo.toml` +
  `Cargo.lock` move in lockstep. RELEASE RITUAL (proven twice; the third
  time caught a Windows-only build break): bump the three version files →
  commit → tag `v*` → push; the GitHub pipeline builds (MSVC lives there,
  not on the laptop), generates `latest.json`, publishes the release, and
  the updater card delivers it. See `docs/ROUND-80-THE-MARK-2026-09-30.md`.
- **R83 — THE DEEP AUDIT (2026-09-30, report-only):** the author's decree — find every bug,
  orphan, dead end and hidden seam; touch nothing. Their own changes were deep-debugged: the
  testOne sky swap is sound (GIF is a designed input, rasterized to a first-frame 4096×2048
  equirect; asset byte-verified) EXCEPT testOne is the last reality at pre-R79 `blend: 0.8`
  (the one-sky gate still stands the procedural family down while the photo renders at 80 %
  over raw void — R83-1); the Version 17.1 "seed change" decoded as the disk mirror
  re-serializing a stale browser generation of data.json (boot truth is index.ts — no lore
  or physics impact, R83-2); the Version 18 commits deleted the dgreenheck/webgpu-black-hole
  MIT notice — a compliance gap, text recoverable from history (R83-3). The sweep's six real
  findings: **R83-4 the desktop sky/status seam can never match** (exact-path switch at
  `adapter.ts:143` vs the query-bearing caller at `skyRegistry.ts:166` — desktop never shows
  a boot sky, present since Version 14.3); R83-5 `/api/realities/write-data` has no desktop
  twin (silent 5-retry burn); R83-6 two chain-dead routes (`folders`, `delete-folder`);
  R83-7 `BlackHoleVisual.dispose` never called — window listener + stale-visual accumulation
  across reality switches; R83-8 two events fired into the void (`eventide-camera-memory`,
  `eventide-vault-pulse` — the latter contract-dead per the R55 gauntlet); R83-9/10 facade
  promising a never-written `getBackendStatus`, `isNova` dead by shadowing. The census:
  11 dead value exports + 48 dead type exports (auditor), 4 never-called functions + ~50
  export-only-dead, 12 write-only fields/seams, ~299 unused imports (291 in the vault UI
  preamble), 8 dead Rust commands (6 deliberate parity scaffolding), 3 test realities
  shipping in the product UI, 4 unconsumed surface.ts configs, `scripts/test-upload.ts`
  dead AND broken, the 512×512 icon generated but unbundled. CLEAN: zero dead files, zero
  dead actions/components, all 19 EngineCallbacks alive both ways, all EFS/executors/tiers
  exercised, gauntlet-pinned "dead" items flagged (PortalPhase, KAMUI_PHASE_WEIGHTS).
  **The full decision queue with proposed solves lives in `docs/ROUND-83-THE-DEEP-AUDIT-
  2026-09-30.md` — the author decides; nothing was applied.**
- **R84 — THE ASCENDING NODES (2026-09-30):** the author's realism decree — orbits may
  not all ride one flat sheet. Diagnosis: `orbit.incl` and true-3D tilts already existed
  with real solar-system values, but EVERY orbit's node line was hardwired to +X and no
  periapsis angle existed — nine planes fanned about one shared spine read as flat. The
  fix, end-to-end: `Orbit.node`/`Orbit.argP` (optional radians, 0 = legacy plane, zero
  migration); one shared composition helper `tiltInPlaneVector` (ω in-plane → i about
  the node line → Ω to azimuth) used by the solver, both moon sites, the anchor's
  barycentric wobble and Living Gravity (whose Δω now precesses EXACTLY in-plane);
  native parity through `cosmos_engine.cpp`/`hpp`, the Rust FFI real+stub, the Tauri
  command and the bridge (batch ABI extended with node/argP arrays, null-tolerant);
  Sol-Prime pinned to the real J2000 elements (JPL Table 1 — Mercury Ω 48.33°, Pluto
  110.30°, Earth's perihelion 102.94°, the retrograde vault crossing at Ω 200°) in
  seeds.ts, the config twin and the data.json mirror; the exoplanet spice
  (`inclinedOrbitElements`: gentle band, ~15% steep 30–60°, ~5% near-polar, random
  sign, full-circle nodes) wired into all four codegen sites + auto-vaults; both
  asteroid belts made toroidal (per-speck inclination σ≈6°). The four test realities
  (testOne/testWorld/auroraTest/chasinLove) DELETED at the author's explicit ruling —
  test data only; everything recoverable from history. New round84-inclination-gauntlet
  (21 checks) in the verify chain. Smoke reference held (green 0.066–0.074 histL1; one
  cold-boot flake diagnosed, never reproduced). `docs/ROUND-84-THE-ASCENDING-NODES-
  2026-09-30.md`.
- **R106 — THE LENS ANSWERS (merged to `main` at `0723578d`):** the quality-change
  handler and tier-switch handler had separate rules: quality changes disabled
  geodesic lensing at low tier even under Always On, and could re-enable it
  after explicit Off. Attach, quality, override, and recoverable-breaker paths
  now share `resolveRaymarchPolicy`; software rendering and permanent shader /
  three-strike disarms remain authoritative, and the Studio explains the
  software-renderer boundary. The camera-memory idle gate now also requires
  `CameraRig.isSettled`, so a home-galaxy zoom cannot be saved mid-flight.
  Probe servers now terminate their complete process tree, including on
  startup timeout. The R63 visual probe was still reading the removed
  `engine.blackHoles` field after R97's extraction; it now reads
  `engine.bhSys.blackHoles`. The architecture sweep reached zero dead value
  exports and zero dead type exports; `.kamui-disappear` remains intentionally
  gauntlet-pinned. The R103 GPU probe confirmed the disk raymarch and lens-control
  uniforms, but it did NOT inspect a rendered background galaxy/starfield, so it
  did not prove visible sky lensing. R107 repairs the signed sky map and adds a
  hardware pixel receipt for both image branches (see §9.11).
  R107 resolves R103's dead breaker measurement while preserving its protected
  threshold and permanent three-strike disarm.
  `docs/ROUND-106-THE-LENS-ANSWERS-2026-10-05.md`.
- **R107 — SIGNED SKY LENS (merged to `main` at `0723578d`):** the background map had
  clipped negative source angles, removing the secondary image; an artificial 4–6·b_c
  fade truncated long-range deflection; and point-source stars used the inverse
  image-to-source map. The sky now keeps the signed inverse map, uses a
  source-to-primary-image solve for point stars, and derives its effective Schwarzschild
  scale from the raymarcher's measured capture boundary. The capture edge shrinks with
  the lens-toggle fade. Removed disk-orbit-driven swirl because disk rotation is not
  black-hole Kerr spin. Focused R16/R17 lens gauntlets pass. The live R63 shadow/disk
  gate passes on Intel UHD / ANGLE D3D11. A separate GPU fixture compiles the exact
  production sky mapping and renders the predicted primary and secondary images from
  one source (`+0.25840/−0.16465 rad`, within 0.012 rad of the analytic positions).
  This is a second-order weak-field sky model, not full GR ray tracing.
  `docs/ROUND-107-SIGNED-SKY-LENS-2026-10-05.md`.
- **Verification status:** `npm run verify` ALL GREEN at R107 (typecheck; all
  **25 gauntlets**; SwiftShader software-tier dev smoke matched its refreshed
  reference at histL1 0.0009 with geodesic raymarch correctly off; prod smoke
  booted cleanly). The R63 live shadow/disk gate and R107 two-image sky fixture both
  passed on Intel UHD / ANGLE D3D11; the round107 frame-budget gauntlet pins the live
  wall-time measurement and hidden-tab reset.
  `npm run audit:arch -- --check` is clean at the R107 snapshot (186 code files,
  zero dead value/type exports; one intentional CSS class pinned by round18).
  `npm audit` last reported 0 vulnerabilities during R106; it was not rerun here.
  `desktop:check` **compiles the REAL C++ core as of R100** — the author's
  laptop carries VS 18 Community + Build Tools 2022 (found via vswhere; the
  old PATH-only probe claimed "no compiler" for the port's whole life) —
  R100's static_crt also removed the exe's last redistributable dependency
  (MSVCP140.dll): dumpbin now reads ZERO redist imports. R106 does not change
  native C++/Rust sources, so no new desktop compile was required.
  **R99 corrected R98's environment claim:** emsdk 6.0.10 has been at
  `~/Desktop/emsdk` since R95 (off the PATH — build-wasm.sh now activates it
  itself); the WASM artifact was rebuilt from the R98-fixed source and the
  physics batch is WIRED (`primePhysics`), with a stale artifact now a hard
  gauntlet FAIL. **Shipped: v16.1.0** — tagged and pushed 2026-10-03 (the contract
  era: R96–R100 + the Resurrection README brought to post-R100 truth); CI builds
  the installers and the updater card delivers it.
- **Known technical debt (conscious, ranked):** ~~`engine.ts` size~~ (RESOLVED in
  R97 — the engine is a 2.8k-line shell over six subsystems); ~~`cargo check`
  proof on a toolchained host~~ (RESOLVED in R100 — the author's laptop carries
  two full MSVC toolchains, the build.rs probe now finds them via vswhere, and
  the R84 FFI extension, the R85 write-data twin, the R86 seed guard and the
  R98 Rust edits are all compile-verified; R100's static_crt also made the exe
  redist-free). RESOLVED in R85: the desktop sky seam, the write-data twin, the chain-dead
  routes, the black hole dispose leak, both void events, the lying facade, the isNova
  shadow, the dead-export/unused-import census (fixed point), the MIT notice, the stale
  `BUILD` constant. RESOLVED in R86: the never-called code, the write-only engine fields,
  the `__ACTIONS__`/`subjectBadge` dead seams, the dead CSS rows, the orphan assets, the
  dead Rust pair, the recovery-key dual source, the unwired `realityDaemon.stop()`, the
  R83-2 seed-write churn risk.
- **Experience baseline:** 8.3/10 overall (see `docs/EXPERIENCE-REPORT-2026-09-29.md` for the
  persona-by-persona audit). The gap to 9+ is *signage*, not capability.

---

## 9. WHERE IT'S GOING

1. **R103 breaker defect — resolved in R107.** The guard now measures capped wall-frame
   time while the document is visible; hidden-tab suspension gaps reset its 180-frame
   sample. Its 55 ms threshold, recoverable first two stand-downs, and permanent third
   strike remain pinned by the verify chain.
2. **Settings portability — author decision still required.** Quality and the Black Hole
   Studio tier are profile-local. Syncing browser and desktop profiles touches locked
   storage keys and needs an explicit product decision.
3. **R76 navigation follow-ups — reproduce before changing.** R106 now prevents camera
   checkpoints while the rig is moving. The pending galaxy-entry queue, the galaxy-entry
   zoom/Kamui overlap, the arrival focus sweep, and first-use vortex compile hitch remain
   watch items; change them only after a current user-visible reproduction and preserve
   R71's explicit Kamui crossing law.
4. **Finish R71 Ten Slices.** The hierarchy stepper needs explicit cross-slice Kamui,
   membrane affordances, and gauntlet coverage. The main-branch zoom floor law is already
   enforced by R105; the separate slice machinery still awaits its own ruling.
5. **R79 visual hand-check.** Revisit chasinLove's Hinata photo sky while zooming from
   stellar scale into the cosmic web; confirm the barrier stays gone, the sky never
   doubles, and the full photo remains visible at every stage.
6. **Orbit editing follow-ups.** Add a user-facing orbit-elements editor for the
   ascending-node/argument-of-periapsis values, and rebuild orbit lines after
   `syncBodies` edits without requiring a full `setReality`.
7. **The Signage Wave** (from the experience report): first-run guided onboarding, a
   click-gesture legend, a one-click whole-universe backup/restore file, a short Kamui
   caption, and cross-reality entry search in the palette.
8. **Desktop storage capacity.** A Tauri file store can lift the web localStorage limit
   for heavy diarists; preserve browser ownership and offline-first behavior.
9. **Keep known maintenance work scoped.** The UI giants (`DiaryWindow`, `App.tsx`,
   `keyring`, `CoreConsole`, `FileManager`, `MediaPlates`), `src/types/` fold-in,
   optional React/Vite upgrades, and a touch-first HUD each need their own round and
   regression gates.
10. **Linux release baseline.** CI currently builds on ubuntu-latest 24.04. Evaluate the
   oldest supported LTS separately and re-check the workflow's platform workarounds.
11. **Deterministic sky-lens visual receipt — completed in R107 and merged to `main` at `0723578d`.**
   `npx tsx scripts/probes/round107-sky-lens-visual-probe.ts` compiles the production
   lens GLSL and checks one known source against both signed image positions on hardware;
   it reports the renderer so SwiftShader cannot masquerade as a GPU result. Re-run when
   changing the map and on other supported GPU vendors. This remains a second-order
   weak-field background model; the disk uses the existing raymarcher.

---
## 10. TRAPS — how AIs ruin this project (each of these has actually happened)

1. **Swapping the stack** — proposing react-three-fiber, zustand, redux, a CSS rewrite, or a
   backend. All banned; see §2 and §4.
2. **"Cleaning up" law numbers** — physics constants, seed tables, BODY_PROFILES, black-hole
   reference params, bloom calibrations. They are identity, measured or canonical. If a
   constant looks odd, it's probably pinned on purpose (gauntlets assert some of them in
   source text).
3. **Rewriting `engine.ts` wholesale** — was 6.9k lines for a reason; decomposition was a
   planned dedicated round — **R97 EXECUTED it with the gauntlets as guardrails** (the
   engine is now a 2.8k-line shell over six verbatim-extracted subsystems; any future
   engine work follows the same contract: never a drive-by rewrite).
4. **Breaking the metaphor loop** — decoupling entries from moons, moods from aurora, vault
   from the hole, or the Anchor Star's guarantees (bodies[0], undeletable, auto-repair).
5. **Removing safety nets** — the composite fallback, shader-error disarm, 55 ms breaker.
   Zero-fail rendering is a law. (R86 decree: engine-side reduced motion for the Kamui is
   REJECTED by the author — do not "restore" it; see §6.)
6. **Making zoom cross stages implicitly** — velocity crossings are retired by law (R71).
   Crossing = explicit Kamui only.
7. **Predicting instead of reading** — inventing file contents, feature names, or "existing"
   systems. If you can't verify it, say so.
8. **Chasing versions/dependency upgrades** mid-round. Pin and continue.
9. **Putting binaries in JSON** — payload bytes are encrypted and live in the triple-tier
   store (Desktop FS → OPFS → IndexedDB), never in the snapshot or `data.json`.
10. **Ignoring the gauntlets** — if `round16/17/18/63` or `audit:arch` disagree with your
    change, your change is wrong until reconciled (fix or consciously re-snapshot — never
    delete the check to make it pass).
11. **Editing C++ and assuming the web tier changed** — `public/wasm/` is a COMMITTED
    binary. Fixing `cosmos_engine.cpp` does nothing for the browser until
    `npm run wasm:build` runs (build-wasm.sh activates the author's emsdk at
    `~/Desktop/emsdk` itself — R98 missed it by probing only the PATH). R98 found
    the committed artifact carrying the pre-fix physics this way; check the
    artifact, not the source — and a negative environment claim ("no X here")
    deserves a disk probe, not just a PATH probe.
12. **Trusting a check you have never seen fail** — a gauntlet that has never gone red is
    an untested hypothesis. R98 shipped three checks that were green and meaningless; each
    was found by deliberately breaking the code and watching for the failure (see §6,
    the R98 law).

---

## 11. GLOSSARY (the codenames)

| Term | Meaning |
| :-- | :-- |
| **MY UNIVERSE / Chasin Love World** | The project. One thing, two names. |
| **Rounds (R52, R63…)** | Numbered epochs of work; each ends with `docs/ROUND-*.md` |
| **The Traveler / the author / the user** | The human owner of this universe. Final authority. |
| **Sol-Prime** | The canonical home reality (`src/realities/solPrime/`), literal seed, protected |
| **Anchor Star** | Every reality's sun — `bodies[0]`, id `anchor`, undeletable, enters Core Mode |
| **Eventide** | The black hole — `id eventide`, kind `vault`, the vault's door, undeletable |
| **Kamui** | The portal traversal engine: 9-phase machine (arming → disturbance → deformation → vortex → collapse → opening → hold → out), violet→magenta→orange→gold→white-hot signature ramp. "Forward" = dive into a body; "reverse" = the swallow (per-pixel DOM bend, `kamuiBend.ts`). Named for Obito/Kakashi's space–time ninjutsu |
| **The dial / zoomT** | The log-zoom parameter; `dist = 3 · 800000^zoomT` on the web stage |
| **Slices** | R71's ten ordered per-stage cuts of the dial (`stageSlices.ts`); explicit-crossing law |
| **Living Gravity** | Optional N-body field (Gauss planetary equations) making orbits mutually perturb |
| **Einstein lensing** | Signed second-order Schwarzschild thin-lens map of the sky; measured capture edge; rigid foreground bodies; toggleable, absent = ON |
| **EFS** | Eventide Filesystem — the vault's copy-on-write inode fs with shadows/dedup/scrub |
| **Quantum Bin** | The recycle bin for deleted realities (`src/realities/bin/` + disk daemon) |
| **The Tombstone Ledger** | R105's disk-side permanent-death record (`bin/.tombstones/<id>.tombstone`, written by BOTH backend twins on delete/purge, cleared by restore, kept by empty) — the client adopts it at boot + poll, so a deleted reality can never return, even against a wiped state |
| **Core Mode / Core Console** | The management deck entered via the Anchor Star (realities grid, bin, lineage) |
| **Gauntlet** | `scripts/roundNN-gauntlet.ts` — asserts source-level invariants of a round; part of verification |
| **Universe Surface** | The 460,000-unit dome where galaxies/clusters live; the funnel is the hole's dent in it |
| **Key Ring** | Vault's credential modules (TOTP, breach checks, comet courier) |
| **The Void** | A vault surface; also "absolute void" = the calibrated emptiness around the hole |

---

## 12. IF YOU CAN TOUCH THE REPO — working rules

1. **Read `README.md` sections relevant to your task before editing** — it carries the exact
   creative DNA (§5–§11 of it) and Appendix A holds every shader verbatim.
2. **Verify before claiming done:** `npm run verify` (typecheck + gauntlets + smoke); round18
   and round63 gauntlets for Kamui/void work; `npm run audit:arch -- --check` for structural
   changes. Report failures honestly.
3. **Commit style:** round-numbered, all-caps titled, poetic but precise
   (e.g. `R71 step 2: THE SLICE TABLE — the explorable dial cut into ordered per-stage slices…`).
   End a round with its round document in `docs/`.
4. **Then update this file** (§8, §9). That is part of finishing a round.
5. Small diffs over grand rewrites. Match the surrounding code's voice. Ask the author before
   anything that touches a law in §6.

---

## 13. DOCUMENT MAP — what to read next, in order of depth

| Need | Read |
| :-- | :-- |
| Understand the project fast | this file |
| Rebuild anything / exact numbers & shaders | `README.md` (the Resurrection Blueprint) |
| Layer-by-layer architecture record | `docs/ARCHITECTURE.md` |
| What happened in a given round | `docs/ROUND-*.md` (one per round) |
| Quality baseline + upgrade roadmap | `docs/EXPERIENCE-REPORT-2026-09-29.md` |
| Kamui's canon, physics and visual grammar | `docs/KAMUI-RESEARCH.md` |
| The ported black hole's spec | `docs/PORT-SPEC-webgpu-black-hole.md` |
| "Why is this leftover code still here?" | `docs/LEFTOVER-CODES-WHY-KEPT-2026-10-01.md` — the standing verdict on every kept item from the R83 census |

---

## APPENDIX — cover message (paste this ABOVE the file when uploading to a chat AI)

> This file is the "brain" of my project — a verified snapshot of what it is, what it is NOT,
> its history, its current state, its laws, and its roadmap. Read it completely before
> responding. Do not pattern-match my project to something you've seen before; several of its
> choices are deliberately unusual and listed as laws. If something you'd expect isn't in the
> file, ask me instead of assuming.
