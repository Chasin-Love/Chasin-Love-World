/* R105 VANISHED-MARBLE PROBE — the hand-run receipt for the author's
   complaint: "even after I delete them I can see the reflection in the
   multiverse". R105 found the mechanism: the App's EXISTENCE SYNC effect —
   the ONLY runtime rebuild of the multiverse scene — carried a
   skipFirstRebuild guard that the engine's async arrival never consumed at
   boot, so the FIRST real change of every session (typically the first
   delete) stole the guard and returned WITHOUT rebuilding, leaving the
   deleted reality's glass marble rendering forever.

   This probe deletes the home reality through the REAL UI (Core Console →
   Realities Grid → Collapse → Confirm Erase) in a real headless Chromium on
   a fresh dev server, and watches the scene sample-by-sample:

     1. boot sanity: the multiverse holds exactly the home reality's marble
     2. a document token (window.__probeToken) is planted before the click —
        any Vite full-reload (the dev folder move triggers one) creates a
        fresh document WITHOUT it, so a same-token sample is proof the
        vanish happened on the SAME engine instance, not via a reboot
     3. THE RECEIPT: after the delete click, a sample shows — on the same
        document — zero reality groups, zero marbles, zero colliders for the
        deleted id, and the traveler surfaced at the multiverse stage
     4. the disk side is honest: the folder reached the Quantum Bin and the
        R105 permanent-death tombstone was written (bin/.tombstones/
        sol-prime.tombstone)
     5. zero page/console errors (dev HMR noise excluded)

   Restore happens no matter how the run ends: the folder returns from the
   bin and the tombstone is erased.

   Run:  npx tsx scripts/probes/round105-vanished-marble-probe.ts
   (always spawns its own server on $PORT or 3997) */

import { chromium } from 'playwright';
import { spawn, type ChildProcess } from 'child_process';
import { mkdirSync, existsSync, rmSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { terminateProcessTree } from '../tools/process-tree';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SRC_FOLDER = path.join(ROOT, 'src/realities/solPrime');
const BIN_FOLDER = path.join(ROOT, 'src/realities/bin/solPrime');
const TOMBSTONE = path.join(ROOT, 'src/realities/bin/.tombstones/sol-prime.tombstone');
const PORT = Number(process.env.PORT) || 3997;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = path.join(ROOT, 'scripts/verify/vanished-marble');

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
  const proc = spawn('npm run dev', { cwd: ROOT, shell: true, stdio: 'ignore', detached: process.platform !== 'win32', env: { ...process.env, PORT: String(PORT) } });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    if (await serverHealthy()) return proc;
  }
  await terminateProcessTree(proc);
  throw new Error('dev server did not become healthy within 120s');
}

async function waitUntil(ok: () => boolean, ms: number, step = 100): Promise<boolean> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (ok()) return true;
    await new Promise((r) => setTimeout(r, step));
  }
  return ok();
}

async function main(): Promise<void> {
  if (!existsSync(SRC_FOLDER)) throw new Error(`nothing to delete through the UI: ${SRC_FOLDER} missing`);
  if (existsSync(BIN_FOLDER)) throw new Error(`stale bin folder from an earlier run: ${BIN_FOLDER} — clean it first`);
  mkdirSync(OUT, { recursive: true });
  let server: ChildProcess | null = null;
  let browser = null;

  try {
    server = await spawnServer();
    const b = await chromium.launch({ args: ['--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
    browser = b;
    const page = await b.newPage({ viewport: { width: 1600, height: 900 } });
    await page.bringToFront();
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForFunction('Boolean(window.__ENGINE__)', undefined, { timeout: 90_000 });
    const introGone = await page.waitForFunction(
      () => !(document.querySelector('.intro-veil')), undefined, { timeout: 90_000 },
    ).then(() => true).catch(() => false);
    expect('the intro veil lifts (no ignition failure)', introGone, introGone ? '' : 'the veil never lifted');
    await page.waitForTimeout(3000);

    /* boot sanity: the multiverse holds exactly the home reality's marble */
    const boot = await page.evaluate(() => ({
      groups: Object.keys((window as any).__ENGINE__?.realityGroups ?? {}),
      marbles: ((window as any).__ENGINE__?.realityMarbles ?? []).length,
      colliders: ((window as any).__ENGINE__?.multiverseColliders ?? []).filter((c: any) => c?.userData?.realityId === 'sol-prime').length,
    }));
    expect(
      'boot: the home reality renders as exactly one marble (one group, one disc, its colliders)',
      boot.groups.length === 1 && boot.groups[0] === 'sol-prime' && boot.marbles === 1 && boot.colliders >= 1,
      JSON.stringify(boot),
    );
    await page.screenshot({ path: path.join(OUT, '01-before-delete.png') });

    /* THE DELETE — the author's own door: Core Console → Realities Grid →
       Collapse → Confirm Erase. No __ACTIONS__ shortcut: the real buttons. */
    await page.keyboard.press('Control+k');
    const paletteUp = await page.waitForSelector('.core-plate input', { timeout: 15_000 }).then(() => true).catch(() => false);
    expect('the Command Palette opens', paletteUp, paletteUp ? '' : 'no palette input');
    await page.keyboard.type('console', { delay: 40 });
    await page.waitForTimeout(400);
    await page.keyboard.press('Enter');
    const consoleOpen = await page.waitForSelector('.cc-root', { timeout: 20_000 }).then(() => true).catch(() => false);
    expect('the Core Console opens', consoleOpen, consoleOpen ? '' : 'no .cc-root');
    await page.waitForTimeout(1500);

    await page.getByText('View All', { exact: false }).first().click();
    await page.waitForTimeout(800);

    const collapse = page.locator('button[title="Collapse this reality"]').first();
    const collapseUp = await collapse.waitFor({ state: 'visible', timeout: 15_000 }).then(() => true).catch(() => false);
    expect('the Realities Grid shows the reality card with its collapse door', collapseUp, collapseUp ? '' : 'no collapse button');
    if (!collapseUp) throw new Error('cannot proceed: the collapse door never appeared');

    /* the document token — a Vite full-reload (triggered by the dev folder
       move) creates a fresh document WITHOUT it; same-token samples are
       therefore proof the vanish happened on the SAME engine instance */
    await page.evaluate(() => { (window as any).__probeToken = 42; });

    /* arm + confirm within the card's 2.8s arming window: the confirm goes
       through the element's own DOM click() — and the loop only declares
       success when the ENGINE actually loses the reality (a click on a node
       the 2.8s timer has since detached is a silent no-op, never a success) */
    /* NO pointer machinery and NO locator waits anywhere: Playwright's
       actioned clicks race the card's hover/layout animations (measured),
       and even getByText's visibility wait missed a button that was provably
       in the DOM — so the arm is a DOM click, the confirm is an in-page
       hunt-and-click, and success is declared only when the ENGINE loses
       the reality (a silent no-op click is never a success) */
    let deleted = false;
    for (let attempt = 0; attempt < 4 && !deleted; attempt++) {
      try {
        await collapse.evaluate((el) => { if (document.contains(el)) (el as HTMLElement).click(); });
      } catch {
        /* the card already left the grid — the delete landed state-side;
           if the scene still shows the marble, THE RECEIPT below fails */
        break;
      }
      /* no name-inferred inner functions: the tsx transform wraps those in a
         __name() helper the page does not carry (measured ReferenceError) */
      const confirmed = await page.evaluate(async () => {
        const t0 = Date.now();
        for (;;) {
          const btn = Array.from(document.querySelectorAll('button'))
            .find((b) => (b.textContent ?? '').trim() === 'Confirm Erase');
          if (btn) { (btn as HTMLElement).click(); return true; }
          if (Date.now() - t0 > 1800) return false;
          await new Promise((r) => setTimeout(r, 50));
        }
      });
      if (!confirmed) continue;
      deleted = await page.waitForFunction(
        () => Object.keys((window as any).__ENGINE__?.realityGroups ?? {}).length === 0,
        undefined, { timeout: 1500 },
      ).then(() => true).catch(() => false);
    }
    /* the delete may land state-side while the scene keeps the marble (the
       exact R105 bug) — that is not a click failure; THE RECEIPT below must
       be the line that catches it, with the true name */
    const cardGone = await page.evaluate(() => document.body.innerText.includes('No realities match')).catch(() => false);
    expect('the delete landed through the confirm door', deleted || cardGone, deleted || cardGone ? '' : 'Confirm Erase never landed');
    if (!deleted && !cardGone) throw new Error('cannot proceed: the confirm erase never fired');
    console.log(`▶ deleted: Sol-Prime collapsed through the real UI (engine emptied on the click document: ${deleted})`);

    /* THE RECEIPT — sample the scene every 50ms; the fix makes the marble
       vanish within a frame or two of the click, long before any reload. */
    const t0 = Date.now();
    let receipt: { t: number; groups: string[]; marbles: number; ghosts: number; stage: string } | null = null;
    let sameDocument = false;
    while (Date.now() - t0 < 8000) {
      const s = await page.evaluate(() => ({
        token: (window as any).__probeToken === 42,
        groups: Object.keys((window as any).__ENGINE__?.realityGroups ?? {}),
        marbles: ((window as any).__ENGINE__?.realityMarbles ?? []).length,
        ghosts: ((window as any).__ENGINE__?.multiverseColliders ?? []).filter((c: any) => c?.userData?.realityId === 'sol-prime').length,
        stage: (window as any).__ENGINE__?.cosmicStage ?? '?',
      })).catch(() => null);
      if (s) {
        sameDocument = sameDocument || s.token;
        if (s.token && s.groups.length === 0 && s.marbles === 0 && s.ghosts === 0) {
          receipt = { t: Date.now() - t0, groups: s.groups, marbles: s.marbles, ghosts: s.ghosts, stage: s.stage };
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    expect(
      'THE RECEIPT: the ghost marble is gone from the SAME engine instance that rendered it (no reload did the work)',
      !!receipt,
      receipt ? `vanished at +${receipt.t}ms` : 'the marble never vanished on the boot document — the skip guard stole the rebuild again',
    );
    console.log(`   scene samples: same-document=${sameDocument}${receipt ? `, stage at vanishing=${receipt.stage}` : ''}`);
    await page.screenshot({ path: path.join(OUT, '02-after-delete.png') });

    /* the traveler surfaces at the multiverse sphere (R102 law) */
    const stage = await page.evaluate(() => (window as any).__ENGINE__?.cosmicStage ?? '?');
    expect('the traveler surfaces at the multiverse stage', stage === 'multiverse', `cosmicStage=${stage}`);

    /* the disk side is honest: folder in the bin + the tombstone written */
    const diskOk = await waitUntil(() => existsSync(BIN_FOLDER) && existsSync(TOMBSTONE), 8000);
    expect(
      'the disk side: folder reached the Quantum Bin and the R105 tombstone was written',
      diskOk,
      `bin folder: ${existsSync(BIN_FOLDER)}, tombstone: ${existsSync(TOMBSTONE)}`,
    );

    /* the deleted reality rests in the Quantum Bin state — persisted (the
       debounced persistState), with its tombstone, restorable */
    const binState = await (async () => {
      const deadline = Date.now() + 8000;
      while (Date.now() < deadline) {
        const s = await page.evaluate(() => {
          const raw = localStorage.getItem('my-universe:v4');
          if (!raw) return null;
          try {
            const parsed = JSON.parse(raw);
            return {
              bin: (parsed?.binRealities ?? []).map((b: any) => b.id),
              deleted: parsed?.deletedRealityIds ?? [],
            };
          } catch { return null; }
        }).catch(() => null);
        if (s && s.bin.includes('sol-prime') && s.deleted.includes('sol-prime')) return s;
        await new Promise((r) => setTimeout(r, 250));
      }
      return null;
    })();
    expect(
      'the deleted reality rests in the Quantum Bin (persisted: bin entry + deletedRealityIds tombstone)',
      !!binState,
      JSON.stringify(binState),
    );

    const fatalOverlay = await page.evaluate(() => document.body.innerText.includes('IGNITION FAILURE'));
    expect('no ignition-failure overlay', !fatalOverlay, fatalOverlay ? 'IGNITION FAILURE on the glass' : '');

    const realPageErrors = pageErrors.filter((e) => !/WebSocket|fetch.*(commands|api\/|net::ERR)|Failed to load resource|net::ERR/i.test(e));
    const realConsoleErrors = consoleErrors.filter((e) => !/WebSocket|vite|\[vite\]|Failed to load resource|net::ERR|solPrime|glob/i.test(e));
    expect('zero page errors', realPageErrors.length === 0, realPageErrors.slice(0, 3).join(' | '));
    expect('zero console errors (dev-server HMR/glob noise excluded)', realConsoleErrors.length === 0, realConsoleErrors.slice(0, 3).join(' | '));

    const failed = results.filter((r) => !r.ok);
    console.log(failed.length === 0
      ? '\nR105 VANISHED-MARBLE PROBE — ALL GREEN (deleted realities leave the multiverse the moment they die)'
      : `\nR105 VANISHED-MARBLE PROBE — ${failed.length} FAILURE(S)`);
    if (failed.length) process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => undefined);
    await terminateProcessTree(server);
    await new Promise((r) => setTimeout(r, 1500));
    /* restore no matter what: the folder returns from the bin, the tombstone
       is erased — the mutation is the test, not the product */
    if (existsSync(BIN_FOLDER)) {
      rmSync(SRC_FOLDER, { recursive: true, force: true });
      const { renameSync } = await import('fs');
      renameSync(BIN_FOLDER, SRC_FOLDER);
      console.log('◂ restored: src/realities/solPrime is back in the tree');
    }
    rmSync(path.join(ROOT, 'src/realities/bin/.tombstones'), { recursive: true, force: true });
    console.log('◂ restored: the tombstone ledger is clean');
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
