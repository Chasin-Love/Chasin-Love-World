/*
 * R107 — hardware visual check for the production signed sky-lens GLSL.
 * Runs a fixed bright source marker through the exact applyLensBend() used by
 * the sky surfaces, then checks that the GPU draws both predicted images.
 *
 * Run: npx tsx scripts/probes/round107-sky-lens-visual-probe.ts
 * Optional: R107_LENS_CAPTURE_ANGLE=<radians> R107_LENS_PROBE_OUT=<png path>
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { LENS_UNIFORMS_GLSL, LENS_WARP_GLSL } from '../../src/engine/surface/surfaceShaders';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const WIDTH = 1024;
const HEIGHT = 512;
const BETA = 0.1;
const CAPTURE = Number(process.env.R107_LENS_CAPTURE_ANGLE) || 0.04824;
const OUT = process.env.R107_LENS_PROBE_OUT
  ? path.resolve(ROOT, process.env.R107_LENS_PROBE_OUT)
  : path.join(ROOT, 'scripts/verify/r107-sky-lens-fixture.png');

const RS = CAPTURE / 2.5980762;
const deflection = (theta: number) => 2 * RS / theta + 2.9452431 * RS * RS / (theta * theta);
function solveRoot(fn: (x: number) => number, lo: number, hi: number): number {
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (fn(mid) > 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

const primary = solveRoot((theta) => theta - deflection(theta) - BETA, CAPTURE * 1.0001, 1);
const secondary = solveRoot((theta) => BETA - deflection(theta) + theta, CAPTURE * 1.0001, Math.sqrt(2 * RS) * 2);

const VERT = `#version 300 es
in vec2 position;
out vec2 vUv;
void main(){ vUv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }
`;

const FRAG = `#version 300 es
precision highp float;
precision highp int;
${LENS_UNIFORMS_GLSL}
${LENS_WARP_GLSL}
in vec2 vUv;
out vec4 outColor;
void main(){
  vec2 screenAngle = (vUv - 0.5) * vec2(1.2, 0.8);
  vec3 ray = normalize(vec3(tan(screenAngle), 1.0));
  vec3 source = applyLensBend(ray);
  if (lensCaptured(source)) { outColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  float sourceX = atan(source.x, source.z);
  float sourceY = atan(source.y, length(source.xz));
  vec2 delta = vec2(sourceX - ${BETA.toFixed(8)}, sourceY);
  float marker = exp(-dot(delta, delta) / (2.0 * 0.0025 * 0.0025));
  outColor = vec4(vec3(marker), 1.0);
}
`;

async function main(): Promise<void> {
  mkdirSync(path.dirname(OUT), { recursive: true });
  const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=d3d11'] });
  try {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
    await page.setContent(`<canvas id="fixture" width="${WIDTH}" height="${HEIGHT}"></canvas>`);
    /* tsx's browser callback wrapper references this harmless source-name
       helper; define it in the page before sending the callback. */
    await page.evaluate('window.__name = (fn) => fn');
    const result = await page.evaluate(async ({ vertexSource, fragmentSource, capture, width, height }) => {
      const canvas = document.querySelector('#fixture') as HTMLCanvasElement;
      const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true });
      if (!gl) throw new Error('WebGL2 is unavailable');
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
      const compile = (kind: number, source: string) => {
        const shader = gl.createShader(kind)!;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'shader compile failed');
        return shader;
      };
      const program = gl.createProgram()!;
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'shader link failed');
      gl.useProgram(program);
      const buffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
      const pos = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(pos);
      gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
      gl.viewport(0, 0, width, height);
      gl.disable(gl.DITHER);
      gl.disable(gl.BLEND);

      const lenses = new Float32Array(64);
      lenses[2] = 1;
      gl.uniform4fv(gl.getUniformLocation(program, 'uLenses[0]'), lenses);
      const rim = new Float32Array(16); rim[0] = capture / 2.5980762;
      const strong = new Float32Array(16); strong[0] = 1;
      const captures = new Float32Array(16); captures[0] = capture;
      gl.uniform1fv(gl.getUniformLocation(program, 'uLensRim[0]'), rim);
      gl.uniform1fv(gl.getUniformLocation(program, 'uLensStrong[0]'), strong);
      gl.uniform1fv(gl.getUniformLocation(program, 'uLensCapture[0]'), captures);
      gl.uniform1f(gl.getUniformLocation(program, 'uLensScale'), 1);
      gl.uniform1f(gl.getUniformLocation(program, 'uLensBend'), 1);

      const scan = (count: number) => {
        gl.uniform1i(gl.getUniformLocation(program, 'uLensCount'), count);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        const pixels = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        const y = Math.floor(height / 2);
        const peaks: { x: number; value: number; angle: number }[] = [];
        for (let x = 1; x < width - 1; x++) {
          const at = (y * width + x) * 4;
          const left = pixels[at - 4], value = pixels[at], right = pixels[at + 4];
          if (value >= 160 && value >= left && value >= right) peaks.push({ x, value, angle: ((x + 0.5) / width - 0.5) * 1.2 });
        }
        const png = canvas.toDataURL('image/png').split(',')[1];
        return { peaks, png };
      };
      return { renderer, baseline: scan(0), lensed: scan(1) };
    }, { vertexSource: VERT, fragmentSource: FRAG, capture: CAPTURE, width: WIDTH, height: HEIGHT });

    const software = /swiftshader|llvmpipe|software|basic raster/i.test(result.renderer);
    const near = (peaks: typeof result.lensed.peaks, target: number) => peaks.some((p) => Math.abs(p.angle - target) < 0.012);
    const baseOk = near(result.baseline.peaks, BETA);
    const primaryOk = near(result.lensed.peaks, primary);
    const secondaryOk = near(result.lensed.peaks, -secondary);
    const image = Buffer.from(result.lensed.png, 'base64');
    writeFileSync(OUT, image);
    console.log(`R107 GPU — ${result.renderer}`);
    console.log(`SOURCE — β=${BETA.toFixed(3)} rad · capture=${CAPTURE.toFixed(5)} rad`);
    console.log(`PREDICTED — primary +${primary.toFixed(4)} rad · secondary −${secondary.toFixed(4)} rad`);
    console.log(`BASELINE peaks — ${JSON.stringify(result.baseline.peaks)}`);
    console.log(`LENSED peaks — ${JSON.stringify(result.lensed.peaks)}`);
    console.log(`CAPTURE — ${OUT}`);
    if (software) throw new Error('software renderer cannot certify the hardware sky shader');
    if (!baseOk || !primaryOk || !secondaryOk) throw new Error(`visual mismatch: baseline=${baseOk}, primary=${primaryOk}, secondary=${secondaryOk}`);
    console.log('● R107 SKY LENS GREEN — the production shader renders both predicted images on the hardware GPU');
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
