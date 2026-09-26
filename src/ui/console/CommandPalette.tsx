import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Globe, Sun, Orbit, Search, Layers, Database, Cpu, Zap, Crosshair,
  Compass, Radio, Sparkles, CircleDot, BookOpen, Star,
} from 'lucide-react';
import { REALITIES } from '../../realities';
import { HIERARCHY_STAGES } from '../../realities/hierarchyStages';
import { useUniverse } from '../../state';

/**
 * THE COMMAND PALETTE (Ctrl+K) — retrieval for a universe.
 * One glass surface to search & jump across every scale: warp to any
 * reality, dive into any world's diary, enter any galaxy, open the
 * active reality's vault, fly to any rung of the 11-stage ladder, and
 * fire the console's quick powers — all without touching the mouse.
 */

export interface PaletteApi {
  onWarpReality: (realityId: string) => void;
  onEnterGalaxy: (realityId: string, galaxyId: string) => void;
  onFocusBody: (bodyId: string) => void;
  onDiveBody: (bodyId: string) => void;
  onOpenVault: () => void;
  onOpenConsole: () => void;
  onZoomStage: (stageIndex: number) => void;
  onFrameCore: () => void;
  onKamui: () => void;
  onOpenMemory: (entryId: string, planetId: string) => void;
  onConstellate: (bodyIds: string[]) => void;
}

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  keywords: string;
  icon: React.ReactNode;
  section: string;
  accent: string;
  run: () => void;
}

export const CommandPalette: React.FC<{ onClose: () => void; api: PaletteApi }> = ({ onClose, api }) => {
  const state = useUniverse();
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const activeId = state.activeRealityId || 'sol-prime';
  const active = REALITIES.find((r) => r.id === activeId) ?? REALITIES[0];

  const commands = useMemo<Cmd[]>(() => {
    const out: Cmd[] = [];
    const q = query.trim().toLowerCase();

    /* realities — the dimensional barrier honored by the App's warp handler */
    for (const r of REALITIES) {
      out.push({
        id: `reality:${r.id}`,
        label: r.id === activeId ? `${r.name} (anchored)` : `Warp: ${r.name}`,
        hint: r.spectral,
        keywords: `${r.name} ${r.codeName} reality warp continuum`,
        icon: <Globe className="w-3.5 h-3.5" />,
        section: 'Realities',
        accent: r.colorA,
        run: () => { if (r.id !== activeId) api.onWarpReality(r.id); },
      });
    }

    /* worlds of the ACTIVE reality — diary dives */
    for (const b of state.bodies) {
      if (b.kind === 'vault') {
        out.push({
          id: `vault:${b.id}`,
          label: `Open the Vault — ${b.name}`,
          hint: 'encrypted eventide black hole of this reality',
          keywords: `vault black hole eventide encrypted files secrets ${b.name}`,
          icon: <Database className="w-3.5 h-3.5" />,
          section: 'This System',
          accent: '#34d399',
          run: () => api.onDiveBody(b.id),
        });
        continue;
      }
      const dive = b.kind !== 'star';
      out.push({
        id: `body:${b.id}`,
        label: dive ? `Dive: ${b.name}` : `Focus: ${b.name}`,
        hint: dive ? 'open its living diary' : 'the anchor star',
        keywords: `${b.name} ${b.kind} planet world star diary ${b.note ?? ''}`,
        icon: b.kind === 'star' ? <Sun className="w-3.5 h-3.5" /> : <CircleDot className="w-3.5 h-3.5" />,
        section: 'This System',
        accent: b.palette?.atmo || '#67e8f9',
        run: () => (dive ? api.onDiveBody(b.id) : api.onFocusBody(b.id)),
      });
    }

    /* galaxies of the active reality */
    for (const g of active?.galaxies ?? []) {
      out.push({
        id: `galaxy:${g.id}`,
        label: `Enter galaxy: ${g.name}`,
        hint: g.isHomeGalaxy ? 'home galaxy' : g.type,
        keywords: `galaxy ${g.name} dive enter spiral`,
        icon: <Orbit className="w-3.5 h-3.5" />,
        section: 'Galaxies',
        accent: g.color || '#a78bfa',
        run: () => api.onEnterGalaxy(activeId, g.id),
      });
    }

    /* the 11-stage ladder */
    HIERARCHY_STAGES.forEach((s: { label: string; short: string; desc: string }, i: number) => {
      out.push({
        id: `stage:${i}`,
        label: `Fly to: ${s.label}`,
        hint: s.desc,
        keywords: `stage ${s.label} ${s.short} fly zoom ladder hierarchy`,
        icon: <Layers className="w-3.5 h-3.5" />,
        section: 'Cosmic Ladder',
        accent: '#a78bfa',
        run: () => api.onZoomStage(i),
      });
    });

    /* THE MEMORIES — full-text retrieval across the active reality's pages */
    if (q.length >= 2) {
      const bodyName = new Map(state.bodies.map((b) => [b.id, b.name] as const));
      const hits = state.entries
        .filter((e) => !e.archived)
        .map((e) => {
          const hay = `${e.title} ${e.body.replace(/<[^>]*>/g, ' ')} ${e.tags.join(' ')}`.toLowerCase();
          const score = (e.title.toLowerCase().includes(q) ? 2 : 0) + (hay.includes(q) ? 1 : 0);
          return { e, score };
        })
        .filter((h) => h.score > 0)
        .sort((a, b) => (b.score - a.score) || (b.e.createdAt - a.e.createdAt))
        .slice(0, 6);
      for (const { e } of hits) {
        out.push({
          id: `memory:${e.id}`,
          label: e.title || 'untitled page',
          hint: `${e.mood ?? 'calm'} · ${bodyName.get(e.planetId) ?? 'a world'} · ${new Date(e.createdAt).toLocaleDateString()}`,
          keywords: `memory diary page entry ${e.title} ${e.tags.join(' ')} ${e.body.slice(0, 80)}`,
          icon: <BookOpen className="w-3.5 h-3.5" />,
          section: 'Memories',
          accent: '#f2a0b0',
          run: () => api.onOpenMemory(e.id, e.planetId),
        });
      }
    }

    /* THE CONSTELLATION SEARCH — pages answer as one constellation */
    {
      const tagged = state.entries.filter((e) => !e.archived && e.tags.includes(q));
      const planetIds = [...new Set(tagged.map((e) => e.planetId))].slice(0, 12);
      if (planetIds.length > 1) {
        out.push({
          id: 'constellation:tag',
          label: `Constellation: “${q}” — ${planetIds.length} worlds`,
          hint: tagged.length + ' pages share this star-sign',
          keywords: `constellation tag #${q} connect sky linked memories ${q}`,
          icon: <Sparkles className="w-3.5 h-3.5" />,
          section: 'Constellation',
          accent: '#f2c178',
          run: () => api.onConstellate(planetIds),
        });
      }
    }

    /* powers */
    out.push(
      {
        id: 'console',
        label: 'Open Core Console',
        hint: 'the multiverse command deck',
        keywords: 'console command deck core admin manage create realities',
        icon: <Cpu className="w-3.5 h-3.5" />,
        section: 'Powers',
        accent: '#22d3ee',
        run: api.onOpenConsole,
      },
      {
        id: 'frame-core',
        label: 'Frame the Astral Core',
        hint: 'center the origin (0,0,0)',
        keywords: 'frame core center origin astral',
        icon: <Crosshair className="w-3.5 h-3.5" />,
        section: 'Powers',
        accent: '#22d3ee',
        run: api.onFrameCore,
      },
      {
        id: 'kamui',
        label: 'Kamui Warp',
        hint: 'bend reality in place',
        keywords: 'kamui warp jutsu swirl teleport',
        icon: <Zap className="w-3.5 h-3.5" />,
        section: 'Powers',
        accent: '#fb7185',
        run: api.onKamui,
      },
      {
        id: 'survey',
        label: 'Toggle Scientific Survey HUD',
        hint: 'the G overlay',
        keywords: 'survey hud science telemetry toggle',
        icon: <Radio className="w-3.5 h-3.5" />,
        section: 'Powers',
        accent: '#38bdf8',
        run: () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' })); },
      },
    );
    return out;
  }, [state.bodies, state.entries, activeId, api, query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q) || c.keywords.includes(q));
  }, [commands, query]);

  useEffect(() => { setSel(0); }, [query]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  /* keep the selection visible while arrowing */
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${sel}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  const grouped = useMemo(() => {
    const map = new Map<string, { cmd: Cmd; idx: number }[]>();
    filtered.forEach((cmd, idx) => {
      const arr = map.get(cmd.section) ?? [];
      arr.push({ cmd, idx });
      map.set(cmd.section, arr);
    });
    return [...map.entries()];
  }, [filtered]);

  const runAt = (idx: number) => {
    const cmd = filtered[idx];
    if (!cmd) return;
    onClose();
    /* let the palette unmount before the universe moves */
    window.setTimeout(cmd.run, 0);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(filtered.length - 1, s + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); runAt(sel); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  return (
    <div
      className="fixed inset-0 z-140 overlay-in flex items-start justify-center pt-[12vh] px-4 select-none"
      style={{ background: 'rgba(3,5,10,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: -14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="core-plate w-full max-w-xl rounded-3xl overflow-hidden flex flex-col"
        data-accent="dashboard"
        style={{ maxHeight: '62vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* search row */}
        <div className="shrink-0 flex items-center gap-2.5 px-4 py-3 border-b border-white/10">
          <Search className="w-4 h-4 text-cyan-300 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search realities, worlds, galaxies, stages, powers…"
            className="flex-1 bg-transparent outline-none text-sm text-white placeholder-slate-400 font-mono"
          />
          <kbd className="cc-badge cc-badge-dim">ESC</kbd>
        </div>

        {/* results */}
        <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto custom-scroll py-2">
          {grouped.length === 0 && (
            <p className="px-5 py-8 text-center font-mono text-xs text-slate-500">
              nothing in the universe matches “{query}”
            </p>
          )}
          {grouped.map(([section, items]) => (
            <div key={section} className="mb-1">
              <p className="px-4 pt-2 pb-1 cc-label">{section}</p>
              {items.map(({ cmd, idx }) => (
                <button
                  key={cmd.id}
                  data-idx={idx}
                  onMouseMove={() => setSel(idx)}
                  onClick={() => runAt(idx)}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors cursor-pointer ${
                    idx === sel ? 'bg-cyan-500/15 border-l-2 border-cyan-300' : 'border-l-2 border-transparent hover:bg-white/4'
                  }`}
                >
                  <span className="shrink-0" style={{ color: cmd.accent }}>{cmd.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-slate-100 truncate">{cmd.label}</span>
                    {cmd.hint && <span className="block font-mono text-[9.5px] text-slate-500 truncate">{cmd.hint}</span>}
                  </span>
                  {idx === sel && <span className="cc-label text-cyan-300 shrink-0">↵</span>}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* footer */}
        <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t border-white/10 bg-black/25">
          <span className="cc-label flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-cyan-300" />
            {filtered.length} destinations
          </span>
          <span className="cc-label flex items-center gap-2">
            <Compass className="w-3 h-3" /> ↑↓ navigate · ↵ travel
          </span>
        </div>
      </motion.div>
    </div>
  );
};
