/* STATE — actions/shared (R97): the support helpers + the module-level
   machinery every actions domain shares. Extracted verbatim from the old
   actions.ts monolith. */
    import type { GalaxyData } from '../../realities/hierarchyTypes';
    import type { VaultFile } from '../../domain/vault';
    import { state, bucket, newId, listeners, refreshSnapshot } from '../store';
    import { persistState } from '../persist';
    import { getReality, RAW_REALITIES, computeAllRealities, setRuntimeRealities, folderNameForReality, deriveFolderName, RealityMetaOverride } from '../../realities';
    import { delPayload } from '../../vault';
    import { isDesktop } from '../../platform/desktop/adapter';
    import { toast } from '../../ui/toast';

export const DAY_MS = 86400000;

export function notify() {
  refreshSnapshot();
  persistState();
  listeners.forEach((listener) => listener());
}

/** Publishes to React without touching localStorage — used by the high
    frequency diskSync telemetry (3s poll) so storage isn't hammered. */
export function notifyNoPersist() {
  refreshSnapshot();
  listeners.forEach((listener) => listener());
}

export function audit(msg: string) {
  state.audit = [...state.audit.slice(-199), { t: Date.now(), msg }];
}

export type PayloadImportStatus = {
  available: Set<string>;
  missing: Set<string>;
};

function shadowReferencesFiles(fileIds: Set<string>): boolean {
  return bucket().efs.shadows.some((shadow) => Object.values(shadow.tree).some((node) =>
    node.type === 'file' && Boolean(node.fileId) && fileIds.has(node.fileId!),
  ));
}

/** Delete only payload refs no longer reachable from live, trash, or shadows. */
export function deleteUnreferencedPayloads(records: VaultFile[]): void {
  const refs = new Set(records.map((file) => file.payloadRef).filter((ref): ref is string => Boolean(ref)));
  if (!refs.size) return;
  refs.forEach((ref) => {
    const removedIdsForRef = new Set(records.filter((file) => file.payloadRef === ref).map((file) => file.id));
    const referencesRemovedLive = (file: VaultFile) => file.dedupOf !== undefined && removedIdsForRef.has(file.dedupOf);
    const referencesRemovedTrash = (trash: { item: VaultFile }) => referencesRemovedLive(trash.item);
    const referencedByLive = bucket().vault.some((file) => file.payloadRef === ref || referencesRemovedLive(file));
    const referencedByTrash = bucket().vaultTrash.some((trash) => trash.item.payloadRef === ref || referencesRemovedTrash(trash));
    if (!referencedByLive && !referencedByTrash && !shadowReferencesFiles(removedIdsForRef)) {
      void delPayload(ref).catch(() => undefined);
    }
  });
}

/* =============================== actions ================================= */

/** Rebuilds the runtime reality list from every user override — the single
    source of truth the 3D multiverse scene renders from. */
export function recomputeRealities() {
  setRuntimeRealities(
    computeAllRealities(
      state.customRealities,
      state.deletedRealityIds,
      state.customRealityDescriptions,
      state.customGalaxies,
      state.customRealityMeta as Record<string, RealityMetaOverride>
    )
  );
}

/** Materializes a reality's editable roster: the first galaxy edit copies the
    generated defaults into state so they become fully user-owned. */
export function editableGalaxyRoster(realityId: string): GalaxyData[] {
  if (!state.customGalaxies) state.customGalaxies = {};
  if (!state.customGalaxies[realityId]) {
    /* R102 — a roster edit against a collapsed reality seeds from nothing */
    const generated = getReality(realityId, state.customRealityDescriptions)?.galaxies ?? [];
    state.customGalaxies[realityId] = generated.map((g) => ({ ...g }));
  }
  return state.customGalaxies[realityId];
}

export function commitGalaxyRoster(realityId: string, roster: GalaxyData[], note: string) {
  state.customGalaxies = { ...(state.customGalaxies ?? {}), [realityId]: roster };
  recomputeRealities();
  audit(note);
  notify();
}

/** Best-known disk folder for a reality: the recorded state map → the
    build-time map for base realities → the display name (server sanitizes). */
export function diskFolderFor(realityId: string, displayName?: string): string | undefined {
  return state.realityFolders?.[realityId] ?? folderNameForReality(realityId) ?? displayName;
}

/** Proposes a fresh, collision-free folder name for a new reality. */
export function uniqueFolderFor(name: string, realityId: string): string {
  const base = deriveFolderName(name);
  const used = new Set<string>(Object.values(state.realityFolders ?? {}));
  for (const r of RAW_REALITIES) {
    const f = folderNameForReality(r.id);
    if (f) used.add(f);
  }
  for (const f of state.diskSync?.activeFolders ?? []) used.add(f);
  if (!used.has(base)) return base;
  const suffix = realityId.split('-').slice(-1)[0] || newId().slice(0, 4);
  return `${base}_${suffix}`;
}

/** Whether a failed disk-mirror mutation should toast a warning. On a plain
    static web deploy the mirror is legitimately absent — the daemon never
    answers, so warning on every reality switch would be pure noise (the
    console tile already shows mirror status passively). Desktop and
    daemon-backed web hosts still get the toast. */
export function mirrorWarnable(): boolean {
  return isDesktop() || state.diskSync?.connected === true;
}

