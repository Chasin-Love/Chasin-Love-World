/* R103 LENS RECHECK — quick companion to the bug-hunt probe. The first probe's
   hole screenshot caught a black pit, but at ~2 fps headless a screenshot can
   lag the settled JS rig by a frame (mid-flight capture). This re-drive mimics
   the GREEN smoke run's exact recipe (click-to-focus, v, pin theta, settle,
   zoom 0.26, settle, pause), waits several slow frames, then takes THREE
   sequential shots and dumps the live lens/quad state to a JSON file.

   Run: npx tsx scripts/probes/round103-lens-recheck.ts */

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
  if (await serverHealthy()) { console.log(`▶ reusing :${PORT}`); return null; }
  console.log(`▶ spawning dev server on :${PORT} …`);
  const proc = spawn('npm run dev', { cwd: ROOT, shell: true, stdio: 'ignore', env: { ...process.env, PORT: String(PORT) } });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    if (await serverHealthy()) return proc;
  }
  throw new Error('dev server did not become healthy within 120s');
}

const RIG_SETTLED = `(() => { const e = window.__ENGINE__; if (!e || !e.rig) return false; const r = e.rig;
  return Math.abs(r.zoomT - r.tZoomT) < 0.001 && Math.abs(r.phi - r.tPhi) < 0.001 && Math.abs(r.theta - r.tTheta) < 0.001; })()`;

const DUMP = `(() => {
  const e = window.__ENGINE__;
  const hole = e.bodies.find((b) => b.data.kind === 'vault' || b.data.kind === 'hole');
  const bh = hole && hole.group.userData.bh;
  const quad = bh && bh.group.children[0];
  const mat = quad && quad.material;
  const dist = hole ? (() => { const v = new (Object.getPrototypeOf(e.camera.position).constructor)(); hole.group.getWorldPosition(v); return v.distanceTo(e.camera.position); })() : null;
  return {
    focusId: e.focusId, zoomT: e.rig.zoomT, tZoomT: e.rig.tZoomT,
    distToHole: dist,
    lensCur: e.lensCur, lensTarget: e.lensTarget,
    uLensCount: e.surfaceManager.lensUniforms.uLensCount.value,
    uLensBend: e.surfaceManager.lensUniforms.uLensBend.value,
    holeId: hole && hole.data.id, holeRadius: hole && hole.data.radius,
    geodesic: bh ? bh.geodesic : null, quadVisible: quad ? quad.visible : null,
    uTime: mat ? mat.uniforms.uTime.value : null,
    uCamPos: mat ? mat.uniforms.uCamPos.value.toArray().map((v) => +v.toFixed(1)) : null,
    uCenter: mat ? mat.uniforms.uCenter.value.toArray().map((v) => +v.toFixed(1)) : null,
    uRs: mat ? mat.uniforms.uRs.value : null, uScale: mat ? mat.uniforms.uScale.value : null,
    uCriticalB: mat ? mat.uniforms.uCriticalB.value : null,
    uDiskBright: mat ? mat.uniforms.uDiskBright.value : null,
    uLensing: mat ? mat.uniforms.uLensing.value : null,
    bh: { stoodDown: e.bhSys.raymarchStoodDown, disabled: e.bhSys.raymarchDisabled, flaps: e.bhSys.raymarchFlaps },
    frame: e.renderer.info.render.frame,
  };
})()`;

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const serverProc = await ensureServer();
  const browser = await chromium.launch({ args: ['--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
  const errs: string[] = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    await page.bringToFront();
    page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('AudioContext') && !m.text().includes('WebSocket') && !m.text().includes('[vite]')) errs.push(m.text()); });
    page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForFunction('Boolean(window.__ENGINE__)', undefined, { timeout: 60_000 });
    await page.waitForTimeout(4000);
    await page.mouse.click(150, 640);
    await page.keyboard.press('v');
    await page.evaluate(`(() => { const e = window.__ENGINE__; if (e && e.rig && e.rig.setOrbit) e.rig.setOrbit(0.9, null); })()`);
    const deadline = Date.now() + 90_000;
    let settled = false;
    while (Date.now() < deadline) { await page.waitForTimeout(500); if (await page.evaluate(RIG_SETTLED)) { settled = true; break; } }
    console.log('focus settled:', settled);
    await page.evaluate(`(() => { const e = window.__ENGINE__; if (e && e.rig) e.rig.setZoomTarget(0.26); })()`);
    settled = false;
    const zd = Date.now() + 90_000;
    while (Date.now() < zd) { await page.waitForTimeout(500); if (await page.evaluate(RIG_SETTLED)) { settled = true; break; } }
    console.log('zoom settled:', settled);
    await page.evaluate(`(() => { const e = window.__ENGINE__; if (e && typeof e.setPaused === 'function') e.setPaused(true); })()`);
    for (let i = 1; i <= 3; i++) {
      await page.waitForTimeout(1600); /* several slow frames at ~500 ms/frame */
      const st = await page.evaluate(DUMP);
      console.log(`SHOT ${i} state:`, JSON.stringify(st));
      writeFileSync(path.join(OUT, `r103-lens-recheck-${i}.json`), JSON.stringify(st, null, 1));
      await page.screenshot({ path: path.join(OUT, `r103-lens-recheck-${i}.png`) });
    }
    console.log(errs.length ? `ERRORS:\n${errs.join('\n')}` : 'no page errors');
  } finally {
    await browser.close();
    if (serverProc) {
      if (process.platform === 'win32' && serverProc.pid) spawn('taskkill', ['/pid', String(serverProc.pid), '/T', '/F'], { shell: true, stdio: 'ignore' });
      else serverProc.kill('SIGTERM');
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
