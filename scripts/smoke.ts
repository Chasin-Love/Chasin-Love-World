/* R52 HEADLESS SMOKE GATE — the runtime regression net for the architecture pass.
   Run:        npx tsx scripts/smoke.ts               (compare against the reference frame)
   Capture:    npx tsx scripts/smoke.ts --capture     (write/refresh the reference frame)

   What it proves per run:
   1. the app BOOTS headless with ZERO console errors / page errors;
   2. on software renderers, the declared raymarch degradation is honest and the
      background sky/lens stay live; on hardware, a geodesic hole must produce a
      visible shadow + disk frame. The software and hardware tiers are not compared
      to one golden because the software tier omits the raymarched disk by policy.

   Reuses a healthy server on :3000 if one is running; otherwise spawns
   `npm run dev` and tears it down afterwards. */

import { chromium } from 'playwright';
import { spawn, type ChildProcess } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { terminateProcessTree } from './tools/process-tree';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
/* SMOKE_PORT lets a second checkout verify on its own port (the spawned
   server honors PORT too) while :3000 stays the default contract. */
const PORT = Number(process.env.SMOKE_PORT) || 3000;
const BASE = `http://127.0.0.1:${PORT}`;
const VERIFY_DIR = path.join(ROOT, 'scripts/verify');
const REFERENCE = path.join(VERIFY_DIR, 'reference-hole.png');
const METRICS = path.join(VERIFY_DIR, 'reference-metrics.json');

/* thresholds tuned at the Phase 0 capture; widen only with a captured rationale.
   histL1 is the primary gate — the disk turbulence pattern free-runs until the
   pause, so raw pixel MAE varies wildly between boots at identical structure. */
const MAX_HIST_L1 = 0.12;        // 16-bin luminance histogram L1 distance
const MAX_SHADOW_DELTA = 0.08;   // central shadow luminance band vs reference
const MAX_MEAN_DELTA = 0.04;     // whole-frame luminance band vs reference
const MAX_BRIGHT_DELTA = 0.06;   // central bright-pixel fraction (the white band) vs reference
/* R103 — measured rationale: the rig eases on the physics-capped dt (50 ms per
   RENDERED frame), so on a software-GL pipeline (~2 fps headless) the focus
   flight converges in wall-clock asymptote — measured 51 s worst case on the
   author's laptop on a quiet machine (this bound was hit at 40 s twice while
   the standalone re-run was green). 150 s ≈ 3× the measured worst; the gate
   gates the FRAME, never the speed of slow hardware. */
const SETTLE_TIMEOUT_MS = 150_000;

interface FrameMetrics { mae: number; shadow: number; mean: number; bright: number }

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

/* pixel analysis runs inside the page (zero extra deps): downscale to 64×36 on a
   canvas, then compare + measure luminance bands. Passed as STRING expressions —
   tsx/esbuild rewrites function literals with a __name helper that does not
   exist in the page context, and string-expression args are inlined via JSON. */
const ANALYZE_FN = `
(async ([refData, shotData]) => {
  const load = (data) => new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = rej; img.src = 'data:image/png;base64,' + data; });
  const down = (img) => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 36;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, 64, 36);
    return g.getImageData(0, 0, 64, 36).data;
  };
  const lum = (d, x0, x1, y0, y1) => {
    let s = 0, n = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * 64 + x) * 4; s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; n++;
    }
    return s / n / 255;
  };
  const brightFrac = (d, x0, x1, y0, y1) => {
    let n = 0, b = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * 64 + x) * 4;
      const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      n++; if (l > 128) b++;
    }
    return b / n;
  };
  const [refImg, shotImg] = await Promise.all([refData ? load(refData) : null, load(shotData)]);
  const shot = down(shotImg);
  const shadow = lum(shot, 24, 40, 13, 23);   // central band — shadow + the crossing disk band
  const mean = lum(shot, 0, 64, 0, 36);
  const bright = brightFrac(shot, 20, 44, 10, 26);
  /* 16-bin luminance histogram — invariant to the free-running turbulence phase
     (which shifts streaks around) but sensitive to structural breaks (a missing
     halo or a dead raymarch tier moves huge mass between bins) */
  const hist = (d) => {
    const h = new Array(16).fill(0); let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      h[Math.min(15, Math.floor(l / 16))]++; n++;
    }
    return h.map((c) => c / n);
  };
  const shotHist = hist(shot);
  if (!refImg) return { mae: 0, shadow, mean, bright, hist: shotHist, histL1: 0 };
  const ref = down(refImg);
  let acc = 0;
  for (let i = 0; i < shot.length; i += 4) {
    acc += Math.abs(shot[i] - ref[i]) + Math.abs(shot[i + 1] - ref[i + 1]) + Math.abs(shot[i + 2] - ref[i + 2]);
  }
  const mae = acc / ((shot.length / 4) * 3) / 255;
  const refHist = hist(ref);
  const histL1 = refHist.reduce((s, v, i) => s + Math.abs(v - shotHist[i]), 0) / 2;
  return {
    mae, shadow, mean, bright, hist: shotHist, histL1,
    refShadow: lum(ref, 24, 40, 13, 23), refMean: lum(ref, 0, 64, 0, 36), refBright: brightFrac(ref, 20, 44, 10, 26),
  };
})`;

type Analysis = FrameMetrics & { hist: number[]; histL1: number; refShadow?: number; refMean?: number; refBright?: number };

async function analyze(page: import('playwright').Page, refB64: string | null, shotB64: string): Promise<Analysis> {
  /* args are JSON-inlined into the expression — string expressions don't receive evaluate()'s arg */
  return page.evaluate(`(${ANALYZE_FN})(${JSON.stringify([refB64, shotB64])})`) as Promise<Analysis>;
}

async function main(): Promise<void> {
  const capture = process.argv.includes('--capture');
  const serverProc = await ensureServer();
  let browser: import('playwright').Browser | null = null;
  const errors: string[] = [];
  let ok = false;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      /* headless Chromium has no audio device — this is environment noise, not an app defect */
      if (m.text().includes('AudioContext')) return;
      errors.push(`[console.error] ${m.text()}`);
    });
    page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));

    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForFunction('Boolean(window.__ENGINE__)', undefined, { timeout: 60_000 });
    await page.waitForTimeout(3_500);                       // scene warm-up
    await page.mouse.click(150, 640);                       // focus the document (empty space)
    await page.keyboard.press('v');                         // focus the Eventide hole (R20.2 framing)
    /* focusOn pins phi + zoom but leaves theta free — pin it or every boot views
       the hole from a different azimuth and the frame comparison is meaningless */
    await page.evaluate(`(() => { const e = window.__ENGINE__; if (e && e.rig && e.rig.setOrbit) e.rig.setOrbit(0.9, null); })()`);

    /* deterministic settle: poll the rig until the focus flight actually reached
       its targets (zoomT/phi/theta within ε of tZoomT/tPhi/tTheta) — luminance
       heuristics fire mid-flight because the easing tail is slow */
    const RIG_SETTLED = `(() => { const e = window.__ENGINE__; if (!e || !e.rig) return false; const r = e.rig;
      return Math.abs(r.zoomT - r.tZoomT) < 0.001 && Math.abs(r.phi - r.tPhi) < 0.001 && Math.abs(r.theta - r.tTheta) < 0.001; })()`;
    const deadline = Date.now() + SETTLE_TIMEOUT_MS;
    let settled = false;
    while (Date.now() < deadline) {
      await page.waitForTimeout(500);
      if (await page.evaluate(RIG_SETTLED)) { settled = true; break; }
    }
    if (!settled) throw new Error(`camera flight never settled within ${SETTLE_TIMEOUT_MS / 1000}s`);
    /* pull back to the whole-hole reference composition — at the focus zoom the
       disk overfills the frame and the free-running turbulence pattern dominates
       every pixel; zoomed out, structural region metrics stay stable across boots */
    await page.evaluate(`(() => { const e = window.__ENGINE__; if (e && e.rig) e.rig.setZoomTarget(0.26); })()`);
    let zoomed = false;
    const zoomDeadline = Date.now() + SETTLE_TIMEOUT_MS;
    while (Date.now() < zoomDeadline) {
      await page.waitForTimeout(500);
      if (await page.evaluate(RIG_SETTLED)) { zoomed = true; break; }
    }
    if (!zoomed) throw new Error(`zoom-out never settled within ${SETTLE_TIMEOUT_MS / 1000}s`);
    await page.waitForTimeout(1_000);                       // render catch-up

    await page.evaluate(`(() => { const e = window.__ENGINE__; if (e && typeof e.setPaused === 'function') e.setPaused(true); })()`);
    await page.waitForTimeout(800);                         // let the paused frame flush

    const viewState = await page.evaluate(`(() => {
      const e = window.__ENGINE__;
      const canvas = document.querySelector('canvas');
      const gl = canvas && (canvas.getContext('webgl2') || canvas.getContext('webgl'));
      const debug = gl && gl.getExtension('WEBGL_debug_renderer_info');
      const firstHole = e && e.bhSys && e.bhSys.blackHoles && e.bhSys.blackHoles[0];
      const quad = firstHole && firstHole.group.children[0];
      const uniforms = quad && quad.material && quad.material.uniforms;
      const skyLensUniforms = e && e.surfaceManager && e.surfaceManager.lensUniforms;
      return {
        renderer: debug && gl ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : 'unavailable',
        stage: e && e.cosmicStage,
        activeRealityId: e && e.activeRealityId,
        camera: e && e.camera ? [e.camera.position.x, e.camera.position.y, e.camera.position.z] : null,
        rig: e && e.rig ? { zoomT: e.rig.zoomT, theta: e.rig.theta, phi: e.rig.phi, focused: e.rig.focused } : null,
        holes: e && e.bhSys ? e.bhSys.blackHoles.map((v) => ({ geodesic: v.geodesic, visible: v.group.visible })) : null,
        shaderTime: uniforms && uniforms.uTime ? uniforms.uTime.value : null,
        lensing: uniforms && uniforms.uLensing ? uniforms.uLensing.value : null,
        skyLensCount: skyLensUniforms && skyLensUniforms.uLensCount ? skyLensUniforms.uLensCount.value : 0,
        skyLensStrength: skyLensUniforms && skyLensUniforms.uLensBend ? skyLensUniforms.uLensBend.value : 0,
      };
    })()`);
    console.log(`SMOKE VIEW — ${JSON.stringify(viewState)}`);
    const softwareRenderer = /swiftshader|llvmpipe|software raster|basic render/i.test(viewState.renderer);

    /* R98 — THE TIER RECEIPT, in the chain itself.
       Before this round the app could silently drop from the compiled core to
       the TypeScript reference and the whole verify chain stayed green: the
       frame matches either way, because the TS reference implements the same
       law. That is correct for the USER and useless as a guarantee — nothing
       asserted the compiled core was even reachable.

       Now the engine publishes its live bridge status and the chain reads it.
       The invariant deliberately does NOT demand a particular tier: a machine
       without emsdk has no artifact and legitimately runs TypeScript. What it
       forbids is the two dishonest states:
         - an unresolved tier (ready:false) — the bridge never finished
           selecting, so the sky rides an unowned default;
         - an incoherent ledger — typescript with no named reason (a silent
           fallback the chain cannot see), or a native tier that also reports
           something lost.
       A drop to TypeScript must now be EXPLAINED. That is the whole difference
       between a shrug and a receipt.

       R99.1 adds the last leg: CosmosStatus.primeFailures — the count of
       post-tier-won failures of the wired native physics prime. The catch is
       deliberate (zero-fail law: TS already served identical numbers) but it
       is no longer SILENT: counted on the status, warned once on the console,
       and asserted at ZERO here — a non-zero count means the native batch
       threw after the tier was won, and the boot is not clean no matter how
       right the frame looks. */
    const tier = await page.evaluate(`(() => {
      const e = window.__ENGINE__;
      const s = e && typeof e.cosmosStatus === 'function' ? e.cosmosStatus() : null;
      return s ? { backend: s.backend, ready: s.ready, degraded: s.degraded || [], primeFailures: s.primeFailures } : null;
    })()`);
    if (!tier || tier.ready !== true) {
      errors.push('[tier] the physics tier never resolved — the bridge reports no owned backend');
    } else {
      const notable = tier.degraded.filter((d) => d.reason !== 'no-tauri');
      console.log(`SMOKE TIER — ${tier.backend}${notable.length ? ` (degraded: ${notable.map((d) => `${d.tier}:${d.reason}`).join(', ')})` : ''}`);
      if (tier.backend === 'typescript' && notable.length === 0) {
        errors.push('[tier] running the TypeScript reference with an EMPTY degradation ledger — a silent fallback the chain cannot see');
      }
      if (tier.backend !== 'typescript' && notable.length > 0) {
        errors.push(`[tier] backend ${tier.backend} claims success while also reporting lost tiers: ${JSON.stringify(notable)}`);
      }
      if ((tier.primeFailures ?? 0) !== 0) {
        errors.push(`[tier] the physics prime failed ${tier.primeFailures} time(s) after the tier was won — the wired native batch threw (see the [cosmos] console warning); the boot is not clean even though the frame may match`);
      }
    }

    const shot = await page.screenshot();
    const shotB64 = shot.toString('base64');
    /* Optional artifact path for diagnosing a red frame without replacing the
       protected reference image or changing the capture baseline. */
    if (process.env.SMOKE_CAPTURE_PATH) {
      mkdirSync(path.dirname(process.env.SMOKE_CAPTURE_PATH), { recursive: true });
      writeFileSync(process.env.SMOKE_CAPTURE_PATH, shot);
      console.log(`SMOKE DEBUG CAPTURE — ${process.env.SMOKE_CAPTURE_PATH}`);
    }

    if (capture) {
      if (!softwareRenderer) throw new Error('the checked-in reference is the software-tier frame; capture it with SwiftShader');
      mkdirSync(VERIFY_DIR, { recursive: true });
      const m = await analyze(page, null, shotB64);
      if (!Array.isArray(viewState.holes) || viewState.holes.some((hole) => hole.geodesic)
          || viewState.skyLensCount <= 0 || viewState.skyLensStrength <= 0 || m.mean < 0.004) {
        throw new Error('refusing a blank or inconsistent software-tier capture');
      }
      writeFileSync(REFERENCE, shot);
      writeFileSync(METRICS, JSON.stringify({
        renderer: viewState.renderer,
        geodesic: false,
        skyLensCount: viewState.skyLensCount,
        skyLensStrength: viewState.skyLensStrength,
        shadow: m.shadow,
        mean: m.mean,
        bright: m.bright,
        capturedAt: new Date().toISOString(),
      }, null, 2) + '\n');
      console.log(`SMOKE CAPTURE — reference frame written (${shot.length} bytes)`);
      console.log(`  shadow ${m.shadow.toFixed(3)} · frame mean ${m.mean.toFixed(3)} · central bright ${m.bright.toFixed(3)}`);
      ok = true;
    } else if (softwareRenderer) {
      if (!existsSync(REFERENCE)) throw new Error('no reference frame — run: npx tsx scripts/smoke.ts --capture');
      const ref = readFileSync(REFERENCE);
      const m = await analyze(page, ref.toString('base64'), shotB64);
      const policyOk = Array.isArray(viewState.holes) && viewState.holes.length > 0
        && viewState.holes.every((hole) => !hole.geodesic)
        && viewState.skyLensCount > 0 && viewState.skyLensStrength > 0;
      if (!policyOk) errors.push('[software] renderer degradation, sky-lens slots, or bend strength is inconsistent');
      if (m.mean < 0.004) errors.push(`[software] the sky frame is blank (mean luminance ${m.mean.toFixed(3)})`);
      console.log(`SMOKE SOFTWARE — geodesic tier off by policy · sky lenses ${viewState.skyLensCount} · bend ${viewState.skyLensStrength.toFixed(2)} · frame mean ${m.mean.toFixed(3)}`);
      console.log(`SMOKE FRAME — histL1 ${m.histL1.toFixed(4)} (max ${MAX_HIST_L1}) · shadow ${m.shadow.toFixed(3)} vs ${m.refShadow?.toFixed(3)} · mean ${m.mean.toFixed(3)} vs ${m.refMean?.toFixed(3)} · bright ${m.bright.toFixed(3)} vs ${m.refBright?.toFixed(3)} · (mae ${m.mae.toFixed(3)} informational)`);
      const histOk = m.histL1 <= MAX_HIST_L1;
      const shadowOk = m.refShadow === undefined || Math.abs(m.shadow - m.refShadow) <= MAX_SHADOW_DELTA;
      const meanOk = m.refMean === undefined || Math.abs(m.mean - m.refMean) <= MAX_MEAN_DELTA;
      const brightOk = m.refBright === undefined || Math.abs(m.bright - m.refBright) <= MAX_BRIGHT_DELTA;
      if (!histOk) errors.push(`[frame] luminance histogram L1 ${m.histL1.toFixed(4)} > ${MAX_HIST_L1} — the black hole frame drifted structurally`);
      if (!shadowOk) errors.push('[frame] shadow luminance off band — shadow lost or bloated');
      if (!meanOk) errors.push('[frame] whole-frame luminance off band — scene composition changed');
      if (!brightOk) errors.push('[frame] central bright-band fraction off — disk halo or photon ring missing');
      ok = histOk && shadowOk && meanOk && brightOk && policyOk && m.mean >= 0.004;
    } else {
      const m = await analyze(page, null, shotB64);
      const geodesicLive = Array.isArray(viewState.holes) && viewState.holes.some((hole) => hole.geodesic);
      if (!geodesicLive) errors.push('[hardware] no black-hole raymarch is live on a hardware renderer');
      if (m.mean < 0.02 || m.bright < 0.01) errors.push('[hardware] the focused black hole has no visible shadow/disk frame');
      console.log(`SMOKE HARDWARE — geodesic ${geodesicLive ? 'live' : 'off'} · frame mean ${m.mean.toFixed(3)} · central bright ${m.bright.toFixed(3)}`);
      ok = geodesicLive && m.mean >= 0.02 && m.bright >= 0.01;
    }

    if (errors.length) {
      console.error(`\n● SMOKE RED — ${errors.length} problem(s):`);
      for (const e of errors.slice(0, 20)) console.error('  ' + e);
      failureText = errors.join(' | ');
      process.exitCode = 1;
    } else if (ok) {
      console.log('\n● SMOKE GREEN — clean boot, zero console errors, reference frame matches');
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('\n● SMOKE RED —', msg);
    if (errors.length) console.error(errors.slice(0, 20).map((e) => '  ' + e).join('\n'));
    failureText = `${msg}${errors.length ? ' | ' + errors.join(' | ') : ''}`;
    process.exitCode = 1;
  } finally {
    await browser?.close();
    await terminateProcessTree(serverProc);
  }
}

/* R103 — THE BOOT-RETRY GUARD (the §9 watch item, taken). The cold-boot flake
   has SIX sightings (R84 diagnosis, R96, R97 close-out, R99 ×2, R103 ×2): the
   page boots before the dev server's HMR socket finishes binding, yielding
   ERR_CONNECTION_REFUSED storms / "Execution context was destroyed"
   (mid-boot navigation) / a never-settled flight on a degraded first attempt —
   always with code byte-identical between red and green runs. One fresh retry
   against a REBOOTED server clears it by construction. A failure WITHOUT the
   flake signature still fails in one attempt, as it always has. */
let failureText = '';
const FLAKE_SIGNATURES = [
  'Execution context was destroyed',
  'ERR_CONNECTION_REFUSED',
  'WebSocket',
  'did not become healthy',
  'never settled within',
];

async function mainWithRetry(): Promise<void> {
  const captureMode = process.argv.includes('--capture'); /* a capture writes the reference — never "retried" */
  const attempts = captureMode ? 1 : 2;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    process.exitCode = 0;
    failureText = '';
    await main();
    if (process.exitCode !== 1) return;
    const flake = FLAKE_SIGNATURES.some((s) => failureText.includes(s));
    if (!flake || attempt === attempts) return;
    console.warn('\n…SMOKE FLAKE SIGNATURE (documented boot-race family) — one fresh retry on a rebooted server…');
    /* the killed server can still answer /api/health while its port drains —
       give the OS a beat to close it or the "fresh" attempt attaches to a
       dying process and reloads mid-boot (the flake feeding itself) */
    await new Promise((r) => setTimeout(r, 5_000));
  }
}

mainWithRetry();
