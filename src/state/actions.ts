/* STATE — actions (R52): the single mutation surface (~60 mutators + support
   helpers). Reads the live state binding from ./store; every change funnels
   through notify() → refreshSnapshot + persistState. */
import type { GalaxyData } from '../realities/hierarchyTypes';
import type { UniverseState, DiaryEntry, CosmicBody, BodyKind, Meaning, DiskSyncState, BinFolderInfo, Attachment } from '../domain/universe';
import type { VaultFile, VfsNode, FileVersion, VaultSecrets, VfsShadow, EfsScrubReport } from '../domain/vault';
import { VAULT_HOME_FOLDERS } from '../vault/storage/seeds';
import { state, bucket, ensureBucket, newId, listeners, refreshSnapshot, EMPTY_DISK_SYNC, rebindState } from './store';
import { persistState, externalizeLargeDiaryAttachments, STORAGE_KEY, primeState, sanitizeDiaryEntries, normalizeVaultFiles, normalizeLegacyLock } from './persist';
import { STORAGE_KEYS } from '../platform/storageKeys';
import { getReality, REALITIES, RAW_REALITIES, computeAllRealities, setRuntimeRealities, createGalaxyData, folderNameForReality, deriveFolderName, RealityMetaOverride, RealityConfig, inclinedOrbitElements } from '../realities';
import {
  delLocalPayload, delPayload, getPayload, 
  procPalette, procRadius,
  createInitialSeed, seedBodies,
  sanitizeDiaryHtml,
  createVfs, efsAddFileNode, efsBump, efsChildren, efsCreateShadow, efsDedup,
  efsDeleteShadow, efsMkdir, efsMove, efsNodeOf, efsPathString, efsRename,
  efsScrub, efsSubtreeIds, efsHeal, efsUniqueName, EFS_ROOT, migrateLegacyVault,
  seedVfs,
} from '../vault';
import { realityApi, syncedRealityApi, isDesktop } from '../platform/desktop/adapter';
import { toast } from '../ui/toast';

const DAY_MS = 86400000;

function notify() {
  refreshSnapshot();
  persistState();
  listeners.forEach((listener) => listener());
}

/** Publishes to React without touching localStorage — used by the high
    frequency diskSync telemetry (3s poll) so storage isn't hammered. */
function notifyNoPersist() {
  refreshSnapshot();
  listeners.forEach((listener) => listener());
}

function audit(msg: string) {
  state.audit = [...state.audit.slice(-199), { t: Date.now(), msg }];
}

type PayloadImportStatus = {
  available: Set<string>;
  missing: Set<string>;
};

function shadowReferencesFiles(fileIds: Set<string>): boolean {
  return bucket().efs.shadows.some((shadow) => Object.values(shadow.tree).some((node) =>
    node.type === 'file' && Boolean(node.fileId) && fileIds.has(node.fileId!),
  ));
}

/** Delete only payload refs no longer reachable from live, trash, or shadows. */
function deleteUnreferencedPayloads(records: VaultFile[]): void {
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
function recomputeRealities() {
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
function editableGalaxyRoster(realityId: string): GalaxyData[] {
  if (!state.customGalaxies) state.customGalaxies = {};
  if (!state.customGalaxies[realityId]) {
    const generated = getReality(realityId, state.customRealityDescriptions).galaxies ?? [];
    state.customGalaxies[realityId] = generated.map((g) => ({ ...g }));
  }
  return state.customGalaxies[realityId];
}

function commitGalaxyRoster(realityId: string, roster: GalaxyData[], note: string) {
  state.customGalaxies = { ...(state.customGalaxies ?? {}), [realityId]: roster };
  recomputeRealities();
  audit(note);
  notify();
}

/** Best-known disk folder for a reality: the recorded state map → the
    build-time map for base realities → the display name (server sanitizes). */
function diskFolderFor(realityId: string, displayName?: string): string | undefined {
  return state.realityFolders?.[realityId] ?? folderNameForReality(realityId) ?? displayName;
}

/** Proposes a fresh, collision-free folder name for a new reality. */
function uniqueFolderFor(name: string, realityId: string): string {
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
function mirrorWarnable(): boolean {
  return isDesktop() || state.diskSync?.connected === true;
}

export const actions = {
  /* -------------------------- Multiverse & Lore -------------------------- */
  switchReality(realityId: string) {
    const r = getReality(realityId, state.customRealityDescriptions);
    /* a pure pointer flip: every reality owns its world container, so the
       derived views re-point and nothing is reseeded, lost, or leaked */
    state.activeRealityId = r.id;
    ensureBucket(r.id);
    audit(`[Dimensional Barrier] Quantum resonance shifted to Reality: ${r.name}`);
    notify();
    void actions.exportRealityData(r.id); /* keep the reality folder's data.json current */
  },

  updateRealityDescription(realityId: string, description: string) {
    if (!state.customRealityDescriptions) state.customRealityDescriptions = {};
    state.customRealityDescriptions[realityId] = description.trim();
    const r = REALITIES.find((x) => x.id === realityId);
    if (r) r.description = description.trim();
    audit(`Updated lore for Reality: ${r ? r.name : realityId}`);
    notify();
  },

  /* ------------------- Round 14 — Physics Visualization ------------------- */
  /* Both toggles persist with the universe; an absent flag reads as ON, so
     existing saved universes gain Einstein's bent starlight with no migration. */

  setSpacetimeLensing(on: boolean) {
    state.spacetimeLensing = on;
    audit(`[General Relativity] Spacetime lensing ${on ? 'bending the starlight' : 'released'} — ${on ? 'light curves around every mass' : 'light runs straight'}`);
    notify();
  },

  setLivingGravity(on: boolean) {
    state.livingGravity = on;
    audit(`[Universal Gravitation] Living Gravity ${on ? 'awakened' : 'rested — canonical ephemeris healed'}`);
    notify();
  },

  /* R92 — the universe driver (the R91 decree, in shadow). The switch the
     twin card flips: the N-body session takes the rendered sky (real mutual
     gravity, the canon as seed), and the clockwork becomes fallback + heal. */
  setUniverseDriver(on: boolean) {
    state.universeDriver = on;
    audit(`[The Real Universe] True N-body gravity ${on ? 'now drives the sky — the clockwork rests as seed, fallback and heal' : 'stands down — the Kepler clockwork takes the sky back'}`);
    notify();
  },

  resetRealityDescription(realityId: string) {
    if (state.customRealityDescriptions) {
      delete state.customRealityDescriptions[realityId];
    }
    const r = REALITIES.find((x) => x.id === realityId);
    const raw = RAW_REALITIES.find((x) => x.id === realityId);
    if (r && raw) r.description = raw.description;
    audit(`Reset description for Reality: ${r ? r.name : realityId}`);
    notify();
  },

  /** Rename / recolor / reclassify any reality (base or custom). */
  updateRealityMeta(realityId: string, patch: NonNullable<UniverseState['customRealityMeta']>[string]) {
    if (!state.customRealityMeta) state.customRealityMeta = {};
    const prev = state.customRealityMeta[realityId] ?? {};
    state.customRealityMeta = {
      ...state.customRealityMeta,
      [realityId]: { ...prev, ...patch },
    };
    recomputeRealities();
    const r = REALITIES.find((x) => x.id === realityId);
    audit(`[Multiverse Nexus] Reweaved reality identity: ${r?.name ?? realityId}`);
    notify();
  },

  renameReality(realityId: string, name: string) {
    if (!name.trim()) return;
    const cleanName = name.trim();
    actions.updateRealityMeta(realityId, { name: cleanName });

    // Synchronize folder renaming to backend disk (folder-aware matching)
    const folderName = diskFolderFor(realityId);
    void realityApi<{ success?: boolean; newFolderName?: string }>(
      '/api/realities/rename-folder',
      { realityId, newName: cleanName, folderName }
    ).then((res) => {
      if (res?.success && res.newFolderName) {
        actions.rememberRealityFolder(realityId, res.newFolderName);
      } else if (!res?.success) {
        if (mirrorWarnable()) toast(`⚠ "${cleanName}" renamed in the multiverse — the disk folder rename will retry`, 'warn');
        void syncedRealityApi('/api/realities/rename-folder', { realityId, newName: cleanName, folderName });
      }
    });
  },

  async createReality(newReality: RealityConfig) {
    if (!state.customRealities) state.customRealities = [];
    state.customRealities = [...state.customRealities.filter((x) => x.id !== newReality.id), newReality];
    // If it was previously in bin, remove from bin
    if (state.binRealities) {
      state.binRealities = state.binRealities.filter((b) => b.id !== newReality.id);
    }
    if (state.deletedRealityIds) {
      state.deletedRealityIds = state.deletedRealityIds.filter((id) => id !== newReality.id);
    }
    recomputeRealities();
    /* seed the reality's world container from its forged config — the worlds
       are real and clickable from the first visit; the black hole vault starts
       fresh (total isolation) but WITH the home folders of a fresh OS, so its
       File Manager opens as a real file system, never a void */
    state.realities = state.realities ?? {};
    const newEfs = createVfs();
    seedVfs(newEfs, VAULT_HOME_FOLDERS);
    state.realities[newReality.id] = {
      bodies: newReality.bodies.map((b) => ({ ...b })),
      entries: (newReality.entries ?? []).map((e) => ({ ...e })),
      connections: [],
      vault: [],
      vaultTrash: [],
      efs: newEfs,
    };
    audit(`[Multiverse Nexus] Manifested new parallel reality: ${newReality.name}`);
    notify();

    // Disk mirror: propose the folder name ourselves so every later bin
    // operation can address it exactly; the server sanitizes + confirms it.
    const proposed = uniqueFolderFor(newReality.name, newReality.id);
    const res = await realityApi<{ success?: boolean; folderName?: string }>(
      '/api/realities/create-folder',
      { ...newReality, folderName: proposed }
    );
    if (res?.success) {
      actions.rememberRealityFolder(newReality.id, res.folderName ?? proposed);
      void actions.exportRealityData(newReality.id);
    } else {
      if (mirrorWarnable()) toast(`⚠ "${newReality.name}" exists in the multiverse, but its disk folder could not be created — the sync engine will retry`, 'warn');
      void syncedRealityApi('/api/realities/create-folder', { ...newReality, folderName: proposed });
    }
  },

  async deleteReality(realityId: string) {
    // Protect core default reality from deletion
    if (realityId === 'sol-prime') return;

    const doomedReality = REALITIES.find((r) => r.id === realityId) || RAW_REALITIES.find((r) => r.id === realityId);

    if (!state.deletedRealityIds) state.deletedRealityIds = [];
    if (!state.deletedRealityIds.includes(realityId)) {
      state.deletedRealityIds = [...state.deletedRealityIds, realityId];
    }

    // Preserve in Quantum Bin (Dustbin / Recycle Bin)
    const folderName = diskFolderFor(realityId, doomedReality?.name);
    if (doomedReality) {
      if (!state.binRealities) state.binRealities = [];
      const trashedItem: any = {
        id: doomedReality.id,
        name: doomedReality.name,
        codeName: doomedReality.codeName,
        spectral: doomedReality.spectral,
        colorA: doomedReality.colorA,
        colorB: doomedReality.colorB,
        description: doomedReality.description,
        deletedAt: Date.now(),
        originalConfig: doomedReality,
        folderName,
      };
      state.binRealities = [
        ...state.binRealities.filter((b) => b.id !== realityId),
        trashedItem,
      ];
    }

    if (state.customRealities) {
      state.customRealities = state.customRealities.filter((r) => r.id !== realityId);
    }
    if (state.customRealityDescriptions) {
      delete state.customRealityDescriptions[realityId];
    }
    /* the collapsed reality takes its galaxy roster & identity overrides with it */
    if (state.customGalaxies) {
      const next = { ...state.customGalaxies };
      delete next[realityId];
      state.customGalaxies = next;
    }
    if (state.customRealityMeta) {
      const next = { ...state.customRealityMeta };
      delete next[realityId];
      state.customRealityMeta = next;
    }
    recomputeRealities();
    // If the active reality was deleted, switch back to Sol-Prime
    if (state.activeRealityId === realityId) {
      const fallback = REALITIES[0] || RAW_REALITIES[0];
      state.activeRealityId = fallback.id;
      ensureBucket(fallback.id);
    }
    /* the collapsed reality keeps its world container in the vault of the
       multiverse (restore brings everything back); purge erases it */
    audit(`[Multiverse Nexus] Transferred reality to Quantum Bin: ${doomedReality?.name ?? realityId}`);
    notify();

    // Synchronize disk transfer to src/realities/bin/
    const ok = await syncedRealityApi('/api/realities/bin/move-to-bin', { realityId, folderName });
    if (!ok) {
      if (mirrorWarnable()) toast(`⚠ ${doomedReality?.name ?? realityId} collapsed in the multiverse, but its disk folder could not reach the bin — will retry`, 'warn');
    }
  },

  async restoreReality(realityId: string) {
    if (!state.binRealities) return;
    const trashed = state.binRealities.find((b) => b.id === realityId);
    if (!trashed) return;

    // Remove from deleted and bin rosters
    state.binRealities = state.binRealities.filter((b) => b.id !== realityId);
    if (state.deletedRealityIds) {
      state.deletedRealityIds = state.deletedRealityIds.filter((id) => id !== realityId);
    }

    // If it was custom or original, restore config
    if (trashed.originalConfig) {
      if (!state.customRealities) state.customRealities = [];
      if (!RAW_REALITIES.some((r) => r.id === realityId)) {
        state.customRealities = [...state.customRealities.filter((r) => r.id !== realityId), trashed.originalConfig];
      }
    }

    recomputeRealities();
    audit(`[Multiverse Nexus] Restored reality from Quantum Bin: ${trashed.name}`);
    notify();

    // Synchronize restore on disk — folderName makes the match exact
    const ok = await syncedRealityApi('/api/realities/bin/restore', {
      realityId,
      folderName: diskFolderFor(realityId, trashed.folderName),
    });
    if (ok) {
      if (trashed.folderName) actions.rememberRealityFolder(realityId, trashed.folderName);
    } else {
      if (mirrorWarnable()) toast(`⚠ ${trashed.name} restored in the multiverse, but its disk folder is still in the bin — will retry`, 'warn');
    }
  },

  async purgeRealityFromBin(realityId: string) {
    if (!state.binRealities) return;
    const item = state.binRealities.find((b) => b.id === realityId);
    state.binRealities = state.binRealities.filter((b) => b.id !== realityId);
    /* permanent erase: the reality's world container is destroyed with it */
    if (state.realities && state.realities[realityId]) {
      delete state.realities[realityId];
    }
    audit(`[Multiverse Nexus] Permanently purged reality: ${item?.name ?? realityId}`);
    notify();

    // Permanently wipe on disk
    const ok = await syncedRealityApi('/api/realities/bin/purge', {
      realityId,
      folderName: diskFolderFor(realityId, item?.folderName),
    });
    if (!ok) {
      if (mirrorWarnable()) toast(`⚠ ${item?.name ?? realityId} purged from the bin index, but its disk folder remains — will retry`, 'warn');
    }
  },

  async emptyRealityBin() {
    if (!state.binRealities?.length) return;
    const count = state.binRealities.length;
    const purgedIds = state.binRealities.map((b) => b.id);
    state.binRealities = [];
    /* permanent erase: purge every binned reality's world container */
    if (state.realities) {
      for (const id of purgedIds) delete state.realities[id];
    }
    audit(`[Multiverse Nexus] Emptied Quantum Bin (${count} realities purged)`);
    notify();

    // Empty bin on disk
    const ok = await syncedRealityApi('/api/realities/bin/empty', {});
    if (!ok) {
      if (mirrorWarnable()) toast('⚠ Quantum Bin emptied in the multiverse, but the disk folders could not be cleared — will retry', 'warn');
    }
  },

  /* --------------------- per-reality disk mirror ------------------------- */

  /** Mirrors a reality's world database into its own folder on disk
      (src/realities/<folder>/data.json): config, worlds, diary pages and
      vault metadata — the "everything about this reality in one place"
      contract. Binary vault payloads stay in the encrypted payload store. */
  async exportRealityData(realityId?: string) {
    const id = realityId || state.activeRealityId || 'sol-prime';
    const b = state.realities?.[id];
    if (!b) return;
    /* R83-2 — Sol Prime's data.json is the committed seed's mirror; a stale
       browser generation must never churn it. Skip the write entirely (no
       queue, no retry burn, no toast) — the server and the desktop twin
       refuse it too. */
    if (id === 'sol-prime') return;
    const cfg = REALITIES.find((r) => r.id === id) ?? RAW_REALITIES.find((r) => r.id === id);
    const data = {
      reality: cfg ? {
        id: cfg.id, name: cfg.name, codeName: cfg.codeName, spectral: cfg.spectral,
        description: cfg.description, colorA: cfg.colorA, colorB: cfg.colorB,
        starColor: cfg.starColor, galaxyCountHint: cfg.galaxyCountHint,
      } : { id },
      bodies: b.bodies,
      entries: b.entries,
      connections: b.connections,
      vault: b.vault,
      vaultTrash: b.vaultTrash,
    };
    /* a reliable disk mutation, not a fire-and-forget: data.json IS the
       reality's world database mirror — a dropped write used to vanish until
       the next unrelated switch. The retry queue owns it now. */
    const ok = await syncedRealityApi(
      '/api/realities/write-data',
      { realityId: id, folderName: diskFolderFor(id, cfg?.name), data }
    );
    if (!ok) {
      if (mirrorWarnable()) toast(`⚠ "${cfg?.name ?? id}" world database could not reach its disk folder — will retry`, 'warn');
    }
  },

  /* ------------------------- disk mirror telemetry ----------------------- */

  setDiskSync(patch: Partial<DiskSyncState>) {
    state.diskSync = { ...(state.diskSync ?? EMPTY_DISK_SYNC), ...patch };
    notifyNoPersist();
  },

  rememberRealityFolder(realityId: string, folder: string) {
    if (state.realityFolders?.[realityId] === folder) return;
    state.realityFolders = { ...(state.realityFolders ?? {}), [realityId]: folder };
    notify();
  },

  /** Tracks an orphaned folder discovered in src/realities/bin/ so it can be
      restored or purged from the Quantum Bin UI. */
  adoptBinFolder(info: BinFolderInfo) {
    if (!state.binRealities) state.binRealities = [];
    if (state.binRealities.some((b) => b.folderName === info.folderName)) return;
    const pretty =
      info.folderName.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim() ||
      info.folderName;
    state.binRealities = [
      ...state.binRealities,
      {
        id: `disk-${info.folderName.toLowerCase()}`,
        name: pretty,
        spectral: 'Recovered Disk Folder',
        colorA: '#f43f5e',
        colorB: '#8b5cf6',
        description: 'Discovered in src/realities/bin by the disk daemon — adopted so it can be restored or purged.',
        deletedAt: info.trashedAt,
        folderName: info.folderName,
      },
    ];
    audit(`[Quantum Bin] Adopted orphaned disk folder: src/realities/bin/${info.folderName}`);
    notify();
  },

  /** Deletes an orphaned bin folder directly by its exact disk name. */
  async purgeBinFolder(folderName: string) {
    const ok = await syncedRealityApi('/api/realities/bin/purge', { folderName });
    if (ok) {
      toast(`src/realities/bin/${folderName} permanently deleted`);
    } else {
      if (mirrorWarnable()) toast(`⚠ Could not delete src/realities/bin/${folderName} — will retry`, 'warn');
    }
  },

  /* -------------------- Major Galaxies of a Reality ---------------------- */
  /** Creates `count` new major galaxies around a reality — each becomes one
      live ellipse orbit on the reality's ring in the multiverse view. */
  addGalaxies(
    realityId: string,
    count = 1,
    opts?: { names?: string[]; type?: string; color?: string }
  ): GalaxyData[] {
    const r = getReality(realityId, state.customRealityDescriptions);
    const roster = editableGalaxyRoster(realityId);
    const created: GalaxyData[] = [];
    for (let i = 0; i < Math.max(1, Math.min(24, count)); i++) {
      const slot = roster.length;
      const g = createGalaxyData({
        realityId,
        realityName: r.name,
        clusters: r.clusters ?? [],
        anchorStarName: r.bodies[0]?.name ?? `${r.name} Anchor Star`,
        worldsCount: r.bodies.length,
        name: opts?.names?.[i],
        type: opts?.type,
        color: opts?.color,
        slotIndex: slot,
      });
      roster.push(g);
      created.push(g);
    }
    commitGalaxyRoster(realityId, [...roster], `[Genesis] ${created.length} major galax${created.length === 1 ? 'y' : 'ies'} condensed in ${r.name}`);
    return created;
  },

  /** Patches any field of a major galaxy (name, type, color, orbit, lore…). */
  updateGalaxy(realityId: string, galaxyId: string, patch: Partial<GalaxyData>) {
    const roster = editableGalaxyRoster(realityId);
    const g = roster.find((x) => x.id === galaxyId);
    if (!g) return;
    Object.assign(g, patch);
    if (patch.name !== undefined) {
      g.name = patch.name.trim() || g.name;
    }
    commitGalaxyRoster(realityId, [...roster], `[Genesis] Galaxy reweaved: ${g.name}`);
  },

  deleteGalaxy(realityId: string, galaxyId: string) {
    const roster = editableGalaxyRoster(realityId);
    const g = roster.find((x) => x.id === galaxyId);
    if (!g) return;
    if (g.isHomeGalaxy) return; /* the home galaxy anchors the whole hierarchy */
    const next = roster.filter((x) => x.id !== galaxyId);
    commitGalaxyRoster(realityId, next, `[Genesis] Galaxy dissolved: ${g.name}`);
  },

  /** Moves the "home" marker (the galaxy that hosts the anchor star system). */
  setHomeGalaxy(realityId: string, galaxyId: string) {
    const roster = editableGalaxyRoster(realityId);
    const target = roster.find((x) => x.id === galaxyId);
    if (!target) return;
    roster.forEach((g) => { g.isHomeGalaxy = g.id === galaxyId; });
    commitGalaxyRoster(realityId, [...roster], `[Genesis] Home galaxy set: ${target.name}`);
  },

  /* --------------------------- Celestial Bodies -------------------------- */
  setMeaning(id: string, meaning: CosmicBody['meaning']) {
    const b = bucket().bodies.find((x) => x.id === id);
    if (b) {
      b.meaning = meaning;
      notify();
    }
  },

  renameBody(id: string, name: string) {
    const b = bucket().bodies.find((x) => x.id === id);
    if (b && name.trim()) {
      b.name = name.trim();
      notify();
    }
  },

  setNote(id: string, note: string) {
    const b = bucket().bodies.find((x) => x.id === id);
    if (b) {
      b.note = note;
      notify();
    }
  },

  addBody(name: string, kind: BodyKind, meaning: Meaning): CosmicBody {
    const TAU = Math.PI * 2;
    const r = Math.random;
    const body: CosmicBody = {
      id: newId(),
      name,
      kind,
      meaning,
      note: '',
      createdAt: Date.now(),
      radius: procRadius(kind),
      clouds: kind === 'planet' && r() > 0.4,
      palette: procPalette(kind),
      orbit: {
        a: 170 + r() * 70,
        speed: TAU / (4000 + r() * 4000),
        phase: r() * TAU,
        ...inclinedOrbitElements(r, 0.4),
      },
    };
    bucket().bodies.push(body);
    notify();
    return body;
  },

  removeBody(id: string) {
    if (id === 'anchor' || id === 'eventide') return;
    bucket().bodies = bucket().bodies.filter((b) => b.id !== id);
    bucket().entries = bucket().entries.filter((e) => e.planetId !== id);
    bucket().connections = bucket().connections.filter((c) => c.a !== id && c.b !== id);
    notify();
  },

  deleteBody(id: string) {
    actions.removeBody(id);
  },

  connect(a: string, b: string) {
    if (a === b) return;
    if (
      bucket().connections.some(
        (c) => (c.a === a && c.b === b) || (c.a === b && c.b === a)
      )
    )
      return;
    bucket().connections.push({ id: newId(), a, b, createdAt: Date.now() });
    notify();
  },

  disconnect(id: string) {
    bucket().connections = bucket().connections.filter((c) => c.id !== id);
    notify();
  },

  /* ---------------------------- Diary & Journal -------------------------- */
  addEntry(planetId: string): DiaryEntry {
    const e: DiaryEntry = {
      id: newId(),
      planetId,
      title: 'Untitled page',
      body: '',
      tags: [],
      bookmarked: false,
      archived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      attachments: [],
    };
    bucket().entries.push(e);
    notify();
    return e;
  },

  updateEntry(id: string, patch: Partial<DiaryEntry>) {
    const e = bucket().entries.find((x) => x.id === id);
    if (e) {
      const safePatch = typeof patch.body === 'string'
        ? { ...patch, body: sanitizeDiaryHtml(patch.body) }
        : patch;
      Object.assign(e, safePatch, { updatedAt: Date.now() });
      notify();
    }
  },

  deleteEntry(id: string) {
    const removed = bucket().entries.find((x) => x.id === id);
    bucket().entries = bucket().entries.filter((x) => x.id !== id);
    removed?.attachments.forEach((attachment) => {
      if (attachment.payloadRef) void delLocalPayload(attachment.payloadRef).catch(() => undefined);
    });
    notify();
  },

  toggleBookmark(id: string) {
    const e = bucket().entries.find((x) => x.id === id);
    if (e) {
      e.bookmarked = !e.bookmarked;
      notify();
    }
  },

  addAttachment(entryId: string, att: Omit<Attachment, 'id'>) {
    const e = bucket().entries.find((x) => x.id === entryId);
    if (e) {
      e.attachments.push({ ...att, id: newId() });
      e.updatedAt = Date.now();
      notify();
      queueMicrotask(() => void externalizeLargeDiaryAttachments());
    }
  },

  removeAttachment(entryId: string, attId: string) {
    const e = bucket().entries.find((x) => x.id === entryId);
    if (e) {
      const removed = e.attachments.find((a) => a.id === attId);
      e.attachments = e.attachments.filter((a) => a.id !== attId);
      if (removed?.payloadRef) void delLocalPayload(removed.payloadRef).catch(() => undefined);
      notify();
    }
  },

  deleteAttachment(entryId: string, attId: string) {
    actions.removeAttachment(entryId, attId);
  },

  updateAttachment(
    entryId: string,
    attId: string,
    patch: Partial<Attachment>
  ) {
    const e = bucket().entries.find((x) => x.id === entryId);
    const a = e?.attachments.find((x) => x.id === attId);
    if (e && a) {
      if (patch.dataUrl && a.payloadRef) {
        void delLocalPayload(a.payloadRef).catch(() => undefined);
        delete a.payloadRef;
        delete a.payloadMissing;
      }
      Object.assign(a, patch);
      e.updatedAt = Date.now();
      notify();
      queueMicrotask(() => void externalizeLargeDiaryAttachments());
    }
  },

  /* --------------------- EFS — the Eventide Filesystem ------------------- */
  addVaultFiles(files: VaultFile[]) {
    const activeRid = state.activeRealityId || 'sol-prime';
    const stamped = files.map((f) => ({ ...f, realityId: f.realityId ?? activeRid }));
    stamped.forEach((f) => {
      if (!efsNodeOf(bucket().efs, f)) {
        const parent = f.dirId && bucket().efs.nodes[f.dirId] ? f.dirId : EFS_ROOT;
        efsAddFileNode(bucket().efs, f.id, parent, f.name);
      }
    });
    bucket().vault.push(...stamped);
    notify();
  },

  updateVaultFile(id: string, patch: Partial<VaultFile>) {
    const f = bucket().vault.find((x) => x.id === id);
    if (f) {
      Object.assign(f, patch);
      notify();
    }
  },

  efsCreateFolder(parentId: string, name: string, color?: string): string | null {
    if (!bucket().efs.nodes[parentId]) return null;
    const node = efsMkdir(bucket().efs, parentId, name, color);
    audit(`[EFS] mkdir ${efsPathString(bucket().efs, node.id)} · gen ${bucket().efs.super.generation}`);
    notify();
    return node.id;
  },

  efsRenameNode(nodeId: string, name: string): boolean {
    const node = bucket().efs.nodes[nodeId];
    if (!efsRename(bucket().efs, nodeId, name)) return false;
    if (node?.type === 'file' && node.fileId) {
      const f = bucket().vault.find((x) => x.id === node.fileId);
      if (f) f.name = node.name;
    }
    audit(`[EFS] rename → ${name}`);
    notify();
    return true;
  },

  efsSetDirColor(nodeId: string, color?: string) {
    const n = bucket().efs.nodes[nodeId];
    if (!n) return;
    n.color = color;
    notify();
  },

  efsTogglePin(nodeId: string) {
    const n = bucket().efs.nodes[nodeId];
    if (!n) return;
    n.pinned = !n.pinned;
    notify();
  },

  efsSetTags(nodeId: string, tags: string[]) {
    const n = bucket().efs.nodes[nodeId];
    if (!n) return;
    n.tags = tags.length ? tags : undefined;
    notify();
  },

  efsMoveNodes(nodeIds: string[], destDirId: string): number {
    const moved = efsMove(bucket().efs, nodeIds, destDirId);
    if (moved) {
      const nodeMap = bucket().efs.nodes;
      bucket().vault.forEach((f) => {
        const node = Object.values(nodeMap).find((n) => n.type === 'file' && n.fileId === f.id);
        if (node && node.parentId && f.dirId !== node.parentId) {
          f.dirId = node.parentId;
        }
      });
      audit(`[EFS] moved ${moved} node(s) · gen ${bucket().efs.super.generation}`);
      notify();
    }
    return moved;
  },

  efsHealVault(): number {
    /* HOME-FOLDER GUARANTEE — vaults born before the fresh-OS seeding (or
       whose user deleted a home folder) get the structure back. Only fires
       when a home folder is genuinely absent, so user deletions of their own
       non-home folders are never undone. */
    const efs = bucket().efs;
    const missing = VAULT_HOME_FOLDERS.filter((p) => {
      const name = p.split('/').filter(Boolean)[0];
      /* case-insensitive: the user's own 'Images' IS the home folder —
         never spawn a duplicate 'images (2)' beside it */
      return !Object.values(efs.nodes).some((n) => n.type === 'dir' && n.parentId === EFS_ROOT && n.name.toLowerCase() === name.toLowerCase());
    });
    if (missing.length) {
      seedVfs(efs, missing);
      audit(`[EFS] home folders restored: ${missing.map((m) => m.replace('/', '')).join(', ')}`);
      notify();
    }
    const healed = efsHeal(bucket().efs, bucket().vault);
    if (healed) {
      audit(`[EFS] healed ${healed} detached node(s)`);
      notify();
    }
    return healed;
  },

  /** Zero-copy CoW clone: new tree nodes + cloned records sharing payload ids.
   *  Returns the ids of the top-level nodes created in destDirId. */
  efsCopyNodes(nodeIds: string[], destDirId: string): string[] {
    if (!bucket().efs.nodes[destDirId] || bucket().efs.nodes[destDirId].type !== 'dir') return [];
    const created: string[] = [];
    const cloneFileInto = (srcNode: VfsNode, destParent: string): string | null => {
      const orig = srcNode.fileId ? bucket().vault.find((f) => f.id === srcNode.fileId) : null;
      if (!orig) return null;
      const sharesPayload = !!orig.payloadRef;
      const clone: VaultFile = {
        ...orig,
        id: newId(),
        dirId: destParent,
        addedAt: Date.now(),
        versions: orig.versions ? JSON.parse(JSON.stringify(orig.versions)) : undefined,
        dedupOf: sharesPayload ? (orig.dedupOf ?? orig.id) : undefined,
      };
      bucket().vault.push(clone);
      const node = efsAddFileNode(bucket().efs, clone.id, destParent, srcNode.name);
      node.tags = srcNode.tags ? [...srcNode.tags] : undefined;
      return node.id;
    };
    const copyDir = (srcDirId: string, destParent: string, nameOverride?: string): string => {
      const src = bucket().efs.nodes[srcDirId];
      if (!src) return '';
      const dirNode: VfsNode = {
        id: newId(),
        type: 'dir',
        name: efsUniqueName(bucket().efs, destParent, nameOverride ?? src.name),
        parentId: destParent,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        color: src.color,
      };
      bucket().efs.nodes[dirNode.id] = dirNode;
      const { dirs, fileIds } = efsChildren(bucket().efs, srcDirId);
      fileIds.forEach((fid) => cloneFileInto(bucket().efs.nodes[fid], dirNode.id));
      dirs.forEach((d) => copyDir(d.id, dirNode.id));
      return dirNode.id;
    };
    for (const id of nodeIds) {
      const n = bucket().efs.nodes[id];
      if (!n || n.id === EFS_ROOT) continue;
      if (n.type === 'file') {
        const made = cloneFileInto(n, destDirId);
        if (made) created.push(made);
      } else {
        const made = copyDir(id, destDirId);
        if (made) created.push(made);
      }
    }
    if (created.length) {
      efsBump(bucket().efs);
      audit(`[EFS] forked ${created.length} object(s) into ${efsPathString(bucket().efs, destDirId)} · 0 payload bytes allocated`);
      notify();
    }
    return created;
  },

  /** Forks a directory in place — the reflink equivalent. Returns the new dir id. */
  efsForkDir(dirId: string): string | null {
    const src = bucket().efs.nodes[dirId];
    if (!src || src.type !== 'dir' || dirId === EFS_ROOT) return null;
    const parent = src.parentId ?? EFS_ROOT;
    const made = this.efsCopyNodes([dirId], parent);
    if (made.length) {
      const node = bucket().efs.nodes[made[0]];
      if (node) node.name = efsUniqueName(bucket().efs, parent, `${src.name} fork`);
      audit(`[EFS] fork '${src.name}' → zero-copy CoW clone`);
      notify();
    }
    return made[0] ?? null;
  },

  /** Moves selection to trash (restorable): files + whole dir subtrees. */
  efsTrash(nodeIds: string[]) {
    const at = Date.now();
    const entries: UniverseState['vaultTrash'] = [];
    const doomedFiles = new Set<string>();
    const doomedNodes = new Set<string>();
    for (const id of nodeIds) {
      const n = bucket().efs.nodes[id];
      if (!n || id === EFS_ROOT) continue;
      if (n.type === 'file' && n.fileId) {
        const f = bucket().vault.find((x) => x.id === n.fileId);
        if (f) {
          entries.push({ item: f, deletedAt: at, fromDirId: n.parentId ?? EFS_ROOT, node: { ...n } });
          doomedFiles.add(f.id);
        }
        doomedNodes.add(id);
      } else if (n.type === 'dir') {
        const { dirIds, fileIds } = efsSubtreeIds(bucket().efs, id);
        const dirNodes = dirIds.map((d) => ({ ...bucket().efs.nodes[d] }));
        fileIds.forEach((fid) => {
          const node = bucket().efs.nodes[fid];
          const f = node?.fileId ? bucket().vault.find((x) => x.id === node.fileId) : null;
          if (f) {
            entries.push({
              item: f, deletedAt: at,
              fromDirId: node.parentId ?? EFS_ROOT,
              node: { ...node }, dirNodes, dirName: n.name,
            });
            doomedFiles.add(f.id);
          }
          doomedNodes.add(fid);
        });
        dirIds.forEach((d) => doomedNodes.add(d));
      }
    }
    if (!entries.length && !doomedNodes.size) return;
    bucket().vaultTrash = [...bucket().vaultTrash, ...entries];
    bucket().vault = bucket().vault.filter((x) => !doomedFiles.has(x.id));
    doomedNodes.forEach((id) => { delete bucket().efs.nodes[id]; });
    efsBump(bucket().efs);
    audit(`[EFS] trashed ${entries.length} object(s)`);
    notify();
  },

  /* ----------------------- The Void (Recycle Bin) ------------------------ */
  releaseVaultFile(id: string) {
    this.releaseVaultFiles([id]);
  },

  releaseVaultFiles(ids: string[]) {
    const set = new Set(ids);
    const at = Date.now();
    const released: UniverseState['vaultTrash'] = [];
    bucket().vault.forEach((f) => {
      if (!set.has(f.id)) return;
      const node = efsNodeOf(bucket().efs, f);
      released.push({
        item: f, deletedAt: at,
        fromDirId: node?.parentId ?? EFS_ROOT,
        node: node ? { ...node } : undefined,
      });
      if (node) delete bucket().efs.nodes[node.id];
    });
    if (!released.length) return;
    bucket().vaultTrash = [...bucket().vaultTrash, ...released];
    bucket().vault = bucket().vault.filter((x) => !set.has(x.id));
    efsBump(bucket().efs);
    notify();
  },

  restoreTrashed(id: string) {
    const t = bucket().vaultTrash.find((x) => x.item.id === id);
    if (!t) return;
    /* bring back any trashed directory chain first, then the file's node */
    (t.dirNodes ?? []).forEach((d) => {
      if (!bucket().efs.nodes[d.id]) bucket().efs.nodes[d.id] = { ...d };
    });
    if (t.node && !bucket().efs.nodes[t.node.id]) {
      bucket().efs.nodes[t.node.id] = { ...t.node, parentId: t.fromDirId ?? EFS_ROOT };
    }
    bucket().vaultTrash = bucket().vaultTrash.filter((x) => x.item.id !== id);
    if (!bucket().vault.some((x) => x.id === t.item.id)) bucket().vault = [...bucket().vault, t.item];
    efsBump(bucket().efs);
    audit(`[EFS] restored ${t.item.name}${t.dirName ? ` (from trashed dir '${t.dirName}')` : ''}`);
    notify();
  },

  purgeTrashed(id: string) {
    const removed = bucket().vaultTrash.find((trash) => trash.item.id === id)?.item;
    bucket().vaultTrash = bucket().vaultTrash.filter((trash) => trash.item.id !== id);
    if (removed) deleteUnreferencedPayloads([removed]);
    notify();
  },

  purgeTrash() {
    const removed = bucket().vaultTrash.map((trash) => trash.item);
    bucket().vaultTrash = [];
    deleteUnreferencedPayloads(removed);
    notify();
  },

  /* --------------------------- Version Control --------------------------- */
  saveVersion(id: string, label?: string) {
    const f = bucket().vault.find((x) => x.id === id);
    if (!f || f.content == null) return;
    const last = f.versions?.[f.versions.length - 1];
    if (last && last.content === f.content) return;
    const v: FileVersion = {
      id: newId(),
      savedAt: Date.now(),
      label: label ?? 'snapshot',
      size: f.content.length,
      content: f.content,
    };
    f.versions = [...(f.versions ?? []), v].slice(-10);
    notify();
  },

  /** Version snapshot from explicit text — works for payload-backed files
      whose VaultFile has no inline `content` (saveVersion skips those). */
  saveVersionContent(id: string, label: string, content: string) {
    const f = bucket().vault.find((x) => x.id === id);
    if (!f || !content) return;
    const last = f.versions?.[f.versions.length - 1];
    if (last && last.content === content) return;
    const v: FileVersion = {
      id: newId(),
      savedAt: Date.now(),
      label,
      size: content.length,
      content,
    };
    f.versions = [...(f.versions ?? []), v].slice(-10);
    notify();
  },

  restoreVersion(id: string, versionId: string) {
    const f = bucket().vault.find((x) => x.id === id);
    const v = f?.versions?.find((x) => x.id === versionId);
    if (!f || !v || v.content == null) return;
    if (f.content !== v.content) {
      this.saveVersion(id, 'before restore');
    }
    f.content = v.content;
    f.size = v.content.length;
    notify();
  },

  /* ------------------------ Universe Portability ------------------------- */
  resetUniverse() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      /* R95 — a reset must also forget the driving session's memory: the
         old drifted states would otherwise outlive the reset (the seedLaw
         stamp re-seeds them anyway, but a reset means reset). */
      localStorage.removeItem(STORAGE_KEYS.simSession);
    } catch {
      /* ignore */
    }
    rebindState(primeState(createInitialSeed(newId)));
    notify();
  },

  importUniverse(next: UniverseState, payloadStatus?: PayloadImportStatus) {
    if (!next || !Array.isArray(next.bodies) || !Array.isArray(next.vault))
      return;
    const applyPayloadStatus = (file: VaultFile): VaultFile => {
      if (!file.payloadRef || !payloadStatus) return file;
      if (payloadStatus.missing.has(file.payloadRef)) {
        return { ...file, payloadMissing: true, sealed: true };
      }
      if (payloadStatus.available.has(file.payloadRef) && file.payloadMissing) {
        const restored = { ...file };
        delete restored.payloadMissing;
        if (restored.sealed) delete restored.sealed;
        return restored;
      }
      return file;
    };
    const applyAttachmentStatus = (attachment: Attachment): Attachment => {
      if (!attachment.payloadRef || !payloadStatus) return attachment;
      if (payloadStatus.missing.has(attachment.payloadRef)) {
        return { ...attachment, dataUrl: '', payloadMissing: true };
      }
      if (payloadStatus.available.has(attachment.payloadRef) && attachment.payloadMissing) {
        const restored = { ...attachment };
        delete restored.payloadMissing;
        return restored;
      }
      return attachment;
    };
    next.entries = sanitizeDiaryEntries(next.entries).map((entry) => ({
      ...entry,
      attachments: entry.attachments.map(applyAttachmentStatus),
    }));
    next.vault = normalizeVaultFiles(next.vault).map(applyPayloadStatus);
    next.vaultTrash = Array.isArray(next.vaultTrash)
      ? next.vaultTrash.map((trash) => ({ ...trash, item: applyPayloadStatus(normalizeLegacyLock(trash.item)) }))
      : [];
    if (!Array.isArray(next.connections)) next.connections = [];
    if (!Array.isArray(next.vaultTrash)) next.vaultTrash = [];
    if (!Array.isArray(next.vaultUsers)) next.vaultUsers = [];
    if (!Array.isArray(next.audit)) next.audit = [];
    if (!next.customGalaxies || typeof next.customGalaxies !== 'object') next.customGalaxies = {};
    if (!next.customRealityMeta || typeof next.customRealityMeta !== 'object') next.customRealityMeta = {};
    /* imported snapshots may predate EFS — migrate the flat folders across */
    if (!next.efs || !Object.keys(next.efs.nodes ?? {}).length) migrateLegacyVault(next);
    efsHeal(next.efs, next.vault);

    // Ensure anchor & eventide core system bodies exist
    const defaults = seedBodies(Date.now(), DAY_MS);
    const anchor = defaults.find((b) => b.id === 'anchor')!;
    const eventide = defaults.find((b) => b.id === 'eventide')!;
    if (!next.bodies.some((b) => b.id === 'anchor')) next.bodies.unshift(anchor);
    if (!next.bodies.some((b) => b.id === 'eventide')) next.bodies.push(eventide);

    /* containerize: the imported flat snapshot becomes the container of the
       reality it claims to be — imports never merge into another reality */
    const importId = next.activeRealityId || 'sol-prime';
    next.realities = {
      [importId]: {
        bodies: next.bodies ?? [],
        entries: next.entries ?? [],
        connections: next.connections ?? [],
        vault: next.vault ?? [],
        vaultTrash: next.vaultTrash ?? [],
        efs: next.efs ?? createVfs(),
      },
    };
    delete (next as any).bodies;
    delete (next as any).entries;
    delete (next as any).connections;
    delete (next as any).vault;
    delete (next as any).vaultTrash;
    delete (next as any).efs;

    rebindState(next);
    ensureBucket(state.activeRealityId || 'sol-prime');
    recomputeRealities();
    notify();
    queueMicrotask(() => void externalizeLargeDiaryAttachments());
  },

  /* ----------------------------- Identities ------------------------------ */
  addUser(u: UniverseState['vaultUsers'][number]) {
    state.vaultUsers = [...state.vaultUsers, u];
    notify();
  },

  updateUser(
    id: string,
    patch: Partial<UniverseState['vaultUsers'][number]>
  ) {
    state.vaultUsers = state.vaultUsers.map((u) =>
      u.id === id ? { ...u, ...patch } : u
    );
    notify();
  },

  removeUser(id: string) {
    state.vaultUsers = state.vaultUsers.filter((u) => u.id !== id);
    notify();
  },

  touchUser(id: string) {
    this.updateUser(id, { lastSeen: Date.now() });
  },

  setSecrets(s: VaultSecrets | null) {
    state.secrets = s;
    audit(s ? 'key ring re-sealed' : 'key ring emptied');
    notify();
  },

  /* ------------------- EFS CoW: shadows, fork, integrity ----------------- */

  efsShadow(name: string, description?: string): VfsShadow {
    const s = efsCreateShadow(bucket().efs, bucket().vault, name, description);
    audit(`[EFS] shadow '${s.name}' frozen at gen ${s.generation} (${s.fileCount} files, ${s.dirCount} dirs)`);
    notify();
    return s;
  },

  efsDeleteShadow(shadowId: string) {
    efsDeleteShadow(bucket().efs, shadowId);
    audit('[EFS] shadow deleted');
    notify();
  },

  efsRestoreShadow(shadowId: string) {
    const shadow = bucket().efs.shadows.find((s) => s.id === shadowId);
    if (!shadow) return;
    /* automatic safety shadow, so rollback is always reversible */
    efsCreateShadow(bucket().efs, bucket().vault, `pre-rollback-${Date.now().toString(36)}`, 'Automatic safety shadow before rollback');
    bucket().efs.nodes = JSON.parse(JSON.stringify(shadow.tree));
    /* The restored tree defines the live vault. Reconcile metadata from both
       live and trash so a file brought back by the shadow is not lost. */
    const restoredNodes = new Map<string, VfsNode>();
    Object.values(bucket().efs.nodes).forEach((node) => {
      if (node.type === 'file' && node.fileId) restoredNodes.set(node.fileId, node);
    });
    const metadata = new Map<string, VaultFile>();
    bucket().vault.forEach((file) => metadata.set(file.id, file));
    bucket().vaultTrash.forEach((trash) => metadata.set(trash.item.id, trash.item));

    /* Safety guard: If restoring a directory-only or empty legacy shadow, preserve
       all existing files and heal them into the restored directory tree */
    if (restoredNodes.size === 0 && metadata.size > 0) {
      efsHeal(bucket().efs, bucket().vault);
      efsBump(bucket().efs);
      audit(`[EFS] rollback to '${shadow.name}' (gen ${shadow.generation}) · preserved ${bucket().vault.length} files`);
      notify();
      return;
    }

    /* Move any active files not present in the restored snapshot into Trash */
    const doomed = bucket().vault.filter((file) => !restoredNodes.has(file.id));
    if (doomed.length > 0) {
      const at = Date.now();
      doomed.forEach((file) => {
        bucket().vaultTrash.push({
          item: file,
          deletedAt: at,
          fromDirId: file.dirId ?? EFS_ROOT,
        });
      });
    }

    bucket().vault = [...metadata.values()]
      .filter((file) => restoredNodes.has(file.id))
      .map((file) => {
        const node = restoredNodes.get(file.id)!;
        const parent = node.parentId && bucket().efs.nodes[node.parentId]?.type === 'dir' ? node.parentId : EFS_ROOT;
        return { ...file, dirId: parent };
      });
    bucket().vaultTrash = bucket().vaultTrash.filter((trash) => !restoredNodes.has(trash.item.id));
    efsHeal(bucket().efs, bucket().vault);
    efsBump(bucket().efs);
    audit(`[EFS] rollback to '${shadow.name}' (gen ${shadow.generation})`);
    notify();
  },

  async efsRunScrub(onProgress?: (p: { done: number; total: number; current: string }) => void): Promise<EfsScrubReport> {
    const report = await efsScrub(bucket().vault, getPayload, onProgress);
    bucket().efs.scrub = report;
    bucket().efs.super.lastScrubAt = Date.now();
    audit(`[EFS scrub] ${report.filesScanned} files · ${report.errorsFound} errors · ${report.errorsCorrected} repaired — ${report.status.toUpperCase()}`);
    notify();
    return report;
  },

  efsRunDedup(): { collapsed: number; savedBytes: number } {
    const rep = efsDedup(bucket().vault);
    bucket().efs.super.dedupBytes += rep.savedBytes;
    audit(`[EFS dedup] collapsed ${rep.collapsed} duplicates · ${rep.savedBytes} bytes now shared extents`);
    notify();
    return rep;
  },

  logAudit(msg: string) {
    audit(msg);
    notify();
  },
};
