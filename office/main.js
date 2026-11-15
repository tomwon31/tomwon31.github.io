import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { FLOOR_Y, buildWorld } from './world.js';
import { createSim, taskText, iconSvg } from './bots.js';

const POLL_MS = 60_000;
const FRAME_MS = 1000 / 30;
const ELEV = Math.PI / 4;

const sceneHost = document.getElementById('scene');
const clockEl = document.getElementById('clock');
const updatedEl = document.getElementById('updated');
const talliesEl = document.getElementById('tallies');
const rosterEl = document.getElementById('roster');
const rosterTitle = document.getElementById('roster-title');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe7ebf0);

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
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
labels.domElement.className = 'labels';
labels.domElement.style.position = 'absolute';
labels.domElement.style.inset = '0';
labels.domElement.style.pointerEvents = 'none';
sceneHost.appendChild(labels.domElement);

const hemi = new THREE.HemisphereLight(0xffffff, 0xd5dae3, 0.95);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfffaf3, 0.72);
sun.position.set(10, 18, 8);
scene.add(sun);

const world = buildWorld(scene);
const sim = createSim(scene, world);

const cam = {
  azimuth: Math.PI / 4,
  targetAzimuth: Math.PI / 4,
  zoom: 1,
  targetZoom: 1,
  focus: new THREE.Vector3(0.2, FLOOR_Y[0] + 1.2, -0.2),
  tween: null,
  floor: 1,
  exterior: false,
  night: false,
  viewHalf: 6.15,
};

function floorFocus(index) {
  return new THREE.Vector3(0.4, FLOOR_Y[index] + 1.25, -0.15);
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function tweenTo(goal, zoom, seconds) {
  cam.tween = {
    from: cam.focus.clone(),
    to: goal.clone(),
    fromZoom: cam.zoom,
    toZoom: zoom,
    t: 0,
    dur: seconds,
  };
}

function applyCamera() {
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const half = cam.viewHalf / cam.zoom;
  camera.top = half;
  camera.bottom = -half;
  camera.left = -half * aspect;
  camera.right = half * aspect;
  camera.updateProjectionMatrix();
  const dir = new THREE.Vector3(
    Math.cos(ELEV) * Math.sin(cam.azimuth),
    Math.sin(ELEV),
    Math.cos(ELEV) * Math.cos(cam.azimuth),
  );
  camera.position.copy(cam.focus).addScaledVector(dir, 32);
  camera.lookAt(cam.focus);
}

function resize() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  labels.setSize(window.innerWidth, window.innerHeight);
  applyCamera();
}
window.addEventListener('resize', resize);

function showExterior(on) {
  cam.exterior = on;
  document.getElementById('btn-building').classList.toggle('on', on);
  if (on) {
    tweenTo(new THREE.Vector3(0, 11.2, 0), 0.46, 1.15);
  } else {
    tweenTo(floorFocus(cam.floor - 1), 1, 1.05);
  }
}

function selectFloor(id, seconds) {
  cam.floor = id;
  cam.exterior = false;
  document.getElementById('btn-building').classList.remove('on');
  document.querySelectorAll('.floors button[data-floor]').forEach((btn) => {
    btn.classList.toggle('on', Number(btn.dataset.floor) === id);
  });
  const meta = ['', '大堂', '阅览', '办公'][id];
  rosterTitle.textContent = id + 'F · ' + (id === 3 ? '本层机器人' : meta);
  tweenTo(floorFocus(id - 1), 1, seconds || 0.95);
  renderRoster();
}

document.querySelectorAll('.floors button[data-floor]').forEach((btn) => {
  btn.addEventListener('click', () => selectFloor(Number(btn.dataset.floor)));
});
document.getElementById('btn-building').addEventListener('click', () => showExterior(!cam.exterior));
document.getElementById('btn-reset').addEventListener('click', () => {
  cam.targetAzimuth = Math.PI / 4;
  cam.targetZoom = cam.exterior ? 0.46 : 1;
  if (cam.exterior) tweenTo(new THREE.Vector3(0, 11.2, 0), 0.46, 0.7);
  else tweenTo(floorFocus(cam.floor - 1), 1, 0.7);
});
document.getElementById('btn-day').addEventListener('click', () => setNight(false));
document.getElementById('btn-night').addEventListener('click', () => setNight(true));

function bindPanel(id, key) {
  const panel = document.getElementById(id);
  const btn = panel.querySelector('.collapse');
  const apply = (collapsed) => {
    panel.classList.toggle('collapsed', collapsed);
    btn.setAttribute('aria-expanded', String(!collapsed));
  };
  apply(localStorage.getItem(key) === '0');
  btn.addEventListener('click', () => {
    const collapsed = !panel.classList.contains('collapsed');
    apply(collapsed);
    localStorage.setItem(key, collapsed ? '0' : '1');
  });
}
bindPanel('panel-floors', 'office-panel-floors');
bindPanel('panel-roster', 'office-panel-roster');

function setNight(night) {
  cam.night = night;
  document.body.classList.toggle('night', night);
  document.getElementById('btn-day').classList.toggle('on', !night);
  document.getElementById('btn-night').classList.toggle('on', night);
  scene.background.set(night ? 0x070b14 : 0xe9eef3);
  hemi.intensity = night ? 0.88 : 1.05;
  hemi.color.set(night ? 0xffe6c2 : 0xfff8ef);
  hemi.groundColor.set(night ? 0x8d6b4e : 0xd8d0c4);
  sun.intensity = night ? 0.42 : 0.82;
  sun.color.set(night ? 0xffd7a4 : 0xfffaf3);
  world.applyTheme(night);
}

const pointers = new Map();
let pinchBase = 0;
let pinchZoom = 1;
const ZOOM_MIN = 0.38;
const ZOOM_MAX = 2.4;

function clampZoom(value) {
  return THREE.MathUtils.clamp(value, ZOOM_MIN, ZOOM_MAX);
}

renderer.domElement.addEventListener('pointerdown', (event) => {
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  renderer.domElement.setPointerCapture(event.pointerId);
});
function endPointer(event) {
  pointers.delete(event.pointerId);
  if (pointers.size < 2) pinchBase = 0;
}
renderer.domElement.addEventListener('pointerup', endPointer);
renderer.domElement.addEventListener('pointercancel', endPointer);
renderer.domElement.addEventListener('pointermove', (event) => {
  if (!pointers.has(event.pointerId)) return;
  const prev = pointers.get(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size >= 2) {
    const pts = [...pointers.values()];
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    if (!pinchBase) {
      pinchBase = dist;
      pinchZoom = cam.targetZoom;
    } else if (pinchBase > 0) {
      cam.targetZoom = clampZoom(pinchZoom * (dist / pinchBase));
      if (cam.tween) cam.tween = null;
    }
    return;
  }
  const dx = event.clientX - prev.x;
  cam.targetAzimuth += dx * 0.008;
  if (cam.tween) cam.tween = null;
});
renderer.domElement.addEventListener('wheel', (event) => {
  event.preventDefault();
  const factor = event.deltaY > 0 ? 0.92 : 1.08;
  cam.targetZoom = clampZoom(cam.targetZoom * factor);
  if (cam.tween) cam.tween.toZoom = cam.targetZoom;
}, { passive: false });

renderer.domElement.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  window.setTimeout(() => window.location.reload(), 1500);
});

function formatMadrid(date) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

function tickClock() {
  clockEl.textContent = formatMadrid(new Date());
}
tickClock();
window.setInterval(tickClock, 1000);

let hasData = false;
let counts = { busy: 0, waiting: 0, error: 0, idle: 0 };

function paintTallies() {
  const nodes = talliesEl.querySelectorAll('.dot');
  nodes[0].textContent = '工作 ' + counts.busy;
  nodes[1].textContent = '等待 ' + counts.waiting;
  nodes[2].textContent = '异常 ' + counts.error;
  nodes[3].textContent = '空闲 ' + counts.idle;
}

function renderRoster() {
  rosterEl.replaceChildren();
  if (cam.floor !== 3 || cam.exterior) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = '这一层没有机器人';
    rosterEl.appendChild(li);
    return;
  }
  const visible = sim.bots.filter((bot) => !bot.hidden);
  if (!visible.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = hasData ? '这一层没有机器人' : '正在获取状态…';
    rosterEl.appendChild(li);
    return;
  }
  for (let i = 0; i < visible.length; i++) {
    const bot = visible[i];
    const li = document.createElement('li');
    const icon = document.createElement('span');
    icon.className = 'avatar';
    icon.innerHTML = iconSvg(bot.look ? bot.look.shape : 'rounded_square', bot.look ? bot.look.color : '#8F59F9');
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = bot.name;
    const task = document.createElement('div');
    task.className = 'task';
    task.textContent = taskText(bot);
    li.append(icon, name, task);
    rosterEl.appendChild(li);
  }
}

let rosterTick = 0;

async function poll() {
  try {
    const response = await fetch('./status.json?t=' + Date.now(), { cache: 'no-store' });
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json();
    if (!data || !Array.isArray(data.bots)) throw new Error('schema');
    counts = sim.sync(data.bots, performance.now() / 1000);
    hasData = true;
    const when = new Date(data.updated);
    updatedEl.textContent = Number.isNaN(when.getTime()) ? '状态时间未知' : '状态 ' + formatMadrid(when);
    paintTallies();
    renderRoster();
  } catch {
    if (!hasData) {
      updatedEl.textContent = '暂时无法获取状态，将自动重试';
      paintTallies();
    }
  }
}

poll();
window.setInterval(poll, POLL_MS);

// Open on 1F, then glide up to 3F.
selectFloor(1, 0.01);
window.setTimeout(() => {
  if (cam.floor === 1 && !cam.exterior) selectFloor(3, 2.2);
}, 450);

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

  if (cam.tween) {
    cam.tween.t += dt / cam.tween.dur;
    const k = smoothstep(Math.min(1, cam.tween.t));
    cam.focus.lerpVectors(cam.tween.from, cam.tween.to, k);
    cam.zoom = cam.tween.fromZoom + (cam.tween.toZoom - cam.tween.fromZoom) * k;
    cam.targetZoom = cam.zoom;
    if (cam.tween.t >= 1) cam.tween = null;
  } else {
    cam.zoom += (cam.targetZoom - cam.zoom) * Math.min(1, dt * 8);
  }
  cam.azimuth += (cam.targetAzimuth - cam.azimuth) * Math.min(1, dt * 8);
  const showShell = cam.exterior && cam.zoom < 0.62;
  world.interior.visible = !showShell;
  world.exterior.visible = showShell;
  if (cam.night && showShell) {
    hemi.intensity = 0.08;
    hemi.color.set(0x1a2740);
    hemi.groundColor.set(0x070b14);
    sun.intensity = 0.04;
  } else if (cam.night) {
    hemi.intensity = 0.88;
    hemi.color.set(0xffe6c2);
    hemi.groundColor.set(0x8d6b4e);
    sun.intensity = 0.42;
    sun.color.set(0xffd7a4);
  }

  sim.update(dt, now / 1000, cam.azimuth, !showShell && cam.floor === 3, cam.night, !showShell);
  world.animate(now / 1000, cam.night);
  applyCamera();
  renderer.render(scene, camera);
  labels.render(scene, camera);

  rosterTick += dt;
  if (rosterTick > 0.8) {
    rosterTick = 0;
    if (cam.floor === 3 && !cam.exterior) renderRoster();
  }
}

requestAnimationFrame(frame);
