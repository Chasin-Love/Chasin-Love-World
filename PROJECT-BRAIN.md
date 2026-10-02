# 🧠 PROJECT BRAIN — MY UNIVERSE (aka *Chasin Love World*)

> **Purpose:** the one file to hand to ANY AI (chat or coding agent) so it understands this
> project in one read — what it is, what it is NOT, where it stands, and where it is going.
> **Reference state:** branch `main` (the author has blessed `main` as the absolute reference).
> **Last updated:** 2026-09-30, after R83 (the deep audit).
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
│                             gauntlets/ (19 per-round gates — ALL in npm run verify) ·
│                             probes/ (4 hand-run diagnostics) · tools/ (5: wasm, icons,
│                             updater manifest, diagram, toolchain) · audit-architecture.ts
│                             + its frozen snapshot · smoke.ts · prod-smoke.ts · verify/ (golden frames)
├── server/                 ← Express dev host + reality disk daemon (3s self-healing scan)
├── src-tauri/              ← desktop shell (31 Rust commands, C++ core compile; 1,715 ln / 6 files)
├── src/
│   ├── domain/             ← pure data contracts (universe.ts, vault.ts)
│   ├── state/              ← THE single mutation surface (store + ~60 actions + persistence)
│   ├── platform/           ← native C++ core + bridge, desktop adapter, sky, sync, sentiment, storage keys
│   ├── engine/             ← Three.js cosmos: engine.ts (6.9k ln orchestrator), blackhole*.ts,
│   │                          cameraRig.ts, shaders.ts, systems/ (kamuiPhases, stageThresholds,
│   │                          levelSystem), surface/ (photo dome, universe surface)
│   ├── physics/            ← physicsEngine.ts (41-field solve, Kepler solver) · nbody.ts (Living Gravity)
│   │                          · sessionDriver.ts (THE N-body session) · simTwin.ts (read-only lab)
│   ├── realities/          ← path-locked content packs; solPrime/ = canonical seed; bin/ = Quantum Bin
│   ├── vault/              ← EFS (copy-on-write fs), crypto (Argon2id/AES-GCM), executors (JS/Py/HTML/PDF/ISO)
│   └── ui/                 ← ALL React surfaces (console, hud, vault, diary, lineage…)
└── public/                 ← vendored pyodide + fonts + the compiled WASM core (wasm/) — offline capability, keep committed
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
- Absolute void: the void around the hole is calibrated (measured 0.265 vs reference 0.33);
  the lens is LOCAL and melts at 6·b_c; system objects never bend (R62).
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

## 8. CURRENT STATE (as of 2026-10-02 — main's tip is **v16.0.0**: the R91–R95 REAL UNIVERSE arc merged from `the-real-universe`)

- **`main` is the blessed reference.** Its tip is the merged R91–R95 REAL UNIVERSE arc on top of **v16.0.0** (merged --no-ff and tagged on the author's word, 2026-10-02) on top of R90 on top of **v15.0.10**
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
  **v16.0.0** — the real universe is the blessed reference now. (The older
  in-flight branches — `r71-ten-slices` and friends — remain exactly as they
  were, awaiting their own rulings.)
- **R96 (this round, on branch `r96-the-tidy-house`):** the author's verdict on
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
- **Verification status:** `npm run verify` ALL GREEN (typecheck; all **19
  gauntlets**, `scripts/gauntlets/round16` → `round95-steady-sky` since R96's
  regroup; smoke + prod-smoke, zero console errors) — re-verified per round,
  most recently at R96 (first chain hit the smoke cold-boot flake after 19/19
  gauntlets — green on the immediate re-run and on the second full chain);
  `npm audit` 0 vulnerabilities; `audit:arch --check` **clean at the R96
  snapshot** (zero dead exports; absorbed in-commit on every structural change);
  `desktop:check` unrunnable on this laptop (no MSVC toolchain — R96 touched no
  Rust). Shipped: **v16.0.0** (the R91–R95 REAL UNIVERSE arc) — tagged and
  pushed; R96 rides the next tag.
- **Known technical debt (conscious, ranked):** `engine.ts` size (~6.5k lines — decomposition
  is planned as its own future round); `cargo check` proof on a toolchained host (R84's FFI
  extension + R85's `reality_write_data` twin + R86's seed guard, all reviewed but never
  compiled here). RESOLVED in R85: the desktop sky seam, the write-data twin, the chain-dead
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

0. **R83 decision queue — RULED and EXECUTED (R85, branch `r85-the-six-seams`).** The
   author ruled on 2026-10-01: "create a new isolated branch … solve all these six bugs
   … best shape possible," and chose the mechanical sweep when offered the census's fate.
   All six findings + the sweep + the MIT notice are done on the branch — awaiting only
   the author's merge. Remaining from the queue's own follow-ups: a `cargo check` pass on
   a host with the C++ toolchain (now covers R84's FFI **and** R85's `reality_write_data`);
   an orbit-elements UI (the precedent exists — GalaxyRoster's Ellipse Tilt slider) so the
   author can hand-place nodes; a `syncBodies` orbit-line rebuild hook so editing a
   body's elements re-bakes its ring without a full setReality.
1. **R79 leftovers (small):** the author should eyeball chasinLove's hinata
   sky at stellar zoom → cosmic web (no barrier, no double sky, the whole
   photo at every stage). The `UNCLAIMED-hydrate-adopted-fix.patch` has been
   applied and committed as the R79 hotfix — the patch file can be deleted.
2. **R76 watch items (small, user-visible):** the camera memory can save a
   mid-dive placement — every reload then boots inside a galaxy disc until
   Reset View forgets it (a save-time guard is its own small round); a
   galaxy dive queued before a reality switch executes on the roster
   landing (`pendingGalaxyEntry`, correct per R54 but surprising); if the
   staged arrival's focus re-aim toward the traveler's reality marble ever
   reads as a sideways sweep, apply the portal's `holdFocus` discipline
   during the handoff; `beginGalaxyEntry`'s Kamui garnish still races its
   own zoom (the same same-frame shape R72 fixed at the membrane) — its own
   round; the first summon of a session compiles the vortex pass on its
   first frame (a one-time hitch — a shader warm-up would be its own round).
3. **Finish R71 "Ten Slices"** — the slice system's consumers: the hierarchy stepper firing
   explicit cross-slice Kamui, edge membrane affordances, gauntlet pins for the new law.
4. **The Signage Wave** (the recommended next theme, from the experience report):
   first-run guided onboarding (double-click a world → write an entry → see the moon → `?`),
   an in-app legend for click-gestures, a one-click whole-universe backup/restore file,
   a one-line Kamui narrative caption, cross-reality entry search in the palette.
5. **Desktop as the storage answer** — Tauri file store lifts the web localStorage ~5 MB
   ceiling for heavy diarists.
6. **Deferred (do as their own rounds, unasked):** `engine.ts` decomposition (gauntlets as
   guardrails), dead-export sweep, optional React 19 / Vite 7 evaluation, optional
   touch-first HUD pass. (The architecture re-snapshot queued here is DONE — R96
   regenerated it; R96 itself has no follow-ups queued.)
7. **Watch item (small):** the smoke cold-boot flake has two sightings now (R84
   diagnosis, R96 reproduction — `page.evaluate` context destroyed mid-boot;
   green on every immediate re-run and on the full re-chain). If it recurs, a
   boot-retry guard in `scripts/smoke.ts` is its own tiny round.

---

## 10. TRAPS — how AIs ruin this project (each of these has actually happened)

1. **Swapping the stack** — proposing react-three-fiber, zustand, redux, a CSS rewrite, or a
   backend. All banned; see §2 and §4.
2. **"Cleaning up" law numbers** — physics constants, seed tables, BODY_PROFILES, black-hole
   reference params, bloom calibrations. They are identity, measured or canonical. If a
   constant looks odd, it's probably pinned on purpose (gauntlets assert some of them in
   source text).
3. **Rewriting `engine.ts` wholesale** — it's 6.4k lines for a reason; decomposition is a
   planned dedicated round with gauntlet guardrails, not a drive-by refactor.
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
| **Einstein lensing** | Per-body halo bending of the sky; local, melts at 6·b_c; toggleable, absent = ON |
| **EFS** | Eventide Filesystem — the vault's copy-on-write inode fs with shadows/dedup/scrub |
| **Quantum Bin** | The recycle bin for deleted realities (`src/realities/bin/` + disk daemon) |
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
