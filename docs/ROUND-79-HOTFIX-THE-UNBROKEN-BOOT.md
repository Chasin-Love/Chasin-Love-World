# ROUND 79 HOTFIX — THE UNBROKEN BOOT

**Date:** 2026-09-30  
**Branch:** `main`  
**Commits:** `8bbfacdd` (fix) · `9da562bd` (version bump 15.0.4)  
**Files changed:** `src/platform/storageKeys.ts` · `src/state/persist.ts` · `src-tauri/tauri.conf.json`

---

## The symptom

On the installed 15.0.3 desktop app the intro animation looped forever.
The screen faded in — "MY UNIVERSE" appeared, the animation almost reached
its end — then looped back to the opening frame. It never handed off to the
homepage. Closing and reopening the app reproduced it every time.

---

## The diagnosis (traced end-to-end)

`App.tsx:231` calls `hydrateDesktopSnapshot()` on every mount. That
function compares the desktop state file
(`%APPDATA%\MyUniverse\universe-state.json`) against the WebView's
localStorage cache, and on **any** difference it clobbers the cache with
the file and calls `window.location.reload()`.

The desktop file had been written on 2026-09-27 (mtime confirmed on the
live machine). It carried exactly:

```
activeRealityId, realities, vaultUsers, secrets, audit, visitedAt
```

But `loadState()` — which runs before React even mounts — adds a set of
boot-default keys every session when they are absent from the cache:
`customRealities, deletedRealityIds, binRealities, customGalaxies,
customRealityMeta, realityFolders, version`. It then writes the enriched
shape to localStorage only (not to the desktop file — the debounced
persist runs ≈1 s later).

So the sequence every boot was:

1. `loadState()` reads file-shaped cache (if any), adds boot defaults,
   writes enriched shape → localStorage.
2. App mounts; `hydrateDesktopSnapshot()` fires.
3. File is read. `canon(file) ≠ canon(cache)` — the cache has the
   extra keys.
4. Cache is **overwritten** with the file's sparse shape.
   `window.location.reload()` fires.
5. The reload restarts from step 1. The debounced persist never fired,
   so the file was never updated. The loop is closed.

Evidence: the file's mtime was frozen at 2026-09-27 even though the
app had been launched repeatedly on 2026-09-30. The WebView leveldb log
(updated today) held the `my-universe:v4` key without `customRealities`.

---

## The fix

**One adoption per webview session.** `sessionStorage` survives a
`window.location.reload()` but resets when the webview is fully closed and
re-launched — exactly the scope we need.

New key in `STORAGE_KEYS`: `hydrateAdopted = 'my-universe:hydrate-adopted'`.

Revised `hydrateDesktopSnapshot` logic:

```
if (file === cache)  →  return early (nothing to do)

if (sessionStorage has hydrateAdopted)
    →  the cache is NOW the authoritative shape (loadState's migration)
    →  write cache → file  (converge the file, no reload)
    →  return

sessionStorage.setItem(hydrateAdopted, '1')
localStorage.setItem(STORAGE_KEY, fileJson)
window.location.reload()          ← fires at most once per webview session
```

**Why this is safe:**

- First boot after install: file and cache are identical (both from the
  file) — no reload, no guard needed.
- First boot after an upgrade where the file shape is older than the
  cache's shape: the guard hasn't been set yet → adopt the file, reload
  once. On the boot after the reload `loadState` migrates the adopted
  file into the cache; the guard is set; `hydrateDesktop` converges the
  file instead of clobbering the cache → permanently converged.
- Subsequent boots: file === cache → return immediately. No adoption, no
  reload, no intro loop.

---

## Verification

- `npm run typecheck` — clean.
- All gauntlets green: R16 / R17 / R18-kamui / R63-void / R72-stage /
  R73-throat / R74-herald / R75-bridge / R76-steady / R79-one-sky.
- `npm run smoke` — SMOKE GREEN.
- `npm run prod:smoke` — PROD SMOKE GREEN.

---

## What is NOT changed

- The R79 in-flight One Sky work (`photoDome.ts`, `engine.ts`,
  `UniverseSurfaceManager.ts`, `skyRegistry.ts`, `skyStore.ts`,
  `sky.rs`, `RealityAdvancedPanel.tsx`) is left entirely untouched in
  the working tree — this hotfix is a surgical two-file change committed
  cleanly on top of it.
- The UNCLAIMED patch file is removed by the release commit; R79 in-flight
  continues from where it stood.
- No gauntlet constants, physics seeds, or shader code were touched.

---

## To deploy

The desktop build requires MSVC `link.exe`. Build via the project's
existing release pipeline (GitHub Actions or the machine where 15.0.3
was compiled); the two commits are on `main` and pushed. Publish the
signed NSIS installer as a GitHub Release tagged `v15.0.4` under the
updater's endpoint so existing 15.0.3 installs receive it automatically.
