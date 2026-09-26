/**
 * Sky Studio client registry — per-reality photo skies.
 *
 * Mirrors the server's sky.json contract:
 *   GET  /api/realities/sky/status?folder=<folder>   → { manifest }
 *   POST /api/realities/sky/upload                   → { manifest }
 *   POST /api/realities/sky/activate                 → { manifest }
 *   POST /api/realities/sky/delete                   → { manifest }
 *   POST /api/realities/sky/settings                 → { manifest }
 *   GET  /api/realities/sky/asset/<folder>/<file>    → image bytes
 *
 * Every manifest is cached per reality id; every mutation re-emits
 * onSkyChanged so the engine's photo dome updates live. Total isolation:
 * a reality's sky is addressed by that reality's OWN disk folder.
 */
import { realityApi, isDesktop } from '../desktop/adapter';
import { folderNameForReality, deriveFolderName, getReality } from '../../realities';
import { getState } from '../../state';

export interface SkyPhoto {
  id: string;
  file: string;        /* assets/<id>.<ext> */
  name: string;
  mime: string;
  size: number;
  addedAt: number;
}

export interface SkySettings {
  blend: number;     /* 0..1 photo visibility over the procedural cosmos */
  dim: number;       /* 0..1 darkening so stars read over the photo */
  blur: number;      /* 0..1 nebula softness */
  vignette: number;  /* 0..1 edge darkening */
  drift: number;     /* 0..1 slow parallax breathing */
}

export interface SkyManifest {
  version: 1;
  activeId: string | null;
  photos: SkyPhoto[];
  settings: SkySettings;
}

/** What the engine's photo dome actually consumes. */
export interface ActiveSkySpec {
  url: string;
  blend: number;
  dim: number;
  blur: number;
  vignette: number;
  drift: number;
}

const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'];

/* ------------------------------ resolution ------------------------------ */

/** Best-known disk folder for a reality (recorded map → build map → name). */
function skyFolderForReality(realityId: string): string {
  const st = getState();
  return (
    st.realityFolders?.[realityId] ??
    folderNameForReality(realityId) ??
    deriveFolderName(getReality(realityId)?.name ?? realityId)
  );
}

export function skyAssetUrl(realityId: string, file: string): string {
  /* Desktop: sky assets never cross HTTP — the Tauri webview has no route
     into the realities tree. Rust returns raw bytes; they are wrapped in a
     blob URL here and cached (warmSkyAsset below keeps it fresh). Web: the
     express route serves the bytes as before. */
  if (isDesktop()) {
    const folder = skyFolderForReality(realityId);
    return blobUrlCache.get(`${folder}/${file}`) ?? '';
  }
  return `/api/realities/sky/asset/${encodeURIComponent(skyFolderForReality(realityId))}/${file}`;
}

/* -------------------------------- cache --------------------------------- */

const cache = new Map<string, SkyManifest>();
let lastEmittedSig = '';

function sigOf(realityId: string, m: SkyManifest): string {
  return `${realityId}|${m.activeId}|${m.photos.map((p) => p.id).join(',')}|${JSON.stringify(m.settings)}`;
}

const listeners = new Set<(realityId: string, manifest: SkyManifest) => void>();

/** Subscribe to sky changes (upload/activate/delete/settings). Returns off(). */
export function onSkyChanged(fn: (realityId: string, manifest: SkyManifest) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(realityId: string, manifest: SkyManifest, force = false): void {
  const sig = sigOf(realityId, manifest);
  if (!force && sig === lastEmittedSig) return;
  lastEmittedSig = sig;
  listeners.forEach((fn) => fn(realityId, manifest));
}

function adopt(realityId: string, manifest: SkyManifest, force = false): SkyManifest {
  cache.set(realityId, manifest);
  emit(realityId, manifest, force);
  return manifest;
}

/** Currently cached manifest (no network). */


/** The active photo spec for the engine dome — null when this reality has none. */
export function getActiveSkySpec(realityId: string): ActiveSkySpec | null {
  const m = cache.get(realityId);
  const photo = m?.photos.find((p) => p.id === m.activeId);
  if (!m || !photo) return null;
  return { url: skyAssetUrl(realityId, photo.file), ...m.settings };
}

/* ------------------------------ disk calls ------------------------------ */

const EMPTY_SKY: SkyManifest = {
  version: 1,
  activeId: null,
  photos: [],
  settings: { blend: 0.85, dim: 0.45, blur: 0.12, vignette: 0.55, drift: 0.3 },
};

/* ----------------------- desktop blob-URL bridge ------------------------
   On desktop every photo's bytes come from Rust (sky_asset command) and are
   wrapped in an object URL keyed by `<folder>/<file>`. `warmSkyAssets`
   fills the cache BEFORE a manifest is adopted, so skyAssetUrl() never
   returns an empty string for a photo the manifest knows about. URLs are
   revoked when a photo is deleted or its folder changes. */
const blobUrlCache = new Map<string, string>();

async function warmSkyAssets(realityId: string, manifest: SkyManifest): Promise<void> {
  if (!isDesktop()) return;
  const folder = skyFolderForReality(realityId);
  const wanted = new Set(manifest.photos.map((p) => `${folder}/${p.file}`));
  for (const [key, url] of blobUrlCache) {
    if (!wanted.has(key)) {
      URL.revokeObjectURL(url);
      blobUrlCache.delete(key);
    }
  }
  await Promise.all(
    manifest.photos.map(async (p) => {
      const key = `${folder}/${p.file}`;
      if (blobUrlCache.has(key)) return;
      try {
        const bytes = await realityApi<number[]>('/api/realities/sky/asset-bytes', { folder, file: p.file });
        if (Array.isArray(bytes) && bytes.length) {
          blobUrlCache.set(key, URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: p.mime || 'image/jpeg' })));
        }
      } catch { /* leave the cache without it — the <img> just stays empty */ }
    }),
  );
}

async function fetchSky(realityId: string): Promise<SkyManifest> {
  try {
    const res = await realityApi<{ success?: boolean; manifest?: SkyManifest }>(
      `/api/realities/sky/status?folder=${encodeURIComponent(skyFolderForReality(realityId))}`,
      undefined,
      'GET',
    );
    if (res?.manifest) {
      await warmSkyAssets(realityId, res.manifest);
      return adopt(realityId, res.manifest, true);
    }
  } catch { /* fall through to the cache-preservation path */ }
  /* No answer (desktop-native or server hiccup): keep any healthy cached
     manifest — a transient network blip must never wipe a real sky. Only
     adopt a genuine empty sky when nothing better is known. */
  const cached = cache.get(realityId);
  if (!cached) adopt(realityId, EMPTY_SKY, true);
  return cache.get(realityId) ?? EMPTY_SKY;
}

/** Fetch once (cached) then announce — used at boot and on reality switch. */
export async function ensureSkyFor(realityId: string): Promise<SkyManifest> {
  const m = await fetchSky(realityId);
  return m;
}

function readUploadFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? '').split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('could not read the file'));
    reader.readAsDataURL(file);
  });
}

export async function uploadSkyPhoto(realityId: string, file: File): Promise<SkyManifest> {
  if (!ALLOWED_MIME.includes(file.type)) {
    throw new Error('that file is not a photo — png, jpg, webp, gif or avif');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`too large — ${Math.round(file.size / 1024 / 1024)} MB, the sky holds 6 MB`);
  }
  /* cover-crop onto a 2:1 equirectangular canvas so sphere mapping never
     pole-stretches the photo — wide sky, no funhouse distortion */
  const dataBase64 = await rasterizeToEquirect(file);
  const res = await realityApi<{ success?: boolean; error?: string; manifest?: SkyManifest }>(
    '/api/realities/sky/upload',
    { folder: skyFolderForReality(realityId), name: file.name, mime: 'image/jpeg', dataBase64, ensure: true },
  );
  if (!res?.success || !res.manifest) throw new Error(res?.error ?? 'the sky rejected the upload');
  await warmSkyAssets(realityId, res.manifest);
  return adopt(realityId, res.manifest);
}

/** Draw any image onto a 2048×1024 equirect canvas (cover-crop), return JPEG base64. */
async function rasterizeToEquirect(file: File): Promise<string> {
  const W = 2048, H = 1024;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error('could not decode the image'));
      im.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const g = canvas.getContext('2d');
    if (!g) return await readUploadFile(file); /* canvas unavailable — upload as-is */
    /* cover-crop: fill the panorama, centering the interesting middle band */
    const scale = Math.max(W / img.width, H / img.height);
    const dw = img.width * scale, dh = img.height * scale;
    g.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    return dataUrl.split(',')[1] ?? '';
  } catch {
    /* decode failed — let the server surface the real error */
    return await readUploadFile(file);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function activateSkyPhoto(realityId: string, photoId: string | null): Promise<SkyManifest> {
  const res = await realityApi<{ success?: boolean; error?: string; manifest?: SkyManifest }>(
    '/api/realities/sky/activate',
    { folder: skyFolderForReality(realityId), photoId },
  );
  if (!res?.success || !res.manifest) throw new Error(res?.error ?? 'activation failed');
  await warmSkyAssets(realityId, res.manifest);
  return adopt(realityId, res.manifest);
}

export async function deleteSkyPhoto(realityId: string, photoId: string): Promise<SkyManifest> {
  const res = await realityApi<{ success?: boolean; error?: string; manifest?: SkyManifest }>(
    '/api/realities/sky/delete',
    { folder: skyFolderForReality(realityId), photoId },
  );
  if (!res?.success || !res.manifest) throw new Error(res?.error ?? 'delete failed');
  await warmSkyAssets(realityId, res.manifest);
  return adopt(realityId, res.manifest);
}

export async function saveSkySettings(realityId: string, patch: Partial<SkySettings>): Promise<SkyManifest> {
  const res = await realityApi<{ success?: boolean; error?: string; manifest?: SkyManifest }>(
    '/api/realities/sky/settings',
    { folder: skyFolderForReality(realityId), settings: patch },
  );
  if (!res?.success || !res.manifest) throw new Error(res?.error ?? 'settings failed');
  return adopt(realityId, res.manifest);
}
