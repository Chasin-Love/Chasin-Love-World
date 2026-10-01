# ROUND 89 — THE EVERYWHERE CORE (2026-10-01)

> The author's decree: *"just build what is the best for my project and what make my
> project more glorified and obviously at once"* — the browser tier comes alive. From
> this round on, the same C++ physics core that runs natively in the desktop app is
> compiled to WebAssembly **by CI, automatically, on every push and release** — no
> human ever thinks about emsdk again. Rides the `r88-per-frame-twin` branch (the
> simulator arc: R87 wired the session, R88 ran it per-frame, R89 makes it everywhere).

## What changed

**The artifact moves to `public/wasm/` — the fix nobody could see from the code.** The
bridge used to probe `./wasm/` *next to its own source file*. In dev that resolves
under `/src/…` (fine), but in the **built dist** the module lives in `assets/`, so the
probe would have fetched `assets/wasm/…` — a path nothing ever populates. Even a
perfectly built artifact at the old location could never have loaded in production.
`public/wasm/` is served at the site root in dev *and* copied into `dist/` by Vite:
one location, both worlds. The bridge now probes `/wasm/cosmos_engine.js`
root-relative.

**The artifact becomes importable.** The build gains `-s EXPORT_ES6=1` (a true ES
module with a default export — what `import()` actually needs), and `loadWasm`
accepts default-export **or** global-assignment glue (`EXPORT_NAME` global), so either
artifact shape loads. The head-probe / graceful-null contract is unchanged: no
artifact → TypeScript tier, silently, exactly as before.

**build-wasm.sh gets honest about its two stages.** The CMake stage (AVX2/FMA —
invalid under Emscripten) was never the WASM build; it's now a tolerated native probe
with a warning, while `em++` is the script's hard gate (`command -v em++` or exit 1).

**The CI job (the forever part).** `.github/workflows/desktop.yml` gains a `wasm` job:
pinned emsdk (3.1.74, cached via setup-emsdk), runs `scripts/build-wasm.sh`, uploads
the artifact, and — on pushes to `main` — **commits it back into the source tree**
(bot commit, `[skip ci]`, only when the bytes changed, so no rebuild loop). The
`release` job now `needs: [build, wasm]` and attaches `cosmos_engine.js` +
`cosmos_engine.wasm` to every `v*` GitHub release. Consequence: after the first green
run, every future checkout, deploy, and release carries the compiled core; the
browser's physics badge reads **WASM KERNEL**, and the twin card's receipts run on
compiled C++ even in a plain browser tab.

## Verification of this round

- `npx tsc --noEmit` green; round87 + round88 gauntlets green (the export-list pin
  still holds — the list is unchanged, only relocated output); `audit:arch --check`
  clean at the consciously refreshed snapshot; full `npm run verify` green at round
  end.
- The honest limit, one last time and then never again: this laptop has no emsdk, so
  the first artifact build happens **on CI when this branch reaches main**. If the
  pinned emsdk version or the ES6 flag needs adjustment, the failing step will say so
  loudly — that's the job's first run doing its job.
