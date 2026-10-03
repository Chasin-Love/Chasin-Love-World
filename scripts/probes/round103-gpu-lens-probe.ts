/* R103 GPU LENS PROBE — the author's real environment, honestly: headless
   Chromium FORCED onto the real GPU (Intel UHD via D3D11, the same adapter
   their live Chrome uses). Answers: does the geodesic tier attach, do the
   raymarch uniforms get driven per frame (uTime > 0, uCamPos ≠ 0), and does
   the lensed accretion look actually render at the hole?
   Run: npx tsx scripts/probes/round103-gpu-lens-probe.ts */

import { chromium } from 'playwright';
import { spawn, type ChildProcess } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const PORT = Number(process.env.PORT) || 3999;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = path.join(ROOT, 'scripts/verify/bughunt');

async function serverHealthy(): Promise<boolean> {
  try { const res = await fetch(BASE + '/api/health', { signal: AbortSignal.timeout(2500) }); return res.ok; } catch { return false; }
}
async function ensureServer(): Promise<ChildProcess | null> {
  if (await serverHealthy()) return null;
  const proc = spawn('npm run dev', { cwd: ROOT, shell: true, stdio: 'ignore', env: { ...process.env, PORT: String(PORT) } });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    if (await serverHealthy()) return proc;
  }
  throw new Error('no healthy dev server');
}

const RIG_SETTLED = `(() => { const e = window.__ENGINE__; if (!e || !e.rig) return false; const r = e.rig;
  return Math.abs(r.zoomT - r.tZoomT) < 0.001 && Math.abs(r.phi - r.tPhi) < 0.001 && Math.abs(r.theta - r.tTheta) < 0.001; })()`;

const DUMP = `(() => {
  const e = window.__ENGINE__;
  const hole = e.bodies.find((b) => b.data.kind === 'vault' || b.data.kind === 'hole');
  const bh = hole && hole.group.userData.bh;
  const quad = bh && bh.group.children[0];
  const mat = quad && quad.material;
  const c = document.createElement('canvas');
  const gl = c.getContext('webgl2', { powerPreference: 'high-performance' });
  const dbg = gl && gl.getExtension('WEBGL_debug_renderer_info');
  let status = null;
  try { status = JSON.parse(sessionStorage.getItem('__nosuch__') || 'null'); } catch {}
  return {
    gpu: dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : 'masked/none',
    geodesic: bh ? bh.geodesic : null, quadVisible: quad ? quad.visible : null,
    uTime: mat ? +mat.uniforms.uTime.value.toFixed(2) : null,
    uCamPos: mat ? mat.uniforms.uCamPos.value.toArray().map((v) => Math.round(v)) : null,
    uCenter: mat ? mat.uniforms.uCenter.value.toArray().map((v) => Math.round(v)) : null,
    uCriticalB: mat ? +mat.uniforms.uCriticalB.value.toFixed(3) : null,
    bh: { stoodDown: e.bhSys.raymarchStoodDown, disabled: e.bhSys.raymarchDisabled, flaps: e.bhSys.raymarchFlaps, count: e.bhSys.blackHoles.length },
    uLensCount: e.surfaceManager.lensUniforms.uLensCount.value,
    uLensBend: +e.surfaceManager.lensUniforms.uLensBend.value.toFixed(3),
    focusId: e.focusId,
  };
})()`;

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const serverProc = await ensureServer();
  const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=default', '--enable-unsafe-swiftshader', '--disable-backgrounding-occluded-windows'] });
  const errs: string[] = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.bringToFront();
    page.on('console', (m) => {
      const t = m.text();
      if (t.includes('AudioContext') || t.includes('WebSocket') || t.includes('[vite]')) return;
      if (m.type() === 'error' || m.type() === 'warning') errs.push(`[${m.type()}] ${t}`);
    });
    page.on('pageerror', (e) => errs.push(`[pageerror] ${e.message}`));
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForFunction('Boolean(window.__ENGINE__)', undefined, { timeout: 60_000 });
    await page.waitForTimeout(4000);

    const boot = await page.evaluate(DUMP);
    console.log('BOOT (GPU):', JSON.stringify(boot));

    await page.mouse.click(150, 640);
    await page.keyboard.press('v');
    await page.evaluate(`(() => { const e = window.__ENGINE__; if (e?.rig?.setOrbit) e.rig.setOrbit(0.9, null); })()`);
    let ok = false;
    let dl = Date.now() + 45_000;
    while (Date.now() < dl) { await page.waitForTimeout(400); if (await page.evaluate(RIG_SETTLED)) { ok = true; break; } }
    console.log('focus settled:', ok);
    await page.evaluate(`(() => { const e = window.__ENGINE__; if (e?.rig) e.rig.setZoomTarget(0.26); })()`);
    ok = false;
    dl = Date.now() + 45_000;
    while (Date.now() < dl) { await page.waitForTimeout(400); if (await page.evaluate(RIG_SETTLED)) { ok = true; break; } }
    console.log('zoom settled:', ok);
    await page.evaluate(`(() => { const e = window.__ENGINE__; if (e?.setPaused) e.setPaused(true); })()`);
    await page.waitForTimeout(1200);
    const at = await page.evaluate(DUMP);
    console.log('AT THE HOLE (GPU):', JSON.stringify(at));
    writeFileSync(path.join(OUT, 'r103-gpu-lens.json'), JSON.stringify(at, null, 1));
    await page.screenshot({ path: path.join(OUT, 'r103-gpu-lens.png') });
    console.log(errs.length ? `CONSOLE WARN/ERRORS:\n${errs.join('\n')}` : 'console clean');
  } finally {
    await browser.close();
    if (serverProc) {
      if (process.platform === 'win32' && serverProc.pid) spawn('taskkill', ['/pid', String(serverProc.pid), '/T', '/F'], { shell: true, stdio: 'ignore' });
      else serverProc.kill('SIGTERM');
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
