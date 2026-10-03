/* STATE — actions/realities (R97): a domain of the single mutation
   surface — text extracted verbatim from the old actions.ts monolith. */
    import type { GalaxyData } from '../../realities/hierarchyTypes';
    import type { UniverseState, DiskSyncState, BinFolderInfo } from '../../domain/universe';
    import { VAULT_HOME_FOLDERS } from '../../vault/storage/seeds';
    import { state, ensureBucket, EMPTY_DISK_SYNC } from '../store';
    import { getReality, REALITIES, RAW_REALITIES, createGalaxyData, RealityConfig } from '../../realities';
    import { createVfs, seedVfs, delPayload } from '../../vault';
    import { forgetSession } from '../../physics/sessionDriver';
    import { realityApi, syncedRealityApi } from '../../platform/desktop/adapter';
    import { toast } from '../../ui/toast';
  import { notify, notifyNoPersist, audit, recomputeRealities, editableGalaxyRoster, commitGalaxyRoster, diskFolderFor, uniqueFolderFor, mirrorWarnable } from './shared';

export const realityActions = {
  /* -------------------------- Multiverse & Lore -------------------------- */
  switchReality(realityId: string) {
    const r = getReality(realityId, state.customRealityDescriptions);
    /* R102 — a reality that no longer exists (its folder was deleted) cannot
       be entered; the pointer stays where it is instead of pointing at a
       phantom. */
    if (!r) return;
    /* a pure pointer flip: every reality owns its world container, so the
       derived views re-point and nothing is reseeded, lost, or leaked */
    state.activeRealityId = r.id;
    ensureBucket(r.id);
    audit(`[Dimensional Barrier] Quantum resonance shifted to Reality: ${r.name}`);
    notify();
    void realityActions.exportRealityData(r.id); /* keep the reality folder's data.json current */
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
    realityActions.updateRealityMeta(realityId, { name: cleanName });

    // Synchronize folder renaming to backend disk (folder-aware matching)
    const folderName = diskFolderFor(realityId);
    void realityApi<{ success?: boolean; newFolderName?: string }>(
      '/api/realities/rename-folder',
      { realityId, newName: cleanName, folderName }
    ).then((res) => {
      if (res?.success && res.newFolderName) {
        realityActions.rememberRealityFolder(realityId, res.newFolderName);
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
      realityActions.rememberRealityFolder(newReality.id, res.folderName ?? proposed);
      void realityActions.exportRealityData(newReality.id);
    } else {
      if (mirrorWarnable()) toast(`⚠ "${newReality.name}" exists in the multiverse, but its disk folder could not be created — the sync engine will retry`, 'warn');
      void syncedRealityApi('/api/realities/create-folder', { ...newReality, folderName: proposed });
    }
  },

  async deleteReality(realityId: string) {
    /* R102 — THE INDEPENDENT-REALITIES DECREE: no reality is load-bearing,
       including the home one. Any reality can collapse into the Quantum Bin;
       the app survives on the surviving realities, or on the empty
       multiverse when the last one goes. */

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
    // If the active reality was deleted, fall back to a survivor — or to the
    // empty multiverse when none remain (R102: '' is a legal active pointer).
    if (state.activeRealityId === realityId) {
      const fallback = REALITIES[0];
      state.activeRealityId = fallback ? fallback.id : '';
      if (fallback) ensureBucket(fallback.id);
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
      if (trashed.folderName) realityActions.rememberRealityFolder(realityId, trashed.folderName);
    } else {
      if (mirrorWarnable()) toast(`⚠ ${trashed.name} restored in the multiverse, but its disk folder is still in the bin — will retry`, 'warn');
    }
  },

  /* R102 — ZERO TRACE: permanent erase destroys every trace of a reality in
     one stroke — the world container, its encrypted vault payloads, its
     diary attachments, its folder map and its N-body session memory. The one
     thing kept is the `deletedRealityIds` tombstone: this session's build-
     time glob still knows the folder existed, and without the marker a purge
     would resurrect the reality in the UI until the next reload (the marker
     is a dead id once the disk folder is wiped — on every later boot the
     glob no longer matches anything). After this, the reality is as if it
     never existed. */
  async purgeRealityFromBin(realityId: string) {
    if (!state.binRealities) return;
    const item = state.binRealities.find((b) => b.id === realityId);
    state.binRealities = state.binRealities.filter((b) => b.id !== realityId);
    forgetSession(realityId);
    if (state.realities && state.realities[realityId]) {
      const doomed = state.realities[realityId];
      const payloadRefs = new Set<string>();
      doomed.vault.forEach((f) => { if (f.payloadRef) payloadRefs.add(f.payloadRef); });
      doomed.vaultTrash.forEach((t) => { if (t.item?.payloadRef) payloadRefs.add(t.item.payloadRef); });
      doomed.entries.forEach((e) => e.attachments?.forEach((a) => { if (a.payloadRef) payloadRefs.add(a.payloadRef); }));
      payloadRefs.forEach((ref) => void delPayload(ref).catch(() => undefined));
      delete state.realities[realityId];
    }
    if (state.realityFolders) {
      const next = { ...state.realityFolders };
      delete next[realityId];
      state.realityFolders = next;
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
    /* permanent erase: every binned reality leaves zero trace (R102) —
       deletedRealityIds tombstones stay (see purgeRealityFromBin) */
    for (const id of purgedIds) {
      forgetSession(id);
      if (state.realities && state.realities[id]) {
        const doomed = state.realities[id];
        const payloadRefs = new Set<string>();
        doomed.vault.forEach((f) => { if (f.payloadRef) payloadRefs.add(f.payloadRef); });
        doomed.vaultTrash.forEach((t) => { if (t.item?.payloadRef) payloadRefs.add(t.item.payloadRef); });
        doomed.entries.forEach((e) => e.attachments?.forEach((a) => { if (a.payloadRef) payloadRefs.add(a.payloadRef); }));
        payloadRefs.forEach((ref) => void delPayload(ref).catch(() => undefined));
        delete state.realities[id];
      }
      if (state.realityFolders) {
        const next = { ...state.realityFolders };
        delete next[id];
        state.realityFolders = next;
      }
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
    /* R102 — no phantom home: with no active reality there is simply nothing
       to mirror */
    const id = realityId || state.activeRealityId;
    if (!id) return;
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
      live ellipse orbit on the reality's ring in the multiverse view.
      R102: a collapsed reality no longer has a ring — no galaxies are forged. */
  addGalaxies(
    realityId: string,
    count = 1,
    opts?: { names?: string[]; type?: string; color?: string }
  ): GalaxyData[] {
    const r = getReality(realityId, state.customRealityDescriptions);
    if (!r) return [];
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

};
