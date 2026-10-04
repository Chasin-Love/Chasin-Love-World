/**
 * Reality Sync Daemon — background guardian of the src/realities tree.
 *
 * Every 3 seconds it scans the active reality folders and auto-repairs any
 * folder missing its `index.ts` or `surface.ts` (using the shared templates
 * in realityTemplates.ts). It also owns the Quantum Bin disk operations:
 * move-to-bin, restore, purge, and empty — all with the sanitize + containment
 * rules from paths.ts applied before any filesystem write.
 *
 * The daemon is a dev-time convenience: user-created realities live
 * authoritatively in localStorage, so a static deploy degrades gracefully
 * without it.
 */
import fs from 'fs';
import path from 'path';
import { sanitizeFolderName, isInside } from './paths';
import { renderSurfaceModule, renderRealityModule, anchorOnlyBodiesSource } from './realityTemplates';

export interface DaemonStatus {
  active: boolean;
  lastScanTime: number;
  scanCount: number;
  activeFolders: string[];
  binFolders: string[];
  operationsLog: { timestamp: number; type: string; details: string }[];
}

const MAX_LOGS = 50;

class RealitySyncDaemon {
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private scanCount: number = 0;
  private lastScanTime: number = 0;
  private operationsLog: { timestamp: number; type: string; details: string }[] = [];

  private realitiesDir: string = path.join(process.cwd(), 'src', 'realities');
  private binDir: string = path.join(process.cwd(), 'src', 'realities', 'bin');

  constructor() {
    this.ensureDirectories();
  }

  public log(type: string, details: string) {
    const entry = { timestamp: Date.now(), type, details };
    this.operationsLog.unshift(entry);
    if (this.operationsLog.length > MAX_LOGS) {
      this.operationsLog.pop();
    }
    console.log(`[REALITY-DAEMON] [${type}] ${details}`);
  }

  public ensureDirectories() {
    if (!fs.existsSync(this.realitiesDir)) {
      fs.mkdirSync(this.realitiesDir, { recursive: true });
    }
    if (!fs.existsSync(this.binDir)) {
      fs.mkdirSync(this.binDir, { recursive: true });
    }
  }

  public start(intervalMs: number = 3000) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.ensureDirectories();
    this.log('DAEMON_START', `Continuously scanning realities every ${intervalMs}ms`);

    // Run initial scan
    this.scanAndSync();

    this.intervalId = setInterval(() => {
      this.scanAndSync();
    }, intervalMs);
  }

  /** Folders the app itself wrote recently (create-folder, data mirror).
      Auto-repair skips them for a grace window so the daemon never races
      the app and rewrites a module that was just authored — that rewrite
      was the second trigger of the dev-mode full-reload storm. */
  private recentlyWritten = new Map<string, number>();
  private static GRACE_MS = 20000;

  markRecentlyWritten(folderName: string) {
    this.recentlyWritten.set(folderName.toLowerCase(), Date.now());
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    this.log('DAEMON_STOP', 'Daemon paused');
  }

  public scanAndSync() {
    this.scanCount++;
    this.lastScanTime = Date.now();
    this.ensureDirectories();

    try {
      const items = fs.readdirSync(this.realitiesDir, { withFileTypes: true });

      for (const dirent of items) {
        if (!dirent.isDirectory()) continue;
        if (dirent.name === 'bin' || dirent.name === '.bin') continue;
        /* R52 — the seed reality's modules are canonical (its surface look lives
           in engine/surface/surfacePresets.ts): never regenerate them, or a
           deliberately removed file would return as a generic template within
           one 3s scan */
        if (dirent.name === 'solPrime') continue;

        /* grace window — the app owns this folder's files for now */
        const markedAt = this.recentlyWritten.get(dirent.name.toLowerCase());
        if (markedAt && Date.now() - markedAt < RealitySyncDaemon.GRACE_MS) continue;
        if (markedAt) this.recentlyWritten.delete(dirent.name.toLowerCase());

        const folderPath = path.join(this.realitiesDir, dirent.name);
        const indexPath = path.join(folderPath, 'index.ts');
        const surfacePath = path.join(folderPath, 'surface.ts');
        const id = dirent.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const title = dirent.name.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());

        // Check if index.ts exists; if missing, repair
        if (!fs.existsSync(indexPath)) {
          const indexCode = renderRealityModule({
            id,
            name: title,
            codeName: id.toUpperCase(),
            spectral: 'Class A Luminary Continuum',
            description: 'Synthesized parallel reality synchronized by Reality Daemon.',
            colorA: '#00f5d4',
            colorB: '#8b5cf6',
            starColor: '#ffeedd',
            folderName: dirent.name,
            bodiesSource: anchorOnlyBodiesSource(id, title),
            entriesSource: '[]',
          });

          fs.writeFileSync(indexPath, indexCode, 'utf-8');
          this.log('AUTOREPAIR_INDEX', `Generated missing index.ts for src/realities/${dirent.name}`);
        }

        // Check if surface.ts exists; if missing, repair
        if (!fs.existsSync(surfacePath)) {
          const surfaceCode = renderSurfaceModule({
            id,
            name: title,
            colorA: '#00f5d4',
            colorB: '#8b5cf6',
            starColor: '#ffeedd',
            folderName: dirent.name,
          });
          fs.writeFileSync(surfacePath, surfaceCode, 'utf-8');
          this.log('AUTOREPAIR_SURFACE', `Generated missing surface.ts for src/realities/${dirent.name}`);
        }
      }
    } catch (err: any) {
      console.error('[REALITY-DAEMON] Error during scan:', err);
    }
  }

  public moveToBin(realityId: string, folderName?: string): { success: boolean; folderMoved?: string; noop?: boolean; error?: string } {
    this.ensureDirectories();

    /* R102 — the independent-realities decree: ANY reality's folder can be
       moved to the bin, solPrime included. The client decides; the daemon
       carries it out (bin-into-itself stays refused). */

    try {
      const items = fs.readdirSync(this.realitiesDir, { withFileTypes: true });
      let targetFolder = '';

      for (const dirent of items) {
        if (!dirent.isDirectory()) continue;
        if (dirent.name === 'bin' || dirent.name === '.bin') continue;

        if (folderName && (dirent.name.toLowerCase() === folderName.toLowerCase() || dirent.name === folderName)) {
          targetFolder = dirent.name;
          break;
        }

        if (realityId) {
          const cleanRid = realityId.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanDirName = dirent.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cleanDirName === cleanRid || dirent.name === realityId) {
            targetFolder = dirent.name;
            break;
          }
        }
      }

      if (!targetFolder && folderName) {
        // folderName may arrive straight from a request body: sanitize before
        // it is used to build filesystem paths (path traversal guard).
        targetFolder = sanitizeFolderName(folderName);
      }

      if (!targetFolder) {
        return { success: false, error: `No active folder found matching ${realityId || folderName}` };
      }

      if (targetFolder === 'bin' || targetFolder === '.bin') {
        return { success: false, error: 'Refusing to move the bin directory into itself.' };
      }

      const srcPath = path.join(this.realitiesDir, targetFolder);
      const destPath = path.join(this.binDir, targetFolder);
      if (!isInside(this.realitiesDir, srcPath) || !isInside(this.binDir, destPath)) {
        return { success: false, error: 'Resolved path escaped the realities tree; refused.' };
      }
      if (!fs.existsSync(srcPath)) {
        /* R105 — nothing on disk to move is a COMPLETED deletion, not a
           failure: in the compiled desktop app a committed pack (Sol-Prime
           included) has no folder here at all — its only body is the bundle,
           and the state-side tombstone is the whole truth. Erroring here used
           to make the app lie ("could not reach the bin") and burn the retry
           queue for a deletion that had already fully happened. */
        this.log('MOVE_TO_BIN', `Nothing on disk to move for ${targetFolder} — the disk side of this deletion is already total`);
        return { success: true, noop: true };
      }

      // If destination exists, clean it first
      if (fs.existsSync(destPath)) {
        fs.rmSync(destPath, { recursive: true, force: true });
      }

      fs.renameSync(srcPath, destPath);
      this.log('MOVE_TO_BIN', `Moved ${targetFolder} to src/realities/bin/${targetFolder}`);
      return { success: true, folderMoved: targetFolder };
    } catch (err: any) {
      this.log('MOVE_TO_BIN_ERROR', err.message);
      return { success: false, error: err.message };
    }
  }

  public restoreFromBin(realityId: string, folderName?: string): { success: boolean; folderRestored?: string; noop?: boolean; error?: string } {
    this.ensureDirectories();

    try {
      const items = fs.readdirSync(this.binDir, { withFileTypes: true });
      let targetFolder = '';

      for (const dirent of items) {
        if (!dirent.isDirectory()) continue;

        if (folderName && (dirent.name.toLowerCase() === folderName.toLowerCase() || dirent.name === folderName)) {
          targetFolder = dirent.name;
          break;
        }

        if (realityId) {
          const cleanRid = realityId.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanDirName = dirent.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cleanDirName === cleanRid || dirent.name === realityId) {
            targetFolder = dirent.name;
            break;
          }
        }
      }

      if (!targetFolder) {
        /* R105 — nothing trashed on disk is a completed restore, not a
           failure (desktop twin: realities.rs restore_from_bin). A committed
           pack restored in the compiled app never had a folder here; the
           state-side restore that already ran IS the whole truth. */
        this.log('RESTORE_FROM_BIN', `Nothing on disk to restore for ${realityId || folderName} — the disk side of this restore is already total`);
        return { success: true, noop: true };
      }

      const srcPath = path.join(this.binDir, targetFolder);
      const destPath = path.join(this.realitiesDir, targetFolder);
      if (!isInside(this.binDir, srcPath) || !isInside(this.realitiesDir, destPath)) {
        return { success: false, error: 'Resolved path escaped the realities tree; refused.' };
      }

      if (fs.existsSync(destPath)) {
        fs.rmSync(destPath, { recursive: true, force: true });
      }

      fs.renameSync(srcPath, destPath);
      this.log('RESTORE_FROM_BIN', `Restored ${targetFolder} from bin back to src/realities/${targetFolder}`);
      return { success: true, folderRestored: targetFolder };
    } catch (err: any) {
      this.log('RESTORE_ERROR', err.message);
      return { success: false, error: err.message };
    }
  }

  public purgeFromBin(realityId: string, folderName?: string): { success: boolean; noop?: boolean; error?: string } {
    this.ensureDirectories();

    try {
      const items = fs.readdirSync(this.binDir, { withFileTypes: true });
      let targetFolder = '';

      for (const dirent of items) {
        if (!dirent.isDirectory()) continue;

        if (folderName && (dirent.name.toLowerCase() === folderName.toLowerCase() || dirent.name === folderName)) {
          targetFolder = dirent.name;
          break;
        }

        if (realityId) {
          const cleanRid = realityId.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanDirName = dirent.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cleanDirName === cleanRid || dirent.name === realityId) {
            targetFolder = dirent.name;
            break;
          }
        }
      }

      if (!targetFolder) {
        /* R105 — nothing in the bin to erase is a completed purge, not a
           failure (desktop twin: realities.rs purge_from_bin). A committed
           pack purged in the compiled app never had a folder here; the
           zero-trace purge that already ran in state IS the whole truth. */
        this.log('PURGE_BIN', `Nothing on disk to purge for ${realityId || folderName} — the disk side of this purge is already total`);
        return { success: true, noop: true };
      }

      const targetPath = path.join(this.binDir, targetFolder);
      if (!isInside(this.binDir, targetPath)) {
        return { success: false, error: 'Resolved path escaped the bin tree; refused.' };
      }
      fs.rmSync(targetPath, { recursive: true, force: true });
      this.log('PURGE_BIN', `Permanently erased src/realities/bin/${targetFolder}`);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public emptyBin(): { success: boolean; count: number; error?: string } {
    this.ensureDirectories();

    try {
      const items = fs.readdirSync(this.binDir, { withFileTypes: true });
      let count = 0;

      for (const dirent of items) {
        if (dirent.isDirectory()) {
          const target = path.join(this.binDir, dirent.name);
          if (!isInside(this.binDir, target)) continue;
          fs.rmSync(target, { recursive: true, force: true });
          count++;
        }
      }

      this.log('EMPTY_BIN', `Purged ${count} realities from bin`);
      return { success: true, count };
    } catch (err: any) {
      return { success: false, count: 0, error: err.message };
    }
  }

  public renameRealityFolder(realityId: string, newName: string, folderName?: string): { success: boolean; newFolderName?: string; error?: string } {
    this.ensureDirectories();

    /* R102 — no reality is protected from rename either; the folder is the
       reality's disk identity and the reality may re-christen it freely. */

    try {
      const cleanNew = newName.trim().replace(/[^a-zA-Z0-9]/g, '');
      // An empty result must be rejected outright: otherwise newPath would
      // resolve to the realities directory itself and the existsSync cleanup
      // below would recursively delete the entire realities tree.
      if (!cleanNew) {
        return { success: false, error: 'New name contains no valid characters.' };
      }
      const newFolderName = cleanNew.charAt(0).toLowerCase() + cleanNew.slice(1);

      const items = fs.readdirSync(this.realitiesDir, { withFileTypes: true });
      let oldFolderName = '';

      /* folderName (when the client knows it) is the exact, unambiguous
         address — cleaned ids can't match camelCase folders of custom
         realities like reality-xxxx → chasinLove */
      const cleanFolder = folderName ? sanitizeFolderName(folderName) : '';
      if (cleanFolder) {
        const direct = path.join(this.realitiesDir, cleanFolder);
        if (isInside(this.realitiesDir, direct) && fs.existsSync(direct)) {
          oldFolderName = cleanFolder;
        }
      }

      if (!oldFolderName) for (const dirent of items) {
        if (!dirent.isDirectory()) continue;
        if (dirent.name === 'bin') continue;

        const cleanRid = realityId.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanDirName = dirent.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanDirName === cleanRid || dirent.name === realityId) {
          oldFolderName = dirent.name;
          break;
        }
      }

      if (!oldFolderName) {
        return { success: false, error: `Could not find reality folder for ${realityId}` };
      }

      if (oldFolderName === newFolderName) {
        return { success: true, newFolderName };
      }

      const oldPath = path.join(this.realitiesDir, oldFolderName);
      const newPath = path.join(this.realitiesDir, newFolderName);
      if (!isInside(this.realitiesDir, oldPath) || !isInside(this.realitiesDir, newPath)) {
        return { success: false, error: 'Resolved path escaped the realities tree; refused.' };
      }

      if (fs.existsSync(newPath)) {
        fs.rmSync(newPath, { recursive: true, force: true });
      }

      fs.renameSync(oldPath, newPath);

      /* Patch the display name in the generated modules. The new name is
         written via JSON.stringify (a function replacement, so `$` sequences
         in the name can't substitute) — a raw string splice here used to
         corrupt the module when the name contained a backslash, and one
         broken module white-screens the whole app because all realities are
         compiled together by an eager glob. */
      const nameLiteral = `name: ${JSON.stringify(newName)}`;
      for (const file of ['index.ts', 'surface.ts']) {
        const modulePath = path.join(newPath, file);
        if (!fs.existsSync(modulePath)) continue;
        const content = fs.readFileSync(modulePath, 'utf-8');
        const patched = content.replace(/^(\s*)name:\s*(?:'[^']*'|"[^"]*"|`[^`]*`)/m, (_m, indent: string) => `${indent}${nameLiteral}`);
        if (patched !== content) fs.writeFileSync(modulePath, patched, 'utf-8');
      }

      this.log('RENAME_FOLDER', `Renamed src/realities/${oldFolderName} -> src/realities/${newFolderName}`);
      return { success: true, newFolderName };
    } catch (err: any) {
      this.log('RENAME_ERROR', err.message);
      return { success: false, error: err.message };
    }
  }

  public getStatus(): DaemonStatus {
    this.ensureDirectories();

    const activeFolders: string[] = [];
    const binFolders: string[] = [];

    try {
      const active = fs.readdirSync(this.realitiesDir, { withFileTypes: true });
      for (const a of active) {
        if (a.isDirectory() && a.name !== 'bin' && a.name !== '.bin') {
          activeFolders.push(a.name);
        }
      }

      const bin = fs.readdirSync(this.binDir, { withFileTypes: true });
      for (const b of bin) {
        if (b.isDirectory()) {
          binFolders.push(b.name);
        }
      }
    } catch (e) {
      console.error(e);
    }

    return {
      active: this.isRunning,
      lastScanTime: this.lastScanTime,
      scanCount: this.scanCount,
      activeFolders,
      binFolders,
      operationsLog: [...this.operationsLog],
    };
  }
}

export const realityDaemon = new RealitySyncDaemon();
