/**
 * MY UNIVERSE — Node server (dev host + reality disk mirror).
 *
 * Responsibilities:
 *   1. Dev server: Vite middleware on :3000 (production serves dist/).
 *   2. Reality disk API: create/rename/delete reality folders and the
 *      Quantum Bin under src/realities — routes live in ./routes (R52);
 *      every path component is sanitized and containment-checked, and all
 *      generated source comes from the shared realityTemplates.ts.
 *   3. Starts the RealitySyncDaemon (3s scan & auto-repair).
 *
 * The desktop app replaces the reality routes with native Tauri commands
 * (src-tauri/src/realities.rs); the web app falls back to fetch() here.
 * Route strings are byte-identical across both worlds — never rename them.
 */
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { realityDaemon } from './realityDaemon';
import { realitiesRouter } from './routes/realities';
import { skyRouter } from './routes/sky';

/* The daemon's scan cadence, in milliseconds. Kept beside the port (and named
   so the two can never be confused again) — it is NOT the HTTP port. */
const DAEMON_SCAN_MS = 3000;

async function startServer() {
  const app = express();
  /* PORT env var so hosted deploys (Render/Railway/VPS behind a proxy) can
     rebind; :3000 remains the default the desktop devUrl expects. */
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // Start continuous background reality synchronization daemon.
  // NOTE: start() takes the SCAN INTERVAL in ms — never the HTTP port. Passing
  // PORT here coincided with the daemon's 3000ms default only because both
  // are 3000; a deployed PORT=8080 would have silently scanned every 8s and
  // re-armed the dev reload-storm the grace window exists to prevent.
  realityDaemon.start(DAEMON_SCAN_MS);

  // API: Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  app.use(realitiesRouter());
  app.use(skyRouter());

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        /* HMR_PORT: two dev checkouts on one machine (e.g. parallel agent
           sessions) collide on Vite's middleware-mode default 24678 — each
           checkout gets its own HMR channel without touching the default. */
        hmr: { port: Number(process.env.HMR_PORT) || 24678 },
      },
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

  /* R86 — the graceful shutdown the daemon always offered and nothing ever
     called: stop the scan interval on the way out (realityDaemon.stop()). */
  const shutdown = () => {
    realityDaemon.stop();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch((err) => {
  console.error('\n❌ Fatal startup error:', err);
  process.exit(1);
});
