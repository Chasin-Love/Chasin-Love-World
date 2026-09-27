/* Builds the Tauri updater manifest (latest.json) from the release job's
   collected assets. Every installed MY UNIVERSE polls
   .../releases/latest/download/latest.json to discover updates.

   Usage: node scripts/make-latest-json.mjs <assets-dir> <tag-with-v>

   - App version comes from src-tauri/tauri.conf.json (single source of truth).
   - A platform entry is emitted only when BOTH the installer and its .sig
     signature exist (windows-x86_64 → NSIS setup.exe, linux-x86_64 → AppImage).
   - Zero installers at all  → exit 1 (the release itself is broken).
   - Installers but no sigs  → valid build, unsigned: no manifest written,
     the updater stays dormant until the signing secret exists. */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';

const [assetsDir, tag] = process.argv.slice(2);
if (!assetsDir || !tag) {
  console.error('usage: node scripts/make-latest-json.mjs <assets-dir> <tag-with-v>');
  process.exit(1);
}

const ROOT = path.resolve(process.cwd(), 'src-tauri');
const { version } = JSON.parse(readFileSync(path.join(ROOT, 'tauri.conf.json'), 'utf8'));
const repo = process.env.GITHUB_REPOSITORY || 'Chasin-Love/test-version-of-Chasin-Loove-World-';
const base = `https://github.com/${repo}/releases/download/${tag}`;

/* artifacts land at varying depths under assetsDir (v4 artifact structure) */
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : [p];
});
const files = walk(assetsDir).map((p) => path.resolve(p));
const find = (suffix) => files.find((f) => f.endsWith(suffix));

const platforms = {};

const exe = find('_x64-setup.exe') || find('.exe');
if (exe) {
  const sig = `${exe}.sig`;
  if (existsSync(sig)) {
    platforms['windows-x86_64'] = {
      signature: readFileSync(sig, 'utf8').trim(),
      url: `${base}/${path.basename(exe)}`,
    };
  }
}

const appimage = find('.AppImage');
if (appimage) {
  const sig = `${appimage}.sig`;
  if (existsSync(sig)) {
    platforms['linux-x86_64'] = {
      signature: readFileSync(sig, 'utf8').trim(),
      url: `${base}/${path.basename(appimage)}`,
    };
  }
}

if (!exe && !appimage) {
  console.error('make-latest-json: NO installers found in', assetsDir, '— the release is broken, failing.');
  process.exit(1);
}

const signed = Object.keys(platforms);
if (signed.length === 0) {
  console.warn('make-latest-json: installers present but UNSIGNED (.sig missing) — no latest.json; updater stays dormant.');
  process.exit(0);
}

const manifest = {
  version,
  notes: `MY UNIVERSE ${version} — attention is gravity.`,
  pub_date: new Date().toISOString(),
  platforms,
};

const out = path.join(assetsDir, 'latest.json');
writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n');
console.log(`make-latest-json: wrote latest.json for v${version} (platforms: ${signed.join(', ')})`);
