import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const root = document.getElementById('axoScrollTrack');
const canvasWrap = document.getElementById('axoCanvasWrap');
const canvas = document.getElementById('axoCanvas');
const steps = Array.from(document.querySelectorAll('.axo-step'));

function bail() {
  document.body.classList.add('axo-3d-failed');
}

// ---- layer definitions -------------------------------------------------
// Order = top to bottom of the exploded stack (business is closest to the
// viewer / most zoomed-in, UK is the ground plane).
const GAP = 108;
const LAYERS = [
  { key: 'business', label: 'Business', color: 0xff5a1f, y: GAP * 4 },
  { key: 'civic',    label: 'Civic organising', color: 0x2e7d6b, y: GAP * 3 },
  { key: 'camden',   label: 'Borough of Camden', color: 0xff5a1f, y: GAP * 2, svg: 'camden.svg', highlightId: null },
  { key: 'london',   label: 'London boroughs', color: 0x2a2a26, y: GAP * 1, svg: 'london-boroughs.svg', highlightId: 'Camden', highlightColor: 0xff5a1f },
  { key: 'uk',       label: 'United Kingdom', color: 0x2a2a26, y: 0, svg: 'uk.svg' }
];

const TARGET_SIZE = 230; // world units a geo layer's longest side is normalised to
const EXTRUDE_DEPTH = 9;

// business / civic node networks, authored directly (not from geo data)
const BUSINESS_NODES = [
  [-70, -40], [-10, -70], [55, -55], [90, 0], [40, 45], [-30, 55], [-95, 10]
];
const BUSINESS_EDGES = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0],[1,5]];

const CIVIC_NODES = [
  [-80, 20], [-30, -55], [35, -60], [85, -15], [70, 40], [10, 65], [-45, 55], [0, 0]
];
const CIVIC_EDGES = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0],[7,1],[7,4],[7,6]];

async function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(42, 1, 10, 4000);
  const stackCenterY = GAP * 2;

  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(260, 420, 320);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x88aaff, 0.35);
  fill.position.set(-260, 120, -220);
  scene.add(fill);

  const stack = new THREE.Group();
  scene.add(stack);

  // spine running through the centre of the whole stack
  const spineGeo = new THREE.CylinderGeometry(2.4, 2.4, GAP * 4 + 40, 16);
  const spineMat = new THREE.MeshBasicMaterial({ color: 0xf5f5f2, transparent: true, opacity: 0.18 });
  const spine = new THREE.Mesh(spineGeo, spineMat);
  spine.position.y = stackCenterY;
  stack.add(spine);

  const layerObjects = [];

  for (const def of LAYERS) {
    const holder = new THREE.Group();
    holder.position.y = def.y;

    if (def.svg) {
      await buildGeoLayer(holder, def);
    } else {
      buildNetworkLayer(holder, def);
    }

    // thin base plate under each layer to sell it as a solid tray
    const plateGeo = new THREE.CylinderGeometry(TARGET_SIZE * 0.66, TARGET_SIZE * 0.66, 2, 28);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x141414, transparent: true, opacity: 0.4, roughness: 1 });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.y = -EXTRUDE_DEPTH / 2 - 1;
    holder.add(plate);

    stack.add(holder);
    layerObjects.push({ def, holder });
  }

  fitCamera(camera, stack, stackCenterY);
  onResize();
  window.addEventListener('resize', onResize);
  if (window.ResizeObserver) {
    new ResizeObserver(onResize).observe(canvasWrap);
  }

  document.body.classList.add('axo-3d-ready');

  let targetProgress = 0;
  let progress = 0;
  let lastW = 0, lastH = 0;
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  let raf;
  const clock = new THREE.Clock();
  function tick() {
    const dt = clock.getDelta();
    progress += (targetProgress - progress) * Math.min(1, dt * 4);

    if (!reduceMotion) {
      stack.rotation.y += dt * 0.06;
    }

    const activeFloat = progress * (LAYERS.length - 1);
    const activeIndex = Math.round(activeFloat);

    layerObjects.forEach((obj, i) => {
      const dist = Math.abs(activeFloat - i);
      const target = Math.max(0.22, 1 - dist * 0.85);
      const s = THREE.MathUtils.lerp(obj.holder.scale.x || 1, 0.9 + target * 0.15, 0.12);
      obj.holder.scale.setScalar(s);
      obj.holder.traverse((child) => {
        if (child.isMesh && child.material && 'opacity' in child.material) {
          child.material.transparent = true;
          child.material.opacity = THREE.MathUtils.lerp(child.material.opacity ?? 1, Math.max(0.28, target), 0.15);
        }
      });
    });

    // camera travels down the spine as the user scrolls
    const topY = LAYERS[0].y + 60;
    const bottomY = LAYERS[LAYERS.length - 1].y - 20;
    const focusY = THREE.MathUtils.lerp(topY, bottomY, progress);
    const radius = THREE.MathUtils.lerp(420, 300, progress);
    const angle = Math.PI * 0.28;
    camera.position.set(Math.cos(angle) * radius, focusY + 150, Math.sin(angle) * radius);
    camera.lookAt(0, focusY, 0);

    steps.forEach((el, i) => el.classList.toggle('is-active', i === activeIndex));

    onResize(); // cheap no-op unless the container's size actually changed
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  tick();

  function onScroll() {
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    if (total <= 0) { targetProgress = 0; return; }
    const scrolled = -rect.top;
    targetProgress = THREE.MathUtils.clamp(scrolled / total, 0, 1);
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

function buildNetworkLayer(holder, def) {
  const nodes = def.key === 'business' ? BUSINESS_NODES : CIVIC_NODES;
  const edges = def.key === 'business' ? BUSINESS_EDGES : CIVIC_EDGES;

  const nodeGeo = new THREE.SphereGeometry(6.5, 16, 16);
  const nodeMat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.4, metalness: 0.1 });
  nodes.forEach(([x, z]) => {
    const m = new THREE.Mesh(nodeGeo, nodeMat.clone());
    m.position.set(x, 0, z);
    holder.add(m);
  });

  const positions = [];
  edges.forEach(([a, b]) => {
    const [ax, az] = nodes[a];
    const [bx, bz] = nodes[b];
    positions.push(ax, 0, az, bx, 0, bz);
  });
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xa3a39c, transparent: true, opacity: 0.5 });
  holder.add(new THREE.LineSegments(edgeGeo, edgeMat));
}

async function buildGeoLayer(holder, def) {
  const res = await fetch(new URL(def.svg, import.meta.url));
  const text = await res.text();
  const loader = new SVGLoader();
  const data = loader.parse(text);

  const inner = new THREE.Group();
  const meshes = [];

  data.paths.forEach((path) => {
    const id = path.userData && path.userData.node ? path.userData.node.getAttribute('id') : null;
    const isHighlight = def.highlightId && id === def.highlightId;
    const color = isHighlight ? def.highlightColor : def.color;
    const shapes = SVGLoader.createShapes(path);
    shapes.forEach((shape) => {
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: EXTRUDE_DEPTH, bevelEnabled: false, curveSegments: 6 });
      const material = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.02, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geometry, material);
      inner.add(mesh);
      meshes.push(mesh);
    });
  });

  if (!meshes.length) return;

  const box = new THREE.Box3().setFromObject(inner);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y) || 1;
  const scale = TARGET_SIZE / maxDim;

  // Centre, then lay the plate flat using ONLY a rotation (never a
  // single-axis negative scale) — a negative scale on one axis mirrors
  // the shape (negative determinant), which would flip Camden/London/UK
  // into a mirror image rather than just reorienting them.
  inner.position.set(-center.x, -center.y, -center.z);
  const flip = new THREE.Group();
  flip.add(inner);
  flip.scale.setScalar(scale);
  flip.rotation.x = -Math.PI / 2;
  holder.add(flip);
}

function fitCamera(camera, stack, centerY) {
  camera.position.set(280, centerY + 260, 420);
  camera.lookAt(0, centerY, 0);
}

// ---- boot ---------------------------------------------------------------
if (!root || !canvas || !window.WebGLRenderingContext) {
  bail();
} else {
  init().catch(function (e) {
    console.error('axo scene init failed:', e);
    bail();
  });
}
