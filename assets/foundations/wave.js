/* =========================================================================
   PATHWAYS — four wave-string ribbons, one per pathway, plus the woven
   connectors between them, adapted from the Regional Food Resilience
   Platform diagram.

   Ribbons run top to bottom in pathway order, so each label sits with
   its own layer:

   Pathway 01, Civic-led delivery          amber   +SPAN
   Pathway 02, Collective buying power     violet  +SPAN/3
   Pathway 03, New Food Economics          silver  -SPAN/3
   Pathway 04, Nutrient density            green   -SPAN

   The outer two keep their original positions, so everything woven
   between them — the buying network and its supply roots, the cocoons,
   the shrub growth on the land wave — is unchanged.
   ========================================================================= */
import * as THREE from 'three';

const host = document.getElementById('rpCanvas');
if (host) {
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SMALL = window.matchMedia('(max-width:900px)').matches;

  const STRANDS = SMALL ? 22 : 40;
  const STEPS = SMALL ? 130 : 220;
  const SPAN = 0.62; // how far top/bottom bands sit from centre -- wider spread
  const INNER = SPAN / 3; // the two inner pathways, evenly spaced against the outer pair
  const BANDS = [
    { y: SPAN, colour: new THREE.Color('#e7964b'), spread: 0.050, amp: 0.100, key: 'top' },
    { y: INNER, colour: new THREE.Color('#a98cf5'), spread: 0.052, amp: 0.088, key: 'buy' },
    { y: -INNER, colour: new THREE.Color('#c9ced3'), spread: 0.065, amp: 0.085, key: 'mid' },
    { y: -SPAN, colour: new THREE.Color('#4fb488'), spread: 0.055, amp: 0.100, key: 'bot' }
  ];

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: SMALL });
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

  const TOP_BASE = SPAN, BOT_BASE = -SPAN, MID_BASE = -INNER;

  /* ---------- the four ribbons ---------- */
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
        uIsTop: { value: band.key === 'top' ? 1 : 0 },
        uIsBuy: { value: band.key === 'buy' ? 1 : 0 }
      }, U),
      vertexShader: NOISE + `
        attribute float aX; attribute float aS;
        uniform float uTime, uBase, uAmp, uSpread, uAspect, uIsMid, uIsBot, uIsTop, uIsBuy, uPort, uRegion, uTop, uFin;
        varying float vFade, vX;
        void main(){
          vX = aX;
          float y = waveY(aX, aS, uTime, uAmp, uSpread, uBase);
          y += uIsMid * uPort * 0.012 * sin(aX * 12.0 + uTime * 0.6);
          y += uIsTop * uTop * 0.010 * sin(aX * 10.0 + uTime * 0.5);
          y += uIsBuy * uFin * 0.011 * sin(aX * 11.0 + uTime * 0.55);
          float x = (aX * 2.0 - 1.0) * uAspect * 0.96;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, 0.0, 1.0);
          vFade = smoothstep(0.0, 0.16, aX) * smoothstep(1.0, 0.84, aX);
          vFade *= 0.28 + 0.72 * n2(vec2(aX * 9.0, aS * 4.0));
        }`,
      fragmentShader: `
        uniform vec3 uColour; uniform float uIsBot, uRegion, uIsTop, uTop, uIsBuy, uFin;
        varying float vFade, vX;
        void main(){
          vec3 c = uColour;
          c += uIsBot * uRegion * smoothstep(0.35, 1.0, vX) * vec3(0.05, 0.32, 0.14);
          float glow = uIsTop * uTop * 0.6 + uIsBuy * uFin * 0.6;
          gl_FragColor = vec4(c, vFade * (0.15 + glow));
        }`
    });
    scene.add(new THREE.LineSegments(g, m));
  });

  /* ---------- Pathway 02: coordinated buying power -- a gentle network of hub
     nodes on the city (orange) wave, each reaching organic, branching supply
     roots down into the countryside (green) wave to draw resources up --
     a river-delta / root-system shape, not a fixed crossing grid ---------- */
  (function network() {
    const NODES = SMALL ? 8 : 12;
    const cols = [];
    for (let i = 0; i < NODES; i++) cols.push(0.10 + (i / (NODES - 1)) * 0.80);

    /* gentle connecting lines between neighbouring hub nodes -- a loose graph,
       not a rigid grid */
    const LSTEPS = 16;
    const pos = [], aT = [], aSeed = [], aColA = [], aColB = [];
    for (let i = 0; i < NODES; i++) {
      [1, 2].forEach(skip => {
        const j = i + skip;
        if (j >= NODES) return;
        const seed = (i + skip * 0.5) / NODES;
        for (let s = 0; s < LSTEPS - 1; s++) {
          pos.push(0, 0, 0, 0, 0, 0);
          aT.push(s / (LSTEPS - 1), (s + 1) / (LSTEPS - 1));
          aSeed.push(seed, seed);
          aColA.push(cols[i], cols[i]);
          aColB.push(cols[j], cols[j]);
        }
      });
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(aSeed, 1));
    g.setAttribute('aColA', new THREE.Float32BufferAttribute(aColA, 1));
    g.setAttribute('aColB', new THREE.Float32BufferAttribute(aColB, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: U,
      vertexShader: NOISE + `
        attribute float aT; attribute float aSeed; attribute float aColA; attribute float aColB;
        uniform float uTime, uAspect, uFin;
        varying float vA;
        void main(){
          float col = mix(aColA, aColB, aT);
          float y = waveY(col, 0.5, uTime, 0.100, 0.050, ${TOP_BASE.toFixed(3)});
          y += sin(aT * 3.14159265) * 0.012 * sin(uTime * 0.4 + aSeed * 10.0);
          float x = (col * 2.0 - 1.0) * uAspect * 0.96;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, 0.0, 1.0);
          float edge = smoothstep(0.0, 0.1, aT) * smoothstep(1.0, 0.9, aT);
          vA = edge * (0.05 + uFin * 0.16);
        }`,
      fragmentShader: `varying float vA;
        void main(){ gl_FragColor = vec4(1.0, 0.75, 0.52, vA); }`
    });
    scene.add(new THREE.LineSegments(g, m));

    /* the hub nodes themselves -- small dots that brighten as the network activates */
    const npos = new Float32Array(NODES * 3);
    const ncol = new Float32Array(NODES);
    for (let i = 0; i < NODES; i++) ncol[i] = cols[i];
    const ng = new THREE.BufferGeometry();
    ng.setAttribute('position', new THREE.BufferAttribute(npos, 3));
    ng.setAttribute('aCol', new THREE.BufferAttribute(ncol, 1));
    const nm = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: U,
      vertexShader: NOISE + `
        attribute float aCol;
        uniform float uTime, uAspect, uFin, uDpr;
        varying float vA;
        void main(){
          float y = waveY(aCol, 0.5, uTime, 0.100, 0.050, ${TOP_BASE.toFixed(3)});
          float x = (aCol * 2.0 - 1.0) * uAspect * 0.96;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, 0.0, 1.0);
          gl_PointSize = (2.2 + uFin * 2.6) * uDpr;
          vA = 0.30 + uFin * 0.55;
        }`,
      fragmentShader: `varying float vA;
        void main(){
          float d = length(gl_PointCoord * 2.0 - 1.0);
          float shape = smoothstep(1.0, 0.2, d);
          if (shape < 0.03) discard;
          gl_FragColor = vec4(1.0, 0.78, 0.55, shape * vA);
        }`
    });
    scene.add(new THREE.Points(ng, nm));
  })();

  /* branching supply roots: a handful of hub nodes send organic, river-delta
     branches down to several points on the green wave, converging into one
     coordinated pull rather than many separate straight lines -- and small
     particles physically travel from the countryside up into the city,
     an octopus-like reach-and-draw-in rather than a static link */
  (function reach() {
    const HUBS = SMALL ? 3 : 5;
    const LEAVES = SMALL ? 4 : 6;
    const SPLIT = 0.42;
    const RSTEPS = 26;
    const hubCols = [], leafCols = [];
    for (let h = 0; h < HUBS; h++) {
      const hubCol = 0.14 + ((h + 0.5) / HUBS) * 0.74;
      hubCols.push(hubCol);
      leafCols.push([]);
      for (let l = 0; l < LEAVES; l++) {
        const spread = (l / (LEAVES - 1) - 0.5) * 0.34;
        leafCols[h].push(Math.min(0.94, Math.max(0.06, hubCol + spread)));
      }
    }

    const pos = [], aT = [], aSeed = [], aColTop = [], aColBot = [];
    for (let h = 0; h < HUBS; h++) {
      for (let l = 0; l < LEAVES; l++) {
        const seed = h / HUBS + l * 0.017;
        for (let s = 0; s < RSTEPS - 1; s++) {
          pos.push(0, 0, 0, 0, 0, 0);
          aT.push(s / (RSTEPS - 1), (s + 1) / (RSTEPS - 1));
          aSeed.push(seed, seed);
          aColTop.push(hubCols[h], hubCols[h]);
          aColBot.push(leafCols[h][l], leafCols[h][l]);
        }
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
        varying float vA; varying float vT;
        void main(){
          /* a shared trunk near the hub, forking into separate roots past the split */
          float fork = smoothstep(${SPLIT}, 1.0, aT);
          float col = mix(aColTop, aColBot, fork);
          float yTop = waveY(aColTop, 0.5, uTime, 0.100, 0.050, ${TOP_BASE.toFixed(3)});
          float yBot = waveY(aColBot, 0.5, uTime, 0.100, 0.055, ${BOT_BASE.toFixed(3)});
          float y = mix(yTop, yBot, aT);
          /* an organic bow along the whole reach -- root or tentacle, not a plumb line --
             plus a finer wobble; both taper to zero exactly at the hub and the leaf */
          float taper = sin(aT * 3.14159265);
          float bow = taper * (0.065 + 0.028 * sin(aSeed * 24.0));
          float wobble = sin(aT * 3.14159265 * 2.6 + aSeed * 18.0 + uTime * 0.35) * 0.026 * taper;
          float sway = bow + wobble;
          float x = (col * 2.0 - 1.0) * uAspect * 0.96 + sway;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, 0.0, 1.0);

          /* roots grow outward from the hub as buying power activates, with a
             gentle breathing reach rather than snapping fully open at once */
          float breathe = 0.5 + 0.5 * sin(uTime * 0.55 + aSeed * 8.0);
          float grownTo = 0.05 + uFin * (0.97 + 0.05 * breathe);
          float drawn = smoothstep(grownTo + 0.05, grownTo - 0.10, aT);

          /* resource pulled up from the countryside toward the city */
          float pull = exp(-pow((aT - fract(1.0 - uTime * 0.22 - aSeed)) * 5.0, 2.0));
          float edge = smoothstep(0.0, 0.03, aT) * smoothstep(1.0, 0.95, aT);
          vA = edge * drawn * (0.08 + uFin * 0.20 + pull * uFin * 0.65);
          vT = aT;
        }`,
      fragmentShader: `varying float vA; varying float vT;
        void main(){
          vec3 city = vec3(1.0, 0.70, 0.45);
          vec3 country = vec3(0.55, 0.85, 0.55);
          vec3 col = mix(city, country, vT);
          gl_FragColor = vec4(col, vA);
        }`
    });
    scene.add(new THREE.LineSegments(g, m));

    const PPR = SMALL ? 2 : 3;
    const ppos = [], pColTop = [], pColBot = [], pSeed = [], pBranchSeed = [];
    for (let h = 0; h < HUBS; h++) {
      for (let l = 0; l < LEAVES; l++) {
        const branchSeed = h / HUBS + l * 0.017;
        for (let p = 0; p < PPR; p++) {
          ppos.push(0, 0, 0);
          pColTop.push(hubCols[h]); pColBot.push(leafCols[h][l]);
          pSeed.push((h * LEAVES + l) / (HUBS * LEAVES) + p * 0.31);
          pBranchSeed.push(branchSeed);
        }
      }
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute(ppos, 3));
    pg.setAttribute('aColTop', new THREE.Float32BufferAttribute(pColTop, 1));
    pg.setAttribute('aColBot', new THREE.Float32BufferAttribute(pColBot, 1));
    pg.setAttribute('aSeed', new THREE.Float32BufferAttribute(pSeed, 1));
    pg.setAttribute('aBranchSeed', new THREE.Float32BufferAttribute(pBranchSeed, 1));
    const pm = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: U,
      vertexShader: NOISE + `
        attribute float aColTop; attribute float aColBot; attribute float aSeed; attribute float aBranchSeed;
        uniform float uTime, uAspect, uFin, uDpr;
        varying float vA; varying float vT;
        void main(){
          float t = fract(1.0 - uTime * 0.22 - aSeed);
          float fork = smoothstep(${SPLIT}, 1.0, t);
          float col = mix(aColTop, aColBot, fork);
          float yTop = waveY(aColTop, 0.5, uTime, 0.100, 0.050, ${TOP_BASE.toFixed(3)});
          float yBot = waveY(aColBot, 0.5, uTime, 0.100, 0.055, ${BOT_BASE.toFixed(3)});
          float y = mix(yTop, yBot, t);
          float taper = sin(t * 3.14159265);
          float bow = taper * (0.065 + 0.028 * sin(aBranchSeed * 24.0));
          float wobble = sin(t * 3.14159265 * 2.6 + aBranchSeed * 18.0 + uTime * 0.35) * 0.026 * taper;
          float x = (col * 2.0 - 1.0) * uAspect * 0.96 + bow + wobble;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, 0.0, 1.0);
          gl_PointSize = (2.0 + (1.0 - t) * 2.4) * uDpr * uFin;
          vA = uFin * (0.35 + 0.5 * smoothstep(0.0, 0.3, 1.0 - t));
          vT = t;
        }`,
      fragmentShader: `varying float vA; varying float vT;
        void main(){
          float d = length(gl_PointCoord * 2.0 - 1.0);
          float shape = smoothstep(1.0, 0.2, d);
          if (shape < 0.03) discard;
          vec3 city = vec3(1.0, 0.72, 0.40);
          vec3 country = vec3(0.55, 0.90, 0.55);
          vec3 col = mix(city, country, vT);
          gl_FragColor = vec4(col, shape * vA);
        }`
    });
    scene.add(new THREE.Points(pg, pm));
  })();

  /* ---------- Pathway 03: New Food Economics -- a shimmering interference
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
          float y = waveY(aX * freqShift, 0.5, uTime * 0.8 + phase, 0.085, 0.10 + aL * 0.03, ${MID_BASE.toFixed(3)});
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

  /* ---------- Pathway 03 also bridges the two sides it sits between: closed,
     woven "cocoons" of silk-like strands encircle the space between a point on the
     city wave and a point on the countryside wave -- the instrument that lets
     demand and supply meet, not a discrete pin. Small gold glints (a local
     currency) circulate inside each cocoon rather than travelling one way. ---------- */
  (function cocoon() {
    const HUBS = SMALL ? 3 : 5;
    const STRANDS = SMALL ? 3 : 5;
    const CSTEPS = 48;
    const hubCols = [];
    for (let h = 0; h < HUBS; h++) hubCols.push(0.14 + ((h + 0.5) / HUBS) * 0.74);

    const pos = [], aT = [], aSeed = [], aHubCol = [];
    for (let h = 0; h < HUBS; h++) {
      for (let s = 0; s < STRANDS; s++) {
        const seed = h / HUBS + s * 0.093;
        for (let i = 0; i < CSTEPS - 1; i++) {
          pos.push(0, 0, 0, 0, 0, 0);
          aT.push(i / (CSTEPS - 1), (i + 1) / (CSTEPS - 1));
          aSeed.push(seed, seed);
          aHubCol.push(hubCols[h], hubCols[h]);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1));
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(aSeed, 1));
    g.setAttribute('aHubCol', new THREE.Float32BufferAttribute(aHubCol, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: U,
      vertexShader: NOISE + `
        attribute float aT; attribute float aSeed; attribute float aHubCol;
        uniform float uTime, uAspect, uPort;
        varying float vA;
        void main(){
          /* a closed loop: down one side of the lens, back up the other --
             pinched at the city wave and the countryside wave, wide between */
          float arcT = aT < 0.5 ? aT * 2.0 : (1.0 - aT) * 2.0;
          float side = aT < 0.5 ? -1.0 : 1.0;
          float yTop = waveY(aHubCol, 0.5, uTime, 0.100, 0.050, ${TOP_BASE.toFixed(3)});
          float yBot = waveY(aHubCol, 0.5, uTime, 0.100, 0.055, ${BOT_BASE.toFixed(3)});
          float y = mix(yTop, yBot, arcT);
          float lens = sin(arcT * 3.14159265);
          float amp = 0.050 + 0.022 * sin(aSeed * 19.0);
          float weave = sin(arcT * 3.14159265 * 3.0 + aSeed * 22.0 + uTime * 0.5) * 0.009;
          float x = (aHubCol * 2.0 - 1.0) * uAspect * 0.96 + side * lens * amp + weave;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, 0.0, 1.0);

          float breathe = 0.5 + 0.5 * sin(uTime * 0.5 + aSeed * 7.0);
          vA = uPort * (0.09 + 0.24 * breathe);
        }`,
      fragmentShader: `varying float vA;
        void main(){ gl_FragColor = vec4(0.82, 0.85, 0.92, vA); }`
    });
    scene.add(new THREE.LineSegments(g, m));

    /* gold glints circulating inside each cocoon -- currency in motion, not a transfer */
    const GLINTS = SMALL ? 2 : 3;
    const gpos = [], gHubCol = [], gSeed = [];
    for (let h = 0; h < HUBS; h++) {
      for (let i = 0; i < GLINTS; i++) {
        gpos.push(0, 0, 0);
        gHubCol.push(hubCols[h]);
        gSeed.push(i / GLINTS + h * 0.27);
      }
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(gpos, 3));
    gg.setAttribute('aHubCol', new THREE.Float32BufferAttribute(gHubCol, 1));
    gg.setAttribute('aSeed', new THREE.Float32BufferAttribute(gSeed, 1));
    const gm = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: U,
      vertexShader: NOISE + `
        attribute float aHubCol; attribute float aSeed;
        uniform float uTime, uAspect, uPort, uDpr;
        varying float vA;
        void main(){
          float t = fract(uTime * 0.14 + aSeed);
          float arcT = t < 0.5 ? t * 2.0 : (1.0 - t) * 2.0;
          float side = t < 0.5 ? -1.0 : 1.0;
          float yTop = waveY(aHubCol, 0.5, uTime, 0.100, 0.050, ${TOP_BASE.toFixed(3)});
          float yBot = waveY(aHubCol, 0.5, uTime, 0.100, 0.055, ${BOT_BASE.toFixed(3)});
          float y = mix(yTop, yBot, arcT);
          float lens = sin(arcT * 3.14159265);
          float x = (aHubCol * 2.0 - 1.0) * uAspect * 0.96 + side * lens * 0.058;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, 0.0, 1.0);
          gl_PointSize = (2.2 + lens * 1.6) * uDpr * uPort;
          vA = uPort * (0.5 + 0.5 * lens);
        }`,
      fragmentShader: `varying float vA;
        void main(){
          float d = length(gl_PointCoord * 2.0 - 1.0);
          float shape = smoothstep(1.0, 0.2, d);
          if (shape < 0.03) discard;
          gl_FragColor = vec4(1.0, 0.85, 0.55, shape * vA);
        }`
    });
    scene.add(new THREE.Points(gg, gm));
  })();

  /* ---------- Pathway 04: nutrient density / soil regeneration -- messy clustered
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
            /* held back to a base texture: the nutrient stream below is the
               thing this pathway is now saying */
            gl_FragColor = vec4(col, shape * vA * 0.42);
          }`
      });
      scene.add(new THREE.Points(g, m));
    });
  })();

  /* ---------- Pathway 04, the point of it: a dense stream of particles
     leaving the land wave and travelling the whole stack to the demand wave,
     going from soil-green to plate-amber on the way. Nutrient density is only
     a claim if what comes out of the ground is what arrives on the plate, so
     the particle has to cross every layer in between. ---------- */
  (function nutrients() {
    const N = SMALL ? 460 : 1500;
    const pos = new Float32Array(N * 3);
    const aCol = new Float32Array(N), aSeed = new Float32Array(N);
    const aSize = new Float32Array(N), aLane = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      aCol[i] = 0.04 + n2rand(i, N) * 0.92;
      aSeed[i] = (i * 0.6180339887) % 1;
      aSize[i] = 1.0 + ((i * 4.3271) % 1) * 1.8;
      aLane[i] = (((i * 0.7548776662) % 1) - 0.5) * 0.075;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aCol', new THREE.BufferAttribute(aCol, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
    g.setAttribute('aSize', new THREE.BufferAttribute(aSize, 1));
    g.setAttribute('aLane', new THREE.BufferAttribute(aLane, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: U,
      vertexShader: NOISE + `
        attribute float aCol; attribute float aSeed; attribute float aSize; attribute float aLane;
        uniform float uTime, uAspect, uRegion, uDpr;
        varying float vA; varying float vP;
        void main(){
          float yBot = waveY(aCol, 0.5, uTime, 0.100, 0.055, ${BOT_BASE.toFixed(3)});
          float yTop = waveY(aCol, 0.5, uTime, 0.100, 0.050, ${TOP_BASE.toFixed(3)});
          /* every particle keeps its own pace, so the stream never pulses as
             one block */
          float sp = 0.085 + fract(aSeed * 7.3) * 0.075;
          float p = fract(uTime * sp + aSeed);
          float arc = sin(p * 3.14159);
          float y = mix(yBot, yTop, p) + aLane * arc;
          float x = (aCol * 2.0 - 1.0) * uAspect * 0.96;
          x += sin(uTime * 0.6 + aSeed * 31.0) * 0.030 * arc;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, 0.0, 1.0);
          gl_PointSize = aSize * uDpr * (0.75 + 0.55 * p);
          vA = uRegion * smoothstep(0.0, 0.09, p) * (1.0 - smoothstep(0.87, 1.0, p));
          vP = p;
        }`,
      fragmentShader: `
        varying float vA; varying float vP;
        void main(){
          vec2 uv = gl_PointCoord * 2.0 - 1.0;
          float d = length(uv);
          float shape = smoothstep(1.0, 0.15, d);
          if (shape < 0.03) discard;
          vec3 soil  = vec3(0.30, 0.66, 0.40);
          vec3 plate = vec3(0.96, 0.66, 0.31);
          gl_FragColor = vec4(mix(soil, plate, smoothstep(0.08, 0.92, vP)), shape * vA * 0.9);
        }`
    });
    scene.add(new THREE.Points(g, m));
  })();

  /* ---------- Pathway 01: civic-led delivery -- small hub markers (grocers,
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


  /* ---------- narrow screens: the four bands are read one at a time, each
     above the pathway it belongs to. There is still only one simulation -- each
     visible canvas gets the matching horizontal slice of it blitted in every
     frame, so all four stay in step with each other. ---------- */
  const SLICE_NDC = 0.17; // half-height of the strip taken per band
  let slices = [];
  function collectSlices() {
    slices = [];
    if (!SMALL) return;
    BANDS.forEach(band => {
      const el = document.querySelector('.rp-band[data-band="' + band.key + '"]');
      if (!el) return;
      slices.push({ el: el, ctx: el.getContext('2d'), y: band.y });
    });
  }
  function blitSlices() {
    if (!slices.length) return;
    const src = renderer.domElement;
    const SW = src.width, SH = src.height;
    if (!SW || !SH) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    slices.forEach(s => {
      const c = s.el;
      const w = c.clientWidth, h = c.clientHeight;
      if (!w || !h) return;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
        c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      }
      const sy = (1 - (s.y + SLICE_NDC)) / 2 * SH;
      const sh = SLICE_NDC * SH;
      s.ctx.clearRect(0, 0, c.width, c.height);
      s.ctx.drawImage(src, 0, sy, SW, sh, 0, 0, c.width, c.height);
    });
  }
  collectSlices();
  window.addEventListener('resize', collectSlices);
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
    /* New Food Economics is the instrument that lets the buying coalition work --
       hovering it partially reveals those roots too, not just its own cocoons */
    const finTarget = Math.max(want.fin, want.port * 0.45);
    U.uFin.value += (finTarget - U.uFin.value) * 0.08;
    U.uPort.value += (want.port - U.uPort.value) * 0.08;
    U.uRegion.value += (want.region - U.uRegion.value) * 0.06;
    U.uTop.value += (want.top - U.uTop.value) * 0.08;
    renderer.render(scene, camera);
    if (SMALL) blitSlices();
  });
}
