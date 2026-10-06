/* R107 — the raymarch breaker must measure visible wall-frame cost, not the
   physics delta capped at 50 ms. Keep its 55 ms / 180-frame / three-strike
   contract, and discard hidden-tab suspension gaps. */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const engine = readFileSync(path.join(ROOT, 'src/engine/engine.ts'), 'utf8');
const blackHole = readFileSync(path.join(ROOT, 'src/engine/blackhole/BlackHoleSystem.ts'), 'utf8');
let failed = 0;
function check(name: string, ok: boolean): void {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}

check('physics delta stays capped independently at 50 ms', /const dt = Math\.min\(0\.05, rawDt\)/.test(engine));
check('the 55 ms breaker receives capped wall-frame time', /guardRaymarch\(wallDt\)/.test(engine) && !/guardRaymarch\(dt\)/.test(engine));
check('wall-frame samples remain capped at 500 ms for long stalls', /const wallDt = Math\.min\(0\.5, rawDt\)/.test(engine));
check('hidden-tab gaps clear both breaker accumulators', /document\.hidden[\s\S]{0,140}_rmGuardFrames = 0;[\s\S]{0,80}_rmGuardAccum = 0;/.test(blackHole));
check('the original 55 ms threshold and 180-frame window remain', /_rmGuardFrames < 180/.test(blackHole) && /avg > 0\.055/.test(blackHole));
check('three strikes still permanently disarm only the current session', /raymarchFlaps >= 3/.test(blackHole) && /frame-budget-3-strikes/.test(blackHole));

console.log(failed ? `\n● R107 FRAME-BUDGET GAUNTLET RED — ${failed} check(s) failed` : '\n● R107 FRAME-BUDGET GAUNTLET GREEN');
if (failed) process.exitCode = 1;
