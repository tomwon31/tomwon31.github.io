import * as THREE from 'three';
import { LAYOUT } from './layout.js';
import {
  woodTexture,
  rugTexture,
  paperTexture,
  keyboardTexture,
  photoTexture,
  newsTexture,
  steamTexture,
} from './textures.js';

const SCREEN = { w: 0.66, h: 0.4125, x: 0, y: 1.15, z: -0.3, tilt: -0.072 };
const SURFACE = 0.774;

function cache(store, key, build) {
  let value = store.get(key);
  if (!value) {
    value = build();
    store.set(key, value);
  }
  return value;
}

export function buildRoom(scene) {
  const root = new THREE.Group();
  scene.add(root);
  const anchors = {
    lampPos: new THREE.Vector3(0.86, 1.16, -0.14),
    lampTarget: new THREE.Vector3(0.12, 0.76, 0.08),
    glowPos: new THREE.Vector3(),
  };
  const boxes = new Map();
  const box = (w, h, d) => cache(boxes, `${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));

  const plaster = new THREE.MeshStandardMaterial({ color: 0xcbbda8, roughness: 0.94 });
  const plasterDark = new THREE.MeshStandardMaterial({
    color: 0xe4d7c4,
    emissive: 0x5a4030,
    emissiveIntensity: 0.22,
    roughness: 0.95,
  });
  const floorMat = new THREE.MeshStandardMaterial({
    map: woodTexture({ base: '#8a6244', dark: '#5c3d28', planks: 7 }),
    roughness: 0.84,
    metalness: 0.02,
  });
  floorMat.map.wrapS = floorMat.map.wrapT = THREE.RepeatWrapping;
  floorMat.map.repeat.set(3.4, 2.6);
  const deskMap = woodTexture({ base: '#5a3822', dark: '#3a2416', planks: 3, w: 512, h: 256 });
  deskMap.wrapS = deskMap.wrapT = THREE.RepeatWrapping;
  deskMap.repeat.set(1.5, 1);
  const deskMat = new THREE.MeshStandardMaterial({ map: deskMap, roughness: 0.46, metalness: 0.08 });
  const wainscot = new THREE.MeshStandardMaterial({
    map: woodTexture({ base: '#6b4a30', dark: '#3e2a1c', planks: 4, w: 256, h: 256 }),
    roughness: 0.72,
  });
  wainscot.map.wrapS = wainscot.map.wrapT = THREE.RepeatWrapping;
  wainscot.map.repeat.set(1.2, 1);
  const leather = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.62, metalness: 0.05 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08a4a, roughness: 0.32, metalness: 0.82 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x2c2a28, roughness: 0.42, metalness: 0.72 });
  const paper = new THREE.MeshStandardMaterial({ map: paperTexture(), roughness: 0.92, metalness: 0 });
  const blotter = new THREE.MeshStandardMaterial({ color: 0x5c382e, roughness: 0.78 });
  const bezel = new THREE.MeshStandardMaterial({ color: 0x161311, roughness: 0.48, metalness: 0.22 });
  const lampMetal = new THREE.MeshStandardMaterial({
    color: 0xc98945,
    roughness: 0.3,
    metalness: 0.9,
  });
  const shade = new THREE.MeshStandardMaterial({
    color: 0x0c4a30,
    emissive: 0x145c38,
    emissiveIntensity: 0.28,
    roughness: 0.2,
    metalness: 0.06,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  });
  const drapeMat = new THREE.MeshStandardMaterial({ color: 0x6a2430, roughness: 0.96 });
  const potMat = new THREE.MeshStandardMaterial({ color: 0x8d4a30, roughness: 0.7 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f5a38, roughness: 0.8 });
  const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x3f6b42, roughness: 0.78 });
  const rugMat = new THREE.MeshStandardMaterial({ map: rugTexture(), roughness: 0.96 });
  rugMat.polygonOffset = true;
  rugMat.polygonOffsetFactor = -2;
  rugMat.polygonOffsetUnits = -2;

  const steam = [];
  const colors = new Map();
  const paint = (hex, rough = 0.7, metalness = 0) => cache(colors, `${hex}|${rough}|${metalness}`, () => new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness }));

  function put(parent, geo, mat, x, y, z, opt = {}) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    if (opt.rot) mesh.rotation.set(opt.rot[0] || 0, opt.rot[1] || 0, opt.rot[2] || 0);
    mesh.castShadow = Boolean(opt.cast);
    mesh.receiveShadow = Boolean(opt.receive);
    parent.add(mesh);
    return mesh;
  }

  buildShell();
  buildDesk();
  const screen = buildComputer();
  buildChair();
  buildProps();

  root.updateWorldMatrix(true, true);
  anchors.glowPos.copy(screen.position).addScaledVector(screen.normal, 0.08);

  return {
    root,
    screen,
    shade,
    anchors,
    update(time) {
      for (let i = 0; i < steam.length; i += 1) {
        const wisp = steam[i];
        const t = (time * wisp.speed + wisp.phase) % 1;
        const fade = Math.sin(t * Math.PI);
        wisp.mesh.position.set(
          Math.sin(time * 0.85 + wisp.phase * 6.2) * 0.014 * t,
          0.072 + t * 0.16,
          Math.cos(time * 0.55 + wisp.phase * 4.1) * 0.008 * t,
        );
        const s = 0.62 + t * 0.95;
        wisp.mesh.scale.set(s, s * (1.15 + t * 0.35), 1);
        wisp.mat.opacity = fade * 0.42;
      }
    },
  };

  function buildShell() {
    const { roomX, roomZ0, roomZ1, roomH, window: win } = LAYOUT;
    const depth = roomZ1 - roomZ0;
    const zc = (roomZ0 + roomZ1) / 2;
    put(root, box(roomX * 2 + 0.4, 0.22, depth + 0.4), floorMat, 0, -0.11, zc, { receive: true });
    put(root, box(roomX * 2 + 0.2, 0.12, depth + 0.2), plasterDark, 0, roomH + 0.06, zc);

    for (const side of [-1, 1]) {
      put(root, box(0.16, 1.08, depth), wainscot, side * roomX, 0.54, zc);
      put(root, box(0.16, roomH - 1.08, depth), plaster, side * roomX, 1.08 + (roomH - 1.08) / 2, zc);
    }
    put(root, box(roomX * 2, 1.08, 0.16), wainscot, 0, 0.54, roomZ1);
    put(root, box(roomX * 2, roomH - 1.08, 0.16), plaster, 0, 1.08 + (roomH - 1.08) / 2, roomZ1);

    const pierW = roomX - win.x1;
    const pierH = roomH;
    const pierX = (roomX + win.x1) / 2;
    put(root, box(pierW, pierH, 0.16), plaster, -pierX, pierH / 2, win.z);
    put(root, box(pierW, pierH, 0.16), plaster, pierX, pierH / 2, win.z);
    const winW = win.x1 - win.x0;
    put(root, box(winW, win.y0, 0.16), wainscot, 0, win.y0 / 2, win.z);
    put(root, box(winW, roomH - win.y1, 0.16), plaster, 0, (win.y1 + roomH) / 2, win.z);

    const mullion = new THREE.MeshStandardMaterial({ color: 0x2a241c, roughness: 0.4, metalness: 0.65 });
    const winH = win.y1 - win.y0;
    const midY = (win.y0 + win.y1) / 2;
    for (const x of [-1.02, 1.02]) {
      put(root, box(0.045, winH, 0.055), mullion, x, midY, win.z + 0.02, { cast: true });
    }

    put(root, box(winW, 0.045, 0.2), deskMat, 0, win.y0 + 0.01, win.z + 0.12, { receive: true });
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, winW, 8), brass);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(0, win.y1 - 0.04, win.z + 0.14);
    root.add(rod);

    for (const side of [-1, 1]) {
      put(root, box(0.34, winH * 0.98, 0.08), drapeMat, side * 2.78, midY - 0.02, win.z + 0.16);
      put(root, box(0.16, winH * 0.72, 0.07), drapeMat, side * 2.52, midY - 0.2, win.z + 0.22);
    }

    const rug = put(root, new THREE.PlaneGeometry(2.6, 1.9), rugMat, 0.04, 0.012, 0.32, { receive: true });
    rug.rotation.x = -Math.PI / 2;
  }

  function buildDesk() {
    put(root, box(2.08, 0.05, 0.96), deskMat, 0, SURFACE - 0.025, -0.02, { cast: true, receive: true });
    for (const x of [-0.78, 0.78]) {
      put(root, box(0.46, 0.7, 0.82), deskMat, x, 0.35, -0.02, { cast: true, receive: true });
    }
    put(root, box(0.7, 0.1, 0.42), deskMat, 0, 0.66, -0.16, { cast: true });
    put(root, box(0.74, 0.008, 0.4), blotter, 0.02, SURFACE + 0.004, 0.02, { receive: true });
  }

  function buildComputer() {
    const computer = new THREE.Group();
    computer.name = 'computer';
    root.add(computer);

    const monitor = new THREE.Group();
    monitor.position.set(SCREEN.x, SCREEN.y, SCREEN.z);
    monitor.rotation.x = SCREEN.tilt;
    computer.add(monitor);

    const bezelT = 0.02;
    const chin = 0.048;
    const sw = SCREEN.w;
    const sh = SCREEN.h;
    put(monitor, new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ color: 0x100e0c }), 0, 0, 0);
    put(monitor, box(sw + bezelT * 2, bezelT, 0.028), bezel, 0, sh / 2 + bezelT / 2, 0.004);
    put(monitor, box(sw + bezelT * 2, chin, 0.028), bezel, 0, -(sh / 2 + chin / 2), 0.004);
    put(monitor, box(bezelT, sh, 0.028), bezel, -(sw / 2 + bezelT / 2), 0, 0.004);
    put(monitor, box(bezelT, sh, 0.028), bezel, sw / 2 + bezelT / 2, 0, 0.004);
    put(monitor, box(sw + 0.06, sh + chin + bezelT, 0.045), bezel, 0, -chin / 2, -0.03);
    const led = put(
      monitor,
      box(0.01, 0.004, 0.004),
      new THREE.MeshBasicMaterial({ color: 0xffb15a }),
      0,
      -(sh / 2 + chin * 0.45),
      0.02,
    );
    led.name = 'led';

    const hit = new THREE.Mesh(
      new THREE.PlaneGeometry(sw + 0.18, sh + 0.22),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    hit.position.set(0, -0.02, 0.03);
    monitor.add(hit);

    const neckH = SCREEN.y - sh / 2 - chin - SURFACE - 0.02;
    put(computer, new THREE.CylinderGeometry(0.022, 0.028, Math.max(0.08, neckH), 8), bezel, SCREEN.x, SURFACE + neckH / 2, SCREEN.z + 0.015, { cast: true });
    put(computer, box(0.24, 0.014, 0.18), bezel, SCREEN.x, SURFACE + 0.007, SCREEN.z + 0.03, { cast: true });

    const keyTex = keyboardTexture();
    const keyMat = new THREE.MeshStandardMaterial({ map: keyTex, roughness: 0.62, metalness: 0.12 });
    const keySide = new THREE.MeshStandardMaterial({ color: 0x1a1714, roughness: 0.55, metalness: 0.15 });
    put(computer, new THREE.BoxGeometry(0.48, 0.02, 0.168), [keySide, keySide, keyMat, keySide, keySide, keySide], 0.02, SURFACE + 0.014, 0.04, { cast: true, receive: true });
    const mouse = put(computer, new THREE.SphereGeometry(0.018, 12, 8), keySide, 0.32, SURFACE + 0.012, 0.08, { cast: true });
    mouse.scale.set(1.05, 0.55, 1.45);

    monitor.updateWorldMatrix(true, true);
    const screenMesh = monitor.children[0];
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    screenMesh.getWorldPosition(position);
    screenMesh.getWorldQuaternion(quaternion);
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion).normalize();

    return {
      width: sw,
      height: sh,
      position,
      quaternion,
      normal,
      pick: computer,
    };
  }

  function buildChair() {
    const chair = new THREE.Group();
    chair.position.set(-2.15, 0, 0.35);
    chair.rotation.y = 0.7;
    root.add(chair);
    put(chair, new THREE.CylinderGeometry(0.22, 0.22, 0.028, 16), metal, 0, 0.02, 0, { cast: true });
    put(chair, new THREE.CylinderGeometry(0.032, 0.038, 0.34, 8), metal, 0, 0.2, 0, { cast: true });
    put(chair, box(0.5, 0.08, 0.48), leather, 0, 0.46, 0, { cast: true, receive: true });
    put(chair, box(0.48, 0.58, 0.07), leather, 0, 0.86, 0.2, { cast: true });
    for (const x of [-0.26, 0.26]) {
      put(chair, box(0.06, 0.16, 0.34), deskMat, x, 0.56, 0.02, { cast: true });
      put(chair, box(0.07, 0.035, 0.28), leather, x, 0.65, 0.02, { cast: true });
    }
  }

  function buildProps() {
    buildLamp();
    buildTypewriter();
    buildBooks();
    buildPapers();
    buildCup();
    buildPhone();
    buildFrames();
    buildPlant(root, 2.15, LAYOUT.window.y0 + 0.07, LAYOUT.window.z + 0.2, 1);
    buildBookcase();
    buildCabinet();
  }

  function buildLamp() {
    const lamp = new THREE.Group();
    lamp.position.set(0.7, SURFACE, -0.1);
    root.add(lamp);

    put(lamp, new THREE.CylinderGeometry(0.074, 0.08, 0.012, 40), lampMetal, 0, 0.006, 0, { cast: true });
    put(lamp, new THREE.CylinderGeometry(0.046, 0.052, 0.014, 32), lampMetal, 0, 0.018, 0, { cast: true });
    put(lamp, new THREE.CylinderGeometry(0.009, 0.011, 0.15, 20), lampMetal, 0, 0.098, 0, { cast: true });
    put(lamp, new THREE.SphereGeometry(0.016, 20, 14), lampMetal, 0, 0.176, 0, { cast: true });

    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.15, 16), lampMetal);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(-0.07, 0.188, 0.012);
    arm.castShadow = true;
    lamp.add(arm);

    const cowl = new THREE.Group();
    cowl.position.set(-0.145, 0.2, 0.02);
    lamp.add(cowl);

    const glass = new THREE.Mesh(
      new THREE.SphereGeometry(0.058, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.5),
      shade,
    );
    glass.scale.set(1.82, 0.72, 1.08);
    cowl.add(glass);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.0042, 10, 48), lampMetal);
    rim.rotation.x = Math.PI / 2;
    rim.scale.set(1.7, 1, 1);
    rim.position.y = 0.004;
    cowl.add(rim);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.034, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.46), lampMetal);
    cap.scale.set(2.15, 0.5, 1.2);
    cap.position.y = 0.046;
    cowl.add(cap);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xfff0d2 }),
    );
    bulb.position.y = 0.02;
    cowl.add(bulb);

    for (let i = 0; i < 5; i += 1) {
      put(cowl, new THREE.SphereGeometry(0.0036, 8, 6), lampMetal, 0.078, -0.012 - i * 0.011, 0.02);
    }
    put(cowl, new THREE.SphereGeometry(0.007, 12, 10), lampMetal, 0.078, -0.07, 0.02);

    const lightLocal = new THREE.Vector3(-0.145, 0.17, 0.02);
    lamp.updateWorldMatrix(true, true);
    anchors.lampPos.copy(lamp.localToWorld(lightLocal));
    anchors.lampTarget.set(0.28, SURFACE - 0.01, 0.06);
  }

  function buildTypewriter() {
    const g = new THREE.Group();
    g.position.set(-0.74, SURFACE, -0.06);
    g.rotation.y = 0.18;
    root.add(g);
    put(g, box(0.32, 0.07, 0.26), paint(0x1c1c1c, 0.45, 0.4), 0, 0.045, 0, { cast: true });
    put(g, box(0.28, 0.045, 0.16), paint(0x2a2a2a, 0.4, 0.35), 0, 0.09, 0.01, { rot: [-0.35, 0, 0], cast: true });
    put(g, new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), metal, 0, 0.12, -0.08, { rot: [0, 0, Math.PI / 2], cast: true });
    put(g, box(0.16, 0.14, 0.004), paper, 0, 0.2, -0.07, { cast: true });
  }

  function buildBooks() {
    const stack = [
      [0.22, 0.035, 0.16, 0x6e2a2a],
      [0.2, 0.03, 0.15, 0x1e3a34],
      [0.21, 0.04, 0.155, 0xc4a574],
      [0.19, 0.028, 0.15, 0x243656],
    ];
    let y = SURFACE;
    stack.forEach(([w, h, d, color], i) => {
      y += h / 2;
      put(root, box(w, h, d), paint(color, 0.74), -0.5 + i * 0.004, y, 0.2, { rot: [0, -0.08 + i * 0.03, 0], cast: true, receive: true });
      y += h / 2;
    });
    put(root, box(0.16, 0.22, 0.03), paint(0x7a3e2e, 0.7), -0.34, SURFACE + 0.12, 0.22, { rot: [0, 0.4, 0.18], cast: true });
    put(root, box(0.15, 0.2, 0.028), paint(0x2c4034, 0.7), -0.3, SURFACE + 0.11, 0.26, { rot: [0, 0.2, -0.12], cast: true });
  }

  function buildPapers() {
    put(root, box(0.2, 0.004, 0.26), paper, 0.52, SURFACE + 0.006, -0.08, { rot: [0, 0.12, 0], cast: true, receive: true });
    put(root, box(0.18, 0.004, 0.24), paper, 0.56, SURFACE + 0.012, -0.02, { rot: [0, -0.08, 0], receive: true });
    const news = put(root, box(0.26, 0.006, 0.34), new THREE.MeshStandardMaterial({ map: newsTexture(), roughness: 0.9 }), 0.48, SURFACE + 0.02, 0.22, { rot: [0, -0.2, 0], receive: true });
    news.castShadow = true;
  }

  function buildCup() {
    const cup = new THREE.Group();
    cup.position.set(0.46, SURFACE + 0.03, 0.1);
    cup.scale.setScalar(1.18);
    root.add(cup);
    const porcelain = new THREE.MeshStandardMaterial({ color: 0xf3eee6, roughness: 0.36, metalness: 0.05 });
    const coffee = new THREE.MeshStandardMaterial({ color: 0x2a160e, roughness: 0.28, metalness: 0.12 });
    put(cup, new THREE.CylinderGeometry(0.05, 0.046, 0.008, 32), porcelain, 0, 0.004, 0, { cast: true, receive: true });
    put(cup, new THREE.CylinderGeometry(0.03, 0.024, 0.046, 28), porcelain, 0, 0.032, 0, { cast: true });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.029, 0.0024, 8, 28), lampMetal);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.054;
    cup.add(rim);
    put(cup, new THREE.CylinderGeometry(0.026, 0.026, 0.004, 24), coffee, 0, 0.048, 0);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0036, 8, 18), porcelain);
    handle.position.set(0.03, 0.032, 0);
    handle.rotation.y = Math.PI / 2;
    handle.castShadow = true;
    cup.add(handle);

    const steamMap = steamTexture();
    for (let i = 0; i < 6; i += 1) {
      const mat = new THREE.MeshBasicMaterial({
        map: steamMap,
        transparent: true,
        depthWrite: false,
        fog: false,
        toneMapped: false,
        opacity: 0,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.055), mat);
      mesh.position.y = 0.08;
      mesh.renderOrder = 2;
      cup.add(mesh);
      steam.push({
        mesh,
        mat,
        phase: i / 6,
        speed: 0.16 + (i % 3) * 0.035,
      });
    }
  }

  function buildPhone() {
    const phone = new THREE.Group();
    phone.position.set(0.9, SURFACE, 0.16);
    phone.rotation.y = -0.4;
    root.add(phone);
    put(phone, box(0.16, 0.035, 0.11), paint(0x1a1a1a, 0.45, 0.3), 0, 0.02, 0, { cast: true });
    put(phone, box(0.13, 0.028, 0.045), paint(0x222222, 0.4, 0.35), 0, 0.05, 0.01, { cast: true });
  }

  function buildFrames() {
    const frame = new THREE.Group();
    frame.position.set(-0.58, SURFACE, -0.36);
    frame.rotation.x = -0.22;
    frame.rotation.y = 0.25;
    root.add(frame);
    put(frame, box(0.24, 0.3, 0.02), deskMat, 0, 0.16, 0, { cast: true });
    put(frame, new THREE.PlaneGeometry(0.18, 0.24), new THREE.MeshStandardMaterial({ map: photoTexture(), roughness: 0.8 }), 0, 0.16, 0.012);

    const wall = new THREE.Group();
    wall.position.set(3.34, 1.55, -0.4);
    wall.rotation.y = -Math.PI / 2;
    root.add(wall);
    put(wall, box(0.7, 0.48, 0.03), deskMat, 0, 0, 0);
    put(wall, new THREE.PlaneGeometry(0.6, 0.38), new THREE.MeshStandardMaterial({ map: photoTexture(), roughness: 0.85 }), 0, 0, 0.02);
  }

  function buildPlant(parent, x, y, z, scale) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.scale.setScalar(scale);
    parent.add(g);
    put(g, new THREE.CylinderGeometry(0.07, 0.06, 0.08, 10), potMat, 0, 0.04, 0, { cast: true });
    const blades = [
      [-0.02, 0.02, 0.05],
      [0.02, -0.01, -0.08],
      [0.0, 0.015, 0.12],
      [-0.015, -0.02, -0.04],
      [0.018, 0.0, 0.02],
    ];
    blades.forEach((rot, i) => {
      const h = 0.22 + (i % 3) * 0.05;
      const blade = put(g, box(0.012, h, 0.045), i % 2 ? leafMat2 : leafMat, rot[0], 0.08 + h / 2, rot[1], { cast: true });
      blade.rotation.z = rot[2];
      blade.rotation.x = rot[1];
    });
  }

  function buildBookcase() {
    const g = new THREE.Group();
    g.position.set(-3.28, 0, -0.35);
    root.add(g);
    put(g, box(0.34, 1.45, 1.35), deskMat, 0, 0.74, 0, { cast: true, receive: true });
    for (const y of [0.28, 0.62, 0.96, 1.28]) {
      put(g, box(0.3, 0.02, 1.28), paint(0x4a301c, 0.6), 0, y, 0);
    }
    const spines = [0x6e2a2a, 0x1e3a34, 0x243656, 0xc4a574, 0x3a2418, 0x7a3e2e, 0x2c4034, 0x8d6a3a, 0x4a2c3a, 0x1c1c1c];
    spines.forEach((color, i) => {
      const shelf = Math.floor(i / 5);
      const idx = i % 5;
      const h = 0.22 + (i % 3) * 0.03;
      put(g, box(0.22, h, 0.045), paint(color, 0.72), 0.02, [0.28, 0.62, 0.96][shelf] + h / 2 + 0.01, -0.5 + idx * 0.22, { cast: true });
    });
    buildPlant(g, 0.02, 1.3, 0.2, 0.7);
  }

  function buildCabinet() {
    put(root, box(0.42, 0.7, 0.5), paint(0x3a3e42, 0.45, 0.55), 2.55, 0.35, 0.55, { cast: true, receive: true });
    put(root, box(0.36, 0.01, 0.46), paint(0x2a2e32, 0.4, 0.4), 2.55, 0.48, 0.55);
    put(root, box(0.36, 0.01, 0.46), paint(0x2a2e32, 0.4, 0.4), 2.55, 0.22, 0.55);
    put(root, new THREE.CylinderGeometry(0.11, 0.1, 0.28, 10), paint(0x2a2724, 0.6, 0.3), 1.25, 0.14, 0.62, { cast: true });
  }
}
