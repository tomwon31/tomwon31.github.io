import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { DESK_SLOTS, FLOOR_Y, createDesk } from './world.js';

const SHAPES = ['cube', 'rounded_square', 'sphere', 'pill', 'star', 'cone', 'drop', 'diamond', 'cloud', 'hexagon', 'triangle', 'bubble'];
const EXTRAS = ['none', 'glasses', 'antenna', 'bow'];

const DEFAULTS = {
  T: { shape: 'rounded_square', color: '#8F59F9', tilt: 12, accessory: 'none' },
  Lin: { shape: 'sphere', color: '#F2F2F2', tilt: 0, accessory: 'none' },
  '额der': { shape: 'rounded_square', color: '#B5B5B5', tilt: -8, accessory: 'none' },
  'momo(model connect)': { shape: 'star', color: '#3DDC5A', tilt: 0, accessory: 'none' },
  'Gemini Bot': { shape: 'cloud', color: '#1E6FFF', tilt: 0, accessory: 'none' },
  '水滴道长': { shape: 'drop', color: '#F2F2F2', tilt: -18, accessory: 'none' },
  '章鱼哥': { shape: 'rounded_square', color: '#F2F2F2', tilt: 18, accessory: 'none' },
};

const FALLBACK_COLORS = ['#8F59F9', '#F2F2F2', '#B5B5B5', '#3DDC5A', '#1E6FFF', '#FFB703', '#E23D3D', '#2EC5E0'];

const sphere = new THREE.SphereGeometry(1, 16, 12);
const eyeGeo = new THREE.SphereGeometry(1, 8, 6);
const eyeMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
const outlineMat = new THREE.MeshBasicMaterial({ color: 0x8d8d8d, side: THREE.BackSide });
const ink = new THREE.MeshLambertMaterial({ color: 0x2c3138 });
const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const bookMat = new THREE.MeshLambertMaterial({ color: 0xc4554a });
const pageMat = new THREE.MeshLambertMaterial({ color: 0xfffdf8 });
const snackMat = new THREE.MeshLambertMaterial({ color: 0xe07a3d });
const padMat = new THREE.MeshLambertMaterial({ color: 0x242833 });

const geos = {
  cube: new RoundedBoxGeometry(0.74, 0.74, 0.74, 2, 0.1),
  rounded: new RoundedBoxGeometry(0.78, 0.78, 0.78, 3, 0.2),
  sphere,
  pill: new THREE.CapsuleGeometry(0.28, 0.34, 4, 8),
  cone: new THREE.ConeGeometry(0.4, 0.78, 14),
  diamond: new THREE.OctahedronGeometry(0.48, 0),
  hex: new THREE.CylinderGeometry(0.42, 0.42, 0.36, 6),
  tri: new THREE.CylinderGeometry(0.46, 0.46, 0.34, 3),
  torus: new THREE.TorusGeometry(0.11, 0.02, 6, 10),
  spark: new THREE.SphereGeometry(1, 6, 4),
};

function dropGeometry() {
  const pts = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = THREE.MathUtils.lerp(0.55, -0.4, t);
    const bulge = Math.sin(Math.pow(t, 0.5) * Math.PI);
    pts.push(new THREE.Vector2(0.015 + bulge * 0.38, y));
  }
  return new THREE.LatheGeometry(pts, 16);
}
geos.drop = dropGeometry();

function luminance(hex) {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

function addEyes(parent, z, y, sep) {
  const left = new THREE.Mesh(eyeGeo, eyeMat);
  const right = new THREE.Mesh(eyeGeo, eyeMat);
  left.scale.set(0.07, 0.15, 0.055);
  right.scale.copy(left.scale);
  left.position.set(-sep, y, z + 0.05);
  right.position.set(sep, y, z + 0.05);
  left.rotation.z = 0.28;
  right.rotation.z = 0.28;
  parent.add(left, right);
}

function addOutline(mesh) {
  const shell = new THREE.Mesh(mesh.geometry, outlineMat);
  shell.position.copy(mesh.position);
  shell.rotation.copy(mesh.rotation);
  shell.scale.copy(mesh.scale).multiplyScalar(1.12);
  mesh.parent.add(shell);
}

function makeShape(shape, material, light) {
  const group = new THREE.Group();
  let height = 0.78;
  let front = 0.36;
  let eyeY = 0.05;
  let sep = 0.14;

  const addMesh = (geo, x, y, z, s, rot) => {
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    if (s) mesh.scale.set(s, s, s);
    if (rot) mesh.rotation.copy(rot);
    group.add(mesh);
    if (light) addOutline(mesh);
    return mesh;
  };

  if (shape === 'cube') {
    addMesh(geos.cube, 0, 0, 0);
    front = 0.4;
  } else if (shape === 'rounded_square' || shape === 'rounded') {
    addMesh(geos.rounded, 0, 0, 0);
    front = 0.42;
    height = 0.82;
  } else if (shape === 'sphere' || shape === 'bubble') {
    addMesh(sphere, 0, 0, 0, 0.4);
    if (shape === 'bubble') addMesh(sphere, -0.18, -0.28, 0.05, 0.12);
    front = 0.36;
    eyeY = 0.04;
    height = 0.8;
  } else if (shape === 'pill') {
    addMesh(geos.pill, 0, 0, 0);
    front = 0.3;
    height = 0.9;
  } else if (shape === 'cone') {
    addMesh(geos.cone, 0, 0, 0);
    front = 0.28;
    eyeY = 0.05;
    height = 0.82;
  } else if (shape === 'diamond') {
    addMesh(geos.diamond, 0, 0, 0);
    front = 0.34;
    height = 0.9;
  } else if (shape === 'drop') {
    addMesh(geos.drop, 0, 0, 0);
    front = 0.36;
    eyeY = -0.02;
    height = 0.95;
    sep = 0.12;
  } else if (shape === 'hexagon') {
    const mesh = addMesh(geos.hex, 0, 0, 0);
    mesh.rotation.x = Math.PI / 2;
    front = 0.22;
    height = 0.84;
  } else if (shape === 'triangle') {
    const mesh = addMesh(geos.tri, 0, 0, 0);
    mesh.rotation.x = Math.PI / 2;
    front = 0.2;
    height = 0.9;
  } else if (shape === 'star') {
    addMesh(sphere, 0, 0, 0, 0.24);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      addMesh(sphere, Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0, 0.2);
    }
    front = 0.26;
    height = 1.0;
    sep = 0.1;
  } else if (shape === 'cloud') {
    addMesh(sphere, 0, 0, 0, 0.26);
    const lobes = [
      [0.28, 0.08, 0.2],
      [-0.26, 0.1, 0.18],
      [0.08, 0.3, 0.18],
      [-0.06, -0.28, 0.17],
      [0.22, -0.16, 0.16],
      [-0.22, -0.12, 0.15],
    ];
    for (let i = 0; i < lobes.length; i++) {
      addMesh(sphere, lobes[i][0], lobes[i][1], 0.02, lobes[i][2]);
    }
    front = 0.28;
    height = 1.05;
    sep = 0.1;
  } else {
    addMesh(geos.rounded, 0, 0, 0);
    front = 0.4;
  }

  addEyes(group, front, eyeY, sep);
  return { group, hover: height * 0.5 + 0.52, ground: height * 0.46, half: height * 0.5 };
}

function addAccessory(parent, accessory, front) {
  if (accessory === 'glasses') {
    const left = new THREE.Mesh(geos.torus, ink);
    const right = new THREE.Mesh(geos.torus, ink);
    left.position.set(-0.12, 0.04, front + 0.02);
    right.position.set(0.12, 0.04, front + 0.02);
    parent.add(left, right);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.015), ink);
    bridge.position.set(0, 0.04, front + 0.02);
    parent.add(bridge);
  } else if (accessory === 'antenna') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6), ink);
    pole.position.set(0.12, 0.48, 0);
    const tip = new THREE.Mesh(sphere, ink);
    tip.scale.setScalar(0.06);
    tip.position.set(0.12, 0.6, 0);
    parent.add(pole, tip);
  } else if (accessory === 'bow') {
    const a = new THREE.Mesh(sphere, new THREE.MeshLambertMaterial({ color: 0xff5d8f }));
    const b = a.clone();
    a.scale.set(0.1, 0.07, 0.06);
    b.scale.copy(a.scale);
    a.position.set(-0.1, 0.4, 0.05);
    b.position.set(0.1, 0.4, 0.05);
    const knot = new THREE.Mesh(sphere, new THREE.MeshLambertMaterial({ color: 0xf2c14e }));
    knot.scale.setScalar(0.05);
    knot.position.set(0, 0.4, 0.08);
    parent.add(a, b, knot);
  }
}

const CHECK = '<svg viewBox="0 0 12 12" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round"><path d="M2 6.2l2.6 2.6L10 3.2"/></svg>';
const PAUSE = '<svg viewBox="0 0 12 12" fill="white"><rect x="2.2" y="2" width="2.4" height="8" rx="0.6"/><rect x="7.4" y="2" width="2.4" height="8" rx="0.6"/></svg>';

function badgeMarkup(status) {
  if (status === 'busy') return CHECK;
  if (status === 'waiting') return PAUSE;
  if (status === 'error') return '!';
  return '';
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

class Bot {
  constructor(name, index, slot, scene, floor) {
    this.name = name;
    this.index = index;
    this.hidden = false;
    this.status = null;
    this.note = '';
    this.activity = null;
    this.lookKey = '';
    this.slotRef = null;
    this.hoverY = 0.9;
    this.groundY = 0.4;
    this.phase = Math.random() * Math.PI * 2;
    this.mode = 'desk';
    this.glide = null;
    this.jump = 0;
    this.pending = 0;
    this.until = 0;
    this.pause = 0;
    this.chatting = false;
    this.screen = null;
    this.sitX = slot.x;
    this.sitZ = slot.z;
    this.floorY = FLOOR_Y[2];

    const desk = createDesk(floor, slot);
    this.desk = desk.desk;
    this.screen = desk.screen;
    this.sitX = desk.sitX;
    this.sitZ = desk.sitZ;

    this.root = new THREE.Group();
    this.root.position.set(this.sitX, this.floorY, this.sitZ);
    scene.add(this.root);
    this.bob = new THREE.Group();
    this.tilt = new THREE.Group();
    this.root.add(this.bob);
    this.bob.add(this.tilt);
    this.shapeGroup = null;

    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.32, 14), new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.16, depthWrite: false,
    }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.04;
    this.root.add(this.shadow);

    this.book = new THREE.Group();
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.16), bookMat);
    const pages = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.13), pageMat);
    pages.position.y = 0.03;
    this.book.add(cover, pages);
    this.book.position.set(0, 0.35, 0.28);
    this.book.visible = false;
    this.bob.add(this.book);
    this.snack = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.08), snackMat);
    this.snack.position.set(0.22, 0.15, 0.2);
    this.snack.visible = false;
    this.bob.add(this.snack);
    this.pad = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.1), padMat);
    this.pad.position.set(0, 0.2, 0.3);
    this.pad.visible = false;
    this.bob.add(this.pad);

    this.nameEl = document.createElement('div');
    this.nameEl.className = 'label';
    this.nameEl.textContent = name;
    this.nameLabel = new CSS2DObject(this.nameEl);
    this.nameLabel.position.set(0, 0.2, 0);
    this.root.add(this.nameLabel);

    this.bubbleEl = document.createElement('div');
    this.bubbleEl.className = 'bubble';
    this.bubble = new CSS2DObject(this.bubbleEl);
    this.bubble.position.set(0, 1.35, 0);
    this.bubble.center.set(0.5, 1);
    this.bubble.visible = false;
    this.root.add(this.bubble);
    this.bubbleText = '';

    this.badgeEl = document.createElement('div');
    this.badgeEl.className = 'badge';
    this.badge = new CSS2DObject(this.badgeEl);
    this.badge.position.set(0.38, 0.85, 0);
    this.badge.visible = false;
    this.root.add(this.badge);

    this.face = 0;
    this.goalFace = 0;
  }

  applyLook(look) {
    const key = look.shape + look.color + look.tilt + look.accessory;
    if (key === this.lookKey && this.shapeGroup) return;
    this.lookKey = key;
    this.look = look;
    if (this.shapeGroup) {
      this.tilt.remove(this.shapeGroup);
      this.shapeGroup.traverse((obj) => {
        if (obj.material && obj.material !== eyeMat && obj.material !== outlineMat && obj.material !== ink) {
          obj.material.dispose();
        }
      });
    }
    const material = new THREE.MeshLambertMaterial({ color: look.color });
    const built = makeShape(look.shape, material, luminance(look.color) > 0.62);
    this.shapeGroup = built.group;
    this.hoverY = built.hover;
    this.groundY = built.ground;
    this.tilt.add(built.group);
    this.tilt.rotation.z = ((look.tilt || 0) * Math.PI) / 180;
    addAccessory(built.group, look.accessory, 0.4);
    const top = built.hover + built.half;
    this.nameLabel.position.y = top + 0.08;
    this.bubble.position.y = top + 0.46;
    this.badge.position.set(built.half * 0.72, built.hover + built.half * 0.35, 0);
  }

  setBubble(text, emoji) {
    const next = text || '';
    if (next === this.bubbleText) return;
    this.bubbleText = next;
    this.bubble.visible = next.length > 0 && !this.hidden && this.labelsOn !== false;
    this.bubbleEl.textContent = next;
    this.bubbleEl.className = emoji ? 'bubble emoji' : 'bubble';
  }

  setBadge(status) {
    const show = status === 'busy' || status === 'waiting' || status === 'error';
    this.badge.visible = show && !this.hidden && this.labelsOn !== false;
    this.badgeEl.className = 'badge ' + (status === 'busy' ? 'busy' : status === 'waiting' ? 'wait' : 'err');
    this.badgeEl.innerHTML = badgeMarkup(status);
  }

  setLabels(on) {
    this.labelsOn = on;
    this.nameLabel.visible = on && !this.hidden;
    this.bubble.visible = on && !this.hidden && this.bubbleText.length > 0;
    this.badge.visible = on && !this.hidden && (this.status === 'busy' || this.status === 'waiting' || this.status === 'error');
  }

  show() {
    if (!this.hidden) return;
    this.hidden = false;
    this.root.visible = true;
    this.desk.visible = true;
    this.status = null;
    this.setLabels(this.labelsOn !== false);
  }

  hide() {
    this.hidden = true;
    this.root.visible = false;
    this.desk.visible = false;
    this.nameLabel.visible = false;
    this.bubble.visible = false;
    this.badge.visible = false;
    this.release();
    this.status = null;
  }

  release() {
    if (this.slotRef) {
      this.slotRef.taken = null;
      this.slotRef = null;
    }
  }

  screenGlow(night) {
    const mat = this.screen.material;
    if (this.status === 'busy') mat.emissiveIntensity = (night ? 1.25 : 0.55) + Math.sin(performance.now() / 400 + this.phase) * 0.15;
    else if (this.status === 'waiting') mat.emissiveIntensity = 0.32;
    else if (this.status === 'error') mat.emissiveIntensity = 0.2;
    else mat.emissiveIntensity = night ? 0.22 : 0.1;
  }

  setStatus(status, note, look, time, burst) {
    const next = status === 'busy' || status === 'waiting' || status === 'error' ? status : 'idle';
    const changed = next !== this.status;
    this.applyLook(look);
    this.note = note || '';
    if (!changed) {
      if (next !== 'idle') this.setBubble(this.note || (next === 'busy' ? '工作中' : next === 'waiting' ? '等待中' : '出错了'), false);
      this.setBadge(next);
      return false;
    }
    const wasActive = this.status === 'busy' || this.status === 'waiting' || this.status === 'error';
    this.status = next;
    this.setBadge(next);
    this.release();
    if (next !== 'idle') {
      this.activity = 'desk';
      this.pending = 0;
      this.setBubble(this.note || (next === 'busy' ? '工作中' : next === 'waiting' ? '等待中' : '出错了'), false);
      this.glideTo(this.sitX, this.sitZ, this.hoverY);
    } else {
      this.setBubble('', false);
      if (wasActive) {
        this.jump = 0.45;
        burst(this.root.position.x, this.root.position.y + this.hoverY, this.root.position.z);
      }
      this.pending = 0.25 + this.index * 0.28;
      this.mode = 'wait';
    }
    return changed;
  }

  glideTo(x, z, y) {
    const fromX = this.root.position.x;
    const fromZ = this.root.position.z;
    const dx = x - fromX;
    const dz = z - fromZ;
    const len = Math.hypot(dx, dz) || 1;
    this.glide = {
      x0: fromX,
      z0: fromZ,
      x1: x,
      z1: z,
      cx: (fromX + x) / 2 + (-dz / len) * Math.min(0.8, len * 0.18),
      cz: (fromZ + z) / 2 + (dx / len) * Math.min(0.8, len * 0.18),
      y0: this.bob.position.y,
      y: y,
      t: 0,
      dur: Math.min(3.4, Math.max(0.7, len / 3.4)),
    };
    this.mode = 'glide';
    if (len < 0.08) this.arrive();
  }

  arrive() {
    if (!this.glide) return;
    this.root.position.x = this.glide.x1;
    this.root.position.z = this.glide.z1;
    this.glide = null;
    this.mode = this.status === 'idle' ? 'act' : 'desk';
    if (this.activity === 'wander') this.pause = 6 + Math.random() * 7;
  }

  choose(time, spots) {
    this.release();
    const options = ['wander'];
    if (spots.snack.some((s) => !s.taken)) options.push('snack', 'snack');
    if (spots.read.some((s) => !s.taken)) options.push('read', 'read');
    if (spots.game.some((s) => !s.taken)) options.push('game', 'game');
    let type = options[(Math.random() * options.length) | 0];
    this.until = time + 150 + Math.random() * 90;
    this.chatting = false;
    if (type !== 'wander') {
      const slot = spots[type].find((s) => !s.taken);
      if (!slot) type = 'wander';
      else {
        slot.taken = this;
        this.slotRef = slot;
        this.activity = type;
        const y = type === 'snack' ? this.groundY : this.groundY + 0.18;
        this.glideTo(slot.x, slot.z, y);
        return;
      }
    }
    this.activity = 'wander';
    const list = spots.wander;
    let pick = list[(Math.random() * list.length) | 0];
    this.glideTo(pick.x, pick.z, this.groundY);
  }

  update(dt, time, faceYaw, bots, spots, night, interiorOn) {
    this.root.visible = !this.hidden && interiorOn;
    if (this.hidden) return;
    if (this.pending > 0) {
      this.pending -= dt;
      if (this.pending <= 0) this.choose(time, spots);
    } else if (this.mode === 'act' && time >= this.until) {
      this.choose(time, spots);
    }

    if (this.mode === 'glide' && this.glide) {
      this.glide.t += dt / this.glide.dur;
      const t = Math.min(1, this.glide.t);
      const k = smoothstep(t);
      const u = 1 - k;
      this.root.position.x = u * u * this.glide.x0 + 2 * u * k * this.glide.cx + k * k * this.glide.x1;
      this.root.position.z = u * u * this.glide.z0 + 2 * u * k * this.glide.cz + k * k * this.glide.z1;
      const dx = this.glide.x1 - this.root.position.x;
      const dz = this.glide.z1 - this.root.position.z;
      if (dx * dx + dz * dz > 0.0004) this.goalFace = Math.atan2(dx, dz);
      if (t >= 1) this.arrive();
    } else if (this.status !== 'idle') {
      this.goalFace = faceYaw;
    } else if (this.activity === 'wander' && this.mode === 'act') {
      this.pause -= dt;
      let partner = null;
      let best = 4.4;
      for (let i = 0; i < bots.length; i++) {
        const other = bots[i];
        if (other === this || other.hidden || other.activity !== 'wander' || other.mode !== 'act') continue;
        const dx = other.root.position.x - this.root.position.x;
        const dz = other.root.position.z - this.root.position.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < best) {
          best = d2;
          partner = other;
          this.goalFace = Math.atan2(dx, dz);
        }
      }
      if (partner && !this.chatting) {
        this.chatting = true;
        this.setBubble(['…', '😄', '👋', '✨'][(Math.random() * 4) | 0], true);
      } else if (!partner && this.chatting) {
        this.chatting = false;
        this.setBubble('', true);
      }
      if (this.pause <= 0 && time < this.until) {
        this.chatting = false;
        this.setBubble('', true);
        const list = spots.wander;
        const pick = list[(Math.random() * list.length) | 0];
        this.glideTo(pick.x, pick.z, this.groundY);
      }
    } else if (this.status === 'idle') {
      this.goalFace = faceYaw;
    }

    let delta = this.goalFace - this.face;
    if (delta > Math.PI) delta -= Math.PI * 2;
    else if (delta < -Math.PI) delta += Math.PI * 2;
    this.face += delta * Math.min(1, dt * 6);
    this.root.rotation.y = this.face;

    let hop = 0;
    if (this.jump > 0) {
      this.jump -= dt;
      const u = 1 - Math.max(0, this.jump) / 0.45;
      hop = Math.sin(Math.min(1, u) * Math.PI) * 0.42;
    }
    const atDesk = this.status !== 'idle' && this.mode === 'desk';
    let base = this.groundY;
    if (this.glide) {
      const k = smoothstep(Math.min(1, this.glide.t));
      base = this.glide.y0 + (this.glide.y - this.glide.y0) * k;
    } else if (atDesk) base = this.hoverY;
    else if (this.activity === 'read' || this.activity === 'game') base = this.groundY + 0.16;
    const bob = atDesk || this.mode === 'act' ? Math.sin(time * 2.1 + this.phase) * 0.045 : 0;
    this.bob.position.y = base + bob + hop;

    const emoji = { snack: '🍪', read: '📖', game: '🎮' };
    if (this.status === 'idle' && this.mode === 'act' && !this.chatting && emoji[this.activity]) {
      this.setBubble(emoji[this.activity], true);
    }
    this.book.visible = this.activity === 'read' && this.mode === 'act';
    this.snack.visible = this.activity === 'snack' && this.mode === 'act';
    this.pad.visible = this.activity === 'game' && this.mode === 'act';
    this.screenGlow(night);
  }
}

const sparks = [];

function burst(x, y, z) {
  let spawned = 0;
  for (let i = 0; i < sparks.length; i++) {
    const s = sparks[i];
    if (s.life > 0) continue;
    const a = (spawned / 7) * Math.PI * 2;
    s.life = 0.6;
    s.x = x;
    s.y = y;
    s.z = z;
    s.vx = Math.cos(a) * 1.3;
    s.vy = 1.2 + (spawned % 3) * 0.25;
    s.vz = Math.sin(a) * 1.3;
    s.mesh.visible = true;
    if (++spawned >= 7) break;
  }
}

function hashName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 33 + name.charCodeAt(i)) >>> 0;
  return h;
}

export function resolveLook(item) {
  const base = DEFAULTS[item.name] || {
    shape: SHAPES[hashName(item.name) % SHAPES.length],
    color: FALLBACK_COLORS[hashName(item.name) % FALLBACK_COLORS.length],
    tilt: 0,
    accessory: 'none',
  };
  const shape = SHAPES.indexOf(item.shape) >= 0 ? item.shape : base.shape;
  const accessory = EXTRAS.indexOf(item.accessory) >= 0 ? item.accessory : base.accessory;
  const color = typeof item.color === 'string' && /^#?[0-9a-fA-F]{6}$/.test(item.color) ? item.color : base.color;
  const tilt = Number.isFinite(item.tilt) ? item.tilt : base.tilt || 0;
  return { shape, color: color.startsWith('#') ? color : '#' + color, tilt, accessory };
}

export function taskText(bot) {
  if (!bot || bot.hidden) return '';
  if (bot.status === 'busy') return bot.note || '工作中';
  if (bot.status === 'waiting') return bot.note || '等待中';
  if (bot.status === 'error') return bot.note || '出错了';
  const map = { snack: '在吃零食', read: '在看书', game: '在玩游戏', wander: '在闲逛', desk: '离开工位' };
  return map[bot.activity] || '空闲';
}

export function iconSvg(shape, color) {
  const c = color || '#999';
  if (shape === 'sphere' || shape === 'bubble') {
    return `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="${c}" stroke="#c8c8c8" stroke-width="1"/></svg>`;
  }
  if (shape === 'star') {
    return `<svg viewBox="0 0 32 32"><path fill="${c}" d="M16 2l3.2 8.2L28 12l-6.4 5 2 8.4L16 21.2 8.4 25.4l2-8.4L4 12l8.8-1.8z"/></svg>`;
  }
  if (shape === 'drop') {
    return `<svg viewBox="0 0 32 32"><path fill="${c}" stroke="#c8c8c8" d="M16 3c6 8 9 12 9 17a9 9 0 1 1-18 0c0-5 3-9 9-17z"/></svg>`;
  }
  if (shape === 'cloud') {
    return `<svg viewBox="0 0 32 32"><circle cx="12" cy="18" r="6" fill="${c}"/><circle cx="20" cy="16" r="7" fill="${c}"/><circle cx="16" cy="12" r="5" fill="${c}"/></svg>`;
  }
  if (shape === 'diamond') {
    return `<svg viewBox="0 0 32 32"><path fill="${c}" d="M16 3l11 13-11 13L5 16z"/></svg>`;
  }
  if (shape === 'cone' || shape === 'triangle') {
    return `<svg viewBox="0 0 32 32"><path fill="${c}" d="M16 4l12 22H4z"/></svg>`;
  }
  return `<svg viewBox="0 0 32 32"><rect x="6" y="6" width="20" height="20" rx="6" fill="${c}" transform="rotate(${shape === 'rounded_square' ? 8 : 0} 16 16)"/></svg>`;
}

export function createSim(scene, world) {
  for (let i = 0; i < 16; i++) {
    const mesh = new THREE.Mesh(geos.spark, sparkMat);
    mesh.visible = false;
    scene.add(mesh);
    sparks.push({ mesh, life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });
  }

  const bots = [];
  const byName = new Map();
  let slotIndex = 0;

  function ensure(name) {
    let bot = byName.get(name);
    if (bot) return bot;
    if (slotIndex >= DESK_SLOTS.length) return null;
    bot = new Bot(name, slotIndex, DESK_SLOTS[slotIndex], scene, world.floor3);
    slotIndex += 1;
    byName.set(name, bot);
    bots.push(bot);
    return bot;
  }

  return {
    bots,
    sync(list, time) {
      const seen = new Set();
      const counts = { busy: 0, waiting: 0, error: 0, idle: 0 };
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (!item || typeof item.name !== 'string' || seen.has(item.name)) continue;
        seen.add(item.name);
        const status = item.status === 'busy' || item.status === 'waiting' || item.status === 'error' ? item.status : 'idle';
        counts[status] += 1;
        const bot = ensure(item.name);
        if (!bot) continue;
        bot.show();
        const note = typeof item.note === 'string' ? item.note.replace(/\s+/g, ' ').trim().slice(0, 80) : '';
        bot.setStatus(status, note, resolveLook(item), time, burst);
      }
      for (let i = 0; i < bots.length; i++) {
        if (!seen.has(bots[i].name)) bots[i].hide();
      }
      return counts;
    },
    update(dt, time, faceYaw, showLabels, night, interiorOn) {
      for (let i = 0; i < bots.length; i++) {
        const bot = bots[i];
        bot.setLabels(showLabels);
        bot.update(dt, time, faceYaw, bots, world.spots, night, interiorOn);
      }
      for (let i = 0; i < sparks.length; i++) {
        const s = sparks[i];
        if (s.life <= 0) continue;
        s.life -= dt;
        s.vy -= dt * 3.2;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.z += s.vz * dt;
        s.mesh.position.set(s.x, s.y, s.z);
        const k = Math.max(0, s.life / 0.6);
        s.mesh.scale.setScalar(0.04 + k * 0.08);
        s.mesh.visible = s.life > 0;
      }
      if (world.tvMat) {
        const playing = bots.some((b) => !b.hidden && b.activity === 'game' && b.mode === 'act');
        world.tvMat.emissiveIntensity = playing ? 0.55 + Math.sin(time * 4) * 0.2 : (night ? 0.35 : 0.18);
      }
    },
  };
}
