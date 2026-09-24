/**
 * MY UNIVERSE — Node server (dev host + reality disk mirror).
 *
 * Responsibilities:
 *   1. Dev server: Vite middleware on :3000 (production serves dist/).
 *   2. Reality disk API: create/rename/delete reality folders and the
 *      Quantum Bin (move/restore/purge/empty) under src/realities — every
 *      path component is sanitized and containment-checked (paths.ts), and
 *      all generated source comes from the shared realityTemplates.ts.
 *   3. Starts the RealitySyncDaemon (3s scan & auto-repair).
 *
 * The desktop app replaces endpoints 2 with native Tauri commands
 * (src-tauri/src/realities.rs); the web app falls back to fetch() here.
 */
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { realityDaemon } from './realityDaemon';
import { sanitizeFolderName, isInside } from './paths';
import { renderSurfaceModule, renderRealityModule, defaultBodiesSource } from './realityTemplates';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Start continuous background reality synchronization daemon
  realityDaemon.start(3000);

  // API: Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // API: Reality Daemon continuous scan status & telemetry
  app.get('/api/realities/daemon-status', (_req, res) => {
    res.json(realityDaemon.getStatus());
  });

  // API: List reality folders on disk
  app.get('/api/realities/folders', (_req, res) => {
    try {
      const realitiesDir = path.join(process.cwd(), 'src', 'realities');
      if (!fs.existsSync(realitiesDir)) {
        return res.json({ success: true, folders: [] });
      }
      const items = fs.readdirSync(realitiesDir, { withFileTypes: true });
      const folders = items
        .filter((dirent) => dirent.isDirectory() && dirent.name !== 'bin' && dirent.name !== '.bin')
        .map((dirent) => {
          const folderPath = path.join(realitiesDir, dirent.name);
          const hasIndex = fs.existsSync(path.join(folderPath, 'index.ts'));
          const hasSurface = fs.existsSync(path.join(folderPath, 'surface.ts'));
          return {
            name: dirent.name,
            path: `src/realities/${dirent.name}`,
            hasIndex,
            hasSurface,
          };
        });
      res.json({ success: true, folders });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API: List realities in the recycle bin
  app.get('/api/realities/bin', (_req, res) => {
    try {
      const binDir = path.join(process.cwd(), 'src', 'realities', 'bin');
      if (!fs.existsSync(binDir)) {
        return res.json({ success: true, bin: [] });
      }
      const items = fs.readdirSync(binDir, { withFileTypes: true });
      const bin = items
        .filter((d) => d.isDirectory())
        .map((d) => {
          const folderPath = path.join(binDir, d.name);
          const stats = fs.statSync(folderPath);
          return {
            folderName: d.name,
            path: `src/realities/bin/${d.name}`,
            trashedAt: stats.mtimeMs,
          };
        });
      res.json({ success: true, bin });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API: Move reality to bin
  app.post('/api/realities/bin/move-to-bin', (req, res) => {
    const { realityId, folderName } = req.body;
    const result = realityDaemon.moveToBin(realityId, folderName);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // API: Restore reality from bin
  app.post('/api/realities/bin/restore', (req, res) => {
    const { realityId, folderName } = req.body;
    const result = realityDaemon.restoreFromBin(realityId, folderName);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // API: Purge reality permanently from bin
  app.post('/api/realities/bin/purge', (req, res) => {
    const { realityId, folderName } = req.body;
    const result = realityDaemon.purgeFromBin(realityId, folderName);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // API: Empty entire bin
  app.post('/api/realities/bin/empty', (_req, res) => {
    const result = realityDaemon.emptyBin();
    res.json(result);
  });

  // API: Rename reality folder
  app.post('/api/realities/rename-folder', (req, res) => {
    const { realityId, newName, folderName } = req.body;
    if (!realityId || !newName) {
      return res.status(400).json({ success: false, error: 'realityId and newName are required' });
    }
    const result = realityDaemon.renameRealityFolder(realityId, newName, folderName);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // API: Create a new reality folder and backend files on disk
  app.post('/api/realities/create-folder', (req, res) => {
    try {
      const {
        id,
        name,
        codeName,
        spectral,
        description,
        colorA = '#00f5d4',
        colorB = '#8b5cf6',
        starColor = '#ffeedd',
        bodies = [],
        entries = [],
        folderName: customFolderName,
        galaxyCountHint,
      } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ success: false, error: 'Reality name is required' });
      }

      // Generate clean folder name (e.g., "test" -> "test", "Chronos Paradox" -> "chronosParadox", "X" -> "x")
      // customFolderName arrives from the request body: sanitize it like any
      // other user path component before it reaches path.join.
      let folderName = sanitizeFolderName(customFolderName);
      if (!folderName) {
        const rawSanitized = name.replace(/[^a-zA-Z0-9\s-_]/g, '').trim();
        const words = rawSanitized.split(/[\s-_]+/);
        folderName = words
          .map((w, idx) => (idx === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
          .join('');
      }

      if (!folderName) {
        folderName = `reality_${Date.now()}`;
      }

      const realitiesDir = path.join(process.cwd(), 'src', 'realities');
      const targetDir = path.join(realitiesDir, folderName);
      if (!isInside(realitiesDir, targetDir)) {
        return res.status(400).json({ success: false, error: 'Invalid folder name' });
      }

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const cleanId = id || folderName.toLowerCase().replace(/[^a-z0-9]/g, '-');

      /* The create flow can fire more than once (double-submit, retry queue
         + live call). Only write when content differs — every identical
         write is a Vite watcher event, and watcher events on src/realities
         full-page-reload the dev app (the mid-warp reload storm). */
      const nextSurface = renderSurfaceModule({ id: cleanId, name, colorA, colorB, starColor, folderName });
      const nextIndex = renderRealityModule({
        id: cleanId,
        name,
        codeName: codeName || `REALITY-${folderName.toUpperCase()}`,
        spectral: spectral || 'Quantum Singularity',
        description: description || `The ${name} continuum realm.`,
        colorA,
        colorB,
        starColor,
        folderName,
        bodiesSource: bodies.length > 0
          ? JSON.stringify(bodies, null, 2)
          : defaultBodiesSource(cleanId, name, colorA, colorB),
        entriesSource: JSON.stringify(entries, null, 2),
        galaxyCountHint: typeof galaxyCountHint === 'number' ? galaxyCountHint : undefined,
      });
      const surfacePath = path.join(targetDir, 'surface.ts');
      const indexPath = path.join(targetDir, 'index.ts');
      const changed =
        !fs.existsSync(surfacePath) || fs.readFileSync(surfacePath, 'utf-8') !== nextSurface ||
        !fs.existsSync(indexPath) || fs.readFileSync(indexPath, 'utf-8') !== nextIndex;
      if (!changed) {
        realityDaemon.markRecentlyWritten(folderName);
        return res.json({ success: true, folderName, deduped: true });
      }

      fs.writeFileSync(surfacePath, nextSurface, 'utf-8');
      fs.writeFileSync(indexPath, nextIndex, 'utf-8');
      realityDaemon.markRecentlyWritten(folderName);

      console.log(`[API] Created reality folder on disk: src/realities/${folderName}`);

      res.json({
        success: true,
        message: `Reality folder created successfully at src/realities/${folderName}`,
        folderName,
        folderPath: `src/realities/${folderName}`,
        files: ['index.ts', 'surface.ts'],
        realityId: cleanId,
      });
    } catch (err: any) {
      console.error('Error creating reality folder:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API: Delete a reality folder on disk (transfers to src/realities/bin/)
  app.post('/api/realities/delete-folder', (req, res) => {
    try {
      const { realityId, folderName } = req.body;
      if (!realityId && !folderName) {
        return res.status(400).json({ success: false, error: 'realityId or folderName is required' });
      }

      // Protect Sol Prime anchor
      if (realityId === 'sol-prime' || folderName === 'solPrime' || folderName === 'sol-prime') {
        return res.status(400).json({ success: false, error: 'Sol Prime is protected from deletion.' });
      }

      // Transfer into bin directory via realityDaemon
      const binResult = realityDaemon.moveToBin(realityId, folderName);
      if (binResult.success) {
        return res.json({
          success: true,
          movedToBin: binResult.folderMoved,
          message: `Reality ${binResult.folderMoved} transferred to Quantum Bin on disk (src/realities/bin/${binResult.folderMoved})`,
        });
      }

      // Fallback: if moveToBin couldn't find directory, check and clean
      res.json({
        success: true,
        message: 'Reality purged from active state roster.',
      });
    } catch (err: any) {
      console.error('Error in delete-folder:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API: Write a reality's world database to its own folder (data.json).
  // The reality-first mirror: everything that belongs to a reality — its
  // config, worlds, diary, vault metadata — lives in that reality's folder.
  app.post('/api/realities/write-data', (req, res) => {
    const { realityId, folderName, data } = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ success: false, error: 'data object is required' });
    }

    const realitiesDir = path.join(process.cwd(), 'src', 'realities');
    let folder = sanitizeFolderName(folderName);
    if (!folder && realityId) {
      // resolve by matching the sanitized reality id against folder names
      const cleanRid = String(realityId).toLowerCase().replace(/[^a-z0-9]/g, '');
      try {
        const items = fs.readdirSync(realitiesDir, { withFileTypes: true });
        for (const d of items) {
          if (!d.isDirectory() || d.name === 'bin' || d.name === '.bin') continue;
          if (d.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanRid) { folder = d.name; break; }
        }
      } catch { /* readdir failure handled by the existsSync guard below */ }
    }
    if (!folder) {
      return res.status(400).json({ success: false, error: 'Could not resolve a reality folder' });
    }

    const dir = path.join(realitiesDir, folder);
    if (!isInside(realitiesDir, dir) || !fs.existsSync(dir)) {
      return res.status(400).json({ success: false, error: 'Reality folder does not exist' });
    }

    try {
      const dataFile = path.join(dir, 'data.json');
      const next = JSON.stringify({ ...data, realityId, mirroredAt: Date.now() }, null, 2);
      /* data.json is not a module — Vite ignores it — but keep writes honest:
         skip when the content is byte-identical (minus the timestamp). */
      let skip = false;
      try {
        const prev = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
        const { mirroredAt: _prevTs, ...prevRest } = prev;
        const { mirroredAt: _nextTs, ...nextRest } = JSON.parse(next);
        skip = JSON.stringify(prevRest) === JSON.stringify(nextRest);
      } catch { /* first write or unreadable — write */ }
      if (!skip) {
        fs.writeFileSync(dataFile, next, 'utf-8');
        realityDaemon.markRecentlyWritten(folder);
      }
      res.json({ success: true, path: `src/realities/${folder}/data.json` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  /* Round-9 hardening: the disk-mirror API can create/delete reality source
     folders — it must never sit open on the LAN by default. Loopback unless
     the operator explicitly opts in with HOST=0.0.0.0 (or --host). */
  const HOST = process.env.HOST ?? '127.0.0.1';
  const server = app.listen(PORT, HOST, () => {
    console.log(`🌌 Multiverse Server running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}${HOST === '0.0.0.0' ? ' (LAN-exposed — set HOST=127.0.0.1 to close)' : ''}`);
  });
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is already busy — another app (or a second copy of this server) is using it.`);
      console.error(`   Close that app first, then run "npm run dev" again.`);
    } else {
      console.error(`\n❌ Server failed to start: ${err.message}`);
    }
    process.exit(1);
  });
}

startServer().catch((err) => {
  console.error('\n❌ Fatal startup error:', err);
  process.exit(1);
});
