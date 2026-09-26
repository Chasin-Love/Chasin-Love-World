import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * THE CORE SIGIL — a live-rendered precision instrument, not a CSS gradient.
 *
 * A mechanical gyroscope seated in a chronograph chapter ring:
 *   - 60 bezel ticks that step forward like a real movement (escapement tick),
 *     every 5th tick longer and brighter (the minute-register convention),
 *   - three gimbal rings spinning on distinct true axes,
 *   - a geodesic wire cage over a breathing plasma core,
 *   - one orbiting satellite tracing the outer gimbal,
 *   - accent-tinted by the active tab (--cc), devicePixelRatio-sharp.
 */

export function CoreSigil({ size = 44 }: { size?: number }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    host.appendChild(renderer.domElement);
    renderer.domElement.style.display = 'block';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
    camera.position.set(0, 0, 10.5);

    /* tab accent (rgb triplet) — retint the whole instrument live */
    const plate = host.closest('.core-plate') as HTMLElement | null;
    const accent = () => {
      const v = plate ? getComputedStyle(plate).getPropertyValue('--cc').trim() : '';
      return v || '34 211 238';
    };

    /* ---------------- materials (retinted per accent change) --------------- */
    const tickMat = new THREE.MeshBasicMaterial({ color: 0x8be9fd, transparent: true, opacity: 0.85 });
    const tickMajorMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0 });
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.4 });
    const cageMat = new THREE.LineBasicMaterial({ color: 0x9becff, transparent: true, opacity: 0.5 });
    const gimbalMats = [0, 1, 2].map((i) => new THREE.MeshBasicMaterial({ color: 0x8be9fd, transparent: true, opacity: 0.9 - i * 0.12 }));
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xc8f4ff, transparent: true, opacity: 0.92 });
    const haloMat = new THREE.SpriteMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
    const satMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const satTrailMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending });
    const retint = (hex: number) => {
      [tickMat, ringMat, cageMat, ...gimbalMats, haloMat].forEach((m) => m.color.setHex(hex));
      coreMat.color.setHex(hex).lerp(new THREE.Color(0xffffff), 0.4);
    };

    /* ---------------- the chapter ring: 60 escapement ticks ---------------- */
    const ring = new THREE.Group();
    const tickGeo = new THREE.PlaneGeometry(0.045, 0.34);
    const tickMajorGeo = new THREE.PlaneGeometry(0.06, 0.5);
    const ticks: THREE.Mesh[] = [];
    for (let i = 0; i < 60; i++) {
      const major = i % 5 === 0;
      const t = new THREE.Mesh(major ? tickMajorGeo : tickGeo, major ? tickMajorMat : tickMat);
      const a = (i / 60) * Math.PI * 2;
      const R = 2.55;
      t.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
      t.rotation.z = a - Math.PI / 2;
      ring.add(t);
      ticks.push(t);
    }
    /* the bezel — one thin bright arc seating the ticks */
    const bezelGeo = new THREE.RingGeometry(2.72, 2.79, 96);
    const bezel = new THREE.Mesh(bezelGeo, ringMat);
    ring.add(bezel);
    scene.add(ring);

    /* ---------------- the gimbal assembly: three true-axis rings ----------- */
    const gimbal = new THREE.Group();
    const gimbals: THREE.Group[] = [];
    const radii = [1.62, 1.32, 1.02];
    radii.forEach((r, i) => {
      const g = new THREE.Group();
      const torus = new THREE.Mesh(new THREE.TorusGeometry(r, 0.045, 10, 72), gimbalMats[i]);
      g.add(torus);
      /* register dots on the ring — the machined holes of a real gimbal */
      for (let d = 0; d < 4; d++) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), gimbalMats[i]);
        const a = (d / 4) * Math.PI * 2;
        dot.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
        g.add(dot);
      }
      g.rotation.set(Math.PI / 2.4, i * 0.9, i * 0.7);
      gimbal.add(g);
      gimbals.push(g);
    });

    /* ---------------- geodesic wire cage ------------------------------------ */
    const icosahedron = new THREE.IcosahedronGeometry(0.82, 1);
    const cage = new THREE.LineSegments(new THREE.WireframeGeometry(icosahedron), cageMat);
    gimbal.add(cage);
    scene.add(gimbal);

    /* ---------------- the plasma core + halo -------------------------------- */
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.38, 24, 24), coreMat);
    gimbal.add(core);
    const haloTex = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const ctx = c.getContext('2d')!;
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.25, 'rgba(255,255,255,0.5)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    })();
    haloMat.map = haloTex;
    const halo = new THREE.Sprite(haloMat);
    halo.scale.setScalar(1.7);
    scene.add(halo);

    /* ---------------- one orbiting satellite -------------------------------- */
    const sat = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), satMat);
    const TRAIL_PTS = 90;
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(TRAIL_PTS * 3), 3));
    const trail = new THREE.Line(trailGeo, satTrailMat);
    scene.add(sat, trail);
    const trailPts: number[] = [];

    /* ---------------- animation: escapement tick + true rotation ------------ */
    let raf = 0;
    let last = performance.now();
    let step = -1;
    const tmp = new THREE.Color();
    const applyAccent = () => {
      const parts = accent().split(/\s+/).map(Number);
      if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
        tmp.setRGB(parts[0] / 255, parts[1] / 255, parts[2] / 255);
        retint(tmp.getHex());
      }
    };
    applyAccent();
    const mo = new MutationObserver(applyAccent);
    if (plate) mo.observe(plate, { attributes: true, attributeFilter: ['data-accent'] });

    const render = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      /* the escapement: bezel steps once per second like a mechanical second-hand,
         a crisp eased snap instead of a smear */
      const s = Math.floor(t);
      if (s !== step) {
        step = s;
        ticks.forEach((tk, i) => {
          const isStep = i === s % 60;
          tk.scale.setScalar(isStep ? 1.55 : 1);
        });
      }
      ticks.forEach((tk, i) => {
        const isStep = i === step % 60;
        const target = isStep ? 1.55 : 1;
        tk.scale.x += (target - tk.scale.x) * Math.min(1, dt * 14);
        tk.scale.y = tk.scale.x;
      });
      ring.rotation.z -= dt * 0.03;

      /* gimbals precess on distinct true axes */
      gimbals[0].rotation.x += dt * 0.55;
      gimbals[0].rotation.y += dt * 0.11;
      gimbals[1].rotation.y -= dt * 0.4;
      gimbals[1].rotation.z += dt * 0.16;
      gimbals[2].rotation.z += dt * 0.62;
      gimbals[2].rotation.x -= dt * 0.09;
      cage.rotation.y += dt * 0.24;
      cage.rotation.x += dt * 0.07;

      /* the core breathes; the halo follows */
      const breath = 1 + Math.sin(t * 1.7) * 0.06;
      core.scale.setScalar(breath);
      halo.scale.setScalar(1.6 * breath + Math.sin(t * 2.3) * 0.1);
      halo.material.opacity = 0.2 + Math.sin(t * 1.7) * 0.05;

      /* satellite rides the outer gimbal's precessing plane */
      const g0 = gimbals[0];
      const v = new THREE.Vector3(Math.cos(t * 1.4) * 2.0, 0, Math.sin(t * 1.4) * 2.0);
      v.applyEuler(g0.rotation);
      sat.position.copy(v);
      trailPts.push(v.x, v.y, v.z);
      if (trailPts.length > TRAIL_PTS * 3) trailPts.splice(0, trailPts.length - TRAIL_PTS * 3);
      const attr = trailGeo.getAttribute('position') as THREE.BufferAttribute;
      /* right-align the newest point at the buffer end and draw only real
         points, so the trail grows behind the satellite — never to origin */
      const floatLen = trailPts.length;
      (attr.array as Float32Array).fill(0);
      (attr.array as Float32Array).set(trailPts, TRAIL_PTS * 3 - floatLen);
      attr.needsUpdate = true;
      trailGeo.setDrawRange(TRAIL_PTS - floatLen / 3, floatLen / 3);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      renderer.dispose();
      scene.traverse((o) => {
        const any = o as unknown as { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] };
        any.geometry?.dispose?.();
        const m = any.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m?.dispose?.();
      });
      haloTex.dispose();
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement);
    };
  }, [size]);

  return <div ref={hostRef} style={{ width: size, height: size }} aria-hidden="true" />;
}
