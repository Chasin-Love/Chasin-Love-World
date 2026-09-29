# 🧠 PROJECT BRAIN — MY UNIVERSE (aka *Chasin Love World*)

> **Purpose:** the one file to hand to ANY AI (chat or coding agent) so it understands this
> project in one read — what it is, what it is NOT, where it stands, and where it is going.
> **Reference state:** branch `main` (the author has blessed `main` as the absolute reference).
> **Last updated:** 2026-09-29, after main's tip `dc68d0fd` (R71 step 2 — the slice table).
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

---

## 8. CURRENT STATE (as of 2026-09-30, after R74)

- **`main` is the blessed reference.** Its tip is the R74 pair (the holographic herald → its
  gauntlet) on top of the R73 pair (the throat-is-not-swallowed guard → its gauntlet) and the
  R72 four-commit train, all on the R67-final engine state.
  **Correction (verified in R72):** the earlier claim that R71 step 2's slice table sat on
  `main` was stale — `src/engine/systems/stageSlices.ts` does NOT exist on `main`; the Ten
  Slices work lives only on the branches below.
- **In flight (branches, not final):** `r71-ten-slices` carries R68/R69 explorer-upgrade work
  (cameraRig orbit/glide grammar, touch grammar, 3.5 s summon, ROUND-68/69 docs) plus R71
  step 3 ("zoom never crosses"; changes in `engine.ts`, `stageThresholds.ts`, `kamuiPhases.ts`,
  `cameraRig.ts`, round18 gauntlet) and uncommitted step-3 transform scripts. Treat all of it
  as experimental until the author merges it.
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
- **Verification status:** `npm run verify` ALL GREEN (typecheck; round16/17/18/63/72/73/**74**
  gauntlets; smoke + prod-smoke, zero console errors); `npm audit` 0 vulnerabilities;
  `audit:arch --check` exits 1 with findings identical to the pristine parent commit (the
  pre-existing R52-baseline drift below — R72–R74 added zero new findings).
- **Known technical debt (conscious, ranked):** `engine.ts` size (~6.5k lines — decomposition
  is planned as its own future round); architecture-audit snapshot drift vs the frozen R52
  baseline (re-snapshot consciously); 8 dead value exports + 46 dead type exports (including
  the never-imported `WEB_EDGE_TRIGGER`/`WARP_ZOOM_VEL` on main); stale `BUILD` constant.
- **Experience baseline:** 8.3/10 overall (see `docs/EXPERIENCE-REPORT-2026-09-29.md` for the
  persona-by-persona audit). The gap to 9+ is *signage*, not capability.

---

## 9. WHERE IT'S GOING

1. **R72/R73 watch items (small, user-visible):** if the staged arrival's focus re-aim toward
   the traveler's reality marble ever reads as a sideways sweep, apply the portal's
   `holdFocus` discipline during the handoff; `beginGalaxyEntry`'s Kamui garnish still races
   its own zoom (the same same-frame shape R72 fixed at the membrane) — its own round; the
   first summon of a session compiles the vortex pass on its first frame (a one-time hitch —
   a shader warm-up would be its own round).
2. **Finish R71 "Ten Slices"** — the slice system's consumers: the hierarchy stepper firing
   explicit cross-slice Kamui, edge membrane affordances, gauntlet pins for the new law.
3. **The Signage Wave** (the recommended next theme, from the experience report):
   first-run guided onboarding (double-click a world → write an entry → see the moon → `?`),
   an in-app legend for click-gestures, a one-click whole-universe backup/restore file,
   a one-line Kamui narrative caption, cross-reality entry search in the palette.
4. **Desktop as the storage answer** — Tauri file store lifts the web localStorage ~5 MB
   ceiling for heavy diarists.
5. **Deferred (do as their own rounds, unasked):** `engine.ts` decomposition (gauntlets as
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

---

## APPENDIX — cover message (paste this ABOVE the file when uploading to a chat AI)

> This file is the "brain" of my project — a verified snapshot of what it is, what it is NOT,
> its history, its current state, its laws, and its roadmap. Read it completely before
> responding. Do not pattern-match my project to something you've seen before; several of its
> choices are deliberately unusual and listed as laws. If something you'd expect isn't in the
> file, ask me instead of assuming.
