import * as THREE from 'three';

// Shared unit geometries. Meshes scale these instead of allocating their own.
export const geos = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 10, 8),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 8),
  cone: new THREE.ConeGeometry(1, 1, 8),
  plane: new THREE.PlaneGeometry(1, 1),
  circle: new THREE.CircleGeometry(1, 14),
  torus: new THREE.TorusGeometry(1, 0.22, 5, 10),
  head: new THREE.SphereGeometry(0.18, 10, 8),
  torso: new THREE.CapsuleGeometry(0.155, 0.24, 2, 6),
  limb: new THREE.CapsuleGeometry(0.048, 0.22, 2, 5),
  eye: new THREE.SphereGeometry(0.046, 6, 5),
  pupil: new THREE.SphereGeometry(0.02, 5, 4),
  ring: new THREE.TorusGeometry(0.052, 0.012, 4, 8),
};

const matCache = new Map();

export function mat(color) {
  const hex = color instanceof THREE.Color ? color.getHex() : color;
  let material = matCache.get(hex);
  if (!material) {
    material = new THREE.MeshLambertMaterial({ color: hex });
    matCache.set(hex, material);
  }
  return material;
}

export function tint(hex, toward, t) {
  const color = new THREE.Color(hex);
  color.lerp(new THREE.Color(toward), t);
  return color.getHex();
}

function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

const screenTex = canvasTexture(128, 80, (ctx, w, h) => {
  ctx.fillStyle = '#1a4d68';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#12384c';
  ctx.fillRect(0, 0, w, 14);
  ctx.fillStyle = '#7dffa1';
  ctx.fillRect(8, 5, 18, 5);
  ctx.fillStyle = '#d7f4ff';
  const lines = [22, 34, 46, 58, 70];
  const widths = [78, 96, 64, 88, 52];
  for (let i = 0; i < lines.length; i++) {
    ctx.globalAlpha = 0.85 - i * 0.08;
    ctx.fillRect(10, lines[i], widths[i], 5);
  }
  ctx.globalAlpha = 1;
});

const tvTex = canvasTexture(160, 96, (ctx, w, h) => {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#7ec8f0');
  sky.addColorStop(0.55, '#b7e3fb');
  sky.addColorStop(0.55, '#67b15a');
  sky.addColorStop(1, '#3d8a45');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#f4f7fb';
  ctx.beginPath();
  ctx.arc(120, 28, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ef5d4c';
  ctx.fillRect(70, 48, 16, 18);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(86, 54, 10, 8);
  ctx.fillStyle = '#143024';
  ctx.fillRect(40, 62, 28, 10);
  ctx.fillRect(96, 66, 36, 12);
});

const signTex = canvasTexture(512, 128, (ctx, w, h) => {
  ctx.fillStyle = '#f4ecdf';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#e0d0b8';
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, w - 12, h - 12);
  ctx.fillStyle = '#3e4a42';
  ctx.font = '700 64px "WenQuanYi Micro Hei", "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('机器人办公室', w / 2, h / 2 + 2);
});

export const mats = {
  floor: mat(0xe7d0aa),
  ground: mat(0xefe4d2),
  wall: mat(0xf6f1e7),
  trim: mat(0xe4d3c0),
  window: mat(0xc5e6f6),
  windowFrame: mat(0xfffaf4),
  deskTop: mat(0xfffaf3),
  deskLeg: mat(0xc49262),
  bezel: mat(0x2a3140),
  keys: mat(0x3d4656),
  chair: mat(0x6e86a3),
  chairBase: mat(0x4e5968),
  sofa: mat(0x5c7194),
  sofaBack: mat(0x4d6286),
  cushion: mat(0x8eabc9),
  pillow: mat(0xe07b78),
  table: mat(0xd7b088),
  rug: mat(0xe7b09f),
  rug2: mat(0xeadcc6),
  plant: mat(0x2f8f4e),
  plantDark: mat(0x246e3d),
  pot: mat(0xd4784a),
  snackWood: mat(0xc79a68),
  snackBack: mat(0xf3e6d4),
  cooler: mat(0xf5f8f8),
  coolerTrim: mat(0xc5d0d8),
  water: mat(0x8fd4ef),
  cup: mat(0xf7fbff),
  vending: mat(0xd24b58),
  vendingDark: mat(0xa83344),
  glass: mat(0x243044),
  mug: mat(0xfff8f2),
  coffee: mat(0x6b4226),
  page: mat(0xfffdf8),
  bookCover: mat(0xc4554a),
  console: mat(0x222833),
  lamp: mat(0xf3d48a),
  screenIdle: new THREE.MeshLambertMaterial({ color: 0x232a36 }),
  shadow: new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
  }),
};

export function makeScreenMaterial(hex) {
  const emissive = new THREE.Color(hex).lerp(new THREE.Color(0xffffff), 0.42);
  return new THREE.MeshLambertMaterial({
    color: emissive.clone().multiplyScalar(0.32),
    emissive,
    emissiveIntensity: 0.7,
    map: screenTex,
    emissiveMap: screenTex,
  });
}

const tvMat = new THREE.MeshLambertMaterial({
  color: 0x163044,
  emissive: 0xb7e6ff,
  emissiveIntensity: 0.18,
  map: tvTex,
  emissiveMap: tvTex,
});

const vendingLightMat = new THREE.MeshLambertMaterial({
  color: 0xffe8a8,
  emissive: 0xffd56a,
  emissiveIntensity: 0.6,
});

const signMat = new THREE.MeshLambertMaterial({ map: signTex });

export function place(geometry, material, parent, x, y, z, sx = 1, sy = 1, sz = 1) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  parent.add(mesh);
  return mesh;
}

// Workstation anchors. rot is the yaw that faces the bot toward the desk
// (local -Z). The first seven are the desks used today; the rest are spare
// slots so a new name in status.json can grow a desk without a code change.
export const SLOTS = [
  { x: -9.0, z: -6.45, rot: 0 },
  { x: -5.2, z: -6.45, rot: 0 },
  { x: -1.4, z: -6.45, rot: 0 },
  { x: 2.4, z: -6.45, rot: 0 },
  { x: 10.55, z: -3.6, rot: -Math.PI / 2 },
  { x: 10.55, z: 0.15, rot: -Math.PI / 2 },
  { x: 10.55, z: 3.7, rot: -Math.PI / 2 },
  { x: 6.2, z: -6.45, rot: 0 },
  { x: 10.55, z: 6.55, rot: -Math.PI / 2 },
  { x: -10.45, z: 6.5, rot: Math.PI / 2 },
  { x: 2.6, z: 7.15, rot: Math.PI },
  { x: 6.4, z: 7.15, rot: Math.PI },
];

// Lounge footprint used by the walker so bots route around the sofa and TV.
export const LOUNGE = { minX: -7.2, maxX: -3.15, minZ: 1.05, maxZ: 5.25 };

function addWindow(parent, x, y, z) {
  place(geos.box, mats.windowFrame, parent, x, y, z, 1.55, 1.15, 0.08);
  place(geos.box, mats.window, parent, x, y, z + 0.05, 1.25, 0.88, 0.04);
}

function addPlant(parent, x, z, scale, leaves) {
  const pot = new THREE.Group();
  pot.position.set(x, 0, z);
  pot.scale.setScalar(scale);
  parent.add(pot);
  place(geos.cyl, mats.pot, pot, 0, 0.16, 0, 0.22, 0.32, 0.22);
  place(geos.cyl, mat(tint(0xd4784a, 0xffffff, 0.25)), pot, 0, 0.34, 0, 0.26, 0.08, 0.26);
  const crown = new THREE.Group();
  crown.position.y = 0.42;
  pot.add(crown);
  place(geos.sphere, mats.plant, crown, 0, 0.38, 0, 0.28, 0.34, 0.28);
  place(geos.sphere, mats.plantDark, crown, -0.2, 0.22, 0.08, 0.2, 0.2, 0.2);
  place(geos.sphere, mats.plant, crown, 0.18, 0.2, -0.06, 0.18, 0.22, 0.18);
  leaves.push(crown);
}

function addCooler(parent, x, z) {
  place(geos.box, mats.cooler, parent, x, 0.55, z, 0.46, 1.1, 0.42);
  place(geos.box, mats.coolerTrim, parent, x, 0.08, z, 0.52, 0.16, 0.48);
  place(geos.cyl, mats.water, parent, x, 1.28, z, 0.16, 0.36, 0.16);
  place(geos.box, mats.water, parent, x, 0.72, z + 0.22, 0.08, 0.08, 0.06);
  place(geos.cyl, mats.cup, parent, x + 0.22, 0.2, z + 0.1, 0.06, 0.1, 0.06);
}

function addSnackShelf(parent, x, z) {
  place(geos.box, mats.snackBack, parent, x, 0.9, z, 0.12, 1.5, 1.35);
  for (let i = 0; i < 3; i++) {
    place(geos.box, mats.snackWood, parent, x + 0.12, 0.38 + i * 0.48, z, 0.32, 0.06, 1.25);
  }
  const colors = [0xe76f51, 0xf4a261, 0x2a9d8f, 0xe9c46a, 0x8ab17d, 0xef6f9b];
  let n = 0;
  for (let row = 0; row < 3; row++) {
    for (let col = -1; col <= 1; col++) {
      const color = mat(colors[n % colors.length]);
      n += 1;
      if (n % 2 === 0) {
        place(geos.box, color, parent, x + 0.16, 0.52 + row * 0.48, z + col * 0.36, 0.16, 0.18, 0.2);
      } else {
        place(geos.cyl, color, parent, x + 0.16, 0.52 + row * 0.48, z + col * 0.36, 0.07, 0.2, 0.07);
      }
    }
  }
}

function addVending(parent, x, z) {
  place(geos.box, mats.vending, parent, x, 0.85, z, 0.55, 1.7, 0.48);
  place(geos.box, mats.vendingDark, parent, x, 1.55, z, 0.58, 0.16, 0.5);
  place(geos.box, vendingLightMat, parent, x, 1.55, z + 0.26, 0.16, 0.08, 0.02);
  place(geos.box, mats.glass, parent, x + 0.02, 0.95, z + 0.25, 0.36, 0.85, 0.04);
  const dots = [0xe9c46a, 0x2a9d8f, 0xf4a261, 0x8ab17d];
  for (let i = 0; i < dots.length; i++) {
    place(geos.box, mat(dots[i]), parent, x + 0.04, 1.2 - i * 0.18, z + 0.28, 0.22, 0.1, 0.02);
  }
  place(geos.box, mats.bezel, parent, x + 0.05, 0.28, z + 0.2, 0.28, 0.08, 0.08);
}

function addSofa(parent) {
  // Faces +X (into the room). Seat center x=-6.15, length along Z.
  place(geos.box, mats.sofa, parent, -6.2, 0.32, 3.25, 0.9, 0.28, 2.35);
  place(geos.box, mats.sofaBack, parent, -6.58, 0.58, 3.25, 0.16, 0.52, 2.35);
  place(geos.box, mats.sofa, parent, -6.28, 0.46, 2.02, 0.72, 0.22, 0.14);
  place(geos.box, mats.sofa, parent, -6.28, 0.46, 4.48, 0.72, 0.22, 0.14);
  place(geos.box, mats.cushion, parent, -6.05, 0.5, 2.62, 0.62, 0.1, 0.7);
  place(geos.box, mats.cushion, parent, -6.05, 0.5, 3.88, 0.62, 0.1, 0.7);
  place(geos.sphere, mats.pillow, parent, -6.28, 0.58, 2.62, 0.16, 0.16, 0.1);
  place(geos.sphere, mats.pillow, parent, -6.28, 0.58, 3.88, 0.16, 0.16, 0.1);
}

function addCoffeeTable(parent) {
  const x = -5.2;
  const z = 4.95;
  place(geos.box, mats.table, parent, x, 0.28, z, 0.9, 0.08, 0.58);
  for (const [dx, dz] of [[-0.34, -0.2], [0.34, -0.2], [-0.34, 0.2], [0.34, 0.2]]) {
    place(geos.box, mats.deskLeg, parent, x + dx, 0.13, z + dz, 0.06, 0.26, 0.06);
  }
  place(geos.cyl, mats.mug, parent, x + 0.18, 0.4, z - 0.08, 0.07, 0.1, 0.07);
  place(geos.cyl, mats.coffee, parent, x + 0.18, 0.46, z - 0.08, 0.055, 0.02, 0.055);
  place(geos.cyl, mats.page, parent, x - 0.18, 0.34, z + 0.06, 0.16, 0.025, 0.16);
  const donut = place(geos.torus, mat(0xe7a35a), parent, x - 0.18, 0.4, z + 0.06, 0.09, 0.09, 0.09);
  donut.rotation.x = Math.PI / 2;
}

function addTV(parent) {
  // Screen faces +Z so the overview camera can see it.
  const x = -4.15;
  const z = 1.2;
  place(geos.box, mats.console, parent, x, 0.22, z, 1.25, 0.44, 0.4);
  place(geos.box, mat(0xff5a6a), parent, x + 0.42, 0.16, z + 0.04, 0.26, 0.05, 0.16);
  place(geos.box, mats.bezel, parent, x, 1.0, z + 0.16, 1.42, 0.84, 0.08);
  place(geos.plane, tvMat, parent, x, 1.0, z + 0.21, 1.22, 0.68, 1);
  place(geos.sphere, mat(0xf2c14e), parent, x - 0.48, 0.1, z + 1.5, 0.32, 0.09, 0.32);
  place(geos.sphere, mat(0x8ecae6), parent, x + 0.48, 0.1, z + 1.5, 0.32, 0.09, 0.32);
}

export function buildWorld(scene) {
  const leaves = [];

  place(geos.box, mats.ground, scene, 0, -0.08, 0.4, 40, 0.08, 30);
  place(geos.box, mats.floor, scene, 0, -0.04, -0.3, 26.2, 0.08, 18.6);

  // Back, left, right. The front stays open for the camera.
  place(geos.box, mats.wall, scene, 0, 2.05, -9.05, 26.3, 4.1, 0.28);
  place(geos.box, mats.wall, scene, -13.05, 2.05, -0.35, 0.28, 4.1, 17.4);
  place(geos.box, mats.wall, scene, 13.05, 2.05, -0.35, 0.28, 4.1, 17.4);
  place(geos.box, mats.trim, scene, 0, 0.1, -8.88, 25.7, 0.2, 0.08);
  place(geos.box, mats.trim, scene, -12.88, 0.1, -0.35, 0.08, 0.2, 17.1);
  place(geos.box, mats.trim, scene, 12.88, 0.1, -0.35, 0.08, 0.2, 17.1);

  addWindow(scene, -9.3, 2.75, -8.88);
  addWindow(scene, 4.8, 2.75, -8.88);
  place(geos.box, signMat, scene, -2.2, 3.15, -8.86, 2.6, 0.65, 0.06);

  place(geos.box, mats.rug, scene, -4.15, 0.015, 3.15, 6.4, 0.02, 4.5);
  const plaza = place(geos.circle, mats.rug2, scene, 3.4, 0.02, 1.6, 2.5, 2.5, 2.5);
  plaza.rotation.x = -Math.PI / 2;

  addSofa(scene);
  addCoffeeTable(scene);
  addTV(scene);
  addSnackShelf(scene, -12.55, -1.4);
  addVending(scene, -12.5, 2.15);
  addCooler(scene, -11.85, -7.55);
  addPlant(scene, 7.4, 6.7, 1.15, leaves);
  addPlant(scene, -11.6, 5.6, 0.9, leaves);
  addPlant(scene, 8.6, -6.3, 0.85, leaves);

  // Floor lamp by the sofa.
  place(geos.cyl, mats.chairBase, scene, -7.6, 0.55, 4.7, 0.04, 1.1, 0.04);
  place(geos.cone, mats.lamp, scene, -7.6, 1.2, 4.7, 0.18, 0.22, 0.18);
  place(geos.sphere, mat(0xfff4cc), scene, -7.6, 1.08, 4.7, 0.06, 0.06, 0.06);

  const spots = {
    snack: [
      { x: -11.2, z: -1.95, yaw: Math.PI / 2, entry: null, side: 'south', taken: null },
      { x: -11.2, z: -0.85, yaw: Math.PI / 2, entry: null, side: 'south', taken: null },
    ],
    read: [
      { x: -6.02, z: 2.62, yaw: -Math.PI / 2, entry: { x: -6.02, z: 0.9 }, side: 'south', taken: null },
      { x: -6.02, z: 3.88, yaw: -Math.PI / 2, entry: { x: -6.02, z: 5.55 }, side: 'north', taken: null },
    ],
    game: [
      { x: -4.63, z: 2.7, yaw: 0, entry: { x: -2.35, z: 2.7 }, side: 'south', taken: null },
      { x: -3.67, z: 2.7, yaw: 0, entry: { x: -2.35, z: 2.7 }, side: 'south', taken: null },
    ],
    wander: [
      { x: 1.4, z: -1.6 },
      { x: 4.6, z: -2.2 },
      { x: 6.2, z: 0.4 },
      { x: 3.2, z: 1.5 },
      { x: 5.4, z: 3.6 },
      { x: 2.2, z: 5.6 },
      { x: 0.2, z: 0.2 },
      { x: -8.4, z: -3.4 },
    ],
  };

  return {
    spots,
    animate(time, gaming) {
      tvMat.emissiveIntensity = gaming ? 0.75 + Math.sin(time * 5) * 0.28 : 0.16;
      vendingLightMat.emissiveIntensity = 0.35 + (Math.sin(time * 2.4) * 0.5 + 0.5) * 0.7;
      for (let i = 0; i < leaves.length; i++) {
        leaves[i].rotation.z = Math.sin(time * 0.8 + i * 1.7) * 0.035;
      }
    },
  };
}
