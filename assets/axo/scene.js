import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const root = document.getElementById('axoScrollTrack');
const canvasWrap = document.getElementById('axoCanvasWrap');
const canvas = document.getElementById('axoCanvas');
const overlayN = document.getElementById('axoOverlayN');
const overlayTitle = document.getElementById('axoOverlayTitle');
const overlayBody = document.getElementById('axoOverlayBody');

function bail() {
  document.body.classList.add('axo-3d-failed');
}

// ---- layer definitions ---------------------------------------------------
// Order = the sequence the particle cloud morphs through, and (top to
// bottom) the order it reassembles into as solid, lit plates at the end.
const GAP = 130; // clear vertical break between plates in the finale
const TARGET_SIZE = 145;
const PARTICLE_COUNT = 2600;
const MORPH_PORTION = 0.72; // rest of the scroll is spent resolving into solid plates

const PAPER_DIM = [0.639, 0.639, 0.612]; // --paper-dim
const ORANGE = [1, 0.353, 0.122];        // --demand
const TEAL = [0.180, 0.490, 0.420];      // --hub
const NEUTRAL_SOLID = 0x2a2a26;          // --surface-ish, reads once lit

const LAYERS = [
  { n: '01 — BUSINESS', title: 'Retailers, growers, food businesses',
    body: 'The commercial layer that has to find this profitable, not just worthy.' },
  { n: '02 — CIVIC ORGANISING', title: 'Residents, co-ops, community groups',
    body: 'The layer that actually organises the work on the ground.' },
  { n: '03 — MUNICIPAL', title: 'Borough of Camden',
    body: 'One borough, moving first — the model this portfolio is built to replicate.' },
  { n: '04 — REGIONAL', title: 'London boroughs',
    body: 'A coalition of peers — shared standards that compound across London.' },
  { n: '05 — NATIONAL', title: 'United Kingdom',
    body: 'The policy layer above it all — where a local model becomes evidence.' }
];

const BUSINESS_NODES = [[-58,-33],[-8,-58],[46,-46],[75,0],[33,37],[-25,46],[-79,8]];
const BUSINESS_EDGES = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0],[1,5]];
const CIVIC_NODES = [[-66,17],[-25,-46],[29,-50],[70,-13],[58,33],[8,54],[-37,46],[0,0]];
const CIVIC_EDGES = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0],[7,1],[7,4],[7,6]];

async function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0); // fully transparent — no box, blends with the page

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 1, 4000);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.3);
  key.position.set(180, 260, 220);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fb8ff, 0.5);
  rim.position.set(-200, 80, -160);
  scene.add(rim);

  // ---- load the three real geo files once; used for both particles and solids ----
  const camdenGeo = await loadGeoShapes('camden.svg');
  const londonGeo = await loadGeoShapes('london-boroughs.svg');
  const ukGeo = await loadGeoShapes('uk.svg');

  const business = buildNetworkPoints(BUSINESS_NODES, BUSINESS_EDGES, ORANGE);
  const civic = buildNetworkPoints(CIVIC_NODES, CIVIC_EDGES, TEAL);
  const camden = pointsFromGeo(camdenGeo, null, ORANGE, ORANGE);
  const london = pointsFromGeo(londonGeo, 'Camden', PAPER_DIM, ORANGE);
  const uk = pointsFromGeo(ukGeo, null, PAPER_DIM, PAPER_DIM);
  const sets = [business, civic, camden, london, uk];

  // random per-particle jitter axis, used for a bit of swirl mid-transition
  const jitter = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT * 3; i++) jitter[i] = (Math.random() - 0.5) * 2;

  const geometry = new THREE.BufferGeometry();
  const positionAttr = new THREE.Float32BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3);
  const colorAttr = new THREE.Float32BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3);
  geometry.setAttribute('position', positionAttr);
  geometry.setAttribute('color', colorAttr);
  const material = new THREE.PointsMaterial({
    size: 2.4, sizeAttenuation: true, vertexColors: true,
    transparent: true, opacity: 0.92, depthWrite: false
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);

  // ---- solid, lit plates — invisible during the morph, resolve in for the finale ----
  const solidLayers = [
    solidFromNetwork(BUSINESS_NODES, ORANGE),
    solidFromNetwork(CIVIC_NODES, TEAL),
    solidFromGeo(camdenGeo, null, ORANGE, ORANGE),
    solidFromGeo(londonGeo, 'Camden', NEUTRAL_SOLID, ORANGE),
    solidFromGeo(ukGeo, null, NEUTRAL_SOLID, NEUTRAL_SOLID)
  ];
  solidLayers.forEach((holder) => scene.add(holder));

  const stackTopY = GAP * (LAYERS.length - 1);
  const spineGeo = new THREE.CylinderGeometry(1.1, 1.1, stackTopY + 34, 12);
  const spineMat = new THREE.MeshBasicMaterial({ color: 0xf5f5f2, transparent: true, opacity: 0 });
  const spine = new THREE.Mesh(spineGeo, spineMat);
  spine.position.y = stackTopY / 2;
  scene.add(spine);

  onResize();
  window.addEventListener('resize', onResize);
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(canvasWrap);

  document.body.classList.add('axo-3d-ready');

  let targetProgress = 0;
  let progress = 0;
  let lastW = 0, lastH = 0;
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const clock = new THREE.Clock();
  let orbit = 0;

  function tick() {
    const dt = clock.getDelta();
    progress += (targetProgress - progress) * Math.min(1, dt * 4);
    if (!reduceMotion) orbit += dt * 0.045;

    const finale = progress >= MORPH_PORTION;
    const finaleT = finale ? smoothstep((progress - MORPH_PORTION) / (1 - MORPH_PORTION)) : 0;

    updateParticles(progress, finaleT);
    updateSolids(finaleT);
    updateCamera(progress, finaleT, orbit);
    updateOverlay(progress, finaleT);

    onResize();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  function updateParticles(p, finaleT) {
    const posArr = positionAttr.array;
    const colArr = colorAttr.array;

    if (p < MORPH_PORTION) {
      const t = (p / MORPH_PORTION) * (sets.length - 1);
      const seg = Math.min(sets.length - 2, Math.floor(t));
      // double smoothstep: dwells clearly at each stage, transitions fast in the middle
      const localT = smoothstep(smoothstep(t - seg));
      const swirl = Math.sin(localT * Math.PI) * (reduceMotion ? 0 : 6);
      const a = sets[seg], b = sets[seg + 1];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        posArr[i3] = lerp(a.pos[i3], b.pos[i3], localT) + jitter[i3] * swirl;
        posArr[i3 + 1] = lerp(a.pos[i3 + 1], b.pos[i3 + 1], localT) + jitter[i3 + 1] * swirl;
        posArr[i3 + 2] = lerp(a.pos[i3 + 2], b.pos[i3 + 2], localT) + jitter[i3 + 2] * swirl;
        colArr[i3] = lerp(a.col[i3], b.col[i3], localT);
        colArr[i3 + 1] = lerp(a.col[i3 + 1], b.col[i3 + 1], localT);
        colArr[i3 + 2] = lerp(a.col[i3 + 2], b.col[i3 + 2], localT);
      }
      material.opacity = 0.92;
      spineMat.opacity = 0;
    } else {
      const from = sets[sets.length - 1]; // fully-formed UK cloud
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const home = i % sets.length;
        const to = sets[home];
        const i3 = i * 3;
        posArr[i3] = lerp(from.pos[i3], to.pos[i3], finaleT);
        posArr[i3 + 1] = lerp(0, GAP * (sets.length - 1 - home), finaleT);
        posArr[i3 + 2] = lerp(from.pos[i3 + 2], to.pos[i3 + 2], finaleT);
        colArr[i3] = lerp(from.col[i3], to.col[i3], finaleT);
        colArr[i3 + 1] = lerp(from.col[i3 + 1], to.col[i3 + 1], finaleT);
        colArr[i3 + 2] = lerp(from.col[i3 + 2], to.col[i3 + 2], finaleT);
      }
      // particles fade down as the solid, lit plates take over legibility
      material.opacity = lerp(0.92, 0.35, finaleT);
      spineMat.opacity = finaleT * 0.2;
    }
    positionAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  }

  function updateSolids(finaleT) {
    // plates arrive first, light fading in a beat later — "light appearing"
    const opacityT = smoothstep((finaleT - 0.25) / 0.75);
    solidLayers.forEach((holder, i) => {
      holder.position.y = lerp(0, GAP * (LAYERS.length - 1 - i), finaleT);
      holder.traverse((child) => {
        if (child.isMesh) {
          child.material.opacity = opacityT * 0.95;
        }
      });
    });
  }

  function updateCamera(p, finaleT, orbitAngle) {
    if (p < MORPH_PORTION) {
      const dist = 195;
      camera.position.set(Math.cos(orbitAngle) * dist, 80, Math.sin(orbitAngle) * dist);
      camera.lookAt(0, 0, 0);
    } else {
      const dist = lerp(195, GAP * 3.1, finaleT);
      const midY = lerp(0, stackTopY / 2, finaleT);
      const a = orbitAngle * 0.4;
      camera.position.set(Math.cos(a) * dist, lerp(80, stackTopY * 0.62, finaleT), Math.sin(a) * dist);
      camera.lookAt(0, midY, 0);
    }
  }

  function updateOverlay(p, finaleT) {
    if (p >= MORPH_PORTION && finaleT > 0.85) {
      setOverlay('THE FULL SYSTEM', 'Five layers, one stack', 'Community, civic organising, borough, region and nation — held together at once.');
      return;
    }
    const idx = Math.max(0, Math.min(LAYERS.length - 1, Math.round((Math.min(p, MORPH_PORTION) / MORPH_PORTION) * (LAYERS.length - 1))));
    setOverlay(LAYERS[idx].n, LAYERS[idx].title, LAYERS[idx].body);
  }

  function setOverlay(n, title, body) {
    if (overlayN.textContent !== n) overlayN.textContent = n;
    if (overlayTitle.textContent !== title) overlayTitle.textContent = title;
    if (overlayBody.textContent !== body) overlayBody.textContent = body;
  }

  function onScroll() {
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    if (total <= 0) { targetProgress = 0; return; }
    targetProgress = clamp(-rect.top / total, 0, 1);
  }

  function onResize() {
    const w = canvasWrap.clientWidth;
    const h = canvasWrap.clientHeight;
    if (!w || !h || (w === lastW && h === lastH)) return;
    lastW = w; lastH = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function smoothstep(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

// ---- particle sampling ----------------------------------------------------

function buildNetworkPoints(nodes, edges, color) {
  const pos = new Float32Array(PARTICLE_COUNT * 3);
  const col = new Float32Array(PARTICLE_COUNT * 3);
  const nodeBudget = Math.floor(PARTICLE_COUNT * 0.4);
  const edgeBudget = PARTICLE_COUNT - nodeBudget;
  let i = 0;
  for (let n = 0; n < nodeBudget; n++) {
    const [nx, nz] = nodes[n % nodes.length];
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 7;
    setPoint(pos, col, i++, nx + Math.cos(a) * r, 0, nz + Math.sin(a) * r, color);
  }
  for (let e = 0; e < edgeBudget; e++) {
    const [ai, bi] = edges[e % edges.length];
    const [ax, az] = nodes[ai];
    const [bx, bz] = nodes[bi];
    const t = Math.random();
    const jx = (Math.random() - 0.5) * 3, jz = (Math.random() - 0.5) * 3;
    setPoint(pos, col, i++, lerp(ax, bx, t) + jx, 0, lerp(az, bz, t) + jz, color);
  }
  while (i < PARTICLE_COUNT) { setPoint(pos, col, i, 0, 0, 0, color); i++; }
  return { pos, col };
}

function pointsFromGeo(loaded, highlightId, baseColor, highlightColor) {
  const pos = new Float32Array(PARTICLE_COUNT * 3);
  const col = new Float32Array(PARTICLE_COUNT * 3);
  let i = 0;
  loaded.paths.forEach((p, idx) => {
    const isLast = idx === loaded.paths.length - 1;
    const budget = isLast ? PARTICLE_COUNT - i : Math.round((p.area / loaded.totalArea) * PARTICLE_COUNT);
    const color = p.isHighlight(highlightId) ? highlightColor : baseColor;
    for (let k = 0; k < budget && i < PARTICLE_COUNT; k++, i++) {
      const [px, py] = randomPointInGeometry(p.geo);
      const x = (px - loaded.center.x) * loaded.scale;
      const z = -(py - loaded.center.y) * loaded.scale;
      setPoint(pos, col, i, x, 0, z, color);
    }
  });
  while (i < PARTICLE_COUNT) { setPoint(pos, col, i, 0, 0, 0, baseColor); i++; }
  return { pos, col };
}

function setPoint(pos, col, i, x, y, z, color) {
  const i3 = i * 3;
  pos[i3] = x; pos[i3 + 1] = y; pos[i3 + 2] = z;
  col[i3] = color[0]; col[i3 + 1] = color[1]; col[i3 + 2] = color[2];
}

// ---- solid, lit plates ------------------------------------------------------

function solidFromNetwork(nodes, color) {
  const holder = new THREE.Group();
  const hull = convexHull(nodes);
  const shape = new THREE.Shape();
  hull.forEach(([x, z], i) => (i === 0 ? shape.moveTo(x, -z) : shape.lineTo(x, -z)));
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 6, bevelEnabled: false, curveSegments: 8 });
  const mat = new THREE.MeshStandardMaterial({
    color: colorToHex(color), roughness: 0.7, metalness: 0.05,
    transparent: true, opacity: 0, side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  holder.add(mesh);
  return holder;
}

async function loadGeoShapes(svgFile) {
  const res = await fetch(new URL(svgFile, import.meta.url));
  const text = await res.text();
  const data = new SVGLoader().parse(text);

  const paths = data.paths.map((path) => {
    const id = path.userData && path.userData.node ? path.userData.node.getAttribute('id') : null;
    const shapes = SVGLoader.createShapes(path);
    if (!shapes.length) return null;
    const geo = new THREE.ShapeGeometry(shapes);
    geo.computeBoundingBox();
    return { shapes, geo, area: triangleArea(geo), isHighlight: (hid) => Boolean(hid) && id === hid };
  }).filter(Boolean);

  const totalArea = paths.reduce((s, p) => s + p.area, 0) || 1;
  const overallBox = new THREE.Box3();
  paths.forEach((p) => overallBox.union(p.geo.boundingBox));
  const center = overallBox.getCenter(new THREE.Vector3());
  const size = overallBox.getSize(new THREE.Vector3());
  const scale = TARGET_SIZE / (Math.max(size.x, size.y) || 1);

  return { paths, totalArea, center, scale };
}

function solidFromGeo(loaded, highlightId, baseColorHex, highlightColorHex) {
  const holder = new THREE.Group();
  const inner = new THREE.Group();
  loaded.paths.forEach((p) => {
    const color = p.isHighlight(highlightId) ? highlightColorHex : baseColorHex;
    p.shapes.forEach((shape) => {
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 6, bevelEnabled: false, curveSegments: 6 });
      const mat = new THREE.MeshStandardMaterial({
        color, roughness: 0.75, metalness: 0.03,
        transparent: true, opacity: 0, side: THREE.DoubleSide
      });
      inner.add(new THREE.Mesh(geo, mat));
    });
  });
  inner.position.set(-loaded.center.x, -loaded.center.y, 0);
  const flip = new THREE.Group();
  flip.add(inner);
  flip.scale.setScalar(loaded.scale); // uniform, positive — a single negative axis would mirror the shape
  flip.rotation.x = -Math.PI / 2;
  holder.add(flip);
  return holder;
}

function triangleArea(geo) {
  const p = geo.attributes.position;
  const idx = geo.index;
  const triCount = idx ? idx.count / 3 : p.count / 3;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let total = 0;
  for (let t = 0; t < triCount; t++) {
    const i0 = idx ? idx.getX(t * 3) : t * 3, i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    a.fromBufferAttribute(p, i0); b.fromBufferAttribute(p, i1); c.fromBufferAttribute(p, i2);
    total += new THREE.Triangle(a, b, c).getArea();
  }
  return total || 0.001;
}

function randomPointInGeometry(geo) {
  const p = geo.attributes.position;
  const idx = geo.index;
  const triCount = idx ? idx.count / 3 : p.count / 3;
  const t = Math.floor(Math.random() * triCount);
  const i0 = idx ? idx.getX(t * 3) : t * 3, i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
  const ax = p.getX(i0), ay = p.getY(i0);
  const bx = p.getX(i1), by = p.getY(i1);
  const cx = p.getX(i2), cy = p.getY(i2);
  let r1 = Math.random(), r2 = Math.random();
  if (r1 + r2 > 1) { r1 = 1 - r1; r2 = 1 - r2; }
  return [ax + r1 * (bx - ax) + r2 * (cx - ax), ay + r1 * (by - ay) + r2 * (cy - ay)];
}

function colorToHex([r, g, b]) {
  return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
}

// Andrew's monotone chain — small point sets, no need for a library.
function convexHull(points) {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop(); lower.pop();
  return lower.concat(upper);
}

// ---- boot -----------------------------------------------------------------
if (!root || !canvas || !window.WebGLRenderingContext) {
  bail();
} else {
  init().catch(function (e) {
    console.error('axo scene init failed:', e);
    bail();
  });
}
