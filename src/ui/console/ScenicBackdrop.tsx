import { useEffect, useRef } from 'react';

/* ------------------------------------------------------------------ */
/* THE CRIMSON WATCH — a lonely night painted in one fragment shader   */
/* on one fullscreen quad.                                             */
/*                                                                     */
/* Obito's sky: one huge crimson moon hanging in an indigo-charcoal    */
/* void, thin clouds crossing it slowly, calm rain drifting through    */
/* its glow, dark leaves tumbling on the wind, ash motes rising, and   */
/* low mountains holding the horizon. One palette — charcoal, indigo,  */
/* gray-blue — with crimson as the only voice. No blur, no split, no   */
/* bands: the night is the interface.                                  */
/*                                                                     */
/* Budget: one draw call, DPR capped, 30 fps cadence, paused when the  */
/* tab hides, a single static frame for prefers-reduced-motion, and a  */
/* pure-CSS night gradient as the zero-WebGL fallback. Unmounts with   */
/* the console, so it costs nothing while closed.                      */
/* ------------------------------------------------------------------ */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uMouse;   // eased -1..1 pointer parallax

float hash11(float n) { return fract(sin(n * 127.1) * 43758.5453123); }
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
    mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x),
    u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p);
    p = p * 2.03 + vec2(11.7, 5.3);
    a *= 0.5;
  }
  return v;
}

/* one calm layer of wind-slanted rain streaks */
float rain(vec2 uv, float t, float cols, float fall, float slant) {
  vec2 p = uv;
  p.x += p.y * slant;
  vec2 g = vec2(p.x * cols, p.y * 6.0);
  float colId = floor(g.x);
  float sp = 0.8 + hash11(colId * 7.3) * 0.6;
  g.y += t * fall * sp;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float rn = hash12(id);
  float drop = smoothstep(0.055, 0.0, abs(f.x)) * smoothstep(0.42, 0.0, abs(f.y));
  return drop * step(0.55, rn);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;          // 0..1, y up
  float aspect = uRes.x / uRes.y;
  vec2 auv = vec2(uv.x * aspect, uv.y);      // aspect-corrected
  float t = uTime;

  /* ------- anchors -------------------------------------------------- */
  vec2 moonPos = vec2(0.72 * aspect + uMouse.x * 0.010, 0.78 + uMouse.y * 0.008);
  float horizon = 0.16;                      // low charcoal ridge (uv.y)
  vec2 toMoon = auv - moonPos;
  float moonD = length(toMoon);
  vec3 crimson = vec3(0.878, 0.192, 0.192);  // #e03131
  vec3 ember   = vec3(1.000, 0.420, 0.310);  // warm vermillion

  /* ------- SKY — one cohesive indigo-charcoal wash, no bands --------- */
  vec3 skyTop = vec3(0.031, 0.043, 0.086);
  vec3 skyMid = vec3(0.075, 0.094, 0.165);
  vec3 skyLow = vec3(0.125, 0.145, 0.212);
  vec3 col = mix(skyLow, skyMid, smoothstep(0.0, 0.45, uv.y));
  col = mix(col, skyTop, smoothstep(0.45, 1.0, uv.y));

  /* the moon's glow — the frame's only color voice */
  col += crimson * exp(-moonD * 3.2) * 0.34;
  col += vec3(0.45, 0.10, 0.10) * exp(-moonD * 1.4) * 0.10;

  /* ------- STARS — sparse, faint, away from the moon ----------------- */
  vec2 sg = auv * 110.0;
  vec2 sid = floor(sg);
  float sh = hash12(sid);
  float tw = 0.5 + 0.5 * sin(t * (0.6 + sh) + sh * 50.0);
  vec2 sPos = vec2(hash12(sid + 3.1), hash12(sid + 7.7));
  float sd = length(fract(sg) - sPos);
  float star = smoothstep(0.10, 0.02, sd) * step(0.992, sh) * (0.35 + 0.4 * tw);
  col += vec3(0.75, 0.80, 0.95) * star * smoothstep(0.55, 0.85, uv.y) * smoothstep(0.10, 0.16, moonD);

  /* ------- MOON — huge, calm, mottled -------------------------------- */
  float disc = smoothstep(0.098, 0.094, moonD);
  float mottle = fbm(auv * 24.0 + 7.0);
  vec3 moonCol = mix(ember, vec3(0.965, 0.415, 0.345), smoothstep(0.02, 0.09, moonD));
  moonCol *= 0.92 + 0.16 * mottle;
  col = mix(col, moonCol, disc);

  /* ------- CLOUDS — thin dark bands crossing the moon ---------------- */
  vec2 drift = vec2(t * 0.006 + uMouse.x * 0.008, 0.0);
  float cn = fbm(vec2(uv.x * 2.6, uv.y * 9.0) + drift + 13.0);
  float cov = smoothstep(0.50, 0.72, cn);
  vec3 cloudCol = mix(vec3(0.055, 0.066, 0.105), vec3(0.145, 0.045, 0.050), exp(-moonD * 2.2));
  col = mix(col, cloudCol, cov * 0.55);
  float cn2 = fbm(vec2(uv.x * 3.6, uv.y * 14.0) + drift * 1.8 + 47.0);
  col = mix(col, cloudCol * 0.85, smoothstep(0.55, 0.78, cn2) * 0.35);

  /* ------- MOUNTAINS — low charcoal ridge + mist --------------------- */
  float ridgeX = uv.x * aspect + uMouse.x * 0.014;
  float ridge = horizon + 0.028 * fbm(vec2(ridgeX * 1.6 + 3.0, 1.7));
  float m = smoothstep(ridge + 0.0018, ridge - 0.0018, uv.y);
  vec3 ground = vec3(0.026, 0.030, 0.050);
  ground += crimson * exp(-(ridge - uv.y) * 90.0) * step(uv.y, ridge) * 0.10;
  float mist = fbm(vec2(uv.x * 3.0 - t * 0.03, uv.y * 6.0 + t * 0.01) + 61.0);
  ground += vec3(0.10, 0.12, 0.17) * smoothstep(0.55, 0.8, mist) * 0.25 * exp(-(ridge - uv.y) * 8.0);
  col = mix(col, ground, m);

  /* ------- RAIN — calm streaks catching the moonlight ----------------- */
  float r1 = rain(auv, t, 70.0, 1.6, 0.10);
  float r2 = rain(auv, t, 42.0, 1.0, 0.13);
  vec3 rainCol = mix(vec3(0.55, 0.62, 0.78), ember * 0.85, exp(-moonD * 2.4));
  col += rainCol * r1 * 0.10;
  col += rainCol * r2 * 0.06;

  /* ------- LEAVES — dark, tumbling, wind-swept ------------------------ */
  for (int i = 0; i < 10; i++) {
    float fi = float(i) + 0.5;
    float hA = hash11(fi * 1.13);
    float hB = hash11(fi * 2.71 + 17.0);
    float hC = hash11(fi * 4.37 + 31.0);
    float depth = 0.4 + 0.6 * hC;
    float px = fract(hA + t * (0.010 + 0.014 * hB) * depth);
    px += sin(t * (0.5 + hB) + hC * 6.2832) * 0.018 * depth;
    float py = 1.08 - fract(t * (0.020 + 0.030 * hB) * depth + hC) * 1.22;
    vec2 pp = (vec2(px * aspect, py) - auv);
    float rot = t * (0.9 + hA) * (hC > 0.5 ? 1.0 : -1.0) + hC * 6.2832;
    float cs = cos(rot), sn = sin(rot);
    pp = mat2(cs, -sn, sn, cs) * pp;
    float d = length(pp * vec2(1.0, 2.4));
    float size = (0.0040 + 0.0050 * hB) * depth;
    float leaf = smoothstep(size, size * 0.4, d);
    vec3 leafCol = mix(vec3(0.23, 0.075, 0.070), vec3(0.34, 0.10, 0.085), hA);
    col = mix(col, leafCol, leaf * (0.5 + 0.3 * depth));
  }

  /* ------- ASH MOTES — sparse warm specks drifting --------------------- */
  for (int i = 0; i < 18; i++) {
    float fi = float(i) + 0.5;
    float hA = hash11(fi * 3.7);
    float hB = hash11(fi * 5.9 + 11.0);
    float px = fract(hA + t * 0.004 * (0.5 + hB));
    float py = fract(0.2 + hB + t * (0.008 + 0.010 * hA));
    float md = length((vec2(px * aspect, py) - auv));
    float mote = smoothstep(0.0022, 0.0008, md);
    col += vec3(0.75, 0.55, 0.45) * mote * (0.10 + 0.10 * sin(t * 2.0 + fi));
  }

  /* ------- finishing grade — vignette + film grain --------------------- */
  float vig = smoothstep(1.35, 0.35, length((uv - 0.5) * vec2(aspect, 1.0)));
  col *= mix(0.88, 1.0, vig);
  col += (hash12(uv * uRes + fract(t) * 61.7) - 0.5) * 0.012;

  gl_FragColor = vec4(col, 1.0);
}
`;

export const FALLBACK_NIGHT =
  'radial-gradient(560px at 72% 74%, rgba(224,49,49,0.32), transparent 70%), linear-gradient(to top, #05070d 0%, #0d1322 60%, #1c2337 100%)';

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn('[ScenicBackdrop] shader compile failed:', gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

interface ScenicBackdropMedia {
  kind: 'image' | 'video';
  url: string;
}

export function ScenicBackdrop({ media = null, dim = 0 }: { media?: ScenicBackdropMedia | null; dim?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isShader = !media;

  useEffect(() => {
    if (!isShader) return; // the user's own media is on the wall — the shader rests
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (canvas.getContext('webgl2', { alpha: false, antialias: false }) ||
      canvas.getContext('webgl', { alpha: false, antialias: false })) as WebGLRenderingContext | null;
    if (!gl) return; // the CSS night gradient on the element stands in

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('[ScenicBackdrop] program link failed:', gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'uRes');
    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uMouse = gl.getUniformLocation(prog, 'uMouse');

    /* internal scale — the scene is painterly; a soft 0.75× render is invisible
       after upscale and keeps the fragment budget well clear of the main engine.
       Sizing reads the LAYOUT viewport (documentElement), not innerHeight — the
       one that lags on zoomed/hi-dpi/webview setups. */
    const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.75;
    const resize = () => {
      const vw = document.documentElement.clientWidth;
      const vh = document.documentElement.clientHeight;
      canvas.width = Math.max(2, Math.round(vw * scale));
      canvas.height = Math.max(2, Math.round(vh * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();

    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMouse = (e: MouseEvent) => {
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const draw = (time: number) => {
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      /* self-healing — reconcile the backing store against the element's
         rendered box every frame; a missed resize event can never leave a
         strip of the cosmos showing */
      const vw = Math.round(canvas.clientWidth * scale);
      const vh = Math.round(canvas.clientHeight * scale);
      if (Math.abs(canvas.width - vw) > 1 || Math.abs(canvas.height - vh) > 1) resize();
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    let raf = 0;
    let last = 0;
    let hidden = false;
    const onVis = () => {
      hidden = document.hidden;
    };
    const onResize = () => {
      resize();
      if (reduced) draw(37.0); // re-paint the single still frame at the new size
    };

    if (reduced) {
      /* stillness is respected — one painted frame, no loop */
      draw(37.0);
    } else {
      const tick = (now: number) => {
        raf = requestAnimationFrame(tick);
        if (hidden || now - last < 33.4) return; // 30 fps cadence
        last = now;
        draw(now / 1000);
      };
      raf = requestAnimationFrame(tick);
      document.addEventListener('visibilitychange', onVis);
      window.addEventListener('mousemove', onMouse);
    }

    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMouse);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [isShader]);

  /* THE USER'S OWN NIGHT — image, animated GIF or muted video, hung full
     viewport with a dim veil so the deck's type stays readable */
  if (media) {
    return (
      <>
        {media.kind === 'video' ? (
          <video
            src={media.url}
            autoPlay
            muted
            loop
            playsInline
            aria-hidden
            className="fixed inset-0 w-screen h-dvh object-cover pointer-events-none"
          />
        ) : (
          <img
            src={media.url}
            alt=""
            aria-hidden
            className="fixed inset-0 w-screen h-dvh object-cover pointer-events-none"
          />
        )}
        {dim > 0 && <div className="fixed inset-0 pointer-events-none bg-black" style={{ opacity: dim }} />}
      </>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="fixed inset-0 w-screen h-dvh pointer-events-none"
      style={{ background: FALLBACK_NIGHT }}
    />
  );
}
