/* THE UPDATER CARD — the universe keeps itself current.
   Desktop-only: ~8s after boot (never during ignition) it quietly asks
   GitHub whether a newer signed release exists; if so, a glass card offers
   one-click download → signature-verified install → relaunch. Every failure
   is a silent no-op — this card must never disturb the cosmos, and the web
   build never even mounts it (App renders it only on desktop). */
import { useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'downloading' | 'installing' | 'relaunching';
type UpdateHandle = {
  version: string;
  downloadAndInstall(cb?: (event: { event: string; data: { contentLength?: number; chunkLength?: number } }) => void): Promise<void>;
};

export default function UpdaterCard() {
  const [version, setVersion] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const updateRef = useRef<UpdateHandle | null>(null);

  useEffect(() => {
    /* same seam the desktop adapter uses — no Tauri, no updater */
    if (!('__TAURI_INTERNALS__' in window)) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const update = (await check()) as unknown as UpdateHandle | null;
        if (!cancelled && update) {
          updateRef.current = update;
          setVersion(update.version);
        }
      } catch (err) {
        console.warn('[updater] update check skipped quietly:', err);
      }
    }, 8000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  if (!version) return null;

  const apply = async () => {
    const update = updateRef.current;
    if (!update || phase !== 'idle') return;
    try {
      setPhase('downloading');
      let received = 0;
      let total = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          total = event.data.contentLength ?? 0;
        } else if (event.event === 'Progress') {
          received += event.data.chunkLength ?? 0;
          if (total > 0) setProgress(Math.min(100, Math.round((received / total) * 100)));
        } else if (event.event === 'Finished') {
          setPhase('installing');
          setProgress(100);
        }
      });
      setPhase('relaunching');
      const { relaunch } = await import('@tauri-apps/plugin-process');
      setTimeout(() => { void relaunch(); }, 1200);
    } catch (err) {
      console.warn('[updater] update aborted quietly:', err);
      setPhase('idle');
    }
  };

  const label =
    phase === 'downloading' ? `pulling v${version} across the void — ${progress}%`
    : phase === 'installing' ? 'installing — the stars realign…'
    : phase === 'relaunching' ? 'relaunching your universe…'
    : `v${version} has formed — update now?`;

  return (
    <div className="fixed bottom-5 right-5 z-95 rise-in">
      <div className="w-72 rounded-xl border border-teal-ice/40 bg-abyss/90 backdrop-blur-md shadow-[0_0_28px_rgba(66,224,206,0.14)] p-4">
        <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-teal-ice">✦ auto-update</p>
        <p className="font-display text-[13px] tracking-[0.08em] text-paper mt-1.5 leading-snug">{label}</p>
        {phase === 'downloading' && (
          <div className="mt-2.5 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-teal-ice to-solar transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}
        {phase === 'idle' && (
          <button
            onClick={() => void apply()}
            className="mt-3 w-full font-mono text-[9.5px] tracking-[0.26em] uppercase border border-solar/50 text-solar px-4 py-2 rounded-lg hover:bg-solar/10 transition-colors"
          >
            update now
          </button>
        )}
      </div>
    </div>
  );
}
