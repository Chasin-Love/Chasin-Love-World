/**
 * ROUND 98 — THE BACKEND CONFORMANCE gauntlet.
 *
 * The project runs ONE contract across TWO backends: the Node/Express dev
 * server (`server/`) and the Rust/Tauri desktop shell (`src-tauri/src/`).
 * Roughly 1,900 lines implement the same operations twice, and for most of the
 * project's life nothing compared them. That is not redundancy — it is two
 * gearboxes with no synchronizer, and the author's phrase for it was exactly
 * right: "two gearboxes have started disagreeing".
 *
 * The round-97 audit found drift in 8 of the 9 shared operations. This gauntlet
 * is the synchronizer. It pins the parts of the contract that must not diverge,
 * for the operations where a divergence is a defect rather than a design
 * choice, and RECORDS the ones where the two are honestly allowed to differ.
 *
 * A note on what "conformance" means here: the two backends do not have to be
 * byte-identical. They have to agree on every decision a user can observe —
 * what a folder name is allowed to be, what a rename touches, what an upload
 * is rejected for, which route maps to which command. Where they legitimately
 * differ (the desktop returns raw bytes because a webview has no HTTP route
 * into the realities tree), the pin asserts the DIFFERENCE, so it stays a
 * recorded decision instead of becoming drift by accident.
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

const nodePaths = read('server/paths.ts');
const nodeDaemon = read('server/realityDaemon.ts');
const nodeSkyStore = read('server/skyStore.ts');
const nodeSkyRoutes = read('server/routes/sky.ts');
const nodeSky = read('server/routes/sky.ts');
const adapter = read('src/platform/desktop/adapter.ts');
const libRs = read('src-tauri/src/lib.rs');
const realitiesRs = read('src-tauri/src/realities.rs');
const skyRs = read('src-tauri/src/sky.rs');

/* ------------------------------------------------------------------ *
 * 1. THE OPERATION SET — route ↔ command ↔ adapter arm
 * ------------------------------------------------------------------ */

/* Every /api/realities/* path the server registers on its router. Read from
 * the `r.get(...)` / `r.post(...)` declarations rather than from a bare string
 * scan, so a route is counted only where it is actually MOUNTED — a string
 * lying around in a comment is not a route. */
const routePattern = /r\.(get|post|use)\(\s*'(\/api\/realities\/[^']*)'/g;
const nodeRoutes = [...new Set(
  [...read('server/routes/realities.ts').matchAll(routePattern), ...read('server/routes/sky.ts').matchAll(routePattern)]
    .map((m) => m[2].split(':')[0]),   /* '/asset/:folder/assets/:file' → '/asset' */
)].sort();

/* Every arm of the adapter's route→command switch. The class allows slashes
 * beyond the first segment — the bin and sky arms are nested paths, and a
 * single-segment class silently drops 9 of the 15 arms. */
const adapterArms = [...new Set(
  [...adapter.matchAll(/case '(\/api\/realities\/[a-zA-Z0-9/_-]+)'/g)].map((m) => m[1]),
)].sort();

/* Every command registered with Tauri. */
const tauriCommands = new Set(
  (libRs.slice(libRs.indexOf('generate_handler!')).matchAll(/^\s{12}([a-z_]+),/gm) ?? []).map(() => null),
);
{
  const block = libRs.slice(libRs.indexOf('generate_handler!'));
  const end = block.indexOf('])');
  for (const m of block.slice(0, end).matchAll(/([a-z_]+)\s*,/g)) tauriCommands.add(m[1]);
}

/* The commands each adapter arm names must exist in the Tauri registry — an
 * arm pointing at a command that was renamed is a desktop-only 500 that no
 * browser test can ever catch. */
const armCommands = [...adapter.matchAll(/cmd:\s*'([a-z_]+)'/g)].map((m) => m[1]);
check('R98: the adapter names at least one command per route (the seam is populated)',
  armCommands.length >= nodeRoutes.length - 1,
  `${armCommands.length} command mappings for ${nodeRoutes.length} routes`);

const missingCommands = [...new Set(armCommands)].filter((c) => !tauriCommands.has(c));
check('R98: EVERY adapter command is registered with Tauri (no desktop-only 404)',
  missingCommands.length === 0, missingCommands.join(', '));

/* Every route must be reachable from the desktop, with ONE documented
 * exception: the sky asset route. On the web it is a GET on
 * `/sky/asset/:folder/assets/:file`; on the desktop the webview has no HTTP
 * route into the realities tree, so the adapter exposes it under a different,
 * explicit name that returns raw bytes. That difference is a DESIGN decision
 * and is pinned as such — it must not be "fixed" by silently renaming one side. */
const assetRoute = nodeRoutes.find((r) => r.includes('sky/asset'));
const assetArm = adapterArms.find((a) => a.includes('sky/asset'));
check('R98: the sky asset route has a desktop arm under an explicit, documented name',
  !!assetRoute && !!assetArm && assetArm.endsWith('sky/asset-bytes') &&
  /asset route returns RAW BYTES/.test(adapter),
  `node=${assetRoute ?? 'missing'} adapter=${assetArm ?? 'missing'} — the difference must stay named, not accidental`);
const unmapped = nodeRoutes.filter((r) => !r.includes('sky/asset') && !adapterArms.includes(r));
check('R98: no route silently loses its desktop twin (every non-asset route is mapped)',
  unmapped.length === 0, unmapped.join(', '));
/* ------------------------------------------------------------------ *
 * 2. FOLDER-NAME SANITISATION — the same rule on both sides
 * ------------------------------------------------------------------ */

/* Node: `raw.replace(/[^a-zA-Z0-9-_]/g, '')`, empty/./.. rejected.
   Rust: keep [A-Za-z0-9-_], empty/./.. rejected. These agree. The pin reads
   BOTH rules out of their sources rather than restating them, so a change on
   one side without the other turns the chain red. */
check('R98: Node sanitises folder names to [A-Za-z0-9-_] and rejects the empty segment',
  /replace\(\/\[\^a-zA-Z0-9-_\]\/g, ''\)/.test(nodePaths) &&
  /!segment \|\| segment === '\.' \|\| segment === '\.'\.toString\(\)|!segment \|\| segment === '\.' \|\| segment === '\.\.'/.test(nodePaths),
  'server/paths.ts sanitizeFolderName changed shape');
check('R98: Rust sanitises folder names to the SAME class ([A-Za-z0-9-_])',
  /is_ascii_alphanumeric\(\) \|\| \*c == '-' \|\| \*c == '_'/.test(realitiesRs),
  'sanitize_folder_name character class drifted from the Node rule');
check('R98: Rust rejects the empty segment and the dot forms, like Node',
  /segment\.is_empty\(\) \|\| segment == "\." \|\| segment == "\.\."/.test(realitiesRs),
  'sanitize_folder_name guard drifted from the Node rule');

/* ------------------------------------------------------------------ *
 * 3. RENAME — same derivation, same files touched, same containment
 * ------------------------------------------------------------------ */

/* Folder-name derivation. Node:
     cleanNew = newName.trim().replace(/[^a-zA-Z0-9]/g, '')
     newFolderName = cleanNew[0].toLowerCase() + cleanNew.slice(1)
   Rust: same filter, same lower-first-char. These agree and must stay so: the
   folder name is the on-disk identity, and a backend that derived a different
   one would move the world to a second address. */
check('R98: rename derives the folder name the same way on both sides (strip non-alphanumerics, lowercase the first char)',
  /newName\.trim\(\)\.replace\(\/\[\^a-zA-Z0-9\]\/g, ''\)/.test(nodeDaemon) &&
  /clean_new:\s*String\s*=\s*new_name\.chars\(\)\.filter\(\|c\| c\.is_ascii_alphanumeric\(\)\)/.test(realitiesRs) &&
  /charAt\(0\)\.toLowerCase\(\) \+ cleanNew\.slice\(1\)/.test(nodeDaemon) &&
  /let first = chars\.next\(\)\.unwrap\(\)\.to_lowercase\(\)\.next\(\)\.unwrap\(\)/.test(realitiesRs),
  'the two backends no longer derive the same on-disk folder name');

check('R98: both backends refuse an empty new name (the delete-the-tree guard)',
  /New name contains no valid characters/.test(nodeDaemon) &&
  /New name contains no valid characters/.test(realitiesRs),
  'the empty-name guard must exist on BOTH sides');
/* R102 — THE INDEPENDENT-REALITIES DECREE supersedes the R98 rename shield:
   no reality is protected on the backend, sol-prime included. This check
   proves the removal by MUTATION-TEST SPIRIT: if any sol-prime refusal ever
   returns to either rename path, this fails. (The WRITE-DATA read-only
   seed-mirror guard at routes/realities.ts + realities.rs stays — it
   protects the committed data.json mirror, not the deletion law.) */
check('R102: neither backend single-cases sol-prime in rename or move-to-bin (the decree)',
  !/realityId === 'sol-prime'\) \{\s*return \{ success: false/.test(nodeDaemon) &&
  !/reality_id == "sol-prime"/.test(realitiesRs) &&
  !/Sol Prime is the primordial anchor/.test(nodeDaemon) &&
  !/Sol Prime is the primordial anchor/.test(realitiesRs),
  'a sol-prime special case reappeared in rename/move-to-bin — R102 forbids it');

/* THE FILE SET. This is the drift that bit hardest: Node patches the display
 * name in BOTH index.ts and surface.ts; Rust patched only index.ts. A renamed
 * world therefore kept its old name in surface.ts on the desktop. */
const nodeRenameFiles = /for \(const file of \[([^\]]+)\]\)/.exec(nodeDaemon.slice(nodeDaemon.indexOf('RENAME_FOLDER') - 3000));
const nodePatchSet = nodeRenameFiles?.[1] ?? '';
const rustPatchLoop = /for file in \[([^\]]+)\]/.exec(realitiesRs);
const rustPatchSet = rustPatchLoop?.[1] ?? '';
check('R98: rename patches the SAME module files on both backends (index.ts AND surface.ts)',
  /index\.ts/.test(nodePatchSet) && /surface\.ts/.test(nodePatchSet) &&
  /index\.ts/.test(rustPatchSet) && /surface\.ts/.test(rustPatchSet),
  `Node patches [${nodePatchSet}] but Rust patches [${rustPatchSet || 'nothing'}] — the file sets differ`);

/* Both backends must refuse a path that escapes the realities tree, and the
 * check must come BEFORE the destructive remove/rename. */
check('R98: both backends verify containment before the destructive rename',
  /!isInside\(this\.realitiesDir, oldPath\) \|\| !isInside\(this\.realitiesDir, newPath\)/.test(nodeDaemon) &&
  /!is_inside\(&dir, &src\) \|\| !is_inside\(&dir, &dst\)/.test(realitiesRs),
  'the containment guard is missing on one side');
const nodeGuardBeforeDelete = nodeDaemon.indexOf('isInside(this.realitiesDir, oldPath)') < nodeDaemon.indexOf('fs.rmSync(newPath');
const rustGuardBeforeDelete = realitiesRs.slice(realitiesRs.indexOf('pub fn rename_folder')).indexOf('is_inside(&dir, &src)') <
  realitiesRs.slice(realitiesRs.indexOf('pub fn rename_folder')).indexOf('fs::remove_dir_all(&dst)');
check('R98: the containment guard runs BEFORE the delete-and-rename on both sides',
  nodeGuardBeforeDelete && rustGuardBeforeDelete,
  `node=${nodeGuardBeforeDelete} rust=${rustGuardBeforeDelete} — the guard must not come after the delete`);

/* ------------------------------------------------------------------ *
 * 4. THE BIN — every destructive bin operation is contained on both sides
 * ------------------------------------------------------------------ */

/* Node guards move-to-bin, restore, purge and empty. Rust must guard each of
 * its equivalents. Per OPERATION, not in aggregate: "Rust has 6 is_inside
 * calls" is not the claim — "Rust's purge is guarded" and "Rust's restore is
 * guarded" are, because a guard in the wrong function is the exact bug the
 * aggregate count would hide.
 *
 * "Guarded" means: inside this function's own body, and BEFORE the first
 * destructive filesystem call. A guard that appears after the rm is not a
 * guard. */
function bodyOf(src: string, startRe: RegExp, untilRe: RegExp): string {
  const start = src.search(startRe);
  if (start < 0) return '';
  const tail = src.slice(start);
  const end = tail.slice(1).search(untilRe);
  return end < 0 ? tail : tail.slice(0, end + 1);
}
/* The Node daemon and the Rust module use DIFFERENT names for the same three
 * operations (restoreFromBin / restore_from_bin), which is exactly why an
 * automated comparison needs the mapping stated rather than guessed. */
const binOps: Array<[string, string]> = [
  ['move_to_bin', 'moveToBin'],
  ['restore_from_bin', 'restoreFromBin'],
  ['purge_from_bin', 'purgeFromBin'],
  ['empty_bin', 'emptyBin'],
];
for (const [rsName, nodeName] of binOps) {
  const nodeBody = bodyOf(nodeDaemon, new RegExp(`public ${nodeName}\\b`), /^\s{2}(public|private) /m);
  const rsBody = bodyOf(realitiesRs, new RegExp(`pub fn ${rsName}\\b`), /^\}/m);
  check(`R98: bin ${rsName} exists on BOTH backends`,
    nodeBody.length > 0 && rsBody.length > 0,
    `node=${nodeBody.length > 0} rust=${rsBody.length > 0} — an operation present on one side only`);
  /* Only genuinely DESTRUCTIVE calls count. A readdir/read_dir that precedes
     the guard is how both backends locate the folder they are about to touch,
     and treating a directory listing as destructive would fail a correct
     implementation — the guard is about the rm/rename, not the lookup. */
  const nodeDestructive = nodeBody.search(/fs\.(renameSync|rmSync|unlinkSync)\b/);
  const rsDestructive = rsBody.search(/fs::(rename|remove_dir_all|remove_file)\b/);
  const nodeGuard = nodeBody.search(/isInside\(/);
  const rsGuard = rsBody.search(/is_inside\(/);
  check(`R98: bin ${rsName} is containment-guarded on BOTH backends`,
    nodeGuard >= 0 && rsGuard >= 0,
    `node guard=${nodeGuard >= 0} rust guard=${rsGuard >= 0}`);
  check(`R98: bin ${rsName} checks containment BEFORE its destructive call on both sides`,
    nodeGuard >= 0 && nodeDestructive >= 0 && nodeGuard < nodeDestructive &&
    rsGuard >= 0 && rsDestructive >= 0 && rsGuard < rsDestructive,
    `node guard@${nodeGuard} destructive@${nodeDestructive} · rust guard@${rsGuard} destructive@${rsDestructive}`);
}

/* ------------------------------------------------------------------ *
 * 5. SKY STUDIO — same caps, same whitelist class
 * ------------------------------------------------------------------ */

/* Caps. These are user-visible limits and they MUST agree: a world that
 * accepts a 6th photo on the web and refuses it on the desktop is a bug
 * report waiting to happen. */
const nodeMaxBytes = /MAX_PHOTO_BYTES\s*=\s*(\d+)\s*\*\s*1024\s*\*\s*1024/.exec(nodeSkyStore)?.[1];
const rsMaxBytes = /MAX_PHOTO_BYTES:\s*usize\s*=\s*(\d+)\s*\*\s*1024\s*\*\s*1024/.exec(skyRs)?.[1];
check('R98: Sky Studio photo size cap agrees across backends (6 MB)',
  nodeMaxBytes === '6' && rsMaxBytes === '6', `node=${nodeMaxBytes}MB rust=${rsMaxBytes}MB`);
const nodeMaxPhotos = /MAX_PHOTOS\s*=\s*(\d+)/.exec(nodeSkyStore)?.[1];
const rsMaxPhotos = /MAX_PHOTOS:\s*usize\s*=\s*(\d+)/.exec(skyRs)?.[1];
check('R98: Sky Studio photo count cap agrees across backends (8)',
  nodeMaxPhotos === '8' && rsMaxPhotos === '8', `node=${nodeMaxPhotos} rust=${rsMaxPhotos}`);

/* The accepted MIME set — the extension each MIME is STORED as. Node maps
 * image/jpeg → jpg; Rust must store the same extension or the two backends
 * write different filenames for the same upload. */
for (const mime of ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']) {
  const nodeHas = new RegExp(`["']${mime.replace('/', '\\/')}["']\\s*:\\s*["'](\\w+)["']`).test(nodeSkyStore) ||
    new RegExp(`["']${mime.replace('/', '\\/')}["']`).test(nodeSkyStore);
  const rsHas = new RegExp(`\\("${mime.replace('/', '\\/')}",\\s*"(\\w+)"\\)`).test(skyRs);
  check(`R98: Sky Studio accepts ${mime} on BOTH backends`, nodeHas && rsHas, `node=${nodeHas} rust=${rsHas}`);
}

/* The asset-name whitelist. Both backends refuse anything that is not
 * `sky-<id>.<ext>`, and both then re-check containment before reading. The
 * CHARACTER CLASSES must be the same class of strictness — this is the check
 * that caught the Rust list missing `.jpeg` while its own MIME_BY_EXT table
 * listed it, and accepting the empty-id name `sky-.png` that Node rejects. */
/* The Rust side was rewritten in R98 from fixed-offset byte slicing to a
 * string form (strip_prefix + rfind) because the byte form silently rejected
 * every 5-character extension. These checks pin the NEW shape: prefix by
 * strip_prefix, extension by searching for the dot, stem by an explicit
 * emptiness test. A check that greps for the old byte idiom would go stale
 * the moment someone improved the code, which is the exact failure the
 * backend gauntlet exists to catch. */
check('R98: the asset whitelist is present on both backends and both re-check containment',
  /\^sky-\[a-z0-9-\]\+\\\./.test(nodeSky) && /strip_prefix\("sky-"\)/.test(skyRs) &&
  /isInside\(dir, assetPath\)/.test(nodeSky) && /is_inside\(&dir, &path\)/.test(skyRs),
  'the whitelist or the containment re-check is missing on one side');

const rsWhitelistExts = [...skyRs.matchAll(/matches!\(ext,\s*([^)]+)\)/g)]
  .flatMap((m) => [...m[1].matchAll(/"(\w+)"/g)].map((e) => e[1]));
/* The extensions the old byte window rejected outright. */
const fiveCharExts = ['jpeg', 'webp', 'avif'];
check('R98: the Rust asset whitelist REJECTS an empty id (sky-.png), which the Node whitelist rejects',
  /!stem\.is_empty\(\)/.test(skyRs) && /\[a-z0-9-\]\+/.test(nodeSky),
  'Rust accepts `sky-.png`: the stem check must be an explicit emptiness test, not all() over an empty range');
check('R98: the Rust whitelist finds the extension by SEARCHING for the dot, not by fixed-offset slicing',
  /rfind\('\.'\)/.test(skyRs) && !/b\[b\.len\(\) - 4\.\./.test(skyRs),
  'a fixed-offset slice silently rejects every 5-character extension (.jpeg/.webp/.avif)');
for (const ext of fiveCharExts) {
  check(`R98: the Rust asset whitelist accepts .${ext}, which the Node whitelist accepts`,
    rsWhitelistExts.includes(ext), `Rust whitelist extensions: ${rsWhitelistExts.join(', ') || 'none'}`);
}

/* ------------------------------------------------------------------ *
 * 6. RECORDED DIVERGENCES — allowed, but pinned so they stay decisions
 * ------------------------------------------------------------------ */

/* The desktop has no HTTP layer for asset bytes, so `sky_asset` returns raw
 * bytes while the Node route streams a file with ETag/Cache-Control. This is a
 * documented platform difference, not drift — the pin exists so a future edit
 * does not "align" them by accident and break the webview path. */
check('R98: (recorded) the desktop serves sky asset bytes RAW, the web streams them over HTTP — a platform difference',
  /The asset route returns RAW BYTES/.test(adapter) && /res\.sendFile\(assetPath\)/.test(nodeSky) &&
  /Raw bytes of one sky asset/.test(skyRs),
  'if this changed, re-read the pin — the two serve the same asset two different ways ON PURPOSE');

console.log(failures === 0
  ? '\nR98 BACKEND CONFORMANCE — ALL GREEN'
  : `\nR98 BACKEND CONFORMANCE — ${failures} FAILURE${failures > 1 ? 'S' : ''}`);
process.exit(failures === 0 ? 0 : 1);
