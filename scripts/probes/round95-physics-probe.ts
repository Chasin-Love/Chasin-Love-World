/* R95 PHYSICS PROBE — headless, honest, fast.
   Seeds the real session from the real canon and steps it through the REAL
   driverTick path (the production path), watching every body's radius.

   Run: npx tsx scripts/round95-physics-probe.ts [days]

   The anti-detonation law: every body's radius stays within [0.2x, 4x] of
   its seed radius. A plunge or an ejection fails loudly and immediately
   instead of three minutes later in a browser.
*/
import { solPrimeReality } from '../../src/realities/solPrime';
import { enableDriver, driverTick, driverState, driverReadback, type DriverBody } from '../../src/physics/sessionDriver';

const DAYS = Number(process.argv[2]) || 400;
const DT_DAYS = 2;

/* localStorage shim — the session memory must not touch a real browser store */
const mem = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, String(v)); },
  removeItem: (k: string) => { mem.delete(k); },
  clear: () => mem.clear(),
};
/* the bridge probes for a browser (WASM/native tiers); force the TS tier */
(globalThis as any).window = (globalThis as any).window ?? {};

async function main() {
  const reality = solPrimeReality;
  /* R95 diagnostic switches (env-only, never production):
     R95_NO_VAULT=1  drop the vault/hole body entirely
     R95_TEMPER=<x>  force every vault's in-session mass to x solar masses  */
  let bodies: DriverBody[] = reality.bodies
    .filter((b) => b.id !== 'anchor')
    .map((b) => ({ data: b }));
  if (process.env.R95_NO_VAULT === '1') {
    bodies = bodies.filter((b) => b.data.kind !== 'vault' && b.data.kind !== 'hole');
    console.log('  [diag] vault/hole bodies REMOVED');
  }

  await enableDriver(bodies, 0, 'sol-prime');
  if (!driverState.configured) {
    console.error('seed FAILED:', driverState.lastError);
    process.exit(1);
  }
  console.log(`seeded: ${bodies.length} bodies + the leading star (scope sol-prime)`);

  const radiiNow = (): number[] => {
    const rb = driverReadback(driverState.readbackDays);
    return rb ? rb.map((p) => Math.hypot(p[0], p[1], p[2])) : [];
  };

  const base = radiiNow();
  console.log('roster (star first):', bodies.map((b, i) => `[${i}]${b.data.id}`).join(' '));
  console.log('seed radii (scene units):', base.map((r) => r.toFixed(1)).join(' '));
  if (base.length === 0) { console.error('no readback'); process.exit(1); }

  /* WHAT WAS ACTUALLY SEEDED — masses in solar units and seed speeds.
     A star that gets flung means the barycenter frame handed it a huge
     velocity, which only happens if some mass rivaled it. */
  {
    const { buildRosterInputs } = await import('../../src/physics/sessionDriver');
    const inputs = buildRosterInputs(0);
    const MSUN = 1.98847e30;
    let px = 0, py = 0, pz = 0, mtot = 0;
    for (const s of inputs) {
      px += s.mass * s.vx; py += s.mass * s.vy; pz += s.mass * s.vz;
      mtot += s.mass;
    }
    const vcm = Math.hypot(px, py, pz) / mtot / 1000;
    console.log(inputs.map((s, i) => {
      const vKmS = Math.hypot(s.vx, s.vy, s.vz) / 1000;
      const rAU = Math.hypot(s.px, s.py, s.pz) / 1.495978707e11;
      return `  [${i}] m=${(s.mass / MSUN).toFixed(5)} MSun  r=${rAU.toFixed(2)} AU  v=${vKmS.toFixed(2)} km/s`;
    }).join('\n'));
    console.log(`  NET: ${(mtot / MSUN).toFixed(3)} MSun total, system velocity ${vcm.toFixed(4)} km/s`);
    /* the star's own seeded velocity — barycenterFrame should have handed it
       a real recoil (the planets pull it), not a still point */
    console.log(`  star v = [${inputs[0].vx.toFixed(1)}, ${inputs[0].vy.toFixed(1)}, ${inputs[0].vz.toFixed(1)}] m/s` +
      ` = ${(Math.hypot(inputs[0].vx, inputs[0].vy, inputs[0].vz) / 1000).toFixed(4)} km/s`);
  }

  let simDays = 0;
  let worstBody = -1;
  let worstRatio = 1;
  let fired = 0;

  while (simDays < DAYS) {
    driverState.pending = false; /* drive the tick synchronously */
    driverTick(bodies, DT_DAYS, simDays);
    simDays += DT_DAYS;
    /* the tick is async (bridge promise); wait for it to land */
    const deadline = Date.now() + 10_000;
    while (driverState.pending && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 5));
    }
    if (driverState.lastError) {
      console.error(`step error at ${simDays}d:`, driverState.lastError);
      break;
    }
    fired++;
    const now = radiiNow();
    /* the star's own excursion, printed as an absolute radius — its seed
       radius is 0, so a ratio is meaningless for it */
    if (simDays % 40 === 0) {
      console.log(`      star r=${now[0].toFixed(2)} scene units (${(now[0] / 52).toFixed(3)} AU)`);
    }
    if (now.length !== base.length) continue;
    for (let i = 0; i < now.length; i++) {
      const ratio = now[i] / base[i];
      if (ratio < worstRatio) { worstRatio = ratio; worstBody = i; }
    }
    if (simDays % 40 === 0) {
      console.log(
        `t=${String(simDays).padStart(4)}d  ` +
        now.slice(1).map((r, i) => `${(r / base[i + 1]).toFixed(2)}`).join(' '),
      );
    }
    /* index 0 is the star: its seed radius is 0 by design (the barycenter
       frame puts it at rest), so the [0.2x, 4x] ratio law cannot apply to
       it — it gets an absolute bound instead (the star never leaves ~1 AU). */
    const law = now.every((r, i) => (i === 0 ? r < 52 : r > base[i] * 0.2 && r < base[i] * 4));
    if (!law) {
      console.error(`\nDETONATION at t=${simDays}d`);
      console.error('  seed:', base.map((r) => r.toFixed(1)).join(' '));
      console.error('  now :', now.map((r) => r.toFixed(1)).join(' '));
      console.error(`  worst: body[${worstBody}] ratio ${worstRatio.toFixed(3)}`);
      process.exit(2);
    }
  }
  console.log(`\n${DAYS} sim-days: NO detonation, no ejection (worst ratio ${worstRatio.toFixed(2)} on body[${worstBody}]), ${fired} steps`);
}

void main();