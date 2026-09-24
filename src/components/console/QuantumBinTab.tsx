import React, { useState } from 'react';
import { Trash2, RefreshCw, RotateCcw, ShieldCheck, ShieldX, Activity, Folder, CheckCircle2, Clock, HardDriveDownload } from 'lucide-react';
import { actions, useUniverse } from '../../state';
import { reconcileNow } from '../../sync/realitySync';
import { toast } from '../../ui/toast';
import { TrashedReality } from '../../types';

/** Prettifies a disk folder name for the "orphaned folder" row. */
function folderDisplay(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim() || name;
}

export const QuantumBinTab: React.FC = () => {
  const state = useUniverse();
  const binRealities: TrashedReality[] = state.binRealities || [];
  const diskSync = state.diskSync;
  const connected = diskSync?.connected ?? false;
  const [manualSync, setManualSync] = useState(false);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [confirmPurgeId, setConfirmPurgeId] = useState<string | null>(null);

  /* Disk truth: bin folders on disk that no tracked bin reality claims —
     surfaced so nothing in src/realities/bin/ is invisible to the user. */
  const trackedFolders = new Set(
    binRealities.map((b) => (b.folderName ?? '').toLowerCase()).filter(Boolean)
  );
  const orphanFolders = (diskSync?.binDetails ?? []).filter(
    (b) => !trackedFolders.has(b.folderName.toLowerCase())
  );

  const handleManualSync = async () => {
    setManualSync(true);
    reconcileNow();
    /* give the poll cycle a moment so the spinner reads as a real action */
    setTimeout(() => setManualSync(false), 600);
  };

  const handleRestore = (realityId: string, name: string) => {
    void actions.restoreReality(realityId).then(() => {
      toast(`✦ Reality ${name} restored from Quantum Bin to active continuum!`);
    });
  };

  const handlePurge = (realityId: string, name: string) => {
    setConfirmPurgeId(null);
    void actions.purgeRealityFromBin(realityId).then(() => {
      toast(`Reality ${name} permanently purged from disk.`);
    });
  };

  const handleEmptyBin = () => {
    actions.emptyRealityBin();
    setConfirmEmpty(false);
    toast('Quantum Bin completely emptied.');
  };

  return (
    <div className="flex flex-col gap-3 text-slate-100">
      {/* HEADER BAR */}
      <div className="flex items-center justify-between gap-4 p-4 cc-panel flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-400/35 text-rose-300">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="cc-display">QUANTUM RECYCLE BIN (DUSTBIN)</h3>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30">
                {binRealities.length} in stasis
              </span>
            </div>
            <p className="font-mono text-[9px] text-slate-400">
              Deleted realities are safely transferred to <code className="text-cyan-300">src/realities/bin/</code> and can be restored at any time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualSync}
            disabled={manualSync}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${manualSync ? 'animate-spin' : ''}`} />
            <span>Sync Now</span>
          </button>

          {binRealities.length > 0 && (
            confirmEmpty ? (
              <div className="flex items-center gap-1.5 animate-in fade-in">
                <button
                  onClick={handleEmptyBin}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold transition-all cursor-pointer"
                >
                  Confirm Empty All
                </button>
                <button
                  onClick={() => setConfirmEmpty(false)}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-mono"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmEmpty(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 text-xs font-mono tracking-wider transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Empty Bin</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* REALITY DAEMON — HONEST LIVE HEALTH */}
      <div className="p-4 cc-panel">
        <div className="flex items-center justify-between mb-3 border-b border-white/8 pb-2 flex-wrap gap-2">
          <div className="cc-panel-title">
            <Activity className="w-4 h-4 animate-pulse" />
            <span>Reality Disk Daemon — Live Telemetry</span>
          </div>
          <span
            className={`text-[9px] font-mono flex items-center gap-1.5 ${
              connected ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full inline-block ${
                connected ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'
              }`}
            />
            {connected ? `Connected · scanning every 3000ms` : 'Offline'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs mb-3">
          <div className="p-2.5 rounded-xl bg-white/6 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <span className="cc-label block">Total Scans Executed</span>
            <span className="text-sm font-bold text-white tabular-nums">{diskSync?.scanCount ?? 0}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/6 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <span className="cc-label block">Active Disk Folders</span>
            <span className="text-sm font-bold text-cyan-300 tabular-nums">{diskSync?.activeFolders?.length ?? 0}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/6 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <span className="cc-label block">Bin Folders On Disk</span>
            <span className="text-sm font-bold text-rose-300 tabular-nums">{diskSync?.binDetails?.length ?? 0}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/6 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <span className="cc-label block">Daemon Health</span>
            <span
              className={`text-sm font-bold flex items-center gap-1 ${
                connected ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {connected ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" /> Nominal
                </>
              ) : (
                <>
                  <ShieldX className="w-3.5 h-3.5" /> Unreachable
                </>
              )}
            </span>
          </div>
        </div>

        {/* Offline banner with an honest fix hint */}
        {!connected && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 font-mono text-[10px] text-rose-200">
            {diskSync?.lastError ??
              'The reality daemon is unreachable.'}{' '}
            Disk mirroring resumes automatically once the server is back — queued operations
            {(diskSync?.pendingOps ?? 0) > 0 && (
              <span className="text-amber-300 font-bold"> ({diskSync?.pendingOps}) </span>
            )}
            will flush on reconnect.
          </div>
        )}

        {/* Operations Activity Log */}
        {connected && diskSync?.operationsLog && diskSync.operationsLog.length > 0 && (
          <div className="mt-1 p-2.5 rounded-xl bg-abyss/45 backdrop-blur-md border border-white/10 font-mono text-[10px] text-slate-400 max-h-24 overflow-y-auto custom-scroll">
            <div className="text-[9px] uppercase tracking-wider text-cyan-400/80 mb-1">Daemon Audit Stream:</div>
            {diskSync.operationsLog.map((log, idx) => (
              <div key={`${log.timestamp}-${idx}`} className="flex items-center gap-2 truncate py-0.5">
                <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span className="text-cyan-300 font-bold">{log.type}:</span>
                <span className="text-slate-300 truncate">{log.details}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* REALITIES IN STASIS (THE BIN) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="cc-panel-title">
            <Folder className="w-3.5 h-3.5" />
            Stored Realities in Quantum Bin ({binRealities.length})
          </span>
        </div>

        {binRealities.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white/2 border border-white/5 font-mono text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400/60" />
            <p className="text-slate-300 font-semibold">Quantum Bin is Empty</p>
            <p className="text-[11px] text-slate-500 max-w-md">
              No realities currently in trash. When you delete any reality, its folder is transferred to <code className="text-cyan-400">src/realities/bin/</code> and preserved here for one-click restoration.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {binRealities.map((item) => (
              <div
                key={item.id}
                className="cc-glass-card p-4 rounded-2xl border-rose-500/25 hover:border-rose-400/45 flex flex-col justify-between gap-3 transition-all hover:shadow-[0_16px_40px_rgba(0,0,0,0.45),0_0_18px_rgba(251,113,133,0.14)]"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-display text-sm font-bold text-white flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full inline-block shadow-sm"
                          style={{ background: `linear-gradient(135deg, ${item.colorA || '#f43f5e'}, ${item.colorB || '#8b5cf6'})` }}
                        />
                        {item.name}
                      </h4>
                      <p className="font-mono text-[9px] text-cyan-300/80 mt-0.5">
                        {item.spectral || 'Class Luminary Continuum'} · {item.codeName || item.id}
                      </p>
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-400/30 text-[9px] font-mono text-rose-300">
                      In Bin
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 mb-2">
                    {item.description || 'Parallel universe archived in stasis.'}
                  </p>

                  <div className="p-2 rounded-xl bg-white/6 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] font-mono text-[9px] text-slate-400 flex items-center justify-between">
                    <span className="truncate">
                      📁 src/realities/bin/{item.folderName ?? item.name.replace(/[^a-zA-Z0-9]/g, '')}/
                    </span>
                    <span className="text-slate-500 flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {new Date(item.deletedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  {confirmPurgeId === item.id ? (
                    <>
                      <button
                        onClick={() => handlePurge(item.id, item.name)}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer animate-in zoom-in-90"
                      >
                        Confirm Purge
                      </button>
                      <button
                        onClick={() => setConfirmPurgeId(null)}
                        className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-[10px] font-mono"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setConfirmPurgeId(item.id)}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/40 text-xs font-mono transition-all cursor-pointer"
                      >
                        Purge Permanently
                      </button>

                      <button
                        onClick={() => handleRestore(item.id, item.name)}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs font-mono transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>✦ Restore Reality</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ORPHANED DISK FOLDERS — disk truth the state doesn't track */}
        {orphanFolders.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-400/30 space-y-2.5">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-amber-300">
              <HardDriveDownload className="w-3.5 h-3.5" />
              Unclaimed folders discovered in src/realities/bin/ ({orphanFolders.length})
            </div>
            <p className="font-mono text-[9px] text-slate-400">
              These exist on disk but aren't tracked in the multiverse index. Adopt them to enable
              one-click restore, or delete them permanently.
            </p>
            <div className="space-y-2">
              {orphanFolders.map((f) => (
                <div
                  key={f.folderName}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/6 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] font-mono text-[10px]"
                >
                  <span className="text-slate-300 truncate">
                    📁 src/realities/bin/{f.folderName}/
                    <span className="text-slate-500"> · trashed {new Date(f.trashedAt).toLocaleString()}</span>
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => actions.adoptBinFolder(f)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 uppercase tracking-wider cursor-pointer"
                    >
                      Adopt
                    </button>
                    <button
                      onClick={() => actions.purgeBinFolder(f.folderName)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-white/10 uppercase tracking-wider cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
