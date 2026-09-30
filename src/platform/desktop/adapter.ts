/**
 * Desktop adapter — the single seam between the web runtime and the Tauri
 * desktop shell. Every native capability the app uses funnels through here:
 *
 *   - `isDesktop()`            feature detection (window.__TAURI_INTERNALS__)
 *   - `desktopStore`           universe-state JSON + payload bytes on real files
 *   - `realityApi()`           reality-folder daemon endpoints (native commands
 *                              on desktop, fetch('/api/...') on web)
 *
 * Web mode keeps its current behavior untouched: every desktop path is
 * tried first and silently skipped when unavailable.
 */

export function isDesktop(): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
}

type TauriInvoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
let invokeFn: TauriInvoke | null | undefined;

async function getInvoke(): Promise<TauriInvoke | null> {
  if (invokeFn !== undefined) return invokeFn;
  if (!isDesktop()) {
    invokeFn = null;
    return null;
  }
  try {
    const core = await import('@tauri-apps/api/core');
    invokeFn = core.invoke as TauriInvoke;
  } catch {
    invokeFn = null;
  }
  return invokeFn;
}

/* ------------------------------- state JSON ------------------------------- */

export const desktopStore = {
  /** Read the persisted universe state from disk. null = no desktop store. */
  async readState(): Promise<string | null> {
    const call = await getInvoke();
    if (!call) return null;
    try {
      const res = await call<{ json: string | null }>('store_state_read');
      return res.json ?? null;
    } catch (err) {
      console.warn('[desktop] state read failed:', err);
      return null;
    }
  },

  /** Write the universe state to disk. Returns false when not on desktop. */
  async writeState(json: string): Promise<boolean> {
    const call = await getInvoke();
    if (!call) return false;
    try {
      await call('store_state_write', { json });
      return true;
    } catch (err) {
      console.warn('[desktop] state write failed:', err);
      return false;
    }
  },
};

/* -------------------------------- payloads -------------------------------- */

export const desktopPayloads = {
  /**
   * Store payload bytes on disk. Uses Tauri raw IPC with a length-prefixed
   * framing: [u16 LE idLen][id UTF-8][payload] — large media crosses the
   * bridge without JSON encoding.
   */
  async put(id: string, bytes: Uint8Array): Promise<boolean> {
    const call = await getInvoke();
    if (!call) return false;
    try {
      const idBytes = new TextEncoder().encode(id);
      if (idBytes.length > 65535) return false;
      const frame = new Uint8Array(2 + idBytes.length + bytes.length);
      frame[0] = idBytes.length & 0xff;
      frame[1] = (idBytes.length >> 8) & 0xff;
      frame.set(idBytes, 2);
      frame.set(bytes, 2 + idBytes.length);
      await call('store_payload_put', frame as unknown as Record<string, unknown>);
      return true;
    } catch (err) {
      console.warn('[desktop] payload put failed:', err);
      return false;
    }
  },

  async get(id: string): Promise<Uint8Array | null> {
    const call = await getInvoke();
    if (!call) return null;
    try {
      const res = await call<number[] | null>('store_payload_get', { id });
      return res ? Uint8Array.from(res) : null;
    } catch (err) {
      console.warn('[desktop] payload get failed:', err);
      return null;
    }
  },

  async delete(id: string): Promise<boolean> {
    const call = await getInvoke();
    if (!call) return false;
    try {
      await call('store_payload_delete', { id });
      return true;
    } catch (err) {
      console.warn('[desktop] payload delete failed:', err);
      return false;
    }
  },
};

/* --------------------------- reality daemon API --------------------------- */

function mapRealityEndpoint<T = unknown>(path: string, body: unknown): { cmd: string; args: Record<string, unknown> } | null {
  const b = (body ?? {}) as Record<string, unknown>;
  /* Match on the bare route — callers may append a query string (the sky
     status twin carries ?folder=…), which must not break the exact-path
     cases below. The case bodies still read the query off `path` itself. */
  switch (path.split('?')[0]) {
    case '/api/realities/rename-folder':
      return { cmd: 'reality_rename', args: { realityId: b.realityId, newName: b.newName } };
    case '/api/realities/bin/move-to-bin':
      return { cmd: 'reality_move_to_bin', args: { realityId: b.realityId, folderName: b.folderName } };
    case '/api/realities/bin/restore':
      return { cmd: 'reality_restore', args: { realityId: b.realityId, folderName: b.folderName } };
    case '/api/realities/bin/purge':
      return { cmd: 'reality_purge', args: { realityId: b.realityId, folderName: b.folderName } };
    case '/api/realities/bin/empty':
      return { cmd: 'reality_empty_bin', args: {} };
    case '/api/realities/daemon-status':
      return { cmd: 'reality_daemon_status', args: {} };
    case '/api/realities/bin':
      return { cmd: 'reality_bin_list', args: {} };
    /* Sky Studio — the desktop twin of server/routes/sky.ts. Status keeps
       the query-param shape of its HTTP twin; mutations keep the body shape.
       The asset route returns RAW BYTES (the webview has no HTTP route into
       the realities tree) — skyRegistry wraps them in a blob URL. */
    case '/api/realities/sky/status': {
      const q = path.split('?')[1] ?? '';
      const folder = new URLSearchParams(q).get('folder');
      return { cmd: 'sky_status', args: { folder } };
    }
    case '/api/realities/sky/upload':
      return { cmd: 'sky_upload', args: { folder: b.folder, name: b.name, mime: b.mime, dataBase64: b.dataBase64, ensure: b.ensure } };
    case '/api/realities/sky/activate':
      return { cmd: 'sky_activate', args: { folder: b.folder, photoId: b.photoId } };
    case '/api/realities/sky/delete':
      return { cmd: 'sky_delete', args: { folder: b.folder, photoId: b.photoId } };
    case '/api/realities/sky/settings':
      return { cmd: 'sky_settings', args: { folder: b.folder, settings: b.settings } };
    case '/api/realities/sky/asset-bytes':
      return { cmd: 'sky_asset', args: { folder: b.folder, file: b.file } };
    case '/api/realities/create-folder': {
      const cfg = b as Record<string, unknown>;
      return {
        cmd: 'reality_create_folder',
        args: {
          id: cfg.id ?? null,
          name: cfg.name,
          codeName: cfg.codeName ?? null,
          spectral: cfg.spectral ?? null,
          description: cfg.description ?? null,
          colorA: cfg.colorA ?? '#00f5d4',
          colorB: cfg.colorB ?? '#8b5cf6',
          starColor: cfg.starColor ?? '#ffeedd',
          bodies: JSON.stringify(cfg.bodies ?? []),
          entries: JSON.stringify(cfg.entries ?? []),
          folderName: cfg.folderName ?? null,
          galaxyCountHint: typeof cfg.galaxyCountHint === 'number' ? cfg.galaxyCountHint : null,
        },
      };
    }
    /* The reality-first mirror: a reality's world database lands in its own
       folder as data.json. The desktop twin of the server's write-data route —
       without it every mirror write burned the 5-retry queue and died. */
    case '/api/realities/write-data': {
      if (!b.data || typeof b.data !== 'object') return null;
      return { cmd: 'reality_write_data', args: { realityId: b.realityId, folderName: b.folderName, data: JSON.stringify(b.data) } };
    }
    default:
      return null;
  }
}

/**
 * Reality daemon call that works in both runtimes. Returns parsed JSON on
 * success, null on failure (callers already degrade gracefully on null).
 */
export async function realityApi<T = unknown>(path: string, body?: unknown, method: 'GET' | 'POST' = 'POST'): Promise<T | null> {
  if (isDesktop()) {
    const mapped = mapRealityEndpoint(path, body);
    if (!mapped) {
      console.warn('[desktop] no native command for', path);
      return null;
    }
    const call = await getInvoke();
    if (!call) return null;
    try {
      return await call<T>(mapped.cmd, mapped.args);
    } catch (err) {
      console.warn('[desktop] reality command failed:', path, err);
      return null;
    }
  }
  try {
    const res = await fetch(path, method === 'POST' ? {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    } : undefined);
    return (await res.json()) as T;
  } catch (err) {
    console.warn('[api] fetch failed:', path, err);
    return null;
  }
}

/* --------------------- reliable mutations + retry queue -------------------- */

const MAX_OP_RETRIES = 5;
interface PendingOp { path: string; body: unknown; method: 'GET' | 'POST'; tries: number }
const opQueue: PendingOp[] = [];
let flushing = false;

function diskOpSucceeded(res: unknown): boolean {
  if (res === null || res === undefined) return false;
  if (typeof res === 'object' && 'success' in (res as Record<string, unknown>)) {
    return (res as Record<string, unknown>).success === true;
  }
  return true;
}

/**
 * A reality disk mutation that is actually reliable: awaited, success-checked,
 * and queued for automatic retry when the daemon is unreachable. Resolves to
 * `true` only when the disk operation truly succeeded.
 */
export async function syncedRealityApi(path: string, body?: unknown, method: 'POST' = 'POST'): Promise<boolean> {
  const res = await realityApi(path, body, method);
  if (diskOpSucceeded(res)) return true;

  opQueue.push({ path, body, method, tries: 1 });
  return false;
}

/** Retry every queued disk mutation. Called by the realitySync poll loop. */
export async function flushDiskQueue(): Promise<number> {
  if (flushing || opQueue.length === 0) return opQueue.length;
  flushing = true;
  try {
    for (let i = opQueue.length - 1; i >= 0; i--) {
      const op = opQueue[i];
      const res = await realityApi(op.path, op.body, op.method);
      if (diskOpSucceeded(res)) {
        opQueue.splice(i, 1);
      } else {
        op.tries += 1;
        if (op.tries > MAX_OP_RETRIES) {
          console.warn('[sync] dropping disk op after max retries:', op.path);
          opQueue.splice(i, 1);
        }
      }
    }
  } finally {
    flushing = false;
  }
  return opQueue.length;
}
