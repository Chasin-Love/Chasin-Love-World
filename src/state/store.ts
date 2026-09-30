/* STATE — observable store core (R52: split out of the 1,785-line state.ts).
   Owns the single `state` binding (bound once by initState, mutated in place),
   the snapshot derivation, and the React subscription. Persistence lives in
   ./persist, mutations in ./actions; both read state via the live binding. */
import { useSyncExternalStore } from 'react';
import { REALITIES } from '../realities';
import { createVfs, seedVfs } from '../vault';
import { VAULT_HOME_FOLDERS } from '../vault/storage/seeds';
import type { DiskSyncState, RealityBucket, UniverseState, CosmicBody, DiaryEntry } from '../domain/universe';


export const EMPTY_DISK_SYNC: DiskSyncState = {
  connected: false,
  lastSyncTime: 0,
  scanCount: 0,
  activeFolders: [],
  binDetails: [],
  operationsLog: [],
  pendingOps: 0,
  lastError: null,
};

export function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return (
      'id-' +
      Math.random().toString(36).slice(2) +
      Date.now().toString(36)
    );
  }
}

let descCache: { json: string; view: Record<string, string> } = { json: '{}', view: {} };
/* the one mutable root — bound exactly once by initState() */
export let state: UniverseState = { realities: {} } as unknown as UniverseState;
let snapshot: UniverseState = state;
export const listeners = new Set<() => void>();

/** Bind the real initial state (index.ts calls this once at boot). */
export function initState(initial: UniverseState): void {
  state = initial;
  snapshot = createSnapshot(state);
}
/** Recompute the snapshot from the current state (notify + persist use this). */
export function refreshSnapshot(): void { snapshot = createSnapshot(state); }
function getSnapshot(): UniverseState { return snapshot; }
/** Rebind the root (reset/import flows) — the only place state is reassigned. */
export function rebindState(next: UniverseState): void {
  state = next;
  snapshot = createSnapshot(state);
}

export function emptyBucket(): RealityBucket {
  return {
    bodies: [],
    entries: [],
    connections: [],
    vault: [],
    vaultTrash: [],
    efs: createVfs(),
  };
}

/** Lazy container materialization: a bucket for a reality with no stored
    content yet is seeded from its config's bodies/entries (the world cast it
    was forged with) and gets a FRESH EMPTY vault — realities are isolated by
    construction and new ones start with an empty black hole. */
export function ensureBucket(realityId: string): RealityBucket {
  const id = realityId || 'sol-prime';
  if (!state.realities) state.realities = {};
  if (!state.realities[id]) {
    const cfg = REALITIES.find((r) => r.id === id) ?? state.customRealities?.find((r: any) => r.id === id);
    const efs = createVfs();
    /* every reality is born with the home folders of a fresh OS —
       a File Manager is a window onto storage, and storage should
       never open as an empty void */
    seedVfs(efs, VAULT_HOME_FOLDERS);
    state.realities[id] = {
      bodies: cfg ? cfg.bodies.map((b: CosmicBody) => ({ ...b })) : [],
      entries: cfg ? (cfg.entries ?? []).map((e: DiaryEntry) => ({ ...e })) : [],
      connections: [],
      vault: [],
      vaultTrash: [],
      efs,
    };
  }
  return state.realities[id];
}

/** The active reality's container — every action writes here. */
export function bucket(): RealityBucket {
  return ensureBucket(state.activeRealityId || 'sol-prime');
}

export function createSnapshot(s: UniverseState): UniverseState {
  const active = s.realities?.[s.activeRealityId || 'sol-prime'] ?? emptyBucket();
  const descJson = JSON.stringify(s.customRealityDescriptions ?? {});
  if (descJson !== descCache.json) {
    descCache = { json: descJson, view: { ...(s.customRealityDescriptions ?? {}) } };
  }
  return {
    ...s,
    /* derived views of the active reality's container — the whole app reads
       these and therefore only ever sees the active reality's world */
    bodies: [...active.bodies],
    entries: [...active.entries],
    connections: [...active.connections],
    vault: [...active.vault],
    vaultTrash: [...active.vaultTrash],
    efs: active.efs
      ? { ...active.efs, nodes: { ...active.efs.nodes }, shadows: [...active.efs.shadows], super: { ...active.efs.super } }
      : createVfs(),
    customRealityDescriptions: descCache.view,
    customRealities: s.customRealities ? [...s.customRealities] : [],
    deletedRealityIds: s.deletedRealityIds ? [...s.deletedRealityIds] : [],
    binRealities: s.binRealities ? [...s.binRealities] : [],
    customGalaxies: s.customGalaxies
      ? Object.fromEntries(Object.entries(s.customGalaxies).map(([k, v]) => [k, [...v]]))
      : {},
    customRealityMeta: s.customRealityMeta
      ? Object.fromEntries(Object.entries(s.customRealityMeta).map(([k, v]) => [k, { ...v }]))
      : {},
    realityFolders: { ...(s.realityFolders ?? {}) },
    diskSync: s.diskSync ?? EMPTY_DISK_SYNC,
    vaultUsers: [...s.vaultUsers],
    audit: [...s.audit],
  };
}

export function getState(): UniverseState {
  return snapshot;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useUniverse(): UniverseState {
  return useSyncExternalStore(subscribe, getState, getState);
}
