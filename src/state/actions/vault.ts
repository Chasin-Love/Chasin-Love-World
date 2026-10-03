/* STATE — actions/vault (R97): a domain of the single mutation
   surface — text extracted verbatim from the old actions.ts monolith. */
    import type { UniverseState } from '../../domain/universe';
    import type { VaultFile, VfsNode, FileVersion } from '../../domain/vault';
    import { VAULT_HOME_FOLDERS } from '../../vault/storage/seeds';
    import { state, bucket, newId } from '../store';
    import { efsAddFileNode, efsBump, efsChildren, efsMkdir, efsMove, efsNodeOf, efsPathString, efsRename, efsSubtreeIds, efsHeal, efsUniqueName, EFS_ROOT, seedVfs } from '../../vault';
  import { notify, audit, deleteUnreferencedPayloads } from './shared';

export const vaultActions = {
  /* --------------------- EFS — the Eventide Filesystem ------------------- */
  addVaultFiles(files: VaultFile[]) {
    const activeRid = state.activeRealityId ?? '';
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

};
