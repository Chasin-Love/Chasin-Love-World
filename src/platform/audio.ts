import { STORAGE_KEYS } from './storageKeys';
/* procedural spatial audio — ambient drones per mode + tiny interaction SFX */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = localStorage.getItem(STORAGE_KEYS.muted) === '1';
let droneNodes: AudioNode[] = [];
let currentMode: 'space' | 'diary' | 'vault' | 'core' = 'space';
let rec: MediaRecorder | null = null;
let recChunks: Blob[] = [];
let recStream: MediaStream | null = null;

let userInteracted = false;

function ensure(createIfMissing = true): AudioContext | null {
  try {
    if (!ctx && createIfMissing && userInteracted) {
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.55;
      master.connect(ctx.destination);
    }
    if (ctx && ctx.state === 'suspended' && userInteracted) {
      void ctx.resume();
    }
    return ctx;
  } catch {
    return null;
  }
}

/* create/resume the audio context on the first user gesture */
export function initAudio() {
  userInteracted = true;
  ensure(true);
  setAudioMode(currentMode);
}

export function isMuted() { return muted; }
export function toggleMute(): boolean {
  muted = !muted;
  localStorage.setItem(STORAGE_KEYS.muted, muted ? '1' : '0');
  if (master && ctx) master.gain.setTargetAtTime(muted ? 0 : 0.55, ctx.currentTime, 0.2);
  return muted;
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, when = 0) {
  const c = ensure();
  if (!c || !master) return;
  const t = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

export function chime(base = 660) { tone(base, 0.5, 'sine', 0.12); tone(base * 1.5, 0.6, 'sine', 0.06, 0.06); }
export function sfxTick() { tone(1240, 0.06, 'triangle', 0.05); }
export function sfxPage() { tone(320, 0.18, 'sine', 0.06); tone(240, 0.22, 'sine', 0.04, 0.05); }
export function sfxConnect() { tone(520, 0.3, 'sine', 0.07); tone(780, 0.35, 'sine', 0.05, 0.1); }

/* ---------------------- THE KAMUI VOICE (R82) ----------------------
   The jutsu speaks: the cinematic full sequence the author chose from the
   listening dossier (Desktop \\"KAMUI VOICE - discussion\\"), synthesized
   with the same building blocks as everything else in this file — noise,
   oscillators, filters — riding the vortex's real timeline constants
   (5.0s summon + 1.0s vacuum + arrival, from kamuiPhases.ts).
   Every layer is scheduled from ONE start call; the mute law is honored
   by routing everything through the master gain (muted → silence, and a
   summon begun unmuted simply fades with the master knob if muted later). */

/* the vortex's eased-strength shape (the R77/78 envelope, mirrored here so
   the sound breathes with the SAME curve the visuals ride) */
function kamuiVortexStrength(t: number): number {
  if (t < 0.45) { const k = t / 0.45; return k * k * k; }
  if (t < 0.8) return 1;
  const k = (t - 0.8) / 0.2; return 1 - k * k * k;
}

function kamuiNoise(c: AudioContext, seconds: number): AudioBufferSourceNode {
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  return src;
}

/* the summon: blooming riser (noise sweep + low climb) */
function kamuiRiser(c: AudioContext, out: AudioNode, t0: number, dur: number) {
  const src = kamuiNoise(c, dur + 0.1);
  src.loop = true;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
  const g = c.createGain();
  bp.frequency.setValueAtTime(180, t0);
  bp.frequency.exponentialRampToValueAtTime(2600, t0 + dur);
  bp.Q.setValueAtTime(0.8, t0);
  bp.Q.linearRampToValueAtTime(2.2, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  for (let i = 0; i <= 24; i++) {
    const t = t0 + (dur * i) / 24;
    g.gain.linearRampToValueAtTime(Math.max(0.0001, kamuiVortexStrength(i / 24) * 0.5), t);
  }
  src.connect(bp).connect(g).connect(out);
  src.start(t0); src.stop(t0 + dur + 0.05);
  const o = c.createOscillator(); o.type = 'sine';
  const og = c.createGain();
  o.frequency.setValueAtTime(46, t0);
  o.frequency.exponentialRampToValueAtTime(184, t0 + dur);
  og.gain.setValueAtTime(0.0001, t0);
  og.gain.linearRampToValueAtTime(0.34, t0 + dur * 0.8);
  og.gain.linearRampToValueAtTime(0.42, t0 + dur);
  o.connect(og).connect(out);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

/* the tear bite: a short downward rip at the moment the tear opens */
function kamuiRip(c: AudioContext, out: AudioNode, t0: number) {
  const src = kamuiNoise(c, 0.4);
  const bp = c.createBiquadFilter(); bp.type = 'bandpass';
  const g = c.createGain();
  bp.frequency.setValueAtTime(3200, t0);
  bp.frequency.exponentialRampToValueAtTime(420, t0 + 0.22);
  bp.Q.value = 3.5;
  g.gain.setValueAtTime(0.5, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26);
  src.connect(bp).connect(g).connect(out);
  src.start(t0); src.stop(t0 + 0.3);
}

/* the heart: the B♭ drone (the Perseus homage), partials orbiting the head */
function kamuiDrone(c: AudioContext, out: AudioNode, t0: number, dur: number) {
  const Bb1 = 58.27;
  const partials = [1, 1.5, 2.0, 2.997];
  const gains = [0.30, 0.14, 0.10, 0.05];
  const pans = [-0.7, 0.5, -0.35, 0.8];
  partials.forEach((mult, i) => {
    const o = c.createOscillator(); o.type = i === 0 ? 'sine' : 'triangle';
    o.frequency.value = Bb1 * mult;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gains[i], t0 + 1.4);
    g.gain.setValueAtTime(gains[i], t0 + dur * 0.75);
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    const lfo = c.createOscillator(); lfo.frequency.value = 0.11 + i * 0.043;
    const pan = c.createStereoPanner();
    const plg = c.createGain(); plg.gain.value = pans[i];
    lfo.connect(plg).connect(pan.pan);
    o.connect(g).connect(pan).connect(out);
    o.start(t0); o.stop(t0 + dur + 0.1);
    lfo.start(t0); lfo.stop(t0 + dur + 0.1);
  });
}

/* the gulp: sub-drop while the stereo field collapses to center */
function kamuiSubDrop(c: AudioContext, out: AudioNode, t0: number, dur: number) {
  const o = c.createOscillator(); o.type = 'sine';
  const g = c.createGain();
  o.frequency.setValueAtTime(82, t0);
  o.frequency.exponentialRampToValueAtTime(24, t0 + dur);
  g.gain.setValueAtTime(0.55, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 1.15);
  const comp = c.createDynamicsCompressor();
  o.connect(g).connect(comp).connect(out);
  o.start(t0); o.stop(t0 + dur * 1.2);
  const src = kamuiNoise(c, dur + 0.2);
  src.loop = true;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass';
  lp.frequency.setValueAtTime(900, t0);
  lp.frequency.exponentialRampToValueAtTime(120, t0 + dur);
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.22, t0);
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  const l = c.createGain(); const r = c.createGain();
  l.gain.setValueAtTime(0.5, t0); r.gain.setValueAtTime(0.5, t0);
  l.gain.linearRampToValueAtTime(0, t0 + dur); /* the sides die into the center */
  r.gain.linearRampToValueAtTime(0, t0 + dur);
  const sl = c.createStereoPanner(); sl.pan.value = -1;
  const sr = c.createStereoPanner(); sr.pan.value = 1;
  src.connect(lp);
  lp.connect(sl).connect(l).connect(out);
  lp.connect(sr).connect(r).connect(out);
  src.start(t0); src.stop(t0 + dur + 0.1);
}

/* the arrival: the app's own chimes re-voiced with air */
function kamuiExhale(c: AudioContext, out: AudioNode, t0: number) {
  const notes: Array<[number, number]> = [[880, 0], [760, 0.07], [587.33, 0.16]];
  for (const [f, dt] of notes) {
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0 + dt);
    g.gain.linearRampToValueAtTime(0.16, t0 + dt + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.9);
    o.connect(g).connect(out);
    o.start(t0 + dt); o.stop(t0 + dt + 1);
  }
  const src = kamuiNoise(c, 1.4);
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
  const g = c.createGain();
  g.gain.setValueAtTime(0.14, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.2);
  const pL = c.createStereoPanner(); pL.pan.value = -0.6;
  const pR = c.createStereoPanner(); pR.pan.value = 0.6;
  src.connect(lp).connect(g);
  g.connect(pL).connect(out); g.connect(pR).connect(out);
  src.start(t0); src.stop(t0 + 1.4);
}

export type KamuiVoiceHandle = { stop(): void };

/* THE VOICE — the full cinematic Kamui, scheduled from the summon's first
   frame. Timeline constants come from kamuiPhases.ts so sound and pixels
   never drift apart. Safe to call again while one is flying (the previous
   voice is stopped, never overlapped). */
export function playKamuiVoice(summonDuration = 5.0, vacuumDuration = 1.0): KamuiVoiceHandle | null {
  const c = ensure();
  if (!c || !master) return null;
  const t0 = c.currentTime + 0.03;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4;
  const makeup = c.createGain(); makeup.gain.value = 1.15;
  makeup.connect(comp).connect(master);
  kamuiRiser(c, makeup, t0, summonDuration);
  kamuiRip(c, makeup, t0 + summonDuration * 0.45);
  kamuiDrone(c, makeup, t0 + summonDuration * 0.45, summonDuration * 0.55 + vacuumDuration * 0.4);
  kamuiSubDrop(c, makeup, t0 + summonDuration, vacuumDuration);
  kamuiExhale(c, makeup, t0 + summonDuration + vacuumDuration + 0.25);
  const end = t0 + summonDuration + vacuumDuration + 1.8;
  const watchdog = window.setTimeout(() => { try { comp.disconnect(); makeup.disconnect(); } catch { /* */ } }, (end - c.currentTime) * 1000 + 400);
  return {
    stop() {
      window.clearTimeout(watchdog);
      /* graceful cut: duck the bus, then release the graph */
      try { makeup.gain.setTargetAtTime(0.0001, c.currentTime, 0.08); } catch { /* */ }
      window.setTimeout(() => { try { comp.disconnect(); makeup.disconnect(); } catch { /* */ } }, 320);
    },
  };
}
/* ------------------ end THE KAMUI VOICE (R82) ------------------ */

/* ------------------------------ ambience ------------------------------- */

function killDrone() {
  droneNodes.forEach((n) => { try { (n as OscillatorNode).stop?.(); } catch { /* */ } try { n.disconnect(); } catch { /* */ } });
  droneNodes = [];
}

export function setAudioMode(m: 'space' | 'diary' | 'vault' | 'core') {
  currentMode = m;
  const c = ensure();
  if (!c || !master) return;
  const dest: AudioNode = master;
  killDrone();
  const mk = (freq: number, vol: number, type: OscillatorType, lfoRate = 0.07) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = 0;
    g.gain.setTargetAtTime(vol, c.currentTime, 1.4);
    const lfo = c.createOscillator();
    const lg = c.createGain();
    lfo.frequency.value = lfoRate;
    lg.gain.value = vol * 0.5;
    lfo.connect(lg).connect(g.gain);
    o.connect(g).connect(dest);
    o.start(); lfo.start();
    droneNodes.push(o, g, lfo, lg);
  };
  if (m === 'space') { mk(46, 0.035, 'sine'); mk(69.3, 0.02, 'sine', 0.05); mk(92.5, 0.012, 'triangle', 0.09); }
  if (m === 'diary') { mk(110, 0.022, 'sine'); mk(165, 0.014, 'sine', 0.06); mk(220.5, 0.008, 'sine', 0.11); }
  if (m === 'vault') { mk(55, 0.03, 'sine'); mk(82.4, 0.018, 'triangle', 0.05); mk(58.3, 0.02, 'sine', 0.035); }
  if (m === 'core') { mk(41.2, 0.04, 'sine'); mk(61.7, 0.022, 'sine', 0.045); mk(123.5, 0.01, 'triangle', 0.08); }
}

/* ------------------------------ recording ------------------------------ */

let recStart = 0;

export async function startRecording(): Promise<boolean> {
  const c = ensure();
  if (!c) return false;
  try {
    recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    rec = new MediaRecorder(recStream);
    recChunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) recChunks.push(e.data); };
    rec.start();
    recStart = performance.now();
    return true;
  } catch {
    return false;
  }
}

export function stopRecording(): Promise<{ dataUrl: string; peaks: number[]; duration: number } | null> {
  return new Promise((resolve) => {
    if (!rec || !recStream) { resolve(null); return; }
    const recorder = rec;
    const finish = () => {
      const dur = Math.max(0.4, (performance.now() - recStart) / 1000);
      recStream!.getTracks().forEach((t) => t.stop());
      recStream = null; rec = null;
      if (!recChunks.length) { resolve(null); return; }
      const blob = new Blob(recChunks, { type: recorder.mimeType || 'audio/webm' });
      const r = new FileReader();
      r.onload = () => resolve({ dataUrl: r.result as string, peaks: fakePeaks(blob.size), duration: dur });
      r.readAsDataURL(blob);
    };
    recorder.onstop = () => {
      const blob = new Blob(recChunks, { type: recorder.mimeType || 'audio/webm' });
      /* compute REAL waveform peaks when the browser can decode the recording;
         falls back to the synthetic curve for undecodable containers */
      void blob.arrayBuffer()
        .then((buf) => {
          const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const ac = new AC();
          const close = () => { void ac.close().catch(() => undefined); };
          return ac.decodeAudioData(buf).then((audio) => {
            const data = audio.getChannelData(0);
            const buckets = 48;
            const per = Math.max(1, Math.floor(data.length / buckets));
            const peaks: number[] = [];
            for (let i = 0; i < buckets; i++) {
              let peak = 0;
              for (let j = i * per; j < (i + 1) * per && j < data.length; j += 16) {
                const v = Math.abs(data[j]);
                if (v > peak) peak = v;
              }
              peaks.push(Math.max(0.06, Math.min(1, peak)));
            }
            close();
            return peaks;
          }).catch(() => { close(); return null; });
        })
        .then((peaks) => {
          const dur = Math.max(0.4, (performance.now() - recStart) / 1000);
          recStream?.getTracks().forEach((t) => t.stop());
          recStream = null; rec = null;
          if (!recChunks.length) { resolve(null); return; }
          const blob2 = new Blob(recChunks, { type: recorder.mimeType || 'audio/webm' });
          const r = new FileReader();
          r.onload = () => resolve({ dataUrl: r.result as string, peaks: peaks ?? fakePeaks(blob2.size), duration: dur });
          r.readAsDataURL(blob2);
        })
        .catch(() => { finish(); });
    };
    try {
      if (recorder.state === 'inactive') {
        /* recorder died externally (mic unplugged / permission revoked) */
        recorder.onstop = null;
        recStream.getTracks().forEach((t) => t.stop());
        recStream = null; rec = null;
        resolve(null);
        return;
      }
      recorder.stop();
    } catch {
      recStream?.getTracks().forEach((t) => t.stop());
      recStream = null; rec = null;
      resolve(null);
    }
  });
}

function fakePeaks(size: number): number[] {
  const n = 42;
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(0.25 + 0.75 * Math.abs(Math.sin(i * 0.9 + size * 0.00001)) * (0.4 + 0.6 * Math.sin(i * 0.23 + 2)));
  return out;
}
