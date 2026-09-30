/**
 * THE MARK — generates the MY UNIVERSE app icons (PNG + ICO).
 * Pure Node — no image deps, same self-contained spirit as the old placeholder.
 *
 * The mark: Eventide at rest. A black event-horizon disc wearing its
 * accretion ring — teal core fire falling to solar orange at the rim —
 * wrapped in a violet lens halo, tilted slightly like a world seen
 * from orbit, on the deep-abyss square (#010208, the app's own void).
 *
 * Drawn analytically per pixel (supersampled 4×4 at the small sizes)
 * so it stays crisp from 16px taskbar to 128px desktop.
 */
import { deflateSync, crc32 } from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

function crc32Buf(buf) {
  return crc32(buf) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32Buf(body));
  return Buffer.concat([len, body, crc]);
}

/** Encode RGBA pixels as a PNG. */
function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))]);
}

/* ---------- palette (the app's own contract colors) ---------- */
const ABYSS = [1, 2, 8];        // #010208 — the void behind everything
const TEAL_ICE = [66, 224, 206]; // teal-ice — the instrument color
const SOLAR = [255, 196, 90];    // solar — the anchor star's warmth
const VIOLET = [139, 92, 246];   // violet — the Kamui, the lens

const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

/* One-sample of the mark. d = distance from center, size = canvas size,
   theta = angle. Returns [r, g, b, a]. */
function sample(d, theta, size) {
  const R = size * 0.46;             // overall mark radius
  const horizon = R * 0.34;          // the black pit
  const ringIn = R * 0.40;           // accretion ring inner edge
  const ringOut = R * 0.78;          // ring outer edge
  const haloOut = R * 1.0;           // violet lens halo edge

  // The mark is tilted toward the viewer: the near side (bottom) of the
  // ring is subtly thicker and brighter — an orbit seen at an angle.
  const tilt = Math.sin(theta) * 0.5 + 0.5; // 1 at bottom (theta=π/2), 0 at top
  const ringWobble = 1 + 0.06 * (tilt - 0.5);

  if (d > haloOut) return [0, 0, 0, 0];

  /* --- the accretion ring (the hero) --- */
  if (d >= ringIn * ringWobble && d <= ringOut) {
    // radial position through the ring, 0 inner → 1 outer
    const t = (d - ringIn) / (ringOut - ringIn);
    // fire: white-hot inner edge → teal-ice → gold → deep solar at the rim
    // (the ramp is COMPRESSED so little area sits in the milky mid-blend)
    const HOT = [168, 255, 240];
    let col = mix(HOT, TEAL_ICE, smooth(0, 0.32, t));
    col = mix(col, SOLAR, smooth(0.38, 1, t));
    // doppler-like heat: the near side burns hotter, the far side cools violet
    col = mix(col, HOT, 0.22 * tilt);
    col = mix(col, VIOLET, 0.30 * (1 - tilt));
    // soft edges on both faces of the ring
    const edge = smooth(0, 0.10, t) * (1 - smooth(0.82, 1, t));
    // faint orbital streaks (low frequency so supersampling doesn't moiré)
    if (size >= 64) {
      const streak = 0.5 + 0.5 * Math.sin(theta * 9 + d * 0.9 + tilt * 2.0);
      const g = lerp(0.95, 1.05, streak) * lerp(1, 0.93, t); // streaks fade outward
      col = [col[0] * g, col[1] * g, col[2] * g];
    }
    const cl = (v) => Math.min(255, Math.max(0, v)); // col is already 0–255
    return [cl(col[0]), cl(col[1]), cl(col[2]), 255 * Math.max(0.12, edge)];
  }

  /* --- the lens halo: violet glow inside and around the ring --- */
  if (d > horizon && d < ringIn * ringWobble) {
    // the gap between horizon and ring: hot violet-teal glow, brighter below
    const t = clamp01((d - horizon) / ((ringIn * ringWobble) - horizon));
    let col = mix(mix(VIOLET, TEAL_ICE, 0.45), VIOLET, t);
    col = mix(col, mix(col, TEAL_ICE, 0.3), tilt);
    const a = 90 + 130 * (1 - t) + 40 * tilt;
    return [col[0], col[1], col[2], a];
  }
  // outside the ring: the lens halo fading into the void
  const t = clamp01((d - ringOut) / (haloOut - ringOut));
  const halo = (1 - t) * (1 - t);
  let col = mix(VIOLET, ABYSS, t);
  // the halo leans teal where the ring is brightest (bottom)
  col = mix(col, mix(col, TEAL_ICE, 0.25), tilt * (1 - t));
  return [col[0], col[1], col[2], 200 * halo * (0.55 + 0.45 * tilt)];
}

/** The horizon pit with its photon-ring whisper at the rim. */
function samplePit(d, theta, size) {
  const R = size * 0.46;
  const horizon = R * 0.34;
  if (d > horizon) return null;
  const t = clamp01(d / horizon);
  // pure void in the middle; a whisper of the trapped light at the rim
  const rimGlow = smooth(0.82, 1.0, t);
  const col = mix(ABYSS.map((c) => c + 6), mix(VIOLET, TEAL_ICE, 0.5), rimGlow * 0.8);
  // the photon ring: a hair-thin bright arc hugging the horizon
  const photon = smooth(0.955, 0.985, t) * (1 - smooth(0.995, 1.0, t));
  const pc = mix(TEAL_ICE, SOLAR, 0.5 + 0.5 * Math.sin(theta));
  return [
    lerp(col[0], pc[0], photon),
    lerp(col[1], pc[1], photon),
    lerp(col[2], pc[2], photon),
    255,
  ];
}

/** Draw the full mark at the given size, supersampling to kill jaggies. */
function drawIcon(size) {
  const ss = size >= 96 ? 2 : 4; // supersample factor
  const S = size * ss;
  const rgba = Buffer.alloc(size * size * 4);
  const c = (S - 1) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const px = x * ss + sx, py = y * ss + sy;
          const dx = px - c, dy = py - c;
          const d = Math.sqrt(dx * dx + dy * dy);
          const theta = Math.atan2(dy, dx);
          // background: the abyss square with a faint center lift
          const bgT = clamp01(d / (S * 0.75));
          let col = mix([6, 10, 26], ABYSS, bgT);
          let al = 255;
          const pit = samplePit(d, theta, S);
          if (pit) { col = [pit[0], pit[1], pit[2]]; al = pit[3]; }
          else {
            const m = sample(d, theta, S);
            // the ring glows over the abyss: alpha-composite the mark
            const ma = m[3] / 255;
            col = [lerp(col[0], m[0], ma), lerp(col[1], m[1], ma), lerp(col[2], m[2], ma)];
            al = Math.max(al, m[3]);
          }
          r += col[0]; g += col[1]; b += col[2]; a += al;
        }
      }
      const n = ss * ss;
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(r / n);
      rgba[i + 1] = Math.round(g / n);
      rgba[i + 2] = Math.round(b / n);
      rgba[i + 3] = Math.round(a / n);
    }
  }
  return encodePng(size, size, rgba);
}

/* square corners: the abyss square keeps its corners (it IS the void),
   so no rounding — Windows tiles already frame it. */

const outDir = path.join(process.cwd(), 'src-tauri', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const png128 = drawIcon(128);
const png32 = drawIcon(32);
fs.writeFileSync(path.join(outDir, '128x128.png'), png128);
fs.writeFileSync(path.join(outDir, '32x32.png'), png32);

// A big render for human eyes + the preview panel.
fs.writeFileSync(path.join(outDir, '512x512.png'), drawIcon(512));

// The web face: the same mark as the browser-tab favicon (the app never had one).
fs.writeFileSync(path.join(process.cwd(), 'public', 'favicon.png'), drawIcon(64));

// ICO wrapping the 128px PNG (Vista+ supports PNG-compressed ICO entries).
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 4); // one image
const entry = Buffer.alloc(16);
entry[0] = 128; entry[1] = 0; // width
entry[2] = 128; entry[3] = 0; // height
entry[4] = 0;  // palette colors
entry[5] = 0;  // reserved
entry.writeUInt16LE(1, 6);   // planes
entry.writeUInt16LE(32, 8);  // bits per pixel
entry.writeUInt32LE(png128.length, 8);  // bytes in resource
entry.writeUInt32LE(22, 12); // data offset: 6-byte header + 16-byte entry
fs.writeFileSync(path.join(outDir, 'icon.ico'), Buffer.concat([header, entry, png128]));

console.log('the mark written to src-tauri/icons/ (128, 32, 512, ico) + public/favicon.png');
