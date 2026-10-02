/* STATE — actions/portability (R97): a domain of the single mutation
   surface — text extracted verbatim from the old actions.ts monolith. */
    import type { UniverseState, Attachment } from '../../domain/universe';
    import type { VaultFile, VfsNode, VaultSecrets, VfsShadow, EfsScrubReport } from '../../domain/vault';
    import { state, bucket, ensureBucket, newId, rebindState } from '../store';
    import { externalizeLargeDiaryAttachments, STORAGE_KEY, primeState, sanitizeDiaryEntries, normalizeVaultFiles, normalizeLegacyLock } from '../persist';
    import { STORAGE_KEYS } from '../../platform/storageKeys';
    import { getPayload, createInitialSeed, seedBodies, createVfs, efsBump, efsCreateShadow, efsDedup, efsDeleteShadow, efsScrub, efsHeal, EFS_ROOT, migrateLegacyVault } from '../../vault';
  import { notify, audit, recomputeRealities, DAY_MS } from './shared';
  import type { PayloadImportStatus } from './shared';

export const portabilityActions = {
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
