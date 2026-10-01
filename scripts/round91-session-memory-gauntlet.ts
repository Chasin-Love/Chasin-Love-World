/**
 * ROUND 91 — THE SESSION GETS A MEMORY AND A WIDE EYE gauntlet.
 *
 * The author's R91 decree (docs/ROUND-91-THE-REAL-UNIVERSE-DECREE.md):
 * the canon seeds; the session drives; the clockwork is the fallback and
 * the heal. This round lays the machinery — no rendered behavior changes
 * yet. The invariants pinned here:
 *
 *  - THE WIDE EYE: batched session read exists at every layer (C++ FFI,
 *    Rust real+stub in lockstep, the Tauri command, the WASM export pin,
 *    and the bridge's simStates on all three tiers) — the driver must
 *    never pay one round-trip per body.
 *  - THE DRIVER MODULE'S PURITY (the narrowed hybrid law): sessionDriver
 *    never writes rendered state, never touches THREE, never imports the
 *    store — telemetry rides its own module map. simTwin.ts remains the
 *    untouched read-only lab (the R88 gauntlet still guards it).
 *  - THE CANON SEEDS: the roster carries REAL physical masses (massKg)
 *    and the SI conversion; the vault is 10 M☉ here by law.
 *  - THE UNIVERSE REMEMBERS: the storage key is registered in the locked
 *    registry; save/restore round-trips; restore configures FROM SAVED
 *    STATES; roster churn preserves drift (states carried by id); the
 *    heal deletes the memory and re-seeds.
 *  - THE FRESHNESS LAW: the seam read extrapolates from the readback stamp
 *    and refuses anything stale beyond the trust window (null → Kepler).
 */
import { readFileSync } from 'node:fs';

let failures = 0;
function check(name: string, ok: boolean, detail: unknown) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : detail}`);
  if (!ok) failures++;
}

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const hppSrc = read('../src/platform/native/cosmos_engine.hpp');
const cppSrc = read('../src/platform/native/cosmos_engine.cpp');
const rustRealSrc = read('../src-tauri/src/cosmos.rs');
const libSrc = read('../src-tauri/src/lib.rs');
const wasmBuildSrc = read('../scripts/build-wasm.sh');
const bridgeSrc = read('../src/platform/native/cpp_bridge.ts');
const driverSrc = read('../src/physics/sessionDriver.ts');
const keysSrc = read('../src/platform/storageKeys.ts');
const pkgSrc = read('../package.json');

/* ==== 1. THE WIDE EYE — batched read at every layer ==== */
{
  const hpp = /uint32_t cosmos_get_body_states\(void\* handle, uint32_t count, double\* out\);/.test(hppSrc);
  check('R91: the C++ header declares cosmos_get_body_states (6 doubles per body, row-major)', hpp, 'hpp missing the batched read');

  const cpp = /uint32_t cosmos_get_body_states\(void\* handle, uint32_t count, double\* out\) \{/.test(cppSrc)
    && /bodies\[i\]\.position\.x;/.test(cppSrc);
  check('R91: the C++ core implements the batched read', cpp, 'cpp implementation missing');

  const rustReal = /pub fn cosmos_get_body_states\(\s*handle: \*mut c_void,\s*count: u32,\s*out: \*mut c_double,\s*\) -> u32;/.test(rustRealSrc)
    && /pub unsafe fn cosmos_get_body_states\(/.test(rustRealSrc);
  check('R91: the Rust FFI declares the batched read (real + stub in lockstep)', rustReal, 'cosmos.rs missing the declaration or stub');

  const command = /fn cosmos_sim_states\(\) -> Result<serde_json::Value, String> \{/.test(libSrc)
    && /cosmos_sim_states,/.test(libSrc);
  check('R91: the cosmos_sim_states Tauri command exists and is registered', command, 'lib.rs missing the command or handler registration');

  const wasmPin = /"_cosmos_get_body_state","_cosmos_get_body_states",/.test(wasmBuildSrc);
  check('R91: build-wasm.sh exports _cosmos_get_body_states (the dead-strip fix holds)', wasmPin, 'export pin missing the new symbol');

  const bridge = /async simStates\(\): Promise<\{ count: number; states: SimBodyState\[\]; backend: CosmosBackend \}> \{/.test(bridgeSrc)
    && /'cosmos_sim_states'/.test(bridgeSrc)
    && /'cosmos_get_body_states', 'number',/.test(bridgeSrc)
    && /allStates\(\)/.test(bridgeSrc);
  check('R91: the bridge speaks simStates on all three tiers (native/wasm/ts)', bridge, 'bridge batched read incomplete');
}

/* ==== 2. THE DRIVER MODULE'S PURITY — the narrowed hybrid law ==== */
{
  const readOnly = !/\.position\.set\(/.test(driverSrc)
    && !/\.rotation\./.test(driverSrc)
    && !/\.visible\s*=/.test(driverSrc)
    && !/b\.group/.test(driverSrc)
    && !/three/i.test(driverSrc);
  check('R91: sessionDriver.ts never writes rendered state (no position/rotation/visible, no THREE)', readOnly, 'the driver touches the sky');

  const ownTelemetry = /export const driverTelemetry = new Map</.test(driverSrc)
    && !/from '\.\.\/state/.test(driverSrc);
  check('R91: the driver publishes to its own module map, never the UI store', ownTelemetry, 'store coupling or missing telemetry map');

  const labUntouched = /export function simTwinTick\(/.test(read('../src/physics/simTwin.ts'));
  check('R91: simTwin.ts remains the untouched read-only lab (R88 law intact)', labUntouched, 'the lab was disturbed');
}

/* ==== 3. THE CANON SEEDS — real masses, SI units ==== */
{
  /* R95 reconciliation: the seed is the canon Kepler solve with the
     orbit-true law on top — the star leads the roster (its own physicsEngine
     mass), bodies keep phys.massKg except the vault, whose in-session mass
     is the one its own canon orbit implies (the 10 M☉ display law is
     untouched elsewhere). */
  const realMasses = /METERS_PER_SCENE_UNIT = CONSTANTS\.AU \/ 52/.test(driverSrc)
    && /calculateKeplerPosition\(r\.a, r\.ecc, r\.phase, r\.incl, atDays, r\.speed, r\.node, r\.argP\)/.test(driverSrc)
    && /massKg: starPhys\.massKg,/.test(driverSrc)
    && /const vMs = \(vmag \* METERS_PER_SCENE_UNIT\) \/ SECONDS_PER_DAY;/.test(driverSrc);
  check('R91: the seeding math is the canon solve (52 units/AU, exact Kepler) — R95: star-led roster + orbit-true vault temper', realMasses, 'seeding deviates from the canon');

  const cap = /SESSION_BODY_CAP = 4096/.test(driverSrc);
  check('R91: the roster honors the 4096 session cap (the Rust law mirrored)', cap, 'no cap');
}

/* ==== 4. THE UNIVERSE REMEMBERS — save/restore + churn preservation ==== */
{
  const key = /simSession: 'my-universe:sim-session:v1',/.test(keysSrc)
    && /STORAGE_KEYS\.simSession/.test(driverSrc);
  check('R91: the session memory uses the locked storage key', key, 'key not registered or not used');

  const roundTrip = /export function serializeSession\(/.test(driverSrc)
    && /export function parseSession\(json: string\): SessionSave \| null \{/.test(driverSrc)
    && /restoreSession\(save: SessionSave\): Promise<number>/.test(driverSrc)
    && /simConfigure\(inputsFromStates\(save\.states\)\)/.test(driverSrc);
  check('R91: save/restore round-trips and restore configures FROM SAVED STATES', roundTrip, 'restore path incomplete');

  const churn = /previous\.get\(r\.id\)/.test(driverSrc)
    && /reconfigurePreserving/.test(driverSrc);
  check('R91: roster churn preserves the drift (states carried by id, never reset)', churn, 'churn would wipe the story');

  const heal = /export async function healDriver\(/.test(driverSrc)
    && /delete memory\[realityId\]/.test(driverSrc)
    && /seedFromCanon\(bodies, simDays, realityId\)/.test(driverSrc);
  check('R91: the heal wipes the memory and re-seeds from the canon (Restore Ephemeris, driver edition)', heal, 'heal path incomplete');

  /* R94 reconciliation: enabling IS activating the home scope — the
     resume-or-seed decision lives in activateScope (scopeId), with the
     catch-up burst for a long absence. */
  const resume = /const saved = loadSession\(scopeId\);/.test(driverSrc)
    && /await restoreSession\(saved\);/.test(driverSrc)
    && /await catchUpSession\(simDays\);/.test(driverSrc);
  check('R91: enabling the driver resumes the saved story before seeding fresh', resume, 'boot does not look for the memory');
}

/* ==== 5. THE FRESHNESS LAW — extrapolation + trust window ==== */
{
  const seam = /export function driverReadback\(simDays: number\): Array<\[number, number, number\]> \| null \{/.test(driverSrc)
    && /r\.pos\[0\] \+ r\.vel\[0\] \* dtDays/.test(driverSrc);
  check('R91: the seam read extrapolates position + velocity × Δt', seam, 'no extrapolation');

  /* R95 reconciliation: 2.5 → 8 — with accumulate-before-pending the
     readback never chronically lags, and the wider window removes the
     ~83 ms staleness margin that flickered the sky. */
  const trust = /TRUST_WINDOW_DAYS = 8/.test(driverSrc)
    && /Math\.abs\(dtDays\) > TRUST_WINDOW_DAYS\) return null/.test(driverSrc);
  check('R91: stale readbacks are refused beyond the trust window (null → Kepler fallback)', trust, 'the freshness law is missing');

  const fireForget = /driverState\.pending = true;/.test(driverSrc)
    && /\.finally\(\(\) => \{\s*driverState\.pending = false;\s*\}\);/.test(driverSrc)
    && /DRIVER_SUBSTEPS = 24/.test(driverSrc);
  check('R91: the session advances fire-and-forget with a pending guard, 24 sub-steps', fireForget, 'blocking or unguarded session calls');
}

/* ==== 6. THE CHAIN ==== */
{
  const chained = pkgSrc.includes('round91-session-memory-gauntlet');
  check('R91: the gauntlet sits in the verify chain', chained, 'add scripts/round91-session-memory-gauntlet.ts to npm run verify');
}

if (failures > 0) {
  console.error(`\nR91 SESSION MEMORY GAUNTLET — ${failures} FAILURE${failures > 1 ? 'S' : ''}`);
  process.exit(1);
} else {
  console.log('\nR91 SESSION MEMORY GAUNTLET — ALL GREEN');
}
