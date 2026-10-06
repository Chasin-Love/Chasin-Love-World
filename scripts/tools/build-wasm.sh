#!/usr/bin/env bash
# Builds the C++ simulation core to WebAssembly (src/platform/native/wasm/).
# Requires emsdk: https://emscripten.org/docs/getting_started/downloads.html
#
#   npm run wasm:build
#
# R99 — the script activates emsdk ITSELF when em++ is not already on the
# PATH, probing the author's install at ~/Desktop/emsdk first (installed
# during R95 and NOT on the PATH — which is exactly how R98 concluded
# "no emsdk on this machine" and left the artifact stale for a whole round).
# An explicit `source <emsdk>/emsdk_env.sh` still wins; CI activates its own.
#
# The bridge (src/platform/native/cpp_bridge.ts) detects ./wasm/cosmos_engine.js
# at runtime and uses it automatically; without it the TypeScript reference
# implementation serves. CI builds this artifact when emsdk is configured.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# R89 — public/wasm/: Vite serves public/ at the site root in dev AND copies
# it into dist/ for production, so one location serves both. The bridge
# probes /wasm/cosmos_engine.js root-relative (cpp_bridge.ts loadWasm).
OUT="$ROOT/public/wasm"
SRC="$ROOT/src/platform/native"

mkdir -p "$OUT"

# R99 — auto-activate the author's emsdk. Sourced (not executed) so the env
# lands in THIS shell; a first location wins and CI's pre-activated em++
# skips the probe entirely.
if ! command -v em++ >/dev/null 2>&1; then
  for CAND in "$HOME/Desktop/emsdk" "$HOME/emsdk"; do
    if [ -f "$CAND/emsdk_env.sh" ]; then
      # shellcheck disable=SC1090
      . "$CAND/emsdk_env.sh" >/dev/null 2>&1 || true
      break
    fi
  done
fi

# R89 — the CMake stage is the NATIVE shared-library build (AVX2/FMA flags —
# invalid under Emscripten). Under emcmake it is a tolerated probe only:
# its output is NOT the artifact. The real WASM module is the standalone
# em++ build below, which is the hard gate of this script.
emcmake cmake -B "$SRC/build-wasm" -S "$SRC" \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_CXX_FLAGS="-O3 -ffast-math -msimd128" \
  || echo "⚠ emcmake configure failed (tolerated — the em++ build below is the WASM artifact)"

cmake --build "$SRC/build-wasm" -j "$(nproc 2>/dev/null || echo 4)" \
  || echo "⚠ cmake build failed (tolerated — see above)"

# Hard gate: the Emscripten compiler must exist (emsdk active).
command -v em++ >/dev/null 2>&1 || { echo "em++ not found — is emsdk active?"; exit 1; }

# Produce the Emscripten module the bridge expects (glue JS + .wasm)
#
# R87 — EXPORTED_FUNCTIONS is load-bearing: without it the -O3 linker
# dead-strips every cosmos_* symbol (they have no callers inside the
# module), and the bridge's ccall() calls throw — the whole WASM tier
# silently degrades to TypeScript. Every function the bridge calls must
# appear here, prefixed with _. The simulator session functions joined
# the list with R87 (cosmos_create/add/step/get/destroy_simulator).
#
# HEAPF64 is load-bearing too: newer emscripten (4.0+) no longer attaches
# the memory views to the module object by default, and the bridge reads
# every batch (kepler, physics, body states) straight through HEAPF64.
# Without this export the whole wasm batch surface throws "Cannot read
# properties of undefined" on first read — found by the first
# locally-built artifact (R95); the tier then silently fell back to
# TypeScript and the session never drove. ccall/cwrap were pinned for the
# same reason in R87.
# R99 — `node` joins the environment list so the conformance gauntlet can
# EXECUTE the artifact for its numerical half; the app still probes
# web/worker first, so browser behaviour is unchanged.
em++ "$SRC/cosmos_engine.cpp" \
  -O3 -ffast-math -msimd128 \
  -std=c++20 \
  --bind -s MODULARIZE=1 -s EXPORT_NAME=cosmos_engine \
  -s EXPORT_ES6=1 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s ENVIRONMENT=web,worker,node \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","HEAPF64"]' \
  -s EXPORTED_FUNCTIONS='["_cosmos_version","_cosmos_orbit_position","_cosmos_kepler_batch","_cosmos_physics_batch","_cosmos_terrain_fbm","_cosmos_benchmark_rk4","_cosmos_time_dilation","_cosmos_create_simulator","_cosmos_destroy_simulator","_cosmos_add_body","_cosmos_step_simulation","_cosmos_get_body_state","_cosmos_get_body_states","_malloc","_free"]' \
  -o "$OUT/cosmos_engine.js"

echo "wasm module written to $OUT/cosmos_engine.js"
