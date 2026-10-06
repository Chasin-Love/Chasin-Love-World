/**
 * ROUND 104 — THE DESKTOP SHELL gauntlet.
 *
 * The author's decree: the old desktop shell (which launched WebView2 with
 * ZERO GPU configuration and silently fell to software rendering — R103
 * measured that exact state at ~2.9 fps) was deleted whole and rebuilt from
 * zero on the branch `r104-the-desktop-rebirth`. This gauntlet is the birth
 * certificate: it pins the GPU-first law into the shell so no future round
 * can quietly regress to the silent-software disaster.
 *
 * The R98 mutation law, applied to every check: each one reads the CONFIG'S
 * PARSED STRUCTURE (not a loose grep over the whole file), so the failure it
 * guards against — deleting the args, renaming the window, drifting the
 * versions, dropping the witness — actually turns it red. A check that
 * cannot fail proves nothing.
 *
 * Pinned here:
 *   GPU-FIRST  — the main window's additionalBrowserArgs forces ANGLE D3D11
 *                AND preserves wry's default disable-features; and it never
 *                ships a GPU-killing flag (--disable-gpu / swiftshader).
 *   LOCKSTEP   — tauri.conf.json ⇄ Cargo.toml ⇄ Cargo.lock versions agree
 *                (the R80 lesson, now a gate instead of a manual fix).
 *   UPDATER    — the plugin config (pubkey + endpoint) and the CI overlay
 *                (tauri.updater.conf.json → createUpdaterArtifacts) survive.
 *   DEVTOOLS   — the release build stays inspectable (the v15.0.0 lesson).
 *   WELDED CORE— build.rs keeps the R100 machinery (vswhere probe + static CRT).
 *   CAPABILITIES— updater + process permissions granted to the main window.
 *   CONTRACT   — all 31 locked commands remain registered in lib.rs.
 *   WITNESS    — the R104 boot witness exists, is desktop-gated, reads the
 *                capability probe, and is wired from the app entry.
 *   PROBE      — the desktop perf probe exists and pins the same GPU policy.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const read = (p: string) => readFileSync(`${ROOT}/${p}`, 'utf8');

let failures = 0;
function check(name: string, ok: boolean, detail: unknown = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : detail}`);
  if (!ok) failures++;
}

const conf = JSON.parse(read('src-tauri/tauri.conf.json'));
const cargoToml = read('src-tauri/Cargo.toml');
const cargoLock = read('src-tauri/Cargo.lock');
const buildRs = read('src-tauri/build.rs');
const libRs = read('src-tauri/src/lib.rs');
const capabilities = JSON.parse(read('src-tauri/capabilities/default.json'));
const mainTsx = read('src/main.tsx');

/* ---------------------------------------------------------------- *
 * 1. GPU-FIRST — the birth-right the old shell never had
 * ---------------------------------------------------------------- */

const mainWin = (conf.app?.windows ?? []).find((w: { label?: string }) => w.label === 'main');
check('R104: the shell declares a main window (structural — no window, no app)',
  !!mainWin, 'no window with label "main" in tauri.conf.json');

const args: string = mainWin?.additionalBrowserArgs ?? '';
check('R104: the main window forces the real GPU through ANGLE D3D11 (the SwiftShader escape)',
  args.includes('--use-angle=d3d11'),
  `additionalBrowserArgs = "${args}" — the GPU-forcing arg is missing`);
check('R104: wry\u2019s default WebView2 args survive (setting the field REPLACES them)',
  args.includes('--disable-features=msWebOOUI') && args.includes('msPdfOOUI') && args.includes('msSmartScreenProtection'),
  `additionalBrowserArgs = "${args}" — the wry defaults must be carried inside the override`);
check('R104: the shell never ships a GPU-killing flag',
  !args.includes('--disable-gpu') && !args.toLowerCase().includes('swiftshader') && !args.includes('--disable-hardware-acceleration'),
  `additionalBrowserArgs = "${args}" — a software-rendering flag returned`);

/* ---------------------------------------------------------------- *
 * 2. VERSION LOCKSTEP (the R80 lesson, now a gate)
 * ---------------------------------------------------------------- */

const confVersion: string = conf.version ?? '';
const tomlVersion = /^version\s*=\s*"([^"]+)"/m.exec(cargoToml)?.[1] ?? '';
const lockVersion = /name = "my-universe"\s*\nversion = "([^"]+)"/.exec(cargoLock)?.[1] ?? '';
check('R104: version lockstep — tauri.conf.json ⇄ Cargo.toml ⇄ Cargo.lock',
  confVersion !== '' && confVersion === tomlVersion && confVersion === lockVersion,
  `conf=${confVersion} toml=${tomlVersion} lock=${lockVersion}`);

/* ---------------------------------------------------------------- *
 * 3. THE UPDATER SURVIVES THE REBIRTH
 * ---------------------------------------------------------------- */

const updaterConf = existsSync(`${ROOT}/src-tauri/tauri.updater.conf.json`)
  ? JSON.parse(read('src-tauri/tauri.updater.conf.json')) : null;
check('R104: the CI updater overlay exists (desktop.yml passes --config src-tauri/tauri.updater.conf.json)',
  !!updaterConf && updaterConf.bundle?.createUpdaterArtifacts === true,
  'tauri.updater.conf.json missing or createUpdaterArtifacts drifted');
check('R104: the updater plugin keeps its pubkey + release endpoint',
  !!conf.plugins?.updater?.pubkey && (conf.plugins?.updater?.endpoints?.length ?? 0) > 0,
  'plugins.updater drifted — the installed apps would go deaf for updates');

/* ---------------------------------------------------------------- *
 * 4. DEVTOOLS + WELDED CORE + CAPABILITIES
 * ---------------------------------------------------------------- */

check('R104: devtools ship in RELEASE too (the v15.0.0 un-debuggable black screen)',
  /tauri\s*=\s*\{\s*version\s*=\s*"2",\s*features\s*=\s*\["devtools"\]\s*\}/.test(cargoToml),
  'the devtools feature was dropped from Cargo.toml');
check('R104: the C++ core stays WELDED (R100 static CRT — zero redist demand)',
  buildRs.includes('static_crt(true)') && buildRs.includes('cosmos_engine.cpp'),
  'build.rs lost the static-CRT weld or the core compile');
check('R104: the vswhere compiler probe survives (the R100 PATH-probe lie)',
  buildRs.includes('vswhere.exe'),
  'build.rs lost the disk probe — barePATH machines silently fall to stubs again');
check('R104: capabilities grant the updater + relaunch to the main window',
  (capabilities.permissions ?? []).includes('updater:default') &&
  (capabilities.permissions ?? []).includes('process:allow-restart') &&
  (capabilities.windows ?? []).includes('main'),
  'capabilities/default.json drifted');

/* ---------------------------------------------------------------- *
 * 5. THE 31-COMMAND LOCKED CONTRACT (parsed like round98 does)
 * ---------------------------------------------------------------- */

const REGISTERED = [
  'cosmos_status', 'cosmos_kepler_batch', 'cosmos_physics_batch', 'cosmos_benchmark',
  'cosmos_terrain_fbm', 'cosmos_sim_configure', 'cosmos_sim_step', 'cosmos_sim_body',
  'cosmos_sim_states', 'cosmos_orbit_position', 'cosmos_time_dilation',
  'store_state_read', 'store_state_write', 'store_payload_put', 'store_payload_get',
  'store_payload_delete', 'reality_bin_list', 'reality_move_to_bin', 'reality_restore',
  'reality_purge', 'reality_empty_bin', 'reality_rename', 'reality_create_folder',
  'reality_write_data', 'reality_daemon_status', 'sky_status', 'sky_upload',
  'sky_activate', 'sky_delete', 'sky_settings', 'sky_asset',
];
/* Anchor on the real invocation (lastIndexOf): an earlier MENTION of the
   macro in a comment must never hijack the parse (the R98 lesson — a check
   that reads the wrong region reports green while proving nothing). */
const handlerBlock = libRs.slice(libRs.lastIndexOf('tauri::generate_handler!'));
const handlerEnd = handlerBlock.indexOf('])');
const registered = new Set<string>();
for (const m of handlerBlock.slice(0, handlerEnd).matchAll(/([a-z_]+)\s*,/g)) registered.add(m[1]);
const missing = REGISTERED.filter((c) => !registered.has(c));
check('R104: every locked command is registered in the reborn handler (31/31)',
  missing.length === 0 && registered.size >= 31,
  `missing: ${missing.join(', ') || 'none'} (registered ${registered.size})`);

/* ---------------------------------------------------------------- *
 * 6. THE BOOT WITNESS (the R98 honesty law at the shell's birth)
 * ---------------------------------------------------------------- */

let witnessSrc = '';
try { witnessSrc = read('src/platform/desktop/bootWitness.ts'); } catch { /* missing */ }
check('R104: the boot witness exists and is desktop-gated (the website must not change)',
  witnessSrc.includes('export function witnessDesktopBoot') &&
  /if \(witnessed \|\| !isDesktop\(\)\) return;/.test(witnessSrc),
  'src/platform/desktop/bootWitness.ts missing or its desktop gate drifted');
check('R104: the boot witness reads the capability probe and names the GPU',
  witnessSrc.includes('probeCapability') && witnessSrc.includes('[desktop] boot witness') &&
  witnessSrc.includes('cosmosBridge'),
  'the witness must name renderer + tier + physics backend in one line');
check('R104: the app entry wires the witness',
  mainTsx.includes('witnessDesktopBoot'),
  'src/main.tsx no longer calls witnessDesktopBoot()');

/* ---------------------------------------------------------------- *
 * 7. THE PROBE (the measured-first receipt for every future round)
 * ---------------------------------------------------------------- */

const probeSrc = read('scripts/probes/round104-desktop-perf-probe.ts');
check('R104: the desktop perf probe exists and enforces the same GPU policy',
  probeSrc.includes('--use-angle=d3d11') && probeSrc.includes('remote-debugging-port'),
  'scripts/probes/round104-desktop-perf-probe.ts missing or its policy drifted');

/* ---------------------------------------------------------------- */

console.log(failures === 0
  ? '\nR104 DESKTOP SHELL — ALL GREEN (the reborn shell is born passing its own law)'
  : `\nR104 DESKTOP SHELL — ${failures} FAILURE${failures > 1 ? 'S' : ''}`);
process.exit(failures === 0 ? 0 : 1);
