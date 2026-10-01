import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { motion, AnimatePresence, MotionConfig, type Variants } from 'framer-motion';
import {
  X, Zap, Globe, Sparkles, Orbit, Trash2, ChevronDown, ChevronRight,
  Plus, ShieldCheck, Crosshair, Wind, Compass, Search,
  Edit2, Palette, Check, Layers, Disc, Sun, Radio, ExternalLink,
  Cpu, Database, Wallpaper
} from 'lucide-react';
import { useConsoleBackdrop } from './backdropStore';
import { REALITIES, getReality, createNewRealityConfig, RealityConfig } from '../../realities';
import { actions, useUniverse } from '../../state';
import type { DiskSyncState } from '../../domain/universe';
import { toast } from '../../ui/toast';
import { CreateRealityModal } from '../reality/CreateRealityModal';
import { CoreSigil } from './CoreSigil';
import { ScenicBackdrop, FALLBACK_NIGHT } from './ScenicBackdrop';
import { TiltButton } from './TiltButton';
import { RealityAdvancedPanel } from '../reality/RealityAdvancedPanel';
import { ThinkingCloudTooltip } from '../lineage/ThinkingCloudTooltip';
import { QuantumBinTab } from './QuantumBinTab';
import { CppNativeEngineCard } from './CppNativeEngineCard';
import { SimulatorTwinCard } from './SimulatorTwinCard';
import { BlackHoleTuningCard } from './BlackHoleTuningCard';
import { getSimDate, subscribeSimDate } from '../../platform/simClock';

interface Props {
  onClose: () => void;
  onWarpReality: (realityId: string) => void;
  onZoomToCore: () => void;
  onEnterGalaxy: (realityId: string, galaxyId: string) => void;
  onShowToolbar?: () => void;
  /* Round 14 — physics laws (spacetime lensing + living gravity) */
  lensOn: boolean;
  livingOn: boolean;
  onToggleLens: (on: boolean) => void;
  onToggleLiving: (on: boolean) => void;
  onRestoreEphemeris: () => void;
}

type Tab = 'dashboard' | 'realities' | 'hierarchy' | 'bin';

/* Quantum Glass motion system — staggered deck entrance + tab transitions.
   Transform/opacity only; MotionConfig reducedMotion="user" in the main
   component disables it for users who prefer reduced motion. */
const deckStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.04 } },
};
const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 130, damping: 19 } },
};
/* Round-8 motion core: a soft spring preset and a count-up number that
   springs between values - live counters feel alive instead of snapping. */
const softSpring = { type: 'spring' as const, stiffness: 170, damping: 22 };

function AnimatedNumber({ value, className, style }: {
  value: number; className?: string; style?: React.CSSProperties;
}) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) return;
    let raf = 0;
    const start = performance.now();
    const dur = 650;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className} style={style}>{display}</span>;
}

/* STAT SEAL — one unique symbol per feature (never shared: a reality is a
   globe, a cluster is strata, a galaxy is an orbit, a world is a sun) with
   the count beside it; the full name rises in a glass chip on hover. */
function StatSeal({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <span className="relative inline-flex group/stat">
      <TiltButton
        maxTilt={9}
        lift={10}
        aria-label={`${value} ${label}`}
        className="px-1 py-0.5 flex items-center gap-1.5 cursor-default"
      >
        <span className="text-slate-400">{icon}</span>
        <AnimatedNumber className="cc-statnum text-white tabular-nums" value={value} />
      </TiltButton>
      {/* the name — rises in a smoked cloud chip on hover */}
      <span className="cc-cloud-card pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap opacity-0 translate-y-1 group-hover/stat:opacity-100 group-hover/stat:translate-y-0 transition-all duration-200 z-50">
        {value} {label}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Interactive Holographic Radar Mini-Map (Live 3D Multiverse Core) */
/* ------------------------------------------------------------------ */
function HolographicMultiverseRadar({
  realities,
  activeId,
  onSelect,
}: {
  realities: RealityConfig[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /* live screen positions of the plotted reality nodes — powers click-to-warp */
  const nodePositionsRef = useRef<{ id: string; x: number; y: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let angle = 0;
    const size = 260;
    canvas.width = size * 2;
    canvas.height = size * 2;

    const render = () => {
      angle += 0.008;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const nodes: { id: string; x: number; y: number }[] = [];

      // Radar Concentric Rings & Range Finders
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.lineWidth = 1.5;
      [40, 80, 130, 180, 220].forEach((r) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Radar Crosshairs
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(cx - 230, cy);
      ctx.lineTo(cx + 230, cy);
      ctx.moveTo(cx, cy - 230);
      ctx.lineTo(cx, cy + 230);
      ctx.stroke();
      ctx.setLineDash([]);

      // Radar Sweeper Beam
      const sweepAngle = angle * 2;
      const sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 220);
      sweepGrad.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
      sweepGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 220, sweepAngle, sweepAngle + 0.35);
      ctx.closePath();
      ctx.fill();

      // Expanding Resonance Pulse from the Singularity Core
      const pulseR = (angle * 44) % 236;
      ctx.strokeStyle = `rgba(6, 182, 212, ${(0.34 * (1 - pulseR / 236)).toFixed(3)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
      ctx.stroke();

      // Central Astral Singularity Core
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 24);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.4, '#00f5d4');
      coreGrad.addColorStop(0.8, '#8b5cf6');
      coreGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 24, 0, Math.PI * 2);
      ctx.fill();

      // Plot Orbiting Reality Spheres
      const numR = realities.length;
      realities.forEach((r, idx) => {
        const radius = 110 + (idx % 3) * 45;
        const currentA = angle * (0.6 / (idx + 1)) + (idx * (Math.PI * 2)) / Math.max(1, numR);
        const rx = cx + Math.cos(currentA) * radius;
        const ry = cy + Math.sin(currentA) * (radius * 0.7); // 3D tilt perspective

        const isActive = r.id === activeId;

        // Orbit Line
        ctx.strokeStyle = isActive ? 'rgba(0, 245, 212, 0.4)' : 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = isActive ? 2 : 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy, radius, radius * 0.7, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Node Glow — the anchored reality breathes
        const nodeR = isActive ? 14 + 3 * Math.sin(angle * 6) : 10;
        const orbG = ctx.createRadialGradient(rx, ry, 0, rx, ry, nodeR);
        orbG.addColorStop(0, r.colorA);
        orbG.addColorStop(0.7, r.colorB);
        orbG.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = orbG;
        ctx.beginPath();
        ctx.arc(rx, ry, nodeR, 0, Math.PI * 2);
        ctx.fill();

        // Node Core Dot
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(rx, ry, isActive ? 4.5 : 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.fillStyle = isActive ? '#00f5d4' : '#cbd5e1';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(r.name.slice(0, 10), rx + 12, ry + 4);

        // record position for click-to-warp hit-testing
        nodes.push({ id: r.id, x: rx, y: ry });
      });

      nodePositionsRef.current = nodes;
      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [realities, activeId]);

  const handleRadarClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const cy = (e.clientY - rect.top) * (canvas.height / rect.height);
    let best: { id: string; d: number } | null = null;
    for (const n of nodePositionsRef.current) {
      const d = Math.hypot(n.x - cx, n.y - cy);
      if (d < 40 && (best === null || d < best.d)) best = { id: n.id, d };
    }
    if (best !== null) onSelect(best.id);
  };

  const handleRadarMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const cy = (e.clientY - rect.top) * (canvas.height / rect.height);
    const hover = nodePositionsRef.current.some((n) => Math.hypot(n.x - cx, n.y - cy) < 40);
    canvas.style.cursor = hover ? 'pointer' : 'default';
  };

  return (
    <div className="cc-radar-frame relative w-full aspect-square max-w-[260px] mx-auto flex items-center justify-center p-2 rounded-2xl">
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain"
        onClick={handleRadarClick}
        onMouseMove={handleRadarMove}
      />
      <div className="cc-badge absolute top-2 left-2">
        <Radio className="w-2.5 h-2.5 animate-pulse" />
        <span>RADAR 3D LIVE · CLICK TO WARP</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Multiverse Vitals — REAL live counts + disk-mirror health        */
/* ------------------------------------------------------------------ */
function VitalTile({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="cc-vital p-2.5 flex flex-col items-center gap-1" style={{ ['--tile' as string]: color }}>
      {typeof value === 'number' ? (
        <AnimatedNumber className="cc-num text-lg leading-none" style={{ color }} value={value} />
      ) : (
        <span className="cc-num text-lg leading-none" style={{ color }}>{value}</span>
      )}
      <span className="cc-label">{label}</span>
    </div>
  );
}

/* the engine broadcasts the in-universe simulation date every 0.25s —
   this tile subscribes directly, so only the tile re-renders, never the deck */
function SimClockTile() {
  const simDate = useSyncExternalStore(subscribeSimDate, getSimDate);
  const label = simDate
    ? new Date(simDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';
  return <VitalTile label="Universe Epoch" value={label} color="#38bdf8" />;
}

function DiskSyncStatusTile({ diskSync }: { diskSync?: DiskSyncState }) {  const connected = diskSync?.connected ?? false;
  const pending = diskSync?.pendingOps ?? 0;
  return (
    <div
      className={`p-2.5 rounded-xl border backdrop-blur-md flex items-center gap-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] ${
        connected
          ? 'bg-emerald-500/8 border-emerald-400/30'
          : 'bg-rose-500/10 border-rose-400/40'
      }`}
      title={connected ? 'Reality daemon synchronized' : diskSync?.lastError ?? 'Disk mirror offline'}
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        {connected && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
            connected ? 'bg-emerald-400' : 'bg-rose-400'
          }`}
        />
      </span>
      <div className="min-w-0 flex-1 font-mono text-[9px] leading-tight">
        <div className={connected ? 'text-emerald-300 font-bold' : 'text-rose-300 font-bold'}>
          {connected ? 'DISK MIRROR · LIVE' : 'DISK MIRROR · OFFLINE'}
          {connected && pending > 0 && (
            <span className="text-amber-300"> · {pending} op{pending > 1 ? 's' : ''} retrying</span>
          )}
        </div>
        <div className="text-slate-500 truncate">
          {connected
            ? `scan #${diskSync?.scanCount ?? 0} · ${diskSync?.activeFolders?.length ?? 0} folders on disk`
            : 'run npm run dev for the reality daemon'}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Bento Reality Card (Wide Multi-Column Aesthetic)                */
/* ------------------------------------------------------------------ */
function BentoRealityCard({
  reality,
  active,
  diaryCount,
  vaultCount,
  onWarp,
  onDelete,
  onEnterGalaxy,
}: {
  reality: RealityConfig;
  active: boolean;
  diaryCount: number;
  vaultCount: number;
  onWarp: () => void;
  onDelete: () => void;
  onEnterGalaxy: (rid: string, gid: string) => void;
}) {
  const protectedReality = reality.id === 'sol-prime';
  const [confirmDel, setConfirmDel] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(reality.name);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  /* keep the rename draft in sync if the name changes elsewhere
     (e.g. the advanced panel inside this same card) */
  useEffect(() => {
    setEditName(reality.name);
  }, [reality.name]);

  /* confirm-erase timer — cleared on unmount so it can't fire stale */
  const confirmTimerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (confirmTimerRef.current !== null) clearTimeout(confirmTimerRef.current);
  }, []);

  const galaxies = reality.galaxies || [];
  const clusters = reality.clusters || [];
  const worldsCount = reality.bodies?.length ?? 0;

  const handleSaveName = () => {
    if (editName.trim() && editName.trim() !== reality.name) {
      /* renameReality also mirrors the disk folder rename via the daemon */
      actions.renameReality(reality.id, editName.trim());
      toast(`Renamed reality to "${editName.trim()}"`);
    }
    setIsEditingName(false);
  };

  const handleColorChange = (colorA: string, colorB: string) => {
    actions.updateRealityMeta(reality.id, { colorA, colorB, starColor: colorA });
    toast(`Recolored ${reality.name}`);
  };

  return (
    <motion.div
      variants={rise}
      whileHover={{ y: -3 }}
      className={`group relative rounded-2xl border transition-[border-color,box-shadow] duration-300 flex flex-col justify-between overflow-hidden ${
        active
          ? 'cc-glass-card border-cyan-400/45 shadow-[0_16px_40px_rgba(0,0,0,0.42)]'
          : 'cc-glass-card hover:border-cyan-400/35 hover:shadow-[0_16px_40px_rgba(0,0,0,0.42)]'
      }`}
    >
      {/* Top Accent Line — the reality's own two colors, quiet and proud */}
      <div
        className="relative h-1 w-full overflow-hidden"
        style={{ background: `linear-gradient(90deg, ${reality.colorA}, ${reality.colorB})` }}
      >
      </div>

      {/* Card Header */}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {/* Chromatic Sphere with Orb Glow */}
            <div
              className="relative w-11 h-11 rounded-xl ring-2 ring-white/20 shadow-md flex items-center justify-center shrink-0 cursor-pointer transition-transform group-hover:scale-105"
              style={{ background: `radial-gradient(circle at 30% 30%, ${reality.colorA}, ${reality.colorB})` }}
              onClick={() => setShowColorPicker(!showColorPicker)}
              title="Click to recolor this reality"
            >
              <Sparkles className="w-4 h-4 text-white/90 drop-shadow" />
              <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-abyss/85 backdrop-blur-md border border-white/20">
                <Palette className="w-2.5 h-2.5 text-cyan-300" />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') setIsEditingName(false);
                    }}
                    autoFocus
                    className="px-2 py-0.5 rounded bg-white/10 backdrop-blur-md border border-cyan-400 text-xs text-white font-semibold focus:outline-none"
                  />
                  <button
                    onClick={handleSaveName}
                    className="p-1 rounded bg-cyan-500/30 text-cyan-200 hover:bg-cyan-500/50"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-200 transition-colors truncate">
                    {reality.name}
                  </h3>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-0.5 text-slate-500 hover:text-cyan-300 transition-colors"
                    title="Rename reality"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-1.5 font-mono text-[9.5px] text-slate-400 mt-0.5">
                <span className="text-cyan-300/90">{reality.codeName}</span>
                <span>·</span>
                <span className="truncate">{reality.spectral}</span>
              </div>
            </div>
          </div>

          {active && (
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/25 border border-cyan-400/60 text-[8.5px] font-mono font-bold uppercase tracking-wider text-cyan-200 shadow-[0_0_14px_rgba(6,182,212,0.55)]">
              ANCHORED
            </span>
          )}
        </div>

        {/* Color Palette Popover */}
        {showColorPicker && (
          <div className="p-2.5 rounded-xl bg-abyss/70 backdrop-blur-xl border border-cyan-500/30 flex flex-wrap gap-1.5 shadow-xl">
            {[
              { label: 'Cyan / Violet', a: '#00f5d4', b: '#8b5cf6' },
              { label: 'Solar Gold', a: '#f59e0b', b: '#fbbf24' },
              { label: 'Neon Emerald', a: '#10b981', b: '#06b6d4' },
              { label: 'Supernova Ruby', a: '#ef4444', b: '#f97316' },
              { label: 'Tachyon Magenta', a: '#ec4899', b: '#8b5cf6' },
            ].map((theme) => (
              <button
                key={theme.label}
                onClick={() => {
                  handleColorChange(theme.a, theme.b);
                  setShowColorPicker(false);
                }}
                className="px-2 py-0.5 rounded-lg border border-white/15 text-[9px] font-mono text-slate-200 hover:border-cyan-400 transition-all flex items-center gap-1"
                style={{ background: `linear-gradient(90deg, ${theme.a}44, ${theme.b}44)` }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.a }} />
                <span>{theme.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Live Telemetry Pods - roster plus the real diary pages and vault */}
        {/*   seals of this reality (read from its own isolated container) */}
        <div className="grid grid-cols-5 gap-1.5 text-center font-mono">
          {[
            { icon: <Orbit className="w-3 h-3" />, n: galaxies.length, label: 'Gal', color: '#67e8f9' },
            { icon: <Layers className="w-3 h-3" />, n: clusters.length, label: 'Clstr', color: '#a78bfa' },
            { icon: <Sun className="w-3 h-3" />, n: worldsCount, label: 'Worlds', color: '#fbbf24' },
            { icon: <Disc className="w-3 h-3" />, n: diaryCount, label: 'Pages', color: '#f472b6' },
            { icon: <Database className="w-3 h-3" />, n: vaultCount, label: 'Vault', color: '#34d399' },
          ].map((p) => (
            <div key={p.label} className="p-1.5 rounded-lg bg-white/7 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-0.5 text-[10.5px] font-bold tabular-nums" style={{ color: p.color }}>
                {p.icon}
                <AnimatedNumber value={p.n} />
              </div>
              <span className="cc-label text-[7.5px]">{p.label}</span>
            </div>
          ))}
        </div>

        {/* Orbiting Galaxies Preview Chips */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-wider text-slate-400">
            <span>Contained Galaxies ({galaxies.length}):</span>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-cyan-400 hover:text-cyan-200 flex items-center gap-0.5"
            >
              <span>{isExpanded ? 'Collapse' : 'Inspect'}</span>
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scroll">
            {galaxies.slice(0, isExpanded ? 99 : 3).map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg bg-white/6 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] text-[10px] font-mono text-slate-300"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g.color || '#00f5d4' }} />
                  <span className="truncate">{g.name}</span>
                </div>
                <button
                  onClick={() => onEnterGalaxy(reality.id, g.id)}
                  className="px-1.5 py-0.5 rounded bg-violet-500/20 hover:bg-violet-500/40 text-violet-200 text-[8.5px] uppercase tracking-wider flex items-center gap-0.5"
                  title="Dive into this galaxy"
                >
                  <ExternalLink className="w-2.5 h-2.5" /> Dive
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card Action Footer Bar */}
      <div className="px-4 py-3 bg-white/4 backdrop-blur-md border-t border-white/10 flex items-center justify-between gap-2">
        <button
          onClick={onWarp}
          disabled={active}
          className={`cc-btn-glass flex-1 py-1.5 px-3 rounded-xl text-xs font-mono uppercase tracking-wider font-bold flex items-center justify-center gap-1.5 ${
            active
              ? 'text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.35),inset_0_0_12px_rgba(6,182,212,0.12)] cursor-default'
              : 'text-slate-200 cursor-pointer'
          }`}
          style={active ? { ['--btn' as string]: '6 182 212', borderColor: 'rgba(34,211,238,0.45)' } : undefined}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{active ? 'Anchored' : 'Warp to Reality'}</span>
        </button>

        {!protectedReality && (
          confirmDel ? (
            <button
              onClick={() => {
                onDelete();
                setConfirmDel(false);
              }}
              className="py-1.5 px-3 rounded-xl bg-rose-500/40 hover:bg-rose-500/60 border border-rose-400/70 text-rose-100 text-[10px] font-mono uppercase tracking-wider transition-all"
            >
              Confirm Erase
            </button>
          ) : (
            <button
              onClick={() => {
                setConfirmDel(true);
                if (confirmTimerRef.current !== null) clearTimeout(confirmTimerRef.current);
                confirmTimerRef.current = window.setTimeout(() => setConfirmDel(false), 2800);
              }}
              className="p-2 rounded-xl text-rose-300 hover:text-rose-100 hover:bg-rose-500/20 border border-transparent hover:border-rose-400/40 transition-all"
              title="Collapse this reality"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )
        )}
      </div>

      {/* Expanded Deep Advanced Reality Workbench */}
      {isExpanded && (
        <div className="p-4 bg-abyss/55 backdrop-blur-2xl border-t border-cyan-500/30">
          <RealityAdvancedPanel realityId={reality.id} onEnterGalaxy={onEnterGalaxy} />
        </div>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Deep Multiverse Hierarchy View (Side-by-Side Cockpit)           */
/* ------------------------------------------------------------------ */
function DeepHierarchyExplorer({
  realities,
  onEnterGalaxy,
  onWarpReality,
}: {
  realities: RealityConfig[];
  onEnterGalaxy: (realityId: string, galaxyId: string) => void;
  onWarpReality: (realityId: string) => void;
}) {
  const [selectedRealityId, setSelectedRealityId] = useState<string>(realities[0]?.id || 'sol-prime');
  const selectedReality = realities.find((r) => r.id === selectedRealityId) || realities[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
      {/* Left: Reality Branch Selection Column */}
      <div className="cc-glass-card p-3 rounded-2xl flex flex-col gap-2 overflow-y-auto custom-scroll max-h-[560px]">
        <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-300 mb-1 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5" /> Reality Branches ({realities.length})
        </span>

        {realities.map((r) => {
          const isSel = r.id === selectedRealityId;
          return (
            <button
              key={r.id}
              onClick={() => setSelectedRealityId(r.id)}
              className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                isSel
                  ? 'bg-cyan-500/20 border-cyan-400/60 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  : 'bg-white/3 border-white/8 text-slate-300 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ background: `linear-gradient(45deg, ${r.colorA}, ${r.colorB})` }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{r.name}</p>
                  <p className="font-mono text-[9px] text-slate-400 truncate">{r.codeName}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-mono text-cyan-200 shrink-0">
                {r.galaxies?.length ?? 0} Gal
              </span>
            </button>
          );
        })}
      </div>

      {/* Right: Deep Galaxy & Stellar System Deck */}
      <div className="cc-glass-card md:col-span-2 p-4 rounded-2xl flex flex-col gap-3 overflow-y-auto custom-scroll max-h-[560px]">
        {selectedReality && (
          <>
            <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-2">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{selectedReality.name}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-400/30">
                    {selectedReality.spectral}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Anchor Star: {selectedReality.bodies[0]?.name || 'Primordial Anchor'} ({selectedReality.bodies.length} Stellar Worlds)
                </p>
              </div>

              <button
                onClick={() => onWarpReality(selectedReality.id)}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/25 hover:bg-cyan-500/40 border border-cyan-400/50 text-cyan-100 text-xs font-mono uppercase tracking-wider flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" /> Warp Here
              </button>
            </div>

            <div className="space-y-2">
              <span className="font-mono text-[10.5px] uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <Orbit className="w-3.5 h-3.5" /> Major Orbiting Galaxies & Stellar Systems
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(selectedReality.galaxies || []).map((g) => (
                  <div
                    key={g.id}
                    className="p-3 rounded-xl bg-white/6 border border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:border-cyan-400/40 transition-all flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Orbit className="w-4 h-4 text-cyan-300 shrink-0" />
                          <h4 className="text-xs font-bold text-white truncate">{g.name}</h4>
                        </div>
                        <span className="text-[8.5px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 shrink-0">
                          {g.type}
                        </span>
                      </div>

                      <div className="mt-2 space-y-1 text-[10px] font-mono text-slate-300">
                        <div>
                          Anchor Star: <span className="text-amber-200">{g.lineage?.stellarSystem?.starName || 'Anchor Star'}</span>
                        </div>
                        <div>
                          Worlds: <span className="text-cyan-200">{g.lineage?.stellarSystem?.worldsCount ?? 5} Planets/Moons</span>
                        </div>
                        <div>
                          Stars: <span className="text-slate-400">{g.starsCount}</span> · Span: <span className="text-slate-400">{g.diameterKly} kly</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onEnterGalaxy(selectedReality.id, g.id)}
                      className="w-full py-1 px-2.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/40 border border-violet-400/40 text-violet-200 text-[10px] font-mono uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
                    >
                      <ExternalLink className="w-3 h-3" /> Dive into Galaxy
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 6. MAIN MULTIVERSE CORE CONSOLE COMPONENT                           */
/* ------------------------------------------------------------------ */
export const CoreConsole: React.FC<Props> = ({
  onClose,
  onWarpReality,
  onZoomToCore,
  onEnterGalaxy,
  onShowToolbar,
  lensOn,
  livingOn,
  onToggleLens,
  onToggleLiving,
  onRestoreEphemeris,
}) => {
  const state = useUniverse();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'anchored' | 'custom' | 'dense'>('all');
  const backdrop = useConsoleBackdrop();
  const [studioOpen, setStudioOpen] = useState(false);

  /* TWIN JUMP — the Native Simulator Twin card (and its Verify Twin button)
     sits deep in the dashboard bento, below the fold on short viewports, so
     the deck carries a one-click way to reach it from anywhere: land on the
     dashboard, scroll the card into view, flash it so the eye catches it.
     Honors the reduced-motion safety net. */
  const twinCardRef = useRef<HTMLDivElement>(null);
  const [twinJumpArmed, setTwinJumpArmed] = useState(false);
  const [twinFlashed, setTwinFlashed] = useState(false);
  const twinFlashTimerRef = useRef<number | null>(null);

  const revealTwinCard = (el: HTMLDivElement | null) => {
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    /* SAFETY NET — a frame-starved window (occluded/minimized, some embedded
       webviews) never advances a smooth scroll: it silently stays put. If the
       card hasn't arrived a beat later, snap it there instantly. */
    if (!reduced) {
      window.setTimeout(() => {
        const scroller = el.closest('.overflow-y-auto');
        if (!scroller) return;
        const gap = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
        if (Math.abs(gap) > 80) el.scrollIntoView({ block: 'start' });
      }, 900);
    }
    setTwinFlashed(true);
    if (twinFlashTimerRef.current !== null) clearTimeout(twinFlashTimerRef.current);
    twinFlashTimerRef.current = window.setTimeout(() => setTwinFlashed(false), 2200);
  };

  const scrollToTwin = () => {
    /* already in view of the dashboard? scroll now; otherwise arm the jump —
       AnimatePresence mode="wait" remounts the bento after the exit beat, so
       the armed effect below waits for the card to exist */
    if (tab === 'dashboard' && twinCardRef.current) {
      revealTwinCard(twinCardRef.current);
      return;
    }
    setTwinJumpArmed(true);
    setTab('dashboard');
  };

  useEffect(() => {
    if (!twinJumpArmed) return;
    let tries = 0;
    const iv = window.setInterval(() => {
      tries += 1;
      if (twinCardRef.current) {
        window.clearInterval(iv);
        revealTwinCard(twinCardRef.current);
        setTwinJumpArmed(false);
      } else if (tries > 24) {
        window.clearInterval(iv);
        setTwinJumpArmed(false);
      }
    }, 60);
    return () => window.clearInterval(iv);
  }, [twinJumpArmed]);

  useEffect(() => () => {
    if (twinFlashTimerRef.current !== null) clearTimeout(twinFlashTimerRef.current);
  }, []);

  /* Backdrop Studio — hang the user's own image / GIF / muted video on the wall */
  const handleBackdropFile = async (file: File) => {
    const err = await backdrop.set(file);
    if (err) toast(`✗ ${err}`);
    else toast(`Backdrop hung — ${file.name} is the night now`);
  };

  const activeRealityId = state.activeRealityId || 'sol-prime';
  const realities: RealityConfig[] = REALITIES;
  const activeReality = getReality(activeRealityId, state.customRealityDescriptions);
  const totalGalaxies = realities.reduce((n, r) => n + (r.galaxies?.length ?? 0), 0);
  const totalClusters = realities.reduce((n, r) => n + (r.clusters?.length ?? 0), 0);
  const totalWorlds = realities.reduce((n, r) => n + r.bodies.length, 0);

  // Search & Filter Realities
  const filteredRealities = useMemo(() => {
    return realities.filter((r) => {
      if (filterType === 'anchored' && r.id !== activeRealityId) return false;
      if (filterType === 'custom' && r.id === 'sol-prime') return false;
      if (filterType === 'dense' && (r.galaxies?.length ?? 0) < 4) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchName = r.name.toLowerCase().includes(q);
      const matchCode = r.codeName.toLowerCase().includes(q);
      const matchSpectral = r.spectral.toLowerCase().includes(q);
      const matchGalaxies = (r.galaxies || []).some((g) => g.name.toLowerCase().includes(q));
      return matchName || matchCode || matchSpectral || matchGalaxies;
    });
  }, [realities, searchQuery, filterType, activeRealityId]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        /* while the forge modal is open, Escape closes only the modal */
        if (showCreate) return;
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [onClose, showCreate]);

  return (
    <MotionConfig reducedMotion="user">
    <div
      className="cc-root fixed inset-0 z-[130] overlay-in select-none text-slate-100"
      data-accent={tab}
      onClick={onClose}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) void handleBackdropFile(f);
      }}
      style={{ background: FALLBACK_NIGHT }}
    >
      {/* THE CRIMSON WATCH — a lonely Obito night behind everything; no plate,
          no border, no blur: the scene itself is the interface. The overlay
          itself paints the night (opaque), so the cosmos can never bleed
          through — full screen regardless of page content. */}
      <ScenicBackdrop
        media={backdrop.kind !== 'shader' && backdrop.url ? { kind: backdrop.kind, url: backdrop.url } : null}
        dim={backdrop.kind !== 'shader' ? backdrop.dim : 0}
      />

      {/* readability breath — a hint of dark behind the floating top bar */}
      <div className="absolute inset-x-0 top-0 h-24 bg-linear-to-b from-black/45 to-transparent pointer-events-none" />

      {/* THE FLOATING DECK — a slim bar and cards resting directly on the night */}
      <div
        className="relative h-full flex flex-col px-4 sm:px-8 lg:px-12 pt-3 pb-4"
        onClick={(e) => e.stopPropagation()}
      >

        {/* TOP BAR — identity · icon tabs · tools, floating on the night */}
        <div className="shrink-0 flex items-center justify-between gap-4 flex-wrap">
          {/* identity */}
          <div className="flex items-center gap-3 min-w-0">
            <CoreSigil size={40} />
            <div className="min-w-0 leading-none">
              <div className="flex items-baseline gap-2.5">
                <span className="cc-wordmark">Core Deck</span>
                <span className="cc-sub hidden sm:inline">Multiverse Command</span>
              </div>
              <div className="flex items-center gap-4 mt-1.5">
                {/* disk mirror — a lone dot; full telemetry in the thought cloud */}
                <span className="relative inline-flex group/disk">
                  <span
                    className={`flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] cursor-default ${
                      (state.diskSync?.connected ?? false) ? 'text-emerald-300/90' : 'text-rose-300/90'
                    }`}
                  >
                    <Database className="w-3 h-3" />
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        (state.diskSync?.connected ?? false) ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                      }`}
                    />
                  </span>
                  <span className="cc-cloud-card pointer-events-none absolute top-full left-0 mt-2 opacity-0 translate-y-1 group-hover/disk:opacity-100 group-hover/disk:translate-y-0 transition-all duration-200 z-50 whitespace-nowrap">
                    {(state.diskSync?.connected ?? false)
                      ? `Disk mirror live${(state.diskSync?.pendingOps ?? 0) > 0 ? ` · ${(state.diskSync?.pendingOps ?? 0)} retrying` : ''}`
                      : 'Disk mirror offline'}
                    {state.diskSync?.lastError ? ` · ${state.diskSync.lastError}` : ''}
                  </span>
                </span>
                {/* STAT SEALS — bare numerals; names rise on hover */}
                <StatSeal icon={<Globe className="w-3.5 h-3.5" />} value={realities.length} label="Realities" />
                <StatSeal icon={<Layers className="w-3.5 h-3.5" />} value={totalClusters} label="Clusters" />
                <StatSeal icon={<Orbit className="w-3.5 h-3.5" />} value={totalGalaxies} label="Galaxies" />
                <StatSeal icon={<Sun className="w-3.5 h-3.5" />} value={totalWorlds} label="Worlds" />
              </div>
            </div>
          </div>

          {/* ICON TABS — symbols only; full names rise in the thought cloud */}
          <nav className="flex items-center gap-2">
            {([
              { id: 'dashboard' as Tab, label: 'Command Matrix', sub: 'Live multiverse telemetry & controls', icon: <Cpu className="w-4 h-4" /> },
              { id: 'realities' as Tab, label: 'Realities Grid', sub: `${realities.length} parallel realities, one card each`, icon: <Globe className="w-4 h-4" /> },
              { id: 'hierarchy' as Tab, label: 'Deep Hierarchy', sub: 'The 11-stage cosmological ladder', icon: <Layers className="w-4 h-4" /> },
              {
                id: 'bin' as Tab,
                label: 'Quantum Bin',
                sub: 'Deleted realities rest in stasis',
                icon: <Trash2 className="w-4 h-4" />,
                badge: (state.binRealities || []).length > 0 ? (state.binRealities || []).length : undefined,
              },
            ]).map((t) => (
              <span key={t.id} className="relative inline-flex">
                <ThinkingCloudTooltip
                  onClick={() => setTab(t.id)}
                  icon={t.icon}
                  active={tab === t.id}
                  label={t.label}
                  subtitle={t.sub}
                  hint={tab === t.id ? 'Current view' : 'Switch view'}
                  position="bottom"
                  size="sm"
                  id={`cc-tab-${t.id}`}
                />
                {t.badge !== undefined && (
                  <span className="absolute -top-1 -right-1 z-10 w-4 h-4 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold flex items-center justify-center pointer-events-none shadow-[0_0_10px_rgba(251,113,133,0.6)]">
                    {t.badge}
                  </span>
                )}
              </span>
            ))}
          </nav>

          {/* TOOLS — search · filters · forge · close */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative hidden md:block w-44 lg:w-60">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search realities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black/45 border border-white/12 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white/35 font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="hidden lg:flex items-center gap-2.5 font-mono text-[9px] uppercase tracking-[0.12em]">
              {[
                { id: 'all', label: 'All' },
                { id: 'anchored', label: 'Anchor' },
                { id: 'custom', label: 'Custom' },
                { id: 'dense', label: 'Dense' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id as typeof filterType)}
                  className={`pb-0.5 border-b cursor-pointer transition-colors ${
                    filterType === f.id
                      ? 'text-white border-[rgb(var(--cc))]'
                      : 'text-slate-500 border-transparent hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* TWIN JUMP — always visible even when the twin card rests
                below the fold: one click lands on the Native Simulator Twin */}
            <ThinkingCloudTooltip
              onClick={scrollToTwin}
              icon={<Orbit className="w-4 h-4" />}
              label="Native Simulator Twin"
              subtitle="Scroll straight to the twin verification card"
              hint="Jump"
              position="bottom"
              size="sm"
              id="cc-twin-jump-btn"
            />

            {/* BACKDROP STUDIO — the user's own night: image, GIF or muted video */}
            <span className="relative inline-flex">
              <ThinkingCloudTooltip
                onClick={() => setStudioOpen((v) => !v)}
                icon={<Wallpaper className="w-4 h-4" />}
                label="Backdrop Studio"
                subtitle="Hang your own picture, GIF or muted video"
                hint={backdrop.kind === 'shader' ? 'Open' : 'Your night is up'}
                position="bottom"
                size="sm"
                id="cc-backdrop-btn"
              />
              {studioOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStudioOpen(false);
                    }}
                  />
                  <div
                    className="cc-cloud-rise absolute right-0 top-full z-50 mt-3 w-64 rounded-2xl bg-[#0a0d16]/95 border border-white/15 p-4 shadow-[0_18px_44px_rgba(0,0,0,0.6)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400 mb-3">Backdrop Studio</div>
                    <label className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400">
                      <span>Night veil</span>
                      <span className="text-slate-200">{Math.round(backdrop.dim * 100)}%</span>
                    </label>
                    <input
                      type="range" min={0} max={0.7} step={0.05} value={backdrop.dim}
                      onChange={(e) => backdrop.setDim(Number(e.target.value))}
                      className="w-full accent-cyan-400 mt-1 mb-3 cursor-pointer"
                    />
                    <label className="cc-btn-glass block text-center rounded-xl px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-slate-200 cursor-pointer hover:text-white transition-colors">
                      Choose image / GIF
                      <input
                        type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleBackdropFile(f); e.target.value = ''; }}
                      />
                    </label>
                    <label className="cc-btn-glass mt-2 block text-center rounded-xl px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-slate-200 cursor-pointer hover:text-white transition-colors">
                      Choose video (muted)
                      <input
                        type="file" accept="video/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleBackdropFile(f); e.target.value = ''; }}
                      />
                    </label>
                    {backdrop.kind !== 'shader' && (
                      <button
                        onClick={() => { backdrop.clear(); toast('The Crimson Watch returns — shader night restored'); setStudioOpen(false); }}
                        className="w-full mt-2 rounded-xl px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-rose-200 border border-rose-400/30 hover:bg-rose-500/10 cursor-pointer transition-colors"
                      >
                        Reset to Crimson Night
                      </button>
                    )}
                    <p className="font-mono text-[8px] text-slate-500 mt-3 leading-relaxed">
                      Stored offline in this browser only — or drop a file anywhere on the deck.
                    </p>
                  </div>
                </>
              )}
            </span>
            <ThinkingCloudTooltip
              onClick={() => setShowCreate(true)}
              label="Forge Reality Continuum"
              subtitle="Manifest a new parallel realm & disk directory"
              position="bottom"
              size="sm"
              iconType="forge"
              id="core-forge-reality-btn"
            />
            <ThinkingCloudTooltip
              onClick={onClose}
              icon={<X className="w-4 h-4" />}
              label="Close Console"
              subtitle="Return to the cosmos — Esc works too"
              hint="Close"
              position="bottom"
              size="sm"
              id="cc-close-btn"
            />
          </div>
        </div>

        {/* MAIN BODY AREA — cards resting directly on the night.
            overscroll-contain keeps the wheel inside the deck (no chaining). */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scroll overscroll-contain pt-5">
          <AnimatePresence mode="wait">
          {tab === 'dashboard' && (
            /* 12-col bento: radar(4×2 rows) · vitals(8) · physics(8) ·
               pods(4) · engine(8) · studio(12) · chronicle(12) — realities
               live only in the Realities Grid tab, so auto-placement puts
               pods directly under the radar */
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
            <motion.div
              className="grid grid-cols-1 lg:grid-cols-12 gap-3"
              variants={deckStagger}
              initial="hidden"
              animate="show"
            >
              {/* RADAR — tall 4-col bento cell */}
              <motion.div variants={rise} className="lg:col-span-4 lg:row-span-2 cc-panel p-4 flex flex-col items-center">
                <span className="cc-panel-title self-start mb-2">
                  <Orbit className="w-3.5 h-3.5" />
                  Multiverse Radar Scan
                </span>
                <HolographicMultiverseRadar
                  realities={realities}
                  activeId={activeRealityId}
                  onSelect={(id) => onWarpReality(id)}
                />
                <div className="mt-auto pt-3 w-full flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-white/6">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.9)] shrink-0" />
                    <span className="truncate">Anchor: <span className="text-cyan-300 font-bold">{activeReality.name}</span></span>
                  </span>
                  <button onClick={() => setTab('realities')} className="text-cyan-400 hover:text-white shrink-0">View All →</button>
                </div>
              </motion.div>

              {/* VITALS — wide 8-col strip: four figures + disk mirror */}
              <motion.div variants={rise} className="lg:col-span-8 cc-panel p-4 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="cc-panel-title">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Multiverse Vitals
                  </span>
                  <span className="cc-label text-emerald-300/90 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <VitalTile label="Realities" value={realities.length} color="#67e8f9" />
                  <VitalTile label="Worlds" value={totalWorlds} color="#fbbf24" />
                  <VitalTile label="Galaxies" value={totalGalaxies} color="#a78bfa" />
                  <VitalTile label="Clusters" value={totalClusters} color="#f472b6" />
                </div>
                <SimClockTile />
                <DiskSyncStatusTile diskSync={state.diskSync} />
              </motion.div>

              {/* ROUND 14 — PHYSICS LAWS: Einstein's lensing + Newton's living
                  gravity. 8-col beside the radar (under Vitals) so the bento
                  rows stay packed. R94: while the session drives the sky,
                  Living Gravity rests honestly — the session IS the living
                  gravity now. */}
              <motion.div variants={rise} className="lg:col-span-8 cc-panel p-4 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="cc-panel-title">
                    <Orbit className="w-3.5 h-3.5" />
                    Physics Laws — Relativity &amp; Gravitation
                  </span>
                  <span className={`cc-label flex items-center gap-1.5 ${state.universeDriver !== false ? 'text-emerald-300/90' : 'text-cyan-300/80'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${state.universeDriver !== false ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'}`} />
                    {state.universeDriver !== false ? 'TRUE GRAVITY · DRIVING' : 'Einstein · Newton · Live'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <TiltButton
                    onClick={() => onToggleLens(!lensOn)}
                    maxTilt={11}
                    lift={16}
                    style={{ ['--btn' as string]: lensOn ? '34 211 238' : '100 116 139' }}
                    className={`cc-btn-glass p-2.5 rounded-xl text-[10px] font-mono uppercase tracking-wider cursor-pointer ${lensOn ? 'text-cyan-100' : 'text-slate-400'}`}
                    title="Einstein lensing — every mass bends the light passing it. The real universe has no grid; curvature shows in the light."
                  >
                    <Orbit className="w-3.5 h-3.5" /> Lens · {lensOn ? 'Bent' : 'Clear'}
                  </TiltButton>
                  <TiltButton
                    onClick={() => onToggleLiving(!livingOn)}
                    disabled={state.universeDriver !== false}
                    maxTilt={11}
                    lift={16}
                    style={{ ['--btn' as string]: state.universeDriver !== false ? '16 185 129' : livingOn ? '167 139 250' : '100 116 139' }}
                    className={`cc-btn-glass p-2.5 rounded-xl text-[10px] font-mono uppercase tracking-wider ${state.universeDriver !== false ? 'text-emerald-200 cursor-default' : livingOn ? 'text-violet-200 cursor-pointer' : 'text-slate-400 cursor-pointer'}`}
                    title={state.universeDriver !== false
                      ? 'True mutual gravity IS the session now — the clockwork coupling rests while the driver owns the sky'
                      : "True mutual N-body coupling in osculating elements (Gauss's planetary equations) — bounded forever"}
                  >
                    <Zap className="w-3.5 h-3.5" /> {state.universeDriver !== false ? 'Gravity · In the Session' : livingOn ? 'Gravity · Awake' : 'Gravity · Rested'}
                  </TiltButton>
                  <TiltButton
                    onClick={onRestoreEphemeris}
                    maxTilt={11}
                    lift={16}
                    style={{ ['--btn' as string]: '251 191 36' }}
                    className="cc-btn-glass p-2.5 rounded-xl text-amber-100 text-[10px] font-mono uppercase tracking-wider cursor-pointer"
                    title="Canonical heal — restore every world's exact divine path in one stroke (re-seeds the driving session too)"
                  >
                    <Compass className="w-3.5 h-3.5" /> Restore Ephemeris
                  </TiltButton>
                </div>
                <p className="text-[10px] font-mono leading-relaxed text-slate-400/90">
                  {state.universeDriver !== false
                    ? 'TRUE GRAVITY DRIVES THE SKY — every world and every moon follows real mutual N-body gravity. The canon is the seed, the Kepler clockwork renders any frame the session cannot deliver, and Restore Ephemeris re-seeds the divine plan. Chaos is honest; the story persists across restarts.'
                    : 'The real universe has no grid — so curvature is shown the only way it can be seen: light bending. Every mass lenses the starlight passing it (strongest around the star, a deep ring around the Vault), and Living Gravity lets worlds tug each other through Gauss\'s planetary equations in osculating elements — orbits breathe and precess, never wander. Restore Ephemeris heals every path instantly; the divine plan is never lost.'}
                </p>
              </motion.div>

              {/* QUICK PODS — 4-col, lands directly under the radar.
                  Reality cards live ONLY in the Realities Grid tab — the
                  Command Matrix stays a control deck, not a second list.
                  Camera + Kamui pods dismiss the deck FIRST — their 3D effects
                  play on the universe and must not fire behind the glass. */}
              <motion.div variants={rise} className="lg:col-span-4 cc-panel p-4">
                <span className="cc-panel-title block mb-2">Singularity Quick Pods</span>
                <div className="flex flex-wrap gap-2">
                  <ThinkingCloudTooltip
                    onClick={() => { onClose(); onZoomToCore(); }}
                    icon={<Crosshair className="w-4 h-4" />}
                    label="Frame Core"
                    subtitle="Pull the camera back to the Astral Core"
                    hint="Frame"
                    position="bottom"
                    size="sm"
                    id="pod-frame-core"
                  />
                  {onShowToolbar && (
                    <ThinkingCloudTooltip
                      onClick={onShowToolbar}
                      icon={<Compass className="w-4 h-4" />}
                      label="Toolbar"
                      subtitle="Summon the hierarchy toolbar"
                      hint="Summon"
                      position="bottom"
                      size="sm"
                      id="pod-toolbar"
                    />
                  )}
                  <ThinkingCloudTooltip
                    onClick={() => setShowCreate(true)}
                    icon={<Plus className="w-4 h-4" />}
                    label="New Reality"
                    subtitle="Manifest a parallel realm & disk folder"
                    hint="Forge"
                    position="bottom"
                    size="sm"
                    id="pod-new-reality"
                  />
                </div>
              </motion.div>

              {/* C++ NATIVE ENGINE — 8-col */}
              <motion.div variants={rise} className="lg:col-span-8">
                <CppNativeEngineCard />
              </motion.div>

              {/* R87 NATIVE SIMULATOR TWIN — 4-col twin-verification card.
                  This bento cell is the Twin Jump target: the top-bar seal
                  scrolls here from anywhere and flashes the card on arrival. */}
              <motion.div
                variants={rise}
                ref={twinCardRef}
                id="simulator-twin-card"
                className={`lg:col-span-4 rounded-2xl transition-shadow duration-500 ${
                  twinFlashed
                    ? 'shadow-[0_0_0_2px_rgba(167,139,250,0.65),0_0_34px_rgba(139,92,246,0.4)]'
                    : ''
                }`}
              >
                <SimulatorTwinCard />
              </motion.div>

              {/* BLACK HOLE STUDIO — R20.4 live geodesic tuning rail */}
              <motion.div variants={rise} className="lg:col-span-12">
                <BlackHoleTuningCard />
              </motion.div>

              {/* CORE LIVE CHRONICLE — full-width bottom rail */}
              <motion.div variants={rise} className="lg:col-span-12 cc-panel p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="cc-panel-title">
                    <Wind className="w-3.5 h-3.5" />
                    Singularity Live Chronicle
                  </span>
                  <span className="cc-badge cc-badge-dim">{state.audit.length} events</span>
                </div>
                <div className="flex flex-col gap-1 max-h-24 overflow-y-auto custom-scroll">
                  {[...state.audit].reverse().slice(0, 8).map((a, i) => {
                    const hue = a.msg.includes('\u26a0') ? 'text-amber-300'
                      : a.msg.includes('Quantum Bin') || a.msg.includes('purged') ? 'text-rose-300'
                      : a.msg.toLowerCase().includes('reality') ? 'text-cyan-200'
                      : 'text-slate-300';
                    return (
                      <motion.div
                        key={`${a.t}-${i}`}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ ...softSpring, delay: Math.min(i * 0.03, 0.2) }}
                        className="flex items-baseline gap-2 font-mono text-[9px]"
                      >
                        <span className="text-slate-500 tabular-nums shrink-0">
                          {new Date(a.t).toLocaleTimeString(undefined, { hour12: false })}
                        </span>
                        <span className={`${hue} truncate`}>{a.msg}</span>
                      </motion.div>
                    );
                  })}
                  {state.audit.length === 0 && (
                    <p className="text-[10px] text-slate-500">No multiverse events recorded yet.</p>
                  )}
                </div>
              </motion.div>
            </motion.div>
            </motion.div>
          )}

          {tab === 'realities' && (
            <motion.div
              key="realities"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="cc-panel-title">
                  <Globe className="w-4 h-4" />
                  All Parallel Realities ({filteredRealities.length})
                </span>
                <span className="cc-label">
                  Each reality manages its own independent physical continuum and disk folder
                </span>
              </div>

              {/* 3-Column Bento Reality Grid */}
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                variants={deckStagger}
                initial="hidden"
                animate="show"
              >
                {filteredRealities.map((r) => (
                  <BentoRealityCard
                    key={r.id}
                    reality={r}
                    active={r.id === activeRealityId}
                      diaryCount={state.realities?.[r.id]?.entries?.length ?? 0}
                      vaultCount={state.realities?.[r.id]?.vault?.length ?? 0}
                    onWarp={() => onWarpReality(r.id)}
                    onDelete={() => {
                      if (r.id === 'sol-prime') {
                        toast('Sol Prime is the primordial anchor — it cannot be erased', 'warn');
                        return;
                      }
                      actions.deleteReality(r.id);
                      toast(`${r.name} collapsed out of existence`);
                    }}
                    onEnterGalaxy={onEnterGalaxy}
                  />
                ))}
              </motion.div>

              {filteredRealities.length === 0 && (
                <div className="p-12 text-center rounded-2xl bg-white/2 border border-white/5 font-mono text-xs text-slate-400">
                  No realities match "{searchQuery}"
                </div>
              )}
            </div>
            </motion.div>
          )}

          {tab === 'hierarchy' && (
            <motion.div
              key="hierarchy"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <DeepHierarchyExplorer
                realities={realities}
                onEnterGalaxy={onEnterGalaxy}
                onWarpReality={onWarpReality}
              />
            </motion.div>
          )}

          {tab === 'bin' && (
            <motion.div
              key="bin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <QuantumBinTab />
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>

      <CreateRealityModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={(params) => {
          const config = createNewRealityConfig(params);
          actions.createReality(config);
          toast(`✦ Reality ${config.name} manifested — its bubble and backend folder ignite into existence`);
        }}
      />
    </div>
    </MotionConfig>
  );
};
