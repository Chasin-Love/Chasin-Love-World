import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X, Zap, Globe, Sparkles, Orbit, Trash2, ChevronDown, ChevronRight,
  Plus, ShieldCheck, Crosshair, Wind, Compass, Search,
  Edit2, Palette, Check, Layers, Disc, Sun, Radio, ExternalLink,
  Cpu, Database
} from 'lucide-react';
import { REALITIES, getReality, createNewRealityConfig, RealityConfig } from '../../realities';
import { actions, useUniverse } from '../../state';
import type { DiskSyncState } from '../../types';
import { toast } from '../../ui/toast';
import { prettyPrint } from '../../ui/format';
import { CreateRealityModal } from '../realities/CreateRealityModal';
import { RealityAdvancedPanel } from '../realities/RealityAdvancedPanel';
import { ThinkingCloudTooltip } from '../lineage/ThinkingCloudTooltip';
import { QuantumBinTab } from './QuantumBinTab';
import { CppNativeEngineCard } from './CppNativeEngineCard';

interface Props {
  onClose: () => void;
  onWarpReality: (realityId: string) => void;
  onZoomToCore: () => void;
  onTriggerKamui: () => void;
  onEnterGalaxy: (realityId: string, galaxyId: string) => void;
  onShowToolbar?: () => void;
}

type Tab = 'dashboard' | 'realities' | 'hierarchy' | 'bin';

/* Per-tab accent color — the whole deck recolors via the --cc CSS variable
   keyed off the plate's data-accent attribute (see index.css). */
const TAB_ACCENTS: Record<Tab, string> = {
  dashboard: '#22d3ee',
  realities: '#f2c178',
  hierarchy: '#a78bfa',
  bin: '#fb7185',
};

/* ------------------------------------------------------------------ */
/* 1. Live 3D Holographic Backdrop — perspective starfield + rotating  */
/*    cosmic-web spheres, mouse parallax (2D canvas, 3D projection)    */
/* ------------------------------------------------------------------ */
function CoreBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    /* --- mouse parallax --- */
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMouse = (e: MouseEvent) => {
      mouse.tx = (e.clientX / w - 0.5) * 2;
      mouse.ty = (e.clientY / h - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouse);

    /* --- 3D helpers --- */
    const FOV = 620;
    const project = (x: number, y: number, z: number) => {
      const scale = FOV / Math.max(1, FOV + z);
      return {
        sx: w / 2 + mouse.x * 40 + x * scale,
        sy: h / 2 + mouse.y * 40 + y * scale,
        scale,
      };
    };

    /* --- perspective starfield flying past the camera --- */
    interface Star3 { x: number; y: number; z: number; r: number; color: string }
    const starColors = ['#00f5d4', '#38bdf8', '#8b5cf6', '#ec4899', '#ffffff', '#fbbf24'];
    const STAR_COUNT = 460;
    const STARS: Star3[] = Array.from({ length: STAR_COUNT }, () => ({
      x: (Math.random() - 0.5) * 2400,
      y: (Math.random() - 0.5) * 1600,
      z: Math.random() * 1400,
      r: 0.6 + Math.random() * 1.7,
      color: starColors[Math.floor(Math.random() * starColors.length)],
    }));

    /* --- rotating wireframe cosmic-web spheres --- */
    interface WebSphere {
      cx: number; cy: number; radius: number; spin: number; tilt: number;
      hue: string; points: { x: number; y: number; z: number }[]; edges: [number, number][];
    }
    const makeSphere = (cfg: Omit<WebSphere, 'points' | 'edges'>, count: number): WebSphere => {
      /* fibonacci sphere distribution */
      const pts = Array.from({ length: count }, (_, i) => {
        const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        return {
          x: Math.sin(phi) * Math.cos(theta),
          y: Math.cos(phi),
          z: Math.sin(phi) * Math.sin(theta),
        };
      });
      /* connect each point to its 2 nearest neighbors */
      const edges: [number, number][] = [];
      pts.forEach((p, i) => {
        const dists = pts
          .map((q, j) => ({ j, d: (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2 }))
          .filter((e) => e.j !== i)
          .sort((a, b) => a.d - b.d)
          .slice(0, 2);
        dists.forEach((e) => {
          if (e.j > i) edges.push([i, e.j]);
        });
      });
      return { ...cfg, points: pts, edges };
    };
    const spheres: WebSphere[] = [
      makeSphere({ cx: 0.16, cy: 0.24, radius: 300, spin: 0.05, tilt: 0.42, hue: '0, 245, 212' }, 70),
      makeSphere({ cx: 0.85, cy: 0.72, radius: 380, spin: -0.035, tilt: -0.3, hue: '139, 92, 246' }, 88),
    ];

    interface Shooter {
      x: number; y: number; vx: number; vy: number; life: number; max: number; color: string;
    }
    const shooters: Shooter[] = [];
    let t = 0;
    let last = performance.now();

    const nebulae = [
      { hue: 'rgba(6,182,212,', x: 0.18, y: 0.25, r: 0.55, dx: 0.012, dy: 0.006 },
      { hue: 'rgba(139,92,246,', x: 0.82, y: 0.65, r: 0.6, dx: -0.009, dy: 0.008 },
      { hue: 'rgba(255,45,120,', x: 0.5, y: 0.15, r: 0.45, dx: 0.007, dy: -0.01 },
      { hue: 'rgba(16,185,129,', x: 0.75, y: 0.3, r: 0.4, dx: -0.006, dy: 0.007 },
    ];

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      /* ease mouse toward target for buttery parallax */
      mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 2.5);
      mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 2.5);
      ctx.clearRect(0, 0, w, h);

      /* Chromatic Nebulae Drift */
      nebulae.forEach((n, i) => {
        const cx = (n.x + Math.sin(t * n.dx * 8 + i) * 0.06) * w;
        const cy = (n.y + Math.cos(t * n.dy * 8 + i * 2) * 0.06) * h;
        const rad = n.r * Math.min(w, h);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, `${n.hue}${0.13 + 0.05 * Math.sin(t * 0.8 + i)})`);
        g.addColorStop(1, `${n.hue}0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      });

      /* 3D Perspective Starfield — stars fly past the camera */
      STARS.forEach((s) => {
        s.z -= (90 + s.r * 40) * dt;
        if (s.z < 8) {
          s.z = 1400;
          s.x = (Math.random() - 0.5) * 2400;
          s.y = (Math.random() - 0.5) * 1600;
        }
        const { sx, sy, scale } = project(s.x, s.y, s.z);
        if (sx < -8 || sx > w + 8 || sy < -8 || sy > h + 8) return;
        const depth = 1 - s.z / 1400;
        ctx.globalAlpha = Math.min(1, 0.12 + depth * 0.75);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(sx, sy, s.r * scale, 0, Math.PI * 2);
        ctx.fill();
        /* warp streak on near stars */
        if (depth > 0.82) {
          ctx.globalAlpha = (depth - 0.82) * 2.2;
          ctx.strokeStyle = s.color;
          ctx.lineWidth = s.r * scale * 0.7;
          const tail = project(s.x, s.y, s.z + 46);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(tail.sx, tail.sy);
          ctx.stroke();
        }
      });
      ctx.globalAlpha = 1;

      /* Rotating Wireframe Cosmic-Web Spheres */
      spheres.forEach((sp, si) => {
        const cx = sp.cx * w + mouse.x * (18 + si * 14);
        const cy = sp.cy * h + mouse.y * (18 + si * 14);
        const cosT = Math.cos(sp.tilt);
        const sinT = Math.sin(sp.tilt);
        const screen: { sx: number; sy: number; z: number }[] = [];

        sp.points.forEach((p) => {
          /* spin around Y */
          const a = t * sp.spin + si * 2;
          const rx = p.x * Math.cos(a) - p.z * Math.sin(a);
          const rz = p.x * Math.sin(a) + p.z * Math.cos(a);
          /* tilt around X */
          const ry = p.y * cosT - rz * sinT;
          const rz2 = p.y * sinT + rz * cosT;
          const s = project(cx + rx * sp.radius, cy + ry * sp.radius, rz2 * sp.radius * 0.5);
          screen.push({ sx: s.sx, sy: s.sy, z: rz2 });
        });

        /* filaments */
        ctx.lineWidth = 1;
        sp.edges.forEach(([i, j]) => {
          const a = screen[i];
          const b = screen[j];
          const depth = 0.5 + ((a.z + b.z) / 2) * 0.5;
          ctx.strokeStyle = `rgba(${sp.hue},${(0.26 * (1 - depth)).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.sx, a.sy);
          ctx.lineTo(b.sx, b.sy);
          ctx.stroke();
        });
        /* nodes */
        screen.forEach((p) => {
          const depth = 0.5 + p.z * 0.5;
          ctx.fillStyle = `rgba(${sp.hue},${(0.85 * (1 - depth) + 0.08).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, Math.max(0.6, 2.4 * (1 - depth)), 0, Math.PI * 2);
          ctx.fill();
        });
      });

      /* Tachyon Particle Beams */
      if (Math.random() < dt * 0.65 && shooters.length < 3) {
        const fromLeft = Math.random() > 0.5;
        const colors = ['#00f5d4', '#38bdf8', '#c084fc', '#f472b6'];
        shooters.push({
          x: fromLeft ? -40 : w + 40,
          y: Math.random() * h * 0.5,
          vx: (fromLeft ? 1 : -1) * (420 + Math.random() * 380),
          vy: 100 + Math.random() * 160,
          life: 0,
          max: 1.2,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }

      for (let i = shooters.length - 1; i >= 0; i--) {
        const sh = shooters[i];
        sh.life += dt;
        sh.x += sh.vx * dt;
        sh.y += sh.vy * dt;
        const k = 1 - sh.life / sh.max;
        if (k <= 0) {
          shooters.splice(i, 1);
          continue;
        }
        const grad = ctx.createLinearGradient(sh.x, sh.y, sh.x - sh.vx * 0.16, sh.y - sh.vy * 0.16);
        grad.addColorStop(0, `${sh.color}`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(sh.x, sh.y);
        ctx.lineTo(sh.x - sh.vx * 0.16, sh.y - sh.vy * 0.16);
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouse);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
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

        // Node Glow
        const orbG = ctx.createRadialGradient(rx, ry, 0, rx, ry, isActive ? 16 : 10);
        orbG.addColorStop(0, r.colorA);
        orbG.addColorStop(0.7, r.colorB);
        orbG.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = orbG;
        ctx.beginPath();
        ctx.arc(rx, ry, isActive ? 16 : 10, 0, Math.PI * 2);
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
    <div className="relative w-full aspect-square max-w-[260px] mx-auto flex items-center justify-center p-2 rounded-2xl bg-black/25 border border-white/6">
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain"
        onClick={handleRadarClick}
        onMouseMove={handleRadarMove}
      />
      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-400/30 text-[9px] font-mono text-cyan-300">
        <Radio className="w-2.5 h-2.5 animate-pulse text-cyan-400" />
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
    <div className="p-2.5 rounded-xl bg-black/30 border border-white/6 flex flex-col items-center gap-1">
      <span className="cc-num text-lg leading-none" style={{ color }}>
        {value}
      </span>
      <span className="cc-label">{label}</span>
    </div>
  );
}

function DiskSyncStatusTile({ diskSync }: { diskSync?: DiskSyncState }) {
  const connected = diskSync?.connected ?? false;
  const pending = diskSync?.pendingOps ?? 0;
  return (
    <div
      className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
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
  onWarp,
  onDelete,
  onEnterGalaxy,
}: {
  reality: RealityConfig;
  active: boolean;
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
    <div
      className={`group relative rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden ${
        active
          ? 'bg-linear-to-b from-cyan-500/12 via-[#0b1322] to-[#080e1b] border-cyan-400/50 shadow-[0_16px_40px_rgba(0,0,0,0.55),0_0_20px_rgba(6,182,212,0.15)]'
          : 'bg-[#0d1526] border-white/8 hover:border-cyan-400/35 hover:shadow-[0_16px_40px_rgba(0,0,0,0.5)]'
      }`}
    >
      {/* Top Accent Line */}
      <div
        className="h-1 w-full"
        style={{ background: `linear-gradient(90deg, ${reality.colorA}, ${reality.colorB})` }}
      />

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
              <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-slate-950 border border-white/20">
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
                    className="px-2 py-0.5 rounded bg-slate-900 border border-cyan-400 text-xs text-white font-semibold focus:outline-none"
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
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/25 border border-cyan-400/50 text-[8.5px] font-mono font-bold uppercase tracking-wider text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.4)]">
              ANCHORED
            </span>
          )}
        </div>

        {/* Color Palette Popover */}
        {showColorPicker && (
          <div className="p-2.5 rounded-xl bg-slate-950 border border-cyan-500/30 flex flex-wrap gap-1.5 shadow-xl">
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

        {/* Telemetry Metrics Pods */}
        <div className="grid grid-cols-3 gap-2 text-center font-mono">
          <div className="p-2 rounded-xl bg-white/4 border border-white/6 flex flex-col items-center">
            <div className="flex items-center gap-1 text-cyan-300 text-xs font-bold tabular-nums">
              <Orbit className="w-3 h-3" />
              <span>{galaxies.length}</span>
            </div>
            <span className="cc-label mt-0.5">Galaxies</span>
          </div>

          <div className="p-2 rounded-xl bg-white/4 border border-white/6 flex flex-col items-center">
            <div className="flex items-center gap-1 text-violet-300 text-xs font-bold tabular-nums">
              <Layers className="w-3 h-3" />
              <span>{clusters.length}</span>
            </div>
            <span className="cc-label mt-0.5">Clusters</span>
          </div>

          <div className="p-2 rounded-xl bg-white/4 border border-white/6 flex flex-col items-center">
            <div className="flex items-center gap-1 text-amber-300 text-xs font-bold tabular-nums">
              <Sun className="w-3 h-3" />
              <span>{worldsCount}</span>
            </div>
            <span className="cc-label mt-0.5">Worlds</span>
          </div>
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
                className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/5 text-[10px] font-mono text-slate-300"
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
      <div className="px-4 py-3 bg-black/30 border-t border-white/8 flex items-center justify-between gap-2">
        <button
          onClick={onWarp}
          disabled={active}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-mono uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-1.5 ${
            active
              ? 'bg-cyan-500/20 text-cyan-200/80 border border-cyan-400/40 cursor-default'
              : 'bg-white/6 hover:bg-cyan-500/20 text-slate-200 border border-white/10 hover:border-cyan-400/40 cursor-pointer'
          }`}
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
        <div className="p-4 bg-slate-950/80 border-t border-cyan-500/30">
          <RealityAdvancedPanel realityId={reality.id} onEnterGalaxy={onEnterGalaxy} />
        </div>
      )}
    </div>
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
      <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col gap-2 overflow-y-auto custom-scroll max-h-[560px]">
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
      <div className="md:col-span-2 p-4 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col gap-3 overflow-y-auto custom-scroll max-h-[560px]">
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
                    className="p-3 rounded-xl bg-black/40 border border-white/10 hover:border-cyan-400/40 transition-all flex flex-col justify-between gap-2"
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
  onTriggerKamui,
  onEnterGalaxy,
  onShowToolbar,
}) => {
  const state = useUniverse();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'anchored' | 'custom' | 'dense'>('all');

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
    <div
      className="fixed inset-0 z-100 overlay-in bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 lg:p-6 select-none"
      onClick={onClose}
    >
      {/* 3D Holographic Backdrop */}
      <CoreBackdrop />

      {/* Aurora Ambient Lighting */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(90% 70% at 50% 40%, rgba(6,182,212,0.14), transparent 60%), radial-gradient(70% 60% at 75% 80%, rgba(139,92,246,0.16), transparent 65%)',
        }}
      />

      {/* THE 3D HOLOGRAPHIC COMMAND DECK PLATE — accent recolors with the active tab */}
      <div
        className="core-plate relative w-full max-w-[1440px] h-[92vh] max-h-[920px] rounded-[28px] text-slate-100 flex flex-col overflow-hidden"
        data-accent={tab}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Specular Edge Highlighting */}
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-cyan-300/90 to-transparent pointer-events-none" />

        {/* TOP COMMAND HEADER BAR */}
        <div className="shrink-0 flex items-center justify-between gap-4 px-5 sm:px-7 py-3.5 border-b border-cyan-500/20 bg-linear-to-r from-slate-950/80 via-slate-900/60 to-slate-950/80">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Pulsing Core Gyro Sigil */}
            <div className="relative w-11 h-11 shrink-0">
              <div className="absolute inset-0 rounded-full bg-linear-to-br from-cyan-400/80 via-violet-500/70 to-pink-500/70 blur-[8px] opacity-90 animate-pulse" />
              <div className="absolute inset-0.75 rounded-full bg-slate-950/90 border border-white/30 flex items-center justify-center">
                <span className="core-sigil block w-4 h-4 rounded-full bg-linear-to-br from-cyan-300 to-pink-400 shadow-[0_0_16px_rgba(6,182,212,0.95)]" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="cc-display drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  MULTIVERSE CORE COMMAND DECK
                </h2>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                  3D Holographic Singularity Origin (0,0,0)
                </span>
                <span
                  className={`flex items-center gap-1.5 text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                    (state.diskSync?.connected ?? false)
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/40'
                      : 'bg-rose-500/15 text-rose-300 border-rose-400/40'
                  }`}
                  title={state.diskSync?.lastError ?? 'Reality daemon telemetry'}
                >
                  <Database className="w-2.5 h-2.5" />
                  {(state.diskSync?.connected ?? false)
                    ? `DISK MIRROR LIVE${(state.diskSync?.pendingOps ?? 0) > 0 ? ` · ${(state.diskSync?.pendingOps ?? 0)} RETRYING` : ''}`
                    : 'DISK MIRROR OFFLINE'}
                </span>
              </div>
              <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-cyan-300/80 truncate">
                Status: Sovereign Continuum Active · {realities.length} Realities · {totalClusters} Clusters · {totalGalaxies} Galaxies · {totalWorlds} Worlds
              </p>
            </div>
          </div>

          {/* Top Quick Tools & Close */}
          <div className="flex items-center gap-3">
            {/* Celestial Forge Symbol with Animated Thinking Cloud */}
            <ThinkingCloudTooltip
              onClick={() => setShowCreate(true)}
              label="Forge Reality Continuum"
              subtitle="Manifest a new parallel realm & disk directory"
              position="bottom"
              size="md"
              iconType="forge"
              id="core-forge-reality-btn"
            />
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/6 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-all shrink-0 cursor-pointer"
              title="Close Console (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TAB CONTROLS & SEARCH BAR */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 sm:px-7 py-2.5 border-b border-white/10 bg-slate-900/40 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {([
              { id: 'dashboard' as Tab, label: 'Command Matrix', icon: <Cpu className="w-3.5 h-3.5" /> },
              { id: 'realities' as Tab, label: `Realities Grid (${realities.length})`, icon: <Globe className="w-3.5 h-3.5" /> },
              { id: 'hierarchy' as Tab, label: 'Deep Hierarchy', icon: <Layers className="w-3.5 h-3.5" /> },
              {
                id: 'bin' as Tab,
                label: `Quantum Bin (${(state.binRealities || []).length})`,
                icon: <Trash2 className="w-3.5 h-3.5" />,
                badge: (state.binRealities || []).length > 0 ? (state.binRealities || []).length : undefined,
              },
            ]).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`cc-tab flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider border transition-all cursor-pointer ${
                  tab === t.id ? 'cc-tab-active text-white' : 'bg-white/4 text-slate-300 border-white/10 hover:text-white'
                }`}
                style={tab === t.id ? { ['--cc' as string]: TAB_ACCENTS[t.id] } : undefined}
              >
                {t.icon} <span>{t.label}</span>
                {t.badge !== undefined && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Live Search & Filter Bar */}
          <div className="flex items-center gap-2 flex-1 max-w-md ml-auto">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search reality, spectral code, galaxy..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400/60 font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-1 font-mono text-[9.5px]">
              {[
                { id: 'all', label: 'All' },
                { id: 'anchored', label: 'Anchor' },
                { id: 'custom', label: 'Custom' },
                { id: 'dense', label: 'Dense' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id as typeof filterType)}
                  className={`px-2 py-1 rounded-lg border transition-all ${
                    filterType === f.id
                      ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50'
                      : 'bg-white/4 text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* MAIN BODY AREA (HORIZONTAL COCKPIT LAYOUT) */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scroll px-5 sm:px-7 py-4">
          {tab === 'dashboard' && (
            /* 12-col bento: radar(4×2 rows) · vitals(8) · realities(8) ·
               pods(4) · engine(8) · chronicle(12) — auto-placement puts pods
               directly under the radar */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              {/* RADAR — tall 4-col bento cell */}
              <div className="lg:col-span-4 lg:row-span-2 cc-panel p-4 flex flex-col items-center">
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
                  <span>Anchor: <span className="text-cyan-300 font-bold">{activeReality.name}</span></span>
                  <button onClick={() => setTab('realities')} className="text-cyan-400 hover:text-white">View All →</button>
                </div>
              </div>

              {/* VITALS — wide 8-col strip: four figures + disk mirror */}
              <div className="lg:col-span-8 cc-panel p-4 flex flex-col gap-2.5">
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
                <DiskSyncStatusTile diskSync={state.diskSync} />
              </div>

              {/* ACTIVE REALITIES MATRIX — 8-col beside the radar */}
              <div className="lg:col-span-8 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="cc-panel-title">
                    <Globe className="w-4 h-4" />
                    Active Realities Matrix ({filteredRealities.length})
                  </span>
                  <span className="cc-label">
                    Showing {filteredRealities.length} of {realities.length} branches
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredRealities.map((r) => (
                    <BentoRealityCard
                      key={r.id}
                      reality={r}
                      active={r.id === activeRealityId}
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
                </div>
              </div>

              {/* QUICK PODS — 4-col, lands directly under the radar */}
              <div className="lg:col-span-4 cc-panel p-4">
                <span className="cc-panel-title block mb-2">Singularity Quick Pods</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={onZoomToCore}
                    className="p-2.5 rounded-xl bg-cyan-500/12 hover:bg-cyan-500/28 border border-cyan-400/35 text-cyan-100 text-[10px] font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Crosshair className="w-3.5 h-3.5" /> Frame Core
                  </button>
                  <button
                    onClick={onTriggerKamui}
                    className="p-2.5 rounded-xl bg-rose-500/12 hover:bg-rose-500/28 border border-rose-400/35 text-rose-200 text-[10px] font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Zap className="w-3.5 h-3.5" /> Kamui Warp
                  </button>
                  {onShowToolbar && (
                    <button
                      onClick={onShowToolbar}
                      className="p-2.5 rounded-xl bg-violet-500/12 hover:bg-violet-500/28 border border-violet-400/35 text-violet-200 text-[10px] font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Compass className="w-3.5 h-3.5" /> Toolbar
                    </button>
                  )}
                  <button
                    onClick={() => setShowCreate(true)}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/12 border border-white/12 text-slate-200 text-[10px] font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Reality
                  </button>
                </div>
              </div>

              {/* C++ NATIVE ENGINE — 8-col */}
              <div className="lg:col-span-8">
                <CppNativeEngineCard />
              </div>

              {/* CORE LIVE CHRONICLE — full-width bottom rail */}
              <div className="lg:col-span-12 cc-panel p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="cc-panel-title">
                    <Wind className="w-3.5 h-3.5" />
                    Singularity Live Chronicle
                  </span>
                  <span className="cc-label">{state.audit.length} events</span>
                </div>
                <div className="flex flex-col gap-1 max-h-24 overflow-y-auto custom-scroll">
                  {[...state.audit].reverse().slice(0, 8).map((a, i) => (
                    <div key={`${a.t}-${i}`} className="flex items-baseline gap-2 font-mono text-[9px]">
                      <span className="text-slate-500 tabular-nums shrink-0">
                        {new Date(a.t).toLocaleTimeString(undefined, { hour12: false })}
                      </span>
                      <span className="text-slate-300 truncate">{a.msg}</span>
                    </div>
                  ))}
                  {state.audit.length === 0 && (
                    <p className="text-[10px] text-slate-500">No multiverse events recorded yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'realities' && (
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredRealities.map((r) => (
                  <BentoRealityCard
                    key={r.id}
                    reality={r}
                    active={r.id === activeRealityId}
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
              </div>

              {filteredRealities.length === 0 && (
                <div className="p-12 text-center rounded-2xl bg-white/2 border border-white/5 font-mono text-xs text-slate-400">
                  No realities match "{searchQuery}"
                </div>
              )}
            </div>
          )}

          {tab === 'hierarchy' && (
            <DeepHierarchyExplorer
              realities={realities}
              onEnterGalaxy={onEnterGalaxy}
              onWarpReality={onWarpReality}
            />
          )}

          {tab === 'bin' && (
            <QuantumBinTab />
          )}
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
  );
};
