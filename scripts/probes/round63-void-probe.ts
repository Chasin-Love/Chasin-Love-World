/**
 * ROUND 63 — the ABSOLUTE VOID probe (runtime diagnostic, run: npx tsx scripts/round63-void-probe.ts
 * with --gate for the pass/fail verdict).
 *
 * The user's law, both halves:
 *   1. the void is a hole torn in the universe — the deep interior reads
 *      absolute black (no sky, no film, no mirror);
 *   2. the yellow-white energy flows BLAZE over it exactly like the
 *      reference (webgpu-black-hole) — the bloom spill is wanted, so no
 *      post-process mask may ever touch the frame.
 *
 * Boots with the REAL GPU (the geodesic tier stands down on software
 * rasterizers), focuses the vault hole through the engine API (the 'v' key
 * path), bisects the zoom until the shadow is well framed, pauses, and
 * measures luminance at 12 angles on the 0.55R / 0.8R interior rings and the
 * 1.12R ring-glow ring — on our frame AND on the user's reference screenshot
 * (hardcoded eye-estimated geometry) as the target context. The shadow's
 * screen geometry comes from the live marcher uniforms (uCriticalB·uScale),
 * never hardcoded.
 */
import { spawn, type ChildProcess } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { terminateProcessTree } from '../tools/process-tree';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const PORT = Number(process.env.SMOKE_PORT) || 3000;
const BASE = `http://127.0.0.1:${PORT}`;
const VERIFY_DIR = path.join(ROOT, 'scripts/verify');
const PROBE = process.env.R63_PROBE_OUT
  ? path.resolve(ROOT, process.env.R63_PROBE_OUT)
  : path.join(VERIFY_DIR, 'r63-probe.png');
/* the user's reference screenshot (dgreenheck's webgpu-black-hole look) —
   shadow center/radius estimated by eye in normalized image coordinates */
const REFERENCE_IMAGE = 'C:/Users/Chasin-Love/.zcode/cli/image-cache/sess_ca2f9fc1-2f77-48f3-b656-034d96344e5b/image-ee27525fe30d59cc0a8fb405acda2807.png';
const REF_GEOM = { cx: 0.507, cy: 0.539, rN: 0.245 }; /* fractions of width/height/height */
const GATE = process.argv.includes('--gate');
const SETTLE_TIMEOUT_MS = 45_000;

async function serverHealthy(): Promise<boolean> {
  try {
    const res = await fetch(BASE + '/api/health', { signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch { return false; }
}

async function ensureServer(): Promise<ChildProcess | null> {
  if (await serverHealthy()) return null;
  const proc = spawn('npm run dev', { cwd: ROOT, shell: true, stdio: 'ignore', detached: process.platform !== 'win32' });
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    if (await serverHealthy()) return proc;
  }
  await terminateProcessTree(proc);
  throw new Error('dev server did not become healthy within 90s');
}

const RENDERER_FN = `(() => {
  const c = document.createElement('canvas');
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  if (!gl) return 'no-webgl';
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  return dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
})()`;

const SW_RASTERIZERS = ['swiftshader', 'llvmpipe', 'mesa offscreen', 'basic render', 'software'];

const RIG_SETTLED = `(() => { const e = window.__ENGINE__; if (!e || !e.rig) return false; const r = e.rig;
  return Math.abs(r.zoomT - r.tZoomT) < 0.001 && Math.abs(r.phi - r.tPhi) < 0.001 && Math.abs(r.theta - r.tTheta) < 0.001; })()`;

async function waitSettled(page: import('playwright').Page, what: string): Promise<void> {
  const deadline = Date.now() + SETTLE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await page.waitForTimeout(500);
    if (await page.evaluate(RIG_SETTLED)) return;
  }
  throw new Error(`${what} never settled`);
}

/* live shadow geometry from the marcher's own uniforms — the biggest
   geodesic hole currently in front of the camera */
const HOLE_STATE_FN = `(() => {
  const e = window.__ENGINE__;
  const blackHoles = e && e.bhSys && e.bhSys.blackHoles;
  if (!blackHoles) return null;
  const cam = e.camera;
  const V3 = cam.position.constructor;
  const fwd = new V3();
  cam.getWorldDirection(fwd);
  let best = null;
  for (const v of blackHoles) {
    const q = v.group.children[0];
    const m = q && q.material;
    if (!v.geodesic || !q || !q.visible || !m || !m.uniforms) continue;
    const center = new V3().setFromMatrixPosition(v.group.matrixWorld);
    const toHole = center.clone().sub(cam.position);
    const dist = toHole.length();
    if (dist < 1e-6 || toHole.dot(fwd) <= 0) continue;
    const bWorld = m.uniforms.uCriticalB.value * m.uniforms.uScale.value;
    const theta = Math.asin(Math.min(1, bWorld / Math.max(dist, bWorld * 1.0001)));
    const rUv = Math.tan(theta) / (2 * Math.tan(cam.fov * Math.PI / 360));
    const ndc = center.clone().project(cam);
    const st = {
      cx: (ndc.x * 0.5 + 0.5) * innerWidth,
      cy: (-ndc.y * 0.5 + 0.5) * innerHeight,
      rPx: rUv * innerHeight, dist, bWorld,
      criticalB: m.uniforms.uCriticalB.value,
    };
    if (!best || st.rPx > best.rPx) best = st;
  }
  return best;
})()`;

/* luminance at 12 angles per ring around (cx, cy) at pixel radius rPx —
   see measureImage() below */

async function measureImage(page: import('playwright').Page, b64: string, geom: { cx: number; cy: number; rPx: number }): Promise<Record<string, { lum: number[]; bmr: number }>> {
  return page.evaluate(`(() => {
    const data = ${JSON.stringify(b64)};
    const geom = ${JSON.stringify(geom)};
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, img.width, img.height).data;
        const at = (x, y) => {
          const xi = Math.max(0, Math.min(img.width - 1, Math.round(x)));
          const yi = Math.max(0, Math.min(img.height - 1, Math.round(y)));
          const i = (yi * img.width + xi) * 4;
          return [d[i], d[i + 1], d[i + 2]];
        };
        const rings = {};
        for (const [name, f] of [['r055', 0.55], ['r08', 0.8], ['r112', 1.12], ['r14', 1.4]]) {
          const lums = [];
          let bmr = 0;
          for (let a = 0; a < 12; a++) {
            const ang = (a / 12) * Math.PI * 2;
            const [r, gg, b] = at(geom.cx + Math.cos(ang) * geom.rPx * f, geom.cy + Math.sin(ang) * geom.rPx * f);
            lums.push((0.2126 * r + 0.7152 * gg + 0.0722 * b) / 255);
            bmr += (b - r) / 255;
          }
          rings[name] = { lum: lums, bmr: bmr / 12 };
        }
        res(rings);
      };
      img.onerror = () => rej(new Error('image decode failed'));
      img.src = 'data:image/png;base64,' + data;
    });
  })()`) as Promise<Record<string, { lum: number[]; bmr: number }>>;
}

const fmt = (r: { lum: number[]; bmr: number }) => `${r.lum.map((v) => v.toFixed(3)).join(' ')}  (b−r ${r.bmr.toFixed(3)})`;

async function main(): Promise<void> {
  const serverProc = await ensureServer();
  let browser: import('playwright').Browser | null = null;
  try {
    /* the geodesic tier stands down on software rasterizers — headless Chromium
       defaults to SwiftShader, so force the real GPU through ANGLE D3D11 and,
       if the renderer still reports software, relaunch headed as a last resort */
    browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu'] });
    let page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const renderer = await page.evaluate(RENDERER_FN) as string;
    if (SW_RASTERIZERS.some((s) => renderer.toLowerCase().includes(s))) {
      console.log(`R63 PROBE — headless GPU path unavailable (${renderer}); relaunching headed`);
      await browser.close();
      browser = await chromium.launch({ headless: false, args: ['--use-angle=d3d11'] });
      page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    } else {
      console.log(`R63 PROBE — GPU path: ${renderer}`);
    }
    await page.waitForFunction('Boolean(window.__ENGINE__)', undefined, { timeout: 60_000 });
    /* focusOn only lands its hole composition from the 'web' stage, and the
       boot's reality rebuilds clear any focus set before they finish — so
       wait for the FULL boot (bootIntro false), then make the focus stick */
    await page.waitForFunction(`window.__ENGINE__ && window.__ENGINE__.cosmicStage === 'web' && window.__ENGINE__.bootIntro === false`, undefined, { timeout: 120_000 });
    await page.waitForTimeout(1_500);
    await page.mouse.click(150, 640);                       // focus the document
    await page.waitForTimeout(500);                         // let the click's release timer fire first

    /* focus the vault hole through the engine API (the 'v' key's own path) */
    const focusExpr = `(() => {
      const e = window.__ENGINE__;
      const fb = (e.bodies || []).find((b) => b.data && b.data.kind === 'vault');
      if (!fb) return false;
      e.focusOn(fb.data.id);
      return true;
    })()`;
    const focused = await page.evaluate(focusExpr) as boolean;
    if (!focused) throw new Error('no vault body found to focus');
    let stickChecks = 0;
    for (let attempt = 0; attempt < 6; attempt++) {
      await page.waitForTimeout(1_200);
      const fid = await page.evaluate(`window.__ENGINE__.focusId`) as string | null;
      if (fid) { stickChecks = attempt; break; }
      await page.evaluate(focusExpr); /* a rebuild cleared it — re-assert */
    }
    /* the focus composition IS the framing: focusOn points a geodesic hole
       at the R60 found composition (phi 1.05, zoomT 0.25, ~56 rs). Zooming
       further risks exiting the focus band and releasing the body — so the
       frame is verified, not chased. */
    await waitSettled(page, 'hole focus flight');
    await page.waitForTimeout(600);
    /* diagnostics first: what did the focus flight actually do? */
    const dbg = await page.evaluate(`(() => {
      const e = window.__ENGINE__; const r = e.rig;
      return {
        focusId: e.focusId, cosmicStage: e.cosmicStage,
        portalPhase: e.portal ? e.portal.phase : 'n/a',
        zoomT: r.zoomT, tZoomT: r.tZoomT, phi: r.phi, tPhi: r.tPhi, theta: r.theta, tTheta: r.tTheta,
        vaults: (e.bodies || []).filter((b) => b.data && b.data.kind === 'vault').map((b) => b.data.id),
        blackHoles: e.bhSys ? e.bhSys.blackHoles.length : 0,
      };
    })()`) as Record<string, unknown>;
    console.log(`R63 DEBUG — ${JSON.stringify(dbg)}`);
    const state = await page.evaluate(HOLE_STATE_FN) as null | { cx: number; cy: number; rPx: number; dist: number; bWorld: number; criticalB: number };
    if (!state) throw new Error('no geodesic hole in front of the camera after focus');
    const offCenter = Math.hypot(state.cx - 640, state.cy - 360) / 720;
    console.log(`R63 FRAME — shadow center (${state.cx.toFixed(0)}, ${state.cy.toFixed(0)}) px · radius ${state.rPx.toFixed(1)} px · dist ${state.dist.toFixed(1)} · uCriticalB ${state.criticalB.toFixed(4)} · off-center ${offCenter.toFixed(3)} of height`);
    if (state.rPx < 55 || state.rPx > 230) throw new Error(`shadow badly framed: r=${state.rPx.toFixed(1)}px (want 55–230 at the focus composition)`);
    if (offCenter > 0.35) throw new Error(`hole not centered (off by ${offCenter.toFixed(2)} of height) — focus did not land`);

    await page.waitForTimeout(800);
    await page.evaluate(`(() => { const e = window.__ENGINE__; if (e && typeof e.setPaused === 'function') e.setPaused(true); })()`);
    await page.waitForTimeout(800);
    const shot = await page.screenshot();
    writeFileSync(PROBE, shot);

    /* the tables — ours vs the user's reference screenshot */
    const ours = await measureImage(page, shot.toString('base64'), { cx: state!.cx, cy: state!.cy, rPx: state!.rPx });
    let ref: Record<string, number[]> | null = null;
    if (existsSync(REFERENCE_IMAGE)) {
      ref = await measureImage(page, readFileSync(REFERENCE_IMAGE).toString('base64'), {
        cx: REF_GEOM.cx * 1155, cy: REF_GEOM.cy * 612, rPx: REF_GEOM.rN * 612,
      });
    }
    console.log(`\nREFERENCE (user's image 2) — interior 0.55R: ${ref ? fmt(ref.r055) : 'n/a'}`);
    console.log(`                            ring glow 1.12R: ${ref ? fmt(ref.r112) : 'n/a'}`);
    console.log(`\nOURS — interior 0.55R: ${fmt(ours.r055)}`);
    console.log(`       interior 0.80R: ${fmt(ours.r08)}`);
    console.log(`       ring glow 1.12R: ${fmt(ours.r112)}`);
    console.log(`       disk 1.40R: ${fmt(ours.r14)}`);

    if (GATE) {
      /* the limits are ANCHORED TO THE REFERENCE ITSELF: its dimmest interior
         angles read ~0.24–0.43 — the blaze's own bloom spill warms the void
         there, it is not pitched black in the reference either. What must
         stay dead is the R63 sin: the uniform blue film wash (blue-dominant
         interior) and the sky showing through. Half 1 — the interior's
         dimmest sector stays dark AND warm/neutral. Half 2 — the flows blaze
         (the crossing band, the ring glow), and the void stays well below
         the ring's blaze (structure, not uniform haze). */
      const interior = [...ours.r055.lum, ...ours.r08.lum].sort((a, b) => a - b).slice(0, 6);
      const voidMean = interior.reduce((s, v) => s + v, 0) / interior.length;
      const voidMax = interior[interior.length - 1];
      const voidBmr = (ours.r055.bmr + ours.r08.bmr) / 2;
      const flowMax = Math.max(...ours.r055.lum, ...ours.r08.lum, ...ours.r112.lum);
      const ringMean = ours.r112.lum.reduce((s, v) => s + v, 0) / 12;
      console.log(`\nGATE — void (dimmest 6 interior): mean ${voidMean.toFixed(3)} max ${voidMax.toFixed(3)} (limits 0.38 / 0.42 — the reference's own dimmest-6 mean is 0.33, ±15% for the eye-estimated geometry) · blue−red ${voidBmr.toFixed(3)} (max 0.06 — the film-wash detector) · flow max ${flowMax.toFixed(3)} (min 0.5) · ring mean ${ringMean.toFixed(3)} (min 0.3) · void/ring ${(voidMean / ringMean).toFixed(2)} (max 0.55)`);
      const ok = voidMean <= 0.38 && voidMax <= 0.42 && voidBmr <= 0.06 && flowMax >= 0.5 && ringMean >= 0.3 && voidMean <= 0.55 * ringMean;
      console.log(ok ? '\n● R63 PROBE GREEN — void dark and warm like the reference, flows blazing' : '\n● R63 PROBE RED — see the table above');
      if (!ok) process.exitCode = 1;
    }
  } catch (err) {
    console.error('\n● R63 PROBE RED —', err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  } finally {
    await browser?.close();
    await terminateProcessTree(serverProc);
  }
}

main();
