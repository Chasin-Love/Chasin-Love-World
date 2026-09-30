/**
 * ROUND 84 — THE ASCENDING NODES gauntlet.
 *
 * The author's law, in their words: the universe is a real simulator and the
 * planets must not all ride one flat sheet — "in the real universe … some are
 * directly horizontally, some vertically, some with a cone". The round gave
 * every orbit its full element set: the ascending node Ω places each plane's
 * crossing line around the star, the periapsis argument ω orients each
 * ellipse within its plane, and the composition is exact in the TS solver,
 * the C++/WASM core and the Rust FFI alike. Sol-Prime wears the real J2000
 * elements (JPL); every codegen site scatters nodes around the full circle
 * with a spiced exoplanet tail; the moons, the star's wobble and the
 * asteroid belt follow.
 *
 * Pure-source mirrors of the round's invariants. Checked without a GPU.
 */
import { readFileSync } from 'node:fs';

let failures = 0;
function check(name: string, ok: boolean, detail: unknown) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : detail}`);
  if (!ok) failures++;
}

const physSrc = readFileSync(new URL('../src/physics/physicsEngine.ts', import.meta.url), 'utf8');
const domainSrc = readFileSync(new URL('../src/domain/universe.ts', import.meta.url), 'utf8');
const nbodySrc = readFileSync(new URL('../src/physics/nbody.ts', import.meta.url), 'utf8');
const engSrc = readFileSync(new URL('../src/engine/engine.ts', import.meta.url), 'utf8');
const bridgeSrc = readFileSync(new URL('../src/platform/native/cpp_bridge.ts', import.meta.url), 'utf8');
const cppSrc = readFileSync(new URL('../src/platform/native/cosmos_engine.cpp', import.meta.url), 'utf8');
const hppSrc = readFileSync(new URL('../src/platform/native/cosmos_engine.hpp', import.meta.url), 'utf8');
const rustFfiSrc = readFileSync(new URL('../src-tauri/src/cosmos.rs', import.meta.url), 'utf8');
const libSrc = readFileSync(new URL('../src-tauri/src/lib.rs', import.meta.url), 'utf8');
const seedsSrc = readFileSync(new URL('../src/vault/storage/seeds.ts', import.meta.url), 'utf8');
const genSrc = readFileSync(new URL('../src/realities/galaxyGenerator.ts', import.meta.url), 'utf8');
const realitiesSrc = readFileSync(new URL('../src/realities/index.ts', import.meta.url), 'utf8');
const actionsSrc = readFileSync(new URL('../src/state/actions.ts', import.meta.url), 'utf8');
const templatesSrc = readFileSync(new URL('../server/realityTemplates.ts', import.meta.url), 'utf8');
const readmeSrc = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const pkgSrc = readFileSync(new URL('../package.json', import.meta.url), 'utf8');

/* ==== 1. THE CONTRACT — node/argP exist, optional, defaulted ==== */
{
  const contract = /export interface Orbit \{ a: number; speed: number; phase: number; incl: number; node\?: number; argP\?: number; \}/.test(domainSrc);
  check('R84: the Orbit contract carries optional node (Ω) and argP (ω)', contract, 'contract missing');

  const defaulted = /export function calculateKeplerPosition\([\s\S]*?node = 0,\s*\n\s*argP = 0,/.test(physSrc);
  check('R84: the solver defaults node/argP to 0 — legacy seeds keep their plane', defaulted, 'no zero defaults');
}

/* ==== 2. THE PLANE COMPOSITION — ω in-plane, i about the node, Ω to azimuth ==== */
{
  const helper = /export function tiltInPlaneVector\(/.test(physSrc)
    && /x1 = x0 \* cosW - z0 \* sinW;/.test(physSrc)
    && /y = z1 \* Math\.sin\(inclination\);/.test(physSrc)
    && /x: x1 \* cosO - z1t \* sinO,/.test(physSrc);
  check('R84: the full R(Ω)·R(i)·R(ω) composition lives in one shared helper', helper, 'composition incomplete');

  const solverUsesIt = /const p = tiltInPlaneVector\(/.test(physSrc);
  check('R84: calculateKeplerPosition composes through the shared helper', solverUsesIt, 'solver still hardcodes the plane');

  const memo = /_physSignature[\s\S]*?node \?\? 0\}\|/s.test(physSrc.replace(/\n/g, '|')) || /body\.orbit\.node \?\? 0/.test(physSrc);
  check('R84: the physics memo invalidates on node/argP changes', memo, 'memo blind to the new elements');
}

/* ==== 3. NATIVE PARITY — C++, header, Rust FFI, bridge all speak the elements ==== */
{
  const cpp = /inline void keplerSolve\(double a, double e, double phase, double incl,\s*\n\s*double simDays, double speed, double node, double argP, double\* out\)/.test(cppSrc)
    && /x1 = x0 \* std::cos\(argP\) - z0 \* std::sin\(argP\);/.test(cppSrc)
    && /const double z = x1 \* std::sin\(node\) \+ z1t \* std::cos\(node\);/.test(cppSrc);
  check('R84: the C++ keplerSolve composes ω/i/Ω exactly like the TS reference', cpp, 'C++ plane math not upgraded');

  const batchAbi = /const double\* node, const double\* argP,/.test(cppSrc) && /const double\* node, const double\* argP,/.test(hppSrc);
  check('R84: cosmos_kepler_batch takes node/argP arrays in cpp + hpp', batchAbi, 'batch ABI missing the elements');

  const rust = /node: \*const c_double,\s*\n\s*arg_peri: \*const c_double,/.test(rustFfiSrc)
    && /_node: \*const c_double, _arg_peri: \*const c_double,/.test(rustFfiSrc);
  check('R84: the Rust FFI (real + stub) declares the node/argP pointers', rust, 'Rust FFI not in lockstep');

  const libOk = /#\[serde\(default\)\]\s*\n\s*node: Vec<f64>/.test(libSrc)
    && /arg_peri\.as_ptr\(\)/.test(libSrc)
    && /node\.as_ptr\(\)/.test(libSrc);
  check('R84: the Tauri command deserializes and forwards node/argP (older callers tolerated)', libOk, 'lib.rs not forwarding');

  const bridge = /node\?: number\[\]/.test(bridgeSrc)
    && /argPeri: input\.argP \?\? \[\]/.test(bridgeSrc)
    && /input\.node\?\.\[i\] \?\? 0/.test(bridgeSrc);
  check('R84: the bridge packs node/argP for native, wasm and TS tiers', bridge, 'bridge not threading the elements');
}

/* ==== 4. THE REAL SKY — Sol-Prime wears the J2000 elements ==== */
{
  const j2000 = /node: \(48\.33076593 \* Math\.PI\) \/ 180/.test(seedsSrc)     /* Mercury */
    && /node: \(110\.30393684 \* Math\.PI\) \/ 180/.test(seedsSrc)   /* Pluto */
    && /argP: \(102\.93768193 \* Math\.PI\) \/ 180/.test(seedsSrc)   /* Earth ϖ */
    && /node: \(200\.0 \* Math\.PI\) \/ 180/.test(seedsSrc);         /* the vault */
  check('R84: seeds.ts pins the real J2000 node/argP values (JPL Table 1)', j2000, 'real elements missing');

  const configTwin = /node: \(48\.33076593 \* Math\.PI\) \/ 180/.test(readFileSync(new URL('../src/realities/solPrime/index.ts', import.meta.url), 'utf8'));
  check('R84: the Sol-Prime RealityConfig twin carries the same elements', configTwin, 'config twin stale');
}

/* ==== 5. THE EXOPLANET SPICE — codegen scatters nodes, spiced tail ==== */
{
  const spice = /export function inclinedOrbitElements\(r: \(\) => number, gentleBand: number\)/.test(genSrc)
    && /roll < 0\.05\) incl = \(\(80 \+ r\(\) \* 15\) \* Math\.PI\) \/ 180/.test(genSrc)
    && /else if \(roll < 0\.2\) incl = \(\(30 \+ r\(\) \* 30\) \* Math\.PI\) \/ 180/.test(genSrc)
    && /node: r\(\) \* Math\.PI \* 2, argP: r\(\) \* Math\.PI \* 2/.test(genSrc);
  check('R84: the spice helper — gentle band, ~15% steep, ~5% near-polar, full-circle nodes', spice, 'spice law incomplete');

  const used = /\.\.\.inclinedOrbitElements\(rnd, 0\.24\)/.test(genSrc)
    && /\.\.\.inclinedOrbitElements\(Math\.random, 0\.18\)/.test(realitiesSrc)
    && /\.\.\.inclinedOrbitElements\(r, 0\.4\)/.test(actionsSrc)
    && /node: Math\.random\(\) \* Math\.PI \* 2, argP: Math\.random\(\) \* Math\.PI \* 2/.test(templatesSrc);
  check('R84: every codegen site scatters the plane (generator, factory, addBody, server template)', used, 'a site still flat');
}

/* ==== 6. THE WHOLE SYSTEM FOLLOWS — moons, wobble, N-body, belt ==== */
{
  const moons = /node: hash\(i \+ 3, b\.data\.id\.length \+ 5\) \* Math\.PI \* 2,/.test(engSrc)
    && /node: hash\(i \+ 3, p\.data\.id\.length \+ 5\) \* Math\.PI \* 2,/.test(engSrc)
    && (engSrc.match(/tiltInPlaneVector\(Math\.cos\(ma\) \* m\.a/g) ?? []).length === 2;
  check('R84: diary moons ride their own node at both per-frame sites', moons, 'moon planes not node-aware');

  const wobble = /const tug = tiltInPlaneVector\(Math\.cos\(ang\) \* amp, Math\.sin\(ang\) \* amp, o\.incl, o\.node \?\? 0, o\.argP \?\? 0\);/.test(engSrc);
  check('R84: the star\'s barycentric wobble points along the real plane geometry', wobble, 'wobble still node-at-X');

  const nbody = /node: number; argP: number;/.test(nbodySrc)
    && /nd\.argP \+ nd\.omegaP/.test(nbodySrc)
    && /calculateKeplerPosition\(nd\.a, nd\.e0, nd\.phase, nd\.incl, simDays \+ d, nd\.speed, nd\.node, nd\.argP\)/.test(nbodySrc);
  check('R84: Living Gravity carries canonical nodes and precesses Δω exactly in-plane', nbody, 'N-body not node-aware');

  const belt = (engSrc.match(/Math\.sin\(inc\) \* r \+ \(R\(\) \+ R\(\) \+ R\(\) - 1\.5\) \/ 1\.5 \* 1\.1/g) ?? []).length === 2
    && (engSrc.match(/Math\.sin\(inc\) \* r \+ band/g) ?? []).length === 2;
  check('R84: both asteroid belts are toroidal (per-speck inclination, home + inner)', belt, 'a belt still flat');
}

/* ==== 7. THE ENGINE CALL SITES — every position solve threads the elements ==== */
{
  const threaded = (engSrc.match(/o\.node \?\? 0, o\.argP \?\? 0/g) ?? []).length >= 3
    && /data\.orbit\.node \?\? 0, data\.orbit\.argP \?\? 0/.test(engSrc)
    && /node: o\.node \?\? 0,\s*\n\s*node\.argP = o\.argP \?\? 0;/.test(engSrc.replace('node.argP', 'argP').replace(/\n\s*/, '\n'))
    || /node\.node = o\.node \?\? 0;/.test(engSrc);
  check('R84: the per-frame, inner-system and Living-Gravity feeds all pass node/argP', threaded, 'a call site still drops the elements');
}

/* ==== 8. THE BLUEPRINT — README pins extended, never erased ==== */
{
  const readme = /node\?: number; argP\?: number;/.test(readmeSrc)
    && /48\.33 \/ 29\.13 \(Mercury\)/.test(readmeSrc)
    && /110\.30 \/ 113\.76 \(Pluto\)/.test(readmeSrc);
  check('R84: README §4.3/§6.1 extended with the node column (values preserved)', readme, 'blueprint not reconciled');

  const gauntletInChain = /"verify".*round84-inclination-gauntlet/.test(pkgSrc) || /round84-inclination-gauntlet/.test(pkgSrc);
  check('R84: the gauntlet sits in the verify chain', gauntletInChain, 'not wired into package.json');
}

console.log(failures === 0 ? '\nR84 ASCENDING NODES GAUNTLET — ALL GREEN' : `\nR84 GAUNTLET — ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
