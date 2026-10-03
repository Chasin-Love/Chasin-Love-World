/* R101.3 DIAGNOSTIC — measure the driver-button thought cloud live: where the
   trigger is, where the bubble actually rendered, what left/transform it got. */
import { chromium } from 'playwright';
import { spawn, type ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const PORT = Number(process.env.SMOKE_PORT) || 3000;
const BASE = `http://127.0.0.1:${PORT}`;

async function serverHealthy(): Promise<boolean> {
  try { const r = await fetch(BASE + '/api/health', { signal: AbortSignal.timeout(2500) }); return r.ok; } catch { return false; }
}
async function ensureServer(): Promise<ChildProcess | null> {
  if (await serverHealthy()) return null;
  const p = spawn('npm run dev', { cwd: ROOT, shell: true, stdio: 'ignore', detached: false });
  const dl = Date.now() + 90_000;
  while (Date.now() < dl) { await new Promise((r) => setTimeout(r, 1500)); if (await serverHealthy()) return p; }
  throw new Error('no server');
}

async function main() {
  const server = await ensureServer();
  const browser = await chromium.launch({
    args: [
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.bringToFront();
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForFunction('Boolean(window.__ENGINE__)', undefined, { timeout: 60_000 });
    await page.waitForTimeout(3_000);
    await page.keyboard.press('Control+k');
    await page.waitForSelector('.core-plate input', { timeout: 30_000 });
    await page.keyboard.type('console', { delay: 40 });
    await page.keyboard.press('Enter');
    try {
      await page.waitForSelector('.cc-root', { timeout: 12_000 });
    } catch {
      const net = await page.evaluate(`(() => {
        const rel = performance.getEntriesByType('resource')
          .filter((r) => /CoreConsole|ThoughtCloud|SimulatorTwin|CppNative|CoreSigil|ScenicBackdrop|BlackHoleTuning|QuantumBin/i.test(r.name))
          .map((r) => r.name.split('/').slice(-1)[0].split('?')[0] + ' · ' + Math.round(r.duration) + 'ms');
        const root = document.querySelector('.cc-root');
        const rootInfo = root ? {
          exists: true,
          visibility: document.visibilityState,
          display: getComputedStyle(root).display,
          opacity: getComputedStyle(root).opacity,
          animationName: getComputedStyle(root).animationName,
          animationPlayState: getComputedStyle(root).animationPlayState,
          anims: root.getAnimations().map((a) => ({ name: a.animationName || a.transitionProperty, state: a.playState, t: a.currentTime })),
          rect: JSON.stringify(root.getBoundingClientRect()),
          childCount: root.children.length,
        } : { exists: false, visibility: document.visibilityState };
        return { loaded: rel, rootInfo, rootChildren: document.getElementById('root')?.children.length };
      })()`);
      console.log('CONSOLE DID NOT OPEN');
      console.log('console chunk resources:', JSON.stringify(net, null, 2));
      console.log('errors:', errors.length ? errors.slice(0, 8).join('\n---\n') : '(none)');
      await page.screenshot({ path: 'scripts/verify/frost/debug-open-fail.png' });
      throw new Error('see above');
    }
    await page.waitForTimeout(2_000);
    await page.click('#cc-twin-jump-btn');
    await page.waitForTimeout(1_800);

    // hover the driver button (first button inside #simulator-twin-card)
    const btn = page.locator('#simulator-twin-card button').first();
    await btn.hover();
    await page.waitForTimeout(800);

    /* R101.3 flip scenario — short viewport, no room above: hover the title
       (the frost probe's exact move) and watch for a throw */
    await page.setViewportSize({ width: 1600, height: 340 });
    await page.waitForTimeout(600);
    const h3box = await page.locator('#simulator-twin-card h3').boundingBox();
    if (h3box) {
      await page.mouse.move(h3box.x + h3box.width / 2, h3box.y + h3box.height / 2);
      await page.waitForTimeout(900);
    }
    const flipState = await page.evaluate(`(() => {
      const root = document.querySelector('.cc-root');
      const bubble = root && root.querySelector('.cc-cloud-rise');
      const bRect = bubble ? bubble.getBoundingClientRect() : null;
      const h3 = document.querySelector('#simulator-twin-card h3');
      const hRect = h3 ? h3.getBoundingClientRect() : null;
      return {
        consoleAlive: !!root,
        cloudOpen: !!bubble,
        bubbleTop: bRect ? Math.round(bRect.top) : null,
        bubbleBottom: bRect ? Math.round(bRect.bottom) : null,
        triggerTop: hRect ? Math.round(hRect.top) : null,
        hiccupBoundary: !!document.querySelector('.cc-root') === false,
      };
    })()`);
    console.log('flip state:', JSON.stringify(flipState, null, 2));
    console.log('errors during flip:', errors.length ? errors.slice(0, 6).join('\n---\n') : '(none)');
    await page.screenshot({ path: 'scripts/verify/frost/debug-flip.png' });

    const info = await page.evaluate(`(() => {
      const card = document.querySelector('#simulator-twin-card');
      const btnEl = card && card.querySelector('button');
      const wrap = btnEl && btnEl.parentElement;
      const bubble = wrap && wrap.querySelector(':scope > div.absolute');
      const rectOf = (e) => {
        if (!e) return null;
        const b = e.getBoundingClientRect();
        return { left: Math.round(b.left), right: Math.round(b.right), top: Math.round(b.top), bottom: Math.round(b.bottom), w: Math.round(b.width) };
      };
      return {
        button: rectOf(btnEl),
        wrapper: rectOf(wrap),
        wrapperClass: wrap && wrap.className,
        bubble: rectOf(bubble),
        bubbleStyleLeft: bubble ? getComputedStyle(bubble).left : null,
        bubbleStyleTransform: bubble ? getComputedStyle(bubble).transform : null,
        bubbleClass: bubble && bubble.className,
        innerW: window.innerWidth,
      };
    })()`);
    console.log(JSON.stringify(info, null, 2));
    await page.screenshot({ path: 'scripts/verify/frost/debug-cloud.png' });
  } finally {
    await browser.close();
    server?.kill();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
