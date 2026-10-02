# AGENTS.md — read this before anything else

## First action

Read [`PROJECT-BRAIN.md`](./PROJECT-BRAIN.md) fully. It is the project's brain: identity,
laws, current state, roadmap, glossary, and the list of traps that ruin this project.
For exact numbers, seeds, and shaders, read [`README.md`](./README.md) (the Resurrection
Blueprint). For quality baseline and roadmap: `docs/EXPERIENCE-REPORT-2026-09-29.md`.

## The ten-second laws

- `main` is the blessed reference branch; branch work is experimental until the author merges it.
- Raw Three.js + custom GLSL. NO react-three-fiber/drei. Custom store, single mutation surface
  `src/state/actions.ts`. NO zustand/redux. NO backend/cloud — offline-first sovereignty.
- Engine ⇄ React only via `EngineCallbacks`. Locked contracts: route strings, Tauri commands,
  localStorage keys, `src/realities/*/index.ts` paths.
- Physics constants, seed tables, black-hole reference params are LAW — never "clean them up".
- Never remove safety nets (composite fallback, shader disarm, 55 ms breaker, reduced-motion).
- R71 law: zoom never crosses cosmological slices; crossing is an explicit Kamui only.
- Verify before claiming done: `npm run verify` (+ `npx tsx scripts/gauntlets/round18-kamui-gauntlet.ts`,
  `npx tsx scripts/probes/round63-void-probe.ts` when relevant, `npm run audit:arch -- --check`).
- End every round by updating `PROJECT-BRAIN.md` §8/§9 and writing the round document in `docs/`.

If a "bug" looks artistic, check `PROJECT-BRAIN.md` §6/§10 and the round docs before fixing it.
