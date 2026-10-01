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

**Scale of the codebase:** ~136 code files, ~43k lines. `src/engine/engine.ts` alone is
~6.4k lines (the orchestrator). Strict TypeScript throughout.

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
├── docs/                   ← ARCHITECTURE.md (R52 record) · ROUND-*.md (per-round reports)
│                             · EXPERIENCE-REPORT (quality + roadmap baseline) · research corpus
├── scripts/                ← round16/17/18/63 gauntlets (verification) · audit-architecture.ts
│                             · smoke.ts (playwright) · toolchain helpers
├── server/                 ← Express dev host + reality disk daemon (3s self-healing scan)
├── src-tauri/              ← desktop shell (Rust commands, C++ core compile)
├── src/
│   ├── domain/             ← pure data contracts (universe.ts, vault.ts)
│   ├── state/              ← THE single mutation surface (store + ~60 actions + persistence)
│   ├── platform/           ← native C++ core + bridge, desktop adapter, sync, audio, storage keys
│   ├── engine/             ← Three.js cosmos: engine.ts (6.4k ln orchestrator), blackhole*.ts,
│   │                          cameraRig.ts, shaders.ts, systems/ (portalPhases, stageThresholds,
│   │                          stageSlices, levelSystem), surface/ (universe dome)
│   ├── physics/            ← physicsEngine.ts (41-field solve, Kepler solver) · nbody.ts (Living Gravity)
│   ├── realities/          ← path-locked content packs; solPrime/ = canonical seed; bin/ = Quantum Bin
│   ├── vault/              ← EFS (copy-on-write fs), crypto (Argon2id/AES-GCM), executors (JS/Py/HTML/PDF/ISO)
│   └── ui/                 ← ALL React surfaces (console, hud, vault, diary, lineage…)
└── public/                 ← vendored pyodide + fonts (offline capability — keep committed)
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
  55 ms frame-budget breaker, reduced-motion variants for every portal beat. Never remove a
  safety net.
- The time-driven vortex variant (R66b commit `0c2d67e8`) was REVERTED by the author's
  explicit decision. Do not resurrect it unasked (it stays restorable in history).
- **R71 container law:** the zoom dial (`zoomT`, `dist = 3 · 800000^zoomT`, explorable range
  0.10–0.94) is cut into TEN ordered per-stage slices (`src/engine/systems/stageSlices.ts`).
  Law 1: total freedom INSIDE a slice; the dial clamps softly at slice edges. Law 2:
  **explicit crossings only** — a Kamui fired by the hierarchy stepper is the ONLY carrier
  between slices. No velocity trigger, no scroll side-effect, ever.

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
| The full purge | R86 *(on branch `r85-the-six-seams`, NOT in main — verified 2026-10-01)* | The author's three-bucket ruling on the R83 Part III census, executed: Bucket A deleted (two orphaned engine methods, five write-only fields, the false-parity `__ACTIONS__` seam, the dead `subjectBadge` prop, the console-tab CSS family + `--color-danger`, the 512×512 orphan icon, 11 historical verify PNGs, the never-invoked `store_payload_list/stats` pair at both Rust layers). Bucket B wired (persist.ts uses `STORAGE_KEYS.universeStateRecovery` — one source of truth on the locked surface; `realityDaemon.stop()` finally called from SIGINT/SIGTERM; the R83-2 seed guard refuses Sol-Prime mirror writes at client, server and desktop twin). Bucket C kept with reasons (`reducedMotion` as the law-gap hook, `__MY_UNIVERSE_PERF__`, state timestamps, `note.txt`, `cosmos_sim_*`). THE ROUND'S LESSON: `.kamui-disappear`/`kamuiVortexOut` were deleted as audit-dead CSS and round18's gauntlet instantly failed — restored verbatim; the census ledger gains "looks dead but is gauntlet-pinned" (the gauntlets outrank the auditor). `docs/ROUND-86-THE-FULL-PURGE-2026-10-01.md` |

---

## 8. CURRENT STATE (as of 2026-10-01, after R85 — on branch; main's tip is R84 / v15.0.8)

- **`main` is the blessed reference.** Its tip is the R84 ascending nodes
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
  carries R85 and R86 (below). Treat all of it as experimental until the author merges it.
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
  churn is now impossible). Kept with reasons: `reducedMotion` (law-gap hook),
  `__MY_UNIVERSE_PERF__`, the state timestamps, `note.txt`, `cosmos_sim_*`. The lesson:
  `.kamui-disappear`/`kamuiVortexOut` were deleted as audit-dead CSS, round18's gauntlet
  failed, both restored — the census's new category is "looks dead but is gauntlet-pinned."
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
- **Verification status:** `npm run verify` ALL GREEN (typecheck;
  round16/17/18/63/72/73/74/75/76/79/**84** gauntlets; smoke + prod-smoke, zero
  console errors) — re-verified on the R85 branch tree after the sweep;
  `npm audit` 0 vulnerabilities; `audit:arch --check` **clean at the new fixed-point
  snapshot** (zero dead exports — the "conscious re-snapshot remains queued" debt from
  R83/R84 is settled, absorbed in-commit three times during R85);
  `desktop:check` unrunnable on this laptop (no MSVC toolchain — recorded honestly in
  R84 and R85).
- **Known technical debt (conscious, ranked):** `engine.ts` size (~6.5k lines — decomposition
  is planned as its own future round); `cargo check` proof on a toolchained host (R84's FFI
  extension + R85's `reality_write_data` twin + R86's seed guard, all reviewed but never
  compiled here); the engine-side reduced-motion law gap (the portal beats don't honor
  `prefers-reduced-motion` at the engine level — `engine.reducedMotion` is the waiting
  hook). RESOLVED in R85: the desktop sky seam, the write-data twin, the chain-dead
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
   guardrails), architecture re-snapshot, dead-export sweep, optional React 19 / Vite 7
   evaluation, optional touch-first HUD pass.

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
5. **Removing safety nets** — the composite fallback, shader-error disarm, 55 ms breaker,
   reduced-motion variants. Zero-fail rendering is a law.
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
