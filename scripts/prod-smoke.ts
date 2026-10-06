/* PROD SMOKE — the gate the dev smoke cannot be: serves the BUILT dist/
   exactly as the desktop bundle and a static host see it, and asserts the
   app actually boots (root mounts, canvas exists, zero page errors).

   Born from the v15.0.0 black-screen release: a prod-only chunk-order TDZ
   killed the installed app while every dev-mode gate stayed green.

   Requires dist/ — run `npm run build` first; this gate judges the BUILT app.
   PROD_SMOKE_PORT overrides :3210 (parallel checkouts on one machine). */
import { spawn, type ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { terminateProcessTree } from './tools/process-tree';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.PROD_SMOKE_PORT) || 3210;
const BASE = `http://127.0.0.1:${PORT}`;

if (!existsSync(path.join(ROOT, 'dist', 'index.html'))) {
  console.error('PROD SMOKE RED — dist/ is missing. Run `npm run build` first (this gate judges the BUILT app).');
  process.exit(1);
}

async function waitHealthy(deadlineMs = 30000): Promise<boolean> {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE + '/api/health', { signal: AbortSignal.timeout(1500) });
      if (res.ok) return true;
    } catch { /* server not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

const server: ChildProcess = spawn('node', ['dist/server.cjs'], {
  cwd: ROOT,
  detached: process.platform !== 'win32',
  env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production' },
  stdio: 'ignore',
});
let browser: import('playwright').Browser | null = null;
const pageErrors: string[] = [];
const consoleErrors: string[] = [];

try {
  if (!(await waitHealthy())) throw new Error('prod server never became healthy');

  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => pageErrors.push(String(e?.message ?? e)));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  /* the intro veil lifts once the first frame lands; the engine's 12s safety
     timer is the outer bound — judge at 14s */
  await page.waitForTimeout(14_000);
  const state = await page.evaluate(() => ({
    rootChildren: document.getElementById('root')?.children.length ?? 0,
    canvas: !!document.querySelector('canvas'),
  }));

  const bootOk = state.rootChildren > 0 && state.canvas;
  const clean = pageErrors.length === 0 && consoleErrors.length === 0;

  if (bootOk && clean) {
    console.log('● PROD SMOKE GREEN — the built dist boots: canvas live, zero page errors');
  } else {
    console.log('● PROD SMOKE RED —', JSON.stringify(state));
    console.log('  page errors:', pageErrors.length);
    pageErrors.slice(0, 5).forEach((e) => console.log('   •', e.slice(0, 220)));
    console.log('  console errors:', consoleErrors.length);
    consoleErrors.slice(0, 5).forEach((e) => console.log('   •', e.slice(0, 220)));
    process.exitCode = 1;
  }
} catch (err) {
  console.error('● PROD SMOKE RED —', String(err));
  process.exitCode = 1;
} finally {
  await browser?.close();
  await terminateProcessTree(server);
}
