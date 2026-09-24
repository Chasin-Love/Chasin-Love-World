/**
 * Continuous reality ⇄ disk synchronizer.
 *
 * Started once from App. Every cycle it:
 *   1. flushes the adapter's retry queue (failed disk mutations),
 *   2. polls the reality daemon for disk truth (active folders, bin folders,
 *      scan telemetry) and publishes it into state.diskSync for the UI,
 *   3. self-heals: re-creates the disk folder of any custom reality whose
 *      folder went missing (e.g. a create that fired while the server was
 *      down) — rate-limited to one attempt per minute per reality.
 *
 * The poll backs off when the daemon is unreachable (8s → 20s) so serving the
 * app without the Express disk mirror stays quiet instead of spamming errors.
 */
import type { BinFolderInfo, DiskSyncState } from '../types';
import { realityApi, flushDiskQueue } from '../desktop/adapter';
import { folderNameForReality } from '../realities';
import { getState, actions } from '../state';
import { toast } from '../ui/toast';

const HEALTHY_INTERVAL = 3000;
const DEGRADED_INTERVAL = 8000;
const OFFLINE_INTERVAL = 20000;
const HEAL_COOLDOWN = 60_000;
const MAX_LOG = 6;

interface DaemonStatus {
  active?: boolean;
  lastScanTime?: number;
  scanCount?: number;
  activeFolders?: string[];
  binFolders?: string[];
  operationsLog?: { timestamp: number; type: string; details: string }[];
}

let timer: ReturnType<typeof setTimeout> | null = null;
let consecutiveFailures = 0;
let lastHealAttempt: Record<string, number> = {};
let started = false;

function publish(patch: Partial<DiskSyncState>) {
  actions.setDiskSync(patch);
}

async function tick() {
  timer = null;
  try {
    await tickBody();
  } catch (err) {
    /* the heartbeat must NEVER die: one thrown error used to cancel the
       schedule chain and the disk mirror went silent forever */
    consecutiveFailures += 1;
    publish({
      connected: false,
      lastError: `disk sync cycle failed: ${err instanceof Error ? err.message : String(err)}`,
    });
    schedule(consecutiveFailures >= 3 ? OFFLINE_INTERVAL : DEGRADED_INTERVAL);
  }
}

async function tickBody() {
  await flushDiskQueue();

  const [status, binRes] = await Promise.all([
    realityApi<DaemonStatus>('/api/realities/daemon-status', undefined, 'GET'),
    realityApi<{ bin: BinFolderInfo[] }>('/api/realities/bin', undefined, 'GET'),
  ]);

  if (status) {
    const wasOffline = consecutiveFailures > 0;
    consecutiveFailures = 0;
    publish({
      connected: true,
      lastSyncTime: Date.now(),
      scanCount: status.scanCount ?? 0,
      activeFolders: status.activeFolders ?? [],
      binDetails: binRes?.bin ?? [],
      operationsLog: (status.operationsLog ?? []).slice(0, MAX_LOG),
      lastError: null,
    });
    if (wasOffline) toast('✦ Disk mirror reconnected — reality folders synchronized');
    void selfHeal(status.activeFolders ?? [], binRes?.bin ?? []);
    schedule(HEALTHY_INTERVAL);
  } else {
    consecutiveFailures += 1;
    publish({
      connected: false,
      lastError:
        'disk mirror unreachable — the reality daemon needs the Node server (npm run dev) to mirror folders to src/realities/',
    });
    schedule(consecutiveFailures >= 3 ? OFFLINE_INTERVAL : DEGRADED_INTERVAL);
  }
}

function schedule(ms: number) {
  if (timer !== null) return;
  timer = setTimeout(() => void tick(), ms);
}

/** Re-create the disk folder of any custom reality that lost it. */
async function selfHeal(activeFolders: string[], binFolders: BinFolderInfo[]) {
  const state = getState();
  const customs = state.customRealities ?? [];
  const now = Date.now();

  for (const cfg of customs) {
    if (!cfg?.id || !cfg?.name) continue;
    const folder =
      state.realityFolders?.[cfg.id] ??
      folderNameForReality(cfg.id);
    if (!folder) continue; // never had a known folder — nothing to heal against
    if (activeFolders.includes(folder)) continue;
    // a folder sitting in the bin is intentional, not missing
    if (binFolders.some((b) => b.folderName.toLowerCase() === folder.toLowerCase())) continue;

    if (now - (lastHealAttempt[cfg.id] ?? 0) < HEAL_COOLDOWN) continue;
    lastHealAttempt[cfg.id] = now;

    const res = await realityApi<{ success?: boolean; folderName?: string }>(
      '/api/realities/create-folder',
      { ...cfg, folderName: folder },
    );
    if (res?.success) {
      actions.rememberRealityFolder(cfg.id, res.folderName ?? folder);
      toast(`✦ Disk mirror healed — folder src/realities/${res.folderName ?? folder} restored`);
    }
  }
}

/** Force an immediate sync cycle (the Quantum Bin "Sync Now" button). */
export function reconcileNow() {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  void tick();
}

export function startRealitySync() {
  if (started) return;
  started = true;
  lastHealAttempt = {};
  void tick();
}
