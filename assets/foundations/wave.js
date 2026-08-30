/* =========================================================================
   THE FOUNDATIONS — three wave-string ribbons + a stitched connector,
   adapted from the Regional Food Resilience Platform diagram.

   Top (amber)    = Foundation 01, Nutrient density
   Bottom (green) = Foundation 03, Civic-led delivery
   Middle (silver)= Foundation 04, New Food Economics
   Stitches       = Foundation 02, Collective buying power
   ========================================================================= */
import * as THREE from 'three';

const host = document.getElementById('rpCanvas');
if (host) {
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SMALL = window.matchMedia('(max-width:900px)').matches;

  const STRANDS = SMALL ? 22 : 40;
  const STEPS = SMALL ? 130 : 220;
  const BANDS = [
    { y: 0.44, colour: new THREE.Color('#e7964b'), spread: 0.055, amp: 0.115, key: 'top' },
    { y: 0.00, colour: new THREE.Color('#c9ced3'), spread: 0.070, amp: 0.095, key: 'mid' },
    { y: -0.44, colour: new THREE.Color('#2f9c66'), spread: 0.060, amp: 0.115, key: 'bot' }
  ];

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  const U = {
    uTime: { value: 0 }, uFin: { value: 0 }, uPort: { value: 0 }, uRegion: { value: 0 }, uTop: { value: 0 },
    uAspect: { value: 1 }, uDpr: { value: Math.min(2, window.devicePixelRatio || 1) }
  };

  const NOISE = `
    float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.545); }
    float n2(vec2 p){
      vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
      return mix(mix(h1(i), h1(i+vec2(1,0)), f.x), mix(h1(i+vec2(0,1)), h1(i+vec2(1,1)), f.x), f.y);
    }
    float waveY(float x, float strand, float t, float amp, float spread, float base){
      float w = (n2(vec2(x*4.2 + t*0.06, strand*1.9)) - 0.5) * 2.0;
      w += (n2(vec2(x*9.0 - t*0.04, strand*3.1)) - 0.5) * 0.7;
      float w2 = sin(x*11.0 + t*0.25 + strand*3.4) * 0.30;
      return base + (strand - 0.5) * spread + (w + w2) * amp;
    }`;

  /* ---------- the three ribbons ---------- */
  BANDS.forEach(band => {
    const segs = (STEPS - 1) * STRANDS;
    const aX = new Float32Array(segs * 2);
    const aS = new Float32Array(segs * 2);
    let k = 0;
    for (let s0 = 0; s0 < STRANDS; s0++) {
      const st = s0 / (STRANDS - 1);
      for (let i = 0; i < STEPS - 1; i++) {
        aX[k] = i / (STEPS - 1); aS[k] = st; k++;
        aX[k] = (i + 1) / (STEPS - 1); aS[k] = st; k++;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segs * 2 * 3), 3));
    g.setAttribute('aX', new THREE.BufferAttribute(aX, 1));
    g.setAttribute('aS', new THREE.BufferAttribute(aS, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: Object.assign({
        uColour: { value: band.colour }, uBase: { value: band.y },
        uAmp: { value: band.amp }, uSpread: { value: band.spread },
        uIsMid: { value: band.key === 'mid' ? 1 : 0 },
        uIsBot: { value: band.key === 'bot' ? 1 : 0 },
        uIsTop: { value: band.key === 'top' ? 1 : 0 }
      }, U),
      vertexShader: NOISE + `
        attribute float aX; attribute float aS;
        uniform float uTime, uBase, uAmp, uSpread, uAspect, uIsMid, uIsBot, uIsTop, uPort, uRegion, uTop;
        varying float vFade, vX;
        void main(){
          vX = aX;
          float y = waveY(aX, aS, uTime, uAmp, uSpread, uBase);
          y += uIsMid * uPort * 0.012 * sin(aX * 12.0 + uTime * 0.6);
          y += uIsTop * uTop * 0.010 * sin(aX * 10.0 + uTime * 0.5);
          float x = (aX * 2.0 - 1.0) * uAspect * 0.96;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, 0.0, 1.0);
          vFade = smoothstep(0.0, 0.16, aX) * smoothstep(1.0, 0.84, aX);
          vFade *= 0.28 + 0.72 * n2(vec2(aX * 9.0, aS * 4.0));
        }`,
      fragmentShader: `
        uniform vec3 uColour; uniform float uIsBot, uRegion, uIsTop, uTop;
        varying float vFade, vX;
        void main(){
          vec3 c = uColour;
          c += uIsBot * uRegion * smoothstep(0.35, 1.0, vX) * vec3(0.05, 0.32, 0.14);
          float glow = uIsTop * uTop * 0.6;
          gl_FragColor = vec4(c, vFade * (0.15 + glow));
        }`
    });
    scene.add(new THREE.LineSegments(g, m));
  });

  /* ---------- dashed verticals: Foundation 02, the stitch between top and bottom ---------- */
  (function stitches() {
    const COLS = [0.18, 0.31, 0.44, 0.57, 0.70, 0.83];
    const DASH = 26;
    const pos = [], aCol = [], aT = [];
    COLS.forEach((c) => {
      for (let d = 0; d < DASH; d++) {
        const t0 = d / DASH, t1 = t0 + 0.55 / DASH;
        pos.push(0, 0, 0, 0, 0, 0);
        aCol.push(c, c); aT.push(t0, t1);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aCol', new THREE.Float32BufferAttribute(aCol, 1));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: U,
      vertexShader: NOISE + `
        attribute float aCol; attribute float aT;
        uniform float uTime, uAspect, uFin;
        varying float vA;
        void main(){
          float yTop = waveY(aCol, 0.5, uTime, 0.115, 0.055, 0.44);
          float yBot = waveY(aCol, 0.5, uTime, 0.115, 0.060, -0.44);
          float y = mix(yTop, yBot, aT);
          float x = (aCol * 2.0 - 1.0) * uAspect * 0.96;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, 0.0, 1.0);
          float pulse = exp(-pow((aT - fract(uTime * 0.25)) * 5.0, 2.0));
          vA = 0.16 + uFin * (0.3 + pulse * 0.75);
        }`,
      fragmentShader: `varying float vA;
        void main(){ gl_FragColor = vec4(0.72, 0.80, 0.98, vA); }`
    });
    scene.add(new THREE.LineSegments(g, m));
  })();

  /* ---------- pins riding the middle wave: Foundation 04 ---------- */
  (function pins() {
    const X = [0.20, 0.28, 0.36, 0.43, 0.52, 0.60, 0.69, 0.78, 0.86];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Array(X.length * 3).fill(0), 3));
    g.setAttribute('aCol', new THREE.Float32BufferAttribute(X, 1));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(X.map((v, i) => i / X.length), 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false, uniforms: U,
      vertexShader: NOISE + `
        attribute float aCol; attribute float aSeed;
        uniform float uTime, uAspect, uPort, uDpr;
        varying float vA;
        void main(){
          float strand = 0.30 + 0.40 * n2(vec2(aSeed * 12.0, 3.0));
          float y = waveY(aCol, strand, uTime, 0.095, 0.070, 0.0);
          y += uPort * 0.02;
          float x = (aCol * 2.0 - 1.0) * uAspect * 0.96;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, 0.0, 1.0);
          float pulse = 0.5 + 0.5 * sin(uTime * 2.2 + aSeed * 9.0);
          gl_PointSize = (5.0 + uPort * (5.0 + pulse * 4.0)) * uDpr;
          vA = 0.42 + uPort * 0.58;
        }`,
      fragmentShader: `
        varying float vA;
        void main(){
          vec2 d = gl_PointCoord - 0.5;
          float r = dot(d, d);
          if(r > 0.25) discard;
          float core = smoothstep(0.25, 0.02, r);
          gl_FragColor = vec4(vec3(0.93, 0.95, 0.97), core * vA);
        }`
    });
    scene.add(new THREE.Points(g, m));
  })();

  /* ---------- Foundation 02 glow: buying power gathering near the stitches ---------- */
  (function financing() {
    const BLOCKS = [[0.30, 0.62, 0.30], [0.42, 0.86, 0.22], [0.62, 0.94, 0.26]];
    BLOCKS.forEach(([x0, x1, h], i) => {
      const g = new THREE.PlaneGeometry(1, 1);
      const m = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: Object.assign({ uX0: { value: x0 }, uX1: { value: x1 }, uH: { value: h }, uI: { value: i } }, U),
        vertexShader: `
          uniform float uX0, uX1, uH, uAspect;
          varying vec2 vUv;
          void main(){
            vUv = uv;
            float xc = mix(uX0, uX1, uv.x);
            float x = (xc * 2.0 - 1.0) * uAspect * 0.96;
            float y = (uv.y - 0.5) * uH;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, 0.0, 1.0);
          }`,
        fragmentShader: `
          uniform float uFin, uTime, uI;
          varying vec2 vUv;
          void main(){
            float ex = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x);
            float ey = smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.78, vUv.y);
            float breathe = 0.85 + 0.15 * sin(uTime * 1.1 + uI * 2.0);
            float a = ex * ey * (0.05 + uFin * 0.38) * breathe;
            gl_FragColor = vec4(0.55, 0.68, 1.0, a);
          }`
      });
      scene.add(new THREE.Mesh(g, m));
    });
  })();

  /* ---------- vegetation on the green wave: Foundation 03, civic-led delivery ---------- */
  (function growth() {
    const N = SMALL ? 46 : 90;
    const pos = [], aCol = [], aT = [], aSeed = [];
    for (let i = 0; i < N; i++) {
      const c = 0.32 + (i / N) * 0.64;
      const seed = i / N;
      for (let k = 0; k < 2; k++) {
        pos.push(0, 0, 0, 0, 0, 0);
        aCol.push(c, c); aT.push(0, 1); aSeed.push(seed + k * 0.13, seed + k * 0.13);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aCol', new THREE.Float32BufferAttribute(aCol, 1));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(aSeed, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: U,
      vertexShader: NOISE + `
        attribute float aCol; attribute float aT; attribute float aSeed;
        uniform float uTime, uAspect, uRegion;
        varying float vA;
        void main(){
          float base = waveY(aCol, 0.62, uTime, 0.115, 0.060, -0.44);
          float hgt = (0.02 + 0.05 * n2(vec2(aSeed * 21.0, 7.0)));
          float local = smoothstep(0.0, 0.55, uRegion * 1.35 - (aCol - 0.32) * 0.5);
          float sway = sin(uTime * 0.9 + aSeed * 14.0) * 0.006 * aT;
          float y = base + hgt * aT * local;
          float x = (aCol * 2.0 - 1.0) * uAspect * 0.96 + sway;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, 0.0, 1.0);
          vA = local * (0.20 + 0.55 * (1.0 - aT));
        }`,
      fragmentShader: `varying float vA;
        void main(){ gl_FragColor = vec4(0.44, 0.86, 0.58, vA); }`
    });
    scene.add(new THREE.LineSegments(g, m));
  })();

  /* ---------- hover wiring: each foundation text block drives its own effect ---------- */
  const want = { fin: 0, port: 0, region: 0, top: 0 };
  document.querySelectorAll('#foundations .rp-fnd[data-k]').forEach(el => {
    const k = el.dataset.k;
    const on = () => { want[k] = 1; };
    const off = () => { want[k] = 0; };
    el.addEventListener('mouseenter', on);
    el.addEventListener('mouseleave', off);
    el.addEventListener('focus', on);
    el.addEventListener('blur', off);
  });

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    U.uAspect.value = w / h;
    camera.left = -U.uAspect.value; camera.right = U.uAspect.value;
    camera.top = 1; camera.bottom = -1;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(() => resize()).observe(host);
  resize();

  let visible = false;
  new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; }), { rootMargin: '200px' })
    .observe(host);

  const t0 = performance.now();
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    U.uTime.value = REDUCED ? 0 : (performance.now() - t0) / 1000;
    U.uFin.value += (want.fin - U.uFin.value) * 0.08;
    U.uPort.value += (want.port - U.uPort.value) * 0.08;
    U.uRegion.value += (want.region - U.uRegion.value) * 0.06;
    U.uTop.value += (want.top - U.uTop.value) * 0.08;
    renderer.render(scene, camera);
  });
}
