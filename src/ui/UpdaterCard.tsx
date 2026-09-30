/* THE UPDATER CARD — the universe keeps itself current.
   Desktop-only: ~8s after boot (never during ignition) it quietly asks
   GitHub whether a newer signed release exists; if so, a card rises from
   the corner and offers one-click download → signature-verified install →
   relaunch. Every failure is a silent no-op — this card must never disturb
   the cosmos, and the web build never even mounts it (App renders it only
   on desktop).

   R81 — THE HERALD REBORN: the card becomes an artifact. framer-motion
   springs (already vendored — no new deps) stage its entrance, the update
   star is a lucide glyph wrapped in pulsing halo rings, the download is an
   orbital progress ring around that star, and each phase has its own
   motion + copy. The kiss of the design language: glass over the abyss,
   solar for the offer, teal for the journey, quiet at every other beat.
   The presentational body is a named export so previews can stage every
   phase without a Tauri shell; the default export is the desktop wiring. */
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowDownToLine, RotateCw, Rocket, Check } from 'lucide-react';

export type UpdaterPhase = 'idle' | 'downloading' | 'installing' | 'relaunching';
type UpdateHandle = {
  version: string;
  downloadAndInstall(cb?: (event: { event: string; data: { contentLength?: number; chunkLength?: number } }) => void): Promise<void>;
};

/* the celestial star: a lucide glyph wrapped in slow pulsing halo rings */
function UpdateStar({ phase, progress }: { phase: UpdaterPhase; progress: number }) {
  const busy = phase === 'downloading' || phase === 'installing';
  return (
    <div className="relative w-14 h-14 shrink-0 grid place-items-center">
      {/* halo rings — breathing outward while an update waits, spinning while it lands */}
      <motion.span
        className="absolute inset-0 rounded-full border border-solar/30"
        animate={busy ? { rotate: 360, scale: 1.06, borderColor: 'rgba(111,194,180,0.45)' } : { scale: [1, 1.12, 1], opacity: [0.7, 0.25, 0.7] }}
        transition={busy ? { rotate: { duration: 2.4, repeat: Infinity, ease: 'linear' }, scale: { duration: 1.2 }, borderColor: { duration: 0.8 } } : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.span
        className="absolute inset-1.5 rounded-full border border-solar/20"
        animate={busy ? { rotate: -360, scale: 1.04 } : { scale: [1, 1.18, 1], opacity: [0.5, 0.15, 0.5] }}
        transition={busy ? { rotate: { duration: 3.1, repeat: Infinity, ease: 'linear' }, scale: { duration: 1.2 } } : { duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
      />
      {/* the glyph */}
      <motion.span
        animate={busy ? { rotate: [0, -8, 8, 0] } : { scale: [1, 1.08, 1] }}
        transition={busy ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        className="grid place-items-center w-9 h-9 rounded-full bg-gradient-to-br from-solar/25 to-teal-ice/15 border border-solar/40 shadow-[0_0_18px_rgba(242,193,120,0.35)]"
      >
        {phase === 'relaunching'
          ? <Rocket size={15} className="text-solar" />
          : phase === 'installing'
            ? <Check size={15} className="text-teal-ice" />
            : <Sparkles size={15} className="text-solar-hot" />}
      </motion.span>
      {/* the orbital progress ring (downloading only) */}
      {phase === 'downloading' && (
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="26" fill="none" stroke="rgba(111,194,180,0.14)" strokeWidth="2.5" />
          <circle
            cx="28" cy="28" r="26" fill="none"
            stroke="url(#updaterOrbit)" strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 26}
            strokeDashoffset={2 * Math.PI * 26 * (1 - progress / 100)}
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
          <defs>
            <linearGradient id="updaterOrbit" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6fc2b4" />
              <stop offset="100%" stopColor="#f2c178" />
            </linearGradient>
          </defs>
        </svg>
      )}
    </div>
  );
}

/* THE BODY — everything the traveler sees, staged by whoever mounts it.
   Pure presentation: no Tauri, no timers, no surprises. */
export function UpdaterCardBody({ version, phase, progress, onApply, onLater }: {
  version: string;
  phase: UpdaterPhase;
  progress: number;
  onApply: () => void;
  onLater: () => void;
}) {
  /* phase copy — each beat its own line, the way the cosmos speaks */
  const headline =
    phase === 'downloading' ? 'Pulling v' + version + ' across the void'
    : phase === 'installing' ? 'The stars realign…'
    : phase === 'relaunching' ? 'Relaunching your universe'
    : 'v' + version + ' has formed';
  const subline =
    phase === 'downloading' ? progress + '% — signature verified on arrival'
    : phase === 'installing' ? 'installing the new light…'
    : phase === 'relaunching' ? 'see you on the other side'
    : 'a new version of your universe is ready';

  return (
    <motion.div
      className="fixed bottom-5 right-5 z-95"
      initial={{ opacity: 0, y: 24, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.15 }}
    >
      <motion.div
        className="relative w-[19rem] rounded-2xl border border-line/80 bg-abyss/85 backdrop-blur-xl overflow-hidden"
        style={{ boxShadow: '0 8px 40px rgba(1,2,8,0.6), 0 0 0 1px rgba(242,193,120,0.06), inset 0 1px 0 rgba(233,238,247,0.05)' }}
        layout
      >
        {/* the aurora wash — a slow solar breathing behind the glass */}
        <motion.div
          className="absolute -top-16 -right-10 w-44 h-44 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(242,193,120,0.14), transparent 65%)' }}
          animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.15, 1] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-solar/50 to-transparent" />

        <div className="relative p-4 flex items-start gap-3.5">
          <UpdateStar phase={phase} progress={progress} />
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="font-mono text-[8.5px] tracking-[0.32em] uppercase text-teal-ice/90 flex items-center gap-1.5">
              <span className="inline-block w-1 h-1 rounded-full bg-teal-ice pulse-soft" />
              the universe evolves
            </p>
            <AnimatePresence mode="wait">
              <motion.p
                key={headline}
                className="font-display text-[13.5px] tracking-[0.04em] text-paper mt-1.5 leading-snug"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                {headline}
              </motion.p>
            </AnimatePresence>
            <p className="font-body text-[10.5px] text-slate-soft/80 mt-0.5 leading-relaxed">{subline}</p>

            {/* the linear ghost of the orbital ring — a thin seam under the copy */}
            {phase === 'downloading' && (
              <div className="mt-2 h-[3px] rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-teal-ice to-solar"
                  animate={{ width: progress + '%' }}
                  transition={{ ease: 'easeOut', duration: 0.3 }}
                />
              </div>
            )}
          </div>
        </div>

        {/* the footer — an offer in idle, quiet assurance on the way */}
        <AnimatePresence mode="wait">
          {phase === 'idle' ? (
            <motion.div
              key="offer"
              className="relative flex gap-2 px-4 pb-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
            >
              <button
                onClick={onApply}
                className="group relative flex-1 flex items-center justify-center gap-2 font-mono text-[9.5px] tracking-[0.28em] uppercase text-void bg-gradient-to-r from-solar to-solar-hot rounded-lg px-4 py-2.5 shadow-[0_2px_14px_rgba(242,193,120,0.35)] hover:shadow-[0_2px_20px_rgba(242,193,120,0.55)] active:scale-[0.98] transition-[box-shadow,transform]"
              >
                <ArrowDownToLine size={12} className="transition-transform group-hover:translate-y-[1.5px]" />
                update now
              </button>
              <button
                onClick={onLater}
                className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-slate-dim hover:text-slate-soft border border-line/70 hover:border-line rounded-lg px-3.5 transition-colors"
                aria-label="not now"
              >
                later
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="traveling"
              className="relative px-4 pb-4 pt-0.5 flex items-center gap-2 text-teal-ice/80"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <RotateCw size={11} className="animate-spin" style={{ animationDuration: '2.2s' }} />
              <span className="font-mono text-[8.5px] tracking-[0.26em] uppercase">
                {phase === 'downloading' ? 'traveling' : phase === 'installing' ? 'landing' : 'breathe'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

export default function UpdaterCard() {
  const [version, setVersion] = useState<string | null>(null);
  const [phase, setPhase] = useState<UpdaterPhase>('idle');
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
      setTimeout(() => { void relaunch(); }, 1400);
    } catch (err) {
      console.warn('[updater] update aborted quietly:', err);
      setPhase('idle');
    }
  };

  return (
    <UpdaterCardBody
      version={version}
      phase={phase}
      progress={progress}
      onApply={() => void apply()}
      onLater={() => setVersion(null)}
    />
  );
}
