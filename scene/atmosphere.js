import * as THREE from 'three';
import { LAYOUT } from './layout.js';
import { facadeNight, facadeTime } from './facade.js';
import { streakTexture, flakeTexture } from './textures.js';

const WIN = LAYOUT.window;

function hexMix(out, a, b, t) {
  out.copy(a).lerp(b, t);
  return out;
}

const A = new THREE.Color();
const B = new THREE.Color();

function mixHex(out, a, b, t) {
  A.set(a);
  B.set(b);
  return hexMix(out, A, B, t);
}

function look(partial) {
  return partial;
}

const PRESET = {
  clear: {
    day: look({
      skyTop: '#6e92b0', skyUpper: '#d5e6f1', skyHorizon: '#f2c48a', skyBelow: '#c9a27c', silhouette: '#b08968',
      fog: '#e8c49a', fogD: 0.0054, sun: '#ffd2a4', sunI: 3.6,
      hemiS: '#ffe4c4', hemiG: '#7a5340', hemiI: 0.72,
      bounce: '#ffd8b4', bounceI: 0.48, exposure: 1.12,
      rain: 0, snow: 0, disc: 1, moon: 0, spot: 70, shade: 0.55, screen: 3.5,
    }),
    night: look({
      skyTop: '#070912', skyUpper: '#14182a', skyHorizon: '#3a2a22', skyBelow: '#100e0c', silhouette: '#1a1618',
      fog: '#121018', fogD: 0.0065, sun: '#9eb4cc', sunI: 0.16,
      hemiS: '#1a2436', hemiG: '#3a2418', hemiI: 0.32,
      bounce: '#ffc08a', bounceI: 0.1, exposure: 1.02,
      rain: 0, snow: 0, disc: 0, moon: 1, spot: 120, shade: 0.9, screen: 8,
    }),
  },
  cloudy: {
    day: look({
      skyTop: '#8d98a2', skyUpper: '#c5ced4', skyHorizon: '#d5d0c6', skyBelow: '#a8a197', silhouette: '#9c948a',
      fog: '#c9c3b8', fogD: 0.0095, sun: '#e7e4dc', sunI: 1.15,
      hemiS: '#e6eaee', hemiG: '#6e675f', hemiI: 0.78,
      bounce: '#f0ece4', bounceI: 0.36, exposure: 1.04,
      rain: 0, snow: 0, disc: 0.15, moon: 0, spot: 55, shade: 0.4, screen: 4,
    }),
    night: look({
      skyTop: '#10141c', skyUpper: '#1a1e28', skyHorizon: '#2a2424', skyBelow: '#12100e', silhouette: '#1c1a1e',
      fog: '#16141a', fogD: 0.01, sun: '#8ea0b4', sunI: 0.1,
      hemiS: '#1a2030', hemiG: '#2e221c', hemiI: 0.28,
      bounce: '#ffc090', bounceI: 0.08, exposure: 1.0,
      rain: 0, snow: 0, disc: 0, moon: 0.25, spot: 110, shade: 0.85, screen: 8,
    }),
  },
  rain: {
    day: look({
      skyTop: '#59646c', skyUpper: '#8a9296', skyHorizon: '#a3a7a6', skyBelow: '#6e736f', silhouette: '#6d7678',
      fog: '#8e9496', fogD: 0.011, sun: '#c5ccd0', sunI: 0.55,
      hemiS: '#c5ced2', hemiG: '#5c5854', hemiI: 0.48,
      bounce: '#d5dbe0', bounceI: 0.22, exposure: 0.98,
      rain: 1, snow: 0, disc: 0, moon: 0, spot: 80, shade: 0.55, screen: 5,
    }),
    night: look({
      skyTop: '#07090e', skyUpper: '#12161e', skyHorizon: '#241c1c', skyBelow: '#0c0e12', silhouette: '#14161c',
      fog: '#10141a', fogD: 0.012, sun: '#8090a4', sunI: 0.08,
      hemiS: '#141a28', hemiG: '#241810', hemiI: 0.22,
      bounce: '#ffb888', bounceI: 0.06, exposure: 0.98,
      rain: 1, snow: 0, disc: 0, moon: 0, spot: 130, shade: 0.95, screen: 9,
    }),
  },
  snow: {
    day: look({
      skyTop: '#c5d0d8', skyUpper: '#e7eef3', skyHorizon: '#eef2f4', skyBelow: '#d5dde3', silhouette: '#c5d0d8',
      fog: '#e4eaee', fogD: 0.012, sun: '#f4f7fb', sunI: 1.45,
      hemiS: '#f7fbff', hemiG: '#8b939c', hemiI: 0.8,
      bounce: '#f5f8fb', bounceI: 0.4, exposure: 1.08,
      rain: 0, snow: 1, disc: 0.35, moon: 0, spot: 64, shade: 0.42, screen: 4,
    }),
    night: look({
      skyTop: '#121820', skyUpper: '#243040', skyHorizon: '#3a342e', skyBelow: '#161820', silhouette: '#2a3038',
      fog: '#1c242e', fogD: 0.013, sun: '#b7c6d6', sunI: 0.2,
      hemiS: '#243044', hemiG: '#2a2018', hemiI: 0.3,
      bounce: '#ffd0a8', bounceI: 0.1, exposure: 1.02,
      rain: 0, snow: 1, disc: 0, moon: 0.55, spot: 115, shade: 0.88, screen: 8,
    }),
  },
  fog: {
    day: look({
      skyTop: '#d4cfc4', skyUpper: '#e6e0d4', skyHorizon: '#ebe4d6', skyBelow: '#d8d0c2', silhouette: '#ddd4c6',
      fog: '#e7e0d2', fogD: 0.026, sun: '#f0e6d4', sunI: 0.7,
      hemiS: '#f3eee4', hemiG: '#8a8176', hemiI: 0.7,
      bounce: '#f6efe4', bounceI: 0.3, exposure: 1.05,
      rain: 0, snow: 0, disc: 0.08, moon: 0, spot: 60, shade: 0.4, screen: 4.5,
    }),
    night: look({
      skyTop: '#2a2826', skyUpper: '#3a3834', skyHorizon: '#4a4038', skyBelow: '#221e1c', silhouette: '#3a3632',
      fog: '#3a342e', fogD: 0.03, sun: '#b0a498', sunI: 0.12,
      hemiS: '#3a342e', hemiG: '#2a2018', hemiI: 0.28,
      bounce: '#ffc098', bounceI: 0.08, exposure: 1.0,
      rain: 0, snow: 0, disc: 0, moon: 0.15, spot: 120, shade: 0.9, screen: 8,
    }),
  },
};

const COLOR_KEYS = ['skyTop', 'skyUpper', 'skyHorizon', 'skyBelow', 'silhouette', 'fog', 'sun', 'hemiS', 'hemiG', 'bounce'];
const NUM_KEYS = ['fogD', 'sunI', 'hemiI', 'bounceI', 'exposure', 'rain', 'snow', 'disc', 'moon', 'spot', 'shade', 'screen'];

function makeLook() {
  const state = { night: 0 };
  COLOR_KEYS.forEach((key) => { state[key] = new THREE.Color(); });
  NUM_KEYS.forEach((key) => { state[key] = 0; });
  return state;
}

function writeLook(out, kind, night, precip, locked) {
  const preset = PRESET[kind] || PRESET.clear;
  const t = THREE.MathUtils.clamp(night, 0, 1);
  COLOR_KEYS.forEach((key) => mixHex(out[key], preset.day[key], preset.night[key], t));
  NUM_KEYS.forEach((key) => {
    out[key] = THREE.MathUtils.lerp(preset.day[key], preset.night[key], t);
  });
  out.night = t;
  const wet = locked ? 0.9 : Math.min(1, 0.5 + (precip || 0) * 0.35);
  out.rain *= wet;
  out.snow *= locked ? 0.88 : Math.min(1, 0.55 + (precip || 0) * 0.3);
}

function copyLook(dst, src) {
  COLOR_KEYS.forEach((key) => dst[key].copy(src[key]));
  NUM_KEYS.forEach((key) => { dst[key] = src[key]; });
  dst.night = src.night;
}

function dampLook(dst, src, dt) {
  const a = 1 - Math.exp(-1.7 * dt);
  COLOR_KEYS.forEach((key) => dst[key].lerp(src[key], a));
  NUM_KEYS.forEach((key) => { dst[key] += (src[key] - dst[key]) * a; });
  dst.night += (src.night - dst.night) * a;
}

function field(count, geo, mat, spawn) {
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const parts = [];
  for (let i = 0; i < count; i += 1) parts.push(spawn(i));
  return { mesh, parts };
}

const GLASS_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const GLASS_FRAG = `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uRain;
  uniform float uSnow;
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float streaks(vec2 uv, float scale) {
    vec2 p = uv * vec2(scale, scale * 0.22);
    float col = floor(p.x);
    float n = hash(vec2(col, scale));
    float y = fract(p.y - uTime * (0.28 + n * 0.7) + n * 8.0);
    float x = fract(p.x);
    float band = smoothstep(0.16, 0.0, abs(x - 0.5)) * smoothstep(0.0, 0.02, y) * smoothstep(0.5, 0.05, y);
    return band * step(0.28, n);
  }
  void main() {
    float rain = streaks(vUv, 42.0) + streaks(vUv + 3.7, 78.0) * 0.65;
    vec2 duv = vUv * vec2(16.0, 10.0);
    vec2 id = floor(duv);
    vec2 gv = fract(duv) - 0.5;
    float n = hash(id);
    vec2 c = vec2(hash(id + 2.0) - 0.5, hash(id + 5.0) - 0.5) * 0.65;
    float drop = smoothstep(0.07, 0.0, length(gv - c)) * step(0.8, n);
    float drip = smoothstep(0.03, 0.0, abs(gv.x - c.x)) * smoothstep(0.05, -0.55, gv.y - c.y) * step(0.84, n);
    vec2 suv = vUv * vec2(22.0, 14.0);
    vec2 sid = floor(suv);
    float sn = hash(sid + 9.0);
    float flake = smoothstep(0.16, 0.02, length(fract(suv + vec2(uTime * 0.02, uTime * 0.05)) - 0.5)) * step(0.62, sn);
    float alpha = (rain * 0.62 + drop * 0.25 + drip * 0.22) * uRain + flake * 0.4 * uSnow;
    vec3 col = mix(vec3(0.78, 0.82, 0.86), vec3(0.96, 0.97, 0.98), drop + flake);
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.62));
  }
`;

export function createAtmosphere(scene, renderer, room) {
  scene.fog = new THREE.FogExp2(0xe8c49a, 0.0054);

  const hemi = new THREE.HemisphereLight(0xffe4c4, 0x7a5340, 0.7);
  const sun = new THREE.DirectionalLight(0xffd2a4, 3.4);
  sun.position.set(-2.8, 6.4, -6.5);
  sun.target.position.set(0.1, 0.7, 0.05);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 0.4;
  sun.shadow.camera.far = 22;
  sun.shadow.camera.left = -5;
  sun.shadow.camera.right = 5;
  sun.shadow.camera.top = 5;
  sun.shadow.camera.bottom = -5;
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.028;

  const bounce = new THREE.DirectionalLight(0xffd8b4, 0.45);
  bounce.position.set(1.4, 2.2, 2.4);
  bounce.target.position.set(0, 1, -0.2);

  const spot = new THREE.SpotLight(0xffb15e, 70, 4.2, 0.85, 0.62, 2);
  spot.position.copy(room.anchors.lampPos);
  spot.target.position.copy(room.anchors.lampTarget);

  const screenLight = new THREE.PointLight(0xfff0d4, 3.5, 2.1, 2);
  screenLight.position.copy(room.anchors.glowPos);

  scene.add(hemi, sun, sun.target, bounce, bounce.target, spot, spot.target, screenLight);

  const glassMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uRain: { value: 0 },
      uSnow: { value: 0 },
    },
    vertexShader: GLASS_VERT,
    fragmentShader: GLASS_FRAG,
  });
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(WIN.x1 - WIN.x0 - 0.25, WIN.y1 - WIN.y0 - 0.08),
    glassMat,
  );
  glass.position.set(0, (WIN.y0 + WIN.y1) / 2, WIN.z + 0.1);
  glass.renderOrder = 2;
  scene.add(glass);

  const rainMat = new THREE.MeshBasicMaterial({
    map: streakTexture(),
    transparent: true,
    depthWrite: false,
    opacity: 0.8,
    fog: false,
    color: 0xd5dee6,
  });
  const snowMat = new THREE.MeshBasicMaterial({
    map: flakeTexture(),
    transparent: true,
    depthWrite: false,
    opacity: 0.9,
    fog: false,
    color: 0xf7fbff,
  });
  const rain = field(170, new THREE.PlaneGeometry(0.012, 0.85), rainMat, () => ({
    x: Math.random() * 30 - 15,
    y: Math.random() * 14 - 2,
    z: -4.8 - Math.random() * 28,
    vy: 8 + Math.random() * 6,
    sy: 0.7 + Math.random() * 1.1,
    ry: (Math.random() - 0.5) * 0.5,
  }));
  const snow = field(130, new THREE.PlaneGeometry(0.07, 0.07), snowMat, () => ({
    x: Math.random() * 32 - 16,
    y: Math.random() * 14 - 2,
    z: -4.8 - Math.random() * 30,
    vy: 0.7 + Math.random() * 1.1,
    phase: Math.random() * Math.PI * 2,
    s: 0.6 + Math.random() * 1.1,
  }));
  rain.mesh.renderOrder = 3;
  snow.mesh.renderOrder = 3;
  scene.add(rain.mesh, snow.mesh);

  const current = makeLook();
  const target = makeLook();
  let snapped = false;
  const dummy = new THREE.Object3D();
  let clock = 0;

  function syncField(group, amount, step) {
    group.mesh.visible = amount > 0.02;
    if (!group.mesh.visible) return;
    group.parts.forEach((part, index) => step(part));
    group.parts.forEach((part, index) => {
      dummy.position.set(part.x, part.y, part.z);
      dummy.rotation.set(0, part.ry || 0, 0);
      dummy.scale.set(part.sx || part.s || 1, part.sy || part.s || 1, 1);
      dummy.updateMatrix();
      group.mesh.setMatrixAt(index, dummy.matrix);
    });
    group.mesh.instanceMatrix.needsUpdate = true;
  }

  return {
    update(dt, sample) {
      clock += dt;
      writeLook(target, sample.kind, sample.night, sample.precip, sample.locked);
      if (!snapped) {
        copyLook(current, target);
        snapped = true;
      } else {
        dampLook(current, target, dt);
      }

      scene.fog.color.copy(current.fog);
      scene.fog.density = current.fogD;
      scene.background = scene.fog.color;
      sun.color.copy(current.sun);
      sun.intensity = current.sunI;
      hemi.color.copy(current.hemiS);
      hemi.groundColor.copy(current.hemiG);
      hemi.intensity = current.hemiI;
      bounce.color.copy(current.bounce);
      bounce.intensity = current.bounceI;
      spot.intensity = current.spot;
      screenLight.intensity = current.screen;
      room.shade.emissiveIntensity = current.shade;
      renderer.toneMappingExposure = current.exposure;
      facadeNight.value = current.night;
      facadeTime.value = clock;
      glassMat.uniforms.uTime.value = clock;
      glassMat.uniforms.uRain.value = current.rain;
      glassMat.uniforms.uSnow.value = current.snow;
      glass.visible = current.rain > 0.03 || current.snow > 0.03;
      rainMat.opacity = 0.25 + current.rain * 0.6;
      snowMat.opacity = 0.35 + current.snow * 0.55;

      syncField(rain, current.rain, (part) => {
        part.y -= part.vy * dt;
        if (part.y < -4) {
          part.y = 10;
          part.x = Math.random() * 30 - 15;
        }
      });
      syncField(snow, current.snow, (part) => {
        part.y -= part.vy * dt;
        part.x += Math.sin(clock + part.phase) * 0.35 * dt;
        if (part.y < -4) {
          part.y = 10;
          part.x = Math.random() * 32 - 16;
        }
      });
      return current;
    },
  };
}
