/* R101 FROST VISUAL PROBE — the hand-run receipt for the frost deck.
   Drives a real headless Chromium through the Core Console the way the
   author would (the MultiverseBar CORE badge → the deck), then captures
   every pill-bar tab, the Twin Jump arrival, the Backdrop Studio popover
   and the Forge Reality modal as PNGs into scripts/verify/frost/ for the
   visual acceptance pass. It asserts nothing about pixels — the judge is
   the eye; this probe only proves the deck opens, every view mounts, and
   the seals answer.

   Run:  npx tsx scripts/probes/round101-frost-visual.ts
   (reuses a healthy dev server on :3000 / $SMOKE_PORT, spawns one otherwise) */

import { chromium } from 'playwright';
import { spawn, type ChildProcess } from 'child_process';
import { mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const PORT = Number(process.env.SMOKE_PORT) || 3000;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = path.join(ROOT, 'scripts/verify/frost');

async function serverHealthy(): Promise<boolean> {
  try {
    const res = await fetch(BASE + '/api/health', { signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch { return false; }
}

async function ensureServer(): Promise<ChildProcess | null> {
  if (await serverHealthy()) return null;
  const proc = spawn('npm run dev', { cwd: ROOT, shell: true, stdio: 'ignore', detached: false });
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    if (await serverHealthy()) return proc;
  }
  throw new Error('dev server did not become healthy within 90s');
}

async function main() {
  const server = await ensureServer();
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForFunction('Boolean(window.__ENGINE__)', undefined, { timeout: 60_000 });
    await page.waitForTimeout(3_500); /* scene warm-up — the sky must be alive first */

    /* the author's keyboard door: the Command Palette's "Open Core Console"
       power (Ctrl+K → type → Enter) — deterministic, no 3D picking needed */
    await page.keyboard.press('Control+k');
    await page.waitForSelector('.core-plate input', { timeout: 30_000 });
    await page.keyboard.type('console', { delay: 40 });
    await page.waitForTimeout(300);
    await page.keyboard.press('Enter');
    await page.waitForSelector('.cc-root', { timeout: 30_000 });
    await page.waitForTimeout(2_500); /* deck entrance + stagger settle */

    /* every rail view — wait for THE VIEW'S OWN content to be mounted AND
       fully entered (opacity 1) before capturing. innerHTML length alone
       lies: the exiting view's content satisfies it mid-swap. Each view
       carries a marker string only it renders. */
    const MARKERS: Record<string, string> = {
      dashboard: 'Multiverse Radar Scan',
      realities: 'All Parallel Realities',
      hierarchy: 'Reality Branches',
      bin: 'QUANTUM RECYCLE BIN',
    };
    for (const tab of ['dashboard', 'realities', 'hierarchy', 'bin']) {
      await page.click(`#cc-tab-${tab}`);
      await page.waitForFunction(
        (marker: string) => {
          const sc = document.querySelector('.cc-root .overflow-y-auto');
          if (!sc?.textContent?.includes(marker)) return false;
          const el = sc.firstElementChild as HTMLElement | null;
          return !!el && getComputedStyle(el).opacity === '1';
        },
        MARKERS[tab],
        { timeout: 15_000 },
      );
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(OUT, `frost-${tab}.png`) });
      console.log(`captured frost-${tab}.png`);
    }

    /* the Twin Jump — land on the dashboard, ride the rail seal to the card */
    await page.click('#cc-tab-dashboard');
    await page.waitForTimeout(900);
    await page.click('#cc-twin-jump-btn');
    await page.waitForTimeout(1_800);
    await page.screenshot({ path: path.join(OUT, 'frost-twin.png') });
    console.log('captured frost-twin.png');

    /* the Backdrop Studio popover, anchored to the rail */
    await page.click('#cc-backdrop-btn');
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, 'frost-studio.png') });
    console.log('captured frost-studio.png');
    await page.mouse.click(700, 500); /* the popover's click-catcher closes it */
    await page.waitForTimeout(400);

    /* the Forge Reality modal */
    await page.click('#core-forge-reality-btn');
    await page.waitForTimeout(1_200);
    await page.screenshot({ path: path.join(OUT, 'frost-forge.png') });
    console.log('captured frost-forge.png');

    console.log('FROST VISUAL PROBE — all captures written to scripts/verify/frost/');
  } finally {
    await browser.close();
    server?.kill();
  }
}

main().catch((err) => {
  console.error('FROST VISUAL PROBE — FAILED:', err);
  process.exit(1);
});
