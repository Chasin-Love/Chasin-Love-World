#!/usr/bin/env bash
# Builds the C++ simulation core to WebAssembly (src/platform/native/wasm/).
# Requires emsdk: https://emscripten.org/docs/getting_started/downloads.html
#
#   source ~/emsdk/emsdk_env.sh && bash scripts/build-wasm.sh
#
# The bridge (src/platform/native/cpp_bridge.ts) detects ./wasm/cosmos_engine.js
# at runtime and uses it automatically; without it the TypeScript reference
# implementation serves. CI builds this artifact when emsdk is configured.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# R89 — public/wasm/: Vite serves public/ at the site root in dev AND copies
# it into dist/ for production, so one location serves both. The bridge
# probes /wasm/cosmos_engine.js root-relative (cpp_bridge.ts loadWasm).
OUT="$ROOT/public/wasm"
SRC="$ROOT/src/platform/native"

mkdir -p "$OUT"

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
em++ "$SRC/cosmos_engine.cpp" \
  -O3 -ffast-math -msimd128 \
  -std=c++20 \
  --bind -s MODULARIZE=1 -s EXPORT_NAME=cosmos_engine \
  -s EXPORT_ES6=1 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s ENVIRONMENT=web,worker \
  -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
  -s EXPORTED_FUNCTIONS='["_cosmos_version","_cosmos_orbit_position","_cosmos_kepler_batch","_cosmos_physics_batch","_cosmos_terrain_fbm","_cosmos_benchmark_rk4","_cosmos_time_dilation","_cosmos_create_simulator","_cosmos_destroy_simulator","_cosmos_add_body","_cosmos_step_simulation","_cosmos_get_body_state","_cosmos_get_body_states","_malloc","_free"]' \
  -o "$OUT/cosmos_engine.js"

echo "wasm module written to $OUT/cosmos_engine.js"
