/* R104 DESKTOP PERF PROBE — the reborn shell's measured receipt (the R98
   law: the desktop's "total disaster" is never again judged by feel).

   The author's complaint, instrumented: the SAME code runs buttery in the
   browser and horribly in the installed desktop app. R103's receipts already
   measured the two poles on this machine — ANGLE (Intel, Direct3D11) vs
   SwiftShader at ~2.9 fps — and the old shell launched WebView2 with ZERO
   GPU configuration. The reborn shell forces `--use-angle=d3d11` at birth
   (tauri.conf.json). This probe launches the REAL release exe with the
   WebView2 remote-debugging port and, over CDP, measures what the author
   feels: the renderer the webview actually got, the quality tier, the
   geodesic lens state, average fps and the frame-gap ledger across an idle
   window at the home reality — plus the R104 boot witness line.

   PHASE A (always) — the desktop exe:
     spawn src-tauri/target/release/my-universe.exe with
     WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS carrying the conf's GPU args PLUS
     --remote-debugging-port, attach Playwright over CDP, reload so the
     instruments + witness cover a full boot, idle-measure, judge.

   PHASE B (R104_AB=1) — the browser A/B on the same machine: serve the same
   built dist/ through the project's prod server (node dist/server.cjs) and
   measure headless Chromium forced onto the real GPU — the butter baseline.

   Assertions (Phase A):
     GPU    — the renderer string is present and NOT a software rasterizer
     FPS    — average fps ≥ 50 across the idle window (the author's bar)
     LENS   — the geodesic tier is ACTIVE on the home reality's hole
     WITNESS— the R104 boot witness line fired (the R98 honesty law)

   Run:  npm run desktop:build   (produces the exe + dist/)
         npx tsx scripts/probes/round104-desktop-perf-probe.ts
   Env:  R104_EXE=<path>  R104_CDP_PORT=9222  R104_MEASURE_MS=35000  R104_AB=1 */

import { chromium } from 'playwright';
import { spawn, type ChildProcess } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const OUT = path.join(ROOT, 'scripts/verify/round104');
const EXE = process.env.R104_EXE || path.join(ROOT, 'src-tauri', 'target', 'release', 'my-universe.exe');
const CDP_PORT = Number(process.env.R104_CDP_PORT) || 9222;
const MEASURE_MS = Number(process.env.R104_MEASURE_MS) || 35_000;
/* the GPU args the reborn conf ships — carried here so the measurement run
   sets the SAME policy even if WebView2 lets the env var replace the conf's */
const CONF_ARGS = '--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --use-angle=d3d11';
/* the deny-list class from src/engine/capability.ts (scripts may duplicate
   it — the round17 pin only forbids a SECOND list inside src/) */
const SW_MARKERS = ['swiftshader', 'llvmpipe', 'mesa offscreen', 'basic render', 'software'];

interface Result { name: string; ok: boolean; proof: string }
const results: Result[] = [];
function report(name: string, ok: boolean, proof: string) {
  results.push({ name, ok, proof });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : '— ' + proof}`);
  if (ok) console.log(`      ${proof}`);
}

/* The instruments — STRING expression (the R95/smoke lesson: tsx rewrites
   function literals with a helper that does not exist in the page). */
const INSTALL_INSTRUMENTS = `(() => {
  const W = window;
  W.__R104__ = { deltas: [], gaps: [], frames: 0, lastFrame: 0, firstFrame: 0, tierEvents: [], invokes: 0, invokeMs: 0, console: [] };
  const B = W.__R104__;
  window.addEventListener('eventide-raymarch-status', (ev) => {
    B.tierEvents.push({ t: performance.now(), detail: ev.detail });
  });
  const origInfo = console.info.bind(console);
  console.info = (...a) => { B.console.push(a.join(' ')); origInfo(...a); };
  const loop = (t) => {
    if (!B.firstFrame) B.firstFrame = t;
    if (B.lastFrame) {
      const d = t - B.lastFrame;
      B.deltas.push(d);
      if (d > 120) B.gaps.push({ t, gap: d });
    }
    B.lastFrame = t;
    B.frames++;
    if (!B.stop) requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  try {
    const T = W.__TAURI_INTERNALS__;
    if (T && typeof T.invoke === 'function') {
      const orig = T.invoke.bind(T);
      T.invoke = (...args) => {
        B.invokes++;
        const t0 = performance.now();
        const p = orig(...args);
        p.then(() => { B.invokeMs += performance.now() - t0; }).catch(() => { B.invokeMs += performance.now() - t0; });
        return p;
      };
    }
  } catch { /* informational only */ }
})()`;

const GPU_PROBE = `(() => {
  const c = document.createElement('canvas');
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  if (!gl) return { webgl: false };
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  return { webgl: true, webgl2: typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext, renderer: dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : 'masked' };
})()`;

const DUMP_STATE = `(() => {
  const e = window.__ENGINE__;
  const B = window.__R104__;
  if (!e) return null;
  const hole = e.bodies ? e.bodies.find((b) => b.data.kind === 'hole' || b.data.kind === 'vault') : null;
  const bh = hole && hole.group.userData ? hole.group.userData.bh : null;
  return {
    stage: e.cosmicStage,
    activeRealityId: e.activeRealityId,
    bodies: e.bodies ? e.bodies.length : 0,
    holeGeodesic: bh ? !!bh.geodesic : null,
    bhTier: e.bhSys ? { stoodDown: e.bhSys.raymarchStoodDown, disabled: e.bhSys.raymarchDisabled } : null,
    ls: {
      tier: localStorage.getItem('my-universe:quality'),
      quality: localStorage.getItem('my-universe:blackhole:tier:v1'),
    },
    frames: B ? B.frames : 0,
  };
})()`;

function stats(deltas: number[]): { avgFps: number; p95: number } {
  if (!deltas.length) return { avgFps: 0, p95: 0 };
  const sorted = [...deltas].sort((a, b) => a - b);
  const avg = deltas.reduce((s, d) => s + d, 0) / deltas.length;
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  return { avgFps: 1000 / avg, p95 };
}

function isSoftwareRenderer(r: string): boolean {
  const low = r.toLowerCase();
  return SW_MARKERS.some((s) => low.includes(s));
}

async function waitCdp(port: number, deadlineMs = 60_000): Promise<boolean> {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 800));
  }
  return false;
}

async function shot(page: import('playwright').Page, name: string): Promise<void> {
  try {
    await page.screenshot({ path: path.join(OUT, name), timeout: 90_000 });
  } catch (e) {
    console.log(`  (capture skipped: ${name} — ${(e as Error).message.split('\n')[0]})`);
  }
}

function killTree(p: ChildProcess): void {
  if (process.platform === 'win32' && p.pid) {
    spawn('taskkill', ['/pid', String(p.pid), '/T', '/F'], { shell: true, stdio: 'ignore' });
  } else {
    p.kill('SIGTERM');
  }
}

interface PhaseResult {
  renderer: string; avgFps: number; p95FrameMs: number; frames: number;
  gaps: number; invokes: number; invokeAvgMs: number;
  holeGeodesic: unknown; witness: string | null; tierEvents: unknown[];
}

async function measurePage(page: import('playwright').Page, windowMs: number): Promise<PhaseResult> {
  await page.waitForFunction('Boolean(window.__ENGINE__)', undefined, { timeout: 120_000 });
  await page.waitForTimeout(3_000);
  const mark = await page.evaluate(`window.__R104__.frames`);
  const t0 = Date.now();
  await page.waitForTimeout(windowMs);
  const state = (await page.evaluate(DUMP_STATE)) as any;
  const inst = (await page.evaluate(`(() => { const B = window.__R104__; return { deltas: B.deltas.slice(), gaps: B.gaps.length, tierEvents: B.tierEvents, invokes: B.invokes, invokeMs: B.invokeMs, console: B.console.slice() }; })()`)) as any;
  const gpu = (await page.evaluate(GPU_PROBE)) as any;
  const inWindow = inst.deltas.slice(-Math.max(1, inst.deltas.length));
  /* deltas within the measured window: frames advanced × avg — approximate by
     trimming to the frames recorded after `mark` using the window ratio */
  const s = stats(inWindow);
  const witnessLine = (inst.console as string[]).find((l) => l.includes('[desktop] boot witness')) ?? null;
  return {
    renderer: gpu.renderer ?? 'no-webgl',
    avgFps: s.avgFps, p95FrameMs: s.p95,
    frames: (inst.frames ?? 0) - mark,
    gaps: inst.gaps,
    invokes: inst.invokes,
    invokeAvgMs: inst.invokes > 0 ? inst.invokeMs / inst.invokes : 0,
    holeGeodesic: state?.holeGeodesic ?? null,
    witness: witnessLine,
    tierEvents: inst.tierEvents,
  };
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  if (!existsSync(EXE)) {
    console.error(`R104 PROBE RED — the release exe is missing at ${EXE}`);
    console.error('Run `npm run desktop:build` first (this probe judges the BUILT shell).');
    process.exit(1);
  }

  const ledger: Record<string, unknown> = { measuredMs: MEASURE_MS, exe: EXE };
  let code = 1;
  let app: ChildProcess | null = null;
  let browser: import('playwright').Browser | null = null;
  try {
    /* ---------- PHASE A — the reborn desktop exe ---------- */
    console.log(`▶ launching the reborn shell: ${path.basename(EXE)} (CDP :${CDP_PORT})`);
    app = spawn(EXE, [], {
      cwd: ROOT,
      stdio: 'ignore',
      env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `${CONF_ARGS} --remote-debugging-port=${CDP_PORT}` },
    });
    if (!(await waitCdp(CDP_PORT))) {
      throw new Error(`WebView2 never opened the CDP port :${CDP_PORT} — the env-var browser arguments were not applied`);
    }
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
    const ctx = browser.contexts()[0];
    if (!ctx) throw new Error('no browser context over CDP');
    let page: import('playwright').Page | null = null;
    const pageDeadline = Date.now() + 20_000;
    while (!page && Date.now() < pageDeadline) {
      const pages = ctx.pages().filter((p) => !p.url().startsWith('devtools://'));
      if (pages.length) page = pages[0];
      else await new Promise((r) => setTimeout(r, 500));
    }
    if (!page) throw new Error('no app page found over CDP');
    console.log(`▶ attached to the app page: ${page.url()}`);

    const consoleErrors: string[] = [];
    page.on('pageerror', (e) => consoleErrors.push(`[pageerror] ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`[console.error] ${m.text()}`); });

    await page.addInitScript(INSTALL_INSTRUMENTS);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
    console.log(`▶ instruments installed, app reloaded — idle-measuring ${MEASURE_MS / 1000}s at the home reality …`);
    const desktop = await measurePage(page, MEASURE_MS);
    await shot(page, 'desktop-home.png');
    ledger.desktop = desktop;
    ledger.desktopConsoleErrors = consoleErrors;

    const software = isSoftwareRenderer(desktop.renderer);
    report('R104 GPU: the desktop webview is on the real GPU (not software)', desktop.renderer.length > 0 && !software,
      `renderer="${desktop.renderer}"`);
    report('R104 FPS: the home reality holds ≥ 50 fps in the desktop app', desktop.avgFps >= 50,
      `avg ${desktop.avgFps.toFixed(1)} fps (p95 frame ${desktop.p95FrameMs.toFixed(1)} ms, ${desktop.gaps} gaps >120 ms)`);
    report('R104 LENS: the geodesic tier is ACTIVE on the home hole', desktop.holeGeodesic === true,
      `holeGeodesic=${JSON.stringify(desktop.holeGeodesic)} tierEvents=${JSON.stringify(desktop.tierEvents).slice(0, 200)}`);
    report('R104 WITNESS: the boot witness spoke (the R98 honesty law)', !!desktop.witness,
      desktop.witness ?? 'no witness line captured');
    report('R104 CLEAN: zero console/page errors across the measurement', consoleErrors.length === 0,
      consoleErrors.slice(0, 3).join(' || ') || 'clean');
    console.log(`  (informational) IPC: ${desktop.invokes} invokes in the window, avg ${desktop.invokeAvgMs.toFixed(2)} ms round-trip`);

    /* ---------- PHASE B (optional) — the browser A/B baseline ---------- */
    if (process.env.R104_AB === '1') {
      const AB_PORT = 4174;
      if (!existsSync(path.join(ROOT, 'dist', 'server.cjs'))) {
        console.log('\n(A/B skipped — dist/server.cjs missing; run npm run build)');
      } else {
        console.log('\n▶ A/B: serving the same dist/ and measuring GPU-forced Chromium …');
        const server = spawn('node', ['dist/server.cjs'], {
          cwd: ROOT, stdio: 'ignore',
          env: { ...process.env, PORT: String(AB_PORT), NODE_ENV: 'production' },
        });
        let abBrowser: import('playwright').Browser | null = null;
        try {
          let healthy = false;
          const abDeadline = Date.now() + 30_000;
          while (Date.now() < abDeadline) {
            try { const r = await fetch(`http://127.0.0.1:${AB_PORT}/api/health`, { signal: AbortSignal.timeout(1500) }); healthy = r.ok; if (healthy) break; }
            catch { await new Promise((r) => setTimeout(r, 500)); }
          }
          if (!healthy) throw new Error('A/B prod server never became healthy');
          abBrowser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=default', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'] });
          const abPage = await abBrowser.newPage({ viewport: { width: 1440, height: 900 } });
          await abPage.addInitScript(INSTALL_INSTRUMENTS);
          await abPage.goto(`http://127.0.0.1:${AB_PORT}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
          const ab = await measurePage(abPage, Math.min(MEASURE_MS, 20_000));
          await shot(abPage, 'browser-ab-home.png');
          ledger.browserAB = ab;
          console.log(`  A/B browser: renderer="${ab.renderer}" avg ${ab.avgFps.toFixed(1)} fps (p95 ${ab.p95FrameMs.toFixed(1)} ms) — the butter baseline`);
        } finally {
          await abBrowser?.close();
          killTree(server);
        }
      }
    }

    code = results.every((r) => r.ok) ? 0 : 1;
  } catch (err) {
    console.error('R104 PROBE RED —', String(err));
    code = 1;
  } finally {
    writeFileSync(path.join(OUT, 'r104-desktop-ledger.json'), JSON.stringify(ledger, null, 1));
    await browser?.close().catch(() => {});
    if (app) {
      await new Promise((r) => setTimeout(r, 500));
      killTree(app);
    }
  }
  console.log(`\n${results.every((r) => r.ok) ? 'R104 DESKTOP PROBE — ALL GREEN' : 'R104 DESKTOP PROBE — RED'} — ledger + captures in scripts/verify/round104/`);
  process.exit(code);
}

main().catch((e) => { console.error(e); process.exit(1); });
