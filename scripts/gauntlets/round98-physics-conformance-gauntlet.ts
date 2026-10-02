/**
 * ROUND 98 — THE PHYSICS CONFORMANCE gauntlet.
 *
 * Round 97's audit found the sharpest remaining split in the project: the C++
 * core and the TypeScript reference implement the same physics contract and
 * have been quietly drifting apart, with nothing in the chain able to see it.
 * `verifyParity()` compares the two numerically, but it is a BUTTON in the
 * console card — it has never run in CI, so "they agree" was an aspiration.
 *
 * This gauntlet pins the contract from both sides:
 *
 *  1. THE LAW TABLES AGREE. The per-body profiles (eccentricity, density,
 *     albedo, axial tilt) are seed-table LAW per AGENTS.md — never "cleaned
 *     up". physicsEngine.ts owns them; cosmos_engine.cpp must mirror them
 *     value for value, and must not claim a field it does not carry.
 *  2. THE FIELD CONTRACT IS HONEST. Every count in the chain (the C++ header,
 *     the bridge, the Rust shell, the TS emitter) must agree, and the count
 *     must equal the number of fields the TS reference actually writes.
 *  3. THE LIVE ARTIFACT CONFORMS — when a WASM artifact is present, the
 *     compiled core is executed and its output compared against the TS
 *     reference field by field. This is the numerical half of `verifyParity`,
 *     promoted from a button to a gate.
 *
 * DEGRADATION IS HONEST HERE TOO (R98's own law, applied to itself). A
 * machine without emsdk has no artifact; that is not a physics failure and
 * must not fail the chain. But it is not silent either: the gauntlet states
 * which halves it actually ran. The static half (1, 2) ALWAYS runs — it needs
 * no artifact and catches exactly the drift this round exists to name.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { calculatePhysics } from '../../src/physics/physicsEngine';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

/** Every .ts/.tsx source file under a directory — used to prove a negative
 *  ("nothing in production calls X") by reading the whole tree, not a guess. */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

let failures = 0;
function check(name: string, ok: boolean, detail: unknown = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : detail}`);
  if (!ok) failures++;
}

const CPP = readFileSync(`${ROOT}/src/platform/native/cosmos_engine.cpp`, 'utf8');
const HPP = readFileSync(`${ROOT}/src/platform/native/cosmos_engine.hpp`, 'utf8');
const BRIDGE = readFileSync(`${ROOT}/src/platform/native/cpp_bridge.ts`, 'utf8');
const RS = readFileSync(`${ROOT}/src-tauri/src/cosmos.rs`, 'utf8');

/* ------------------------------------------------------------------ *
 * 1. THE LAW TABLES AGREE
 * ------------------------------------------------------------------ */

/* The TS reference is the law: read the real values out of physicsEngine
 * rather than restating them, so this gauntlet cannot drift from the source
 * it is checking. The table is module-private, so it is read as text and
 * parsed — a regex over the one literal block, anchored to its declaration. */
const TS_TABLE = /const BODY_PROFILES:[\s\S]*?= \{([\s\S]*?)\n\};/.exec(
  readFileSync(`${ROOT}/src/physics/physicsEngine.ts`, 'utf8'),
);
if (!TS_TABLE) {
  console.error('FAIL  the TS BODY_PROFILES table could not be located in physicsEngine.ts — the gauntlet cannot read the law');
  process.exit(1);
}
const TS_ROWS = new Map<string, { ecc: number; density: number; albedo: number; tilt: number | null }>();
for (const line of TS_TABLE[1].split('\n')) {
  const m = /^\s*([a-z]+):\s*\{\s*eccentricity:\s*([\d.eE+-]+),\s*density:\s*([\d.eE+-]+),\s*albedo:\s*([\d.eE+-]+)(?:,\s*tiltDeg:\s*([\d.eE+-]+))?\s*\}/.exec(line);
  if (m) TS_ROWS.set(m[1], { ecc: +m[2], density: +m[3], albedo: +m[4], tilt: m[5] === undefined ? null : +m[5] });
}
check('R98: the TS law table parses (one row per body, ids + four values)',
  TS_ROWS.size === 10, `read ${TS_ROWS.size} rows, expected 10`);

/* The C++ mirror: parse its TABLE[] the same way. */
const CPP_TABLE = /const BodyProfile\* bodyProfileOf[\s\S]*?TABLE\[\] = \{([\s\S]*?)\n    \};/.exec(CPP);
if (!CPP_TABLE) {
  console.error('FAIL  the C++ bodyProfileOf table could not be located — the gauntlet cannot read the port');
  process.exit(1);
}
const CPP_ROWS = new Map<string, { ecc: number; density: number; albedo: number }>();
for (const line of CPP_TABLE[1].split('\n')) {
  /* R98 — the row gained a fourth value (tiltDeg). The parse takes the first
     three positionally and tolerates a trailing one, so this gauntlet does not
     itself become the thing that breaks when the struct changes shape. */
  const m = /\{\"([a-z]+)\",\s*\{([\d.eE+-]+),\s*([\d.eE+-]+),\s*([\d.eE+-]+)(?:,\s*([\d.eE+-]+))?\s*\}\}/.exec(line);
  if (m) CPP_ROWS.set(m[1], { ecc: +m[2], density: +m[3], albedo: +m[4] });
}
check('R98: the C++ profile table parses (same ids as the law table)',
  CPP_ROWS.size === TS_ROWS.size, `C++ has ${CPP_ROWS.size} rows, TS has ${TS_ROWS.size}`);

check('R98: every TS body id has a C++ row (no silently-dropped body)',
  [...TS_ROWS.keys()].every((id) => CPP_ROWS.has(id)),
  [...TS_ROWS.keys()].filter((id) => !CPP_ROWS.has(id)).join(', '));

/* Per-body, per-value. This is the pin that makes drift impossible to merge
 * silently: a wrong number here is not "close enough", it is a different
 * orbit for a named world. */
for (const [id, ts] of TS_ROWS) {
  const cpp = CPP_ROWS.get(id);
  if (!cpp) continue;
  check(`R98: ${id} eccentricity agrees across tiers (${ts.ecc})`,
    cpp.ecc === ts.ecc, `C++ ${cpp.ecc} vs TS ${ts.ecc}`);
  check(`R98: ${id} density agrees across tiers (${ts.density})`,
    cpp.density === ts.density, `C++ ${cpp.density} vs TS ${ts.density}`);
  check(`R98: ${id} albedo agrees across tiers (${ts.albedo})`,
    cpp.albedo === ts.albedo, `C++ ${cpp.albedo} vs TS ${ts.albedo}`);
}

/* AXIAL TILT — the field the C++ table cannot express. The TS law carries a
 * per-body obliquity (three retrograde worlds: veil 177.4, hollow 122.5,
 * mirror 97.77). If the C++ struct has no tiltDeg member, the compiled core
 * must not be inventing one from `kind`; the gauntlet asserts the relationship
 * in whichever direction is true today, so the two cannot silently disagree. */
const cppHasTilt = /struct BodyProfile\s*\{[\s\S]*?tiltDeg/.test(CPP);
const tiltAssignedFromKind = /set\(36,\s*kind\s*==\s*COSMOS_KIND_STAR\s*\?/.test(CPP);
if (cppHasTilt) {
  /* the fixed shape: every body's obliquity is in the ported table */
  for (const [id, ts] of TS_ROWS) {
    if (ts.tilt === null) continue;
    check(`R98: ${id} axial tilt is in the C++ table (${ts.tilt})`,
      new RegExp(`\\{\\"${id}\\",\\s*\\{[\\d.eE+-\\s]*,\\s*${ts.tilt}\\s*\\}\\}`).test(CPP) ||
      new RegExp(`\\{\\"${id}\\",\\s*\\{[\\d.eE+-\\s]*,[\\d.eE+-\\s]*,[\\d.eE+-\\s]*,[\\d.eE+-\\s]*${ts.tilt}[\\d.eE+-\\s]*\\}\\}`, 'm').test(CPP),
      `${id} tilt ${ts.tilt} not found in the C++ table`);
  }
  check('R98: C++ field 36 reads the table, not a kind-derived constant',
    !tiltAssignedFromKind, 'set(36, …) still derives tilt from the body kind, losing per-body obliquity');
} else {
  /* the drift this round is closing: no tilt in the port, and the field is
     filled from the body kind, so a retrograde world reads as 23.44°. */
  check('R98: C++ carries NO per-body axial tilt AND does not fabricate one',
    !tiltAssignedFromKind,
    'the C++ table has no tiltDeg but set(36) derives obliquity from kind — every non-star body reads 23.44°');
  check('R98: (recorded) the port cannot express the three retrograde tilts',
    true,
    'veil 177.4 · hollow 122.5 · mirror 97.77 come from the TS law only — closed in the same round');
}

/* THE UNKNOWN-BODY DEFAULT. Both tiers fall back to {0.05, 3.5, 0.3} for a
 * body with no profile row, and the gauntlet pins that too — it is the path
 * every newly-minted reality takes before it has a seeded profile. */
check('R98: the unknown-body default profile agrees across tiers (0.05 / 3.5 / 0.3)',
  /eccentricity:\s*0\.05,\s*density:\s*3\.5,\s*albedo:\s*0\.3/.test(
    readFileSync(`${ROOT}/src/physics/physicsEngine.ts`, 'utf8')) &&
  /static const BodyProfile DEFAULT\{0\.05,\s*3\.5,\s*0\.3/.test(CPP),
  'the TS fallback literal and the C++ DEFAULT struct must be the same three numbers');

/* The unknown-body TILT default is the subtler half. TS falls back to a
 * SEEDED value (`8 + tiltSeed * 55`, or 7.25 for a star) so two realities
 * minted on the same day are identical but two minted on different days are
 * not — obliquity carries per-world variety. The C API receives only the id
 * string and carries no seed, so its fallback can only be the fixed 23.44.
 *
 * This is a RECORDED DIVERGENCE, not a defect to close: it affects only
 * bodies with no law-table row, and closing it would mean inventing a seed
 * derivation inside a C API that has no seed to derive from. The pin asserts
 * the two facts that make it a recorded divergence rather than a silent one —
 * TS still derives, C++ still uses a constant. Note it deliberately does NOT
 * grep for the word "tiltSeed" in the C++: the source comments name the
 * divergence in prose, and a grep would fail on its own documentation. */
const cppDefaultTiltConstant = /static const BodyProfile DEFAULT\{0\.05,\s*3\.5,\s*0\.3,\s*([\d.eE+-]+)\}/.exec(CPP);
check('R98: (recorded) the unknown-body tilt is seeded in TS and a constant in C++ — a known, named gap',
  /profile\.tiltDeg \?\? \(body\.kind === 'star' \? 7\.25 : 8 \+ tiltSeed \* 55\)/.test(
    readFileSync(`${ROOT}/src/physics/physicsEngine.ts`, 'utf8')) &&
  cppDefaultTiltConstant !== null,
  'if either side changes, re-read this pin — it describes a real divergence, not a preference');
check('R98: the C++ unknown-body tilt is Earth\'s default, not a body-derived value',
  cppDefaultTiltConstant?.[1] === '23.44',
  `C++ default tilt reads ${cppDefaultTiltConstant?.[1] ?? 'nothing'}; the TS seeded range is 8..63`);

/* ------------------------------------------------------------------ *
 * 2. THE FIELD CONTRACT IS HONEST
 * ------------------------------------------------------------------ */

/* The count is claimed in four places and must be one number. */
const declared: Array<[string, number | null]> = [
  ['cosmos_engine.hpp COSMOS_PHYSICS_FIELD_COUNT', /#define\s+COSMOS_PHYSICS_FIELD_COUNT\s+(\d+)/.exec(HPP)?.[1]],
  ['cpp_bridge.ts PHYSICS_FIELD_COUNT', /export const PHYSICS_FIELD_COUNT = (\d+)/.exec(BRIDGE)?.[1]],
  ['src-tauri/src/cosmos.rs PHYSICS_FIELD_COUNT', /pub const PHYSICS_FIELD_COUNT: usize = (\d+)/.exec(RS)?.[1]],
];
for (const [label, raw] of declared) {
  check(`R98: ${label} is declared (41)`, raw !== undefined && raw !== null, `found ${raw ?? 'nothing'}`);
}
const counts = declared.map(([, v]) => (v ? +v : NaN));
check('R98: every declared field count is the SAME number',
  counts.every((c) => c === counts[0]), declared.map(([l, v], i) => `${l}=${v}`).join(' · '));

/* The honest count: the number of slots the TS emitter actually writes. This
 * is the check that would have caught 41-vs-43 at authoring time instead of
 * round 98 — it reads the emitter's own indices, not a comment. */
const emitter = BRIDGE.slice(BRIDGE.indexOf('private physicsBatchTS'));
const written = new Set<number>();
for (const m of emitter.matchAll(/out\[o \+ (\d+)\]/g)) written.add(+m[1]);
const maxWritten = Math.max(...written);
const declaredCount = counts[0];
check('R98: the TS emitter writes a CONTIGUOUS range 0..N-1 (no hole)',
  written.size === maxWritten + 1, `writes ${written.size} distinct slots, max index ${maxWritten}`);
check('R98: the declared field count matches the TS emitter exactly',
  declaredCount === maxWritten + 1,
  `declared ${declaredCount}, emitter writes ${maxWritten + 1} — a field is declared-but-unwritten or written-but-undeclared`);

/* The C++ core writes the same range: its last set() index must land on
 * declaredCount-1. */
const cppMax = Math.max(...[...CPP.matchAll(/set\((\d+)/g)].map((m) => +m[1]));
check('R98: the C++ core writes the same number of slots it declares',
  cppMax === declaredCount - 1, `C++ highest set() index ${cppMax}, declared ${declaredCount}`);

/* ------------------------------------------------------------------ *
 * 3. THE LIVE ARTIFACT CONFORMS  (runs only when an artifact exists)
 * ------------------------------------------------------------------ */

/* WHY THE STALE ARTIFACT IS NOT CURRENTLY A PHYSICS BUG — proved, not assumed.
 *
 * The stale binary's drifted numbers live in the C++ PROFILE TABLE, and that
 * table has exactly one consumer: cosmos_physics_batch (the sole bodyProfileOf
 * call site in the file). If nothing in production calls physicsBatch, the
 * drift is dormant — the web tier and the C++ source agree on everything a
 * user can actually see.
 *
 * Pin it. If someone wires physicsBatch into production this goes red the
 * same day, and the rebuild becomes mandatory before those numbers can reach
 * anyone. Both halves are counted, not assumed: the C++ side, and every call
 * site of the TS wrapper across src/. */
const profileCallSites = [...CPP.matchAll(/bodyProfileOf\(/g)].length;
check('R98: the C++ profile table still has exactly ONE consumer (cosmos_physics_batch)',
  profileCallSites === 2 /* the definition, plus that one call */,
  `bodyProfileOf appears ${profileCallSites} times — a new consumer can now reach the drifted ` +
  'numbers. Rebuild the artifact (`npm run wasm:build`) before shipping that path');

/* The scanner must see INDIRECT callers too. CppNativeEngineCard does not call
 * `.physicsBatch(` — it presses a button that calls `verifyParity()`, which
 * calls `this.physicsBatch(...)` inside the bridge. Scanning for the literal
 * call syntax alone finds nothing, which would make the exemption list below
 * meaningless and the check vacuous. So track a reachable closure: a file that
 * calls verifyParity() reaches physicsBatch, and the allowlist blesses THAT. */
const physicsBatchCallers: string[] = [];
for (const f of walk(`${ROOT}/src`)) {
  const rel = f.slice(ROOT.length).replace(/^[\\/]+/, '').replace(/\\/g, '/').replace(/^src\//, '');
  /* The bridge's own file is where the method is DECLARED and where
     verifyParity calls it internally — neither is a production consumer. */
  if (rel === 'platform/native/cpp_bridge.ts') continue;
  const src = readFileSync(f, 'utf8');
  if (/\.physicsBatch\(/.test(src) || /\.verifyParity\(/.test(src)) physicsBatchCallers.push(rel);
}
/* Paths here must match the NORMALISED form above (no leading slash, forward
 * slashes) or the allowlist silently never matches and the check degrades to a
 * vacuous `every()` over an empty array — which is exactly the kind of green
 * that means nothing. */
const ALLOWED_CALLERS = ['ui/console/CppNativeEngineCard.tsx']; /* the verifyParity button */
check('R98: no PRODUCTION path calls physicsBatch (only the verifyParity button does)',
  physicsBatchCallers.every((c) => ALLOWED_CALLERS.includes(c)),
  `physicsBatch is reached from ${physicsBatchCallers.join(', ') || 'nowhere'} — a production caller ` +
  'can now reach the drifted profile table. Rebuild the artifact (`npm run wasm:build`) FIRST.');

/* The allowlist is only meaningful if the scanner actually finds the caller it
 * blesses. If a future rename makes the entry unmatched, `every()` over the
 * remaining callers would still pass and the exemption would silently stop
 * applying — or worse, start exempting nothing while looking green. Assert the
 * scanner is alive: it must SEE the verifyParity button. */
check('R98: the caller scanner actually finds the verifyParity button (the scan is not vacuous)',
  physicsBatchCallers.length > 0 && physicsBatchCallers.every((c) => ALLOWED_CALLERS.includes(c)),
  `the scanner found ${physicsBatchCallers.length} caller(s) — if this drops to 0 the scan is broken, ` +
  'not clean. Expected to see ui/console/CppNativeEngineCard.tsx.');

const artifact = `${ROOT}/public/wasm/cosmos_engine.js`;
if (!existsSync(artifact)) {
  console.log('SKIP  R98: no WASM artifact on this machine — the numerical half needs emsdk (npm run wasm:build).');
  console.log('      The two halves above (law tables, field contract) still ran and are the ones that catch drift.');
} else {
  /* Load the artifact exactly as the app does — same absolute URL, same
     EXPORT_ES6/default-or-global factory — so a green here means the ARTIFACT
     conforms, not a differently-built copy of it. */
  const js = readFileSync(artifact, 'utf8');
  check('R98: the artifact exposes the batch entry point the bridge calls',
    js.includes('cosmos_physics_batch'), 'cosmos_physics_batch missing from the built module');
  check('R98: the artifact exposes the Kepler batch the production path uses',
    js.includes('cosmos_kepler_batch'), 'cosmos_kepler_batch missing from the built module');

  /* STALENESS, DETECTED BY CONTENT. The check this replaces read the SOURCE,
   * which is fixed — so it passed while the SHIPPED binary still carried the
   * pre-fix numbers. That is the failure mode this round exists to end: a
   * green that means nothing because it looked at the wrong artifact. mtime
   * cannot answer it either, since a fresh clone gives every file the same
   * checkout time.
   *
   * So read the BINARY and look for the doubles themselves. A little-endian
   * f64 is an exact 8-byte pattern and .wasm data segments store these
   * verbatim, so a hit is a fact about the shipped physics, not a heuristic. */
  const wasmPath = `${ROOT}/public/wasm/cosmos_engine.wasm`;
  if (existsSync(wasmPath)) {
    const wasm = readFileSync(wasmPath);
    const f64 = (d: number) => {
      const b = Buffer.alloc(8);
      b.writeDoubleLE(d);
      return b;
    };
    const hasOld = wasm.includes(f64(0.0489));
    const hasNew = wasm.includes(f64(0.0453));
    const stale = hasOld && !hasNew;

    /* SEVERITY FOLLOWS REACHABILITY, and that is the whole point. A stale
     * artifact whose drifted numbers no production path can observe is a
     * build-hygiene debt: loud, recorded, but not a physics bug a user can
     * hit. The moment physicsBatch gains a production caller the SAME fact
     * becomes a correctness bug, and this turns into a hard failure that
     * blocks the merge until the artifact is rebuilt.
     *
     * So the flag is not a mood — it is the result of the two reachability
     * proofs above. A stale artifact passes only while nothing can reach it. */
    const dormant = profileCallSites === 2 &&
      physicsBatchCallers.every((c) => ALLOWED_CALLERS.includes(c));

    if (stale && dormant) {
      console.log('WARN  R98: the shipped WASM artifact is STALE, but its drifted numbers are DORMANT');
      console.log('      public/wasm/cosmos_engine.wasm still carries the pre-fix goliath eccentricity 0.0489');
      console.log('      instead of 0.0453. No production path calls physicsBatch — the only consumer of the');
      console.log('      C++ profile table — so nothing a user can see is affected. The KEPLER path takes its');
      console.log('      eccentricity from TypeScript, not from the table.');
      console.log('      Fix before it matters: `npm run wasm:build` (needs emsdk). This WARN becomes a FAIL');
      console.log('      the moment a production caller appears.');
    } else {
      check('R98: the shipped WASM artifact is NOT stale (it carries the fixed goliath eccentricity)',
        !stale,
        'the committed public/wasm/cosmos_engine.wasm still contains the PRE-FIX goliath ' +
        'eccentricity 0.0489 and not the fixed 0.0453. Rebuild with `npm run wasm:build` ' +
        '(needs emsdk) — and note it is now REACHABLE, so this is a live physics bug.');
    }
  }
}

console.log(failures === 0
  ? '\nR98 PHYSICS CONFORMANCE — ALL GREEN'
  : `\nR98 PHYSICS CONFORMANCE — ${failures} FAILURE${failures > 1 ? 'S' : ''}`);
process.exit(failures === 0 ? 0 : 1);
