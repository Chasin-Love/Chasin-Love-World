/**
 * SKY ROUTER — per-reality photo backdrops (R52: extracted verbatim from
 * server/index.ts; route strings byte-identical — mapped 1:1 to Tauri
 * commands by src/desktop/adapter.ts).
 *
 * Every reality's sky lives in its OWN folder (src/realities/<folder>/):
 * sky.json holds the registry, assets/<id>.<ext> holds the image bytes.
 * Reality A's photo can never leak into Reality B's sky.
 */
import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { getSkyStatus, addSkyPhoto, removeSkyPhoto, setActiveSkyPhoto, updateSkySettings, mimeForExt } from '../skyStore';
import { sanitizeFolderName, isInside } from '../paths';
import { realityDaemon } from '../realityDaemon';

export function skyRouter(): Router {
  const r = Router();

  // GET sky status (registry + settings)
  r.get('/api/realities/sky/status', (req, res) => {
    const folder = typeof req.query.folder === 'string' ? req.query.folder : undefined;
    res.json({ success: true, manifest: getSkyStatus(folder) });
  });

  // POST upload a photo into this reality's own assets/ folder.
  // ensure: recreate a lost reality folder rather than failing the upload —
  // the user's photo always lands, even after a bin/restore round-trip.
  r.post('/api/realities/sky/upload', (req, res) => {
    const { folder, name, mime, dataBase64, ensure = true } = req.body ?? {};
    const result = addSkyPhoto(folder, { name, mime, dataBase64 }, ensure !== false);
    if (!result.success) return res.status(400).json(result);
    realityDaemon.markRecentlyWritten(sanitizeFolderName(folder));
    res.json(result);
  });

  // POST activate / deactivate a photo
  r.post('/api/realities/sky/activate', (req, res) => {
    const { folder, photoId } = req.body ?? {};
    const result = setActiveSkyPhoto(folder, photoId ?? null);
    if (!result.success) return res.status(400).json(result);
    realityDaemon.markRecentlyWritten(sanitizeFolderName(folder));
    res.json(result);
  });

  // POST delete one photo (file + registry entry)
  r.post('/api/realities/sky/delete', (req, res) => {
    const { folder, photoId } = req.body ?? {};
    const result = removeSkyPhoto(folder, photoId);
    if (!result.success) return res.status(400).json(result);
    realityDaemon.markRecentlyWritten(sanitizeFolderName(folder));
    res.json(result);
  });

  // POST patch the sky mood sliders
  r.post('/api/realities/sky/settings', (req, res) => {
    const { folder, settings } = req.body ?? {};
    const result = updateSkySettings(folder, settings);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  });

  // GET serve an asset from a reality's own assets/ folder.
  // ETag = sky.json mtime so the browser refetches exactly when the sky changes.
  r.get('/api/realities/sky/asset/:folder/assets/:file', (req, res) => {
    const folder = sanitizeFolderName(req.params.folder);
    const file = String(req.params.file ?? '');
    const realitiesDir = path.join(process.cwd(), 'src', 'realities');
    const dir = path.join(realitiesDir, folder);
    if (!folder || !isInside(realitiesDir, dir)) return res.status(400).end();
    /* strict whitelist — only generated sky asset names ever serve */
    const m = file.match(/^sky-[a-z0-9-]+\.(png|jpe?g|webp|gif|avif)$/i);
    if (!m) return res.status(400).end();
    const assetPath = path.join(dir, 'assets', file);
    if (!isInside(dir, assetPath) || !fs.existsSync(assetPath)) return res.status(404).end();
    const mime = mimeForExt(m[1]);
    if (!mime) return res.status(400).end();
    let etag = '';
    try { etag = `W/"${Math.floor(fs.statSync(path.join(dir, 'sky.json')).mtimeMs)}"`; } catch { etag = `W/"0"`; }
    res.set('Content-Type', mime);
    res.set('Cache-Control', 'no-cache');
    res.set('ETag', etag);
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
    res.sendFile(assetPath);
  });

  /* anything else under the asset prefix is rejected — never an SPA fallthrough */
  r.use('/api/realities/sky/asset', (_req, res) => {
    res.status(400).end();
  });

  return r;
}
