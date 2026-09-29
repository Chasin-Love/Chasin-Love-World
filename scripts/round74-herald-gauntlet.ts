/**
 * ROUND 74 — THE HOLOGRAPHIC HERALD gauntlet.
 *
 * The user's laws: the hover card pops only when the pointer is actually ON
 * the object's visible disk (the old colliders were 1.35–1.8× the visual),
 * the card must stand OUTSIDE that disk so the object stays visible and
 * clickable (it used to anchor on the cursor — on top of the galaxy), and
 * the whole thing should read as a cool 3D-animated dashboard.
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
const shellSrc = readFileSync(new URL('../src/ui/hud/HoloCard.tsx', import.meta.url), 'utf8');
const cssSrc = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const appSrc = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const galaxyCard = readFileSync(new URL('../src/ui/hud/GalaxyHoverCard.tsx', import.meta.url), 'utf8');
const realityCard = readFileSync(new URL('../src/ui/hud/RealityHoverCard.tsx', import.meta.url), 'utf8');
const clusterCard = readFileSync(new URL('../src/ui/hud/ClusterHoverCard.tsx', import.meta.url), 'utf8');

/* ==== 1. THE HONEST DISK — colliders match the visible object ==== */
{
  const webGalaxy = /new THREE\.SphereGeometry\(radius, 12, 10\)/.test(engSrc) && !/SphereGeometry\(radius \* 1\.35/.test(engSrc);
  check('R74: the web-side galaxy collider IS the disc (1.35× retired)', webGalaxy, 'collider drifted');

  const mvGalaxy = /new THREE\.SphereGeometry\(size \* 0\.12, 10, 10\)/.test(engSrc) && !/size \* 0\.18, 10, 10/.test(engSrc);
  check('R74: the multiverse galaxy collider hugs its visible glow (0.18× retired)', mvGalaxy, 'collider drifted');

  const bubble = /anchorScale: 2\.6/.test(engSrc);
  check('R74: the reality bubble herald clears the whole glass (2.6× anchor)', bubble, 'anchor scale missing');
}

/* ==== 2. THE HERALD\'S DISK — the projected anchor ==== */
{
  const contract = /onHover: \(id: string \| null, x\?: number, y\?: number, disk\?: \{ cx: number; cy: number; r: number \} \| null\) => void;/.test(engSrc);
  check('R74: the onHover contract carries the projected disk', contract, 'contract missing');

  const resolver = /private hoverDiskOf\(\): \{ cx: number; cy: number; r: number \} \| null \{/.test(engSrc);
  check('R74: the projected-disk resolver exists (center + rim in CSS px)', resolver, 'resolver missing');

  const ride = /this\.clockT - this\.hoverAnchorT > 0\.12/.test(engSrc);
  check('R74: the card rides an orbiting object (~8 Hz disk re-emit)', ride, 're-emit missing');
}

/* ==== 3. THE HOLOGRAPHIC HERALD — the shell ==== */
{
  const shell = /THE HOLOGRAPHIC HERALD \(R74\)/.test(shellSrc) && /placeHoloCard/.test(shellSrc)
    && /pointer-events-none/.test(shellSrc)
    && /holo-card-border/.test(shellSrc);
  check('R74: the shared herald shell exists (placement + stem + holo border)', shell, 'shell missing');

  const css = /@property --holo-angle/.test(cssSrc) && /holoCardIn/.test(cssSrc)
    && /holoSpin/.test(cssSrc) && /holoSheen/.test(cssSrc);
  check('R74: the 3D entrance, spinning holo border and sheen are in the stylesheet', css, 'css family missing');

  const stem = /holo-stem-flow/.test(cssSrc) && /holo-stem-dot/.test(cssSrc);
  check('R74: the stem plugs the card into the disk rim (flowing dash + dot)', stem, 'stem missing');
}

/* ==== 4. every herald wears the shell; none stands on its object ==== */
{
  const wired = /HoloCardShell/.test(galaxyCard) && /HoloCardShell/.test(realityCard) && /HoloCardShell/.test(clusterCard);
  check('R74: galaxy, reality and cluster cards all ride the herald shell', wired, 'a card missed the shell');

  const noCursorAnchor = !/screenPos\.x \+ 24/.test(galaxyCard) && !/screenPos\.x \+ 24/.test(realityCard) && !/screenPos\.x \+ 24/.test(clusterCard);
  check('R74: the old on-the-cursor anchor is retired from every card', noCursorAnchor, 'cursor anchor remains');

  const clusterClean = !/pointer-events-auto w-\[400px\]/.test(clusterCard);
  check('R74: the cluster card no longer steals every click over it', clusterClean, 'root still pointer-events-auto');

  const appWired = (appSrc.match(/disk=\{hoverDisk\}/g) ?? []).length === 3
    && /setHoverDisk\(disk \?\? null\)/.test(appSrc);
  check('R74: App carries the disk state into all three cards', appWired, 'App wiring incomplete');
}

console.log(failures === 0 ? '\nR74 HERALD GAUNTLET — ALL GREEN' : `\nR74 HERALD GAUNTLET — ${failures} RED`);
process.exit(failures === 0 ? 0 : 1);
