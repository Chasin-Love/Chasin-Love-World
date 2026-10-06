/**
 * ROUND 105 — THE VANISHED MARBLE gauntlet.
 *
 * The author's decree, restated: a deleted reality must look like it never
 * existed — not now, not before. R105 found two ways the dead still haunted
 * the app and one way they could come back from the grave, and closed all
 * three. This gauntlet pins the closures so they can never silently regress:
 *
 *   1. THE GHOST MARBLE — the multiverse scene is rebuilt by the App's
 *      EXISTENCE SYNC effect alone, and its skipFirstRebuild guard used to be
 *      stolen by the first real change of every session (the engine ignites
 *      AFTER mount, so the guard was never consumed at boot). The first
 *      delete of a session returned without rebuilding and left the deleted
 *      reality's marble rendering. Pin: engineReady rides in the effect's
 *      deps so the guard is consumed by the engine's arrival, exactly like
 *      the physics-toggles effect above it has done since Round 14.
 *
 *   2. THE LYING DISK LEG — in the compiled desktop app a committed pack has
 *      no folder in the app-data tree, so the bin verbs errored ("Directory
 *      does not exist"), the app toasted "could not reach the bin", and the
 *      retry queue burned five times for a deletion that had fully happened.
 *      Pin: BOTH backend twins carry the nothing-on-disk success-noop branch
 *      on move/restore/purge (R98 lockstep — one twin without it is drift).
 *
 *   3. THE RESURRECTION WINDOW — the persisted state tombstone was the only
 *      thing keeping a deleted pack dead; a wiped/fresh/corrupt state
 *      re-seeded it straight from the bundle. Pin: the disk-side tombstone
 *      ledger (bin/.tombstones/<id>.tombstone) is written by both twins with
 *      the same lifecycle (move writes, purge writes AND KEEPS, restore
 *      clears, empty NEVER eats the ledger), the bin lists expose it, and the
 *      client adopts it at boot and on the sync poll.
 *
 * Every negative here is proven by mutation, not by inspection (the R98 law):
 * remove a pinned line and watch this gauntlet go red before you trust it.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const read = (p: string) => readFileSync(`${ROOT}/${p}`, 'utf8');

let failures = 0;
function check(name: string, ok: boolean, detail: unknown = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : detail}`);
  if (!ok) failures++;
}

const appTsx = read('src/App.tsx');
const realitiesActions = read('src/state/actions/realities.ts');
const realitySync = read('src/platform/sync/realitySync.ts');
const adapter = read('src/platform/desktop/adapter.ts');
const nodeDaemon = read('server/realityDaemon.ts');
const nodeRoutes = read('server/routes/realities.ts');
const libRs = read('src-tauri/src/lib.rs');
const realitiesRs = read('src-tauri/src/realities.rs');

/* ------------------------------------------------------------------ *
 * 1. THE GHOST MARBLE — existence sync fires for the first change
 * ------------------------------------------------------------------ */

/* The exact deps array: engineReady MUST be a dependency of the EXISTENCE
   SYNC effect, or the skipFirstRebuild guard is consumed by the first real
   change of the session instead of the engine's arrival — the R105 bug. */
check(
  'R105: the EXISTENCE SYNC effect carries engineReady in its deps (the guard is consumed by the engine\'s arrival, not by the first delete)',
  /\}, \[galSig, metaSig, customIdsSig, deletedSig, engineReady\]\);/.test(appTsx),
  'expected `}, [galSig, metaSig, customIdsSig, deletedSig, engineReady]);` in src/App.tsx',
);

/* The skip guard and its reason must still be there (the guard is correct —
   it was only ever consumed at the wrong time). */
check(
  'R105: the skipFirstRebuild guard survives with its constructor rationale',
  appTsx.includes('skipFirstRebuild.current = false; return; } /* constructor already built it */'),
  'the guard line changed shape — reconcile this pin consciously',
);

/* ------------------------------------------------------------------ *
 * 2. THE CLIENT — boot adoption + poll safety net
 * ------------------------------------------------------------------ */

check(
  'R105: the boot effect adopts disk tombstones (fetchDiskTombstones → adoptDiskTombstones)',
  appTsx.includes('fetchDiskTombstones()') && appTsx.includes('actions.adoptDiskTombstones(tombstoned)'),
  'App.tsx boot chain lost the tombstone adoption',
);

check(
  'R105: adoptDiskTombstones exists and skips re-created ids (creation outranks a tombstone)',
  realitiesActions.includes('adoptDiskTombstones(ids: string[])') &&
    realitiesActions.includes('state.customRealities?.some((r) => r.id === id)'),
  'the adoption action or its creation guard is gone',
);

check(
  'R105: adoption prunes the resurrected container, wipes its session memory, and recomputes',
  /\[\s*id\]\);?\s*\}?\s*\n?\s*forgetSession\(id\);/.test(realitiesActions.replace(/\r/g, '')) ||
    (realitiesActions.includes('delete state.realities[id];') && realitiesActions.includes('forgetSession(id);')),
  'the zero-trace leg of the adoption action is incomplete',
);

check(
  'R105: the realitySync poll adopts tombstones as the safety net',
  realitySync.includes('actions.adoptDiskTombstones(binRes.tombstoned)') &&
    realitySync.includes("tombstoned?: string[]"),
  'the poll no longer reads the tombstoned field',
);

check(
  'R105: the adapter exposes fetchDiskTombstones reading the tombstoned field',
  adapter.includes('export async function fetchDiskTombstones()') && adapter.includes('res?.tombstoned ?? []'),
  'adapter.ts lost the tombstone reader',
);

/* ------------------------------------------------------------------ *
 * 3. THE NODE TWIN — noop semantics + the tombstone lifecycle
 * ------------------------------------------------------------------ */

const nodeNoopCount = (nodeDaemon.match(/return \{ success: true, noop: true \};/g) ?? []).length;
check(
  'R105: the Node bin verbs carry the nothing-on-disk success-noop (move + restore + purge = 3 branches)',
  nodeNoopCount === 3,
  `found ${nodeNoopCount}, expected 3 — one twin drifting is the R98 disease`,
);

/* Slice one verb's body out of a source file: from its declaration to the
   next declaration marker — a count inside a body proves PLACEMENT, which a
   whole-file count never can (the R98 law, applied to ourselves). */
function bodyBetween(src: string, start: string, end: string): string {
  const s = src.indexOf(start);
  if (s < 0) return '';
  const rest = src.slice(s + start.length);
  const e = rest.indexOf(end);
  return e < 0 ? rest : rest.slice(0, e);
}

const nodeMove = bodyBetween(nodeDaemon, 'public moveToBin(', 'public restoreFromBin(');
const nodeRestore = bodyBetween(nodeDaemon, 'public restoreFromBin(', 'public purgeFromBin(');
const nodePurge = bodyBetween(nodeDaemon, 'public purgeFromBin(', 'public emptyBin(');

check(
  'R105: Node move-to-bin writes tombstones (both its success branches) — the deletion is recorded at the moment it happens',
  (nodeMove.match(/this\.writeTombstone\(realityId\);/g) ?? []).length === 2,
  `write calls inside moveToBin: ${(nodeMove.match(/this\.writeTombstone\(realityId\);/g) ?? []).length}, expected 2 (noop + real)`,
);

check(
  'R105: Node purge writes AND KEEPS tombstones (permanent death) — restore CLEARS them (the reality may live again)',
  (nodePurge.match(/this\.writeTombstone\(realityId\);/g) ?? []).length === 2 &&
    (nodeRestore.match(/this\.removeTombstone\(realityId\);/g) ?? []).length === 2,
  `purge writes: ${(nodePurge.match(/this\.writeTombstone\(realityId\);/g) ?? []).length} (need 2), restore clears: ${(nodeRestore.match(/this\.removeTombstone\(realityId\);/g) ?? []).length} (need 2)`,
);

const nodeEmpty = bodyBetween(nodeDaemon, 'public emptyBin(', '/* ------------------ R105 permanent-death tombstones');
const nodeStatus = bodyBetween(nodeDaemon, 'public getStatus(', 'export const realityDaemon');

check(
  'R105: Node empty-bin NEVER eats the ledger (dot-directories are not binned realities)',
  nodeEmpty.includes("!dirent.name.startsWith('.')"),
  'emptyBin lost its dot-directory filter — it would erase the .tombstones ledger as if it were a binned reality',
);

check(
  'R105: Node daemon-status bin listing skips dot-directories',
  nodeStatus.includes("!b.name.startsWith('.')"),
  'the daemon status lost its dot-directory filter',
);

check(
  'R105: Node exposes listTombstones and the bin route carries the tombstoned field',
  nodeDaemon.includes('public listTombstones(): string[]') &&
    nodeRoutes.includes('tombstoned: realityDaemon.listTombstones()'),
  'the bin list response lost the tombstoned field',
);

/* ------------------------------------------------------------------ *
 * 4. THE RUST TWIN — the same contract, byte-for-byte in spirit
 * ------------------------------------------------------------------ */

const rustNoopCount = (realitiesRs.match(/noop: true/g) ?? []).length;
check(
  'R105: the Rust bin verbs return the noop outcome (move + restore + purge = 3 branches)',
  rustNoopCount === 3,
  `found ${rustNoopCount}, expected 3 — one twin drifting is the R98 disease`,
);

const rustMove = bodyBetween(realitiesRs, 'pub fn move_to_bin(', 'pub fn restore_from_bin(');
const rustRestore = bodyBetween(realitiesRs, 'pub fn restore_from_bin(', 'pub fn purge_from_bin(');
const rustPurge = bodyBetween(realitiesRs, 'pub fn purge_from_bin(', 'pub fn empty_bin(');

check(
  'R105: Rust move-to-bin writes tombstones; purge writes AND KEEPS; restore clears (the Node lifecycle, mirrored)',
  (rustMove.match(/write_tombstone\(&reality_id\);/g) ?? []).length === 2 &&
    (rustPurge.match(/write_tombstone\(&reality_id\);/g) ?? []).length === 2 &&
    (rustRestore.match(/remove_tombstone\(&reality_id\);/g) ?? []).length === 2,
  `move writes: ${(rustMove.match(/write_tombstone\(&reality_id\);/g) ?? []).length} (need 2), ` +
    `purge writes: ${(rustPurge.match(/write_tombstone\(&reality_id\);/g) ?? []).length} (need 2), ` +
    `restore clears: ${(rustRestore.match(/remove_tombstone\(&reality_id\);/g) ?? []).length} (need 2)`,
);

const rustListBin = bodyBetween(realitiesRs, 'pub fn list_bin(', '/* ----------------------- R105 permanent-death tombstones');
const rustEmpty = bodyBetween(realitiesRs, 'pub fn empty_bin(', '/* -------------------------------- renaming');

check(
  'R105: Rust list_bin and empty_bin skip dot-directories (the ledger is system record, never a binned reality)',
  rustListBin.includes("starts_with('.')") && rustEmpty.includes("starts_with('.')"),
  'list_bin or empty_bin lost the dot-directory filter',
);

check(
  'R105: Rust exposes list_tombstones and lib.rs shapes it into the bin list',
  realitiesRs.includes('pub fn list_tombstones()') && libRs.includes('"tombstoned": tombstoned'),
  'the Tauri bin list response lost the tombstoned field',
);

check(
  'R105: lib.rs maps the noop outcome to a success response on all three verbs',
  (libRs.match(/"noop": true \}/g) ?? []).length === 3,
  `found ${(libRs.match(/"noop": true \}/g) ?? []).length}, expected 3 (move/restore/purge)`,
);

/* ------------------------------------------------------------------ *
 * THE VERDICT
 * ------------------------------------------------------------------ */

console.log('');
if (failures > 0) {
  console.log(`R105 VANISHED-MARBLE GAUNTLET — ${failures} FAILURE${failures === 1 ? '' : 'S'} — the dead are being mishandled`);
  process.exit(1);
}
console.log('R105 VANISHED-MARBLE GAUNTLET — ALL GREEN (deleted realities stay deleted, on screen and on disk)');
