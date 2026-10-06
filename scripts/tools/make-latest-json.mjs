/* THE UPDATER MANIFEST BUILDER — REBORN in R104 alongside the desktop shell.
   Every installed MY UNIVERSE polls
   .../releases/latest/download/latest.json to discover updates; this tool
   writes that manifest from the release job's collected artifacts.

   Usage: node scripts/tools/make-latest-json.mjs <assets-dir> <tag-with-v>

   The contract, in four rules:
   1. The version comes from src-tauri/tauri.conf.json — one source of truth,
      never duplicated here.
   2. A platform entry exists only when BOTH the installer and its .sig
      signature are present (windows-x86_64 → NSIS setup.exe, linux-x86_64 →
      AppImage). A signature-less entry would be an updater that downloads a
      file it cannot verify.
   3. Zero installers anywhere → exit 1: the release itself is broken and the
      publish must not go on pretending.
   4. Installers but no signatures → exit 0 with NO manifest: a valid but
      unsigned build; the updater stays dormant until the signing secret
      exists on the repository. */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import path from 'path';

/* The GitHub release normalizes asset names (spaces → dots): the bundle on
   disk is "MY UNIVERSE_16.1.0_x64-setup.exe" but the STORED asset is
   "MY.UNIVERSE_16.1.0_x64-setup.exe". The manifest URL must name the stored
   asset, or the updater's download 404s. */
const storedName = (p, base) => `${base}/${path.basename(p).replace(/\s/g, '.')}`;

/* Artifacts land at varying depths under the assets dir (upload-artifact v4
   preserves each build's directory structure) — walk everything. */
function collectFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? collectFiles(p) : [path.resolve(p)];
  });
}

function collectPlatforms(files, baseUrl) {
  const platforms = {};
  const bySuffix = (suffix) => files.find((f) => f.endsWith(suffix));

  const exe = bySuffix('_x64-setup.exe') || bySuffix('.exe');
  if (exe && existsSync(`${exe}.sig`)) {
    platforms['windows-x86_64'] = {
      signature: readFileSync(`${exe}.sig`, 'utf8').trim(),
      url: storedName(exe, baseUrl),
    };
  }

  const appimage = bySuffix('.AppImage');
  if (appimage && existsSync(`${appimage}.sig`)) {
    platforms['linux-x86_64'] = {
      signature: readFileSync(`${appimage}.sig`, 'utf8').trim(),
      url: storedName(appimage, baseUrl),
    };
  }
  return { platforms, hasInstaller: Boolean(exe || appimage) };
}

function main() {
  const [assetsDir, tag] = process.argv.slice(2);
  if (!assetsDir || !tag) {
    console.error('usage: node scripts/tools/make-latest-json.mjs <assets-dir> <tag-with-v>');
    process.exit(1);
  }

  const { version } = JSON.parse(
    readFileSync(path.resolve('src-tauri', 'tauri.conf.json'), 'utf8'),
  );
  const repo = process.env.GITHUB_REPOSITORY || 'Chasin-Love/test-version-of-Chasin-Loove-World-';
  const baseUrl = `https://github.com/${repo}/releases/download/${tag}`;

  const files = collectFiles(assetsDir);
  const { platforms, hasInstaller } = collectPlatforms(files, baseUrl);

  if (!hasInstaller) {
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
}

main();
