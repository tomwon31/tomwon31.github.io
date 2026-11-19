import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LAYOUT } from './layout.js';
import { mulberry32 } from './rng.js';
import { createFacade } from './facade.js';
import { laneTexture } from './textures.js';

const { streetY } = LAYOUT;
const PALETTE = [0xc4b39c, 0xa08b74, 0x7a5846, 0x908578, 0x655e58, 0xb08a68];

function instances(entries, material) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, entries.length);
  const dummy = new THREE.Object3D();
  entries.forEach((entry, i) => {
    dummy.position.set(entry.x, entry.y, entry.z);
    dummy.scale.set(entry.w, entry.h, entry.d);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

function whitePaint(geo) {
  const colors = new Float32Array(geo.getAttribute('position').count * 3);
  colors.fill(1);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

function carGeometry(kind) {
  if (kind === 'bus') {
    const bus = new THREE.BoxGeometry(1.05, 1.15, 4.5);
    bus.translate(0, 0.62, 0);
    return whitePaint(bus);
  }
  const body = new THREE.BoxGeometry(0.74, 0.3, 1.68);
  body.translate(0, 0.22, 0);
  const cab = new THREE.BoxGeometry(0.66, 0.24, 0.76);
  cab.translate(0, 0.46, -0.1);
  const parts = [body, cab];
  if (kind === 'taxi') {
    const sign = new THREE.BoxGeometry(0.16, 0.045, 0.08);
    sign.translate(0, 0.62, -0.1);
    parts.push(sign);
  }
  return whitePaint(mergeGeometries(parts));
}

function carMaterial(emissive) {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.5,
    metalness: 0.38,
    vertexColors: true,
    emissive,
    emissiveIntensity: 0,
  });
}

function stackTower(parent, mat, metal, x, z, tiers, needle) {
  let y = streetY;
  tiers.forEach((tier) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(tier.w, tier.h, tier.d), mat);
    mesh.position.set(x, y + tier.h / 2, z);
    parent.add(mesh);
    y += tier.h;
  });
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.62, needle, 6), metal);
  spire.position.set(x, y + needle / 2, z);
  parent.add(spire);
  y += needle;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.2, 5), metal);
  mast.position.set(x, y + 1.6, z);
  parent.add(mast);
  return y + 3.2;
}

const AVENUE = {
  near: -86,
  far: -122,
  half: 9.4,
};
const CROSS_Z = -128;
const CROSS_END = 72;
const PARK = { x: 70, z0: -138, z1: -214 };

function inPark(x, z) {
  return Math.abs(x) < PARK.x + 4 && z < PARK.z0 + 6 && z > PARK.z1 - 6;
}

const FOLIAGE = {
  autumn: [0xd4a44a, 0xc45a28, 0xe0b15c, 0xa33d28, 0xb88840],
  spring: [0x9aaa62, 0xc6c06a, 0x7d9a58, 0xa8b86a],
  summer: [0x4e7344, 0x3d6240, 0x5c814c, 0x3f6b3c],
};

function nySeason() {
  const month = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'numeric',
  }).format(new Date()));
  if (month === 12 || month <= 2) return 'winter';
  if (month <= 5) return 'spring';
  if (month <= 8) return 'summer';
  return 'autumn';
}

function paintLawn(ctx, season, snow) {
  const base = { autumn: '#7a7344', summer: '#4d7044', spring: '#7d9456', winter: '#8a8478' }[season];
  const patches = {
    autumn: ['#8d8448', '#6a5e38', '#a89050'],
    summer: ['#3f623c', '#5a7d4c', '#45683e'],
    spring: ['#8aa362', '#6e8a4c', '#98a86a'],
    winter: ['#7e7a70', '#948e84', '#6e6a62'],
  }[season];
  ctx.globalAlpha = 1;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  const rng = mulberry32(3);
  for (let i = 0; i < 36; i += 1) {
    ctx.fillStyle = patches[i % patches.length];
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.ellipse(rng() * 512, rng() * 512, 28 + rng() * 70, 18 + rng() * 36, rng() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (snow > 0.2) {
    ctx.fillStyle = `rgba(232, 238, 242, ${Math.min(0.8, (snow - 0.15) * 0.85)})`;
    ctx.fillRect(0, 0, 512, 512);
  }
}

function buildPark(root, rand) {
  const depth = PARK.z0 - PARK.z1;
  const width = PARK.x * 2;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const midZ = (PARK.z0 + PARK.z1) / 2;
  const lawn = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 }),
  );
  lawn.rotation.x = -Math.PI / 2;
  lawn.position.set(0, streetY + 0.04, midZ);
  root.add(lawn);

  const pathMat = new THREE.MeshStandardMaterial({ color: 0xc2b49a, roughness: 0.97 });
  const longPath = new THREE.Mesh(new THREE.PlaneGeometry(3.1, depth * 0.9), pathMat);
  longPath.rotation.x = -Math.PI / 2;
  longPath.position.set(0, streetY + 0.06, midZ);
  const crossPath = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.7, 2.8), pathMat);
  crossPath.rotation.x = -Math.PI / 2;
  crossPath.position.set(6, streetY + 0.065, PARK.z0 - 18);
  const sidePath = new THREE.Mesh(new THREE.PlaneGeometry(2.8, depth * 0.78), pathMat);
  sidePath.rotation.x = -Math.PI / 2;
  sidePath.position.set(26, streetY + 0.07, midZ + 2);
  root.add(longPath, crossPath, sidePath);

  const snowMat = new THREE.MeshStandardMaterial({
    color: 0xe6eef2,
    roughness: 0.9,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const snow = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), snowMat);
  snow.rotation.x = -Math.PI / 2;
  snow.position.set(0, streetY + 0.1, midZ);
  root.add(snow);

  const spots = [];
  let guard = 0;
  while (spots.length < 70 && guard < 500) {
    guard += 1;
    const x = (rand() - 0.5) * (width - 10);
    const z = PARK.z0 - 8 - rand() * (depth - 16);
    if (Math.abs(x) < 5.2 || Math.abs(x - 26) < 4.4) continue;
    if (Math.abs(z - (PARK.z0 - 18)) < 4.2 && x > -width * 0.32 && x < width * 0.42) continue;
    spots.push({ x, z, scale: 0.8 + rand() * 0.75, hue: rand() });
  }

  const trunkGeo = new THREE.CylinderGeometry(0.28, 0.46, 3.4, 5);
  trunkGeo.translate(0, 1.7, 0);
  whitePaint(trunkGeo);
  const canopyGeo = new THREE.SphereGeometry(4.2, 6, 5);
  canopyGeo.translate(0, 5.6, 0);
  whitePaint(canopyGeo);
  const capGeo = new THREE.SphereGeometry(3.4, 6, 4);
  capGeo.scale(1, 0.34, 1);
  capGeo.translate(0, 7.2, 0);

  const trunks = new THREE.InstancedMesh(
    trunkGeo,
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, vertexColors: true }),
    spots.length,
  );
  const canopy = new THREE.InstancedMesh(
    canopyGeo,
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86, vertexColors: true }),
    spots.length,
  );
  const caps = new THREE.InstancedMesh(
    capGeo,
    new THREE.MeshStandardMaterial({ color: 0xf3f6f8, roughness: 0.78 }),
    spots.length,
  );
  [trunks, canopy, caps].forEach((mesh) => {
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  });
  const dummy = new THREE.Object3D();
  const bark = new THREE.Color(0x5c4636);
  spots.forEach((spot, i) => {
    dummy.position.set(spot.x, streetY, spot.z);
    dummy.rotation.set(0, spot.hue * 6, 0);
    dummy.scale.set(spot.scale, 0.95 + spot.scale * 0.2, spot.scale);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    trunks.setColorAt(i, bark);
    dummy.scale.set(spot.scale, 0.52, spot.scale);
    dummy.updateMatrix();
    canopy.setMatrixAt(i, dummy.matrix);
    caps.setMatrixAt(i, dummy.matrix);
  });
  trunks.instanceColor.needsUpdate = true;
  root.add(trunks, canopy, caps);
  caps.visible = false;

  let key = '';
  function applySeason(season, snowAmt) {
    const next = `${season}|${Math.round(snowAmt * 5)}`;
    if (next === key) return;
    key = next;
    paintLawn(ctx, season, snowAmt);
    tex.needsUpdate = true;
    snowMat.opacity = Math.min(0.7, Math.max(0, snowAmt - 0.12) * 0.72);
    const bare = season === 'winter';
    canopy.visible = !bare;
    caps.visible = snowAmt > 0.32;
    if (!bare) {
      const colors = FOLIAGE[season];
      spots.forEach((spot, i) => {
        canopy.setColorAt(i, new THREE.Color(colors[Math.floor(spot.hue * colors.length) % colors.length]));
      });
      canopy.instanceColor.needsUpdate = true;
    }
  }

  return { applySeason };
}

function buildRoads(root) {
  const lane = laneTexture();
  lane.wrapS = lane.wrapT = THREE.RepeatWrapping;
  lane.repeat.set(1, 7);
  const aveLen = Math.abs(AVENUE.far - AVENUE.near) + 14;
  const aveZ = (AVENUE.near + AVENUE.far) / 2 - 4;
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(AVENUE.half * 2, aveLen),
    new THREE.MeshStandardMaterial({ map: lane, roughness: 0.96, metalness: 0.02 }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, streetY + 0.02, aveZ);
  root.add(road);

  const asphalt = new THREE.MeshStandardMaterial({ color: 0x2c2a28, roughness: 0.97 });
  const cross = new THREE.Mesh(new THREE.PlaneGeometry(CROSS_END * 2 + 16, 15), asphalt);
  cross.rotation.x = -Math.PI / 2;
  cross.position.set(0, streetY + 0.03, CROSS_Z);
  root.add(cross);
  const line = new THREE.Mesh(
    new THREE.PlaneGeometry(CROSS_END * 1.6, 0.16),
    new THREE.MeshStandardMaterial({ color: 0xcabb8a, roughness: 0.8 }),
  );
  line.rotation.x = -Math.PI / 2;
  line.position.set(0, streetY + 0.045, CROSS_Z);
  root.add(line);

  const walkMat = new THREE.MeshStandardMaterial({ color: 0x8a847c, roughness: 1 });
  for (const side of [-1, 1]) {
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(2.6, aveLen), walkMat);
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(side * (AVENUE.half + 1.6), streetY + 0.05, aveZ);
    root.add(walk);
  }
  const edge = new THREE.Mesh(new THREE.PlaneGeometry(CROSS_END * 2, 2.4), walkMat);
  edge.rotation.x = -Math.PI / 2;
  edge.position.set(0, streetY + 0.05, CROSS_Z + 8.6);
  root.add(edge);
}

function buildLamps(root) {
  const spots = [];
  for (let z = AVENUE.near - 2; z >= AVENUE.far; z -= 16) {
    spots.push([-9.6, z], [9.6, z]);
  }
  for (let x = -48; x <= 48; x += 24) spots.push([x, CROSS_Z + 9]);
  const poleGeo = new THREE.CylinderGeometry(0.09, 0.13, 7.4, 5);
  const headGeo = new THREE.SphereGeometry(0.32, 6, 5);
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x3a3428,
    emissive: 0xffc27a,
    emissiveIntensity: 0.12,
    roughness: 0.45,
  });
  const poles = new THREE.InstancedMesh(
    poleGeo,
    new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 0.7, metalness: 0.4 }),
    spots.length,
  );
  const heads = new THREE.InstancedMesh(headGeo, headMat, spots.length);
  poles.frustumCulled = false;
  heads.frustumCulled = false;
  const dummy = new THREE.Object3D();
  spots.forEach(([x, z], i) => {
    dummy.position.set(x, streetY + 3.7, z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    poles.setMatrixAt(i, dummy.matrix);
    dummy.position.y = streetY + 7.5;
    dummy.updateMatrix();
    heads.setMatrixAt(i, dummy.matrix);
  });
  root.add(poles, heads);
  return headMat;
}

const OUT_LANES = [2.35, 5.15];
const IN_LANES = [-2.35, -5.15];

function wrapAngle(angle) {
  let value = angle;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

function advanceCar(car, dt) {
  if (car.phase === 'turn') {
    const diff = wrapAngle(car.target - car.rot);
    car.rot += Math.max(-1.4 * dt, Math.min(1.4 * dt, diff));
    car.x += Math.sin(car.rot) * car.speed * dt;
    car.z += Math.cos(car.rot) * car.speed * dt;
    if (Math.abs(diff) < 0.09) {
      car.rot = car.target;
      car.phase = car.next;
      if (car.next === 'cross') car.z = CROSS_Z + (car.turn > 0 ? 2.6 : -2.6);
      if (car.next === 'ave' && car.flow === 'in') car.x = IN_LANES[car.lane];
    }
    return;
  }
  if (car.flow === 'out' && car.phase === 'ave') {
    car.rot = Math.PI;
    car.x = OUT_LANES[car.lane];
    car.z -= car.speed * dt;
    if (car.z <= AVENUE.far) {
      car.phase = 'turn';
      car.target = car.turn > 0 ? Math.PI / 2 : -Math.PI / 2;
      car.next = 'cross';
    }
    return;
  }
  if (car.flow === 'out' && car.phase === 'cross') {
    car.rot = car.turn > 0 ? Math.PI / 2 : -Math.PI / 2;
    car.z = CROSS_Z + (car.turn > 0 ? 2.6 : -2.6);
    car.x += car.turn * car.speed * dt;
    if (Math.abs(car.x) > CROSS_END) {
      car.phase = 'ave';
      car.z = AVENUE.near - car.lane * 4;
      car.x = OUT_LANES[car.lane];
      car.rot = Math.PI;
    }
    return;
  }
  if (car.flow === 'in' && car.phase === 'cross') {
    const dir = -car.side;
    car.rot = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    car.z = CROSS_Z + (dir > 0 ? 2.6 : -2.6);
    car.x += dir * car.speed * dt;
    const arrived = dir < 0 ? car.x < 8 : car.x > -8;
    if (arrived) {
      car.phase = 'turn';
      car.target = 0;
      car.next = 'ave';
    }
    return;
  }
  car.rot = 0;
  car.x = IN_LANES[car.lane];
  car.z += car.speed * dt;
  if (car.z > AVENUE.near + 3) {
    car.phase = 'cross';
    car.x = car.side * CROSS_END;
    car.z = CROSS_Z + (car.side < 0 ? 2.6 : -2.6);
    car.rot = car.side > 0 ? -Math.PI / 2 : Math.PI / 2;
  }
}

function buildTraffic(root, rand) {
  const count = 18;
  const bodyMat = carMaterial(0x141414);
  const body = new THREE.InstancedMesh(carGeometry('sedan'), bodyMat, count);
  const beamGeo = new THREE.BoxGeometry(0.36, 0.07, 1.6);
  const headMat = new THREE.MeshBasicMaterial({
    color: 0xfff6e8,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: true,
  });
  const tailMat = new THREE.MeshBasicMaterial({
    color: 0xc4382c,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: true,
  });
  const heads = new THREE.InstancedMesh(beamGeo, headMat, count);
  const tails = new THREE.InstancedMesh(beamGeo, tailMat, count);
  [body, heads, tails].forEach((mesh) => {
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  });
  heads.visible = false;
  tails.visible = false;
  root.add(body, heads, tails);

  const colors = [0xd2b03c, 0x1c1e20, 0x2a3544, 0x6a3834, 0x8a8782, 0xd4d0c8, 0xd2b03c, 0x243044];
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const outbound = i < 10;
    const lane = i % 2;
    const turn = i % 3 === 0 ? -1 : 1;
    const side = i % 2 === 0 ? 1 : -1;
    const car = {
      flow: outbound ? 'out' : 'in',
      phase: 'ave',
      lane,
      turn,
      side,
      speed: 6.1 + rand() * 2.2,
      x: outbound ? OUT_LANES[lane] : IN_LANES[lane],
      z: AVENUE.near - 3 - (i % 5) * 8.5,
      rot: outbound ? Math.PI : 0,
      target: 0,
      next: 'ave',
    };
    if (!outbound && i % 2 === 0) {
      car.phase = 'cross';
      car.x = side * (16 + (i % 4) * 11);
      car.z = CROSS_Z + (side < 0 ? 2.6 : -2.6);
      car.rot = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    } else if (outbound && i % 4 === 0) {
      car.phase = 'cross';
      car.x = turn * (14 + (i % 3) * 14);
      car.z = CROSS_Z + (turn > 0 ? 2.6 : -2.6);
      car.rot = turn > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    cars.push(car);
    body.setColorAt(i, new THREE.Color(colors[i % colors.length]));
  }
  body.instanceColor.needsUpdate = true;

  const dummy = new THREE.Object3D();
  function step(dt, night) {
    const lights = night > 0.38;
    heads.visible = lights;
    tails.visible = lights;
    const stretch = 0.55 + night * 2.4;
    headMat.opacity = lights ? 0.92 : 0;
    tailMat.opacity = lights ? 0.84 : 0;
    cars.forEach((car, index) => {
      advanceCar(car, dt);
      dummy.position.set(car.x, streetY, car.z);
      dummy.rotation.set(0, car.rot, 0);
      dummy.scale.set(1.45, 1.45, 1.45);
      dummy.updateMatrix();
      body.setMatrixAt(index, dummy.matrix);
      if (!lights) return;
      const fx = Math.sin(car.rot);
      const fz = Math.cos(car.rot);
      dummy.scale.set(1, 1, stretch);
      dummy.position.set(car.x + fx * (1.3 + stretch * 0.4), streetY + 0.32, car.z + fz * (1.3 + stretch * 0.4));
      dummy.updateMatrix();
      heads.setMatrixAt(index, dummy.matrix);
      dummy.position.set(car.x - fx * (1.35 + stretch * 0.5), streetY + 0.28, car.z - fz * (1.35 + stretch * 0.5));
      dummy.updateMatrix();
      tails.setMatrixAt(index, dummy.matrix);
    });
    body.instanceMatrix.needsUpdate = true;
    if (lights) {
      heads.instanceMatrix.needsUpdate = true;
      tails.instanceMatrix.needsUpdate = true;
    }
  }
  return { step };
}

function buildSignals(root) {
  const aveMat = new THREE.MeshBasicMaterial({ color: 0x2c7a40, toneMapped: true });
  const crossMat = new THREE.MeshBasicMaterial({ color: 0x8e342e, toneMapped: true });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 0.6, metalness: 0.45 });
  [[-28, 7.4, aveMat], [28, 7.4, aveMat], [-28, -7.4, crossMat], [32, -7.4, crossMat]].forEach(([x, dz, mat]) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 7.2, 5), poleMat);
    pole.position.set(x, streetY + 3.6, CROSS_Z + dz);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.35, 0.7), mat);
    head.position.set(x, streetY + 7.4, CROSS_Z + dz);
    root.add(pole, head);
  });
  return { aveMat, crossMat };
}

function paintSignals(signals, time, night) {
  const period = 18;
  const t = ((time % period) + period) % period;
  let ave = 'red';
  let cross = 'green';
  if (t < 7) {
    ave = 'green';
    cross = 'red';
  } else if (t < 8.4) {
    ave = 'yellow';
    cross = 'red';
  } else if (t >= 15.4) {
    ave = 'red';
    cross = 'yellow';
  }
  const lit = night > 0.4;
  const color = {
    green: lit ? 0x3dba62 : 0x2c7a40,
    yellow: lit ? 0xe0b03a : 0xb08a2c,
    red: lit ? 0xd0453c : 0x8e342e,
  };
  signals.aveMat.color.setHex(color[ave]);
  signals.crossMat.color.setHex(color[cross]);
}

export function buildCity(scene) {
  const root = new THREE.Group();
  scene.add(root);
  const rand = mulberry32(1977);
  const buckets = PALETTE.map(() => []);

  let z = -32;
  for (let row = 0; row < 7; row += 1) {
    for (const side of [-1, 1]) {
      const edge = Math.max(24, Math.abs(z) * 0.36);
      const w = 11 + rand() * 9;
      const d = 11 + rand() * 8;
      let h = 46 + rand() ** 0.62 * 40 + rand() * 16;
      const x = side * (edge + w / 2);
      const zz = z - d / 2;
      if (!inPark(x, zz) && Math.abs(x) > 22) {
        const color = Math.floor(rand() * PALETTE.length);
        buckets[color].push({ x, y: streetY + h / 2, z: zz, w, h, d });
        if (h > 48 && rand() > 0.55) {
          const hh = 4 + rand() * 8;
          buckets[color].push({
            x,
            y: streetY + h + hh / 2,
            z: zz,
            w: w * 0.62,
            h: hh,
            d: d * 0.62,
          });
        }
      }
    }
    z -= 22 + rand() * 6;
  }

  for (let i = 0; i < 18; i += 1) {
    const x = (i - 9) * 16 + (rand() - 0.5) * 4;
    if (Math.abs(x) < 20) continue;
    const w = 8 + rand() * 8;
    const d = 8 + rand() * 6;
    const h = 22 + rand() * 28;
    buckets[i % PALETTE.length].push({
      x,
      y: streetY + h / 2,
      z: -286 - rand() * 24,
      w,
      h,
      d,
    });
  }

  buckets.forEach((entries, i) => {
    if (entries.length) root.add(instances(entries, createFacade(PALETTE[i])));
  });

  const limestone = createFacade(0xd8d0c2);
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xc8c2b6, metalness: 0.55, roughness: 0.34 });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0x2a0504,
    emissive: 0xff2a22,
    emissiveIntensity: 1.1,
    roughness: 0.4,
  });
  const spireX = -46;
  const spireZ = -304;
  const esbTop = stackTower(root, limestone, metalMat, spireX, spireZ, [
    { w: 16, h: 10, d: 14 },
    { w: 11, h: 18, d: 10 },
    { w: 7, h: 6, d: 6.5 },
    { w: 4.2, h: 4, d: 4 },
  ], 8);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), beaconMat);
  beacon.position.set(spireX, esbTop, spireZ);
  root.add(beacon);
  stackTower(root, createFacade(0x8e867c), metalMat, 54, -296, [
    { w: 14, h: 12, d: 12 },
    { w: 9, h: 10, d: 8 },
    { w: 5, h: 5, d: 4.5 },
  ], 5);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 560),
    new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, streetY - 0.08, -170);
  ground.frustumCulled = false;
  root.add(ground);

  const park = buildPark(root, rand);
  buildRoads(root);
  const lampMat = buildLamps(root);
  const traffic = buildTraffic(root, rand);
  const signals = buildSignals(root);
  const season = nySeason();


  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 1024;
  skyCanvas.height = 512;
  const skyCtx = skyCanvas.getContext('2d');
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.colorSpace = THREE.SRGBColorSpace;
  skyTex.magFilter = THREE.LinearFilter;
  skyTex.minFilter = THREE.LinearFilter;
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(820, 460),
    new THREE.MeshBasicMaterial({ map: skyTex, fog: false, depthWrite: false }),
  );
  sky.position.set(0, 36, -360);
  sky.frustumCulled = false;
  sky.renderOrder = -2;
  scene.add(sky);
  let skyKey = '';

  function paintSky(look) {
    const key = [
      look.skyTop.getHexString(),
      look.skyUpper.getHexString(),
      look.skyHorizon.getHexString(),
      look.skyBelow.getHexString(),
      look.silhouette.getHexString(),
      look.disc.toFixed(2),
      look.moon.toFixed(2),
      look.night.toFixed(2),
    ].join('|');
    if (key === skyKey) return;
    skyKey = key;
    const w = skyCanvas.width;
    const h = skyCanvas.height;
    const g = skyCtx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, look.skyTop.getStyle());
    g.addColorStop(0.34, look.skyUpper.getStyle());
    g.addColorStop(0.56, look.skyHorizon.getStyle());
    g.addColorStop(0.72, look.skyHorizon.getStyle());
    g.addColorStop(1, look.skyBelow.getStyle());
    skyCtx.fillStyle = g;
    skyCtx.fillRect(0, 0, w, h);

    if (look.disc > 0.04) {
      const cx = w * 0.3;
      const cy = h * 0.3;
      const rad = w * 0.045;
      const glow = skyCtx.createRadialGradient(cx, cy, rad * 0.05, cx, cy, rad);
      const a = look.disc;
      glow.addColorStop(0, `rgba(255, 246, 220, ${0.92 * a})`);
      glow.addColorStop(0.18, `rgba(255, 198, 120, ${0.5 * a})`);
      glow.addColorStop(1, 'rgba(255, 180, 90, 0)');
      skyCtx.fillStyle = glow;
      skyCtx.fillRect(0, 0, w, h);
    }
    if (look.moon > 0.15) {
      skyCtx.fillStyle = `rgba(236, 232, 220, ${0.9 * look.moon})`;
      skyCtx.beginPath();
      skyCtx.arc(w * 0.7, h * 0.22, 11, 0, Math.PI * 2);
      skyCtx.fill();
    }

    skyCtx.fillStyle = look.silhouette.getStyle();
    const base = h * 0.64;
    const ridge = mulberry32(11);
    let x = 0;
    while (x < w) {
      const bw = 12 + ridge() * 30;
      const bh = 16 + ridge() * ridge() * h * 0.2;
      skyCtx.globalAlpha = 0.25 + ridge() * 0.4;
      skyCtx.fillRect(x, base - bh, bw + 1, bh + h);
      if (ridge() > 0.92) skyCtx.fillRect(x + bw * 0.45, base - bh - 18, 2, 22);
      x += bw * 0.84;
    }
    skyCtx.globalAlpha = 1;
    if (look.night > 0.3) {
      const lights = mulberry32(29);
      for (let i = 0; i < 360; i += 1) {
        const px = lights() * w;
        const py = base - 8 - lights() * h * 0.18;
        skyCtx.globalAlpha = 0.25 + look.night * 0.45;
        skyCtx.fillStyle = lights() > 0.86 ? '#d5e4ff' : '#ffc27a';
        skyCtx.fillRect(px, py, 2, 2);
      }
      skyCtx.globalAlpha = 1;
    }
    skyTex.needsUpdate = true;
  }

  function update(dt, state = {}) {
    const night = typeof state === 'number' ? state : (state.night || 0);
    const snow = typeof state === 'number' ? 0 : (state.snow || 0);
    const time = typeof state === 'number' ? 0 : (state.time || 0);
    traffic.step(dt, night);
    park.applySeason(season, snow);
    lampMat.emissiveIntensity = 0.1 + night * 1.65;
    paintSignals(signals, time, night);
    const pulse = 0.55 + (Math.sin(time * 2.1) * 0.5 + 0.5) * 0.85;
    beaconMat.emissiveIntensity = pulse * (0.22 + night * 0.75);
  }

  return { root, paintSky, update };
}
