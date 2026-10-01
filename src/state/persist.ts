import { STORAGE_KEYS } from '../platform/storageKeys';
/* STATE — persistence (R52): loadState + migrations, debounced persist,
   desktop file hydration, diary payload externalization. */
import type { DiaryEntry, UniverseState } from '../domain/universe';
import type { VaultFile } from '../domain/vault';
import { state, emptyBucket, bucket, refreshSnapshot, newId, listeners } from './store';
import { setRuntimeRealities, computeAllRealities, RealityMetaOverride } from '../realities';
import {
  putLocalPayload,
  
  createInitialSeed, 
  sanitizeDiaryHtml,
  createVfs, 
  
  efsHeal, migrateLegacyVault,
  
} from '../vault';
import { recordPersistence } from '../platform/performance';
import { desktopStore } from '../platform/desktop/adapter';
import { toast } from '../ui/toast';

export const STORAGE_KEY = STORAGE_KEYS.universeState;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let quotaWarnedAt = 0;
const DIARY_INLINE_LIMIT = 256 * 1024;
const DIARY_PAYLOAD_PREFIX = 'diary:';

export function primeState(p: UniverseState): UniverseState {
  // Synchronize runtime realities with custom realities & deletions
  setRuntimeRealities(
    computeAllRealities(p.customRealities, p.deletedRealityIds, p.customRealityDescriptions, p.customGalaxies, p.customRealityMeta as Record<string, RealityMetaOverride>)
  );
  return p;
}

export function sanitizeDiaryEntries(value: unknown): DiaryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is DiaryEntry => Boolean(entry) && typeof entry === 'object')
    .map((entry) => ({
      ...entry,
      body: sanitizeDiaryHtml(entry.body),
    }));
}

export function normalizeLegacyLock(file: VaultFile): VaultFile {
  const raw = file as VaultFile & { lock?: VaultFile['lock'] | string };
  if (typeof raw.lock !== 'string') return file;
  return { ...file, lock: undefined, legacyLock: raw.lock };
}

export function normalizeVaultFiles(value: unknown): VaultFile[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((file): file is VaultFile => Boolean(file) && typeof file === 'object')
    .map(normalizeLegacyLock);
}

export function loadState(): UniverseState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UniverseState;
      /* v3 payloads carry flat fields; v4+ payloads carry reality containers.
         Either shape is valid storage — accepting only the flat shape here
         used to drop container payloads to a fresh seed on every reload. */
      const hasFlat = Array.isArray(parsed.bodies);
      const hasContainers = Boolean(parsed.realities && typeof parsed.realities === 'object');
      if (parsed && (hasFlat || hasContainers)) {
        if (!parsed.activeRealityId) parsed.activeRealityId = 'sol-prime';
        if (!Array.isArray(parsed.customRealities)) parsed.customRealities = [];
        if (!Array.isArray(parsed.deletedRealityIds)) parsed.deletedRealityIds = [];
        if (!Array.isArray(parsed.binRealities)) parsed.binRealities = [];
        if (!parsed.customGalaxies || typeof parsed.customGalaxies !== 'object') parsed.customGalaxies = {};
        if (!parsed.customRealityMeta || typeof parsed.customRealityMeta !== 'object') parsed.customRealityMeta = {};
        if (!parsed.realityFolders || typeof parsed.realityFolders !== 'object') parsed.realityFolders = {};
        if (!Array.isArray(parsed.vaultUsers)) parsed.vaultUsers = [];
        if (!Array.isArray(parsed.audit)) parsed.audit = [];
        if (hasFlat) {
          if (!Array.isArray(parsed.vault)) parsed.vault = [];
          if (!Array.isArray(parsed.vaultTrash)) parsed.vaultTrash = [];
          parsed.vault = normalizeVaultFiles(parsed.vault);
          parsed.vaultTrash = parsed.vaultTrash.map((trash) => ({
            ...trash,
            item: normalizeLegacyLock(trash.item),
          }));
          parsed.entries = sanitizeDiaryEntries(parsed.entries);
        }

        delete parsed.diskSync;
        if (hasFlat) {
          /* v3: the old flat folder-string system + the btrfs simulation were
             replaced by EFS — build the tree from legacy paths once, then strip
             every legacy field so it never persists again */
          if (!parsed.efs || !Object.keys(parsed.efs.nodes ?? {}).length) {
            migrateLegacyVault(parsed);
          }
          /* guarantee reachability: every vault record must have a tree node,
             otherwise the File Manager would hide what Everything shows */
          let healedCount = efsHeal(parsed.efs, parsed.vault);

          /* if vault was wiped by an empty rollback, restore initial seed files safely */
          if (parsed.vault.length === 0 && parsed.vaultTrash.length === 0) {
            const freshSeed = createInitialSeed(newId);
            parsed.vault = freshSeed.vault;
            healedCount += efsHeal(parsed.efs, parsed.vault);
          }

          /* ensure genesis shadow contains file nodes if it was created on an older version */
          parsed.efs?.shadows?.forEach((shadow) => {
            if (shadow.name === 'genesis' && shadow.fileCount === 0) {
              const freshSeed = createInitialSeed(newId);
              shadow.tree = JSON.parse(JSON.stringify(freshSeed.efs.nodes));
              shadow.fileCount = Object.values(shadow.tree).filter((n) => n.type === 'file').length;
              shadow.dirCount = Object.values(shadow.tree).filter((n) => n.type === 'dir').length;
              healedCount++;
            }
          });
          void healedCount;
        }

        const legacy = parsed as unknown as Record<string, unknown>;
        delete legacy.vaultFolders;
        delete legacy.btrfsSubvolumes;
        delete legacy.btrfsSnapshots;
        delete legacy.btrfsScrub;
        delete legacy.btrfsSuperblock;
        delete legacy.activeSubvolId;

        if (hasFlat && (!parsed.version || parsed.version < 2)) {
          parsed.entries.forEach((e) => {
            e.mood = undefined;
          });
        }

        /* v4 — REALITY CONTAINERS. Legacy ownership rules:
             - worlds/diary/links: the old switchReality reseeded these from
               the active reality's seed, so they belong to whichever reality
               was active when the snapshot was taken;
             - vault/trash/EFS tree: the old vault was ONE GLOBAL bucket —
               it belongs to the home reality (Sol Prime).
           Every other known reality receives its config-seeded container. */
        if (!parsed.realities || typeof parsed.realities !== 'object') {
          const flatActive = parsed.activeRealityId || 'sol-prime';
          const clone = <T,>(list: T[]): T[] => (Array.isArray(list) ? list.map((x) => ({ ...x })) : []);
          parsed.realities = {
            [flatActive]: {
              bodies: clone(parsed.bodies ?? []),
              entries: clone(parsed.entries ?? []),
              connections: clone(parsed.connections ?? []),
              vault: [],
              vaultTrash: [],
              efs: createVfs(),
            },
            'sol-prime': {
              bodies: [],
              entries: [],
              connections: [],
              vault: clone(parsed.vault ?? []),
              vaultTrash: clone(parsed.vaultTrash ?? []),
              efs: parsed.efs ?? createVfs(),
            },
          };
          /* the active reality IS sol-prime → merge the two partial buckets */
          if (flatActive === 'sol-prime') {
            parsed.realities['sol-prime'] = {
              bodies: clone(parsed.bodies ?? []),
              entries: clone(parsed.entries ?? []),
              connections: clone(parsed.connections ?? []),
              vault: clone(parsed.vault ?? []),
              vaultTrash: clone(parsed.vaultTrash ?? []),
              efs: parsed.efs ?? createVfs(),
            };
          }
        } else {
          /* repair pass: every reality needs a complete container */
          for (const [, b] of Object.entries(parsed.realities)) {
            if (!b || typeof b !== 'object') continue;
            if (!Array.isArray(b.bodies)) b.bodies = [];
            if (!Array.isArray(b.entries)) b.entries = [];
            if (!Array.isArray(b.connections)) b.connections = [];
            if (!Array.isArray(b.vault)) b.vault = [];
            if (!Array.isArray(b.vaultTrash)) b.vaultTrash = [];
            if (!b.efs || !Object.keys(b.efs.nodes ?? {}).length) b.efs = createVfs();
          }
        }

        /* container seeding: every KNOWN reality without live content receives
           its config's world cast — a newly discovered disk reality, a freshly
           migrated home universe, or an empty migration artifact all end up
           with the worlds their config promises */
        const known = computeAllRealities(
          parsed.customRealities, parsed.deletedRealityIds,
          parsed.customRealityDescriptions, parsed.customGalaxies,
          parsed.customRealityMeta as Record<string, RealityMetaOverride>
        );
        for (const cfg of known) {
          const b = parsed.realities[cfg.id];
          const isEmpty = !b || (
            (!b.bodies || b.bodies.length === 0) &&
            (!b.entries || b.entries.length === 0) &&
            (!b.connections || b.connections.length === 0)
          );
          if (isEmpty && (cfg.bodies.length > 0 || (cfg.entries ?? []).length > 0)) {
            parsed.realities[cfg.id] = {
              bodies: cfg.bodies.map((x) => ({ ...x })),
              entries: (cfg.entries ?? []).map((x) => ({ ...x })),
              connections: [],
              /* keep any legacy global vault already attributed to this bucket */
              vault: b?.vault ?? [],
              vaultTrash: b?.vaultTrash ?? [],
              efs: b?.efs ?? createVfs(),
            };
          }
        }
        if (!parsed.realities['sol-prime']) {
          parsed.realities['sol-prime'] = emptyBucket();
        }

        /* v4.1 — ownership repair. The first v4 migration attributed the old
           GLOBAL vault to whichever reality happened to be active. Vault files
           carry a realityId stamp written at seal time; a bucket whose vault
           holds only sol-prime-stamped (or unstamped legacy) files is holding
           them in trust — return them (with trash and the EFS tree) to the
           home reality, unless the home vault already has content. */
        const home = parsed.realities['sol-prime'];
        for (const [rid, b] of Object.entries(parsed.realities)) {
          if (rid === 'sol-prime' || !b || !Array.isArray(b.vault) || b.vault.length === 0) continue;
          const allForeign = b.vault.every((f) => !f.realityId || f.realityId === 'sol-prime');
          if (allForeign && home.vault.length === 0) {
            home.vault = b.vault;
            home.vaultTrash = b.vaultTrash ?? [];
            home.efs = b.efs ?? createVfs();
            b.vault = [];
            b.vaultTrash = [];
            b.efs = createVfs();
          }
        }

        /* the flat fields are views, never storage — drop them from the payload */
        delete (parsed as any).bodies;
        delete (parsed as any).entries;
        delete (parsed as any).connections;
        delete (parsed as any).vault;
        delete (parsed as any).vaultTrash;
        delete (parsed as any).efs;

        parsed.version = 4;
        const primed = primeState(parsed);
        try {
          /* persist the migration immediately — never rely on the next edit */
          localStorage.setItem(STORAGE_KEY, JSON.stringify(primed));
        } catch {
          /* quota or storage error */
        }
        return primed;
      }
    }
  } catch (err) {
    /* the stored payload is corrupt — never silently overwrite the evidence:
       preserve the broken raw string under :recovery so it can be repaired
       by hand or by a future migration, THEN fall back to a fresh seed */
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) localStorage.setItem(STORAGE_KEYS.universeStateRecovery, raw);
    } catch { /* recovery snapshot best-effort */ }
    console.error('[state] stored universe failed to load — preserved at "my-universe:v4:recovery":', err);
    /* module init runs before React mounts — defer so the toast host exists */
    setTimeout(() => toast('stored universe was corrupt — a fresh seed loaded. The original was preserved in recovery storage.', 'warn'), 2500);
  }
  return primeState(createInitialSeed(newId));
}

function diaryPayloadId(id: string): string {
  return `${DIARY_PAYLOAD_PREFIX}${id}`;
}

export async function externalizeLargeDiaryAttachments(): Promise<void> {
  /* every reality's diary is externalized — attachments belong to their
     reality's container, not to whichever one happens to be active */
  const candidates = Object.values(state.realities ?? {}).flatMap((b) =>
    b.entries.flatMap((entry) => entry.attachments)
  );
  let changed = false;

  await Promise.all(candidates.map(async (attachment) => {
    if (attachment.payloadRef || !attachment.dataUrl || attachment.dataUrl.length <= DIARY_INLINE_LIMIT || !attachment.dataUrl.startsWith('data:')) return;
    try {
      const blob = await fetch(attachment.dataUrl).then((response) => response.blob());
      const payloadRef = diaryPayloadId(attachment.id);
      await putLocalPayload(payloadRef, blob);
      attachment.payloadRef = payloadRef;
      attachment.dataUrl = '';
      changed = true;
    } catch {
      /* Keep the inline attachment if browser payload storage is unavailable. */
    }
  }));

  if (changed) {
    refreshSnapshot();
    persistState();
    listeners.forEach((listener) => listener());
  }
}

export function persistState() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      const slim = {
        ...state,
        /* diskSync is live telemetry — ephemeral, never persisted */
        diskSync: undefined,
        /* the derived views mirror the active container — the containers
           themselves are the storage; strip the views to avoid duplication */
        bodies: undefined,
        entries: undefined,
        connections: undefined,
        vault: undefined,
        vaultTrash: undefined,
        efs: undefined,
        vaultUsers: state.vaultUsers.map((u) => {
          const n = { ...u };
          if (n.avatar && n.avatar.length > 2_600_000) n.avatar = null;
          if (n.avatarFrames && n.avatarFrames.join('').length > 3_500_000)
            n.avatarFrames = null;
          return n;
        }),
      };
      const serialized = JSON.stringify(slim);  /* Desktop tier: real file in the OS app-data dir (no 5MB quota). The
     localStorage write still runs as a fast cache + web fallback. */
      void desktopStore.writeState(serialized);
      localStorage.setItem(STORAGE_KEY, serialized);
      recordPersistence(serialized.length);
      quotaWarnedAt = 0;
    } catch (err) {
      /* Storage is full or the payload itself failed to serialize. Never
         silent: the user must know that edits since the last successful
         write exist only in memory. Re-alarm at most once a minute so a
         persist-per-second loop doesn't toast-spam. */
      if (Date.now() - quotaWarnedAt > 60_000) {
        quotaWarnedAt = Date.now();
        const msg = err instanceof Error ? err.message : String(err);
        const isQuota = /quota|exceeded|full/i.test(msg);
        toast(
          isQuota
            ? 'storage is full — recent edits are NOT saved to disk. Free space or export a backup.'
            : `state serialization failed (${msg.slice(0, 60)}) — recent edits are NOT saved. A backup export is strongly advised.`,
          'warn',
        );
        /* keep the last good snapshot so a fixable failure never overwrites
           a healthy store with a fresh seed */
        try {
          const lastGood = localStorage.getItem(STORAGE_KEY);
          if (lastGood) localStorage.setItem(STORAGE_KEYS.universeStateRecovery, lastGood);
        } catch { /* recovery snapshot best-effort */ }
      }
    }
  }, 1000);
}

export async function hydrateDesktopSnapshot(): Promise<void> {
  const w = window as unknown as { __TAURI_INTERNALS__?: unknown };
  if (!w.__TAURI_INTERNALS__) return;
  try {
    const fileJson = await desktopStore.readState();
    if (fileJson === null) {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) void desktopStore.writeState(local);
      return;
    }
    const local = localStorage.getItem(STORAGE_KEY);
    const canon = (s: string | null): string => {
      try { return JSON.stringify(JSON.parse(s ?? 'null')); } catch { return s ?? ''; }
    };
    if (canon(fileJson) === canon(local)) return;
    /* One adoption per webview session — the reload must never loop. If the
       two stores disagree AGAIN on the boot after the reload, the cache can
       only be loadState's own forward-migration of the file we just adopted
       (its boot-time defaults/repairs are the only cache-only writer, and the
       reload always lands before the first debounced persist can carry the
       migrated shape to the file). Clobbering here would discard the
       migration and re-produce the difference on every launch — the intro
       replayed forever. So the second time, the cache is the newer shape:
       adopt it and converge the file, no reload. */
    if (sessionStorage.getItem(STORAGE_KEYS.hydrateAdopted)) {
      if (local) void desktopStore.writeState(local);
      return;
    }
    try { sessionStorage.setItem(STORAGE_KEYS.hydrateAdopted, '1'); } catch { /* guard is best-effort */ }
    localStorage.setItem(STORAGE_KEY, fileJson);
    window.location.reload();
  } catch (err) {
    console.warn('[desktop] hydrate failed:', err);
  }
}
