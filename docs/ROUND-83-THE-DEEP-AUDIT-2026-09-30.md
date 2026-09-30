# ROUND 83 — THE DEEP AUDIT (2026-09-30)

> The traveler's decree: *review what I changed while you were gone; debug it at the deepest
> level; find every bug, every lack of logic, and — above all — every orphan, dead end, hidden
> port, abandoned path. **Report only. I will decide what to do.** Then make the next version.*
>
> This round therefore changes NOTHING in the app's code or data. It is a census. The only
> files it writes are this document and PROJECT-BRAIN §8/§9, plus the release ritual
> (v15.0.7) that carries R82's voice and the traveler's new sky to the updater card.

---

## Part I — the traveler's own changes, reviewed

### 1. The testOne sky swap (uncommitted at audit time) — HEALTHY, with one flag

The traveler replaced their reality's sky through the Sky Studio: `obito-naruto.gif`
uploaded, manifest rewritten, old asset deleted.

Verified sound:

- The new asset `src/realities/testOne/assets/sky-muoc1ce9-1duin.jpg` is a valid baseline
  JPEG, **4096×2048**, and its on-disk size (337,145 bytes) matches the manifest's `size`
  byte-for-byte.
- A GIF is a **designed** sky input: `ALLOWED_MIME` includes `image/gif`
  (`src/platform/sky/skyRegistry.ts:55`), and `rasterizeToEquirect` (`skyRegistry.ts:227`)
  draws the image onto the 2:1 equirect canvas — an `<img>` draw of a GIF takes its **first
  frame**, so the animated Obito becomes a still panorama by design. The manifest honestly
  records `mime: image/jpeg` while keeping the original name — cosmetic only.
- Full verify chain on the changed tree: **ALL GREEN** (typecheck; round16/17/18/63/72/73/74/
  75/76/79 gauntlets; smoke frame matches reference; prod-smoke boots the built dist with
  zero console errors).
- The deleted old asset (`sky-mufg64tp-p3pd4.jpg`) is unreferenced by the new manifest and
  properly removed from disk; it needed a commit to record the deletion — done in this
  round's commit.

**FINDING R83-1 (user-visible, on their change): testOne is the last reality at the
pre-R79 `blend: 0.8`.** `src/realities/testOne/sky.json:15` — the settings block predates
R79 (the photo was added 2026-09-24) and the R79 one-sky migration touched only chasinLove.
Under the R79 law the procedural family stands down whenever the photo owns the view
(`UniverseSurfaceManager.ts:438` — the gate reads the dome's *entry fade*, not `blend`),
while the dome shader renders the photo at `alpha = uHasMap · uBlend · uFade`
(`photoDome.ts:159`). At blend 0.8 the photo is 80 % opaque over a stood-down (empty) sky —
the missing 20 % bleeds raw void: the sky reads dim and translucent instead of owning the
view. testWorld and chasinLove both sit at 1.0.
**Proposed solve (NOT applied):** the same one-line migration chasinLove got in R79 — set
`settings.blend: 1.0` in testOne's sky.json (or teach the server's sky/settings path to
migrate legacy manifests on write).

### 2. "Version 17.1" — the Sol-Prime mirror churn, decoded

The commit rewrote 110 lines of `src/realities/solPrime/data.json`: every `id`,
`createdAt`, `dirId`, `addedAt`, `updatedAt` and `mirroredAt` — a uniform +149,395,732 ms
shift on all timestamps. Decoded:

- `data.json` is a **write-only mirror**. Boot truth is `index.ts`; nothing reads data.json
  at startup. The Express mirror (`server/routes/realities.ts:261-308`) writes the live
  world DB back into the source folder whenever the browser's live state differs from disk
  (its "honest write" guard ignores only `mirroredAt`).
- The rewrite means the browser held a **differently-generated generation** of the seed than
  the committed mirror (the mirror re-serialized it). The canonical seed in `index.ts` was
  never touched — **no physics or lore impact**. `createdAt` feeds only the "born after
  asOf" filter (`engine.ts:4472`) and streak day-keys; a uniform shift preserves all
  relative order.
- **FINDING R83-2 (design, not accident): the mirror can silently rewrite the protected
  seed's mirror file from stale browser state.** If that churn is unwanted, the solve is to
  make `/api/realities/write-data` refuse `sol-prime` (read-only seed) or to gate the write
  behind an explicit authorial action. Left as-is for the author to decide.

### 3. "Version 18" — the deleted license notice

The two "Version 18" commits replaced `THIRD-PARTY-NOTICES.md` with the word "hello" and
then deleted the file. What was lost: the **MIT license notice for
dgreenheck/webgpu-black-hole** (created properly in "Version 13.15") — the project whose
code this repo transliterates verbatim in `src/engine/blackholeRaymarch.ts`, plus the
attribution chain for Mitchell Charity's blackbody color table embedded in the renderer.

**FINDING R83-3 (compliance):** the MIT license requires the copyright and permission
notice to accompany the software; the black hole renderer is a substantial portion of this
app. The exact text is one `git show 5b7812b2^:THIRD-PARTY-NOTICES.md` away.
**Proposed solve (NOT applied):** restore the file verbatim, or fold the notice into
README.md — the author's call.

---

## Part II — real bugs found (beyond the traveler's changes)

**R83-4 · THE DESKTOP SKY SEAM IS BROKEN (hidden port, high value).**
`mapRealityEndpoint` (`src/platform/desktop/adapter.ts:122`) switches on the **exact** path
string, but its only caller appends a query: `realityApi('/api/realities/sky/status?folder=…')`
(`src/platform/sky/skyRegistry.ts:166`). `case '/api/realities/sky/status'` (`adapter.ts:143`)
can therefore never match — the case body even parses `path.split('?')[1]`, proving the
query was expected. On desktop every status fetch falls to `default: return null` →
`fetchSky` keeps the cache or adopts `EMPTY_SKY` → **the desktop app never shows a photo sky
at boot**; it only appears after an in-session Studio action. Present since "Version 14.3";
the web path is unaffected; the round79 gauntlet asserts source text only, so it cannot see
this. Solve: match on `path.split('?')[0]` (or strip the query before the switch) — one line.

**R83-5 · THE REALITY WORLD-DB MIRROR HAS NO DESKTOP TWIN.**
The client writes reality data.json via `/api/realities/write-data`
(`src/state/actions.ts:431-434`), but `mapRealityEndpoint` has no case for it and
src-tauri has no writer (grep `data.json|write_data` in src-tauri = 0 hits) → on desktop
the write **silently fails and burns the 5-retry queue** (`adapter.ts:256-258`) on every
export. The server route (`realities.ts:264`) is web-only alive. Solve: add a
`reality_write_data` Tauri command + adapter case, or skip the call when `isDesktop()`.

**R83-6 · CHAIN-DEAD ROUTES.**
- `GET /api/realities/folders` (`server/routes/realities.ts:26`) — zero client callers;
  the adapter maps it (`adapter.ts:137` → `reality_list`, lib.rs:199) but nothing ever
  passes that path, so the whole chain is unreachable (daemon-status already returns
  `activeFolders`).
- `POST /api/realities/delete-folder` (`realities.ts:228`) — zero callers (client deletes
  via `/api/realities/bin/move-to-bin`) and **no adapter mapping** — it could never work on
  desktop, quietly contradicting the byte-identical route contract claimed at
  `server/index.ts:14`.

**R83-7 · THE BLACK HOLE LEAK.**
`createBlackHole` registers `window.addEventListener(BLACKHOLE_CHANGE_EVENT, onParams)`
(`blackholeRaymarch.ts:474`); the only remover is `BlackHoleVisual.dispose()` — **which no
one ever calls**. `syncBodies` (engine.ts:4690-4713) removes bodies via `disposeObject3D`
only and `Engine.dispose()` never touches `this.blackHoles` → every vault hole ever
attached leaves a permanent window listener + retained material, and stale visuals stay in
`this.blackHoles` receiving `updateRaymarchUniforms` each frame (`engine.ts:5470`).
Single-page bounded growth, not per-frame — but real, and stale-march risk on reality
switches. Solve: call `visual.dispose()` in syncBodies' removal branch + Engine.dispose().
(Minor sibling: UniverseSurfaceManager's anonymous BLACKHOLE_CHANGE_EVENT listener has no
remover either — one per app lifetime.)

**R83-8 · EVENTS FIRED INTO THE VOID.**
- `'eventide-camera-memory'` dispatched (`cameraMemory.ts:100,110`), **zero listeners
  anywhere**; the re-exported `CAMERA_MEMORY_CHANGE_EVENT` is dead too. The module's
  persistence still works — only the announcement is vestigial.
- `'eventide-vault-pulse'` dispatched (`executors/index.ts:352` via `pulseVault`, called
  from VaultUI + sandbox ×6) with zero listeners — and `round17-gauntlet.ts:406`
  **affirmatively asserts** engine has no listener (the R55 full-erase law). The dispatch
  and its plumbing are contract-dead.

**R83-9 · THE FACADE THAT PROMISES A FUNCTION THAT DOESN'T EXIST.**
`src/vault/index.ts:35-40` imports `{ hasOpfs, hasIdb }` and `type BackendStatus` behind a
doc comment for a `getBackendStatus()` that was deleted or never written; the barrel header
(line 10) still advertises "backend status". Orphaned imports + a lying facade.

**R83-10 · `isNova` DIED BY SHADOW.**
`src/vault/storage/breaches.ts:101` — never called; `keyring.tsx:1319` shadows the name
with a local `const isNova = Boolean(r.breachedAt)`, which is exactly why the repo's own
auditor misses it.

---

## Part III — the orphan census (report-only; the author decides)

### Dead value exports (auditor-confirmed: 11; sweeps add context)

| Symbol | Where | Note |
| :-- | :-- | :-- |
| `WEB_EDGE_TRIGGER` | stageThresholds.ts:16 | retired R71 machinery; still dead on main |
| `WARP_ZOOM_VEL` | stageThresholds.ts:18 | same |
| `KAMUI_RAMP` | kamuiPhases.ts:41 | color ramp nobody imports; not gauntlet-pinned |
| `CAMERA_MEMORY_CHANGE_EVENT` | cameraMemory.ts:52 | alias for the event fired into the void |
| `getSnapshot` | state/store.ts:50 | never called anywhere |
| `prewarmKamuiReturnVoice`, `renderKamuiReturnVoiceCache` | platform/audio.ts | R82; internal-only — de-export, don't delete |
| `UpdaterCardBody` | ui/UpdaterCard.tsx:80 | intentional staging (R81) — de-export or leave |
| `BACKDROP_MAX_BYTES`, `kindForMime`, `stopKamuiBend` | console/backdropStore.ts, kamuiBend.ts | alive in-file; `export` superfluous |

Dead type exports: **48** per the auditor (15 vault, 5 platform, the rest engine/ui) — all
are return/param types of LIVE functions; the solve is de-export, never deletion.

### Never-called code

| Item | Where | Note |
| :-- | :-- | :-- |
| `portalBodyRadiusForReverse()` | engine.ts:5542 | body duplicated inline at 5498-5503 / 5521-5529 — hand-inlined, method left behind |
| `zoomToDemonCore()` | engine.ts:4886 | Demon Core visuals alive; only this helper orphaned |
| `realityDaemon.stop()` | server/realityDaemon.ts:87 | graceful-shutdown seam never wired |
| ~50 export-only-dead symbols | across src | alive in-file; keyword superfluous |
| `scripts/test-upload.ts` | — | dead AND broken: its `'./src/platform/...'` import cannot resolve from scripts/ |

### Write-only fields, dead seams, dead flags (engine & state)

- `engine.arrivalZoom` (726), `engine.reducedMotion` (360 — a matchMedia probe wasted),
  `engine._camMemStable` (536), `engine.echoShowerClock` (825), `engine.skyApplying` (812 —
  the "re-entrancy guard" nothing consults): written, never read.
- `engine.timeScale` (348): read once, **no setter exists** — constant-folded to 1; the
  "time dial" does not exist.
- `window.__ACTIONS__` (App.tsx:471): set, never read — the comment claims parity with
  `__ENGINE__`, which IS consumed by smoke.ts; this one has no consumer.
- `window.__MY_UNIVERSE_PERF__` (performance.ts:72): set behind `?perf`, never read.
- Write-only state fields: `UniverseState.visitedAt`, `DiskSyncState.lastSyncTime`,
  `EfsSuperblock.lastScrubAt`, `EfsScrubReport.startedAt` — cheap diagnostics, zero readers.
- `STORAGE_KEYS.universeStateRecovery`: declared but never referenced by name — persist.ts
  builds the same key with a template literal (two sources of truth on a locked-contract
  surface).
- Dead prop: `subjectBadge` on CosmicLineageModal (accepted, fallback-rendered, never passed).
- audio.ts:367-371: the self-documented "virtually unreachable" no-cache branch (keep — it
  is the zero-fail net if the init prewarm ever fails silently).
- 2 unused type imports in engine.ts (`RaymarchStatus`, `EchoEntry`); ~299 unused named
  imports repo-wide, ~291 of them the vault UI's copy-pasted preamble (13 unused lucide
  icons among them).
- `--color-danger` CSS token: zero `*-danger` classes, zero `var()` reads; one orphaned
  JSDoc in sentiment.ts:115.

### Orphan files & assets

| Item | Kind | Note |
| :-- | :-- | :-- |
| `src-tauri/icons/512x512.png` | orphan-asset | generated by make-icons, NOT in `bundle.icon`; recreated by tooling anyway |
| `note.txt` | stray-file | documented folder map — informational |
| `scripts/verify/r54…r60-*.png` (10 files) | historical | referenced only by old round docs |
| 3 test realities ship in the product UI | dead-reality-ish | `testOne` ("repro"), `testWorld`, `auroraTest` ("wave7 verification") are glob-discovered with no filter — they render for every traveler |
| 4 × `surface.ts` `UniverseSurfaceConfig` exports | dead-module | `getSurfaceConfigForReality` only reads solPrime's preset or synthesizes from colors — the four exports are eagerly bundled, never consumed; CAUTION: the daemon expects surface.ts to exist and auto-repairs it (contract) |
| 8 Tauri commands never invoked from TS | dead-command | `store_payload_list/stats` + the `cosmos_sim_*` parity block — the latter is **documented as deliberate scaffolding** (lib.rs:306-311) |
| `Rust KIND_*` consts (cosmos.rs:17-22) | unreachable | supporting the sim block |

### Clean bills of health (negative findings — do not "clean up")

- **Zero dead files** in src (130 files all resolve); zero dead actions (all 70 called; 3
  internal-only); zero dead components (lazy() + string-switch paths all traced); all 19
  EngineCallbacks members alive in both directions; all EFS methods, executors and storage
  tiers exercised; the vault terminal's 20 commands all dispatch to real actions; every
  dependency in package.json is imported; every font/pyodide/favicon reference resolves;
  all four Kamui portal phases are reached; all reads of env/flags have operators.
- **Looks dead but isn't:** `src/realities/*/index.ts` (glob-discovered);
  `PortalPhase` + `KAMUI_PHASE_WEIGHTS` (round18-gauntlet regex-pins their source text);
  the WASM fallback artifact (built on demand by build-wasm.sh); ambient `monaco-esm.d.ts`.
- **Stale but used:** `BUILD = 'R52-v15'` (App.tsx:39 — banner + footer; ~31 rounds stale).

---

## Part IV — the tally

| Bucket | Count |
| :-- | :-- |
| Real bugs / broken seams | 6 (R83-1 blend, R83-3 license, R83-4 desktop sky, R83-5 write-data twin, R83-6 chain-dead routes, R83-7 leak) |
| Events fired into the void | 2 |
| Dead value exports (auditor) | 11 (2 from R82, benign) |
| Dead type exports (auditor) | 48 |
| Never-called functions/methods | 4 + ~50 export-keyword-only |
| Write-only fields / dead seams | 12 |
| Orphan files/assets/realities | 18 (+10 historical PNGs) |
| Unused named imports | ~299 |
| Dead Rust commands | 8 (6 deliberate) |

**Verification of this round:** `npm run verify` ALL GREEN on the traveler's changed tree;
`audit:arch --check` exits 1 with the known mechanical drift plus exactly two new benign
de-export findings from R82's audio work — zero semantic regressions. Nothing in the app
was changed; the census is the deliverable.

**Proposed order of battle when the author decides** (each its own small round):
1. R83-4 (one-line desktop sky fix) — highest user-visible value per line.
2. R83-1 (testOne blend migration) — one line, restores the one-sky law on their own world.
3. R83-3 (restore the license notice) — one file from history.
4. R83-7 (black hole dispose) + R83-5 (write-data twin) — small, real.
5. The de-export sweep + import lint pass — mechanical, gauntlet-guarded, re-snapshot consciously.
6. The test-reality question (testOne/testWorld/auroraTest in the product UI) — a law-level
   decision, not a cleanup.
