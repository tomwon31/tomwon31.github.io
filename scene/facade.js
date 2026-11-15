import * as THREE from 'three';

export const facadeNight = { value: 0 };
export const facadeTime = { value: 0 };

const VERT = `#include <common>
varying vec3 vCityWorld;
varying vec3 vCityN;
void cityVertex(vec3 pos, vec3 nrm) {
  vec4 cw = vec4(pos, 1.0);
  vec3 cn = nrm;
  #ifdef USE_INSTANCING
    cw = instanceMatrix * cw;
    cn = mat3(instanceMatrix) * cn;
  #endif
  vCityWorld = (modelMatrix * cw).xyz;
  vCityN = normalize(mat3(modelMatrix) * cn);
}`;

const FRAG = `#include <common>
varying vec3 vCityWorld;
varying vec3 vCityN;
uniform float uNight;
uniform float uTime;

float cityHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

vec2 cityWin(vec3 pos, vec3 nrm) {
  if (abs(nrm.y) > 0.62) return vec2(0.0);
  float horiz = abs(nrm.x) > abs(nrm.z) ? pos.z : pos.x;
  vec2 cell = vec2(horiz * 0.58, pos.y * 0.66);
  vec2 id = floor(cell);
  vec2 f = fract(cell);
  float pane = step(0.18, f.x) * step(0.15, f.y) * step(f.x, 0.82) * step(f.y, 0.84);
  pane *= step(0.14, cityHash(id));
  float on = pane * smoothstep(0.2, 0.62, cityHash(id + 8.0));
  return vec2(pane, on);
}

vec3 cityDiffuse(vec3 base, vec3 pos, vec3 nrmIn) {
  vec3 nrm = normalize(nrmIn);
  float roof = smoothstep(0.48, 0.8, abs(nrm.y));
  base = mix(base, base * vec3(0.4, 0.38, 0.36), roof);
  vec2 win = cityWin(pos, nrm);
  vec3 glassTint = mix(vec3(0.15, 0.17, 0.21), vec3(0.55, 0.58, 0.62), 1.0 - uNight);
  return mix(base, base * glassTint, win.x * (1.0 - roof));
}

vec3 cityEmit(vec3 pos, vec3 nrmIn) {
  vec3 nrm = normalize(nrmIn);
  vec2 win = cityWin(pos, nrm);
  float horiz = abs(nrm.x) > abs(nrm.z) ? pos.z : pos.x;
  vec2 id = floor(vec2(horiz * 0.58, pos.y * 0.66));
  float cool = step(0.86, cityHash(id + 4.2));
  float bright = smoothstep(0.74, 0.97, cityHash(id + 3.1));
  vec3 lamp = mix(vec3(1.0, 0.56, 0.24), vec3(1.0, 0.82, 0.52), bright);
  lamp = mix(lamp, vec3(0.7, 0.82, 1.0), cool);
  float flick = 0.84 + 0.16 * step(0.06, cityHash(id + floor(uTime * 0.33)));
  return lamp * win.y * uNight * 1.25 * flick;
}`;

export function createFacade(color) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.9,
    metalness: 0.04,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = facadeNight;
    shader.uniforms.uTime = facadeTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', VERT)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ncityVertex(position, normal);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', FRAG)
      .replace(
        '#include <color_fragment>',
        '#include <color_fragment>\ndiffuseColor.rgb = cityDiffuse(diffuseColor.rgb, vCityWorld, vCityN);',
      )
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\ntotalEmissiveRadiance += cityEmit(vCityWorld, vCityN);',
      );
  };
  mat.customProgramCacheKey = () => 'facade-v1';
  return mat;
}
