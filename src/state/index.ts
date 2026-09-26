/* STATE — public surface (R52). The old 1,785-line state.ts became this
   folder; every consumer keeps importing './state' unchanged. */
import { initState } from './store';
import { loadState, externalizeLargeDiaryAttachments } from './persist';

export { newId, getState, subscribe, useUniverse } from './store';
export { hydrateDesktopSnapshot } from './persist';
export { actions } from './actions';

initState(loadState());
queueMicrotask(() => void externalizeLargeDiaryAttachments());
