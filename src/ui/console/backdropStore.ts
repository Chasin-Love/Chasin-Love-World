import { useCallback, useEffect, useState } from 'react';

/* ------------------------------------------------------------------ */
/* THE BACKDROP STUDIO STORE — the user's own night.                   */
/*                                                                     */
/* Persists a console backdrop (image, animated GIF, or muted video)   */
/* in IndexedDB — browser-local sovereignty, no cloud, no localStorage */
/* (storageKeys law untouched). The record is tiny metadata plus the   */
/* media Blob itself; the shader night stays the reset-to default.     */
/* A module-level cache keeps the object URL alive across console      */
/* close/open so the user's backdrop re-appears instantly on remount.  */
/* ------------------------------------------------------------------ */

const DB_NAME = 'chasin-universe-ui';
const STORE = 'backdrop';
const KEY = 'active';
export const BACKDROP_MAX_BYTES = 150 * 1024 * 1024; // the night stays lighter than this

export type BackdropKind = 'image' | 'video'; // image covers GIFs (animated natively)

export interface BackdropRecord {
  kind: BackdropKind;
  mime: string;
  name: string;
  dim: number;
  blob: Blob;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = run(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function loadRecord(): Promise<BackdropRecord | null> {
  try {
    const rec = (await withStore<BackdropRecord | undefined>('readonly', (s) => s.get(KEY))) ?? null;
    return rec;
  } catch {
    return null; // private mode / quota refused — the shader night stands in
  }
}

async function saveRecord(rec: BackdropRecord): Promise<void> {
  await withStore('readwrite', (s) => s.put(rec, KEY));
}

async function deleteRecord(): Promise<void> {
  await withStore('readwrite', (s) => s.delete(KEY));
}

export function kindForMime(mime: string): BackdropKind | null {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  return null;
}

export interface ConsoleBackdrop {
  kind: 'shader' | BackdropKind;
  url: string | null;
  dim: number;
  /** returns an error message, or null on success */
  set: (file: File) => Promise<string | null>;
  clear: () => void;
  setDim: (dim: number) => void;
}

let cached: { rec: BackdropRecord; url: string } | null = null;

export function useConsoleBackdrop(): ConsoleBackdrop {
  const [rec, setRec] = useState<BackdropRecord | null>(() => cached?.rec ?? null);
  const [url, setUrl] = useState<string | null>(() => cached?.url ?? null);
  const [dim, setDimState] = useState<number>(() => cached?.rec.dim ?? 0.35);

  useEffect(() => {
    let alive = true;
    if (!cached) {
      void loadRecord().then((r) => {
        if (!alive || !r) return;
        cached = { rec: r, url: URL.createObjectURL(r.blob) };
        setRec(cached.rec);
        setUrl(cached.url);
        setDimState(r.dim);
      });
    }
    return () => {
      alive = false;
    };
  }, []);

  const set = useCallback(
    async (file: File) => {
      const kind = kindForMime(file.type);
      if (!kind) return 'Only images, GIFs or videos can hang on this wall.';
      if (file.size > BACKDROP_MAX_BYTES) return 'That file is heavier than 150 MB — the night stays lighter.';
      const next: BackdropRecord = { kind, mime: file.type, name: file.name, dim, blob: file };
      if (cached) URL.revokeObjectURL(cached.url);
      await saveRecord(next);
      cached = { rec: next, url: URL.createObjectURL(file) };
      setRec(next);
      setUrl(cached.url);
      return null;
    },
    [dim],
  );

  const clear = useCallback(() => {
    if (cached) URL.revokeObjectURL(cached.url);
    cached = null;
    setRec(null);
    setUrl(null);
    void deleteRecord();
  }, []);

  const setDim = useCallback((d: number) => {
    setDimState(d);
    if (cached) {
      const next = { ...cached.rec, dim: d };
      cached = { ...cached, rec: next };
      void saveRecord(next);
    }
  }, []);

  return { kind: url && rec ? rec.kind : 'shader', url, dim, set, clear, setDim };
}
