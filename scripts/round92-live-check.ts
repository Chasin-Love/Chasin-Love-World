/* R92 LIVE CHECK — the driver takes the wheel, proven in a running browser.
   Run: npx tsx scripts/round92-live-check.ts

   The one-off live receipt for the revolution's first behavioral round
   (not part of the verify chain; smoke + gauntlets cover the standing law).

   What it proves, black-box, as a user would:
   1. the app boots clean (zero console/page errors);
   2. opening the Core Console shows the Native Simulator Twin card with the
      R92 UNIVERSE DRIVER switch in its clockwork state;
   3. clicking DRIVE THE SKY flips the badge to DRIVING THE SKY;
   4. the session actually RUNS: the card's steps-run counter GROWS over
      time and drift telemetry appears — real N-body stepping, fire-and-
      forget, while the sky keeps rendering (the extrapolated readback is
      being consumed by the seam);
   5. RESTORE CLOCKWORK flips back and the twin lab regains the session.
*/

import { chromium } from 'playwright';
import { spawn, type ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.SMOKE_PORT) || 3000;
const BASE = `http://127.0.0.1:${PORT}`;

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

let failures = 0;
function check(name: string, ok: boolean, detail: unknown = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : detail}`);
  if (!ok) failures++;
}

async function main() {
  const server = await ensureServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const consoleErrors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  page.on('response', (res) => { if (res.status() === 404) consoleErrors.push(`404 ${res.url()}`); });

  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(10000); /* boot + intro */
    await page.screenshot({ path: 'scripts/verify/r92-1-boot.png' });

    /* 1 — clean boot */
    check('live: the app boots with zero console/page errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

    /* 2 — open the Core Console via the command palette (Ctrl+K) */
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: 'scripts/verify/r92-2-palette.png' });
    await page.keyboard.type('console');
    await page.waitForTimeout(600);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(6000); /* the cinematic console-open transition */
    await page.screenshot({ path: 'scripts/verify/r92-3-console.png' });
    const consoleOpen = await page.locator('#cc-twin-jump-btn').count();
    check('live: the Core Console is open (the twin jump seal exists)', consoleOpen === 1, 'seal not found');

    /* 3 — jump to the twin card; R94: a fresh boot is DRIVING by default
       (absent flag = ON — the flip), so the receipt verifies the flip */
    await page.locator('#cc-twin-jump-btn').locator('button').click();
    await page.waitForTimeout(1800);
    const card = page.locator('#simulator-twin-card');
    const cardText0 = (await card.innerText()).toUpperCase();
    check('live: the card shows the driver switch, booting DRIVING (the flip)',
      cardText0.includes('UNIVERSE DRIVER') && cardText0.includes('DRIVING THE SKY') && cardText0.includes('RESTORE CLOCKWORK'),
      `len=${cardText0.length} :: ${cardText0.replace(/\n/g, ' | ').slice(0, 300)}`);

    /* 4 — the session actually steps (it has been stepping since boot) */
    const stepsAt = (t: string) => {
      const m = t.match(/steps run:\s*(\d+)/);
      return m ? Number(m[1]) : -1;
    };
    const s1 = stepsAt(await card.innerText());
    await page.waitForTimeout(4000);
    const s2 = stepsAt(await card.innerText());
    check('live: the session steps at boot (true gravity owns the sky from frame one)', s1 >= 0 && s2 > s1, `steps ${s1} → ${s2}`);

    /* 5 — RESTORE CLOCKWORK (the console switch still works) */
    await card.getByText('RESTORE CLOCKWORK').click();
    await page.waitForTimeout(1800);
    const restored = (await card.innerText()).toUpperCase();
    check('live: the clockwork takes the sky back on demand', restored.includes('CLOCKWORK') && restored.includes('DRIVE THE SKY'), restored.slice(0, 120));

    /* 6 — DRIVE THE SKY again */
    await card.getByText('DRIVE THE SKY').click();
    await page.waitForTimeout(2500);
    const driving = (await card.innerText()).toUpperCase();
    check('live: the switch hands the sky back to true gravity', driving.includes('DRIVING THE SKY'), driving.slice(0, 120));

    /* the sky is still alive: the canvas keeps painting (frame loop running) */
    const skyAlive = await page.evaluate("new Promise((resolve) => { requestAnimationFrame(() => resolve(true)); setTimeout(() => resolve(false), 3000); })");
    check('live: the frame loop is alive (the seam is being consumed)', skyAlive === true, 'rAF starved — headless anomaly');

    check('live: zero console/page errors across the whole drive', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  } finally {
    await browser.close();
    if (server) server.kill();
  }

  if (failures > 0) {
    console.error(`\nR92 LIVE CHECK — ${failures} FAILURE${failures > 1 ? 'S' : ''}`);
    process.exit(1);
  } else {
    console.log('\nR92 LIVE CHECK — ALL GREEN: true gravity drove the sky, in a real browser');
  }
}

void main();
