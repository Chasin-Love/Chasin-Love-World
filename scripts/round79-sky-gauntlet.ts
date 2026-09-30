/**
 * ROUND 79 — THE ONE SKY gauntlet.
 *
 * The author's laws, in their words: the realities are totally isolated and
 * the sky is ONE thing — "there shouldn't be two different different sky or
 * two different layers of sky… there should be only one at a time". The
 * sky is full-screen at every stage — "we should zoom through the stages of
 * the universe… not the background sky". And a photo sky must not split the
 * screen — "a barrier type of bar or the straight line… one side totally
 * like the original photo, another side a bit darker a bit grayer".
 *
 * Pure-source mirrors of the round's invariants. Checked without a GPU.
 */
import { readFileSync } from 'node:fs';

let failures = 0;
function check(name: string, ok: boolean, detail: unknown) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${ok ? '' : detail}`);
  if (!ok) failures++;
}

const domeSrc = readFileSync(new URL('../src/engine/surface/photoDome.ts', import.meta.url), 'utf8');
const surfaceSrc = readFileSync(new URL('../src/engine/surface/UniverseSurfaceManager.ts', import.meta.url), 'utf8');
const engSrc = readFileSync(new URL('../src/engine/engine.ts', import.meta.url), 'utf8');
const registrySrc = readFileSync(new URL('../src/platform/sky/skyRegistry.ts', import.meta.url), 'utf8');
const storeSrc = readFileSync(new URL('../server/skyStore.ts', import.meta.url), 'utf8');
const rustSrc = readFileSync(new URL('../src-tauri/src/sky.rs', import.meta.url), 'utf8');
const pkgSrc = readFileSync(new URL('../package.json', import.meta.url), 'utf8');

/* ==== 1. THE SEAM DIES — no UV-space vignette, no mip collapse ==== */
{
  const seamFree = !/length\(lensUv\s*-\s*0\.5\)/.test(domeSrc)
    && /dot\(normalize\(vDir\),\s*uCamDir\)/.test(domeSrc);
  check('R79: the vignette is camera-relative (uCamDir), never UV-space', seamFree, 'UV vignette or missing uCamDir');

  const noMips = /generateMipmaps\s*=\s*false/.test(domeSrc)
    && /minFilter\s*=\s*THREE\.LinearFilter/.test(domeSrc);
  check('R79: the photo texture is mip-free — no gray line at the branch cut', noMips, 'mipmap law missing');
}

/* ==== 2. THE SKY RIDES THE CAMERA — full-screen at every stage ==== */
{
  const ride = /group\.position\.copy\(params\.camPos\)/.test(domeSrc)
    && /params\.camera\.getWorldPosition\(this\._camPos\)/.test(surfaceSrc)
    && /params\.camera\.getWorldDirection\(this\._camDir\)/.test(surfaceSrc);
  check('R79: the photo dome is fed the camera every frame (position + forward)', ride, 'camera feed missing');
}

/* ==== 3. ONE SKY AT A TIME — the procedural family stands down ==== */
{
  const gate = /const photoOwns = this\.photoDome\.hasPhoto && skyVisible && this\.photoDome\.strength > 0\.995;/.test(surfaceSrc);
  check('R79: the one-sky gate exists (hasPhoto × skyVisible × full strength)', gate, 'gate missing');

  const family = /this\.skyDomeMesh\.visible = skyVisible && !photoOwns;/.test(surfaceSrc)
    && /this\.farStarsPoints\.visible = !photoOwns;/.test(surfaceSrc)
    && /neb\.visible = !photoOwns;/.test(surfaceSrc)
    && /this\.gNeighborhood\.visible = neighborhoodVisibility > 0\.01 && !photoOwns;/.test(surfaceSrc);
  check('R79: dome, far stars, deep nebulae and neighborhood all stand down together', family, 'a layer still leaks');

  const noGhost = !/0\.06 \* uFade/.test(domeSrc);
  check('R79: the 6% ghost floor is gone — no procedural bleed by construction', noGhost, 'ghost floor remains');

  const noGlow = !/uGlowColor/.test(domeSrc) && !/getPhotoDome\(\)\.apply\(\s*[^)]*,/.test(engSrc);
  check('R79: the photo renders as itself — no cosmos glow tint', noGlow, 'glow tint remains');

  const smoothExit = /if \(!spec && \(u\.uHasMap\.value as number\) > 0\.5\) \{[\s\S]*?this\.fadeK = 0;/.test(domeSrc);
  check('R79: deactivation rides the fade-out machinery instead of popping', smoothExit, 'hard exit');
}

/* ==== 4. THE CONTRACT — blend 1.0 is the default on every tier ==== */
{
  const aligned = /blend: 1\.0/.test(registrySrc) && /blend: 1\.0/.test(storeSrc) && /blend: 1\.0/.test(rustSrc);
  check('R79: blend defaults to 1.0 in registry, server store and Tauri (contract-identical)', aligned, 'defaults drifted');

  const chain = /round79-sky-gauntlet\.ts/.test(pkgSrc);
  check('R79: the gauntlet sits in the verify chain', chain, 'verify chain missing it');
}

console.log(failures === 0 ? '\nR79 ONE SKY GAUNTLET — ALL GREEN' : `\nR79 ONE SKY GAUNTLET — ${failures} RED`);
process.exit(failures === 0 ? 0 : 1);
