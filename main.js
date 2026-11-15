import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { buildRoom } from './scene/room.js';
import { buildCity } from './scene/city.js';
import { createAtmosphere } from './scene/atmosphere.js';
import { HOME_FOV, createRig, screenFit } from './scene/camera.js';
import { createWeatherFeed, readDebug, weatherLine } from './scene/weather.js';
import { createTerminal } from './terminal/terminal.js';

const boot = document.getElementById('boot');
const chip = document.getElementById('wx');
const back = document.getElementById('back');
const host = document.getElementById('scene');
const debug = readDebug(window.location.search);
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function fail(message) {
  if (boot) {
    boot.classList.remove('off');
    boot.textContent = message;
  }
}

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  stencil: false,
  alpha: false,
  powerPreference: 'default',
});
if (!renderer.getContext()) {
  fail('这台浏览器点不亮三维场景');
  throw new Error('webgl');
}

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
host.appendChild(renderer.domElement);

const cssRenderer = new CSS3DRenderer();
cssRenderer.domElement.className = 'css3d';
cssRenderer.domElement.style.pointerEvents = 'none';
host.appendChild(cssRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc9a27c);
const camera = new THREE.PerspectiveCamera(HOME_FOV, 1, 0.05, 420);

const room = buildRoom(scene);
const city = buildCity(scene);
const weather = createWeatherFeed(debug);
const atmosphere = createAtmosphere(scene, renderer, room);
const term = createTerminal({ onBack: () => rig.goRoom() });
const cssObject = new CSS3DObject(term.el);
term.setLive(false);
scene.add(cssObject);

const rig = createRig(camera, room.screen, { reduced });
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const pointer = { x: 0, y: 0, over: false };
let drag = null;
let lastMode = '';
let booted = false;

function syncTerminal() {
  const { width, height } = room.screen;
  const fit = screenFit(camera, room.screen, window.innerWidth, window.innerHeight);
  const cssW = Math.max(320, Math.round(window.innerWidth * fit.fracW));
  const cssH = Math.max(200, Math.round(cssW / (width / height)));
  term.el.style.width = `${cssW}px`;
  term.el.style.height = `${cssH}px`;
  cssObject.position.copy(room.screen.position).addScaledVector(room.screen.normal, 0.004);
  cssObject.quaternion.copy(room.screen.quaternion);
  cssObject.scale.set(width / cssW, height / cssH, 1);
}

function resize() {
  const w = window.innerWidth;
  const h = Math.max(1, window.innerHeight);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(w, h);
  cssRenderer.setSize(w, h);
  syncTerminal();
  rig.resize();
}

function syncMode(mode) {
  const approaching = mode === 'to-screen' || mode === 'screen';
  document.body.classList.toggle('approaching', approaching);
  document.body.classList.toggle('in-screen', mode === 'screen');
  document.body.dataset.mode = mode;
  back.hidden = !approaching;
  term.setLive(mode === 'screen');
}

function paintChip(night) {
  const text = weatherLine(weather.state, night);
  if (chip.textContent !== text) chip.textContent = text;
  const preview = Boolean(weather.state.lockKind || weather.state.lockTime);
  chip.dataset.preview = preview ? '1' : '0';
  chip.title = preview ? '预览天气' : '纽约当下天气';
}

function overComputer(x, y) {
  ndc.x = (x / window.innerWidth) * 2 - 1;
  ndc.y = -(y / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  return raycaster.intersectObject(room.screen.pick, true).length > 0;
}

back.addEventListener('click', () => rig.goRoom());
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') rig.goRoom();
});
window.addEventListener('resize', resize);

renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());
renderer.domElement.addEventListener('pointerdown', (event) => {
  if (rig.mode !== 'room') return;
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
  rig.setDragging(true);
  renderer.domElement.setPointerCapture(event.pointerId);
});
renderer.domElement.addEventListener('pointermove', (event) => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.over = true;
  if (!drag || event.pointerId !== drag.id) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) < 5) return;
  drag.moved = true;
  rig.drag(dx, dy);
  drag.x = event.clientX;
  drag.y = event.clientY;
});
function endPointer(event) {
  if (!drag || event.pointerId !== drag.id) return;
  const moved = drag.moved;
  drag = null;
  rig.setDragging(false);
  if (!moved && rig.mode === 'room' && overComputer(event.clientX, event.clientY)) rig.goScreen();
}
renderer.domElement.addEventListener('pointerup', endPointer);
renderer.domElement.addEventListener('pointercancel', endPointer);
renderer.domElement.addEventListener('pointerleave', () => {
  pointer.over = false;
  renderer.domElement.style.cursor = '';
});

resize();
syncMode(rig.mode);
if (debug.view === 'screen') {
  rig.jumpScreen();
  syncMode(rig.mode);
}

const FRAME = 1000 / 30;
let last = performance.now();
let acc = 0;
let elapsed = 0;

function loop(now) {
  requestAnimationFrame(loop);
  if (document.hidden) {
    last = now;
    return;
  }
  let delta = now - last;
  last = now;
  if (delta > 120) delta = 120;
  acc += delta;
  if (acc < FRAME) return;
  const dt = Math.min(0.1, acc / 1000);
  acc %= FRAME;
  elapsed += dt;

  const night = weather.night();
  const look = atmosphere.update(dt, {
    kind: weather.state.kind,
    night,
    precip: weather.state.precip,
    locked: weather.state.lockKind,
  });
  city.paintSky(look);
  city.update(dt, look.night);
  rig.update(dt, elapsed);
  if (rig.mode !== lastMode) {
    lastMode = rig.mode;
    syncMode(rig.mode);
  }
  paintChip(night);

  if (rig.mode === 'room' && pointer.over && !drag) {
    renderer.domElement.style.cursor = overComputer(pointer.x, pointer.y) ? 'pointer' : '';
  } else if (rig.mode !== 'room') {
    renderer.domElement.style.cursor = '';
  }

  renderer.render(scene, camera);
  cssRenderer.render(scene, camera);

  if (!booted) {
    booted = true;
    document.body.dataset.scene = 'ready';
    boot?.classList.add('off');
  }
}

requestAnimationFrame(loop);
