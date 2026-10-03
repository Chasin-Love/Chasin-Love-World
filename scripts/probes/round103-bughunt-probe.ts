/* R103 BUG-HUNT PROBE — the hand-run instrumented receipt for the author's
   report (2026-10-03):
     1. "the spacetime bending around the black hole is missing on localhost"
        (the Living Lens / geodesic look no longer shows around Eventide);
     2. "the reverse Kamui sticks at the last second, and the whole screen
        sometimes freezes mid-summon while the audio keeps playing correctly"
        (a visual stall with a healthy audio timeline = main-thread blocking,
        not a time-keeping bug).

   R98 law applies: prove by observation, not inspection. This probe boots the
   REAL app in headless Chromium exactly as the author drives it (click a
   world → diary → close the diary; the hole → vault → leave the vault) with
   three instruments installed BEFORE the app code runs (addInitScript):
     A. a rAF gap recorder — every frame delta, every gap > 120 ms stamped;
     B. the geodesic-tier event tap — every `eventide-raymarch-status`
        transition (the breaker's stand-down warns + hides the hole);
     C. a 100 ms Kamui timeline sampler (kamuiTimer / portal phase / ease).

   Assertions:
     LENS  — after focusing Eventide, the surface lens roster is populated
             (uLensCount ≥ 1, uLensBend ≈ 1, a strong lens with rim > 0), and
             the geodesic tier is either LIVE (real GPU) or LOUDLY WITNESSED
             (the R103 one-time console.warn naming tier-low / override-off).
     TIME  — THE WALL-CLOCK LAW: the 1.9 s eject and the 5.0 s summon complete
             in WALL seconds even at ~2 fps (pre-fix measured 19.7 s wall for
             the eject — the author's "stuck at the last second, audio
             always right"). The rAF gap ledger stays informational (headless
             GL is software-paced by construction).

   Run:  npx tsx scripts/probes/round103-bughunt-probe.ts
   (reuses a healthy server on $PORT or 3999, else spawns `npm run dev`) */

import { chromium } from 'playwright';
import { spawn, type ChildProcess } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const PORT = Number(process.env.PORT) || 3999;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = path.join(ROOT, 'scripts/verify/bughunt');

interface Result { name: string; ok: boolean; proof: string }
const results: Result[] = [];
function report(name: string, ok: boolean, proof: string) {
  results.push({ name, ok, proof });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  — ' + proof}`);
  if (ok) console.log(`      ${proof}`);
}

async function serverHealthy(): Promise<boolean> {
  try {
    const res = await fetch(BASE + '/api/health', { signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch { return false; }
}

async function ensureServer(): Promise<ChildProcess | null> {
  if (await serverHealthy()) { console.log(`▶ reusing the healthy server on :${PORT}`); return null; }
  console.log(`▶ spawning npm run dev on :${PORT} …`);
  const proc = spawn('npm run dev', { cwd: ROOT, shell: true, stdio: 'ignore', detached: false, env: { ...process.env, PORT: String(PORT) } });
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    if (await serverHealthy()) return proc;
  }
  throw new Error('dev server did not become healthy within 120s');
}

/* The instruments — STRING expression (tsx/esbuild rewrites function literals
   with a __name helper that does not exist in the page context — the R95/
   smoke lesson). Everything is page-side; the Node side only reads. */
const INSTALL_INSTRUMENTS = `(() => {
  const W = window;
  W.__BUG__ = { gaps: [], frames: 0, lastFrame: 0, firstFrame: 0, tierEvents: [], kamui: [], longtasks: [], marker: [] };
  window.addEventListener('eventide-raymarch-status', (ev) => {
    W.__BUG__.tierEvents.push({ t: performance.now(), detail: ev.detail });
  });
  const loop = (t) => {
    const B = W.__BUG__;
    if (!B.firstFrame) B.firstFrame = t;
    if (B.lastFrame) {
      const gap = t - B.lastFrame;
      if (gap > 120) B.gaps.push({ t, gap });
    }
    B.lastFrame = t;
    B.frames++;
    if (!B.stop) requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  setInterval(() => {
    const B = W.__BUG__;
    const e = W.__ENGINE__;
    if (!e) return;
    const kp = e.kamuiPortal;
    B.kamui.push({
      t: performance.now(),
      timer: kp ? kp.kamuiTimer : null,
      phase: e.portal ? e.portal.phase : null,
      ease: kp ? kp.kamuiEase : null,
      frames: B.frames,
    });
  }, 100);
  try {
    const po = new PerformanceObserver((list) => {
      for (const en of list.getEntries()) W.__BUG__.longtasks.push({ t: en.startTime, dur: en.duration });
    });
    po.observe({ entryTypes: ['longtask'] });
  } catch { /* longtask unsupported — gaps still tell the story */ }
})()`;

/* timestamped mark — the Node side drops a named pin, the gap/timeline
   reading correlates against it ("the diary opened here", "the X clicked
   here") without cross-process chatter */
const MARK_FN = `(label) => { window.__BUG__.marker.push({ t: performance.now(), label }); }`;

const DUMP_STATE = `(() => {
  const e = window.__ENGINE__;
  if (!e) return null;
  const B = window.__BUG__;
  const sm = e.surfaceManager;
  const lu = sm && sm.lensUniforms ? sm.lensUniforms : null;
  const lenses = [];
  if (lu) {
    const count = lu.uLensCount.value | 0;
    for (let i = 0; i < Math.min(count, 4); i++) {
      const v = lu.uLenses.value[i];
      lenses.push({ dir: [v.x.toFixed(3), v.y.toFixed(3), v.z.toFixed(3)], halo: +v.w.toFixed(6), rim: +lu.uLensRim.value[i].toFixed(6), strong: lu.uLensStrong.value[i], vel: [lu.uLensVel.value[i].x.toFixed(2), lu.uLensVel.value[i].y.toFixed(2), lu.uLensVel.value[i].z.toFixed(2), lu.uLensVel.value[i].w] });
    }
  }
  const bodies = e.bodies.map((b) => ({ id: b.data.id, kind: b.data.kind, r: b.data.radius }));
  const hole = e.bodies.find((b) => b.data.kind === 'hole' || b.data.kind === 'vault');
  let holeVisual = null;
  if (hole) {
    const bh = hole.group.userData.bh;
    holeVisual = bh ? { geodesic: !!bh.geodesic, visible: !!bh.group.visible } : 'no bh visual on group';
  }
  return {
    stage: e.cosmicStage,
    activeRealityId: e.activeRealityId,
    lensCur: e.lensCur, lensTarget: e.lensTarget,
    uLensCount: lu ? lu.uLensCount.value : null,
    uLensBend: lu ? lu.uLensBend.value : null,
    uLensScale: lu ? lu.uLensScale.value : null,
    lenses,
    hole: hole ? { id: hole.data.id, radius: hole.data.radius } : null,
    holeVisual,
    bhTier: { stoodDown: e.bhSys ? e.bhSys.raymarchStoodDown : null, disabled: e.bhSys ? e.bhSys.raymarchDisabled : null, flaps: e.bhSys ? e.bhSys.raymarchFlaps : null, holes: e.bhSys ? e.bhSys.blackHoles.length : null },
    bodies: bodies.length,
    frames: B.frames, tierEvents: B.tierEvents,
    ls: {
      tier: localStorage.getItem('my-universe:blackhole:tier:v1'),
      quality: localStorage.getItem('my-universe:quality'),
      lensing: (JSON.parse(localStorage.getItem('my-universe:v4') || 'null') || {}).spacetimeLensing,
    },
  };
})()`;

const RIG_SETTLED = `(() => { const e = window.__ENGINE__; if (!e || !e.rig) return false; const r = e.rig;
  return Math.abs(r.zoomT - r.tZoomT) < 0.001 && Math.abs(r.phi - r.tPhi) < 0.001 && Math.abs(r.theta - r.tTheta) < 0.001; })()`;

async function waitSettled(page: import('playwright').Page, label: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await page.waitForTimeout(400);
    if (await page.evaluate(RIG_SETTLED)) return;
  }
  throw new Error(`camera never settled (${label})`);
}

/* software-paced pipelines (headless SwiftShader) can leave a screenshot
   waiting on a frame for tens of seconds during a fullscreen Kamui pass —
   a missing capture must never kill the measurement run */
async function shot(page: import('playwright').Page, name: string): Promise<void> {
  try {
    await page.screenshot({ path: path.join(OUT, name), timeout: 90_000 });
  } catch (e) {
    console.log(`  (capture skipped: ${name} — ${(e as Error).message.split('\n')[0]})`);
  }
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const serverProc = await ensureServer();
  /* R103_GPU=1 pins headless Chromium onto the machine's REAL GPU (the same
     ANGLE/D3D11 path the author's live Chrome takes) — default headless uses
     SwiftShader and stands in as the extreme slow pipeline. */
  const gpuArgs = process.env.R103_GPU === '1' ? ['--enable-gpu', '--use-angle=default'] : [];
  const browser = await chromium.launch({ args: ['--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', ...gpuArgs] });
  const errors: string[] = [];
  const warnings: string[] = [];
  let code = 1;
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    await page.bringToFront();
    page.on('console', (m) => {
      const t = m.text();
      if (t.includes('AudioContext')) return; /* headless has no audio device */
      /* the documented cold-boot flake family: Vite's HMR socket lagging the
         page — environment noise, not app state (PROJECT-BRAIN §9 watch item) */
      if (t.includes('WebSocket') || t.includes('[vite]') || t.includes('ERR_CONNECTION_REFUSED')) return;
      /* THREE deprecation chatter is a warning, not a failure */
      if (m.type() === 'warning') { warnings.push(t); return; }
      if (m.type() === 'error') errors.push(`[console.error] ${t}`);
    });
    page.on('pageerror', (e) => {
      if (e.message.includes('WebSocket') || e.message.includes('ERR_CONNECTION_REFUSED')) return; /* cold-boot flake family */
      errors.push(`[pageerror] ${e.message}`);
    });
    /* the instruments ride BEFORE any app script (and survive navigation) */
    await page.addInitScript(INSTALL_INSTRUMENTS);

    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForFunction('Boolean(window.__ENGINE__)', undefined, { timeout: 60_000 });
    await page.waitForTimeout(4_000);

    /* ---------- PHASE 0 — the renderer string + capability story ---------- */
    const gpu = await page.evaluate(`(() => {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return { webgl: false };
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      return { webgl: true, webgl2: typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext, renderer: dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : 'masked' };
    })()`);
    console.log('GPU probe:', JSON.stringify(gpu));

    const boot = (await page.evaluate(DUMP_STATE)) as any;
    console.log('BOOT STATE:', JSON.stringify(boot, null, 1));
    await shot(page, 'r103-boot.png');

    /* ---------- PHASE 1 — THE LENS ---------- */
    await page.evaluate(`(${MARK_FN})('press-v')`);
    await page.keyboard.press('v'); /* focus Eventide (R20.2 framing) */
    await page.evaluate(`(() => { const e = window.__ENGINE__; if (e && e.rig && e.rig.setOrbit) e.rig.setOrbit(0.9, null); })()`);
    await waitSettled(page, 'focus flight', 90_000);
    await page.evaluate(`(() => { const e = window.__ENGINE__; if (e && e.rig) e.rig.setZoomTarget(0.26); })()`);
    await waitSettled(page, 'zoom-out', 90_000);
    await page.waitForTimeout(1_200);

    const lens = (await page.evaluate(DUMP_STATE)) as any;
    console.log('LENS STATE AT THE HOLE:', JSON.stringify(lens, null, 1));
    await shot(page, 'r103-eventide-lens.png');

    report('lens roster populated', (lens.uLensCount ?? 0) >= 1 && (lens.uLensBend ?? 0) > 0.5,
      `uLensCount=${lens.uLensCount} uLensBend=${lens.uLensBend} lensScale=${lens.uLensScale} lensCur=${lens.lensCur} lenses=${JSON.stringify(lens.lenses)}`);
    /* the geodesic tier is ENVIRONMENT-bound (headless defaults to SwiftShader,
       which canUseRaymarchBlackHole rightly refuses). What the R103 witness
       law demands, either way: the tier's state is NAMED, never silent —
       live, or warned about. */
    const geodesicLive = lens.bhTier && !lens.bhTier.disabled && !lens.bhTier.stoodDown
      && lens.holeVisual && typeof lens.holeVisual === 'object' && lens.holeVisual.geodesic === true;
    const witness = warnings.some((w) => w.includes('the geodesic black-hole tier is NOT live'));
    report('geodesic tier either LIVE or loudly witnessed', Boolean(geodesicLive) || witness,
      `bhSys=${JSON.stringify(lens.bhTier)} holeVisual=${JSON.stringify(lens.holeVisual)} witness=${witness} tierEvents=${JSON.stringify(lens.tierEvents)}`);
    report('hole (vault body) present in roster', Boolean(lens.hole), `hole=${JSON.stringify(lens.hole)} bodies=${lens.bodies}`);

    /* ---------- PHASE 2 — THE FORWARD + REVERSE KAMUI (diary path) ---------- */
    const planetId = await page.evaluate(`(() => {
      const e = window.__ENGINE__;
      const p = e.bodies.find((b) => b.data.kind === 'planet');
      return p ? p.data.id : null;
    })()`);
    if (!planetId) throw new Error('no planet body found in the roster');
    console.log(`▶ Kamui cycle on planet: ${planetId}`);

    await page.evaluate(`(${MARK_FN})('kamui-forward-trigger')`);
    await page.evaluate(`(() => { window.__ENGINE__.portalTo(${JSON.stringify(planetId)}); })()`);
    /* the diary opens at the throat (≈5 s) — poll for its close button */
    let diaryOpen = false;
    const openDeadline = Date.now() + 45_000;
    while (Date.now() < openDeadline) {
      await page.waitForTimeout(400);
      diaryOpen = await page.evaluate(`Boolean(document.querySelector('button[title="close diary"]'))`);
      if (diaryOpen) break;
    }
    await page.evaluate(`(${MARK_FN})('diary-open:' + ${JSON.stringify(String(diaryOpen))})`);
    await shot(page, 'r103-diary-open.png');
    await page.waitForTimeout(1_500); /* the diary settled, idle in the entry */

    await page.evaluate(`(${MARK_FN})('kamui-reverse-trigger')`);
    if (diaryOpen) {
      await page.click('button[title="close diary"]');
    } else {
      await page.evaluate(`(() => { window.__ENGINE__.leavePortal(); })()`);
    }
    await page.waitForTimeout(1_000); /* inside the reverse tear */
    await shot(page, 'r103-reverse-tear.png');
    await page.waitForTimeout(3_500);  /* well past the 1.9 s eject */
    const postReverse = (await page.evaluate(DUMP_STATE)) as any;
    await shot(page, 'r103-post-reverse.png');

    /* ---------- PHASE 3 — THE VAULT PATH (the hole itself) ---------- */
    await page.evaluate(`(${MARK_FN})('vault-forward-trigger')`);
    await page.evaluate(`(() => { window.__ENGINE__.portalTo('eventide'); })()`);
    let vaultOpen = false;
    const vDeadline = Date.now() + 45_000;
    while (Date.now() < vDeadline) {
      await page.waitForTimeout(400);
      vaultOpen = await page.evaluate(`Boolean(document.querySelector('button[title="leave the vault"]'))`);
      if (vaultOpen) break;
    }
    await page.evaluate(`(${MARK_FN})('vault-open:' + ${JSON.stringify(String(vaultOpen))})`);
    await page.waitForTimeout(1_200);
    await page.evaluate(`(${MARK_FN})('vault-reverse-trigger')`);
    if (vaultOpen) {
      await page.click('button[title="leave the vault"]');
    } else {
      await page.evaluate(`(() => { window.__ENGINE__.leavePortal(); })()`);
    }
    await page.waitForTimeout(4_000);

    /* ---------- THE FRAME LEDGER ---------- */
    const ledger = await page.evaluate(`(() => {
      const B = window.__BUG__;
      return { gaps: B.gaps, markers: B.marker, kamui: B.kamui, longtasks: B.longtasks, tierEvents: B.tierEvents, frames: B.frames };
    })()`) as any;
    writeFileSync(path.join(OUT, 'r103-frame-ledger.json'), JSON.stringify(ledger, null, 1));

    const marks: { t: number; label: string }[] = ledger.markers;
    const markAt = (prefix: string) => marks.find((m) => m.label.startsWith(prefix))?.t ?? null;
    const tFwd = markAt('kamui-forward-trigger');
    const tRevDiary = markAt('kamui-reverse-trigger');
    const tFwdV = markAt('vault-forward-trigger');
    const tRevV = markAt('vault-reverse-trigger');
    const fmt = (g: any) => {
      const rel = (p: number | null) => (p === null ? '      n/a' : `${((g.t - p) / 1000).toFixed(2)}s`);
      return `gap=${g.gap.toFixed(0)}ms @t=${(g.t / 1000).toFixed(2)}s | rel: fwd${rel(tFwd)} rev${rel(tRevDiary)} vaultFwd${rel(tFwdV)} vaultRev${rel(tRevV)}`;
    };
    console.log(`\nFRAME LEDGER — ${ledger.frames} frames, ${ledger.gaps.length} gaps >120ms, ${ledger.longtasks.length} longtasks (informational — headless GL is software-paced):`);
    for (const g of ledger.gaps) console.log('  ' + fmt(g));
    if (ledger.tierEvents.length) {
      console.log('TIER TRANSITIONS:', JSON.stringify(ledger.tierEvents));
    }

    /* R103 — THE WALL-CLOCK LAW, measured. Before the fix the choreography's
       timer was paid in 0.05 s-per-frame increments, so under a slow pipeline
       the 1.9 s eject took 19.7 wall seconds (the author's "stuck at the last
       second, audio still right"). Now the timeline completes in real seconds:
       with the 0.5 s/frame sanity cap the eject takes ceil(1.9/0.5) = 4 frames
       at ANY frame rate, the summon 10. The assert envelope (design ×3) keeps
       3.5× of teeth against the pre-fix measurement while absorbing the slow
       sampler's own quantization on a 1.6 fps pipeline (each 0 crossing is
       detected one ~0.7 s frame late at both ends). */
    const wallDurationOf = (trigT: number | null, expect: number): { dur: number | null; ok: boolean } => {
      if (trigT === null) return { dur: null, ok: false };
      const seq = ledger.kamui.filter((k: any) => k.t >= trigT - 900 && k.t <= trigT + 45_000);
      const start = seq.find((k: any) => k.timer > 0);
      const end = seq.find((k: any) => start && k.t > start.t && k.timer === 0);
      if (!start || !end) return { dur: null, ok: false };
      const dur = (end.t - start.t) / 1000;
      return { dur, ok: dur <= expect * 3 };
    };
    const revD = wallDurationOf(tRevDiary, 1.9);
    report('R103: the reverse Kamui (diary) completes on WALL time (1.9 s design)', revD.ok,
      revD.dur === null ? 'not measured' : `wall duration ${revD.dur.toFixed(2)}s for the 1.9s eject (pre-fix measured 19.7s)`);
    const revV = wallDurationOf(tRevV, 1.9);
    report('R103: the reverse Kamui (vault) completes on WALL time', revV.ok,
      revV.dur === null ? 'not measured' : `wall duration ${revV.dur.toFixed(2)}s`);
    const fwdD = wallDurationOf(tFwd, 5.0);
    report('R103: the forward summon completes on WALL time (5.0 s design)', fwdD.ok,
      fwdD.dur === null ? 'not measured' : `wall duration ${fwdD.dur.toFixed(2)}s for the 5.0s summon`);
    report('zero console/page errors across the whole drive', errors.length === 0,
      errors.length ? errors.join(' || ') : 'clean');

    console.log('\npost-reverse state:', JSON.stringify(postReverse?.bhTier), 'portal phase:', (ledger.kamui.at(-1) || {}).phase);
    code = results.every((r) => r.ok) ? 0 : 1;
  } finally {
    if (warnings.length) console.log('\nENGINE WARNINGS:\n  ' + warnings.join('\n  '));
    if (errors.length) console.log('\nERRORS:\n  ' + errors.join('\n  '));
    await browser.close();
    if (serverProc) {
      if (process.platform === 'win32' && serverProc.pid) spawn('taskkill', ['/pid', String(serverProc.pid), '/T', '/F'], { shell: true, stdio: 'ignore' });
      else serverProc.kill('SIGTERM');
    }
  }
  console.log(`\n${results.every((r) => r.ok) ? 'ALL GREEN' : 'REPRODUCED'} — captures + ledger in scripts/verify/bughunt/`);
  process.exit(code);
}

main().catch((e) => { console.error(e); process.exit(1); });
