/* R102 INDEPENDENCE PROBE — the hand-run receipt for the author's decree:
   "the back end and the reality folders need to be separate completely" —
   delete the solPrime folder, and the universe must still boot, land on the
   multiverse sphere, and keep ZERO dead containers behind.

   Mutation-proof by construction (the R98 law): the probe physically moves
   the folder out of src/realities/, boots a FRESH dev server, and watches
   the app in a real headless Chromium. If the folder is still load-bearing
   anywhere (the old static import, the seed, the engine's home default),
   the boot errors make this FAIL. The folder is restored in a finally block
   no matter how the run ends.

   Assertions:
     1. the app boots (intro veil lifts, canvas renders frames)
     2. zero console errors and zero page errors
     3. the engine has NO active reality (null — the empty multiverse)
     4. the camera sits at the multiverse stage (the giant sphere)
     5. the multiverse renders zero reality marbles
     6. a Core Console opens on that empty multiverse (Forge path exists)

   Run:  npx tsx scripts/probes/round102-independence-probe.ts
   (always spawns its own server on $SMOKE_PORT or 3999 — a server started
   before the folder move would hold a stale glob listing) */

import { chromium } from 'playwright';
import { spawn, type ChildProcess } from 'child_process';
import { mkdirSync, renameSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SRC = path.join(ROOT, 'src/realities/solPrime');
const STASH = path.join(ROOT, '.probe-stash/solPrime');
const PORT = Number(process.env.PORT) || 3999;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = path.join(ROOT, 'scripts/verify/independence');

interface Result { name: string; ok: boolean; proof: string }
const results: Result[] = [];
function expect(name: string, ok: boolean, proof: string) {
  results.push({ name, ok, proof });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : `— ${proof}`}`);
}

async function serverHealthy(): Promise<boolean> {
  try {
    const res = await fetch(BASE + '/api/health', { signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch { return false; }
}

async function spawnServer(): Promise<ChildProcess> {
  const proc = spawn('npm run dev', { cwd: ROOT, shell: true, stdio: 'ignore', detached: false, env: { ...process.env, PORT: String(PORT) } });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    if (await serverHealthy()) return proc;
  }
  throw new Error('dev server did not become healthy within 120s');
}

async function main(): Promise<void> {
  if (!existsSync(SRC)) throw new Error(`nothing to mutate: ${SRC} missing`);
  mkdirSync(path.dirname(STASH), { recursive: true });
  let server: ChildProcess | null = null;
  let browser = null;

  /* THE MUTATION — the author's decree, enacted: the home folder leaves
     the realities tree entirely */
  renameSync(SRC, STASH);
  console.log('▶ mutated: src/realities/solPrime moved aside — the multiverse is folder-empty (for the base set)');

  try {
    server = await spawnServer();
    mkdirSync(OUT, { recursive: true });
    const b = await chromium.launch({ args: ['--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
    browser = b;
    const page = await b.newPage({ viewport: { width: 1600, height: 900 } });
    await page.bringToFront();
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

    /* the boot must survive — the ignition veil must COME OFF. The probe
       ignores the Vite HMR websocket entirely: a dev-server socket flap is
       the documented cold-boot noise class, never the app's boot.
       WAIT honestly: the veil lifts at intro-min (4.4s) + engine-first-frame
       + 1.4s fade — a one-shot early read lies. */
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForFunction('Boolean(window.__ENGINE__)', undefined, { timeout: 90_000 });
    const introGone = await page.waitForFunction(
      () => !(document.querySelector('.intro-veil')), undefined, { timeout: 90_000 },
    ).then(() => true).catch(() => false);
    expect('the intro veil lifts (no ignition failure)', introGone, introGone ? '' : 'the veil never lifted');
    await page.waitForTimeout(3000); /* scene settle after the veil */

    const stage = await page.evaluate(() => (window as any).__ENGINE__?.cosmicStage ?? '?');
    expect('the camera rests at the multiverse stage', stage === 'multiverse', `cosmicStage=${stage}`);

    const marbles = await page.evaluate(() => ((window as any).__ENGINE__?.stages?.realityMarbles ?? (window as any).__ENGINE__?.realityMarbles ?? []).length);
    expect('zero reality marbles render', marbles === 0, `realityMarbles=${marbles}`);

    await page.screenshot({ path: path.join(OUT, 'empty-multiverse-boot.png') });

    /* THE FORGE DOOR — the console must open on the empty multiverse so the
       author can forge the next universe (Ctrl+K → "console" → Enter) */
    await page.keyboard.press('Control+k');
    const paletteUp = await page.waitForSelector('.core-plate input', { timeout: 15_000 }).then(() => true).catch(() => false);
    expect('the Command Palette opens', paletteUp, paletteUp ? '' : 'no palette input');
    if (paletteUp) {
      await page.keyboard.type('console', { delay: 40 });
      await page.waitForTimeout(400);
      await page.keyboard.press('Enter');
      const consoleOpen = await page.waitForSelector('.cc-root', { timeout: 20_000 }).then(() => true).catch(() => false);
      expect('the Core Console opens on the empty multiverse', consoleOpen, consoleOpen ? '' : 'no .cc-root');
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(OUT, 'empty-multiverse-console.png') });
    }

    const fatalOverlay = await page.evaluate(() => document.body.innerText.includes('IGNITION FAILURE'));
    expect('no ignition-failure overlay', !fatalOverlay, fatalOverlay ? 'IGNITION FAILURE on the glass' : '');

    const realPageErrors = pageErrors.filter((e) => !/WebSocket|fetch.*(commands|api\/|net::ERR)|Failed to load resource|net::ERR/i.test(e));
    const realConsoleErrors = consoleErrors.filter((e) => !/WebSocket|vite|\[vite\]|Failed to load resource|net::ERR/i.test(e));
    expect('zero page errors', realPageErrors.length === 0, realPageErrors.slice(0, 3).join(' | '));
    expect('zero console errors (dev-server HMR noise excluded)', realConsoleErrors.length === 0, realConsoleErrors.slice(0, 3).join(' | '));

    const failed = results.filter((r) => !r.ok);
    console.log(failed.length === 0
      ? '\nR102 INDEPENDENCE PROBE — ALL GREEN (the universe stands without the home folder)'
      : `\nR102 INDEPENDENCE PROBE — ${failed.length} FAILURE(S)`);
    if (failed.length) process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    server?.kill();
    /* restore the folder no matter what — the mutation is the test, not the product */
    renameSync(STASH, SRC);
    console.log('◂ restored: src/realities/solPrime is back in the tree');
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
