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

export function buildCity(scene) {
  const root = new THREE.Group();
  scene.add(root);
  const rand = mulberry32(1977);
  const buckets = PALETTE.map(() => []);

  let z = -16;
  for (let row = 0; row < 12; row += 1) {
    if (row > 0 && row % 4 === 0) z -= 7;
    for (const side of [-1, 1]) {
      let edge = 11.4;
      for (let col = 0; col < 3; col += 1) {
        const w = 7.4 + rand() * 6.2;
        const d = 7.2 + rand() * 5.4;
        let h = 14 + rand() ** 0.7 * (26 + row * 1.4);
        if (col === 0) h += 8 + rand() * 14;
        if (rand() > 0.9) h += 16 + rand() * 18;
        const x = side * (edge + w / 2);
        const zz = z - d / 2;
        const blocked = Math.abs(x) < 16 && zz < -156 || Math.abs(x - 26) < 12 && zz < -128 && zz > -158;
        if (!blocked) {
          const color = Math.floor(rand() * PALETTE.length);
          buckets[color].push({ x, y: streetY + h / 2, z: zz, w, h, d });
          if (h > 34 && rand() > 0.42) {
            const hw = w * (0.55 + rand() * 0.16);
            const hd = d * (0.55 + rand() * 0.16);
            const hh = 3.5 + rand() * 7;
            buckets[color].push({ x, y: streetY + h + hh / 2, z: zz, w: hw, h: hh, d: hd });
          }
        }
        edge += w + 1.3 + rand() * 1.5;
      }
    }
    z -= 12.5 + rand() * 2;
  }

  for (let i = 0; i < 26; i += 1) {
    const x = (i - 13) * 9 + (rand() - 0.5) * 2;
    if (Math.abs(x) < 14) continue;
    const w = 6 + rand() * 6;
    const d = 6 + rand() * 5;
    const h = 16 + rand() * 20;
    buckets[i % PALETTE.length].push({
      x,
      y: streetY + h / 2,
      z: -208 - rand() * 16,
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
    emissiveIntensity: 1.5,
    roughness: 0.4,
  });
  const esbTop = stackTower(root, limestone, metalMat, 0, -172, [
    { w: 18, h: 8, d: 15 },
    { w: 12, h: 16, d: 11 },
    { w: 8, h: 5.5, d: 7.5 },
    { w: 4.6, h: 3.6, d: 4.4 },
  ], 6.5);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), beaconMat);
  beacon.position.set(0, esbTop, -172);
  root.add(beacon);

  const crownMat = createFacade(0x8e867c);
  stackTower(root, crownMat, metalMat, 26, -142, [
    { w: 12, h: 10, d: 10 },
    { w: 8, h: 9, d: 7 },
    { w: 4.5, h: 4, d: 4 },
  ], 4);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(480, 480),
    new THREE.MeshStandardMaterial({ color: 0x2c2926, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = streetY - 0.06;
  ground.frustumCulled = false;
  root.add(ground);

  const lane = laneTexture();
  lane.wrapS = lane.wrapT = THREE.RepeatWrapping;
  lane.repeat.set(1, 16);
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(15.2, 108),
    new THREE.MeshStandardMaterial({ map: lane, roughness: 0.96, metalness: 0.02 }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, streetY + 0.02, -104);
  root.add(road);

  const walkMat = new THREE.MeshStandardMaterial({ color: 0x7a746c, roughness: 1 });
  for (const side of [-1, 1]) {
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 108), walkMat);
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(side * 9.45, streetY + 0.045, -104);
    root.add(walk);
  }

  const headMat = new THREE.MeshStandardMaterial({
    color: 0x3a301c,
    emissive: 0xffb14a,
    emissiveIntensity: 0.2,
    roughness: 0.4,
  });
  const poleGeo = new THREE.CylinderGeometry(0.055, 0.08, 4.6, 5);
  const headGeo = new THREE.SphereGeometry(0.14, 6, 5);
  const lampCount = 10;
  const poles = new THREE.InstancedMesh(poleGeo, new THREE.MeshStandardMaterial({ color: 0x2a2724, roughness: 0.7, metalness: 0.35 }), lampCount);
  const heads = new THREE.InstancedMesh(headGeo, headMat, lampCount);
  poles.frustumCulled = false;
  heads.frustumCulled = false;
  const lampDummy = new THREE.Object3D();
  for (let i = 0; i < lampCount; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const zz = -68 - Math.floor(i / 2) * 18;
    lampDummy.position.set(side * 7.6, streetY + 2.3, zz);
    lampDummy.scale.set(1, 1, 1);
    lampDummy.rotation.set(0, 0, 0);
    lampDummy.updateMatrix();
    poles.setMatrixAt(i, lampDummy.matrix);
    lampDummy.position.y = streetY + 4.7;
    lampDummy.updateMatrix();
    heads.setMatrixAt(i, lampDummy.matrix);
  }
  root.add(poles, heads);

  const taxiMat = carMaterial(0xffd27a);
  const darkMat = carMaterial(0xfff1d2);
  const busMat = carMaterial(0xffe6c4);
  const taxiMesh = new THREE.InstancedMesh(carGeometry('taxi'), taxiMat, 8);
  const darkMesh = new THREE.InstancedMesh(carGeometry('sedan'), darkMat, 8);
  const busMesh = new THREE.InstancedMesh(carGeometry('bus'), busMat, 4);
  [taxiMesh, darkMesh, busMesh].forEach((mesh) => {
    mesh.frustumCulled = false;
    root.add(mesh);
  });

  const taxis = [];
  const darks = [];
  const buses = [];
  const lanes = [
    { x: 1.7, dir: -1 },
    { x: 4.15, dir: -1 },
    { x: -1.7, dir: 1 },
    { x: -4.15, dir: 1 },
  ];
  const darkColors = [0x2a2e33, 0x3c342c, 0x1c2733, 0x4a463f, 0x151515].map((hex) => new THREE.Color(hex));
  lanes.forEach((laneInfo) => {
    for (let i = 0; i < 4; i += 1) {
      const taxi = i % 2 === 0;
      const list = taxi ? taxis : darks;
      const mesh = taxi ? taxiMesh : darkMesh;
      const color = taxi ? new THREE.Color(0xf0c31f) : darkColors[(list.length + i) % darkColors.length].clone();
      if (taxi) color.offsetHSL(0, (rand() - 0.5) * 0.04, (rand() - 0.5) * 0.05);
      list.push({
        x: laneInfo.x,
        z: -60 - rand() * 90,
        dir: laneInfo.dir,
        speed: 8 + rand() * 7,
        sx: 0.92 + rand() * 0.16,
      });
      mesh.setColorAt(list.length - 1, color);
    }
  });
  for (let i = 0; i < 4; i += 1) {
    const dir = i < 2 ? -1 : 1;
    buses.push({
      x: dir < 0 ? 6.05 : -6.05,
      z: -70 - i * 22,
      dir,
      speed: 6.5 + rand() * 2,
      sx: 1,
    });
    busMesh.setColorAt(i, new THREE.Color(i % 2 ? 0x2a4568 : 0xd5cfc2));
  }
  taxiMesh.instanceColor.needsUpdate = true;
  darkMesh.instanceColor.needsUpdate = true;
  busMesh.instanceColor.needsUpdate = true;

  const fleets = [
    { mesh: taxiMesh, items: taxis, y: 0 },
    { mesh: darkMesh, items: darks, y: 0 },
    { mesh: busMesh, items: buses, y: 0 },
  ];
  const vehicle = new THREE.Object3D();

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
  sky.position.set(0, 16, -250);
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
      const rad = w * 0.12;
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

  function update(dt, night) {
    for (const fleet of fleets) {
      fleet.items.forEach((item, index) => {
        item.z += item.dir * item.speed * dt;
        if (item.dir < 0 && item.z < -156) item.z = -58;
        if (item.dir > 0 && item.z > -56) item.z = -156;
        vehicle.position.set(item.x, streetY, item.z);
        vehicle.rotation.set(0, item.dir < 0 ? Math.PI : 0, 0);
        vehicle.scale.set(item.sx, 1, 1);
        vehicle.updateMatrix();
        fleet.mesh.setMatrixAt(index, vehicle.matrix);
      });
      fleet.mesh.instanceMatrix.needsUpdate = true;
    }
    taxiMat.emissiveIntensity = 0.04 + night * 0.5;
    darkMat.emissiveIntensity = night * 0.2;
    busMat.emissiveIntensity = night * 0.16;
    headMat.emissiveIntensity = 0.12 + night * 2.1;
    const pulse = 0.65 + (Math.sin(performance.now() * 0.0022) * 0.5 + 0.5) * 1.1;
    beaconMat.emissiveIntensity = pulse * (0.35 + night * 0.9);
  }

  return { root, paintSky, update };
}
