/**
 * ROUND 73 — the THROAT IS NOT SWALLOWED gauntlet.
 *
 * The user's law: the vault Kamui must read as the Kamui — the black hole is
 * the DOOR, and the door must never be eaten by its own jutsu. The live
 * telemetry caught the vacuum gulp draining a hole/vault body's group to
 * ~6%: Eventide shrank to a quarter of itself and vanished whole in the
 * last second before the vault opened ("the black hole totally goes out...
 * then the vault open"). The fix refuses the swallow-subject for hole/vault
 * bodies; planets and galaxies keep the canon drain.
 *
 * Pure-source mirrors of the round's invariants. Checked without a GPU.
 */
import { readFileSync } from 'node:fs';

let failures = 0;
function check(name: string, ok: boolean, detail: unknown) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : detail}`);
  if (!ok) failures++;
}

const engSrc = readFileSync(new URL('../src/engine/engine.ts', import.meta.url), 'utf8');

/* ==== 1. the throat refuses to drain itself ==== */
{
  const guard = /THE THROAT IS NOT SWALLOWED \(R73\)[\s\S]{0,600}if \(home\.data\.kind === 'hole' \|\| home\.data\.kind === 'vault'\) return null;/.test(engSrc);
  check('R73: the swallow resolver refuses hole/vault bodies (the door stays whole)', guard, 'guard missing');

  const planetsKeep = /if \(home\.data\.kind === 'hole' \|\| home\.data\.kind === 'vault'\) return null;[\s\S]{0,120}return home\.group;/.test(engSrc);
  check('R73: planets and inner worlds keep the canon drain', planetsKeep, 'planet drain broken');

  const galaxyKeeps = /if \(this\.galaxyDive\) \{[\s\S]{0,300}return node\.group;/.test(engSrc);
  check('R73: diving galaxies keep the canon drain', galaxyKeeps, 'galaxy drain broken');
}

/* ==== 2. the gulp itself is untouched — the throat still completes ==== */
{
  const surge = /this\.kamuiSwallowGroup = this\.resolveKamuiGroup\(\);/.test(engSrc)
    && /pu\.uVac\.value = t;/.test(engSrc)
    && /this\.kamuiShakeT = 1;/.test(engSrc);
  check('R73: the vacuum surge, rumble and uVac still play for every summon', surge, 'gulp machinery drifted');

  const writers = /this\.kamuiSwallowFactorFor\(b\.group\)\);/.test(engSrc)
    && /this\.kamuiSwallowFactorFor\(p\.group\)\);/.test(engSrc);
  check('R73: the scale writers still compose the drain for swallowable subjects', writers, 'scale writer drifted');
}

console.log(failures === 0 ? '\nR73 THROAT GAUNTLET — ALL GREEN' : `\nR73 THROAT GAUNTLET — ${failures} RED`);
process.exit(failures === 0 ? 0 : 1);
