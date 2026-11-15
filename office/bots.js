import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import {
  SLOTS,
  LOUNGE,
  geos,
  mat,
  mats,
  tint,
  place,
  makeScreenMaterial,
} from './world.js';

const NAMED = {
  T: { color: 0x4c8dff, accessory: 'antenna' },
  Lin: { color: 0xff6fa3, accessory: 'bow' },
  '额der': { color: 0xffb703, accessory: 'glasses' },
  'momo(model connect)': { color: 0x3dcf8e, accessory: 'phones' },
  'Gemini Bot': { color: 0x7c6af7, accessory: 'visor' },
  '水滴道长': { color: 0x2ec5e0, accessory: 'hat' },
  '章鱼哥': { color: 0xef5d4c, accessory: 'tentacles' },
};

const EXTRA_COLORS = [0xf4a261, 0x90be6d, 0xb5838d, 0x48bfe3, 0xe9c46a, 0x00bbf9];
const CHAT = ['…', '😄', '👋', '✨', '☕', '嘿嘿'];
const ACTIVITY_MIN = 150;
const ACTIVITY_SPAN = 90;

const eyeWhite = mat(0xfffdf8);
const pupil = mat(0x1b1f27);
const ink = mat(0x2b3038);
const gold = mat(0xf2c14e);

function yawToward(dx, dz) {
  return Math.atan2(-dx, -dz);
}

function insideLounge(x, z) {
  return x > LOUNGE.minX && x < LOUNGE.maxX && z > LOUNGE.minZ && z < LOUNGE.maxZ;
}

function segmentHitsLounge(x0, z0, x1, z1) {
  for (let i = 1; i < 7; i++) {
    const t = i / 7;
    if (insideLounge(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t)) return true;
  }
  return false;
}

// Route through the open aisle (x ≈ 2.5) and step out of desk alcoves so
// bots don't cut through the sofa, TV, or the chair row.
function buildPath(from, goal) {
  const pts = [];
  let cx = from.x;
  let cz = from.z;
  const add = (x, z) => {
    if (Math.hypot(x - cx, z - cz) > 0.28) {
      pts.push({ x, z });
      cx = x;
      cz = z;
    }
  };

  if (from.z < -5.1) add(from.x, -4.5);
  else if (from.x > 8.5) add(7.6, from.z);
  else if (insideLounge(from.x, from.z)) {
    if (from.x > -5.25) {
      add(-2.2, from.z);
      add(-2.2, 0.8);
    } else if (from.z < 3.3) {
      add(from.x, 0.8);
      add(-2.2, 0.8);
    } else {
      add(from.x, 5.7);
      add(-2.2, 5.7);
    }
    add(2.5, cz);
  }

  if (goal.entry) {
    const bypassZ = goal.side === 'north' ? 5.55 : 0.95;
    add(2.5, cz);
    add(2.5, bypassZ);
    add(goal.entry.x, bypassZ);
    add(goal.entry.x, goal.entry.z);
  } else if (goal.z < -5.1) {
    add(goal.x, -4.5);
  } else if (goal.x > 8.5) {
    add(7.6, goal.z);
  } else if (segmentHitsLounge(cx, cz, goal.x, goal.z)) {
    add(2.5, cz);
    add(2.5, goal.z);
  }

  add(goal.x, goal.z);
  return pts;
}

function createDesk(scene, slot, colorMat) {
  const desk = new THREE.Group();
  desk.position.set(slot.x, 0, slot.z);
  desk.rotation.y = slot.rot;
  scene.add(desk);

  const topY = 0.74;
  place(geos.box, mats.deskTop, desk, 0, topY, -0.56, 1.36, 0.07, 0.66);
  for (const [lx, lz] of [[-0.58, -0.82], [0.58, -0.82], [-0.58, -0.32], [0.58, -0.32]]) {
    place(geos.box, mats.deskLeg, desk, lx, 0.35, lz, 0.07, 0.7, 0.07);
  }
  place(geos.box, colorMat, desk, 0, topY + 0.045, -0.5, 0.5, 0.012, 0.3);
  place(geos.box, mats.bezel, desk, 0, 1.05, -0.86, 0.66, 0.44, 0.05);
  const screen = place(geos.plane, mats.screenIdle, desk, 0, 1.055, -0.8, 0.54, 0.32, 1);
  place(geos.box, mats.bezel, desk, 0, 0.84, -0.86, 0.08, 0.14, 0.06);
  place(geos.box, mats.keys, desk, -0.04, topY + 0.05, -0.4, 0.36, 0.025, 0.13);
  place(geos.box, mats.bezel, desk, 0.32, topY + 0.046, -0.42, 0.07, 0.02, 0.1);

  const cz = 0.28;
  place(geos.box, mats.chair, desk, 0, 0.48, cz, 0.46, 0.08, 0.44);
  place(geos.box, mats.chair, desk, 0, 0.74, cz + 0.2, 0.46, 0.46, 0.07);
  place(geos.cyl, mats.chairBase, desk, 0, 0.24, cz, 0.045, 0.4, 0.045);
  place(geos.cyl, mats.chairBase, desk, 0, 0.04, cz, 0.2, 0.045, 0.2);

  desk.updateMatrix();
  const sit = new THREE.Vector3(0, 0, cz).applyMatrix4(desk.matrix);
  return { desk, screen, sit };
}

function addAccessory(type, head, bodyMat, color) {
  const extra = { type, tentacles: null, antenna: null };
  if (type === 'antenna') {
    const antenna = new THREE.Group();
    antenna.position.set(0, 0.16, 0);
    head.add(antenna);
    place(geos.cyl, ink, antenna, 0, 0.1, 0, 0.012, 0.2, 0.012);
    place(geos.sphere, gold, antenna, 0, 0.22, 0, 0.045, 0.045, 0.045);
    extra.antenna = antenna;
  } else if (type === 'bow') {
    place(geos.sphere, mat(0xff4d88), head, -0.1, 0.14, -0.02, 0.07, 0.05, 0.04);
    place(geos.sphere, mat(0xff4d88), head, 0.1, 0.14, -0.02, 0.07, 0.05, 0.04);
    place(geos.sphere, gold, head, 0, 0.14, 0.01, 0.035, 0.035, 0.035);
  } else if (type === 'glasses') {
    const left = place(geos.ring, ink, head, -0.065, 0.02, -0.15, 1, 1, 1);
    const right = place(geos.ring, ink, head, 0.065, 0.02, -0.15, 1, 1, 1);
    left.rotation.y = 0.15;
    right.rotation.y = -0.15;
    place(geos.box, ink, head, 0, 0.02, -0.155, 0.05, 0.012, 0.012);
  } else if (type === 'phones') {
    const band = place(geos.torus, ink, head, 0, 0.04, 0, 0.16, 0.16, 0.16);
    place(geos.sphere, ink, head, -0.16, 0.0, 0, 0.055, 0.07, 0.05);
    place(geos.sphere, ink, head, 0.16, 0.0, 0, 0.055, 0.07, 0.05);
  } else if (type === 'visor') {
    const visor = place(geos.box, mat(tint(color, 0xffffff, 0.35)), head, 0, 0.02, -0.15, 0.24, 0.07, 0.04);
    visor.material = new THREE.MeshLambertMaterial({
      color: tint(color, 0xffffff, 0.55),
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.35,
    });
  } else if (type === 'hat') {
    place(geos.cyl, mat(0x16343a), head, 0, 0.16, 0, 0.16, 0.08, 0.16);
    place(geos.cyl, mat(0x10282e), head, 0, 0.26, 0, 0.1, 0.16, 0.1);
  } else if (type === 'tentacles') {
    extra.tentacles = [];
    const spots = [[-0.12, -0.02, 0.08], [0.12, -0.02, 0.08], [0, -0.04, 0.14]];
    for (let i = 0; i < spots.length; i++) {
      const pivot = new THREE.Group();
      pivot.position.set(spots[i][0], spots[i][1], spots[i][2]);
      head.add(pivot);
      place(geos.limb, mat(tint(color, 0x000000, 0.25)), pivot, 0, -0.12, 0, 0.7, 0.85, 0.7);
      extra.tentacles.push(pivot);
    }
  }
  return extra;
}

function makeCharacter(color, accessory) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const bodyMat = mat(color);
  const headMat = mat(tint(color, 0xffffff, 0.1));
  const limbMat = mat(tint(color, 0x000000, 0.18));

  const torso = new THREE.Mesh(geos.torso, bodyMat);
  torso.position.y = 0.72;
  body.add(torso);

  const head = new THREE.Mesh(geos.head, headMat);
  head.position.y = 1.05;
  body.add(head);

  const eyeL = new THREE.Mesh(geos.eye, eyeWhite);
  eyeL.position.set(-0.07, 0.025, -0.155);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.07;
  const pL = new THREE.Mesh(geos.pupil, pupil);
  pL.position.set(0, 0, -0.04);
  const pR = pL.clone();
  eyeL.add(pL);
  eyeR.add(pR);
  head.add(eyeL, eyeR);

  // Capsule half-extent in Y before scale. scaleY stretches it; feet land on y=0.
  const limbHalf = 0.158;
  function limb(x, y, scaleY, material) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const mesh = new THREE.Mesh(geos.limb, material);
    mesh.scale.set(1.2, scaleY, 1.2);
    mesh.position.y = -limbHalf * scaleY;
    pivot.add(mesh);
    body.add(pivot);
    return pivot;
  }

  const armL = limb(-0.27, 0.78, 0.95, bodyMat);
  const armR = limb(0.27, 0.78, 0.95, bodyMat);
  const legL = limb(-0.09, 0.46, 1.42, limbMat);
  const legR = limb(0.09, 0.46, 1.42, limbMat);

  const hand = new THREE.Group();
  hand.position.set(0, -limbHalf * 0.95 * 2, 0);
  armR.add(hand);
  const snack = new THREE.Group();
  place(geos.box, mat(0xe76f51), snack, 0, 0, 0, 0.08, 0.1, 0.05);
  hand.add(snack);
  snack.visible = false;

  const book = new THREE.Group();
  place(geos.box, mats.bookCover, book, 0, 0, 0, 0.16, 0.05, 0.12);
  place(geos.box, mats.page, book, 0, 0.02, 0, 0.13, 0.02, 0.1);
  book.position.set(0, 0.5, -0.16);
  book.rotation.x = -0.5;
  body.add(book);
  book.visible = false;

  const controller = new THREE.Group();
  place(geos.box, mats.bezel, controller, 0, 0, 0, 0.18, 0.04, 0.08);
  place(geos.sphere, mat(0xef5d4c), controller, -0.05, 0.03, 0.01, 0.025, 0.025, 0.025);
  place(geos.sphere, mat(0x4c8dff), controller, 0.05, 0.03, 0.01, 0.025, 0.025, 0.025);
  controller.position.set(0, 0.46, -0.18);
  body.add(controller);
  controller.visible = false;

  const extra = addAccessory(accessory, head, bodyMat, color);

  const shadow = new THREE.Mesh(geos.circle, mats.shadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.025;
  shadow.scale.set(0.32, 0.32, 0.32);
  root.add(shadow);

  return { root, body, head, armL, armR, legL, legR, snack, book, controller, extra };
}

class Bot {
  constructor(name, index, slot, scene) {
    this.name = name;
    this.index = index;
    this.hidden = false;
    const named = NAMED[name];
    const color = named ? named.color : EXTRA_COLORS[index % EXTRA_COLORS.length];
    const accessory = named ? named.accessory : 'none';

    const colorMat = mat(color);
    const deskParts = createDesk(scene, slot, colorMat);
    this.desk = deskParts.desk;
    this.screen = deskParts.screen;
    this.screenMat = makeScreenMaterial(color);
    this.sitPos = { x: deskParts.sit.x, z: deskParts.sit.z };
    this.deskYaw = slot.rot;

    const parts = makeCharacter(color, accessory);
    this.root = parts.root;
    this.body = parts.body;
    this.head = parts.head;
    this.armL = parts.armL;
    this.armR = parts.armR;
    this.legL = parts.legL;
    this.legR = parts.legR;
    this.snack = parts.snack;
    this.book = parts.book;
    this.controller = parts.controller;
    this.extra = parts.extra;
    scene.add(this.root);

    this.root.position.set(this.sitPos.x, 0, this.sitPos.z);
    this.root.rotation.y = this.deskYaw;

    this.nameEl = document.createElement('div');
    this.nameEl.className = 'label';
    this.nameEl.textContent = name;
    this.nameLabel = new CSS2DObject(this.nameEl);
    this.nameLabel.position.set(0, 1.5, 0);
    this.root.add(this.nameLabel);

    this.bubbleEl = document.createElement('div');
    this.bubbleEl.className = 'bubble';
    this.bubble = new CSS2DObject(this.bubbleEl);
    this.bubble.position.set(0, 1.78, 0);
    this.bubble.center.set(0.5, 1);
    this.bubble.visible = false;
    this.root.add(this.bubble);
    this.bubbleText = '';
    this.bubbleKind = '';

    this.status = null;
    this.note = '';
    this.mode = 'sit';
    this.activity = null;
    this.activitySit = false;
    this.activityUntil = 0;
    this.pendingLeave = false;
    this.leaveDelay = 0;
    this.path = [];
    this.pathIndex = 0;
    this.finalTarget = this.sitPos;
    this.desiredYaw = this.deskYaw;
    this.desiredActYaw = 0;
    this.sitBlend = 1;
    this.phase = Math.random() * Math.PI * 2;
    this.phase0 = this.phase;
    this.speed = 3.15 + (index % 4) * 0.12;
    this.slotRef = null;
    this.pauseLeft = 0;
    this.chatting = false;
    this.moving = false;
  }

  setBubble(text, kind) {
    const next = text || '';
    const nextKind = next ? kind || 'chat' : '';
    if (next === this.bubbleText && nextKind === this.bubbleKind) return;
    this.bubbleText = next;
    this.bubbleKind = nextKind;
    this.bubble.visible = next.length > 0 && !this.hidden;
    this.bubbleEl.textContent = next;
    this.bubbleEl.className = nextKind === 'busy' ? 'bubble busy' : nextKind === 'chat' ? 'bubble chat' : 'bubble';
  }

  show() {
    if (!this.hidden) return;
    this.hidden = false;
    this.root.visible = true;
    this.desk.visible = true;
    this.nameLabel.visible = true;
    this.status = null;
  }

  hide() {
    if (this.hidden) return;
    this.hidden = true;
    this.root.visible = false;
    this.desk.visible = false;
    this.nameLabel.visible = false;
    this.bubble.visible = false;
    this.releaseSlot();
    this.status = null;
    this.pendingLeave = false;
    this.mode = 'sit';
    this.root.position.set(this.sitPos.x, 0, this.sitPos.z);
  }

  releaseSlot() {
    if (this.slotRef) {
      this.slotRef.taken = null;
      this.slotRef = null;
    }
  }

  setStatus(status, note) {
    const next = status === 'busy' ? 'busy' : 'idle';
    const clean = note || '';
    if (next === this.status) {
      this.note = clean;
      if (next === 'busy') this.setBubble(clean || '忙碌中', 'busy');
      return;
    }
    this.status = next;
    this.note = clean;
    this.releaseSlot();
    this.chatting = false;
    if (next === 'busy') {
      this.pendingLeave = false;
      this.activity = null;
      this.activitySit = false;
      this.screen.material = this.screenMat;
      this.setBubble(clean || '忙碌中', 'busy');
      const dx = this.sitPos.x - this.root.position.x;
      const dz = this.sitPos.z - this.root.position.z;
      if (Math.hypot(dx, dz) < 0.2) {
        this.mode = 'sit';
        this.root.position.set(this.sitPos.x, 0, this.sitPos.z);
        this.desiredYaw = this.deskYaw;
      } else {
        this.goTo(this.sitPos);
      }
    } else {
      this.screen.material = mats.screenIdle;
      this.setBubble('', null);
      this.pendingLeave = true;
      this.leaveDelay = 0.35 + this.index * 0.42;
      this.mode = 'sit';
      this.desiredYaw = this.deskYaw;
    }
  }

  goTo(goal) {
    this.finalTarget = goal;
    this.desiredActYaw = goal.yaw != null ? goal.yaw : this.deskYaw;
    this.path = buildPath(
      { x: this.root.position.x, z: this.root.position.z },
      goal,
    );
    this.pathIndex = 0;
    this.mode = 'move';
    if (this.path.length === 0) this.arrive();
  }

  chooseActivity(time, spots) {
    this.releaseSlot();
    const options = ['wander'];
    if (spots.snack.some((slot) => !slot.taken)) options.push('snack', 'snack');
    if (spots.read.some((slot) => !slot.taken)) options.push('read', 'read');
    if (spots.game.some((slot) => !slot.taken)) options.push('game', 'game');
    let type = options[(Math.random() * options.length) | 0];
    this.activityUntil = time + ACTIVITY_MIN + Math.random() * ACTIVITY_SPAN;
    this.chatting = false;
    this.setBubble('', null);

    if (type !== 'wander') {
      const slot = spots[type].find((item) => !item.taken);
      if (!slot) type = 'wander';
      else {
        slot.taken = this;
        this.slotRef = slot;
        this.activity = type;
        this.activitySit = type !== 'snack';
        this.goTo(slot);
        return;
      }
    }
    this.activity = 'wander';
    this.activitySit = false;
    this.goTo(this.pickWander(spots.wander));
  }

  pickWander(spots) {
    const list = spots;
    let choice = list[(Math.random() * list.length) | 0];
    for (let i = 0; i < 4; i++) {
      const candidate = list[(Math.random() * list.length) | 0];
      const dx = candidate.x - this.root.position.x;
      const dz = candidate.z - this.root.position.z;
      if (dx * dx + dz * dz > 4) {
        choice = candidate;
        break;
      }
    }
    return choice;
  }

  arrive() {
    this.root.position.x = this.finalTarget.x;
    this.root.position.z = this.finalTarget.z;
    this.moving = false;
    this.pathIndex = this.path.length;
    if (this.status === 'busy') {
      this.mode = 'sit';
      this.desiredYaw = this.deskYaw;
      this.setBubble(this.note || '忙碌中', 'busy');
      return;
    }
    this.mode = 'act';
    if (this.activity === 'wander') {
      this.pauseLeft = 8 + Math.random() * 8;
      this.desiredYaw = this.root.rotation.y;
      if (Math.random() < 0.5) this.setBubble('…', 'chat');
    } else {
      this.desiredYaw = this.desiredActYaw;
    }
  }

  update(dt, time, bots, spots) {
    if (this.hidden) return;

    if (this.pendingLeave) {
      this.leaveDelay -= dt;
      if (this.leaveDelay <= 0) {
        this.pendingLeave = false;
        this.chooseActivity(time, spots);
      }
    } else if (this.mode === 'act' && time >= this.activityUntil) {
      this.chooseActivity(time, spots);
    }

    this.moving = false;
    if (this.mode === 'move') this.stepMove(dt, bots);
    else if (this.mode === 'act' && this.activity === 'wander') this.updateWander(dt, time, bots, spots);

    this.turn(dt);
    this.applyPose(dt, time);
    this.updateProps();
    if (this.screen.material === this.screenMat) {
      this.screenMat.emissiveIntensity = 0.85 + Math.sin(time * 3.1 + this.phase0) * 0.25;
    }
  }

  stepMove(dt, bots) {
    if (this.pathIndex >= this.path.length) {
      this.arrive();
      return;
    }
    const target = this.path[this.pathIndex];
    let dx = target.x - this.root.position.x;
    let dz = target.z - this.root.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.1) {
      this.pathIndex += 1;
      if (this.pathIndex >= this.path.length) this.arrive();
      return;
    }
    let vx = dx / dist;
    let vz = dz / dist;
    for (let i = 0; i < bots.length; i++) {
      const other = bots[i];
      if (other === this || other.hidden) continue;
      const ox = this.root.position.x - other.root.position.x;
      const oz = this.root.position.z - other.root.position.z;
      const d2 = ox * ox + oz * oz;
      if (d2 < 0.5 && d2 > 1e-4) {
        const d = Math.sqrt(d2);
        vx += (ox / d) * 0.9;
        vz += (oz / d) * 0.9;
      }
    }
    const vl = Math.hypot(vx, vz) || 1;
    vx /= vl;
    vz /= vl;
    const step = Math.min(dist, this.speed * dt);
    this.root.position.x = clamp(this.root.position.x + vx * step, -12.25, 12.25);
    this.root.position.z = clamp(this.root.position.z + vz * step, -8.25, 8.35);
    this.desiredYaw = yawToward(vx, vz);
    this.phase += dt * 9.5;
    this.moving = true;
  }

  updateWander(dt, time, bots, spots) {
    let partner = null;
    let best = 2.1 * 2.1;
    let pdx = 0;
    let pdz = 0;
    for (let i = 0; i < bots.length; i++) {
      const other = bots[i];
      if (other === this || other.hidden) continue;
      if (other.activity !== 'wander' || other.mode === 'move') continue;
      const dx = other.root.position.x - this.root.position.x;
      const dz = other.root.position.z - this.root.position.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < best) {
        best = d2;
        partner = other;
        pdx = dx;
        pdz = dz;
      }
    }
    if (partner) {
      this.desiredYaw = yawToward(pdx, pdz);
      if (!this.chatting) {
        this.chatting = true;
        this.setBubble(CHAT[(Math.random() * CHAT.length) | 0], 'chat');
      }
    } else if (this.chatting) {
      this.chatting = false;
      this.setBubble('', null);
    }

    this.pauseLeft -= dt;
    if (this.pauseLeft <= 0 && time < this.activityUntil) {
      this.chatting = false;
      this.setBubble('', null);
      this.goTo(this.pickWander(spots.wander));
    }
  }

  turn(dt) {
    let delta = this.desiredYaw - this.root.rotation.y;
    if (delta > Math.PI) delta -= Math.PI * 2;
    else if (delta < -Math.PI) delta += Math.PI * 2;
    this.root.rotation.y += delta * Math.min(1, dt * 8);
  }

  applyPose(dt, time) {
    const wantSit = this.mode === 'sit' || (this.mode === 'act' && this.activitySit);
    const blendTarget = wantSit ? 1 : 0;
    this.sitBlend += (blendTarget - this.sitBlend) * Math.min(1, dt * 6);

    let armLX = 0.15;
    let armRX = 0.15;
    let legLX = 0;
    let legRX = 0;
    let headX = 0;
    const typing = this.mode === 'sit' && this.status === 'busy';
    const eating = this.mode === 'act' && this.activity === 'snack';
    const reading = this.mode === 'act' && this.activity === 'read';
    const gaming = this.mode === 'act' && this.activity === 'game';

    if (this.moving) {
      const swing = Math.sin(this.phase);
      legLX = swing * 0.75;
      legRX = -swing * 0.75;
      armLX = -swing * 0.55;
      armRX = swing * 0.55;
    } else if (typing) {
      armLX = 1.12 + Math.sin(time * 14 + this.phase0) * 0.16;
      armRX = 1.12 + Math.sin(time * 14 + this.phase0 + 1.3) * 0.16;
      legLX = 1.25;
      legRX = 1.25;
      headX = 0.18 + Math.sin(time * 14) * 0.03;
    } else if (eating) {
      const cycle = time % 3.4;
      let lift = 0;
      if (cycle > 2.1) lift = Math.sin(((cycle - 2.1) / 1.3) * Math.PI);
      armRX = -2.15 * lift;
      armLX = 0.2;
      headX = 0.25 * lift;
    } else if (reading) {
      armLX = 0.95;
      armRX = 0.95;
      legLX = 1.25;
      legRX = 1.25;
      headX = 0.42;
    } else if (gaming) {
      const mash = Math.sin(time * 8 + this.phase0);
      armLX = 0.85 + mash * 0.1;
      armRX = 0.85 - mash * 0.1;
      legLX = 1.15;
      legRX = 1.15;
      headX = 0.12;
    } else if (this.sitBlend > 0.5) {
      armLX = 0.35;
      armRX = 0.35;
      legLX = 1.25;
      legRX = 1.25;
    } else if (this.chatting) {
      armRX = 0.4 + Math.sin(time * 3 + this.phase0) * 0.25;
      armLX = 0.15;
    }

    if (wantSit && !this.moving) {
      legLX = legLX * (1 - this.sitBlend) + 1.25 * this.sitBlend;
      legRX = legRX * (1 - this.sitBlend) + 1.25 * this.sitBlend;
    }

    this.armL.rotation.x = armLX;
    this.armR.rotation.x = armRX;
    this.legL.rotation.x = legLX;
    this.legR.rotation.x = legRX;
    this.head.rotation.x = headX;
    this.head.rotation.y = this.moving ? 0 : Math.sin(time * 0.6 + this.phase0) * 0.12;

    let drop = 0.12 * this.sitBlend;
    if (gaming) drop += 0.3 * this.sitBlend;
    if (this.moving) drop = Math.abs(Math.sin(this.phase)) * 0.04;
    this.body.position.y = -drop;

    if (this.extra.tentacles) {
      for (let i = 0; i < this.extra.tentacles.length; i++) {
        this.extra.tentacles[i].rotation.z = Math.sin(time * 1.6 + i) * 0.3;
        this.extra.tentacles[i].rotation.x = 0.4 + Math.cos(time * 1.3 + i) * 0.15;
      }
    }
    if (this.extra.antenna) {
      this.extra.antenna.rotation.z = Math.sin(time * 1.4 + this.phase0) * 0.12;
    }
  }

  updateProps() {
    const read = this.mode === 'act' && this.activity === 'read';
    const game = this.mode === 'act' && this.activity === 'game';
    const snack = this.mode === 'act' && this.activity === 'snack';
    if (this.book.visible !== read) this.book.visible = read;
    if (this.controller.visible !== game) this.controller.visible = game;
    if (this.snack.visible !== snack) this.snack.visible = snack;
  }
}

function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function createSim(scene, world) {
  const bots = [];
  const byName = new Map();
  let slotIndex = 0;

  function ensure(name) {
    let bot = byName.get(name);
    if (bot) return bot;
    if (slotIndex >= SLOTS.length) return null;
    bot = new Bot(name, slotIndex, SLOTS[slotIndex], scene);
    slotIndex += 1;
    byName.set(name, bot);
    bots.push(bot);
    return bot;
  }

  return {
    bots,
    sync(list) {
      const seen = new Set();
      let busy = 0;
      let idle = 0;
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (!item || typeof item.name !== 'string' || seen.has(item.name)) continue;
        seen.add(item.name);
        const status = item.status === 'busy' ? 'busy' : 'idle';
        if (status === 'busy') busy += 1;
        else idle += 1;
        const bot = ensure(item.name);
        if (!bot) continue;
        bot.show();
        const note = typeof item.note === 'string' ? item.note.replace(/\s+/g, ' ').trim().slice(0, 80) : '';
        bot.setStatus(status, note);
      }
      for (let i = 0; i < bots.length; i++) {
        if (!seen.has(bots[i].name)) bots[i].hide();
      }
      return { busy, idle };
    },
    update(dt, time) {
      // Sit blend needs the real frame dt. Stash it where applyPose can read it
      // without allocating.
      let gaming = false;
      for (let i = 0; i < bots.length; i++) {
        const bot = bots[i];
        bot.update(dt, time, bots, world.spots);
        if (!bot.hidden && bot.activity === 'game' && bot.mode === 'act') gaming = true;
      }
      world.animate(time, gaming);
    },
  };
}
