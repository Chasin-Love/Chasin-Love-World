/**
 * ROUND 75 — THE UNBROKEN BRIDGE gauntlet.
 *
 * The user's law: the card is alive while the traveler is on the disk, and
 * it must STILL be alive when they arrive at its own buttons — the journey
 * from the disk across the gap to "Dive In" used to kill the card mid-path
 * (the engine reports "not hovering" the moment the rim is crossed, and a
 * 550 ms timer fired even if the pointer was already on the card). The
 * bridge: while a card is visible, the pointer over the card's rect — or in
 * the corridor between the disk's rim and the card — keeps it alive; and
 * the goodbye is honest, re-checking where the pointer RESTS before
 * clearing (a pause emits no events). Alongside: the click discipline the
 * live audit settled — the shell is pointer-events-none throughout, and
 * inside the herald cards only real buttons take clicks.
 *
 * Pure-source mirrors of the round's invariants. Checked without a GPU.
 */
import { readFileSync } from 'node:fs';

let failures = 0;
function check(name: string, ok: boolean, detail: unknown) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : detail}`);
  if (!ok) failures++;
}

const appSrc = readFileSync(new URL('../../src/App.tsx', import.meta.url), 'utf8');
const shellSrc = readFileSync(new URL('../../src/ui/hud/HoloCard.tsx', import.meta.url), 'utf8');
const cards: [string, string][] = [
  ['galaxy card', readFileSync(new URL('../../src/ui/hud/GalaxyHoverCard.tsx', import.meta.url), 'utf8')],
  ['reality card', readFileSync(new URL('../../src/ui/hud/RealityHoverCard.tsx', import.meta.url), 'utf8')],
  ['cluster card', readFileSync(new URL('../../src/ui/hud/ClusterHoverCard.tsx', import.meta.url), 'utf8')],
];

/* ==== 1. THE BRIDGE — the crossing survives, even a full stop ==== */
{
  const refs = /THE UNBROKEN BRIDGE \(R75\)/.test(appSrc) && /hoverDiskRef = useRef/.test(appSrc)
    && /pointerRef = useRef/.test(appSrc);
  check('R75: the bridge state exists (last disk + resting pointer, both in refs)', refs, 'bridge state missing');

  /* R76 reconciliation: the keeper line now also writes the STATE anchor
     (THE STEADY HERALD) — same if(disk) guard, so a null disk still never
     erases the last one. */
  const keeper = /if \(disk\) \{ hoverDiskRef\.current = disk; setHoverDisk\(disk\); \}/.test(appSrc);
  check('R75: a null disk never erases the last one (the corridor stays bridged)', keeper, 'disk ref erased on null');

  const predicate = /const pointerOnBridge = useCallback\(\(x: number, y: number\): boolean/.test(appSrc)
    && /d\.r \+ 48/.test(appSrc)
    && /rc\.left - 8/.test(appSrc);
  check('R75: one shared predicate — card rect (±8) and the rim+48 corridor', predicate, 'bridge predicate missing');

  const restCheck = /pointerRef\.current = \{ x: e\.clientX, y: e\.clientY \};/.test(appSrc)
    && /addEventListener\('pointermove', onMove\)/.test(appSrc);
  check('R75: the window keep-alive feeds the resting pointer and guards the bridge', restCheck, 'keep-alive missing');

  const honest = /const goodbye = useCallback\(\(\) => \{/.test(appSrc)
    && (appSrc.match(/setTimeout\(goodbye, 550\)/g) ?? []).length >= 3
    && /if \(p && pointerOnBridge\(p\.x, p\.y\)\) \{/.test(appSrc);
  check('R75: the honest goodbye — every arm re-checks the resting place, still-bridged re-arms', honest, 'goodbye not honest');

  const singleExit = /const clearHoverCard = useCallback/.test(appSrc)
    && (appSrc.match(/clearHoverCard\(\)/g) ?? []).length === 1;
  check('R75: one shared clear path (the goodbye is its only caller)', singleExit, 'goodbye path fragmented');
}

/* ==== 2. THE CLICK DISCIPLINE — only real buttons take clicks ==== */
{
  const shellNone = /className="holo-card fixed z-50 pointer-events-none select-none"/.test(shellSrc);
  check('R75: the herald shell root is pointer-events-none (clicks pass through)', shellNone, 'shell root takes clicks');

  for (const [name, src] of cards) {
    let rogue = 0;
    for (const m of src.matchAll(/pointer-events-auto/g)) {
      const i = m.index ?? 0;
      const before = src.slice(Math.max(0, i - 400), i);
      const tag = [...before.matchAll(/<(button|div|span|a|p|h\d)\b/g)].pop();
      if (!tag || tag[1] !== 'button') rogue++;
    }
    check(`R75: every clickable region in the ${name} is a real button`, rogue === 0, `${rogue} non-button taker(s)`);
  }

  const stemSvg = /className="fixed inset-0 z-40 pointer-events-none"/.test(shellSrc);
  check('R75: the stem overlay never intercepts (svg is pointer-events-none)', stemSvg, 'stem steals hover');
}

console.log(failures === 0 ? '\nR75 BRIDGE GAUNTLET — ALL GREEN' : `\nR75 BRIDGE GAUNTLET — ${failures} RED`);
process.exit(failures === 0 ? 0 : 1);
