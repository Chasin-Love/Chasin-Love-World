/**
 * ROUND 87 — THE NATIVE SIMULATOR gauntlet.
 *
 * The author's ruling: the hybrid. Kepler stays the clockwork of the sky —
 * the stateful N-body simulator is the verified interactive layer, run as a
 * twin against the TypeScript reference until a future round flips the
 * driver. This gauntlet pins the full parity chain of that session:
 * the C++ simulator core, the hpp declarations, the Rust FFI (real + stub),
 * the Tauri session contracts, the bridge's three-tier skeleton, the
 * line-faithful TS twin, and the build-wasm export list that R87.2 fixed
 * (without it the -O3 linker dead-strips every cosmos_* symbol and the
 * whole WASM tier silently degrades to TypeScript).
 *
 * Pure-source mirrors of the round's invariants. Checked without a GPU.
 */
import { readFileSync } from 'node:fs';

let failures = 0;
function check(name: string, ok: boolean, detail: unknown) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : detail}`);
  if (!ok) failures++;
}

const bridgeSrc = readFileSync(new URL('../src/platform/native/cpp_bridge.ts', import.meta.url), 'utf8');
const cppSrc = readFileSync(new URL('../src/platform/native/cosmos_engine.cpp', import.meta.url), 'utf8');
const hppSrc = readFileSync(new URL('../src/platform/native/cosmos_engine.hpp', import.meta.url), 'utf8');
const rustFfiSrc = readFileSync(new URL('../src-tauri/src/cosmos.rs', import.meta.url), 'utf8');
const libSrc = readFileSync(new URL('../src-tauri/src/lib.rs', import.meta.url), 'utf8');
const wasmBuildSrc = readFileSync(new URL('../scripts/build-wasm.sh', import.meta.url), 'utf8');
const cardSrc = readFileSync(new URL('../src/ui/console/SimulatorTwinCard.tsx', import.meta.url), 'utf8');
const pkgSrc = readFileSync(new URL('../package.json', import.meta.url), 'utf8');

/* ==== 1. THE C++ CORE — the simulator and its v1 handle API ==== */
{
  const core = /void NBodySimulator::stepRK4\(\)/.test(cppSrc)
    && /static void computeAccelerations\(/.test(cppSrc)
    && /constexpr double softening = 1e4; \/\/ gravitational softening parameter \(m\^2\)/.test(cppSrc)
    && /void\* cosmos_create_simulator\(\)/.test(cppSrc)
    && /void cosmos_step_simulation\(void\* handle, double dt, int iterations\)/.test(cppSrc);
  check('R87: the C++ core hosts the stateful RK4 N-body simulator', core, 'simulator core incomplete');

  const header = /void\* cosmos_create_simulator\(\);/.test(hppSrc)
    && /void cosmos_add_body\(void\* handle, uint32_t id, double mass, double radius, double px, double py, double pz, double vx, double vy, double vz\);/.test(hppSrc)
    && /void cosmos_get_body_state\(void\* handle, uint32_t index, double\* outPos, double\* outVel\);/.test(hppSrc);
  check('R87: the hpp declares the v1 simulator handle API', header, 'header declarations missing');

  const constants = /constexpr double G_CONST = 6\.67430e-11;/.test(hppSrc);
  check('R87: G_CONST stays SI (m³ kg⁻¹ s⁻²) — the twin mirrors it', constants, 'G_CONST drifted');
}

/* ==== 2. THE RUST FFI — real and stub in lockstep ==== */
{
  const ffi = /pub fn cosmos_create_simulator\(\) -> \*mut c_void;/.test(rustFfiSrc)
    && /pub fn cosmos_add_body\(\s*\n?\s*handle: \*mut c_void,/.test(rustFfiSrc)
    && /pub fn cosmos_get_body_state\(\s*\n?\s*handle: \*mut c_void,/.test(rustFfiSrc);
  check('R87: the real Rust FFI declares the simulator session', ffi, 'cosmos_cpp ffi missing sim functions');

  const stub = /pub unsafe fn cosmos_create_simulator\(\) -> \*mut c_void \{ std::ptr::null_mut\(\) \}/.test(rustFfiSrc)
    && /pub unsafe fn cosmos_destroy_simulator\(_h: \*mut c_void\) \{\}/.test(rustFfiSrc);
  check('R87: the stub ffi mirrors the session (null handle, no claims)', stub, 'stub mode incomplete');

  const session = /static SIM: Mutex<Option<SimSession>> = Mutex::new\(None\);/.test(libSrc)
    && /fn cosmos_sim_configure\(bodies: Vec<serde_json::Value>\)/.test(libSrc)
    && /count >= 4096/.test(libSrc)
    && /iterations\.clamp\(1, 1000\)/.test(libSrc);
  check('R87: the Tauri session keeps its contracts (reset-on-configure, 4096 cap, clamped steps)', session, 'session contract drifted');

  const registered = /cosmos_sim_configure,/.test(libSrc)
    && /cosmos_sim_step,/.test(libSrc)
    && /cosmos_sim_body,/.test(libSrc);
  check('R87: the sim commands stay registered in generate_handler', registered, 'registration missing');
}

/* ==== 3. THE BRIDGE — three-tier skeleton for the session ==== */
{
  const native = /invokeFn<\{ configured: number \}>\('cosmos_sim_configure', \{ bodies \}\)/.test(bridgeSrc)
    && /invokeFn<\{ stepped: number; dt: number \}>\('cosmos_sim_step', \{ dt, iterations: iters \}\)/.test(bridgeSrc)
    && /invokeFn<\{ pos: number\[\]; vel: number\[\] \}>\('cosmos_sim_body', \{ index \}\)/.test(bridgeSrc);
  check('R87: the native tier calls the sim commands directly (no args envelope)', native, 'native path wrong shape');

  const wasm = /ccall\('cosmos_create_simulator', 'number', \[\], \[\]\)/.test(bridgeSrc)
    && /ccall\('cosmos_add_body', null,/.test(bridgeSrc)
    && /ccall\('cosmos_step_simulation', null, \['number', 'number', 'number'\], \[this\.wasmSimHandle, dt, iters\]\)/.test(bridgeSrc)
    && /ccall\('cosmos_get_body_state', null, \['number', 'number', 'number'\], \[this\.wasmSimHandle, index, pp, pv\]\)/.test(bridgeSrc);
  check('R87: the wasm tier drives the session through stored handles', wasm, 'wasm session path incomplete');

  const clamp = /const iters = Math\.max\(1, Math\.min\(1000, Math\.floor\(iterations\)\)\);/.test(bridgeSrc);
  check('R87: the bridge mirrors the Rust iteration clamp (1..=1000)', clamp, 'clamp not mirrored');

  const receipt = /async verifyTwinParity\(steps = 120, dt = 86400\)/.test(bridgeSrc)
    && /Math\.abs\(states\[i\]\.pos\[k\] - ref\.pos\[k\]\) \/ Math\.max\(1, Math\.abs\(ref\.pos\[k\]\)\)/.test(bridgeSrc);
  check('R87: verifyTwinParity produces the relative-scaled twin receipt', receipt, 'twin receipt missing');
}

/* ==== 4. THE TS TWIN — a line-faithful port, not Living Gravity ==== */
{
  const twin = /class TsNBodySim \{/.test(bridgeSrc)
    && /private static readonly G = 6\.67430e-11;/.test(bridgeSrc)
    && /private static readonly SOFTENING = 1e4;/.test(bridgeSrc)
    && /private accelerations\(ax: number\[\], ay: number\[\], az: number\[\]\): void/.test(bridgeSrc)
    && /for \(let j = i \+ 1; j < n; \+\+j\)/.test(bridgeSrc)
    && /\(vx0\[i\] \+ vx1\[i\] \* 2\.0 \+ vx2\[i\] \* 2\.0 \+ vx3\[i\]\) \* \(dt \/ 6\.0\)/.test(bridgeSrc);
  check('R87: the TS twin ports computeAccelerations + stepRK4 line-for-line (SI, pairwise, RK4)', twin, 'twin not faithful');

  const seeded = /function seededSimSystem\(\): SimBodyInput\[\]/.test(bridgeSrc)
    && /const M_SUN = 1\.98847e30;/.test(bridgeSrc)
    && /const v = Math\.sqrt\(\(G \* M_SUN\) \/ r\);/.test(bridgeSrc);
  check('R87: the seeded system is deterministic and physical (circular AU orbits)', seeded, 'seeded system missing');
}

/* ==== 5. THE WASM EXPORT LIST — R87.2's dead-strip fix ==== */
{
  const exports = /-s EXPORTED_FUNCTIONS='\["_cosmos_version","_cosmos_orbit_position","_cosmos_kepler_batch","_cosmos_physics_batch"/.test(wasmBuildSrc)
    && /"_cosmos_create_simulator","_cosmos_destroy_simulator","_cosmos_add_body","_cosmos_step_simulation","_cosmos_get_body_state"/.test(wasmBuildSrc)
    && /"_malloc","_free"\]/.test(wasmBuildSrc);
  check('R87: build-wasm exports the full bridge surface (the dead-strip fix)', exports, 'EXPORTED_FUNCTIONS incomplete');
}

/* ==== 6. THE CARD — the twin's public face, button-driven ==== */
{
  const card = /NATIVE SIMULATOR TWIN/.test(cardSrc)
    && /cosmosBridge\.verifyTwinParity\(\)/.test(cardSrc)
    && /receipt\.maxDelta < 1e-9 \|\| receipt\.backend === 'typescript'/.test(cardSrc);
  check('R87: the twin card runs the receipt behind a button (same criterion as the core card)', card, 'card incomplete');
}

/* ==== 7. THE VERIFY CHAIN ==== */
{
  const chain = /"verify".*round87-simulator-gauntlet/.test(pkgSrc);
  check('R87: the gauntlet sits in the verify chain', chain, 'not in the verify chain');
}

console.log(failures === 0
  ? '\nR87 NATIVE SIMULATOR GAUNTLET — ALL GREEN'
  : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
