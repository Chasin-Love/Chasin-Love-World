# Round 106 — The Lens Answers

**Date:** 2026-10-05
**Branch:** `codex/r106-project-audit`
**Base:** `main` remains the blessed reference at Version 20; this round is experimental and unmerged.

## Mandate

Audit the reachable project for regressions, dead ends, process leaks, and stale checks, with a direct investigation of the missing gravity lens. Preserve the project's physics constants, storage/route contracts, render safety nets, and the author's pending breaker decision.

## Findings and repairs

### The lens policy could contradict the Studio switch

The quality-change and tier-switch listeners each implemented their own raymarch policy. A quality change could therefore turn the effect off despite **Always On**, or turn it back on after an explicit **Off**. Attach, quality changes, overrides, and temporary-breaker recovery now use the shared pure resolver in `src/engine/raymarchPolicy.ts`.

The policy preserves the intended boundaries:

- **Auto** follows GPU/quality capability and temporary frame-budget stand-down.
- **Always On** bypasses low quality and the recoverable stand-down, but does not force a software renderer or override a shader/three-strike safety disarm.
- **Off** remains authoritative.
- The Studio reports software-renderer degradation explicitly.

### The GPU probe proved the disk raymarch, not visible background lensing

The R103 GPU probe was run against Intel UHD through ANGLE D3D11. It observed five black-hole visuals, a visible geodesic quad, `uLensing=2.4`, no shader or frame-budget disarm, and the engine's sky-bend control at `1`. These signals prove that the disk raymarch and control path were active. **They do not prove that a background galaxy or starfield visibly bent.** The probe did not compare an unwarped source with its lensed image. The R63 void probe passed on the same adapter, but its void/ring ratio (`0.34`) measured the central presentation, not background-image distortion. Captures are `scripts/verify/r106-lens/r103-gpu-lens.png` and `scripts/verify/r106-r63-probe.png`.

Headless smoke uses SwiftShader, which the capability policy correctly treats as software and excludes from geodesic raymarching. Its composite fallback still matched the reference (`histL1=0.0703`, shadow `0.289` vs `0.290`, mean `0.062` vs `0.075`, central bright fraction `0.086` vs `0.086`). That result verifies the fallback image, not sky lensing. The smoke now prints renderer, stage, camera, and hole state so future black frames can be diagnosed from evidence.

The GPU probe starts with the Auto default (`tierOverride` unset). A user's saved profile can still intentionally select Off or Clear; those settings remain meaningful. The Studio status now explains the software-renderer case rather than silently implying lensing is active.

### Camera memory could checkpoint during movement

The web-stage checkpoint predicate only checked stage/portal state. `CameraRig.isSettled` now also requires zoom/orbit targets to converge, inertia to stop, and held controls to release. Pinch tracking clears on both `touchend` and `touchcancel`; the runtime gauntlet verifies pinch activity blocks a checkpoint and each release event re-allows it.

### Smoke/probe servers could leave orphan processes

Several scripts spawned `npm run dev` through a shell, then only stopped the wrapper. On Windows the Node/Vite descendants could outlive that wrapper and squat on the next probe's port. A shared `scripts/tools/process-tree.ts` now uses Windows `taskkill /T /F` and isolated POSIX process groups with graceful-then-forced shutdown. All smoke/probe server callers use it in awaited cleanup, including startup timeout and browser-launch failures. The desktop probe's app and optional A/B server are covered too.

### Stale and dead seams

- R63's probe still read `engine.blackHoles`, removed when R97 extracted `BlackHoleSystem`. It now reads `engine.bhSys.blackHoles`; the actual visual gate passes.
- The architecture census found one never-imported value export and five never-imported type exports. Those module-private declarations are no longer advertised as public exports.
- Round17's source-shape pins now inspect the shared policy and its production call sites, preserving the policy checks after the engine was split.
- `src/App.tsx`'s build label is now R106. Script catalogs and the README's verification summary reflect the current verify chain.

## Verification

- `npm run verify` — green: typecheck, all **24 gauntlets**, dev smoke, and production smoke.
- `npm run audit:arch -- --check` — clean: 184 code files, zero dead value exports, zero dead type exports; `.kamui-disappear` remains the one intentional, gauntlet-pinned CSS class.
- R106 raymarch/camera/process gauntlet — all checks green, including runtime pinch lifecycle and a real disposable parent/child process-tree shutdown.
- R63 live void probe — green on Intel UHD / ANGLE D3D11.
- `npm audit` — 0 vulnerabilities in the current dependency tree.
- Native C++/Rust sources were unchanged, so the desktop compiler gate was not rerun.

## Deliberately unchanged

At the time of R106, the 55 ms breaker still measured the capped physics delta; R107 resolves that defect by sampling visible wall-frame time while preserving its threshold and three-strike safety behavior. Locked storage keys, route/command contracts, seed tables, physical constants, and the composite/shader safety nets were not changed.

The audit ran on the experimental branch. `main` was not changed or merged. The pre-existing untracked `src/realities/solPrime/` data and user edits in four probes were preserved.
