/* =========================================================================
   THE FOUNDATIONS — three wave-string ribbons + a woven connector,
   adapted from the Regional Food Resilience Platform diagram.

   Top (amber)    = Foundation 01, Civic-led delivery
   Bottom (green) = Foundation 03, Nutrient density
   Middle (silver)= Foundation 04, New Food Economics
   Weave          = Foundation 02, Collective buying power
   ========================================================================= */
import * as THREE from 'three';

const host = document.getElementById('rpCanvas');
if (host) {
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SMALL = window.matchMedia('(max-width:900px)').matches;

  const STRANDS = SMALL ? 22 : 40;
  const STEPS = SMALL ? 130 : 220;
  const SPAN = 0.62; // how far top/bottom bands sit from centre -- wider spread
  const BANDS = [
    { y: SPAN, colour: new THREE.Color('#e7964b'), spread: 0.050, amp: 0.100, key: 'top' },
    { y: 0.00, colour: new THREE.Color('#c9ced3'), spread: 0.065, amp: 0.085, key: 'mid' },
    { y: -SPAN, colour: new THREE.Color('#2f9c66'), spread: 0.055, amp: 0.100, key: 'bot' }
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

  const TOP_BASE = SPAN, BOT_BASE = -SPAN;

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

  /* ---------- Foundation 02: a woven, crossing mesh between top and bottom,
     not straight struts -- reads as coordination/alignment rather than a fixed grid ---------- */
  (function weave() {
    const THREADS = SMALL ? 12 : 18;
    const WSTEPS = 40;
    const pos = [], aT = [], aSeed = [], aColTop = [], aColBot = [];
    for (let i = 0; i < THREADS; i++) {
      const seed = i / THREADS;
      const colTop = 0.14 + (i / (THREADS - 1)) * 0.74;
      // each thread lands on a DIFFERENT bottom column than its top column,
      // so threads cross one another -- many buyers, one coordinated pool
      const colBot = 0.14 + ((i * 0.61 + 0.3) % 1) * 0.74;
      for (let s = 0; s < WSTEPS - 1; s++) {
        pos.push(0, 0, 0, 0, 0, 0);
        aT.push(s / (WSTEPS - 1), (s + 1) / (WSTEPS - 1));
        aSeed.push(seed, seed);
        aColTop.push(colTop, colTop);
        aColBot.push(colBot, colBot);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(aSeed, 1));
    g.setAttribute('aColTop', new THREE.Float32BufferAttribute(aColTop, 1));
    g.setAttribute('aColBot', new THREE.Float32BufferAttribute(aColBot, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: U,
      vertexShader: NOISE + `
        attribute float aT; attribute float aSeed; attribute float aColTop; attribute float aColBot;
        uniform float uTime, uAspect, uFin;
        varying float vA;
        void main(){
          float col = mix(aColTop, aColBot, aT);
          float yTop = waveY(aColTop, 0.5, uTime, 0.100, 0.050, ${TOP_BASE.toFixed(3)});
          float yBot = waveY(aColBot, 0.5, uTime, 0.100, 0.055, ${BOT_BASE.toFixed(3)});
          float y = mix(yTop, yBot, aT);
          /* the sinuous, slightly messy sway -- alignment, not a rigid strut */
          float sway = sin(aT * 3.14159265) * (0.05 + 0.035 * sin(uTime * 0.35 + aSeed * 9.0));
          sway += sin(aT * 3.14159265 * 2.0 + aSeed * 14.0 + uTime * 0.5) * 0.018 * sin(aT * 3.14159265);
          float x = (col * 2.0 - 1.0) * uAspect * 0.96 + sway;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, 0.0, 1.0);
          float pulse = exp(-pow((aT - fract(uTime * 0.2 + aSeed)) * 4.5, 2.0));
          float edge = smoothstep(0.0, 0.08, aT) * smoothstep(1.0, 0.92, aT);
          vA = edge * (0.12 + uFin * (0.30 + pulse * 0.7));
        }`,
      fragmentShader: `varying float vA;
        void main(){ gl_FragColor = vec4(0.72, 0.80, 0.98, vA); }`
    });
    scene.add(new THREE.LineSegments(g, m));
  })();

  /* ---------- Foundation 04: New Food Economics -- a shimmering interference
     field along the middle band (many overlapping instruments), not discrete pins ---------- */
  (function shimmer() {
    const LAYERS = 5;
    const segs = (STEPS - 1) * LAYERS;
    const aX = new Float32Array(segs * 2);
    const aL = new Float32Array(segs * 2);
    let k = 0;
    for (let l = 0; l < LAYERS; l++) {
      for (let i = 0; i < STEPS - 1; i++) {
        aX[k] = i / (STEPS - 1); aL[k] = l; k++;
        aX[k] = (i + 1) / (STEPS - 1); aL[k] = l; k++;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segs * 2 * 3), 3));
    g.setAttribute('aX', new THREE.BufferAttribute(aX, 1));
    g.setAttribute('aL', new THREE.BufferAttribute(aL, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: U,
      vertexShader: NOISE + `
        attribute float aX; attribute float aL;
        uniform float uTime, uAspect, uPort;
        varying float vA;
        void main(){
          /* each layer is the middle wave re-read at a slightly different
             frequency/phase -- overlapping instruments interfering, not points */
          float freqShift = 1.0 + aL * 0.14;
          float phase = aL * 1.7;
          float y = waveY(aX * freqShift, 0.5, uTime * 0.8 + phase, 0.085, 0.10 + aL * 0.03, 0.0);
          y += uPort * 0.03 * sin(aX * 8.0 + uTime * 0.7 + aL);
          float x = (aX * 2.0 - 1.0) * uAspect * 0.96;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, 0.0, 1.0);
          float edge = smoothstep(0.0, 0.12, aX) * smoothstep(1.0, 0.88, aX);
          vA = edge * (0.05 + uPort * 0.22) / (1.0 + aL * 0.4);
        }`,
      fragmentShader: `varying float vA;
        void main(){ gl_FragColor = vec4(0.80, 0.83, 0.90, vA); }`
    });
    scene.add(new THREE.LineSegments(g, m));
  })();

  /* ---------- Foundation 03: nutrient density / soil regeneration -- messy clustered
     shrub-and-canopy blobs in mixed grey/green tones (point-cloud canopy, lichen-on-bark
     reference), not tidy blades of grass ---------- */
  (function growth() {
    const CLUSTERS = [
      { n: SMALL ? 6 : 10, pts: SMALL ? 26 : 46, rx: [0.045, 0.078], ry: [0.05, 0.09], greyBias: 0.55 },  // canopy shrubs -- larger, greyer/lichen-toned
      { n: SMALL ? 9 : 16, pts: SMALL ? 14 : 24, rx: [0.024, 0.044], ry: [0.03, 0.05], greyBias: 0.30 },  // mid shrubs
      { n: SMALL ? 16 : 28, pts: SMALL ? 5 : 9, rx: [0.010, 0.018], ry: [0.012, 0.02], greyBias: 0.10 }  // low ground clumps -- mostly green
    ];
    CLUSTERS.forEach(tier => {
      const pos = [], aCol = [], aOffX = [], aOffY = [], aTone = [], aSize = [], aSeed = [];
      for (let i = 0; i < tier.n; i++) {
        const c = 0.28 + n2rand(i, tier.n) * 0.68;
        const rx = tier.rx[0] + Math.random() * (tier.rx[1] - tier.rx[0]);
        const ry = tier.ry[0] + Math.random() * (tier.ry[1] - tier.ry[0]);
        const seed = i / tier.n;
        for (let p = 0; p < tier.pts; p++) {
          /* uniform-disk-ish scatter, upper half only -- a dome/canopy blob sitting on the wave */
          const rr = Math.sqrt(Math.random());
          const ang = Math.random() * Math.PI;
          pos.push(0, 0, 0);
          aCol.push(c);
          aOffX.push(Math.cos(ang) * rr * rx);
          aOffY.push(Math.sin(ang) * rr * ry);
          aTone.push(Math.random() < tier.greyBias ? (0.55 + Math.random() * 0.45) : (Math.random() * 0.35));
          aSize.push(1.4 + Math.random() * 2.3);
          aSeed.push(seed + p * 0.013);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('aCol', new THREE.Float32BufferAttribute(aCol, 1));
      g.setAttribute('aOffX', new THREE.Float32BufferAttribute(aOffX, 1));
      g.setAttribute('aOffY', new THREE.Float32BufferAttribute(aOffY, 1));
      g.setAttribute('aTone', new THREE.Float32BufferAttribute(aTone, 1));
      g.setAttribute('aSize', new THREE.Float32BufferAttribute(aSize, 1));
      g.setAttribute('aSeed', new THREE.Float32BufferAttribute(aSeed, 1));
      const m = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: U,
        vertexShader: NOISE + `
          attribute float aCol; attribute float aOffX; attribute float aOffY; attribute float aTone; attribute float aSize; attribute float aSeed;
          uniform float uTime, uAspect, uRegion, uDpr;
          varying float vA; varying float vTone;
          void main(){
            float base = waveY(aCol, 0.62, uTime, 0.100, 0.055, ${BOT_BASE.toFixed(3)});
            /* whole shrub blob reveals together as the sweep passes its column */
            float local = smoothstep(0.0, 0.55, uRegion * 1.35 - (aCol - 0.30) * 0.48);
            float sway = sin(uTime * 0.7 + aSeed * 20.0) * 0.004 * local;
            float y = base + aOffY * local + sway;
            float x = (aCol * 2.0 - 1.0) * uAspect * 0.96 + aOffX * local;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, 0.0, 1.0);
            gl_PointSize = aSize * uDpr * (0.5 + local * 0.9);
            vA = local * (0.35 + 0.4 * (1.0 - aOffY * 11.0));
            vTone = aTone;
          }`,
        fragmentShader: `
          varying float vA; varying float vTone;
          void main(){
            vec2 uv = gl_PointCoord * 2.0 - 1.0;
            float d = length(uv);
            float shape = smoothstep(1.0, 0.2, d);
            if (shape < 0.03) discard;
            vec3 green = vec3(0.30, 0.62, 0.32);
            vec3 grey  = vec3(0.52, 0.55, 0.50);
            vec3 col = mix(green, grey, vTone);
            gl_FragColor = vec4(col, shape * vA);
          }`
      });
      scene.add(new THREE.Points(g, m));
    });
  })();

  /* ---------- Foundation 01: civic-led delivery -- small hub markers (grocers,
     dinners, workshops, community-run hubs) lighting up along the top wave ---------- */
  (function nodes() {
    const N = SMALL ? 10 : 16;
    const pos = new Float32Array(N * 3);
    const aCol = new Float32Array(N);
    const aSeed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      aCol[i] = 0.09 + n2rand(i, N) * 0.82;
      aSeed[i] = i / N;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aCol', new THREE.BufferAttribute(aCol, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: U,
      vertexShader: NOISE + `
        attribute float aCol; attribute float aSeed;
        uniform float uTime, uAspect, uTop, uDpr;
        varying float vA;
        void main(){
          float y = waveY(aCol, 0.5, uTime, 0.100, 0.050, ${TOP_BASE.toFixed(3)});
          y += uTop * 0.010 * sin(aCol * 10.0 + uTime * 0.5);
          float x = (aCol * 2.0 - 1.0) * uAspect * 0.96;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, 0.0, 1.0);
          float pulse = 0.5 + 0.5 * sin(uTime * 1.7 + aSeed * 26.0);
          gl_PointSize = (3.0 + uTop * 5.5 * pulse) * uDpr;
          vA = uTop * (0.45 + pulse * 0.55);
        }`,
      fragmentShader: `
        varying float vA;
        void main(){
          vec2 uv = gl_PointCoord * 2.0 - 1.0;
          float d = length(uv);
          float ring = smoothstep(1.0, 0.80, d) - smoothstep(0.55, 0.38, d);
          float core = smoothstep(0.42, 0.0, d) * 0.55;
          float shape = max(ring, core);
          if (shape < 0.02) discard;
          gl_FragColor = vec4(1.0, 0.82, 0.58, shape * vA);
        }`
    });
    scene.add(new THREE.Points(g, m));
  })();

  function n2rand(i, n) {
    /* low-discrepancy-ish spread so plants don't clump, without needing Math.random for position */
    const x = (i * 0.61803398875) % 1;
    return x * 0.94 + (i / n) * 0.06;
  }

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
