/* R52 ARCHITECTURE AUDITOR — the structural source of truth for the reorganization.
   Run:        npx tsx scripts/audit-architecture.ts
   Snapshot:   npx tsx scripts/audit-architecture.ts --snapshot
   Regression: npx tsx scripts/audit-architecture.ts --check   (exit 1 on drift)

   Emits (stdout report + JSON snapshot):
   1. dead-value exports        — delete vs de-export, decided by internal usage
   2. dead type exports         — zero inbound name references (review before removal)
   3. dead CSS classes          — selectors defined in src/index.css never used in code
   4. importer counts           — inbound module graph (incl. import.meta.glob edges)
   5. path-encode inventory     — every site hardcoding a structural path: the
                                  realities lock, generated-code imports, native
                                  build path, gauntlet readFileSync targets, route
                                  strings, public roots
   6. localStorage keys + window seams
   7. LOC leaders

   Phases re-run --check after every structural change; intentional drift is
   absorbed by refreshing the snapshot (--snapshot) in the same commit. */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const rel = (abs: string) => path.relative(ROOT, abs).replace(/\\/g, '/');

/* ---------- file collection ---------- */
const CODE_DIRS = ['src', 'server', 'scripts'];
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'bin', 'target', '__pycache__']);
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.mjs']);

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const abs = path.join(dir, entry);
    const st = statSync(abs);
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      walk(abs, out);
    } else if (CODE_EXT.has(path.extname(entry))) {
      out.push(abs);
    }
  }
}

const codeFiles: string[] = [];
for (const dir of CODE_DIRS) walk(path.join(ROOT, dir), codeFiles);
codeFiles.sort();

/* extra structural files that are scanned for path encodings but not code-parsed */
const STRUCTURE_FILES = [
  'vite.config.js', 'tsconfig.json', 'index.html', 'package.json', 'note.txt',
  'src-tauri/build.rs', 'src-tauri/tauri.conf.json', 'src-tauri/src/lib.rs',
  'src-tauri/src/realities.rs', 'src-tauri/src/store.rs',
  'public/fonts/fonts.css',
].map((p) => path.join(ROOT, p)).filter((p) => existsSync(p));

const read = (abs: string): string => { try { return readFileSync(abs, 'utf8'); } catch { return ''; } };
const allText = new Map<string, string>(); // relPath → content (code + structure files)
for (const f of [...codeFiles, ...STRUCTURE_FILES]) allText.set(rel(f), read(f));

/* ---------- 1. import graph (inbound counts) ---------- */
const IMPORT_RE = /(?:import|export)\s+(?:type\s+)?[^'"()]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|^\s*import\s+['"]([^'"]+)['"]/gm;

function resolveSpec(fromFile: string, spec: string): string | null {
  if (!spec.startsWith('.')) return null; // package import
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [
    base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.mjs`,
    path.join(base, 'index.ts'), path.join(base, 'index.tsx'),
  ];
  for (const c of candidates) if (codeFiles.includes(c)) return c;
  return null;
}

const inbound = new Map<string, Set<string>>(); // file → importers
const addEdge = (from: string, to: string) => {
  if (from === to) return;
  if (!inbound.has(to)) inbound.set(to, new Set());
  inbound.get(to)!.add(from);
};

for (const [relPath, text] of allText) {
  if (!codeFiles.includes(path.join(ROOT, relPath))) continue;
  const absFile = path.join(ROOT, relPath);
  for (const m of text.matchAll(IMPORT_RE)) {
    const spec = m[1] ?? m[2] ?? m[3];
    if (!spec) continue;
    const target = resolveSpec(absFile, spec);
    if (target) addEdge(relPath, rel(target));
  }
  /* import.meta.glob('./x/index.ts') — expand one-star index patterns (realities loader) */
  for (const g of text.matchAll(/import\.meta\.glob\(\s*['"]([^'"]+)['"]/g)) {
    const pattern = g[1];
    const star = pattern.match(/^\.(\/[^'"]*\/)?\*\/(index\.tsx?)$/);
    if (!star) continue;
    const baseDir = path.resolve(path.dirname(absFile), star[1] ?? './');
    for (const entry of readdirSync(baseDir)) {
      const idx = path.join(baseDir, entry, star[2]);
      if (existsSync(idx)) addEdge(relPath, rel(idx));
    }
  }
}

/* ---------- 2. exports + deadness ---------- */
interface DeadExport { symbol: string; file: string; action: 'delete' | 'de-export' }
interface DeadType { name: string; file: string }

const deadExports: DeadExport[] = [];
const deadTypes: DeadType[] = [];

for (const [relPath, text] of allText) {
  const absFile = path.join(ROOT, relPath);
  if (!codeFiles.includes(absFile)) continue;
  if (relPath.endsWith('/index.ts') && relPath.startsWith('src/realities/')) continue; // glob entries (default export)
  if (relPath === 'src/main.tsx' || relPath === 'server/index.ts') continue;          // entry points

  const names: Array<{ name: string; kind: 'value' | 'type' }> = [];
  /* `(?!\{)` — skip codegen template text like `export const ${varNameOf(...)}`,
     where the interpolated `$` would otherwise be captured as the name */
  for (const m of text.matchAll(/export\s+(?:async\s+)?(?:const|let|var|function\s*\*?|class)\s+([A-Za-z_$][\w$]*)(?!\{)/g)) names.push({ name: m[1], kind: 'value' });
  for (const m of text.matchAll(/export\s+(?:type|interface|enum)\s+([A-Za-z_$][\w$]*)(?!\{)/g)) names.push({ name: m[1], kind: 'type' });
  for (const m of text.matchAll(/export\s*\{([^}]*)\}(?!\s*from)/g)) {
    for (const part of m[1].split(',')) {
      const nm = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (nm && /^[A-Za-z_$][\w$]*$/.test(nm)) names.push({ name: nm, kind: 'value' });
    }
  }
  /* export * barrels: their star-re-exports are not definitions here — skip their file from
     value analysis only if the file is a pure barrel; named exports in it still analyzed */
  const isPureBarrel = /^\s*export\s+\*\s+from/m.test(text) && names.length === 0;
  if (isPureBarrel) continue;

  const seen = new Set<string>();
  for (const { name, kind } of names) {
    if (seen.has(name)) continue;
    seen.add(name);
    const word = new RegExp(`\\b${name.replace(/\$/g, '\\$')}\\b`);
    let external = false;
    for (const [other, otherText] of allText) {
      if (other === relPath) continue;
      if (word.test(otherText)) { external = true; break; }
    }
    if (external) continue;
    if (kind === 'type') { deadTypes.push({ name, file: relPath }); continue; }
    /* internal use beyond the export declaration? (count ALL occurrences —
       a non-global match would always report 1) */
    const uses = (text.match(new RegExp(word.source, 'g')) ?? []).length;
    deadExports.push({ symbol: name, file: relPath, action: uses > 1 ? 'de-export' : 'delete' });
  }
}

/* ---------- 3. dead CSS classes (src/index.css) ---------- */
const cssPath = path.join(ROOT, 'src/index.css');
const deadCss: string[] = [];
if (existsSync(cssPath)) {
  const css = read(cssPath).replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors = new Set<string>();
  let depth = 0, buf = '';
  for (const ch of css) {
    if (ch === '{') { if (depth === 0) { for (const m of buf.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) selectors.add(m[1]); } depth++; buf = ''; }
    else if (ch === '}') { depth--; buf = ''; }
    else if (depth === 0) buf += ch;
  }
  const codeText = [...allText.entries()]
    .filter(([p]) => /\.(tsx?|html)$/.test(p) && p !== 'src/index.css')
    .map(([, t]) => t).join('\n');
  for (const cls of selectors) {
    const word = new RegExp(`(?<![\\w-])${cls}(?![\\w-])`);
    if (!word.test(codeText)) deadCss.push(cls);
  }
  deadCss.sort();
}

/* ---------- 4. path-encode inventory ---------- */
interface EncodeGroup { name: string; files?: string[]; scanAll?: boolean; pattern: RegExp }
const ENCODE_GROUPS: EncodeGroup[] = [
  { name: 'realities-path lock', pattern: /src\/realities|src'\s*,\s*'realities|'\.\.\/src\/realities|realities\\?\*\*/g,
    files: ['vite.config.js', 'tsconfig.json', 'server/index.ts', 'server/realityDaemon.ts', 'server/skyStore.ts', 'src-tauri/src/realities.rs', 'src/realities/index.ts', 'note.txt'] },
  { name: 'generated-code imports', pattern: /'\.\.\/types'|'\.\.\/\.\.\/engine\/surface\/types'/g,
    files: ['server/realityTemplates.ts', 'src-tauri/src/realities.rs'] },
  { name: 'disk surface.ts imports', pattern: /^import\s[^'"]*?from\s+['"][^'"]+['"]/gm, files: [] }, // filled below
  { name: 'native build path', pattern: /src\/native|wasm\/cosmos_engine/g,
    files: ['src-tauri/build.rs', 'src/native/cpp_bridge.ts', 'scripts/build-wasm.sh'] },
  { name: 'gauntlet readFileSync targets', pattern: /readFileSync\(new URL\('([^']+)'/g, files: ['scripts/round17-gauntlet.ts'] },
  { name: 'public roots', pattern: /\/fonts\/|\/pyodide\//g, files: ['index.html', 'src/backend/executors/index.ts'] },
  { name: 'route↔command strings', pattern: /\/api\/realities[\w/-]*/g, scanAll: true },
  { name: 'localStorage keys', pattern: /['"](my-universe:[\w:-]+|eventide:[\w-]+)['"]/g, scanAll: true },
  { name: 'window seams', pattern: /window\.__[A-Z_][\w]*/g, scanAll: true },
];

const pathEncode: Record<string, string[]> = {};
for (const group of ENCODE_GROUPS) {
  const hits: string[] = [];
  const targets = group.scanAll ? [...allText.keys()] : (group.files ?? []).filter((f) => allText.has(f));
  if (group.name === 'disk surface.ts imports') {
    for (const [p, t] of allText) {
      if (!/^src\/realities\/[^/]+\/surface\.ts$/.test(p)) continue;
      for (const m of t.split('\n').entries()) {
        if (/^import\s/.test(m[1])) hits.push(`${p}:${m[0] + 1} — ${m[1].trim()}`);
      }
    }
  } else {
    for (const p of targets) {
      const text = allText.get(p) ?? '';
      for (const line of text.split('\n').entries()) {
        group.pattern.lastIndex = 0;
        if (group.pattern.test(line[1])) hits.push(`${p}:${line[0] + 1}`);
      }
    }
  }
  pathEncode[group.name] = hits;
}

/* ---------- 5. LOC leaders ---------- */
const loc: Record<string, number> = {};
for (const [p, t] of allText) if (codeFiles.includes(path.join(ROOT, p))) loc[p] = t.split('\n').length;
const locLeaders = Object.entries(loc).sort((a, b) => b[1] - a[1]).slice(0, 15);

/* ---------- report + snapshot + check ---------- */
const snapshot = {
  generatedAt: new Date().toISOString(),
  fileCount: codeFiles.length,
  deadExports, deadTypes, deadCss,
  importers: Object.fromEntries([...inbound.entries()].map(([k, v]) => [k, v.size]).sort()),
  loc, locLeaders, pathEncode,
};

const lines: string[] = [];
lines.push(`ARCHITECTURE AUDIT — ${snapshot.generatedAt} — ${codeFiles.length} code files`);
lines.push(`\n== 1. dead value exports (${deadExports.length}) — action per internal usage ==`);
for (const d of deadExports) lines.push(`  [${d.action}] ${d.symbol}  (${d.file})`);
lines.push(`\n== 2. dead type exports (${deadTypes.length}) — review before removal ==`);
for (const d of deadTypes) lines.push(`  ${d.name}  (${d.file})`);
lines.push(`\n== 3. dead CSS classes (${deadCss.length}) in src/index.css ==`);
lines.push(deadCss.length ? '  ' + deadCss.join(', ') : '  (none)');
lines.push(`\n== 4. most-imported files (top 15) ==`);
for (const [f, n] of Object.entries(snapshot.importers).sort((a, b) => b[1] - a[1]).slice(0, 15)) lines.push(`  ${String(n).padStart(3)} ← ${f}`);
lines.push(`\n== 5. path-encode inventory (the locks — must stay conscious) ==`);
for (const [g, hits] of Object.entries(pathEncode)) lines.push(`  ${g}: ${hits.length} site(s)${hits.length ? '\n' + hits.map((h) => `    ${h}`).join('\n') : ''}`);
lines.push(`\n== 6. LOC leaders ==`);
for (const [f, n] of locLeaders) lines.push(`  ${String(n).padStart(6)}  ${f}`);
const report = lines.join('\n');
console.log(report);

const args = process.argv.slice(2);
const snapPath = path.join(ROOT, 'scripts/architecture-snapshot.json');
if (args.includes('--snapshot')) {
  writeFileSync(snapPath, JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`\nsnapshot written → scripts/architecture-snapshot.json`);
} else if (args.includes('--check')) {
  if (!existsSync(snapPath)) { console.error('\nno snapshot to check against — run with --snapshot first'); process.exit(2); }
  const prev = JSON.parse(readFileSync(snapPath, 'utf8'));
  const drift: string[] = [];
  const setOf = (arr: Array<{ symbol?: string; name?: string; file: string }>) =>
    new Set(arr.map((x) => `${(x.symbol ?? x.name)}@${x.file}`));
  const diffSets = (label: string, a: Set<string>, b: Set<string>) => {
    for (const x of a) if (!b.has(x)) drift.push(`${label} removed: ${x}`);
    for (const x of b) if (!a.has(x)) drift.push(`${label} appeared: ${x}`);
  };
  diffSets('deadExport', setOf(prev.deadExports ?? []), setOf(snapshot.deadExports));
  diffSets('deadType', setOf(prev.deadTypes ?? []), setOf(snapshot.deadTypes));
  diffSets('deadCss', new Set(prev.deadCss ?? []), new Set(snapshot.deadCss));
  for (const g of Object.keys(snapshot.pathEncode)) {
    diffSets(`pathEncode/${g}`, new Set(prev.pathEncode?.[g] ?? []), new Set(snapshot.pathEncode[g]));
  }
  for (const [f, n] of Object.entries(snapshot.importers)) {
    const was = (prev.importers ?? {})[f];
    if (was !== undefined && was !== n) drift.push(`importer count changed: ${f} ${was} → ${n}`);
  }
  if (drift.length) { console.error(`\n● AUDIT DRIFT (${drift.length}):\n` + drift.map((d) => `  ${d}`).join('\n')); process.exit(1); }
  console.log('\n● AUDIT CHECK CLEAN — no structural drift');
}
