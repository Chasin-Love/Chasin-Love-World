/**
 * THE ICON PIPELINE — two faces of MY UNIVERSE, one generator.
 *
 * DEFAULT — THE AUTHOR'S SIGIL: src-tauri/icons/logo-master.jpg (the blue
 * four-pointed star photo) becomes the icon. The photo is center-cropped to
 * fill the canvas, unsharp-masked (sharpened), contrast-lifted, then halved
 * down the size chain with a light re-sharpen at the small sizes so the
 * pixels stay crisp in the taskbar.
 *
 * `--eventide` — THE MARK: the analytic Eventide-at-rest render from R80
 * (black horizon pit, teal→gold accretion ring, violet lens halo), kept as
 * the fallback and for posterity (it lives on the author's desktop too).
 *
 * Both faces land in the same places: src-tauri/icons/{512,128,32}.png,
 * icon.ico (proper 32bpp DIB — RC.EXE rejects PNG-inside-ICO with RC2175;
 * that lesson is pinned in encodeIcoDib), and the web's favicon.png.
 *
 * Pure Node + the project's own Playwright Chromium for the photo work.
 */
import { deflateSync, crc32, inflateSync } from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

/* ---------- PNG encoding (unchanged since the placeholder days) ---------- */

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

/** Reinflate one of our own filter-0 PNGs back into a raw RGBA buffer. */
function decodePngRGBA(png, size) {
  let off = 8;
  const idat = [];
  while (off < png.length) {
    const len = png.readUInt32BE(off);
    const type = png.toString('ascii', off + 4, off + 8);
    if (type === 'IDAT') idat.push(png.subarray(off + 8, off + 8 + len));
    if (type === 'IEND') break;
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1) + 1; // skip our filter byte (always 0)
    raw.copy(out, y * size * 4, rowStart, rowStart + size * 4);
  }
  return out;
}

/* ---------- the Windows ICO, written the way RC.EXE demands ---------- */

/* History lesson pinned in code: RC2175 broke the first v15.0.5 build
   because the old generator wrapped a PNG inside the ICO (and mislabeled it
   a cursor by leaving the type field zero). Windows' resource compiler
   requires classic 32bpp BITMAPINFOHEADER DIB entries — never PNG. The repo
   hit this once before by hand (commit a7a299c5); now the generator itself
   is immune. */
function encodeIcoDib(rgba, w) {
  const h = w;
  const xorStride = w * 4;
  const xorSize = xorStride * h;
  const andStride = Math.ceil(w / 32) * 4;
  const andSize = andStride * h;
  const bih = Buffer.alloc(40);
  bih.writeUInt32LE(40, 0);        // biSize: BITMAPINFOHEADER
  bih.writeInt32LE(w, 4);          // biWidth
  bih.writeInt32LE(h * 2, 8);      // biHeight: XOR + AND masks combined
  bih.writeUInt16LE(1, 12);        // biPlanes
  bih.writeUInt16LE(32, 14);       // biBitCount
  bih.writeUInt32LE(0, 16);        // biCompression = BI_RGB
  bih.writeUInt32LE(xorSize, 20);  // biSizeImage
  // pixels are stored bottom-up; 32bpp ICO alpha is straight (unassociated)
  const xor = Buffer.alloc(xorSize);
  const and = Buffer.alloc(andSize);
  for (let y = 0; y < h; y++) {
    const srcRow = y * w * 4;
    const dstRow = (h - 1 - y) * xorStride;
    for (let x = 0; x < w; x++) {
      const s = srcRow + x * 4;
      const d = dstRow + x * 4;
      xor[d] = rgba[s + 2];     // B
      xor[d + 1] = rgba[s + 1]; // G
      xor[d + 2] = rgba[s];     // R
      xor[d + 3] = rgba[s + 3]; // A
      if (rgba[s + 3] === 0) {
        and[(h - 1 - y) * andStride + (x >> 3)] |= 1 << (7 - (x & 7));
      }
    }
  }
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon (NOT cursor — this field was the RC2175 trigger)
  header.writeUInt16LE(1, 4); // one image
  const entry = Buffer.alloc(16);
  entry[0] = w % 256; entry[1] = 0; // width (0 means 256)
  entry[2] = h % 256; entry[3] = 0; // height
  entry[4] = 0;  // palette colors
  entry[5] = 0;  // reserved
  entry.writeUInt16LE(1, 4);   // planes — entry offset 4 (was wrongly 6: shifted every field)
  entry.writeUInt16LE(32, 6);  // bits per pixel — entry offset 6
  entry.writeUInt32LE(40 + xorSize + andSize, 8); // bytes in resource (biSize + masks)
  entry.writeUInt32LE(22, 12); // data offset: 6-byte header + 16-byte entry
  return Buffer.concat([header, entry, bih, xor, and]);
}

/* ---------- face one: THE AUTHOR'S SIGIL (photo → icon) ---------- */

/* Per-size recipe: small sizes crop TIGHTER on the star (the outer swirls
   become noise at 32px — the core star IS the logo there), lift midtones
   (gamma) and stretch the star core toward white so it burns through the
   dark photo on a dark taskbar. */
const PHOTO_CROP = { cx: 0.50, cy: 0.48 };
const SIZES = {
  512: { zoom: 1.22, unsharp: 0.60, contrast: 0.20, gamma: 1.06, white: 246 },
  128: { zoom: 1.58, unsharp: 0.22, contrast: 0.22, gamma: 1.12, white: 240 },
  64:  { zoom: 1.95, unsharp: 0.12, contrast: 0.26, gamma: 1.18, white: 234 },
  32:  { zoom: 2.30, unsharp: 0.06, contrast: 0.28, gamma: 1.25, white: 228 },
};

async function renderPhoto(masterPath) {
  const { chromium } = await import('playwright');
  const jpgB64 = fs.readFileSync(masterPath).toString('base64');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    return await page.evaluate(async ({ jpgB64, sizes }) => {
      const img = new Image();
      img.src = 'data:image/jpeg;base64,' + jpgB64;
      await img.decode();

      /* unsharp mask: out = in*(1+a) - blur*a, blur = 3×3 box */
      function unsharp(d, w, h, a) {
        if (a <= 0) return;
        const src = new Uint8ClampedArray(d);
        const row = w * 4;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            for (let c = 0; c < 3; c++) {
              const l = src[i - row + c] ?? src[i + c];
              const r = src[i + row + c] ?? src[i + c];
              const u = src[i - 4 + c] ?? src[i + c];
              const dn = src[i + 4 + c] ?? src[i + c];
              const blur = (l + r + u + dn + src[i + c] * 4) / 8;
              d[i + c] = src[i + c] * (1 + a) - blur * a;
            }
          }
        }
      }

      /* gentle S-curve for pop: v' = mix(v, smoothstep(v), k) */
      function contrast(d, k) {
        for (let i = 0; i < d.length; i += 4) {
          for (let c = 0; c < 3; c++) {
            const v = d[i + c] / 255;
            const s = v * v * (3 - 2 * v);
            d[i + c] = 255 * (v + (s - v) * k);
          }
        }
      }

      /* levels: gamma lifts the blue nebula out of the dark, the white
         point pulls the star's core up to burning white */
      function levels(d, gamma, white) {
        const g = 1 / gamma;
        for (let i = 0; i < d.length; i += 4) {
          for (let c = 0; c < 3; c++) {
            const v = Math.min(1, d[i + c] / white);
            d[i + c] = 255 * Math.pow(v, g);
          }
        }
      }

      /* draw the cropped source at `size` (direct high-quality resample —
         no halving chain, so no accumulated softness or ringing) */
      function renderSize(size, cfg) {
        const cv = document.createElement('canvas');
        cv.width = size; cv.height = size;
        const ctx = cv.getContext('2d', { willReadFrequently: true });
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        const s = Math.min(img.width, img.height) / cfg.zoom;
        const sx = img.width * 0.50 - s / 2;
        const sy = img.height * 0.48 - s / 2;
        ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
        const d = ctx.getImageData(0, 0, size, size);
        unsharp(d.data, size, size, cfg.unsharp);
        contrast(d.data, cfg.contrast);
        levels(d.data, cfg.gamma, cfg.white);
        ctx.putImageData(d, 0, 0);
        return { ctx, data: d };
      }

      const r512 = renderSize(512, sizes[512]);
      const r128 = renderSize(128, sizes[128]);
      const r64 = renderSize(64, sizes[64]);
      const r32 = renderSize(32, sizes[32]);

      const toB64 = (ctx) => ctx.canvas.toDataURL('image/png').slice('data:image/png;base64,'.length);
      return {
        png512: toB64(r512.ctx),
        png128: toB64(r128.ctx),
        png64: toB64(r64.ctx),
        png32: toB64(r32.ctx),
        rgba128: Array.from(r128.data.data),
      };
    }, { jpgB64, sizes: SIZES });
  } finally {
    await browser.close();
  }
}

/* ---------- face two: THE MARK (analytic Eventide, kept from R80) ---------- */

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
  return { rgba, png: encodePng(size, size, rgba) };
}

/* ---------- orchestration ---------- */

const outDir = path.join(process.cwd(), 'src-tauri', 'icons');
fs.mkdirSync(outDir, { recursive: true });
const masterJpg = path.join(outDir, 'logo-master.jpg');
const eventide = process.argv.includes('--eventide');

let png512, png128, png32, png64, rgba128, faceName;

if (!eventide && fs.existsSync(masterJpg)) {
  faceName = "THE AUTHOR'S SIGIL (the blue star photo — sharpened, pixel-crisp)";
  const r = await renderPhoto(masterJpg);
  png512 = Buffer.from(r.png512, 'base64');
  png128 = Buffer.from(r.png128, 'base64');
  png64 = Buffer.from(r.png64, 'base64');
  png32 = Buffer.from(r.png32, 'base64');
  rgba128 = Uint8Array.from(r.rgba128);
} else {
  faceName = 'THE MARK (analytic Eventide at rest)';
  const big = drawIcon(512);
  const mid = drawIcon(128);
  const tiny = drawIcon(32);
  const fav = drawIcon(64);
  png512 = big.png; png128 = mid.png; png32 = tiny.png; png64 = fav.png;
  rgba128 = mid.rgba;
}

fs.writeFileSync(path.join(outDir, '512x512.png'), png512);
fs.writeFileSync(path.join(outDir, '128x128.png'), png128);
fs.writeFileSync(path.join(outDir, '32x32.png'), png32);
fs.writeFileSync(path.join(outDir, 'icon.ico'), encodeIcoDib(rgba128, 128));
// The web face: the same sigil as the browser-tab favicon.
fs.writeFileSync(path.join(process.cwd(), 'public', 'favicon.png'), png64);

console.log(`icons written (${faceName}):`);
console.log('  src-tauri/icons/{512x128,128x128,32x32}.png + icon.ico (32bpp DIB) + public/favicon.png');
