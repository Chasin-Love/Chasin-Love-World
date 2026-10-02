/* R97 — THE STATE UNION SOURCE. The actions split (R97 commit 7) moved the
   mutation surface's method bodies out of actions.ts into actions/ domain
   files; the gauntlets' source pins must stay honest over the WHOLE state
   family, not just the barrel. Joins the barrel, the shared support module,
   and every actions domain file (fixed order) into one text — verbatim pins,
   whole-file count pins and absence pins all evaluate over the union, exactly
   as they did over the pre-R97 monolith. */
import { existsSync, readFileSync } from 'fs';

const STATE_FILES = [
  'state/actions.ts',
  'state/actions/shared.ts',
  'state/actions/realities.ts',
  'state/actions/bodies.ts',
  'state/actions/entries.ts',
  'state/actions/vault.ts',
  'state/actions/portability.ts',
];

export function stateSource(): string {
  return STATE_FILES.map((p) => {
    const url = new URL(`../../src/${p}`, import.meta.url);
    return existsSync(url) ? readFileSync(url, 'utf8') : '';
  }).join('\n');
}
