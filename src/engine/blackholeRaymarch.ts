import * as THREE from 'three';

/**
 * ROUND 64 — THE OLD RENDERER IS DELETED (this is that commit).
 *
 * The accumulated geodesic marcher (R54–R63: the adaptive step, the 1.35
 * intensity bloom crutch, the film knee, the whole compromise stack) is gone
 * — git history holds it. This stub keeps the wiring contract alive so the
 * universe runs hole-less until the verbatim source port lands in the next
 * commit (docs/PORT-SPEC-webgpu-black-hole.md is the contract):
 *
 *   - createBlackHole returns the hidden-visual shape the engine attaches —
 *     the "hole hides itself" path (R55): nothing renders, no stand-in;
 *   - updateRaymarchUniforms is a no-op the per-frame driver can call;
 *   - criticalImpactParam reports 0 (no captured set without a marcher);
 *   - blackbodyColorOf stays: the Mitchell-Charity table is data, the
 *     round17 gauntlet pins it independent of any renderer.
 */

export interface BlackHoleVisual {
  group: THREE.Group;
  /** true while a renderer draws the hole (false = hidden) */
  geodesic: boolean;
  update(time: number, camQuat?: THREE.Quaternion, portal?: number): void;
  /** show/hide the renderer (fallback paths) */
  setGeodesic(on: boolean): void;
  dispose(): void;
}

export interface BlackHoleOptions {
  /** start with the renderer live (false = the hole renders nothing) */
  geodesic?: boolean;
  /** global emission multiplier */
  intensity?: number;
  /** ray steps (quality) */
  steps?: number;
}

export function createBlackHole(_R: number, _opts: BlackHoleOptions = {}): BlackHoleVisual {
  const group = new THREE.Group();
  group.visible = false;
  return {
    group,
    geodesic: false,
    update() { /* the renderer is deleted — restored by the R64 port commit */ },
    setGeodesic() { /* deleted with the renderer */ },
    dispose() { /* deleted with the renderer */ },
  };
}

export function updateRaymarchUniforms(_visual: BlackHoleVisual, _camera: THREE.Camera, _time: number): void {
  /* deleted with the renderer */
}

export function criticalImpactParam(_shaderRs: number, _lensing: number): number {
  return 0; /* no march — no captured set */
}

/* ---- Mitchell Charity blackbody anchors (CIE 1931 → sRGB) ----
   Transcribed from dgreenheck/webgpu-black-hole (MIT), who transcribed it
   from http://www.vendian.org/mncharity/dir3/blackbody/ */
const BLACKBODY_ANCHORS: Array<[number, number, number, number]> = [
  [1000, 1, 0.0337, 0], [1100, 1, 0.0592, 0], [1200, 1, 0.0846, 0], [1300, 1, 0.1096, 0], [1400, 1, 0.1341, 0],
  [1500, 1, 0.1578, 0], [1600, 1, 0.1806, 0], [1700, 1, 0.2025, 0], [1800, 1, 0.2235, 0], [1900, 1, 0.2434, 0],
  [2000, 1, 0.2647, 0.0033], [2100, 1, 0.2889, 0.012], [2200, 1, 0.3126, 0.0219], [2300, 1, 0.336, 0.0331], [2400, 1, 0.3589, 0.0454],
  [2500, 1, 0.3814, 0.0588], [2600, 1, 0.4034, 0.0734], [2700, 1, 0.425, 0.0889], [2800, 1, 0.4461, 0.1054], [2900, 1, 0.4668, 0.1229],
  [3000, 1, 0.487, 0.1411], [3100, 1, 0.5067, 0.1602], [3200, 1, 0.5259, 0.18], [3300, 1, 0.5447, 0.2005], [3400, 1, 0.563, 0.2216],
  [3500, 1, 0.5809, 0.2433], [3600, 1, 0.5983, 0.2655], [3700, 1, 0.6153, 0.281], [3800, 1, 0.6318, 0.3112], [3900, 1, 0.648, 0.3346],
  [4000, 1, 0.6636, 0.3583], [4100, 1, 0.6789, 0.3823], [4200, 1, 0.6938, 0.4066], [4300, 1, 0.7083, 0.431], [4400, 1, 0.7223, 0.4556],
  [4500, 1, 0.736, 0.4803], [4600, 1, 0.7494, 0.5051], [4700, 1, 0.7623, 0.5299], [4800, 1, 0.775, 0.5548], [4900, 1, 0.7872, 0.5797],
  [5000, 1, 0.7992, 0.6045], [5100, 1, 0.8108, 0.6293], [5200, 1, 0.8221, 0.6541], [5300, 1, 0.833, 0.6787], [5400, 1, 0.8437, 0.7032],
  [5500, 1, 0.8541, 0.7277], [5600, 1, 0.8642, 0.7519], [5700, 1, 0.874, 0.776], [5800, 1, 0.8836, 0.8], [5900, 1, 0.8929, 0.8238],
  [6000, 1, 0.9019, 0.8473], [6100, 1, 0.9107, 0.8707], [6200, 1, 0.9193, 0.8939], [6300, 1, 0.9276, 0.9168], [6400, 1, 0.9357, 0.9396],
  [6500, 1, 0.9436, 0.9621], [6600, 0.9513, 0.9844, 1], [6700, 0.9937, 0.9526, 1], [6800, 0.9726, 0.9395, 1], [6900, 0.9526, 0.927, 1],
  [7000, 0.9337, 0.915, 1], [7100, 0.9157, 0.9035, 1], [7200, 0.8986, 0.8925, 1], [7300, 0.8823, 0.8819, 1], [7400, 0.8668, 0.8718, 1],
  [7500, 0.852, 0.8621, 1], [7600, 0.8379, 0.8527, 1], [7700, 0.8244, 0.8437, 1], [7800, 0.8115, 0.8351, 1], [7900, 0.7992, 0.8268, 1],
  [8000, 0.7874, 0.8187, 1], [8100, 0.7761, 0.811, 1], [8200, 0.7652, 0.8035, 1], [8300, 0.7548, 0.7963, 1], [8400, 0.7449, 0.789, 1],
  [8500, 0.7353, 0.7827, 1], [8600, 0.726, 0.7762, 1], [8700, 0.7172, 0.7699, 1], [8800, 0.7086, 0.7638, 1], [8900, 0.7004, 0.7579, 1],
  [9000, 0.6925, 0.7522, 1], [9100, 0.6848, 0.7467, 1], [9200, 0.6774, 0.7414, 1], [9300, 0.6703, 0.7362, 1], [9400, 0.6635, 0.731, 1],
  [9500, 0.6568, 0.7263, 1], [9600, 0.6504, 0.7215, 1], [9700, 0.6442, 0.7169, 1], [9800, 0.6382, 0.7124, 1], [9900, 0.6324, 0.7081, 1],
  [10000, 0.6268, 0.7039, 1], [11000, 0.5791, 0.6674, 1], [12000, 0.5431, 0.6389, 1], [13000, 0.5152, 0.6162, 1], [14000, 0.493, 0.5978, 1],
  [15000, 0.4749, 0.5824, 1], [16000, 0.4599, 0.5696, 1], [17000, 0.4474, 0.5586, 1], [18000, 0.4367, 0.5492, 1], [19000, 0.4275, 0.541, 1],
  [20000, 0.4196, 0.5339, 1], [25000, 0.3917, 0.5083, 1], [30000, 0.3751, 0.4926, 1], [35000, 0.3641, 0.4821, 1], [40000, 0.3563, 0.4745, 1],
];

/* The shader LUT: 100K samples 1000–10000K, then 1K samples 11000–40000K —
   his exact two-loop construction (121 entries). */
const BLACKBODY_LUT: Array<[number, number, number]> = (() => {
  const rows: Array<[number, number, number]> = [];
  for (let t = 1000; t <= 10000; t += 100) rows.push(blackbodyAt(t));
  for (let t = 11000; t <= 40000; t += 1000) rows.push(blackbodyAt(t));
  return rows;
})();

function blackbodyAt(tempK: number): [number, number, number] {
  const t = Math.max(1000, Math.min(40000, tempK));
  const anchors = BLACKBODY_ANCHORS;
  for (let i = 0; i < anchors.length - 1; i++) {
    if (t >= anchors[i][0] && t <= anchors[i + 1][0]) {
      const f = (t - anchors[i][0]) / (anchors[i + 1][0] - anchors[i][0]);
      /* anchors are [tempK, r, g, b] — interpolate channels j+1 */
      return [0, 1, 2].map((j) => anchors[i][j + 1] + (anchors[i + 1][j + 1] - anchors[i][j + 1]) * f) as [number, number, number];
    }
  }
  const last = anchors[anchors.length - 1];
  return [last[1], last[2], last[3]];
}

/** TS mirror of the shader's LUT lookup — for verification gauntlets. */
export function blackbodyColorOf(tempK: number): [number, number, number] {
  const t = Math.max(1000, Math.min(40000, tempK));
  const idx = t <= 10000 ? (t - 1000) * 0.01 : 90 + (t - 10000) * 0.001;
  const i = Math.min(119, Math.max(0, Math.floor(idx)));
  const f = idx - i;
  const a = BLACKBODY_LUT[i];
  const b = BLACKBODY_LUT[Math.min(120, i + 1)];
  return [0, 1, 2].map((j) => a[j] + (b[j] - a[j]) * f) as [number, number, number];
}
