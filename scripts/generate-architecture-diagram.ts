/* R52b — THE ARCHITECTURE DIAGRAM GENERATOR.
   Run: npx tsx scripts/generate-architecture-diagram.ts
   Reads scripts/architecture-snapshot.json (the auditor's output — never
   hand-written data) and renders:
     1. docs/architecture-diagram.html — self-contained interactive diagram
        (layer columns, dependency arcs, pan/zoom, search; zero dependencies).
     2. docs/architecture-diagram.mmd  — a Mermaid flowchart for GitHub. */
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const snap = JSON.parse(readFileSync(path.join(ROOT, 'scripts/architecture-snapshot.json'), 'utf8'));

/* ---------- classify ---------- */
const LAYERS: Array<{ id: string; label: string; color: string; match: (f: string) => boolean }> = [
  { id: 'entry',    label: 'entry',     color: '#f2c178', match: (f) => /^src\/(main\.tsx|App\.tsx)$/.test(f) },
  { id: 'ui',       label: 'ui',        color: '#7fc4e8', match: (f) => /^src\/ui\//.test(f) },
  { id: 'state',    label: 'state',     color: '#b49ae8', match: (f) => /^src\/state\//.test(f) },
  { id: 'engine',   label: 'engine',    color: '#67e8f9', match: (f) => /^src\/engine\//.test(f) },
  { id: 'physics',  label: 'physics',   color: '#9fd8a8', match: (f) => /^src\/physics\//.test(f) },
  { id: 'realities',label: 'realities', color: '#e0c3a0', match: (f) => /^src\/realities\//.test(f) },
  { id: 'vault',    label: 'vault',     color: '#f2a0b0', match: (f) => /^src\/vault\//.test(f) },
  { id: 'domain',   label: 'domain',    color: '#d8b48a', match: (f) => /^src\/domain\//.test(f) },
  { id: 'platform', label: 'platform',  color: '#8b93a8', match: (f) => /^src\/platform\//.test(f) },
  { id: 'server',   label: 'server',    color: '#34d399', match: (f) => /^server\//.test(f) },
];
const layerOf = (f: string) => LAYERS.find((l) => l.match(f))?.id ?? null;

const nodes = Object.entries(snap.loc as Record<string, number>)
  .filter(([f]) => layerOf(f) !== null)
  .map(([f, loc]) => ({ f, loc, layer: layerOf(f)!, in: (snap.importers as Record<string, number>)[f] ?? 0 }));
const nodeSet = new Set(nodes.map((n) => n.f));
const edges = (snap.edges as string[])
  .map((e) => { const [a, b] = e.split(' → '); return { a, b }; })
  .filter((e) => nodeSet.has(e.a) && nodeSet.has(e.b));

/* ---------- column layout ---------- */
const order = LAYERS.map((l) => l.id);
const COL_W = 300, NODE_H = 26, NODE_GAP = 8, PAD = 60;
const byLayer = new Map<string, typeof nodes>();
for (const n of nodes) { if (!byLayer.has(n.layer)) byLayer.set(n.layer, []); byLayer.get(n.layer)!.push(n); }
const colX = new Map<string, number>();
order.forEach((id, i) => colX.set(id, PAD + i * COL_W));
const pos = new Map<string, { x: number; y: number; w: number; layer: string }>();
let maxRows = 0;
for (const id of order) {
  const list = (byLayer.get(id) ?? []).sort((a, b) => b.loc - a.loc);
  list.forEach((n, i) => {
    const w = Math.max(120, Math.min(COL_W - 30, 70 + n.f.split('/').pop()!.length * 6.4));
    pos.set(n.f, { x: colX.get(id)!, y: PAD + i * (NODE_H + NODE_GAP), w, layer: id });
  });
  maxRows = Math.max(maxRows, list.length);
}
const W = PAD * 2 + (order.length - 1) * COL_W + COL_W - 30;
const H = PAD * 2 + maxRows * (NODE_H + NODE_GAP);

const nodesJson = JSON.stringify(nodes.map((n) => ({ ...n, ...pos.get(n.f), name: n.f.split('/').pop() })));
const edgesJson = JSON.stringify(edges);
const layersJson = JSON.stringify(LAYERS);

/* ---------- interactive HTML (self-contained) ---------- */
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>MY UNIVERSE — architecture diagram (generated R52b)</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; margin: 0; }
  body { background: #060a13; color: #cfe3f5; font: 12px/1.45 'Cascadia Code', Consolas, monospace; overflow: hidden; height: 100vh; display: flex; flex-direction: column; }
  header { padding: 12px 18px; border-bottom: 1px solid #14202f; display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
  header h1 { font-size: 13px; letter-spacing: .18em; color: #67e8f9; font-weight: 600; }
  header .hint { color: #55708c; font-size: 10.5px; }
  #search { background: #0b1520; border: 1px solid #1d3040; color: #cfe3f5; border-radius: 8px; padding: 6px 10px; width: 240px; outline: none; }
  #search:focus { border-color: #2b5a70; }
  #wrap { flex: 1; overflow: hidden; cursor: grab; }
  #wrap.dragging { cursor: grabbing; }
  svg { width: 100%; height: 100%; display: block; }
  .node rect { rx: 7; }
  .node text { fill: #dcebf8; font-size: 10.5px; pointer-events: none; }
  .node .meta { fill: #5d7nest; }
  .edge { fill: none; stroke: #1c3145; stroke-width: 1; transition: stroke .12s, opacity .12s; }
  .edge.hot { stroke: #38bdf8; stroke-width: 1.8; }
  .dim { opacity: .13; }
  .legend { position: fixed; right: 14px; top: 52px; background: rgba(8,14,22,.92); border: 1px solid #16283a; border-radius: 12px; padding: 10px 12px; }
  .legend div { display: flex; gap: 7px; align-items: center; margin: 3px 0; }
  .legend i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
  .legend span { color: #9db8cf; font-size: 10.5px; }
  #tip { position: fixed; display: none; background: rgba(8,14,22,.96); border: 1px solid #23425c; border-radius: 10px; padding: 8px 10px; pointer-events: none; z-index: 5; max-width: 340px; }
  #tip b { color: #7dd3fc; }
  #tip .m { color: #64809a; font-size: 10.5px; }
</style>
</head>
<body>
<header>
  <h1>MY UNIVERSE — THE SKELETON</h1>
  <input id="search" placeholder="filter files…">
  <span class="hint">hover = isolate dependencies · drag = pan · wheel = zoom · ${nodes.length} files · ${edges.length} imports</span>
</header>
<div id="wrap"><svg id="svg" viewBox="0 0 ${W} ${H}"><g id="world"></g></svg></div>
<div class="legend" id="legend"></div>
<div id="tip"></div>
<script>
const NODES = ${nodesJson};
const EDGES = ${edgesJson};
const LAYERS = ${layersJson};
const svg = document.getElementById('svg'), world = document.getElementById('world');
const NS = 'http://www.w3.org/2000/svg';
const el = (t, attrs) => { const e = document.createElementNS(NS, t); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

/* legend */
const legend = document.getElementById('legend');
for (const l of LAYERS) {
  const d = document.createElement('div');
  d.innerHTML = '<i style="background:' + l.color + '"></i><span>' + l.label + '</span>';
  legend.appendChild(d);
}

/* edges first (under nodes) */
const edgeEls = EDGES.map(e => {
  const a = NODES.find(n => n.f === e.a), b = NODES.find(n => n.f === e.b);
  if (!a || !b) return null;
  const x1 = a.x + a.w, y1 = a.y + 13, x2 = b.x, y2 = b.y + 13;
  const dx = Math.max(40, (x2 - x1) * 0.45);
  const p = el('path', { class: 'edge', d: 'M' + x1 + ',' + y1 + ' C' + (x1 + dx) + ',' + y1 + ' ' + (x2 - dx) + ',' + y2 + ' ' + x2 + ',' + y2 });
  p.dataset.a = e.a; p.dataset.b = e.b;
  world.appendChild(p);
  return p;
}).filter(Boolean);

/* nodes */
const nodeEls = NODES.map(n => {
  const g = el('g', { class: 'node', 'data-f': n.f });
  const col = LAYERS.find(l => l.id === n.layer).color;
  g.appendChild(el('rect', { x: n.x, y: n.y, width: n.w, height: 24, fill: '#0b1520', stroke: col, 'stroke-width': n.in > 4 ? 1.6 : 1, opacity: .96 }));
  const label = el('text', { x: n.x + 9, y: n.y + 16 });
  label.textContent = (n.in > 3 ? '▼' + n.in + '  ' : '') + n.name;
  const size = el('text', { x: n.x + n.w - 8, y: n.y + 16, 'text-anchor': 'end', fill: '#4d6880' });
  size.textContent = n.loc >= 1000 ? (n.loc / 1000).toFixed(1) + 'k' : n.loc;
  g.appendChild(label); g.appendChild(size);
  g.style.cursor = 'pointer';
  g.addEventListener('mouseenter', () => {
    const hot = new Set([n.f]);
    for (const p of edgeEls) {
      const hit = p.dataset.a === n.f || p.dataset.b === n.f;
      p.classList.toggle('hot', hit);
      if (hit) { hot.add(p.dataset.a); hot.add(p.dataset.b); }
    }
    for (const other of nodeEls) other.classList.toggle('dim', !hot.has(other.dataset.f));
    for (const p of edgeEls) if (!p.classList.contains('hot')) p.classList.add('dim');
    const tip = document.getElementById('tip');
    tip.style.display = 'block';
    tip.innerHTML = '<b>' + n.f + '</b><br><span class="m">' + n.loc + ' lines · imported by ' + n.in + ' file(s) · layer ' + n.layer + '</span>';
  });
  g.addEventListener('mousemove', (ev) => { const t = document.getElementById('tip'); t.style.left = (ev.clientX + 14) + 'px'; t.style.top = (ev.clientY + 14) + 'px'; });
  g.addEventListener('mouseleave', () => {
    for (const p of edgeEls) { p.classList.remove('hot', 'dim'); }
    for (const other of nodeEls) other.classList.remove('dim');
    document.getElementById('tip').style.display = 'none';
  });
  world.appendChild(g);
  return g;
});

/* search */
document.getElementById('search').addEventListener('input', (ev) => {
  const q = ev.target.value.toLowerCase();
  for (const n of NODES) {
    const hit = !q || n.f.toLowerCase().includes(q);
    nodeEls.find(e => e.dataset.f === n.f).classList.toggle('dim', !hit);
  }
});

/* pan + zoom */
let vx = 0, vy = 0, vs = 1, dragging = false, lx = 0, ly = 0;
const wrap = document.getElementById('wrap');
const apply = () => svg.setAttribute('viewBox', vx + ' ' + vy + ' ' + (W / vs) + ' ' + (H / vs));
apply();
wrap.addEventListener('wheel', (e) => { e.preventDefault(); vs *= (e.deltaY < 0 ? 1.12 : 0.89); vs = Math.max(0.25, Math.min(6, vs)); apply(); }, { passive: false });
wrap.addEventListener('mousedown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; wrap.classList.add('dragging'); });
window.addEventListener('mousemove', (e) => { if (!dragging) return; vx -= (e.clientX - lx) * (W / vs) / wrap.clientWidth; vy -= (e.clientY - ly) * (H / vs) / wrap.clientHeight; lx = e.clientX; ly = e.clientY; apply(); });
window.addEventListener('mouseup', () => { dragging = false; wrap.classList.remove('dragging'); });
</script>
</body>
</html>
`;
writeFileSync(path.join(ROOT, 'docs/architecture-diagram.html'), html);

/* ---------- Mermaid for GitHub ---------- */
const top = [...nodes].sort((a, b) => b.loc - a.loc).slice(0, 34);
const mermaid = [
  '```mermaid',
  'flowchart LR',
  '  subgraph layers[Layers — dependency direction: left ➜ right]',
  ...LAYERS.map((l) => `    ${l.id}[${l.label}]`),
  '  end',
  ...top.map((n) => `    ${n.f.replace(/[^\w]/g, '_')}["${n.f.replace(/^src\//, '')}<br>${n.loc} lines"]`),
  ...edges
    .filter((e) => top.some((n) => n.f === e.a) && top.some((n) => n.f === e.b))
    .slice(0, 60)
    .map((e) => `    ${e.a.replace(/[^\w]/g, '_')} --> ${e.b.replace(/[^\w]/g, '_')}`),
  '```',
].join('\n');
writeFileSync(path.join(ROOT, 'docs/architecture-diagram.mmd'), mermaid + '\n');
console.log(`diagram written: ${nodes.length} files, ${edges.length} edges → docs/architecture-diagram.html + .mmd`);
