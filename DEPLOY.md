# DEPLOY — putting MY UNIVERSE on the web (and on desktops)

Two official targets, one codebase. Both cost **$0/month**.

| Target | What it is | Cost |
|---|---|---|
| **Static website** | `dist/` on any static host (Cloudflare Pages etc.) | Free forever |
| **Desktop app** | Windows NSIS installer (+ Linux deb/AppImage) via GitHub Releases | Free — CI builds it |

---

## 1. Static website (recommended first step)

The app is client-sovereign: all state lives in `localStorage` + IndexedDB, so a
static host runs the full core experience with **no server at all**.

> The site must be served at a **domain root** (e.g. `https://my-universe.pages.dev/`),
> not a sub-path (`/repo-name/`) — the build emits absolute `/assets`, `/fonts`
> and worker paths. Cloudflare Pages and Netlify deploy at the root by default.

### Cloudflare Pages — click by click

1. Go to <https://dash.cloudflare.com> → sign up / log in (free).
2. **Workers & Pages → Create → Pages → Connect to Git.**
3. Pick the repo `test-version-of-Chasin-Loove-World-` (GitHub connection, once).
4. Build settings:
   - Framework preset: **None**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Environment variable: `NODE_VERSION` = `20`
5. **Save and Deploy.** Every push to `main` now redeploys automatically.
6. Optional: Custom domains → point your own domain at it (free, auto-HTTPS).

### What works / what's desktop-only on static

| Feature | Static web | Desktop app |
|---|---|---|
| 3D cosmos, physics, lensing, black hole | ✅ | ✅ |
| Diary, moons, attachments, PDF/MD export | ✅ | ✅ |
| Vault, EFS, Key Ring, TOTP, executors (JS/Py/PDF/ISO/ZIP) | ✅ | ✅ |
| Custom realities (create/rename/delete) | ✅ (localStorage) | ✅ (+ disk folders) |
| Sky Studio photo backdrops | ❌ * | ✅ |
| Quantum Bin disk folders + `data.json` mirror | ❌ * | ✅ |

\* The server-backed web option below unlocks them on web too. Static mode is
quiet about it: the Disk Sync tile shows the mirror as offline, and no warn
toasts fire (disk-mirror toasts are gated on the mirror actually being expected).

**Warning:** browser data is per-browser/per-device. Clearing site data erases
the universe — export diaries (PDF/JSON) and use the vault's own backups.

## 2. Full-features web (Node server) — later, optional

The build already bundles the server (`dist/server.cjs`). Any Node host works:

```bash
npm run build
NODE_ENV=production PORT=8080 node dist/server.cjs   # honors PORT + HOST
```

- `HOST` defaults to loopback; set `HOST=0.0.0.0` only behind a proxy/firewall
  you control (Round-9 hardening — the API can create/delete folders).
- Run from the repo root (it serves `./dist` and mirrors into `./src/realities`).
- Free-tier hosts: Render / Railway / Fly.io (or a ~$4/mo VPS + reverse proxy).

## 3. Desktop installers (already automated)

`.github/workflows/desktop.yml` builds on every push; pushing a **tag** publishes:

```bash
git tag v15.0.0 && git push origin v15.0.0
```

→ a GitHub Release appears with `MY-UNIVERSE_*_x64-setup.exe` (Windows),
`.deb` and `.AppImage` (Linux). Users just download from the Releases page.
