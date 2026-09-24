/**
 * Sky Studio store — per-reality photo backdrops on disk.
 *
 * Every reality owns its skies inside its OWN folder (total isolation):
 *
 *   src/realities/<folder>/sky.json        ← the registry (active photo + roster + settings)
 *   src/realities/<folder>/assets/<id>.<ext>  ← the uploaded image bytes
 *
 * The registry is plain JSON (not a module) so Vite never watches-transforms
 * it and the daemon never needs to understand it. All path components pass
 * through sanitizeFolderName + isInside, the same hardening as every other
 * reality-folder API.
 */
import fs from 'fs';
import path from 'path';
import { sanitizeFolderName, isInside } from './paths';

export interface SkyPhoto {
  id: string;
  file: string;        /* assets/<id>.<ext> relative to the reality folder */
  name: string;        /* original upload filename */
  mime: string;
  size: number;        /* bytes */
  addedAt: number;
}

export interface SkyManifest {
  version: 1;
  activeId: string | null;
  photos: SkyPhoto[];
  settings: {
    blend: number;       /* 0..1 photo visibility over the procedural cosmos */
    dim: number;         /* 0..1 darkening so stars/planets read over it */
    blur: number;        /* 0..1 nebula softness (0 = crisp photo) */
    vignette: number;    /* 0..1 edge darkening */
    drift: number;       /* 0..1 slow parallax breathing amplitude */
  };
}

export const DEFAULT_SKY_SETTINGS: SkyManifest['settings'] = {
  blend: 0.85,
  dim: 0.45,
  blur: 0.12,
  vignette: 0.55,
  drift: 0.3,
};

const ALLOWED_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};
const MAX_PHOTO_BYTES = 6 * 1024 * 1024; /* 6 MB — ~8MB as base64, inside the 10mb json cap */
const MAX_PHOTOS = 8;

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  webp: 'image/webp', gif: 'image/gif', avif: 'image/avif',
};

function realitiesRoot(): string {
  return path.join(process.cwd(), 'src', 'realities');
}

/** Resolve + harden a reality folder. Returns null when unsafe/unknown. */
function resolveSkyDir(folderRaw: string | undefined, ensure = false): string | null {
  const folder = sanitizeFolderName(folderRaw);
  if (!folder) return null;
  const dir = path.join(realitiesRoot(), folder);
  if (!isInside(realitiesRoot(), dir)) return null;
  if (!fs.existsSync(dir)) {
    /* the folder may be gone (a binned reality, a hand-deleted folder) — an
       upload with ensure recreates a minimal healthy folder so the sky can
       still hold the user's photo instead of hard-failing */
    if (!ensure) return null;
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
      return null;
    }
  }
  if (!fs.statSync(dir).isDirectory()) return null;
  return dir;
}

function manifestPath(dir: string): string {
  return path.join(dir, 'sky.json');
}

function assetsDir(dir: string): string {
  const a = path.join(dir, 'assets');
  if (!fs.existsSync(a)) fs.mkdirSync(a, { recursive: true });
  return a;
}

function emptyManifest(): SkyManifest {
  return { version: 1, activeId: null, photos: [], settings: { ...DEFAULT_SKY_SETTINGS } };
}

export function readSkyManifest(folder: string | undefined): SkyManifest {
  const dir = resolveSkyDir(folder);
  if (!dir) return emptyManifest();
  try {
    const raw = JSON.parse(fs.readFileSync(manifestPath(dir), 'utf-8')) as SkyManifest;
    /* repair pass: tolerate hand-edited files */
    return {
      version: 1,
      activeId: typeof raw.activeId === 'string' ? raw.activeId : null,
      photos: Array.isArray(raw.photos) ? raw.photos.filter((p) => p && typeof p.id === 'string') : [],
      settings: { ...DEFAULT_SKY_SETTINGS, ...(raw.settings ?? {}) },
    };
  } catch {
    return emptyManifest();
  }
}

function writeSkyManifest(dir: string, manifest: SkyManifest): void {
  fs.writeFileSync(manifestPath(dir), JSON.stringify(manifest, null, 2), 'utf-8');
}

function pruneMissingPhotos(dir: string, manifest: SkyManifest): SkyManifest {
  const before = manifest.photos.length;
  manifest.photos = manifest.photos.filter((p) => {
    const f = path.join(dir, p.file);
    return isInside(dir, f) && fs.existsSync(f);
  });
  if (manifest.photos.length !== before) {
    manifest.activeId = manifest.photos.some((p) => p.id === manifest.activeId) ? manifest.activeId : null;
  }
  return manifest;
}

/** Store an uploaded image into the reality's own assets/ folder. */
export function addSkyPhoto(
  folder: string | undefined,
  input: { name: string; mime: string; dataBase64: string },
  ensure = true,
): { success: boolean; error?: string; photo?: SkyPhoto; manifest?: SkyManifest } {
  const dir = resolveSkyDir(folder, ensure);
  if (!dir) return { success: false, error: 'Unknown or unsafe reality folder' };

  const ext = ALLOWED_MIME[input?.mime];
  if (!ext) return { success: false, error: `Unsupported image type: ${input?.mime ?? 'none'}` };
  if (typeof input.dataBase64 !== 'string' || !input.dataBase64.length) {
    return { success: false, error: 'Empty upload' };
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(input.dataBase64, 'base64');
  } catch {
    return { success: false, error: 'Corrupt upload payload' };
  }
  if (!bytes.length) return { success: false, error: 'Empty upload' };
  if (bytes.length > MAX_PHOTO_BYTES) {
    return { success: false, error: `Image too large — ${Math.round(bytes.length / 1024 / 1024)} MB, the sky holds 6 MB` };
  }

  const manifest = pruneMissingPhotos(dir, readSkyManifest(folder));
  if (manifest.photos.length >= MAX_PHOTOS) {
    return { success: false, error: `This sky already holds ${MAX_PHOTOS} photos — remove one first` };
  }

  const id = `sky-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const photo: SkyPhoto = {
    id,
    file: `assets/${id}.${ext}`,
    name: String(input.name ?? 'photo').slice(0, 80),
    mime: input.mime,
    size: bytes.length,
    addedAt: Date.now(),
  };

  try {
    const target = path.join(assetsDir(dir), `${id}.${ext}`);
    if (!isInside(dir, target)) return { success: false, error: 'Unsafe asset path' };
    fs.writeFileSync(target, bytes);
    manifest.photos.push(photo);
    /* first upload becomes active immediately — instant gratification */
    if (!manifest.activeId) manifest.activeId = id;
    writeSkyManifest(dir, manifest);
    return { success: true, photo, manifest };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Write failed' };
  }
}

/** Remove one photo (file + registry entry). Active cleared if it was active. */
export function removeSkyPhoto(folder: string | undefined, photoId: string): { success: boolean; error?: string; manifest?: SkyManifest } {
  const dir = resolveSkyDir(folder);
  if (!dir) return { success: false, error: 'Unknown or unsafe reality folder' };
  const manifest = pruneMissingPhotos(dir, readSkyManifest(folder));
  const photo = manifest.photos.find((p) => p.id === photoId);
  if (!photo) return { success: false, error: 'No such photo in this sky' };

  try {
    const f = path.join(dir, photo.file);
    if (isInside(dir, f) && fs.existsSync(f)) fs.unlinkSync(f);
  } catch { /* file already gone — registry still updated */ }
  manifest.photos = manifest.photos.filter((p) => p.id !== photoId);
  if (manifest.activeId === photoId) manifest.activeId = null;
  writeSkyManifest(dir, manifest);
  return { success: true, manifest };
}

/** Activate / deactivate a photo for this reality. */
export function setActiveSkyPhoto(folder: string | undefined, photoId: string | null): { success: boolean; error?: string; manifest?: SkyManifest } {
  const dir = resolveSkyDir(folder);
  if (!dir) return { success: false, error: 'Unknown or unsafe reality folder' };
  const manifest = pruneMissingPhotos(dir, readSkyManifest(folder));
  if (photoId !== null && !manifest.photos.some((p) => p.id === photoId)) {
    return { success: false, error: 'No such photo in this sky' };
  }
  manifest.activeId = photoId;
  writeSkyManifest(dir, manifest);
  return { success: true, manifest };
}

/** Patch the mood sliders (blend / dim / blur / vignette / drift). */
export function updateSkySettings(folder: string | undefined, patch: Partial<SkyManifest['settings']> | undefined): { success: boolean; error?: string; manifest?: SkyManifest } {
  const dir = resolveSkyDir(folder);
  if (!dir) return { success: false, error: 'Unknown or unsafe reality folder' };
  const manifest = pruneMissingPhotos(dir, readSkyManifest(folder));
  const clamp01 = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;
  const p = patch ?? {};
  manifest.settings = {
    blend: clamp01(p.blend, manifest.settings.blend),
    dim: clamp01(p.dim, manifest.settings.dim),
    blur: clamp01(p.blur, manifest.settings.blur),
    vignette: clamp01(p.vignette, manifest.settings.vignette),
    drift: clamp01(p.drift, manifest.settings.drift),
  };
  writeSkyManifest(dir, manifest);
  return { success: true, manifest };
}

/** Full status for the UI. */
export function getSkyStatus(folder: string | undefined): SkyManifest {
  const dir = resolveSkyDir(folder);
  if (!dir) return emptyManifest();
  return pruneMissingPhotos(dir, readSkyManifest(folder));
}

/** The registry's mime for an asset extension (serving guard). */
export function mimeForExt(ext: string): string | null {
  return MIME_BY_EXT[ext.toLowerCase()] ?? null;
}
