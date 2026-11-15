import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { buildWorld } from './world.js';
import { createSim } from './bots.js';

const POLL_MS = 60_000;
const FRAME_MS = 1000 / 30;

const hudTime = document.getElementById('hud-time');
const hudCount = document.getElementById('hud-count');
const sceneHost = document.getElementById('scene');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf3ecdf);
scene.fog = new THREE.Fog(0xf3ecdf, 28, 52);

const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 90);
camera.position.set(2, 19.5, 19.18);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: 'low-power',
  stencil: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = false;
sceneHost.appendChild(renderer.domElement);

const labels = new CSS2DRenderer();
labels.setSize(window.innerWidth, window.innerHeight);
labels.domElement.style.position = 'absolute';
labels.domElement.style.inset = '0';
labels.domElement.style.pointerEvents = 'none';
sceneHost.appendChild(labels.domElement);

const hemi = new THREE.HemisphereLight(0xfff6e8, 0xd9c2a4, 1.05);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfffaf2, 0.82);
sun.position.set(7, 14, 9);
scene.add(sun);

const world = buildWorld(scene);
const sim = createSim(scene, world);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(-1.8, 0.15, -0.7);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 8;
controls.maxDistance = 36;
controls.minPolarAngle = 0.38;
controls.maxPolarAngle = 1.22;
controls.autoRotate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
controls.autoRotateSpeed = 0.2;
controls.update();

let resumeTimer = 0;
controls.addEventListener('start', () => {
  controls.autoRotate = false;
  resumeTimer = 0;
});
controls.addEventListener('end', () => {
  resumeTimer = performance.now() + 12000;
});

renderer.domElement.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  window.setTimeout(() => window.location.reload(), 1500);
});

function resize() {
  const w = window.innerWidth;
  const h = Math.max(1, window.innerHeight);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(w, h);
  labels.setSize(w, h);
}
window.addEventListener('resize', resize);

function formatMadrid(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '时间未知';
  const text = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Europe/Madrid',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  return text;
}

let hasData = false;

async function poll() {
  try {
    const response = await fetch('./status.json?t=' + Date.now(), { cache: 'no-store' });
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json();
    if (!data || !Array.isArray(data.bots)) throw new Error('schema');
    const counts = sim.sync(data.bots);
    hasData = true;
    hudTime.textContent = '更新于 ' + formatMadrid(data.updated) + '（马德里）';
    hudCount.textContent = '忙碌 ' + counts.busy + ' · 空闲 ' + counts.idle;
  } catch {
    if (!hasData) {
      hudTime.textContent = '暂时无法获取状态，将自动重试';
      hudCount.textContent = '忙碌 — · 空闲 —';
    }
  }
}

poll();
window.setInterval(poll, POLL_MS);

let last = performance.now();
let acc = 0;

function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden) {
    last = now;
    acc = 0;
    return;
  }
  let delta = now - last;
  last = now;
  if (delta > 250) delta = 250;
  if (delta < 0) delta = 0;
  acc += delta;
  if (acc < FRAME_MS - 0.5) return;
  const dt = Math.min(acc / 1000, 0.1);
  acc = 0;

  if (resumeTimer && now > resumeTimer) {
    controls.autoRotate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    resumeTimer = 0;
  }

  sim.update(dt, now / 1000);
  controls.update(dt);
  renderer.render(scene, camera);
  labels.render(scene, camera);
}

requestAnimationFrame(frame);
