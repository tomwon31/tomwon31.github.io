import * as THREE from 'three';

export const SCREEN_FILL = 0.9;

export const HOME_POS = new THREE.Vector3(0.34, 1.36, 1.78);
export const HOME_TARGET = new THREE.Vector3(0.0, 0.84, -2.9);
export const HOME_FOV = 36;

const YAW_LIM = 0.2;
const PITCH_LIM = 0.085;
const UP = new THREE.Vector3(0, 1, 0);

export function screenFit(camera, screen, vw, vh, fill = SCREEN_FILL) {
  const aspect = vw / Math.max(1, vh);
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5);
  const screenAspect = screen.width / screen.height;
  const dist = screenAspect > aspect
    ? screen.width / (fill * 2 * tan * aspect)
    : screen.height / (fill * 2 * tan);
  const visH = 2 * dist * tan;
  const visW = visH * aspect;
  const pos = screen.position.clone().addScaledVector(screen.normal, dist);
  return {
    dist,
    pos,
    target: screen.position.clone(),
    fracW: screen.width / visW,
    fracH: screen.height / visH,
  };
}

function ease(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
}

export function createRig(camera, screen, { reduced = false } = {}) {
  const baseForward = HOME_TARGET.clone().sub(HOME_POS).normalize();
  const look = HOME_TARGET.clone();
  const fromPos = new THREE.Vector3();
  const toPos = new THREE.Vector3();
  const fromLook = new THREE.Vector3();
  const toLook = new THREE.Vector3();
  const pos = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const yawQ = new THREE.Quaternion();
  const pitchQ = new THREE.Quaternion();
  const right = new THREE.Vector3();

  let mode = 'room';
  let yaw = 0;
  let pitch = 0;
  let dragging = false;
  let sway = reduced ? 0 : 1;
  let flyT = 0;
  const flyDur = reduced ? 0.4 : 1.2;
  const motion = reduced ? 0 : 1;

  function pose(y, p, outPos, outForward) {
    yawQ.setFromAxisAngle(UP, y);
    outForward.copy(baseForward).applyQuaternion(yawQ);
    right.crossVectors(outForward, UP);
    if (right.lengthSq() < 1e-8) right.set(1, 0, 0);
    right.normalize();
    pitchQ.setFromAxisAngle(right, p);
    outForward.applyQuaternion(pitchQ).normalize();
    outPos.copy(HOME_POS);
  }

  function applyRoom(time) {
    const swayYaw = Math.sin(time * 0.23) * 0.011 * sway * motion;
    const swayPitch = Math.sin(time * 0.17 + 0.8) * 0.005 * sway * motion;
    pose(yaw + swayYaw, pitch + swayPitch, pos, forward);
    pos.x += Math.sin(time * 0.19) * 0.006 * sway * motion;
    pos.y += Math.sin(time * 0.48) * 0.0035 * sway * motion;
    camera.position.copy(pos);
    look.copy(pos).add(forward);
    camera.lookAt(look);
  }

  function screenPose() {
    return screenFit(camera, screen, window.innerWidth, Math.max(1, window.innerHeight));
  }

  return {
    get mode() {
      return mode;
    },
    setDragging(value) {
      dragging = value;
    },
    drag(dx, dy) {
      if (mode !== 'room') return;
      yaw = THREE.MathUtils.clamp(yaw - dx * 0.00215, -YAW_LIM, YAW_LIM);
      pitch = THREE.MathUtils.clamp(pitch - dy * 0.0017, -PITCH_LIM, PITCH_LIM);
    },
    goScreen() {
      if (mode === 'screen' || mode === 'to-screen') return;
      const fit = screenPose();
      fromPos.copy(camera.position);
      fromLook.copy(look);
      toPos.copy(fit.pos);
      toLook.copy(fit.target);
      flyT = 0;
      mode = 'to-screen';
    },
    goRoom() {
      if (mode === 'room' || mode === 'to-room') return;
      fromPos.copy(camera.position);
      fromLook.copy(look);
      pose(yaw, pitch, toPos, forward);
      toLook.copy(toPos).add(forward);
      flyT = 0;
      mode = 'to-room';
      sway = 0;
    },
    jumpScreen() {
      const fit = screenPose();
      camera.position.copy(fit.pos);
      look.copy(fit.target);
      camera.lookAt(look);
      mode = 'screen';
    },
    resize() {
      if (mode === 'screen') {
        const fit = screenPose();
        camera.position.copy(fit.pos);
        look.copy(fit.target);
        camera.lookAt(look);
      } else if (mode === 'to-screen') {
        const fit = screenPose();
        toPos.copy(fit.pos);
        toLook.copy(fit.target);
      }
    },
    update(dt, time) {
      const swayTarget = mode === 'room' && !dragging ? 1 : 0;
      const k = 1 - Math.exp(-3.5 * dt);
      sway += (swayTarget - sway) * k;

      if (mode === 'room') {
        applyRoom(time);
        return;
      }
      if (mode === 'screen') {
        const fit = screenPose();
        camera.position.copy(fit.pos);
        look.copy(fit.target);
        camera.lookAt(look);
        return;
      }
      flyT += dt;
      const u = ease(Math.min(1, flyT / flyDur));
      camera.position.lerpVectors(fromPos, toPos, u);
      look.lerpVectors(fromLook, toLook, u);
      camera.lookAt(look);
      if (flyT >= flyDur) {
        camera.position.copy(toPos);
        look.copy(toLook);
        camera.lookAt(look);
        mode = mode === 'to-screen' ? 'screen' : 'room';
      }
    },
  };
}
