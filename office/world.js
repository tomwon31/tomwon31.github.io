import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const FLOOR_Y = [0, 7.5, 15];
export const FLOORS = [
  { id: 1, label: '1F', name: '大堂' },
  { id: 2, label: '2F', name: '阅览' },
  { id: 3, label: '3F', name: '办公' },
];

// First seven are today's desks. Later names in status.json grow into the rest.
export const DESK_SLOTS = [
  { x: -5.5, z: -3.35, rot: 0.18 },
  { x: -2.7, z: -4.05, rot: 0.06 },
  { x: 0.1, z: -4.05, rot: 0 },
  { x: 2.9, z: -4.05, rot: -0.06 },
  { x: 5.6, z: -3.35, rot: -0.16 },
  { x: -7.35, z: -0.9, rot: 1.05 },
  { x: -7.15, z: 1.7, rot: 0.95 },
  { x: -4.4, z: -0.7, rot: 0.35 },
  { x: -1.5, z: -0.55, rot: 0.15 },
  { x: 1.5, z: -0.55, rot: -0.05 },
  { x: 4.4, z: -0.35, rot: -0.25 },
  { x: 6.6, z: -2.15, rot: -0.45 },
];

const box = new THREE.BoxGeometry(1, 1, 1);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 10);
const sphere = new THREE.SphereGeometry(1, 12, 10);
const plane = new THREE.PlaneGeometry(1, 1);
const circle = new THREE.CircleGeometry(1, 16);
const deskTop = new RoundedBoxGeometry(1.46, 0.08, 0.72, 2, 0.1);

const cache = new Map();
function mat(color, extras) {
  const hex = color instanceof THREE.Color ? color.getHex() : color;
  const key = extras ? hex + ':' + (extras.emissive || '') + (extras.rough || '') : hex;
  let material = cache.get(key);
  if (!material) {
    material = new THREE.MeshLambertMaterial(Object.assign({ color: hex }, extras));
    cache.set(key, material);
  }
  return material;
}

const C = {
  floor: mat(0xe4e7ee),
  rug: mat(0xd5dbe6),
  floorEdge: mat(0xcfd4de),
  wall: mat(0xf7f8fb),
  trim: mat(0xd5dae3),
  desk: mat(0xffffff),
  leg: mat(0xe6e9ef),
  black: mat(0x23262e),
  chair: mat(0x2a2e36),
  plant: mat(0x7dce7a),
  plantDark: mat(0x3e9a55),
  pot: mat(0xf4f1ea),
  wood: mat(0xe7d3b0),
  red: mat(0xe23d3d),
  greenChair: mat(0x2f6d4f),
  bookA: mat(0xc44536),
  bookB: mat(0x2a6f97),
  bookC: mat(0xee9b00),
  bookD: mat(0x2d6a4f),
  bookE: mat(0x6d597a),
  cafe: mat(0xf3f0ea),
  glass: mat(0xd7e4ea),
  plinth: mat(0x2c313b),
  shadow: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16, depthWrite: false }),
  ao: new THREE.MeshBasicMaterial({ color: 0x1c2433, transparent: true, opacity: 0.07, depthWrite: false }),
  bulb: new THREE.MeshLambertMaterial({ color: 0xfff6e4, emissive: 0xffb45a, emissiveIntensity: 0.05 }),
  pool: new THREE.MeshBasicMaterial({
    color: 0xffc98a,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }),
  steam: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false }),
  mug: mat(0xfff8f2),
  coffee: mat(0x6b4226),
  posterA: mat(0xf6d7c3),
  posterB: mat(0xd7e4f6),
  keys: mat(0x3c4452),
};

function canvasTex(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const chartTex = canvasTex(160, 96, (ctx, w, h) => {
  ctx.fillStyle = '#f4f7fb';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#d9e2ec';
  for (let i = 1; i < 4; i++) ctx.fillRect(0, (h / 4) * i, w, 1);
  const colors = ['#8f59f9', '#1e6fff', '#3ddc5a', '#f5b942', '#e23d3d'];
  for (let i = 0; i < 5; i++) {
    const bh = 24 + ((i * 37) % 48);
    ctx.fillStyle = colors[i];
    ctx.fillRect(16 + i * 28, h - 12 - bh, 16, bh);
  }
});

const wallChartTex = canvasTex(220, 120, (ctx, w, h) => {
  ctx.fillStyle = '#1b2330';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#3ec6ff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  const pts = [70, 48, 40, 55, 32, 60, 44, 28, 36];
  pts.forEach((y, i) => {
    const x = 16 + i * ((w - 32) / (pts.length - 1));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.fillStyle = '#3ddc5a';
  for (let i = 0; i < 6; i++) ctx.fillRect(18 + i * 32, h - 18 - (10 + (i % 3) * 12), 14, 10 + (i % 3) * 12);
});

const windowTex = canvasTex(128, 256, (ctx, w, h) => {
  ctx.fillStyle = '#3c4452';
  ctx.fillRect(0, 0, w, h);
  for (let y = 10; y < h - 8; y += 18) {
    for (let x = 8; x < w - 8; x += 16) {
      const on = ((x * 3 + y * 5) % 7) > 2;
      ctx.fillStyle = on ? (y % 36 === 10 ? '#f6d98a' : '#d7e6f4') : '#2a303a';
      ctx.fillRect(x, y, 8, 10);
    }
  }
});

const signTex = (text) => canvasTex(256, 64, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#243044';
  ctx.font = '700 36px "WenQuanYi Micro Hei", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 8, h / 2);
});

function place(geo, material, parent, x, y, z, sx = 1, sy = 1, sz = 1) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  parent.add(mesh);
  return mesh;
}

const crowns = [];
const lights = [];
const steams = [];

function shadow(parent, x, z, r) {
  const soft = place(circle, C.ao, parent, x, 0.02, z, r * 1.7, r * 1.7, r * 1.7);
  soft.rotation.x = -Math.PI / 2;
  const mesh = place(circle, C.shadow, parent, x, 0.035, z, r, r, r);
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function plant(parent, x, z, s = 1) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(s);
  parent.add(g);
  place(cyl, C.pot, g, 0, 0.16, 0, 0.18, 0.32, 0.18);
  const crown = new THREE.Group();
  crown.position.y = 0.42;
  g.add(crown);
  place(sphere, C.plant, crown, 0, 0.12, 0, 0.28, 0.32, 0.28);
  place(sphere, C.plantDark, crown, -0.16, -0.02, 0.06, 0.18, 0.2, 0.18);
  place(sphere, C.plant, crown, 0.16, 0, -0.04, 0.16, 0.18, 0.16);
  crowns.push(crown);
  shadow(parent, x, z, 0.28 * s);
}

function hangLamp(parent, x, z) {
  place(cyl, C.black, parent, x, 2.95, z, 0.025, 0.4, 0.025);
  place(cyl, C.desk, parent, x, 2.72, z, 0.18, 0.06, 0.18);
  place(sphere, C.bulb, parent, x, 2.6, z, 0.1, 0.07, 0.1);
  const pool = place(circle, C.pool, parent, x, 0.045, z, 1.7, 1.7, 1.7);
  pool.rotation.x = -Math.PI / 2;
  const light = new THREE.PointLight(0xffc98a, 0, 12, 2);
  light.position.set(x, 2.45, z);
  parent.add(light);
  lights.push(light);
}

function mug(parent, x, y, z) {
  place(cyl, C.mug, parent, x, y, z, 0.055, 0.08, 0.055);
  place(cyl, C.coffee, parent, x, y + 0.045, z, 0.04, 0.02, 0.04);
  const puff = place(sphere, C.steam, parent, x, y + 0.12, z, 0.04, 0.04, 0.04);
  steams.push({ mesh: puff, x, y: y + 0.1, z, phase: steams.length * 1.3 });
}

function poster(parent, x, y, z, rotY, material) {
  const board = place(box, material, parent, x, y, z, 0.7, 0.9, 0.04);
  board.rotation.y = rotY;
}

function roundTable(parent, x, z, chairColor) {
  place(cyl, C.wood, parent, x, 0.4, z, 0.55, 0.08, 0.55);
  place(cyl, C.leg, parent, x, 0.18, z, 0.06, 0.36, 0.06);
  shadow(parent, x, z, 0.62);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const cx = x + Math.cos(a) * 0.85;
    const cz = z + Math.sin(a) * 0.85;
    place(cyl, chairColor, parent, cx, 0.24, cz, 0.18, 0.08, 0.18);
    place(box, chairColor, parent, cx - Math.cos(a) * 0.12, 0.42, cz - Math.sin(a) * 0.12, 0.26, 0.22, 0.07);
  }
}

function bookshelf(parent, x, z, rotY, width) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  parent.add(g);
  place(box, C.wall, g, 0, 1.15, 0, width, 2.3, 0.38);
  const colors = [C.bookA, C.bookB, C.bookC, C.bookD, C.bookE];
  const cols = Math.max(4, Math.round(width / 0.46));
  for (let row = 0; row < 4; row++) {
    place(box, C.trim, g, 0, 0.28 + row * 0.52, 0.16, width - 0.08, 0.04, 0.28);
    for (let c = 0; c < cols; c++) {
      const color = colors[(row + c) % colors.length];
      place(box, color, g, -width / 2 + 0.18 + c * ((width - 0.3) / cols), 0.5 + row * 0.52, 0.16, 0.12, 0.32, 0.22);
    }
  }
}

function monitor(parent, x, y, z) {
  place(box, C.black, parent, x, y, z, 0.62, 0.4, 0.05);
  const screenMat = new THREE.MeshLambertMaterial({
    color: 0xdfe7f2,
    emissive: 0x9eb6d4,
    emissiveIntensity: 0.18,
    map: chartTex,
    emissiveMap: chartTex,
  });
  const screen = place(plane, screenMat, parent, x, y, z + 0.03, 0.52, 0.3, 1);
  place(box, C.black, parent, x, y - 0.28, z, 0.06, 0.16, 0.06);
  return screen;
}

export function createDesk(parent, slot) {
  const desk = new THREE.Group();
  desk.position.set(slot.x, 0, slot.z);
  desk.rotation.y = slot.rot;
  parent.add(desk);
  place(deskTop, C.desk, desk, 0, 0.74, -0.2);
  for (const [lx, lz] of [[-0.58, -0.42], [0.58, -0.42], [-0.58, 0.05], [0.58, 0.05]]) {
    place(box, C.leg, desk, lx, 0.36, lz, 0.06, 0.7, 0.06);
  }
  const screen = monitor(desk, 0, 1.08, -0.5);
  place(box, C.keys, desk, 0, 0.8, -0.02, 0.34, 0.025, 0.13);
  place(box, C.black, desk, 0.05, 0.785, 0.16, 0.18, 0.012, 0.025);
  mug(desk, 0.48, 0.84, -0.22);
  place(cyl, C.black, desk, -0.52, 0.96, -0.12, 0.012, 0.32, 0.012);
  place(sphere, C.bulb, desk, -0.52, 1.14, -0.12, 0.055, 0.045, 0.055);
  place(box, C.chair, desk, 0, 0.46, 0.62, 0.42, 0.07, 0.4);
  place(box, C.chair, desk, 0, 0.72, 0.8, 0.42, 0.42, 0.06);
  place(cyl, C.black, desk, 0, 0.24, 0.62, 0.04, 0.4, 0.04);
  place(cyl, C.black, desk, 0, 0.05, 0.62, 0.18, 0.04, 0.18);
  shadow(desk, 0, 0.2, 0.7);
  desk.updateMatrix();
  const sit = new THREE.Vector3(0, 0, 0.62).applyMatrix4(desk.matrix);
  return { desk, screen, sitX: sit.x, sitZ: sit.z };
}

function buildLobby(floor) {
  place(plane, new THREE.MeshBasicMaterial({ map: signTex('1F  大堂'), transparent: true }), floor, -5.4, 1.7, 0.4, 2.2, 0.5, 1);
  // Freestanding pieces sit toward the open front so the floor above does not hide them.
  place(box, C.cafe, floor, -4.6, 0.55, 1.2, 2.2, 1.05, 0.7);
  place(box, C.desk, floor, -4.6, 1.1, 1.55, 2.3, 0.08, 0.75);
  place(cyl, C.pot, floor, -3.8, 1.22, 1.55, 0.1, 0.12, 0.1);
  place(cyl, mat(0x6b4226), floor, -3.8, 1.3, 1.55, 0.07, 0.04, 0.07);
  place(box, C.desk, floor, 0.8, 0.42, 3.4, 2.1, 0.78, 0.72);
  place(box, C.wall, floor, 0.8, 0.86, 3.7, 2.2, 0.08, 0.78);
  roundTable(floor, -1.4, 4.4, C.red);
  roundTable(floor, 4.2, 1.5, C.red);
  plant(floor, 6.6, 4.2, 1.15);
  plant(floor, -7.2, 3.6, 0.95);
  plant(floor, 6.8, -1.2, 1.05);
  place(cyl, C.black, floor, 6.2, 0.75, 2.8, 0.04, 1.5, 0.04);
  place(sphere, mat(0xfff1c9), floor, 6.2, 1.55, 2.8, 0.14, 0.14, 0.14);
  place(box, mat(0xf0d2c4), floor, -1.5, 0.02, 2.6, 5.2, 0.025, 3.4);
  place(box, mat(0xdfe3ea), floor, 2.6, 0.28, 4.6, 1.6, 0.28, 0.7);
  place(box, mat(0xd5dae3), floor, 2.6, 0.5, 4.88, 1.6, 0.28, 0.12);
  mug(floor, -4.2, 1.2, 1.6);
  mug(floor, -5.0, 1.2, 1.45);
  place(cyl, C.wood, floor, -3.6, 1.18, 1.5, 0.1, 0.03, 0.1);
  place(sphere, mat(0xe7a35a), floor, -3.6, 1.24, 1.5, 0.06, 0.04, 0.06);
  poster(floor, 3.4, 1.6, 4.85, 0.4, C.posterA);
  hangLamp(floor, -2.2, 1.4);
  hangLamp(floor, 3.2, 2.8);
}

function buildLibrary(floor) {
  place(plane, new THREE.MeshBasicMaterial({ map: signTex('2F  阅览'), transparent: true }), floor, -5.6, 1.85, 2.2, 2.2, 0.5, 1);
  bookshelf(floor, -5.2, 3.6, 0.3, 2.8);
  bookshelf(floor, -1.2, 1.1, -0.4, 2.6);
  bookshelf(floor, 5.4, 3.8, 0.2, 2.4);
  place(cyl, C.wood, floor, 2.4, 0.42, 0.6, 1.2, 0.08, 0.72);
  place(box, C.leg, floor, 2.4, 0.2, 0.6, 1.9, 0.08, 0.08);
  for (const [x, z] of [[1.1, -0.3], [3.6, -0.2], [1.4, 1.6], [3.5, 1.5]]) {
    place(cyl, C.greenChair, floor, x, 0.28, z, 0.18, 0.1, 0.18);
    place(box, C.greenChair, floor, x, 0.5, z, 0.32, 0.28, 0.07);
  }
  place(box, C.wall, floor, 6.4, 1.15, -0.8, 1.6, 1.15, 0.08);
  place(box, mat(0xdfe7c8), floor, 6.4, 1.15, -0.74, 1.35, 0.9, 0.02);
  place(sphere, mat(0x8fb8d8), floor, -2.2, 0.72, 4.6, 0.32, 0.32, 0.32);
  place(cyl, C.leg, floor, -2.2, 0.28, 4.6, 0.05, 0.5, 0.05);
  plant(floor, 7.2, 2.4, 1);
  plant(floor, -7.0, 0.4, 0.9);
  place(box, mat(0xe7dcc8), floor, 1.2, 0.02, 1.4, 4.6, 0.025, 3.2);
  mug(floor, 2.0, 0.52, 0.5);
  mug(floor, 2.8, 0.52, 0.7);
  poster(floor, -6.6, 1.45, 1.4, 0.9, C.posterB);
  place(box, mat(0xc4554a), floor, 4.8, 0.08, 2.2, 0.35, 0.06, 0.28);
  hangLamp(floor, -2.4, 2.2);
  hangLamp(floor, 3.0, 1.2);
}

function buildOffice(floor) {
  place(plane, new THREE.MeshBasicMaterial({ map: signTex('3F  办公'), transparent: true }), floor, -6.2, 2.55, -6.28, 2.2, 0.55, 1);
  place(cyl, C.wall, floor, -7.6, 2.2, -6.18, 0.34, 0.34, 0.05);
  place(box, C.black, floor, -7.6, 2.2, -6.12, 0.015, 0.18, 0.02);
  place(box, C.wall, floor, 3.4, 1.7, -6.2, 2.5, 1.35, 0.08);
  const wallScreen = new THREE.MeshLambertMaterial({
    color: 0x152033,
    emissive: 0x67c7ff,
    emissiveIntensity: 0.35,
    map: wallChartTex,
    emissiveMap: wallChartTex,
  });
  place(plane, wallScreen, floor, 3.4, 1.72, -6.14, 2.15, 1.05, 1);
  place(box, C.wall, floor, 7.2, 1.35, -5.6, 1.5, 1.05, 0.06);
  place(box, mat(0xf7fafc), floor, 7.2, 1.35, -5.55, 1.28, 0.82, 0.02);

  // Common area: sofa, TV, snacks, round red-chair tables, plants.
  place(box, C.rug, floor, 2.4, 0.025, 2.6, 9.2, 0.03, 6.2);
  place(box, mat(0xdfe3ea), floor, 1.4, 0.32, 3.7, 2.3, 0.32, 0.8);
  place(box, mat(0xd5dae3), floor, 1.4, 0.58, 4.02, 2.3, 0.42, 0.16);
  place(box, mat(0xf7c9c2), floor, 0.6, 0.52, 3.55, 0.42, 0.22, 0.32);
  place(box, mat(0xf7c9c2), floor, 2.2, 0.52, 3.55, 0.42, 0.22, 0.32);
  shadow(floor, 1.4, 3.7, 1.1);

  place(box, C.black, floor, 4.85, 0.78, 2.15, 0.12, 1.05, 1.45);
  const tvMat = new THREE.MeshLambertMaterial({
    color: 0x163044,
    emissive: 0x8fd0ff,
    emissiveIntensity: 0.25,
    map: chartTex,
    emissiveMap: chartTex,
  });
  const tv = place(plane, tvMat, floor, 4.93, 0.82, 2.15, 0.78, 1.22, 1);
  tv.rotation.y = Math.PI / 2;
  place(box, C.black, floor, 4.85, 0.18, 2.15, 0.4, 0.28, 0.8);
  place(box, mat(0xff5a6a), floor, 4.85, 0.2, 2.55, 0.18, 0.06, 0.28);

  roundTable(floor, -1.6, 4.55, C.red);
  roundTable(floor, 4.2, 5.15, C.red);

  // Snack shelf and vending machine.
  place(box, C.wall, floor, 8.15, 0.85, -0.7, 0.28, 1.5, 1.3);
  for (let i = 0; i < 3; i++) place(box, C.wood, floor, 7.95, 0.4 + i * 0.42, -0.7, 0.32, 0.05, 1.15);
  const snacks = [0xe76f51, 0xf4a261, 0x2a9d8f, 0xe9c46a, 0x8ab17d];
  for (let i = 0; i < 5; i++) {
    place(box, mat(snacks[i]), floor, 7.95, 0.58 + (i % 3) * 0.42, -1.1 + (i % 3) * 0.4, 0.14, 0.16, 0.16);
  }
  place(box, C.red, floor, 8.15, 0.9, 3.55, 0.55, 1.7, 0.5);
  place(box, C.black, floor, 7.9, 0.95, 3.55, 0.08, 0.85, 0.32);
  place(box, mat(0xffe08a), floor, 7.85, 1.55, 3.55, 0.06, 0.08, 0.16);

  plant(floor, 5.6, -2.2, 0.85);
  plant(floor, -2.4, 2.2, 1.05);
  plant(floor, 8.0, 5.3, 0.8);
  poster(floor, -3.2, 1.7, -6.32, 0, C.posterA);
  poster(floor, 6.4, 1.55, -6.32, 0, C.posterB);
  hangLamp(floor, -1.2, -2.4);
  hangLamp(floor, 2.2, 2.2);
  return { tvMat, wallScreen };
}

function buildExterior(scene) {
  const g = new THREE.Group();
  g.visible = false;
  scene.add(g);
  const height = 24.2;
  place(box, mat(0x4a5160), g, 0, height / 2 - 0.4, 0, 16.5, height, 12.2);
  place(box, C.plinth, g, 0, -0.7, 0, 20, 1.1, 15);
  const winMat = new THREE.MeshLambertMaterial({
    color: 0x9fb4c8,
    emissive: 0xf0d7a2,
    emissiveIntensity: 0.45,
    map: windowTex,
    emissiveMap: windowTex,
  });
  place(plane, winMat, g, 0, height / 2, 6.12, 14.6, 22, 1);
  const back = place(plane, winMat, g, 0, height / 2, -6.12, 14.6, 22, 1);
  back.rotation.y = Math.PI;
  const side = place(plane, winMat, g, 8.27, height / 2, 0, 10.4, 22, 1);
  side.rotation.y = Math.PI / 2;
  place(box, mat(0x5b6474), g, 0, height + 0.15, 0, 15.2, 0.4, 11);
  return { group: g, winMat };
}

export function buildWorld(scene) {
  const interior = new THREE.Group();
  scene.add(interior);
  const floors = [];
  for (let i = 0; i < 3; i++) {
    const floor = new THREE.Group();
    floor.position.y = FLOOR_Y[i];
    interior.add(floor);
    floors.push(floor);
    place(box, C.floor, floor, 0, -0.16, -0.2, 19.2, 0.32, 13.6);
    place(box, C.floorEdge, floor, 9.35, -0.16, -0.2, 0.28, 0.32, 13.6);
    place(box, C.floorEdge, floor, 0, -0.16, 6.45, 19.2, 0.32, 0.22);
    place(box, C.wall, floor, 0, 1.65, -6.55, 18.6, 3.3, 0.18);
    place(box, C.wall, floor, -9.35, 1.65, -0.2, 0.18, 3.3, 12.8);
    place(box, C.trim, floor, 0, 0.08, -6.42, 18.4, 0.16, 0.08);
    place(box, C.trim, floor, -9.22, 0.08, -0.2, 0.08, 0.16, 12.5);
  }
  place(box, C.plinth, interior, -1, -0.7, -1.2, 20.4, 0.7, 14.5);
  buildLobby(floors[0]);
  buildLibrary(floors[1]);
  const office = buildOffice(floors[2]);
  const exterior = buildExterior(scene);

  const spots = {
    snack: [
      { x: 6.7, z: -0.7 },
      { x: 6.9, z: 0.15 },
    ],
    read: [
      { x: 0.7, z: 3.45 },
      { x: 2.15, z: 3.5 },
    ],
    game: [
      { x: 6.15, z: 1.7 },
      { x: 6.25, z: 2.65 },
    ],
    wander: [
      { x: -1.2, z: 1.5 },
      { x: 2.4, z: 1.15 },
      { x: 3.6, z: 3.2 },
      { x: -3.4, z: 2.5 },
      { x: 0.2, z: 5.3 },
    ],
  };

  function applyTheme(night) {
    C.floor.color.set(night ? 0x2a3140 : 0xe4e7ee);
    C.rug.color.set(night ? 0x343c4e : 0xd5dbe6);
    C.wall.color.set(night ? 0x232833 : 0xf7f8fb);
    C.floorEdge.color.set(night ? 0x1e2430 : 0xcfd4de);
    C.trim.color.set(night ? 0x323846 : 0xd5dae3);
    C.desk.color.set(night ? 0xd7dce6 : 0xffffff);
    C.bulb.emissiveIntensity = night ? 1.35 : 0.04;
    C.pool.opacity = night ? 0.42 : 0;
    C.steam.opacity = night ? 0.2 : 0.32;
    exterior.winMat.emissive.set(night ? 0xffd089 : 0xf0d7a2);
    exterior.winMat.emissiveIntensity = night ? 1.55 : 0.35;
    exterior.winMat.color.set(night ? 0xffe1b0 : 0x9fb4c8);
    office.tvMat.emissiveIntensity = night ? 1.05 : 0.25;
    office.wallScreen.emissiveIntensity = night ? 1.15 : 0.35;
    for (let i = 0; i < lights.length; i++) lights[i].intensity = night ? 7.5 : 0;
  }

  function animate(time, night) {
    for (let i = 0; i < crowns.length; i++) {
      crowns[i].rotation.z = Math.sin(time * 0.7 + i) * 0.04;
      crowns[i].rotation.x = Math.cos(time * 0.5 + i * 1.3) * 0.02;
    }
    for (let i = 0; i < steams.length; i++) {
      const puff = steams[i];
      const u = (time * 0.45 + puff.phase) % 1.4;
      puff.mesh.position.set(puff.x, puff.y + u * 0.28, puff.z);
      puff.mesh.scale.setScalar(0.035 + u * 0.03);
      puff.mesh.visible = u < 1.15;
    }
    const flicker = night ? 1.15 + Math.sin(time * 9.5) * 0.06 : 0.35 + Math.sin(time * 6) * 0.03;
    office.wallScreen.emissiveIntensity = flicker;
  }

  return {
    interior,
    exterior: exterior.group,
    floor3: floors[2],
    spots,
    applyTheme,
    animate,
    tvMat: office.tvMat,
  };
}
