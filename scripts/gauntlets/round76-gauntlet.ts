/**
 * ROUND 76 — THE STEADY HERALD & THE WEB DOOR gauntlet.
 *
 * The author's two laws, verbatim in spirit: the hover card must be stable
 * enough to ROAM — "I can't even roam my cursor on top of this popup… if I
 * want to click the bottom left side I can't, because even before I go
 * there it vanishes" — and clicking a reality sphere must start the KAMUI
 * and arrive on the COSMIC WEB, "it takes us directly to stellar system,
 * which is a problem from lack of logic".
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
const engSrc = readFileSync(new URL('../../src/engine/engine.ts', import.meta.url), 'utf8');

/* ==== 1. THE STEADY HERALD — the anchor survives the crossing ==== */
{
  const steady = /THE STEADY HERALD \(R76\)/.test(appSrc)
    && /if \(disk\) \{ hoverDiskRef\.current = disk; setHoverDisk\(disk\); \}/.test(appSrc);
  check('R76: the disk state is set only by a real disk emission', steady, 'anchor still flaps');

  const retired = !/setHoverDisk\(disk \?\? null\)/.test(appSrc);
  check('R76: the cursor-fallback re-anchor is retired (no jump, no flicker)', retired, 'setHoverDisk(disk ?? null) remains');

  const onlyEraser = /const clearHoverCard = useCallback\(\(\) => \{[\s\S]*?setHoverDisk\(null\);/.test(appSrc);
  check('R76: clearHoverCard remains the only eraser of the disk state', onlyEraser, 'disk cleared elsewhere');

  const cardErasers = (appSrc.match(/setHoverDisk\(null\)/g) ?? []).length === 1;
  check('R76: exactly one setHoverDisk(null) call site (the shared clear)', cardErasers, 'multiple erasers');
}

/* ==== 2. THE WEB DOOR — a reality sphere click is an explicit Kamui ==== */
{
  const door = /THE WEB DOOR \(R76\)/.test(appSrc)
    && /onSelectReality: \(realityId\) => \{[\s\S]*?engineRef\.current\?\.zoomToHierarchy\(2\);/.test(appSrc);
  check('R76: clicking a reality sphere fires zoomToHierarchy(2) — the Kamui carrier', door, 'web door missing');

  const noHomeDive = !/onSelectReality: \(realityId\) => \{[\s\S]{0,400}?resetView\(\)/.test(appSrc);
  check('R76: the reality click never dives to the home stellar system again', noHomeDive, 'resetView still on the door');

  const carrier = /if \(this\.cosmicStage === 'multiverse'\) \{\s*\n\s*this\.beginStageWarp\('toWeb', dial, \(\) => \{/.test(engSrc);
  check('R76: the staged warp carries multiverse → web (R72 machine untouched)', carrier, 'carrier missing');

  const webDial = /HIERARCHY_DIALS\[stageIndex\] \?\? 0\.15/.test(engSrc);
  check('R76: the landing dial comes from the shared stage table', webDial, 'dial drifted');
}

/* ==== 3. THE BRIDGE ENDURES — R75\'s honest goodbye untouched ==== */
{
  const honest = /const goodbye = useCallback\(\(\) => \{/.test(appSrc)
    && /if \(p && pointerOnBridge\(p\.x, p\.y\)\) \{/.test(appSrc)
    && /pointerRef\.current = \{ x: e\.clientX, y: e\.clientY \};/.test(appSrc);
  check('R76: the honest goodbye and the resting-pointer feed survive', honest, 'bridge regressed');
}

console.log(failures === 0 ? '\nR76 STEADY HERALD GAUNTLET — ALL GREEN' : `\nR76 STEADY HERALD GAUNTLET — ${failures} RED`);
process.exit(failures === 0 ? 0 : 1);
