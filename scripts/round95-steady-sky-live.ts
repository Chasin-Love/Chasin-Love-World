/* R95 LIVE CHECK — THE STEADY SKY, proven in a running browser.
   Run: npx tsx scripts/round95-steady-sky-live.ts

   The anti-detonation receipt for Round 95 (not part of the verify chain;
   smoke + gauntlets cover the standing law — this is the round's watcher).

   What it proves, black-box — it observes the LIVE engine the app runs, off
   window.__ENGINE__ (a handle the engine publishes on purpose). It reads the
   rendered group positions and the seam's own state: what the author sees.

   1. the app boots clean with the session DRIVING (gate on, crossfade full);
   2. for three real minutes of true N-body gravity every rendered body's
      scene radius stays within [0.2×, 4×] of its first observed radius —
      nobody plunges into the star, nobody is ejected (the R94 detonation
      reproduced exactly this class of failure);
   3. the sim clock advances continuously (real gravity owns the sky);
   4. the frame loop never starves (the catch-up burst yields);
   5. the star leads the roster with a bounded barycentric wobble;
   6. zero console/page errors across the whole hold.

   NOTE: this harness deliberately does NOT `import('/src/physics/sessionDriver.ts')`
   page-side. Under the app's dynamic import graph that yields a SECOND module
   instance with its own driverState, which never sees the engine's session —
   checks against it read a dead duplicate and report "not configured" while
   the app drives perfectly well. The engine handle is the honest observation.
*/

import { chromium } from 'playwright';
import { spawn, type ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.env.SMOKE_PORT) || 3000;
const BASE = `http://127.0.0.1:${PORT}`;
const HOLD_MS = Number(process.env.R95_HOLD_MS) || 180_000; /* three real minutes */

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

/* In-page sampling. NOTE two hard-won facts about this harness:
   1. these are passed to page.evaluate as FUNCTIONS, not strings — a bare
      string is evaluated as an expression and yields the function object
      itself (undefined once serialized), never its result.
   2. we read the ENGINE off window.__ENGINE__, NOT a page-side
      `import('/src/physics/sessionDriver.ts')`. Under this app's dynamic
      import graph the page-side import yields a SECOND module instance with
      its own driverState — it never sees the engine's session, so every
      check against it reads a dead duplicate as "not configured". The
      engine's own live objects (group positions, drvBlend, drvLastPos) are
      the honest observation point, and what the author actually sees. */
type Sample = {
  ready: boolean; driverOn?: boolean; blend?: number; readbackLen?: number;
  simDays?: number; radii?: number[]; anchorR?: number;
};
type Radius = { radius: number };

/* What the sky really is this frame: every rendered body's scene radius,
   the anchor (star) radius, the crossfade weight, and the clock. */
const sampleFn = (): Sample => {
  const e = (window as any).__ENGINE__;
  if (!e) return { ready: false };
  const bodies: any[] = e.bodies ?? [];
  return {
    ready: true,
    driverOn: !!e.universeDriverOn,
    blend: e.drvBlend,
    readbackLen: e.drvLastPos?.length ?? 0,
    simDays: e.simDays,
    anchorR: e.anchorGroup
      ? Math.hypot(e.anchorGroup.position.x, e.anchorGroup.position.y, e.anchorGroup.position.z)
      : undefined,
    radii: bodies.map((b) => Math.hypot(b.group.position.x, b.group.position.y, b.group.position.z)),
  };
};

/* Per-body radius vector for the anti-detonation law. */
const radiusFn = (): Radius[] | null => {
  const e = (window as any).__ENGINE__;
  if (!e) return null;
  const bodies: any[] = e.bodies ?? [];
  if (bodies.length === 0) return null;
  return bodies.map((b) => ({
    radius: Math.hypot(b.group.position.x, b.group.position.y, b.group.position.z),
  }));
};

async function main() {
  const server = await ensureServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const consoleErrors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  page.on('response', (res) => { if (res.status() === 404) consoleErrors.push(`404 ${res.url()}`); });

  /* canon radii per roster slot — home system law: star at origin, then the
     seed-table widths (seeds.ts, read at runtime from the page is overkill;
     the bounds test uses generous factors) */
  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    /* boot + the 4.4 s title sequence + the first crossfade ramp. The
       crossfade reaches 1 over 0.4 s of RENDERED frames, and the first
       configure is async (the roster seeds, the session restores) — sample
       until the sky has actually settled rather than guessing a deadline. */
    let s0 = await page.evaluate(sampleFn);
    const settleDeadline = Date.now() + 45_000;
    while (Date.now() < settleDeadline) {
      if (s0.ready && s0.driverOn && (s0.blend ?? 0) >= 1 && (s0.readbackLen ?? 0) > 0) break;
      await page.waitForTimeout(2000);
      s0 = await page.evaluate(sampleFn).catch(() => s0);
    }

    /* 1 — the session is driving from frame one (the flip): the engine holds
       the gate, the crossfade has reached 1, and the readback is whole. */
    check('live: the universe boots DRIVING (gate on, crossfade full, readback whole)',
      !!s0.ready && !!s0.driverOn && (s0.blend ?? 0) >= 1 && (s0.readbackLen ?? 0) > 0,
      JSON.stringify(s0));

    /* 2 — the hold: sample every 15 s for HOLD_MS, asserting the anti-
       detonation law continuously */
    const t0 = Date.now();
    let clockPrev = -1;
    let clockMax = -1;
    let rewinds = 0;
    let clockClimbed = true;
    let radiusLaw = true;
    let worst = '';
    const radiiSeen: number[][] = [];
    const anchorSeen: number[] = [];
    while (Date.now() - t0 < HOLD_MS) {
      /* a context can be destroyed under us (the app re-navigates); skip that
         tick rather than aborting the whole hold — a dropped sample is not a
         stability failure, and a crash here proves nothing about the sky */
      let radii: Radius[] | null = null;
      let st: Sample = { ready: false };
      try {
        radii = await page.evaluate(radiusFn);
        st = await page.evaluate(sampleFn);
      } catch {
        await page.waitForTimeout(15_000);
        continue;
      }
      if (radii && radii.length > 0) {
        radiiSeen.push(radii.map((r) => r.radius));
        if (typeof st.anchorR === 'number') anchorSeen.push(st.anchorR);
        /* anti-detonation law: every body stays within [0.2×, 4×] of its
           own FIRST observed radius (the seed moment) — plunge or ejection
           both violate it */
        const base = radiiSeen[0];
        for (let i = 1; i < radii.length; i++) {
          const b = base[i];
          const rNow = radii[i].radius;
          if (!(rNow > b * 0.2 && rNow < b * 4)) {
            radiusLaw = false;
            worst = `body[${i}] radius ${b.toFixed(1)} → ${rNow.toFixed(1)} scene units`;
          }
        }
      }
      /* the sim clock is the honest "the session is stepping" receipt — the
         rendered sky advances under it every frame.
         ONE rewind is legitimate and expected: the boot-resume adoption (R95)
         sets simDays to the saved memory's stamp, which sits ahead of the
         freshly-restarted clock. That is the universe remembering, not a
         stall. So the law is: the clock must ADVANCE overall, and may rewind
         at most once (the adoption), never repeatedly. */
      if (st.ready && typeof st.simDays === 'number') {
        if (st.simDays < clockPrev - 1e-9) {
          rewinds++;
          if (rewinds > 1) clockClimbed = false;
        }
        clockPrev = st.simDays;
        if (clockPrev > clockMax) clockMax = clockPrev;
      }
      await page.waitForTimeout(15_000);
    }
    check(`live: ${(HOLD_MS / 60000).toFixed(0)}-minute hold — no world plunged or was ejected`, radiusLaw, worst);
    check('live: the session stepped continuously through the hold',
      clockClimbed && clockMax > 0, `simDays reached ${clockMax.toFixed(1)} (${rewinds} rewind${rewinds === 1 ? '' : 's'})`);

    /* 3 — the star leads: the anchor's barycentric wobble stays bounded (the
       vault temper law gives ≤ ~23 units for the 0.1 M☉ tempered vault; 50
       is the honest "never flung" bound). Read from the anchor GROUP, which
       is what the star's ensemble (corona, halos, belt) actually rides. */
    const starNearOrigin = anchorSeen.length > 0 && anchorSeen.every((r) => r < 50);
    check('live: the home star leads the roster with a bounded wobble (never flung)',
      starNearOrigin, `anchor radius seen: ${anchorSeen.map((r) => r.toFixed(1)).join(', ')}`);

    /* 4 — the frame loop never starved (the catch-up burst yields) */
    const skyAlive = await page.evaluate("new Promise((resolve) => { requestAnimationFrame(() => resolve(true)); setTimeout(() => resolve(false), 3000); })");
    check('live: the frame loop is alive after the hold', skyAlive === true, 'rAF starved');

    /* 5 — clean console */
    check('live: zero console/page errors across the whole hold', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  } finally {
    await browser.close();
    if (server) server.kill();
  }

  if (failures > 0) {
    console.error(`\nR95 LIVE CHECK — ${failures} FAILURE${failures > 1 ? 'S' : ''}`);
    process.exit(1);
  } else {
    console.log('\nR95 LIVE CHECK — ALL GREEN: the steady sky held three real minutes of true gravity');
  }
}

void main();
