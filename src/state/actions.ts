/* STATE — actions: THE single mutation surface (R52), since R97 composed
   from actions/ domain files — the import path and the action registry's
   shape are unchanged for every consumer. */
import { realityActions } from './actions/realities';
import { bodyActions } from './actions/bodies';
import { entryActions } from './actions/entries';
import { vaultActions } from './actions/vault';
import { portabilityActions } from './actions/portability';

export const actions = {
  ...realityActions,
  ...portabilityActions,
  ...bodyActions,
  ...entryActions,
  ...vaultActions,
};
