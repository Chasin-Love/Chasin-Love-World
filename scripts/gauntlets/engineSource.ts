/* R97 — THE ENGINE UNION SOURCE.
   The engine decomposition (R97) moves cohesive subsystems out of engine.ts into
   sibling modules; the gauntlets' source pins must stay honest over the WHOLE
   engine family, not just the shrinking shell. This helper joins engine.ts and
   every engine subsystem module (fixed order, shell first) into one text.
   Verbatim pins, whole-file count pins, and absence pins all evaluate over the
   union — exactly as they did over the pre-R97 monolith. Files that do not
   exist yet read as empty, so this works before, during, and after the split. */
import { existsSync, readFileSync } from 'fs';

const ENGINE_FILES = [
  'engine/engine.ts',
  'engine/sky/SkyFxSystem.ts',
  'engine/blackhole/BlackHoleSystem.ts',
  'engine/kamui/KamuiPortalSystem.ts',
  'engine/worlds/InnerGalaxySystem.ts',
  'engine/worlds/BodyBuilders.ts',
  'engine/stages/LevelStageSystem.ts',
];

export function engineSource(): string {
  return ENGINE_FILES.map((p) => {
    const url = new URL(`../../src/${p}`, import.meta.url);
    return existsSync(url) ? readFileSync(url, 'utf8') : '';
  }).join('\n');
}
