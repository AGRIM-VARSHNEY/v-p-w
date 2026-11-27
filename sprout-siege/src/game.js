// Spark of Being: a gothic action game after Mary Shelley's Frankenstein.
import * as THREE from 'three';
import { BASE, DIFFICULTIES, BOONS, ENEMIES, BOSSES, ACTS, REWARDS, LAB } from './data.js';
import { BIRTH_YEAR, START_YEARS, PROLOGUE, ACT_TEXT, ENDINGS, LETTERS, CODES, DICE_RULES } from './story.js';
import { Sound } from './audio.js';
import * as VX from './voxel.js';

const $ = (id) => document.getElementById(id);
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };
const isTouch = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
const LOW = isTouch;
const ROMAN = ['I', 'II', 'III', 'IV'];

// ------------------------------------------------------------------ save data
const SAVE_KEY = 'spark-of-being-save-v1';
function defaultSave() {
  return {
    guineas: 0, lab: {}, diff: 'gothic', tale: null, letters: {}, tales: 0, endings: {},
    settings: { music: true, sfx: true, shake: true, numbers: true },
    codes: { found: {}, god: false, galvani: false, slow: false, bighead: false, plain: false, acts: false, years: false, money: false },
  };
}
function mergeSave(s) {
  const out = Object.assign(defaultSave(), s || {});
  out.settings = Object.assign(defaultSave().settings, (s && s.settings) || {});
  out.codes = Object.assign(defaultSave().codes, (s && s.codes) || {});
  out.codes.found = Object.assign({}, (s && s.codes && s.codes.found) || {});
  out.lab = Object.assign({}, (s && s.lab) || {});
  out.letters = Object.assign({}, (s && s.letters) || {});
  out.endings = Object.assign({}, (s && s.endings) || {});
  return out;
}
function loadSave() {
  try { const raw = localStorage.getItem(SAVE_KEY); if (raw) return mergeSave(JSON.parse(raw)); } catch (e) { /* blocked */ }
  return null;
}
let save = defaultSave();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } }

// ------------------------------------------------------------------ icons (line art)
const ICON_PATHS = {
  sabre: '<path d="M5 19 19 5M16 4l4 4M7 15l2 2M4.5 15.5c-1.5 1.5-1.5 3 0 4"/>',
  pistol: '<path d="M3 8h13l2-2h3v4h-4l-1.5 2H12l-1.5 6H6.5L8 12H3z"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  flask: '<path d="M9 3h6M10 3v5l-5 9.5A2 2 0 0 0 6.8 21h10.4a2 2 0 0 0 1.8-3.5L14 8V3M7.5 15h9"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  coin: '<circle cx="12" cy="12" r="8"/><path d="M12 7v10M9 9.5h4.5a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3H15"/>',
  letter: '<rect x="3" y="6" width="18" height="12" rx="1"/><path d="m3 7 9 6 9-6"/><circle cx="12" cy="14" r="1.6"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.1"/><circle cx="15" cy="15" r="1.1"/><circle cx="12" cy="12" r="1.1"/>',
  hourglass: '<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9"/>',
  skull: '<path d="M12 3a7 7 0 0 0-7 7v3l2 2v3h10v-3l2-2v-3a7 7 0 0 0-7-7z"/><circle cx="9" cy="11" r="1.5"/><circle cx="15" cy="11" r="1.5"/><path d="M10 18v2M14 18v2"/>',
  spark: '<path d="M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5 19 19M19 5l-3.5 3.5M8.5 15.5 5 19"/>',
  coat: '<path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6z"/>',
  boot: '<path d="M8 3v10l-4 4v3h14l2-3-6-2V3z"/>',
  drop: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
};
const BOON_ICON = { keen: 'sabre', reach: 'sabre', riposte: 'sabre', whirl: 'sabre', bleed: 'drop', rifled: 'pistol', quick: 'pistol', double: 'pistol', grape: 'pistol', silver: 'pistol', capacitor: 'bolt', arc: 'bolt', stormcoat: 'bolt', voltaic: 'bolt', constitution: 'heart', greatcoat: 'coat', fleet: 'boot', leech: 'drop', spark: 'eye', fire: 'eye', heart: 'eye', stitch: 'eye' };
const svgIcon = (name, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
const iconImages = {};
function iconImage(name, color) {
  const key = name + color;
  if (!iconImages[key]) {
    const img = new Image();
    img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name]}</svg>`);
    iconImages[key] = img;
  }
  return iconImages[key];
}

// ------------------------------------------------------------------ renderer and scene
const app = $('app');
const canvas = $('scene');
const overlay = $('overlay');
const octx = overlay.getContext('2d');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, LOW ? 1.5 : 2));
renderer.shadowMap.enabled = !LOW;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0b0e14');
scene.fog = new THREE.FogExp2('#0b0e14', 0.03);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 300);

const hemi = new THREE.HemisphereLight(0x3a4a6a, 0x1a1410, 0.8);
scene.add(hemi);
const moon = new THREE.DirectionalLight(0x8fa8d8, 1.6);
moon.position.set(-7, 16, 9);
moon.target.position.set(0, 0, 0);
moon.castShadow = !LOW;
moon.shadow.mapSize.set(2048, 2048);
moon.shadow.camera.left = -20; moon.shadow.camera.right = 20; moon.shadow.camera.top = 18; moon.shadow.camera.bottom = -18;
moon.shadow.camera.near = 1; moon.shadow.camera.far = 50;
moon.shadow.bias = -0.0006;
moon.shadow.normalBias = 0.03;
scene.add(moon, moon.target);
// A fixed set of point lights so shaders never recompile: player, 4 room lamps, a flash light and a glow light.
const mkLight = (color) => { const l = new THREE.PointLight(color, 0, 10, 1.3); scene.add(l); return l; };
const playerLight = mkLight(0xffc890);
const lampLights = [mkLight(0xffb35a), mkLight(0xffb35a), mkLight(0xffb35a), mkLight(0xffb35a)];
const flashLight = mkLight(0xfff2d0);
const glowLight = mkLight(0x8fe9ff);
let flashT = 0, flashPower = 0;
function flash(x, z, power, color = 0xfff2d0, y = 1.4) {
  flashLight.position.set(x, y, z);
  flashLight.color.set(color);
  flashPower = power;
  flashT = 1;
}

const ATMOS = {
  graveyard: { bg: '#0b0e14', fog: 0.032, sky: '#3a4a6a', ground: '#1a1410', hemi: 1.2, moon: '#9fb4e0', moonI: 2.1, weather: 'rain', lightning: true, amb: 'rain' },
  glacier: { bg: '#1a2232', fog: 0.026, sky: '#6a7c9a', ground: '#2a2c34', hemi: 1.05, moon: '#b8c8e8', moonI: 1.7, weather: 'snow', lightning: false, amb: 'wind' },
  lab: { bg: '#0c0a0a', fog: 0.03, sky: '#3a3032', ground: '#140e0c', hemi: 0.95, moon: '#8a9cc0', moonI: 1.3, weather: 'none', lightning: true, amb: 'room' },
  ice: { bg: '#05080f', fog: 0.028, sky: '#3a5070', ground: '#101826', hemi: 1.0, moon: '#9ab8e0', moonI: 1.6, weather: 'snow', lightning: false, amb: 'wind' },
};
let atmos = ATMOS.graveyard;
let hemiBase = 0.75;
function applyAtmos(biome) {
  atmos = ATMOS[biome];
  scene.background.set(atmos.bg);
  scene.fog.color.set(atmos.bg);
  scene.fog.density = atmos.fog;
  hemi.color.set(atmos.sky);
  hemi.groundColor.set(atmos.ground);
  hemiBase = atmos.hemi * (LOW ? 1.4 : 1);
  hemi.intensity = hemiBase;
  moon.color.set(atmos.moon);
  moon.intensity = atmos.moonI;
  sound.setAmbient(atmos.amb);
}

// ------------------------------------------------------------------ pools
const matVox = new THREE.MeshLambertMaterial({ vertexColors: true });
const matGlow = new THREE.MeshBasicMaterial({ vertexColors: true });
class Pool {
  constructor(geo, mat, cap, colored = false) {
    const m = new THREE.InstancedMesh(geo, mat, cap);
    m.frustumCulled = false;
    m.count = 0;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (colored) {
      this.c = new Float32Array(cap * 3).fill(1);
      m.instanceColor = new THREE.InstancedBufferAttribute(this.c, 3);
      m.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }
    this.m = m; this.a = m.instanceMatrix.array; this.cap = cap; this.n = 0;
    scene.add(m);
  }
  begin() { this.n = 0; }
  add(x, y, z, ry, sx, sy, sz) {
    if (this.n >= this.cap) return -1;
    const i = this.n++, o = i * 16, a = this.a, c = Math.cos(ry), s = Math.sin(ry);
    a[o] = c * sx; a[o + 1] = 0; a[o + 2] = -s * sx; a[o + 3] = 0;
    a[o + 4] = 0; a[o + 5] = sy; a[o + 6] = 0; a[o + 7] = 0;
    a[o + 8] = s * sz; a[o + 9] = 0; a[o + 10] = c * sz; a[o + 11] = 0;
    a[o + 12] = x; a[o + 13] = y; a[o + 14] = z; a[o + 15] = 1;
    return i;
  }
  addM(m4) { if (this.n >= this.cap) return -1; const i = this.n++; m4.toArray(this.a, i * 16); return i; }
  tint(i, r, g, b) { if (i < 0 || !this.c) return; const o = i * 3; this.c[o] = r; this.c[o + 1] = g; this.c[o + 2] = b; }
  end() { this.m.count = this.n; this.m.instanceMatrix.needsUpdate = true; if (this.c) this.m.instanceColor.needsUpdate = true; }
}
const rgbOf = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const cube = VX.cubeGeometry ? VX.cubeGeometry() : new VX.VoxBuilder().box(-0.5, -0.5, -0.5, 1, 1, 1, '#ffffff').build(1);
const partPool = new Pool(cube, matVox, LOW ? 700 : 1400, true);
const glowPool = new Pool(cube, matGlow, 900, true);
const decalPool = new Pool(new VX.VoxBuilder().top(-0.5, -0.5, 1, 1, 0, '#ffffff').build(1), matVox, 300, true);
const rainMat = new THREE.MeshBasicMaterial({ color: 0x9fb4d0, transparent: true, opacity: 0.32, depthWrite: false });
const rainPool = new Pool(cube, rainMat, 420);
const snowPool = new Pool(cube, matGlow, 360, true);
const tracerPool = new Pool(cube, matGlow, 60, true);

const BLOOD = ['#7a1010', '#5a0a0a', '#8e1a14'].map(rgbOf);
const DUST = ['#5a5248', '#4a443c', '#6a6258'].map(rgbOf);
const SPARK = ['#bff4ff', '#ffffff', '#7cf0ff'].map(rgbOf);
const FIRE = ['#ffb35a', '#ff7a2a', '#ffd88a'].map(rgbOf);
const ICE = ['#cfe6ff', '#9fc8f0', '#ffffff'].map(rgbOf);
const SMOKE = ['#8a8a92', '#6e6e76', '#a0a0a8'].map(rgbOf);
const GOLD = ['#e8c35a', '#ffe08a', '#b8954a'].map(rgbOf);
const ICHOR = ['#4a5a3a', '#3a4a2e', '#6a7a4a'].map(rgbOf);

let particles = [], glows = [], decals = [];
function burst(x, y, z, palette, n, speed, size, glow = false, up = 4, grav = null) {
  const list = glow ? glows : particles;
  const cap = glow ? glowPool.cap - 60 : partPool.cap;
  for (let i = 0; i < n; i++) {
    if (list.length >= cap) return;
    const a = Math.random() * TAU, s = speed * rand(0.35, 1);
    const life = rand(0.35, 0.8);
    list.push({
      x, y, z, vx: Math.cos(a) * s, vy: rand(0.3, 1) * up, vz: Math.sin(a) * s, life, max: life,
      s: size * rand(0.7, 1.3), c: palette[(Math.random() * palette.length) | 0], rx: Math.random() * TAU, ry: Math.random() * TAU,
      vr: rand(-9, 9), grav: grav !== null ? grav : glow ? 3 : 16,
    });
  }
}
function directed(x, y, z, dx, dz, palette, n, speed, size, spread = 0.6) {
  for (let i = 0; i < n; i++) {
    if (particles.length >= partPool.cap) return;
    const a = Math.atan2(dz, dx) + rand(-spread, spread), s = speed * rand(0.4, 1);
    const life = rand(0.3, 0.7);
    particles.push({ x, y, z, vx: Math.cos(a) * s, vy: rand(1, 4), vz: Math.sin(a) * s, life, max: life, s: size * rand(0.7, 1.3), c: palette[(Math.random() * palette.length) | 0], rx: 0, ry: Math.random() * TAU, vr: rand(-9, 9), grav: 16, splat: palette === BLOOD });
  }
}
function splat(x, z, s, c) {
  if (decals.length >= decalPool.cap) decals.shift();
  decals.push({ x, z, s, r: Math.random() * TAU, c });
}

// ------------------------------------------------------------------ telegraphs, hazards, novas
const ringGeo = new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2);
const discGeo = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2);
const rectGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5);
const sectorCache = {};
function sectorGeo(arcDeg) {
  const k = Math.round(arcDeg);
  if (!sectorCache[k]) {
    const a = (k * Math.PI) / 180;
    sectorCache[k] = new THREE.CircleGeometry(1, 28, -Math.PI / 2 - a / 2, a).rotateX(-Math.PI / 2);
  }
  return sectorCache[k];
}
const fxFree = [];
function fxMesh(geo, color, opacity, order = 2) {
  const m = fxFree.pop() || new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
  m.geometry = geo;
  m.material.color.set(color);
  m.material.opacity = opacity;
  m.material.blending = THREE.NormalBlending;
  m.renderOrder = order;
  m.visible = true;
  m.rotation.set(0, 0, 0);
  m.scale.set(1, 1, 1);
  scene.add(m);
  return m;
}
function freeMesh(m) { scene.remove(m); m.visible = false; fxFree.push(m); }

let telegraphs = [];
function telegraph(kind, o) {
  const t = { kind, x: o.x, z: o.z, rot: o.rot || 0, r: o.r || 1, len: o.len || 1, w: o.w || 1, arc: o.arc || 90, life: o.life, max: o.life, color: o.color || '#d0202a', owner: o.owner || null, meshes: [] };
  if (kind === 'circle') {
    t.meshes.push(fxMesh(ringGeo, t.color, 0.85), fxMesh(discGeo, t.color, 0.28));
  } else if (kind === 'sector') {
    t.meshes.push(fxMesh(sectorGeo(t.arc), t.color, 0.12), fxMesh(sectorGeo(t.arc), t.color, 0.3));
  } else {
    t.meshes.push(fxMesh(rectGeo, t.color, 0.12), fxMesh(rectGeo, t.color, 0.32));
  }
  telegraphs.push(t);
  return t;
}
function updateTelegraphs(dt) {
  for (let i = telegraphs.length - 1; i >= 0; i--) {
    const t = telegraphs[i];
    t.life -= dt;
    if (t.life <= 0 || (t.owner && t.owner.dead)) { t.meshes.forEach(freeMesh); telegraphs.splice(i, 1); continue; }
    const k = clamp(1 - t.life / t.max, 0, 1);
    const [a, b] = t.meshes;
    const y = 0.04;
    if (t.kind === 'circle') {
      a.position.set(t.x, y, t.z); a.scale.set(t.r, 1, t.r);
      b.position.set(t.x, y + 0.005, t.z); b.scale.set(t.r * k, 1, t.r * k);
    } else if (t.kind === 'sector') {
      a.position.set(t.x, y, t.z); a.rotation.y = t.rot; a.scale.set(t.r, 1, t.r);
      b.position.set(t.x, y + 0.005, t.z); b.rotation.y = t.rot; b.scale.set(t.r * k, 1, t.r * k);
    } else {
      a.position.set(t.x, y, t.z); a.rotation.y = t.rot; a.scale.set(t.w, 1, t.len);
      b.position.set(t.x, y + 0.005, t.z); b.rotation.y = t.rot; b.scale.set(t.w, 1, t.len * k);
    }
  }
}
function clearTelegraphs() { telegraphs.forEach((t) => t.meshes.forEach(freeMesh)); telegraphs = []; }

// Slash trails.
const trailCache = {};
function trailGeo(arcDeg, reach) {
  const key = `${Math.round(arcDeg)}-${reach.toFixed(1)}`;
  if (!trailCache[key]) {
    const a = (arcDeg * Math.PI) / 180;
    trailCache[key] = new THREE.RingGeometry(reach * 0.35, reach, 32, 1, -Math.PI / 2 - a / 2, a).rotateX(-Math.PI / 2);
  }
  return trailCache[key];
}
let trails = [];
function slashTrail(x, z, rot, arc, reach, color = '#e8f0ff', life = 0.14) {
  const m = fxMesh(trailGeo(arc, reach), color, 0.6, 3);
  m.material.blending = THREE.AdditiveBlending;
  m.position.set(x, 0.9, z);
  m.rotation.y = rot;
  trails.push({ m, life, max: life });
}
function updateTrails(dt) {
  for (let i = trails.length - 1; i >= 0; i--) {
    const t = trails[i];
    t.life -= dt;
    if (t.life <= 0) { freeMesh(t.m); trails.splice(i, 1); continue; }
    const k = t.life / t.max;
    t.m.material.opacity = (t.grow ? 0.9 : 0.6) * k;
    if (t.grow) { const r = t.grow * (0.25 + 0.75 * (1 - k)); t.m.scale.set(r, 1, r); }
  }
}

const HAZ = { fire: { color: '#ff7a2a', dmg: 5, palette: FIRE }, spark: { color: '#7cf0ff', dmg: 5, palette: SPARK }, ice: { color: '#9fc8f0', dmg: 3, palette: ICE, slow: true }, storm: { color: '#bff4ff', dmg: 10, palette: SPARK, friendly: true } };
let hazards = [];
function hazard(kind, x, z, r, life) {
  const H = HAZ[kind];
  const m = fxMesh(discGeo, H.color, 0.32, 1);
  m.material.blending = THREE.AdditiveBlending;
  m.position.set(x, 0.03, z);
  m.scale.set(r, 1, r);
  hazards.push({ kind, x, z, r, life, max: life, tick: 0, m });
}
let novas = [];
function nova(x, z, speed, maxR, dmg, color = '#ff4a5a') {
  const m = fxMesh(ringGeo, color, 0.9, 2);
  m.material.blending = THREE.AdditiveBlending;
  m.position.set(x, 0.12, z);
  novas.push({ x, z, r: 0.5, speed, maxR, dmg, m, hit: false });
}

// ------------------------------------------------------------------ actors
const rigCache = {};
const ACTOR_SCALE = { victor: 1, shambler: 1, robber: 1, acolyte: 1, brute: 1, sexton: 1, creature: 1, unfinished: 1, hound: 1 };
function makeActor(kind, tint) {
  const rig = rigCache[kind] || (rigCache[kind] = VX.buildRig(kind));
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  if (tint) mat.color.set(tint);
  const group = new THREE.Group();
  const root = new THREE.Group();
  group.add(root);
  const mk = (geo, x, y, z, parent = root) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  const a = { kind, group, root, mat, rig, quad: !!rig.quad };
  if (rig.quad) {
    a.body = mk(rig.body, 0, 0, 0);
    a.head = mk(rig.head, ...rig.headPos);
    a.legs = rig.legs.map(([x, y, z]) => mk(rig.leg, x, y, z));
    a.tail = mk(rig.tail, ...rig.tailPos);
  } else {
    a.body = mk(rig.body, 0, 0, 0);
    a.head = mk(rig.head, 0, rig.headY, 0);
    a.legL = mk(rig.legL, -rig.legX, rig.hipY, 0);
    a.legR = mk(rig.legR, rig.legX, rig.hipY, 0);
    a.armL = mk(rig.arm, -rig.shoulderX, rig.shoulderY, 0);
    a.armR = mk(rig.arm, rig.shoulderX, rig.shoulderY, 0);
    a.armL.rotation.order = 'YXZ';
    a.armR.rotation.order = 'YXZ';
    if (rig.itemR) a.itemR = mk(rig.itemR, 0, -rig.armLen, 0, a.armR);
    if (rig.itemL) a.itemL = mk(rig.itemL, 0, -rig.armLen, 0, a.armL);
  }
  group.scale.setScalar(ACTOR_SCALE[kind] || 1);
  scene.add(group);
  return a;
}
function disposeActor(a) {
  scene.remove(a.group);
  a.mat.dispose();
}
// Pose: walk cycle, arm angles (pitch: negative raises forward; yaw: sweep), lean, crouch.
function pose(a, o) {
  a.group.position.set(o.x, o.y || 0, o.z);
  a.group.rotation.y = o.face;
  const t = o.walk || 0, mv = o.moving ? 1 : 0;
  if (a.quad) {
    const s = Math.sin(t * 1.6) * mv;
    a.legs[0].rotation.x = s * 0.8; a.legs[3].rotation.x = s * 0.8;
    a.legs[1].rotation.x = -s * 0.8; a.legs[2].rotation.x = -s * 0.8;
    a.root.position.y = Math.abs(Math.sin(t * 1.6)) * 0.06 * mv;
    a.root.rotation.x = o.lean || 0;
    a.tail.rotation.x = 0.3 + Math.sin(t * 3) * 0.2;
    a.head.rotation.x = o.headPitch || 0;
  } else {
    const s = Math.sin(t) * mv;
    a.legL.rotation.x = s * 0.7; a.legR.rotation.x = -s * 0.7;
    a.armL.rotation.x = o.armLx !== undefined ? o.armLx : -s * 0.5;
    a.armR.rotation.x = o.armRx !== undefined ? o.armRx : s * 0.5;
    a.armL.rotation.y = o.armLy || 0;
    a.armR.rotation.y = o.armRy || 0;
    a.armL.rotation.z = o.armLz || 0;
    a.armR.rotation.z = o.armRz || 0;
    a.root.position.y = Math.abs(Math.sin(t)) * 0.05 * mv + (o.bob || 0);
    a.root.rotation.x = o.lean || 0;
    a.root.rotation.y = o.twist || 0;
    a.root.rotation.z = o.roll || 0;
    const hs = save.codes.bighead ? 1.8 : 1;
    a.head.scale.set(hs, hs, hs);
  }
  const sq = o.squash || 0;
  a.root.scale.set(1 + sq * 0.12, 1 - sq * 0.16, 1 + sq * 0.12);
  const f = o.flash || 0, tell = o.tell || 0;
  a.mat.emissive.setRGB(f + tell * 0.55, f + tell * 0.04, f + tell * 0.04);
}

// ------------------------------------------------------------------ rooms
let room = null;
const roomMesh = new THREE.Mesh(new THREE.BufferGeometry(), matVox);
roomMesh.castShadow = true;
roomMesh.receiveShadow = true;
scene.add(roomMesh);
const gateGeo = VX.gateGeometry();
let gates = [];
function buildRoomScene(opt) {
  const r = VX.buildRoom(opt);
  if (room && room.geo) room.geo.dispose();
  roomMesh.geometry = r.geo;
  gates.forEach((g) => scene.remove(g.m));
  gates = r.doors.map((d) => {
    const m = new THREE.Mesh(gateGeo, matVox);
    m.position.set(d.x, 0, d.z);
    m.castShadow = true;
    scene.add(m);
    return { x: d.x, z: d.z, m, open: 0, opening: false, reward: null };
  });
  lampLights.forEach((l, i) => {
    const L = r.lights[i];
    l.userData.on = !!L;
    if (L) { l.position.set(L.x, L.y + 0.2, L.z); l.color.set(opt.biome === 'lab' ? 0xffcf7a : 0xffb35a); }
    l.intensity = 0;
  });
  moon.shadow.camera.left = -r.W / 2 - 3; moon.shadow.camera.right = r.W / 2 + 3;
  moon.shadow.camera.top = r.D / 2 + 4; moon.shadow.camera.bottom = -r.D / 2 - 4;
  moon.shadow.camera.updateProjectionMatrix();
  moon.shadow.needsUpdate = true;
  room = r;
  room.biome = opt.biome;
  room.kind = opt.kind;
  return r;
}

// ------------------------------------------------------------------ audio
const sound = new Sound();
const sfx = (n) => sound.play(n);

// ------------------------------------------------------------------ state
let state = 'menu';
let screen = 'title';
let tale = null;
let run = null;
let P = null;
let S = {};
let enemies = [], bullets = [], thrown = [], pickups = [], numbers = [], beams = [];
let time = 0, hitStop = 0, shakeAmt = 0, timeScale = 1;
let fadeT = 0, fadeDir = 0, fadeCb = null;
const diff = () => DIFFICULTIES.find((d) => d.id === save.diff) || DIFFICULTIES[1];
const lv = (id) => (run && run.build.boons[id]) || 0;
const has = (id) => lv(id) > 0;

function freshBuild() { return { boons: {}, tonics: BASE.tonics, extraTonic: 0 }; }
function newTale(startAct = 0) {
  const t = { act: startAct, years: START_YEARS, build: freshBuild(), flags: {}, deaths: 0, letters: [], log: [], finished: false, letterIdx: 0 };
  // Starting later (via the University Key) grants a modest build for the acts skipped.
  for (let i = 0; i < startAct * 3; i++) {
    const b = pick(BOONS.filter((x) => x.rarity === 'common' && (t.build.boons[x.id] || 0) < x.max));
    t.build.boons[b.id] = (t.build.boons[b.id] || 0) + 1;
  }
  return t;
}
function addYears(n, text) {
  if (!tale || !n) return;
  tale.years += n;
  tale.log.push({ act: run ? run.act : tale.act, text, years: n });
  persist();
  const el = $('years-chip');
  if (el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
}

function computeStats() {
  const lab = save.lab;
  const heart = lv('heart') ? 1.35 : 1;
  const oldMax = S.maxHp || 0;
  S.maxHp = BASE.hp + 20 * lv('constitution') + 50 * lv('stitch') + 10 * (lab.vigour || 0);
  S.speed = BASE.speed * (1 + 0.08 * lv('fleet'));
  S.dodgeRecharge = BASE.dodgeRecharge * (1 - 0.2 * lv('fleet'));
  S.sabreMul = (1 + 0.2 * lv('keen')) * (1 + 0.08 * (lab.fencing || 0)) * heart;
  S.reach = BASE.sabreReach * (1 + 0.18 * lv('reach'));
  S.arcAdd = 18 * lv('reach');
  S.pistolMul = (1 + 0.3 * lv('rifled')) * (1 + 0.1 * (lab.marksman || 0)) * heart;
  S.reload = BASE.reload * (1 - 0.28 * lv('quick'));
  S.ammo = lv('double') ? 2 : 1;
  S.galMul = (1 + 0.25 * lv('capacitor')) * (1 + 0.1 * (lab.jar || 0)) * (lv('fire') ? 2 : 1);
  S.chain = BASE.chain + 3 * lv('arc');
  S.dischargeMul = (1 + 0.2 * lv('arc')) * heart;
  S.armor = 0.12 * lv('greatcoat');
  S.maxTonics = BASE.maxTonics + (run.build.extraTonic || 0);
  if (P && oldMax && S.maxHp > oldMax) P.hp += S.maxHp - oldMax;
}

// ------------------------------------------------------------------ input
const keys = new Set();
const mouse = { x: 0, y: 0, left: false, right: false, seen: false };
const pressed = { attack: false, fire: false, dodge: false, special: false, tonic: false, reload: false, interact: false };
const touchJoy = { id: -1, active: false, ox: 0, oy: 0, vx: 0, vy: 0 };
let aimMode = isTouch ? 'auto' : 'mouse';
const pad = { ax: 0, ay: 0, rx: 0, ry: 0, prev: [], attackHeld: false };
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.9);
const aimHit = new THREE.Vector3();

function pollPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  pad.ax = pad.ay = pad.rx = pad.ry = 0;
  pad.attackHeld = false;
  for (const gp of pads) {
    if (!gp) continue;
    const dz = (v) => (Math.abs(v) > 0.18 ? v : 0);
    pad.ax = dz(gp.axes[0] || 0); pad.ay = dz(gp.axes[1] || 0);
    pad.rx = dz(gp.axes[2] || 0); pad.ry = dz(gp.axes[3] || 0);
    const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
    const edge = (i) => b(i) && !pad.prev[i];
    if (edge(2)) pressed.attack = true;
    if (edge(7) || edge(5)) pressed.fire = true;
    if (edge(0)) pressed.dodge = true;
    if (edge(4) || edge(6)) pressed.special = true;
    if (edge(3)) pressed.tonic = true;
    if (edge(1)) pressed.interact = true;
    if (edge(9)) togglePause();
    pad.attackHeld = b(2);
    if (Math.hypot(pad.rx, pad.ry) > 0.3 || Math.hypot(pad.ax, pad.ay) > 0.3) aimMode = 'pad';
    for (let i = 0; i < 17; i++) pad.prev[i] = b(i);
  }
}
function moveInput() {
  if (window.__bot) return window.__bot.move(P, enemies);
  let ix = 0, iz = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) iz -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) iz += 1;
  if (touchJoy.active) { ix += touchJoy.vx; iz += touchJoy.vy; }
  ix += pad.ax; iz += pad.ay;
  const l = Math.hypot(ix, iz);
  if (l > 1) { ix /= l; iz /= l; }
  return [ix, iz];
}
function nearestEnemy(x, z, maxR, cone = null, face = 0) {
  let best = null, bd = maxR;
  for (const e of enemies) {
    if (e.dead || e.state === 'spawn' || e.airborne || e.state === 'yield') continue;
    const dx = e.x - x, dz = e.z - z, d = Math.hypot(dx, dz);
    if (d >= bd) continue;
    if (cone && Math.abs(angDiff(Math.atan2(dx, dz), face)) > cone) continue;
    bd = d; best = e;
  }
  return best;
}
function aimAngle() {
  if (window.__bot) return window.__bot.aim(P, enemies);
  if (aimMode === 'mouse' && mouse.seen) {
    ndc.set((mouse.x / W) * 2 - 1, -(mouse.y / H) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.ray.intersectPlane(aimPlane, aimHit)) return Math.atan2(aimHit.x - P.x, aimHit.z - P.z);
  }
  if (aimMode === 'pad' && Math.hypot(pad.rx, pad.ry) > 0.3) return Math.atan2(pad.rx, pad.ry);
  const moveFace = Math.hypot(P.vx, P.vz) > 0.5 ? Math.atan2(P.vx, P.vz) : P.face;
  const t = nearestEnemy(P.x, P.z, 9, 1.4, moveFace) || nearestEnemy(P.x, P.z, 6);
  return t ? Math.atan2(t.x - P.x, t.z - P.z) : moveFace;
}

// ------------------------------------------------------------------ player
function spawnPlayer() {
  if (P && P.actor) disposeActor(P.actor);
  P = {
    x: 0, z: 0, vx: 0, vz: 0, face: Math.PI, aim: Math.PI, hp: S.maxHp, tonics: 0, gal: 0, dodges: BASE.dodges, dodgeRegen: 0,
    dodgeT: 0, dodgeX: 0, dodgeZ: 0, iframes: 0, lastDodgeEnd: -9, swing: null, combo: 0, comboWindow: 0, atkBuffer: 0,
    ammo: S.ammo, reloadT: 0, drinkT: 0, flash: 0, walk: 0, moving: false, gunT: 0, slowT: 0, dead: false, r: 0.42, actor: makeActor('victor'),
  };
}

function tryDodge(ix, iz) {
  if (P.dodges <= 0 || P.dodgeT > 0 || P.drinkT > 0) return;
  let dx = ix, dz = iz;
  if (Math.hypot(dx, dz) < 0.15) { dx = Math.sin(P.face); dz = Math.cos(P.face); }
  const l = Math.hypot(dx, dz);
  P.dodgeX = dx / l; P.dodgeZ = dz / l;
  P.dodges--;
  P.dodgeT = BASE.dodgeTime;
  P.iframes = Math.max(P.iframes, BASE.dodgeIframes);
  P.lastDodgeEnd = time + BASE.dodgeTime;
  P.swing = null;
  sfx('dodge');
  burst(P.x, 0.2, P.z, DUST, 8, 3, 0.12, false, 2);
  if (has('stormcoat')) hazard('storm', P.x, P.z, 1.8, 1.6);
}
function startSwing() {
  const i = P.comboWindow > 0 ? P.combo % 3 : 0;
  const heavy = i === 2;
  P.combo = i + 1;
  P.comboWindow = 0;
  P.atkBuffer = 0;
  P.aim = aimAngle();
  P.face = P.aim;
  const arc = heavy && has('whirl') ? 360 : BASE.sabreArc[i] + S.arcAdd;
  P.swing = { i, t: 0, dur: BASE.swingTime[i], hitT: BASE.swingTime[i] * 0.38, done: false, arc, reach: S.reach * (heavy ? 1.12 : 1), dmg: BASE.sabre[i], dir: P.aim };
  P.vx += Math.sin(P.aim) * (heavy ? 6 : 4);
  P.vz += Math.cos(P.aim) * (heavy ? 6 : 4);
  sfx(heavy ? 'slashHeavy' : 'slash');
}
function resolveSwing(s) {
  const riposte = has('riposte') && time - P.lastDodgeEnd < 1.0;
  let hits = 0;
  const struck = [];
  for (const e of enemies) {
    if (e.dead || e.state === 'spawn' || e.airborne || e.state === 'yield') continue;
    const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz) || 0.01;
    if (d > s.reach + e.r) continue;
    if (s.arc < 360 && Math.abs(angDiff(Math.atan2(dx, dz), s.dir)) > (s.arc / 2) * (Math.PI / 180) + Math.atan2(e.r, d)) continue;
    const dmg = s.dmg * S.sabreMul * (riposte ? 2 : 1);
    hitEnemy(e, dmg, dx / d, dz / d, s.i === 2 ? 7 : 3.2, { heavy: s.i === 2, crit: riposte });
    if (has('bleed')) e.bleed = { t: 3, dps: (14 * lv('bleed')) / 3, tick: 0 };
    hits++;
    struck.push(e);
  }
  slashTrail(P.x, P.z, s.dir, Math.min(s.arc, 300), s.reach, riposte ? '#ffd88a' : '#e8f0ff');
  if (hits) {
    hitStop = Math.max(hitStop, s.i === 2 ? 0.08 : 0.045);
    shake(s.i === 2 ? 0.28 : 0.12);
    gainGal(BASE.galPerHit * hits);
    if (riposte) { sfx('crit'); numbers.push({ x: P.x, y: 2.4, z: P.z, text: 'Riposte', t: 0, life: 0.8, color: '#ffd88a', big: true }); }
  }
  if (s.i === 2 && has('voltaic')) {
    const src = struck[0] || P;
    const near = enemies.filter((e) => !e.dead && e.state !== 'spawn' && Math.hypot(e.x - src.x, e.z - src.z) < 5).slice(0, 3);
    for (const e of near) { beam(src.x, src.z, e.x, e.z); hitEnemy(e, 12, 0, 0, 0, { zap: true }); }
    if (near.length) sfx('spark');
  }
}
function tryFire() {
  if (P.dodgeT > 0 || P.drinkT > 0 || P.dead) return;
  if (P.reloadT > 0) { sfx('empty'); return; }
  if (P.ammo <= 0) { startReload(); return; }
  P.ammo--;
  P.gunT = 0.4;
  P.aim = aimAngle();
  P.face = P.aim;
  const pellets = has('grape') ? 5 : 1;
  for (let i = 0; i < pellets; i++) {
    const a = P.aim + (pellets > 1 ? (i - (pellets - 1) / 2) * 0.12 : 0);
    bullets.push({
      x: P.x + Math.sin(a) * 0.7, z: P.z + Math.cos(a) * 0.7, vx: Math.sin(a) * BASE.bulletSpeed, vz: Math.cos(a) * BASE.bulletSpeed,
      dmg: BASE.pistolDmg * S.pistolMul * (pellets > 1 ? 0.45 : 1), pierce: has('silver') ? 99 : 0, life: 0.55, hit: [],
    });
  }
  const mx = P.x + Math.sin(P.aim) * 1.0, mz = P.z + Math.cos(P.aim) * 1.0;
  flash(mx, mz, 9, 0xffd8a0);
  burst(mx, 1.1, mz, FIRE, 8, 4, 0.08, true, 1, 0);
  burst(mx, 1.1, mz, SMOKE, 6, 1.2, 0.22, false, 1.2, -1);
  P.vx -= Math.sin(P.aim) * 3.5;
  P.vz -= Math.cos(P.aim) * 3.5;
  shake(0.18);
  sfx('gunshot');
  if (P.ammo <= 0) setTimeout(() => { if (P && P.ammo <= 0) startReload(); }, 120);
}
function startReload() {
  if (!P || P.reloadT > 0 || P.ammo >= S.ammo) return;
  P.reloadT = S.reload;
  sfx('reload');
}
function gainGal(v) { if (P) P.gal = Math.min(100, P.gal + v * S.galMul); }
function tryDischarge() {
  if (!P || P.dead || P.drinkT > 0) return;
  if (P.gal < 100 && !save.codes.galvani) { sfx('empty'); return; }
  P.gal = 0;
  const targets = enemies.filter((e) => !e.dead && e.state !== 'spawn' && !e.airborne && Math.hypot(e.x - P.x, e.z - P.z) < 11)
    .sort((a, b) => Math.hypot(a.x - P.x, a.z - P.z) - Math.hypot(b.x - P.x, b.z - P.z)).slice(0, S.chain);
  let sx = P.x, sz = P.z;
  for (const e of targets) {
    beam(sx, sz, e.x, e.z, true);
    hitEnemy(e, BASE.discharge * S.dischargeMul, 0, 0, 0, { stun: e.boss ? 0.5 : 1.4, zap: true });
    if (has('fire')) e.burn = { t: 4, dps: 8, tick: 0 };
    burst(e.x, 1, e.z, SPARK, 10, 5, 0.1, true, 4);
    sx = e.x; sz = e.z;
  }
  flash(P.x, P.z, 26, 0x9fe8ff, 2.4);
  burst(P.x, 1, P.z, SPARK, 30, 8, 0.12, true, 6);
  shake(0.5);
  hitStop = Math.max(hitStop, 0.08);
  screenFlash('rgba(160,230,255,0.35)');
  sfx('galvanic');
}
function beam(ax, az, bx, bz, big = false) {
  const mx = (ax + bx) / 2 + rand(-0.5, 0.5), mz = (az + bz) / 2 + rand(-0.5, 0.5);
  beams.push({ ax, az, bx: mx, bz: mz, life: 0.22, w: big ? 0.16 : 0.09 });
  beams.push({ ax: mx, az: mz, bx, bz, life: 0.22, w: big ? 0.16 : 0.09 });
}
function tryTonic() {
  if (!P || P.tonics <= 0 || P.drinkT > 0 || P.hp >= S.maxHp || P.dead) return;
  P.tonics--;
  P.drinkT = 0.65;
  P.swing = null;
  sfx('tonic');
}

function updatePlayer(dt) {
  const [ix, iz] = P.dead ? [0, 0] : moveInput();
  P.iframes = Math.max(0, P.iframes - dt);
  P.flash = Math.max(0, P.flash - dt);
  P.gunT = Math.max(0, P.gunT - dt);
  P.slowT = Math.max(0, P.slowT - dt);
  if (P.dodges < BASE.dodges) { P.dodgeRegen += dt; if (P.dodgeRegen >= S.dodgeRecharge) { P.dodges++; P.dodgeRegen = 0; } }
  if (save.codes.galvani) P.gal = 100;
  if (!P.dead && run.room && !run.paused) {
    if (pressed.dodge) tryDodge(ix, iz);
    if (pressed.special) tryDischarge();
    const atTable = run.room.kind === 'chance' && Math.hypot(P.x, P.z + 1) < 2.6;
    if (pressed.tonic && !atTable) tryTonic();
    if (pressed.reload) startReload();
    if (pressed.fire) tryFire();
    if (pressed.attack) P.atkBuffer = 0.24;
    if ((mouse.left || pad.attackHeld || touchHold.attack || (window.__bot && window.__bot.attack)) && !P.swing) P.atkBuffer = Math.max(P.atkBuffer, 0.05);
  }
  P.atkBuffer -= dt;
  if (P.reloadT > 0) { P.reloadT -= dt; if (P.reloadT <= 0) P.ammo = S.ammo; }
  if (P.swing) {
    const s = P.swing;
    s.t += dt;
    if (!s.done && s.t >= s.hitT) { s.done = true; resolveSwing(s); }
    if (s.t >= s.dur) { P.swing = null; P.comboWindow = s.i < 2 ? 0.4 : 0; if (s.i === 2) P.combo = 0; }
  } else if (P.atkBuffer > 0 && P.dodgeT <= 0 && P.drinkT <= 0 && !P.dead) {
    startSwing();
  }
  if (P.comboWindow > 0) { P.comboWindow -= dt; if (P.comboWindow <= 0) P.combo = 0; }
  if (P.drinkT > 0) {
    P.drinkT -= dt;
    if (P.drinkT <= 0) { P.hp = Math.min(S.maxHp, P.hp + BASE.tonicHeal); sfx('healed'); burst(P.x, 1.2, P.z, [[0.9, 0.3, 0.3], [1, 0.6, 0.5]], 14, 2, 0.08, true, 3); }
  }
  let speed = S.speed * (P.slowT > 0 ? 0.55 : 1);
  if (P.swing) speed *= 0.3;
  if (P.drinkT > 0) speed *= 0.4;
  if (P.gunT > 0) speed *= 0.85;
  if (P.dodgeT > 0) {
    P.dodgeT -= dt;
    P.vx = P.dodgeX * BASE.dodgeSpeed; P.vz = P.dodgeZ * BASE.dodgeSpeed;
    if (Math.random() < 0.6) glows.push({ x: P.x + rand(-0.2, 0.2), y: rand(0.4, 1.6), z: P.z + rand(-0.2, 0.2), vx: 0, vy: 0, vz: 0, life: 0.22, max: 0.22, s: 0.12, c: [0.6, 0.7, 0.9], rx: 0, ry: 0, vr: 0, grav: 0 });
  } else {
    const k = Math.min(1, dt * 16);
    P.vx += (ix * speed - P.vx) * k;
    P.vz += (iz * speed - P.vz) * k;
  }
  P.x += P.vx * dt; P.z += P.vz * dt;
  collide(P, P.r);
  const sp = Math.hypot(P.vx, P.vz);
  P.moving = sp > 0.6;
  P.walk += dt * sp * 1.9;
  if (!P.swing && P.dodgeT <= 0) {
    const want = P.dead ? P.face : aimAngle();
    P.aim = want;
    P.face += angDiff(want, P.face) * Math.min(1, dt * 18);
  } else if (P.dodgeT > 0) {
    P.face = Math.atan2(P.dodgeX, P.dodgeZ);
  }
  if (P.moving && Math.random() < dt * 5) burst(P.x, 0.05, P.z, DUST, 1, 0.8, 0.08, false, 1);
  if (P.hp > 0 && P.hp < S.maxHp * 0.3 && !P.dead) sfx('heartbeat');
}

function collide(o, r) {
  if (!room) return;
  for (const b of room.obstacles) {
    if (o.x < b.x0 - r || o.x > b.x1 + r || o.z < b.z0 - r || o.z > b.z1 + r) continue;
    const cx = clamp(o.x, b.x0, b.x1), cz = clamp(o.z, b.z0, b.z1);
    const dx = o.x - cx, dz = o.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-8) { const d = Math.sqrt(d2); o.x = cx + (dx / d) * r; o.z = cz + (dz / d) * r; }
    else {
      const l = o.x - b.x0, rr = b.x1 - o.x, t = o.z - b.z0, bb = b.z1 - o.z, m = Math.min(l, rr, t, bb);
      if (m === l) o.x = b.x0 - r; else if (m === rr) o.x = b.x1 + r; else if (m === t) o.z = b.z0 - r; else o.z = b.z1 + r;
    }
  }
  const hw = room.W / 2 - r, hd = room.D / 2 - r;
  o.x = clamp(o.x, -hw, hw);
  o.z = clamp(o.z, -hd, hd);
}
function blockedAt(x, z, tallOnly = false) {
  for (const b of room.obstacles) if ((!tallOnly || b.tall) && x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1) return true;
  return false;
}

// ------------------------------------------------------------------ combat
function hitEnemy(e, dmg, dirx, dirz, knock, opt = {}) {
  if (e.dead || e.state === 'yield') return;
  dmg = Math.max(1, Math.round(dmg * rand(0.92, 1.08)));
  e.hp -= dmg;
  e.flash = 0.1;
  e.hpShow = 2.5;
  if (save.settings.numbers) numbers.push({ x: e.x + rand(-0.3, 0.3), y: (e.height || 1.8) + 0.3, z: e.z, text: String(dmg), t: 0, life: 0.7, color: opt.crit ? '#ffd88a' : opt.zap ? '#bff4ff' : '#f2ece0', big: opt.heavy || opt.crit });
  const pal = e.def.model === 'shambler' || e.def.model === 'brute' || e.def.model === 'unfinished' ? ICHOR : BLOOD;
  if (dirx || dirz) directed(e.x, 1.1, e.z, dirx, dirz, pal, opt.heavy ? 10 : 6, 6, 0.1);
  else burst(e.x, 1.1, e.z, pal, 5, 3, 0.09);
  if (!e.boss && !e.def.poise) {
    e.kx += dirx * knock; e.kz += dirz * knock;
    if ((opt.heavy || opt.gun || opt.stun) && (e.state === 'windup' || e.state === 'move')) { e.state = 'stagger'; e.t = opt.stun || 0.45; dropTelegraph(e); }
  } else if (opt.stun && e.boss && e.state === 'move') { e.state = 'stagger'; e.t = opt.stun; }
  if (opt.stun && !e.boss && !e.def.poise) { e.state = 'stagger'; e.t = opt.stun; dropTelegraph(e); }
  sfx('hit');
  if (e.hp <= 0) killEnemy(e);
  else if (e.boss) checkBossPhase(e);
}
function dropTelegraph(e) {
  if (e.tg) { e.tg.life = 0; e.tg = null; }
}
function killEnemy(e) {
  if (e.dead) return;
  e.dead = true;
  e.deathT = 0;
  dropTelegraph(e);
  run.kills++;
  const gold = Math.round((e.def.gold || 0) * (1 + run.act * 0.25));
  if (gold) { save.guineas += gold; run.guineas += gold; }
  const pal = e.def.model === 'shambler' || e.def.model === 'brute' || e.def.model === 'unfinished' ? ICHOR : BLOOD;
  burst(e.x, 1, e.z, pal, e.boss ? 50 : 16, 5, 0.14);
  for (let i = 0; i < (e.boss ? 8 : 3); i++) splat(e.x + rand(-0.8, 0.8), e.z + rand(-0.8, 0.8), rand(0.3, 0.7), pal[0]);
  if (has('leech') && P) P.hp = Math.min(S.maxHp, P.hp + 3);
  sfx('die');
  if (e.boss) bossDefeated(e);
}

function hurtPlayer(dmg, sx, sz, opt = {}) {
  if (!P || P.iframes > 0 || P.dodgeT > 0 || P.dead || save.codes.god || window.__god) return false;
  const act = ACTS[run.act];
  const d = Math.max(1, Math.round(dmg * diff().dmg * act.dmg * (1 - S.armor)));
  P.hp -= d;
  if (window.__dmgLog) { const k = (room && room.kind === 'boss' ? 'B ' : '') + (opt.src || '?'); window.__dmgLog[k] = (window.__dmgLog[k] || 0) + d; }
  P.iframes = opt.tick ? 0.25 : 0.55;
  P.flash = 0.2;
  hitStop = Math.max(hitStop, opt.tick ? 0.01 : 0.07);
  shake(opt.tick ? 0.08 : 0.45);
  sfx('hurt');
  screenFlash('rgba(160,0,0,0.28)');
  numbers.push({ x: P.x, y: 2.2, z: P.z, text: String(d), t: 0, life: 0.7, color: '#ff5a5a', big: false });
  burst(P.x, 1.1, P.z, BLOOD, 8, 4, 0.1);
  if (sx !== undefined && !opt.tick) {
    const dx = P.x - sx, dz = P.z - sz, l = Math.hypot(dx, dz) || 1;
    P.vx += (dx / l) * 7; P.vz += (dz / l) * 7;
  }
  if (P.hp <= 0) playerDown();
  return true;
}

// ------------------------------------------------------------------ enemies
const TINT = { glacier: { shambler: '#c8d8f0' }, ice: { shambler: '#b8d0f0', robber: '#c8d8f0' }, lab: {} };
function spawnEnemy(type, x, z, opt = {}) {
  const boss = !!opt.boss;
  const def = boss ? BOSSES[type] : ENEMIES[type];
  const act = ACTS[run.act];
  const hpMul = (boss ? 1 : act.hp) * diff().hp;
  const tint = !boss && TINT[act.biome] && TINT[act.biome][type];
  let hp = Math.round(def.hp * hpMul);
  if (boss && type === 'creature2' && tale.flags.cruel) hp = Math.round(hp * 0.8);
  const e = {
    type, def, boss, x, z, kx: 0, kz: 0, face: Math.atan2(P.x - x, P.z - z), hp, maxHp: hp, r: def.r, speed: def.speed,
    state: 'spawn', t: boss ? 1.4 : 0.9, spawnMax: boss ? 1.4 : 0.9, cds: def.attacks.map(() => rand(0.4, 1.4)), atk: null, atkIdx: -1, comboIdx: 0,
    flash: 0, walk: rand(0, 6), dead: false, hpShow: 0, strafe: Math.random() < 0.5 ? 1 : -1, phase: 1, speedMul: 1, tg: null,
    actor: makeActor(def.model, tint), height: 1.8, airborne: false, y: 0,
  };
  e.height = e.actor.rig.height || 1.8;
  enemies.push(e);
  if (!boss) telegraph('circle', { x, z, r: e.r * 1.6, life: e.spawnMax, color: '#6a8aa0' });
  burst(x, 0.1, z, DUST, 10, 2.5, 0.14, false, 4);
  return e;
}
function maxAttackers() { return save.diff === 'story' ? 2 : save.diff === 'nightmare' ? 4 : 3; }

function beginAttack(e, idx, short = false) {
  const atk = e.def.attacks[idx];
  e.atk = atk;
  e.atkIdx = idx;
  e.state = 'windup';
  e.t = (atk.windup * (short ? 0.6 : 1)) / e.speedMul;
  e.winMax = e.t;
  e.face = Math.atan2(P.x - e.x, P.z - e.z);
  e.lock = e.face;
  const col = e.boss ? '#e02a3a' : '#c8202a';
  switch (atk.kind) {
    case 'swing': e.tg = telegraph('sector', { x: e.x, z: e.z, rot: e.face, r: atk.reach, arc: atk.arc, life: e.t, color: col, owner: e }); break;
    case 'lunge': e.tg = telegraph('rect', { x: e.x, z: e.z, rot: e.face, len: atk.dist + e.r, w: atk.width, life: e.t, color: col, owner: e }); break;
    case 'slam': e.tg = telegraph('circle', { x: e.x, z: e.z, r: atk.radius, life: e.t, color: col, owner: e }); break;
    case 'throw': {
      const n = (e.phase === 2 && e.def.phase2 && e.def.phase2.count) || atk.count || 1;
      e.targets = [];
      for (let i = 0; i < n; i++) {
        const lead = i === 0 ? atk.flight * 0.45 : 0;
        const o = { x: P.x + P.vx * lead + (i ? rand(-3.5, 3.5) : 0), z: P.z + P.vz * lead + (i ? rand(-3.5, 3.5) : 0) };
        collideBounds(o);
        e.targets.push(o);
        telegraph('circle', { x: o.x, z: o.z, r: atk.radius, life: e.t + atk.flight, color: col });
      }
      break;
    }
    case 'leap': {
      const o = { x: P.x, z: P.z };
      collideBounds(o);
      e.target = o;
      telegraph('circle', { x: o.x, z: o.z, r: atk.radius, life: e.t + atk.air, color: col });
      break;
    }
    case 'nova': e.tg = telegraph('circle', { x: e.x, z: e.z, r: 1.8, life: e.t, color: '#ff6a8a', owner: e }); break;
    case 'summon': e.tg = telegraph('circle', { x: e.x, z: e.z, r: 2.4, life: e.t, color: '#8a6aff', owner: e }); break;
    default: break;
  }
  sfx(e.boss ? 'bossWindup' : 'windup');
}
function collideBounds(o) {
  const hw = room.W / 2 - 1, hd = room.D / 2 - 1;
  o.x = clamp(o.x, -hw, hw); o.z = clamp(o.z, -hd, hd);
}

function activateAttack(e) {
  const atk = e.atk;
  e.tg = null;
  switch (atk.kind) {
    case 'swing': {
      const dx = P.x - e.x, dz = P.z - e.z, d = Math.hypot(dx, dz);
      if (d < atk.reach + P.r && Math.abs(angDiff(Math.atan2(dx, dz), e.face)) < (atk.arc / 2) * (Math.PI / 180) + 0.15) hurtPlayer(atk.dmg, e.x, e.z, { src: e.type + ':swing' });
      slashTrail(e.x, e.z, e.face, atk.arc, atk.reach, '#ff6a5a', 0.12);
      sfx('slash');
      if (atk.combo && e.comboIdx + 1 < atk.combo + (e.phase === 2 ? 1 : 0)) { e.comboIdx++; beginAttack(e, e.atkIdx, true); return; }
      break;
    }
    case 'lunge':
      e.state = 'active';
      e.t = atk.dist / atk.speed;
      e.dash = { dx: Math.sin(e.lock), dz: Math.cos(e.lock), hit: false };
      sfx(e.boss ? 'roar' : 'dodge');
      return;
    case 'slam':
      if (Math.hypot(P.x - e.x, P.z - e.z) < atk.radius + P.r * 0.5) hurtPlayer(atk.dmg, e.x, e.z, { src: e.type + ':slam' });
      ringFx(e.x, e.z, atk.radius, '#ffd0a0');
      burst(e.x, 0.2, e.z, DUST, 22, atk.radius * 2.4, 0.18, false, 5);
      shake(e.boss ? 0.6 : 0.35);
      sfx('impact');
      break;
    case 'throw':
      for (const tg of e.targets) thrown.push({ x0: e.x, z0: e.z, x1: tg.x, z1: tg.z, t: 0, dur: atk.flight, r: atk.radius, dmg: atk.dmg, hazard: atk.hazard });
      sfx('slash');
      break;
    case 'leap':
      e.state = 'active';
      e.airborne = true;
      e.t = atk.air;
      e.from = { x: e.x, z: e.z };
      sfx('dodge');
      return;
    case 'nova':
      nova(e.x, e.z, atk.speed, atk.maxR, atk.dmg);
      sfx('galvanic');
      flash(e.x, e.z, 14, 0xff6a8a, 2);
      break;
    case 'summon':
      for (let i = 0; i < atk.n; i++) {
        const a = (i / atk.n) * TAU + rand(-0.3, 0.3);
        const o = { x: e.x + Math.cos(a) * 3, z: e.z + Math.sin(a) * 3 };
        collideBounds(o);
        if (!blockedAt(o.x, o.z)) spawnEnemy(atk.type, o.x, o.z);
      }
      sfx('roar');
      break;
    default: break;
  }
  endAttack(e);
}
function endAttack(e) {
  const atk = e.atk;
  e.state = 'recover';
  e.t = atk.recover / e.speedMul;
  e.cds[e.atkIdx] = atk.cd;
  e.comboIdx = 0;
}
function ringFx(x, z, r, color) {
  const m = fxMesh(ringGeo, color, 0.9, 2);
  m.material.blending = THREE.AdditiveBlending;
  m.position.set(x, 0.1, z);
  trails.push({ m, life: 0.35, max: 0.35, grow: r });
}

function checkBossPhase(e) {
  const p2 = e.def.phase2;
  if (p2 && e.phase === 1 && e.hp < e.maxHp * p2.at) {
    e.phase = 2;
    e.speedMul = p2.speed;
    banner(p2.line, '', 2.2);
    sfx('roar');
    shake(0.6);
    flash(e.x, e.z, 18, 0xff6a5a, 2);
  }
  if (e.def.yieldAt && e.hp < e.maxHp * e.def.yieldAt && e.state !== 'yield') bossYield(e);
}

function updateEnemies(dt) {
  let attackers = 0;
  for (const e of enemies) if (!e.dead && !e.boss && (e.state === 'windup' || e.state === 'active')) attackers++;
  for (const e of enemies) {
    if (e.dead) { e.deathT += dt; continue; }
    e.flash = Math.max(0, e.flash - dt);
    e.hpShow = Math.max(0, e.hpShow - dt);
    for (let i = 0; i < e.cds.length; i++) e.cds[i] -= dt;
    for (const dot of ['bleed', 'burn']) {
      const b = e[dot];
      if (!b) continue;
      b.t -= dt; b.tick -= dt;
      if (b.tick <= 0) {
        b.tick = 0.5;
        e.hp -= Math.round(b.dps * 0.5);
        e.hpShow = 2;
        burst(e.x, 1, e.z, dot === 'bleed' ? BLOOD : FIRE, 3, 1.5, 0.08, dot === 'burn');
        if (e.hp <= 0) { killEnemy(e); break; }
      }
      if (b.t <= 0) e[dot] = null;
    }
    if (e.dead) continue;
    if (e.state === 'spawn') { e.t -= dt; if (e.t <= 0) { e.state = 'move'; if (e.boss) bossIntro(e); } continue; }
    if (e.state === 'yield') continue;
    const dx = P.x - e.x, dz = P.z - e.z, dist = Math.hypot(dx, dz) || 0.01;
    let mvx = 0, mvz = 0;
    if (e.state === 'stagger') {
      e.t -= dt;
      if (e.t <= 0) e.state = 'move';
    } else if (e.state === 'move') {
      e.face += angDiff(Math.atan2(dx, dz), e.face) * Math.min(1, dt * 8);
      // Pick an attack that is ready and in range.
      let choice = -1;
      if (!P.dead && (e.boss || attackers < maxAttackers())) {
        const cands = [];
        e.def.attacks.forEach((a, i) => { if (e.cds[i] <= 0 && dist <= a.range && dist >= (a.minRange || 0)) cands.push(i); });
        if (cands.length) {
          if (e.boss) {
            let sum = 0; for (const i of cands) sum += e.def.attacks[i].w || 1;
            let r = Math.random() * sum;
            for (const i of cands) { if ((r -= e.def.attacks[i].w || 1) <= 0) { choice = i; break; } }
            if (choice < 0) choice = cands[0];
          } else choice = cands[0];
        }
      }
      if (choice >= 0) {
        beginAttack(e, choice);
        if (!e.boss) attackers++;
      } else {
        const speed = e.speed * e.speedMul * (save.codes.slow ? 0.66 : 1);
        const keep = e.def.keep;
        const ux = dx / dist, uz = dz / dist;
        let want = 1;
        if (keep) want = dist < keep - 1.5 ? -1 : dist > keep + 1.5 ? 1 : 0;
        else if (!e.boss && attackers >= maxAttackers() && dist < 4) want = -0.3;
        const strafe = keep || (!e.boss && dist < 3.5) ? 0.7 : 0.15;
        mvx = (ux * want - uz * e.strafe * strafe) * speed;
        mvz = (uz * want + ux * e.strafe * strafe) * speed;
        if (Math.random() < dt * 0.3) e.strafe *= -1;
        // Steer around obstacles.
        const px = e.x + (mvx / (speed || 1)) * 1.2, pz = e.z + (mvz / (speed || 1)) * 1.2;
        if (blockedAt(px, pz)) { const c = Math.cos(1.2 * e.strafe), s = Math.sin(1.2 * e.strafe); const nx = mvx * c - mvz * s, nz = mvx * s + mvz * c; mvx = nx; mvz = nz; }
      }
    } else if (e.state === 'windup') {
      e.t -= dt;
      const k = 1 - e.t / e.winMax;
      if (k < 0.72) { e.face += angDiff(Math.atan2(dx, dz), e.face) * Math.min(1, dt * 10); e.lock = e.face; }
      if (e.tg) { e.tg.x = e.x; e.tg.z = e.z; e.tg.rot = e.face; }
      if (e.t <= 0) activateAttack(e);
    } else if (e.state === 'active') {
      e.t -= dt;
      if (e.atk.kind === 'lunge') {
        mvx = e.dash.dx * e.atk.speed * e.speedMul; mvz = e.dash.dz * e.atk.speed * e.speedMul;
        if (!e.dash.hit && Math.hypot(P.x - e.x, P.z - e.z) < e.r + P.r + 0.35) { e.dash.hit = true; hurtPlayer(e.atk.dmg, e.x, e.z, { src: e.type + ':lunge' }); }
        if (Math.random() < 0.5) burst(e.x, 0.1, e.z, DUST, 1, 1, 0.12, false, 1.5);
        if (e.t <= 0) endAttack(e);
      } else if (e.atk.kind === 'leap') {
        const k = 1 - Math.max(0, e.t) / e.atk.air;
        e.x = lerp(e.from.x, e.target.x, k); e.z = lerp(e.from.z, e.target.z, k);
        e.y = Math.sin(Math.PI * k) * 5;
        if (e.t <= 0) {
          e.y = 0; e.airborne = false;
          if (Math.hypot(P.x - e.x, P.z - e.z) < e.atk.radius + P.r * 0.5) hurtPlayer(e.atk.dmg, e.x, e.z, { src: e.type + ':leap' });
          ringFx(e.x, e.z, e.atk.radius, '#cfe6ff');
          burst(e.x, 0.2, e.z, run.def.biome === 'graveyard' ? DUST : ICE, 26, 8, 0.2, false, 6);
          shake(0.7);
          sfx('impact');
          endAttack(e);
        }
      }
    } else if (e.state === 'recover') {
      e.t -= dt;
      if (e.t <= 0) e.state = 'move';
    }
    e.kx *= Math.exp(-8 * dt); e.kz *= Math.exp(-8 * dt);
    if (!e.airborne) { e.x += (mvx + e.kx) * dt; e.z += (mvz + e.kz) * dt; }
    if (Math.hypot(mvx, mvz) > 0.3) e.walk += dt * Math.hypot(mvx, mvz) * 1.9;
    e.moving = Math.hypot(mvx, mvz) > 0.3;
    if (!e.airborne) {
      for (const o of enemies) {
        if (o === e || o.dead || o.airborne) continue;
        const ox = e.x - o.x, oz = e.z - o.z, rr = e.r + o.r, d2 = ox * ox + oz * oz;
        if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2), push = (rr - d) * (e.boss ? 0.1 : 0.5); e.x += (ox / d) * push; e.z += (oz / d) * push; }
      }
      const pd = Math.hypot(P.x - e.x, P.z - e.z), minD = e.r + P.r;
      if (pd < minD && pd > 1e-4 && P.dodgeT <= 0) { e.x = P.x - ((P.x - e.x) / pd) * minD; e.z = P.z - ((P.z - e.z) / pd) * minD; }
      collide(e, e.r);
    }
  }
  // Remove bodies once they have sunk away.
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.dead && e.deathT > 1.6) { disposeActor(e.actor); enemies.splice(i, 1); }
  }
}

// ------------------------------------------------------------------ projectiles, hazards, novas
function updateProjectiles(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    const nx = b.x + b.vx * dt, nz = b.z + b.vz * dt;
    let dead = false;
    for (const e of enemies) {
      if (e.dead || e.state === 'spawn' || e.airborne || b.hit.includes(e)) continue;
      // Segment-circle test.
      const sx = nx - b.x, sz = nz - b.z, L2 = sx * sx + sz * sz || 1e-6;
      const tt = clamp(((e.x - b.x) * sx + (e.z - b.z) * sz) / L2, 0, 1);
      const cx = b.x + sx * tt, cz = b.z + sz * tt;
      if (Math.hypot(e.x - cx, e.z - cz) < e.r + 0.15) {
        b.hit.push(e);
        const l = Math.sqrt(L2);
        hitEnemy(e, b.dmg, sx / l, sz / l, 6, { gun: true, heavy: true });
        gainGal(BASE.galPerShot);
        burst(cx, 1.1, cz, SPARK, 4, 4, 0.06, true, 2);
        if (b.pierce-- <= 0) { dead = true; break; }
      }
    }
    tracers.push({ ax: b.x, az: b.z, bx: nx, bz: nz, life: 0.06 });
    b.x = nx; b.z = nz; b.life -= dt;
    if (!dead && (blockedAt(b.x, b.z, true) || Math.abs(b.x) > room.W / 2 || Math.abs(b.z) > room.D / 2)) {
      dead = true;
      burst(b.x, 1, b.z, SPARK, 6, 3, 0.06, true, 3);
      burst(b.x, 1, b.z, DUST, 4, 2, 0.08);
    }
    if (dead || b.life <= 0) bullets.splice(i, 1);
  }
  for (let i = thrown.length - 1; i >= 0; i--) {
    const t = thrown[i];
    t.t += dt;
    const k = t.t / t.dur;
    if (k < 1) continue;
    if (Math.hypot(P.x - t.x1, P.z - t.z1) < t.r + P.r * 0.4) hurtPlayer(t.dmg, t.x1, t.z1, { src: 'throw' });
    const H = HAZ[t.hazard];
    burst(t.x1, 0.4, t.z1, H.palette, 18, 5, 0.12, true, 4);
    hazard(t.hazard, t.x1, t.z1, t.r * 0.85, t.hazard === 'fire' ? 3.5 : 2.4);
    if (t.hazard === 'fire') flash(t.x1, t.z1, 8, 0xff8a3a, 1);
    sfx('impact');
    thrown.splice(i, 1);
  }
  for (let i = hazards.length - 1; i >= 0; i--) {
    const h = hazards[i];
    const H = HAZ[h.kind];
    h.life -= dt; h.tick -= dt;
    h.m.material.opacity = (0.22 + Math.sin(time * 18 + i) * 0.06) * Math.min(1, h.life * 2);
    if (Math.random() < dt * 14) glows.push({ x: h.x + rand(-h.r, h.r) * 0.7, y: 0.2, z: h.z + rand(-h.r, h.r) * 0.7, vx: 0, vy: 1.6, vz: 0, life: 0.5, max: 0.5, s: 0.1, c: pick(H.palette), rx: 0, ry: 0, vr: 2, grav: 0 });
    if (h.tick <= 0) {
      h.tick = H.friendly ? 0.35 : 0.5;
      if (H.friendly) {
        for (const e of enemies) if (!e.dead && e.state !== 'spawn' && Math.hypot(e.x - h.x, e.z - h.z) < h.r + e.r) hitEnemy(e, H.dmg, 0, 0, 0, { zap: true });
      } else if (P && Math.hypot(P.x - h.x, P.z - h.z) < h.r) {
        if (H.slow) P.slowT = 0.5;
        hurtPlayer(H.dmg, undefined, undefined, { tick: true, src: 'hazard' });
      }
    }
    if (h.life <= 0) { freeMesh(h.m); hazards.splice(i, 1); }
  }
  for (let i = novas.length - 1; i >= 0; i--) {
    const n = novas[i];
    n.r += n.speed * dt;
    n.m.scale.set(n.r, 1, n.r);
    n.m.material.opacity = 0.9 * (1 - n.r / n.maxR);
    if (!n.hit && P && Math.abs(Math.hypot(P.x - n.x, P.z - n.z) - n.r) < 0.55) { if (hurtPlayer(n.dmg, n.x, n.z, { src: 'nova' })) n.hit = true; }
    if (n.r >= n.maxR) { freeMesh(n.m); novas.splice(i, 1); }
  }
  for (let i = beams.length - 1; i >= 0; i--) { beams[i].life -= dt; if (beams[i].life <= 0) beams.splice(i, 1); }
  for (let i = tracers.length - 1; i >= 0; i--) { tracers[i].life -= dt; if (tracers[i].life <= 0) tracers.splice(i, 1); }
}
let tracers = [];

// ------------------------------------------------------------------ rooms and waves
const DOOR_SETS = { 1: [0], 2: [-6, 6], 3: [-8, 0, 8] };
function clearRoomEntities() {
  for (const e of enemies) disposeActor(e.actor);
  enemies = []; bullets = []; thrown = []; beams = []; tracers = []; numbers = [];
  hazards.forEach((h) => freeMesh(h.m)); hazards = [];
  novas.forEach((n) => freeMesh(n.m)); novas = [];
  trails.forEach((t) => freeMesh(t.m)); trails = [];
  clearTelegraphs();
  pickups.forEach((pk) => scene.remove(pk.m)); pickups = [];
  particles = []; glows = []; decals = [];
}
function enterRoom(kind, reward) {
  clearRoomEntities();
  $('bossbar').hidden = true;
  const act = ACTS[run.act];
  const last = run.roomIdx >= act.rooms - 1;
  const W = kind === 'boss' ? 30 : 26, D = kind === 'boss' ? 22 : 18;
  const nDoors = kind === 'boss' ? 0 : last ? 1 : Math.random() < 0.3 && kind === 'combat' ? 3 : 2;
  buildRoomScene({ biome: act.biome, W, D, seed: run.seed + run.roomIdx * 101 + (kind === 'boss' ? 999 : 0), doors: nDoors ? DOOR_SETS[nDoors] : [], kind });
  run.room = { kind, reward, waves: [], waveIdx: 0, waveT: 0, cleared: false, rewardTaken: false, doorsOpen: false, t: 0, bossSpawned: false };
  P.x = 0; P.z = D / 2 - 2; P.vx = P.vz = 0; P.face = Math.PI;
  P.actor.group.position.set(P.x, 0, P.z);
  camPos.set(P.x * 0.5, 16, P.z + 11);
  if (kind === 'combat') buildWaves();
  if (kind === 'chance') { run.room.cleared = true; run.room.rewardTaken = true; run.chanceUsed = true; openDoors(); }
  sound.intensity = kind === 'boss' ? 1 : kind === 'chance' ? 0 : 2;
  const label = kind === 'boss' ? 'The Reckoning' : kind === 'chance' ? 'The Gaming Table' : `Chamber ${run.roomIdx + 1} of ${act.rooms}`;
  banner(`${ACT_TEXT[run.act].title}`, label, 1.8);
  hudCache.room = null;
}
function buildWaves() {
  const act = ACTS[run.act];
  const budget = act.budget[Math.min(run.roomIdx, act.budget.length - 1)] * (save.diff === 'nightmare' ? 1.15 : save.diff === 'story' ? 0.85 : 1);
  const nW = run.roomIdx < 2 ? 3 : 4;
  const waves = [];
  for (let w = 0; w < nW; w++) {
    let b = budget * (w === 0 ? 0.4 : 0.6 / (nW - 1));
    const list = [];
    while (b > 0.6) {
      let sum = 0; for (const k in act.pool) sum += act.pool[k];
      let r = Math.random() * sum, t = 'shambler';
      for (const k in act.pool) { if ((r -= act.pool[k]) <= 0) { t = k; break; } }
      list.push(t);
      b -= ENEMIES[t].cost;
    }
    waves.push(list);
  }
  if (run.roomIdx === act.elite) waves[nW - 1].push('brute');
  run.room.waves = waves;
}
function spawnWave(list) {
  for (const type of list) {
    for (let tries = 0; tries < 30; tries++) {
      const x = rand(-room.W / 2 + 2, room.W / 2 - 2), z = rand(-room.D / 2 + 2, room.D / 2 - 2);
      if (Math.hypot(x - P.x, z - P.z) < 6.5 || blockedAt(x, z)) continue;
      if (room.obstacles.some((b) => x > b.x0 - 1 && x < b.x1 + 1 && z > b.z0 - 1 && z < b.z1 + 1)) continue;
      spawnEnemy(type, x, z);
      break;
    }
  }
}
function updateRoom(dt) {
  const R = run.room;
  R.t += dt;
  if (R.kind === 'combat' && !R.cleared) {
    const alive = enemies.filter((e) => !e.dead).length;
    R.waveT += dt;
    if (R.waveIdx < R.waves.length && (R.t > 0.8 && (R.waveIdx === 0 || alive <= 2 || R.waveT > 14))) {
      spawnWave(R.waves[R.waveIdx++]);
      R.waveT = 0;
    }
    if (R.waveIdx >= R.waves.length && alive === 0) {
      R.cleared = true;
      banner('Silence falls', REWARDS[R.reward].desc, 2);
      sound.intensity = 1;
      spawnPickup(R.reward, 0, 0);
      persist();
    }
  }
  if (R.kind === 'boss' && !R.bossSpawned && R.t > 1.2) {
    R.bossSpawned = true;
    spawnEnemy(ACTS[run.act].boss, 0, -4, { boss: true });
  }
  for (let i = pickups.length - 1; i >= 0; i--) {
    const pk = pickups[i];
    pk.t += dt;
    pk.m.position.y = 0.9 + Math.sin(pk.t * 2.5) * 0.15;
    pk.m.rotation.y += dt * 1.2;
    if (P && !P.dead && Math.hypot(P.x - pk.x, P.z - pk.z) < 1.3 && pk.t > 0.4) { scene.remove(pk.m); pickups.splice(i, 1); collectReward(pk.kind); }
  }
  for (const g of gates) {
    if (g.opening && g.open < 1) { g.open = Math.min(1, g.open + dt * 0.8); g.m.position.y = -3.3 * g.open; }
  }
  if (R.doorsOpen && P && !P.dead && !fadeDir) {
    for (const g of gates) {
      if (g.open > 0.6 && Math.abs(P.x - g.x) < 1.25 && P.z < -room.D / 2 + 0.75) { goThroughDoor(g); break; }
    }
  }
  if (R.kind === 'chance' && P && Math.hypot(P.x, P.z + 1) < 2.6) {
    if (!R.promptShown) { R.promptShown = true; toast(isTouch ? 'Tap the table to play Hazard' : 'Press E at the table to play Hazard'); }
    if (pressed.interact || pressed.tonic) { pressed.tonic = false; openDice(); }
  }
}
const REWARD_GEO = {};
function rewardGeo(kind) {
  if (REWARD_GEO[kind]) return REWARD_GEO[kind];
  const v = new VX.VoxBuilder();
  if (kind === 'boon') { v.box(-0.25, -0.25, -0.25, 0.5, 0.5, 0.5, '#bff4ff'); v.box(-0.4, -0.08, -0.08, 0.8, 0.16, 0.16, '#7cf0ff'); v.box(-0.08, -0.4, -0.08, 0.16, 0.8, 0.16, '#7cf0ff'); v.box(-0.08, -0.08, -0.4, 0.16, 0.16, 0.8, '#7cf0ff'); }
  else if (kind === 'tonic') { v.box(-0.22, -0.35, -0.22, 0.44, 0.5, 0.44, '#c8202a'); v.box(-0.1, 0.15, -0.1, 0.2, 0.25, 0.2, '#e8e0d0'); v.box(-0.12, 0.4, -0.12, 0.24, 0.1, 0.24, '#6a4a2a'); }
  else if (kind === 'guineas') { for (let i = 0; i < 5; i++) v.box(-0.25 + (i % 2) * 0.05, -0.35 + i * 0.1, -0.25, 0.5, 0.08, 0.5, '#e8c35a'); }
  else { v.box(-0.4, -0.25, -0.03, 0.8, 0.5, 0.06, '#f2ecd8'); v.box(-0.1, -0.08, 0.02, 0.2, 0.2, 0.06, '#a01a1a'); }
  REWARD_GEO[kind] = v.build(1.3);
  return REWARD_GEO[kind];
}
function spawnPickup(kind, x, z) {
  if (!REWARDS[kind] || kind === 'chance' || kind === 'boss') { openDoors(); return; }
  const m = new THREE.Mesh(rewardGeo(kind), kind === 'boon' ? matGlow : matVox);
  m.position.set(x, 0.9, z);
  m.castShadow = true;
  scene.add(m);
  pickups.push({ kind, x, z, m, t: 0 });
  telegraph('circle', { x, z, r: 1.3, life: 9999, color: kind === 'boon' ? '#7cf0ff' : '#e8c35a' });
}
function collectReward(kind) {
  clearTelegraphs();
  sfx('pickup');
  if (kind === 'boon') { openBoons(); return; }
  if (kind === 'tonic') {
    if (P.tonics < S.maxTonics) { P.tonics++; toast('A tonic: +1 flask'); } else { P.hp = Math.min(S.maxHp, P.hp + 30); toast('Your flasks are full. You drink it now: +30 health'); }
    run.build.tonics = Math.max(run.build.tonics, 0);
  } else if (kind === 'guineas') {
    const g = Math.round(rand(40, 70) * (1 + run.act * 0.35));
    save.guineas += g; run.guineas += g;
    toast(`A purse of ${g} guineas`);
    sfx('coin');
  } else if (kind === 'letter') {
    openLetter();
    return;
  }
  openDoors();
}
function rollDoorRewards(n) {
  const act = ACTS[run.act];
  if (run.roomIdx + 1 >= act.rooms) return ['boss'];
  const weights = { boon: 5, tonic: 1.5, guineas: 1.5, letter: tale.letterIdx < LETTERS.length ? 1.2 : 0, chance: !run.chanceUsed && run.roomIdx >= 1 ? 1.1 : 0 };
  const out = [];
  for (let i = 0; i < n; i++) {
    let sum = 0; for (const k in weights) sum += weights[k];
    let r = Math.random() * sum, pickK = 'boon';
    for (const k in weights) { if ((r -= weights[k]) <= 0) { pickK = k; break; } }
    out.push(pickK);
    if (pickK !== 'boon') weights[pickK] = 0; else weights.boon *= 0.5;
  }
  if (!out.includes('boon') && n > 1) out[0] = 'boon';
  return out;
}
function openDoors() {
  const R = run.room;
  if (R.doorsOpen) return;
  R.doorsOpen = true;
  const rewards = rollDoorRewards(gates.length);
  gates.forEach((g, i) => { g.reward = rewards[i] || 'boon'; g.opening = true; });
  if (gates.length) sfx('door');
  hudCache.objective = null;
}
function goThroughDoor(g) {
  fadeTo(() => {
    run.roomIdx++;
    const kind = g.reward === 'boss' ? 'boss' : g.reward === 'chance' ? 'chance' : 'combat';
    enterRoom(kind, g.reward);
  });
}
function fadeTo(cb) {
  fadeDir = 1; fadeCb = cb;
}

// ------------------------------------------------------------------ bosses
function bossIntro(e) {
  $('boss-name').textContent = e.def.name;
  $('bossbar').hidden = false;
  showTitleCard(e.def.name, e.def.title);
  sound.intensity = 3;
  sfx('roar');
  shake(0.7);
}
function bossYield(e) {
  e.state = 'yield';
  dropTelegraph(e);
  for (const o of enemies) if (o !== e && !o.dead) killEnemy(o);
  clearTelegraphs();
  thrown = [];
  run.room.cleared = true;
  banner('He lowers his fists', ACT_TEXT[run.act].yieldLine, 5);
  sound.intensity = 1;
  $('bossbar').hidden = true;
  run.endT = 5;
}
function bossDefeated(e) {
  for (const o of enemies) if (o !== e && !o.dead) killEnemy(o);
  clearTelegraphs();
  thrown = [];
  run.room.cleared = true;
  $('bossbar').hidden = true;
  timeScale = 0.3;
  run.slowT = 1.4;
  flash(e.x, e.z, 30, 0xfff2d0, 2);
  screenFlash('rgba(255,240,220,0.5)');
  sfx('victory');
  sound.intensity = 1;
  banner(`${e.def.name} falls`, '', 3);
  run.endT = 3.2;
}

// ------------------------------------------------------------------ acts, death, endings
function enterAct(i) {
  const act = ACTS[i];
  run = { act: i, def: act, roomIdx: 0, build: JSON.parse(JSON.stringify(tale.build)), kills: 0, guineas: 0, chanceUsed: false, sparkUsed: false, seed: (Math.random() * 1e6) | 0, room: null, downT: 0, endT: 0, slowT: 0 };
  S = {};
  computeStats();
  applyAtmos(act.biome);
  spawnPlayer();
  P.tonics = Math.min(S.maxTonics, run.build.tonics + (save.lab.apothecary ? 1 : 0) + (tale.flags.laudanum && i === 3 ? 1 : 0));
  P.ammo = S.ammo;
  timeScale = 1;
  enterRoom('combat', 'boon');
  setState('play');
}
function playerDown() {
  if (has('spark') && !run.sparkUsed) {
    run.sparkUsed = true;
    P.hp = Math.round(S.maxHp * 0.5);
    P.iframes = 2.5;
    for (const e of enemies) {
      if (e.dead) continue;
      const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz) || 1;
      if (d < 7) { hitEnemy(e, 30, dx / d, dz / d, 10, { stun: 1 }); }
    }
    flash(P.x, P.z, 30, 0x9fe8ff, 2);
    screenFlash('rgba(160,230,255,0.5)');
    banner('Spark of Being', 'Galvanic fire drags Victor back to his feet.', 2.4);
    sfx('galvanic');
    return;
  }
  P.dead = true;
  P.hp = 0;
  P.swing = null;
  timeScale = 0.3;
  run.downT = 1.6;
  sfx('fall');
  burst(P.x, 1, P.z, BLOOD, 24, 4, 0.12);
}
function afterDown() {
  const cost = diff().deathYears;
  tale.deaths++;
  addYears(-cost, `Fell in Act ${ACT_TEXT[run.act].num}`);
  timeScale = 1;
  if (tale.years <= 0) { showSpent(); return; }
  setState('dead');
}
function retryAct() { sfx('click'); enterAct(tale.act); }
function temptFate() {
  const btn = $('btn-fate');
  btn.disabled = true;
  $('btn-retry').disabled = true;
  let n = 0;
  const tm = setInterval(() => {
    const v = 1 + Math.floor(Math.random() * 6);
    $('fate-die').innerHTML = dieFace(v);
    sfx('dice');
    if (++n < 12) return;
    clearInterval(tm);
    const ok = v >= 5;
    setTimeout(() => {
      btn.disabled = false;
      $('btn-retry').disabled = false;
      if (ok) {
        $('fate-msg').textContent = `${v}! Fate relents. Victor rises where he fell.`;
        sfx('galvanic');
        setTimeout(() => {
          P.dead = false;
          P.hp = Math.round(S.maxHp * 0.5);
          P.iframes = 2.5;
          for (const e of enemies) if (!e.dead && !e.boss) { const dx = e.x - P.x, dz = e.z - P.z, d = Math.hypot(dx, dz) || 1; if (d < 6) { e.kx += (dx / d) * 12; e.kz += (dz / d) * 12; } }
          setState('play');
        }, 900);
      } else {
        $('fate-msg').textContent = `${v}. Fate is unmoved. Two more years are lost.`;
        sfx('fall');
        addYears(-2, 'Tempted fate, and lost');
        setTimeout(() => { if (tale.years <= 0) showSpent(); else enterAct(tale.act); }, 1300);
      }
    }, 200);
  }, 70);
}
function actComplete() {
  run.endT = 0;
  persist();
  if (run.act === ACTS.length - 1) { setState('final'); return; }
  setState('outro');
}
function takeActChoice(opt) {
  if (opt.years) addYears(opt.years, opt.label);
  if (opt.flag) tale.flags[opt.flag] = true;
  tale.build = JSON.parse(JSON.stringify(run.build));
  if (opt.flag === 'laudanum') tale.build.extraTonic = (tale.build.extraTonic || 0) + 1;
  if (opt.boon) {
    const pool = BOONS.filter((b) => b.rarity === opt.boon && (tale.build.boons[b.id] || 0) < b.max);
    if (pool.length) { const b = pick(pool); tale.build.boons[b.id] = (tale.build.boons[b.id] || 0) + 1; opt._boon = b; }
  }
  tale.act = run.act + 1;
  persist();
  sfx('boon');
  outroResult = opt;
  setState('outroResult');
}
let outroResult = null;
function takeFinalChoice(opt) {
  tale.flags[opt.flag] = true;
  tale.finished = true;
  save.tales++;
  save.endings[opt.flag] = true;
  persist();
  sfx(opt.flag === 'spare' ? 'boon' : 'fall');
  setState('ending');
}
function showSpent() {
  tale.finished = true;
  tale.spent = true;
  persist();
  setState('ending');
}

// ------------------------------------------------------------------ feedback helpers
function shake(a) { if (save.settings.shake) shakeAmt = Math.min(1.3, shakeAmt + a); }
let bannerTimer = null;
function banner(title, sub = '', dur = 2.6) {
  const el = $('banner');
  $('banner-title').textContent = title;
  $('banner-sub').textContent = sub;
  el.hidden = false;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => { el.hidden = true; }, dur * 1000);
}
let toastTimer = null;
function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.hidden = false;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2800);
}
function screenFlash(color) {
  const el = $('flash');
  el.style.background = color;
  el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
}
function showTitleCard(name, sub) {
  const el = $('titlecard');
  $('tc-name').textContent = name;
  $('tc-sub').textContent = sub;
  el.hidden = false;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  setTimeout(() => { el.hidden = true; }, 3200);
}

// ------------------------------------------------------------------ scene sync
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const weather = { drops: [], init: false };
function updateWeather(dt, fx, fz) {
  if (!weather.init) {
    weather.init = true;
    for (let i = 0; i < 380; i++) weather.drops.push({ x: rand(-18, 18), y: rand(0, 9), z: rand(-14, 12), s: rand(0.8, 1.2), ph: rand(0, TAU) });
  }
  const kind = atmos.weather;
  rainPool.begin(); snowPool.begin();
  if (kind === 'none') { rainPool.end(); snowPool.end(); return; }
  for (const d of weather.drops) {
    if (kind === 'rain') {
      d.y -= dt * 22 * d.s; d.x += dt * 2.5;
      if (d.y < 0) {
        if (Math.random() < 0.25 && particles.length < partPool.cap - 50) particles.push({ x: fx + d.x, y: 0.05, z: fz + d.z, vx: rand(-0.6, 0.6), vy: rand(1, 2), vz: rand(-0.6, 0.6), life: 0.25, max: 0.25, s: 0.05, c: [0.6, 0.68, 0.8], rx: 0, ry: 0, vr: 0, grav: 12 });
        d.y = 9; d.x = rand(-18, 18); d.z = rand(-14, 12);
      }
      rainPool.add(fx + d.x, d.y, fz + d.z, 0, 0.018, 0.5, 0.018);
    } else {
      d.y -= dt * 1.6 * d.s; d.ph += dt;
      if (d.y < 0) { d.y = 9; d.x = rand(-18, 18); d.z = rand(-14, 12); }
      const i = snowPool.add(fx + d.x + Math.sin(d.ph) * 0.6, d.y, fz + d.z + Math.cos(d.ph * 0.7) * 0.4, d.ph, 0.07, 0.07, 0.07);
      snowPool.tint(i, 0.9, 0.94, 1);
    }
  }
  rainPool.end(); snowPool.end();
}

function updateParticles(dt) {
  if (dt <= 0) return;
  for (const list of [particles, glows]) {
    for (let i = list.length - 1; i >= 0; i--) {
      const q = list[i];
      q.life -= dt;
      if (q.life <= 0) { list[i] = list[list.length - 1]; list.pop(); continue; }
      q.vy -= q.grav * dt;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      if (q.y < q.s * 0.5 && q.grav > 0) {
        if (q.splat && Math.random() < 0.3) splat(q.x, q.z, rand(0.12, 0.3), q.c);
        q.y = q.s * 0.5; q.vy *= -0.3; q.vx *= 0.5; q.vz *= 0.5; q.vr *= 0.5; q.splat = false;
      }
      q.rx += q.vr * dt; q.ry += q.vr * 0.7 * dt;
    }
  }
}

function poseEnemy(e) {
  const o = { x: e.x, z: e.z, y: e.y || 0, face: e.face, moving: e.moving, walk: e.walk, flash: e.flash > 0 ? 0.9 : 0, tell: 0 };
  const m = e.def.model;
  if (m === 'shambler') { o.armLx = o.armRx = -1.35; o.lean = 0.28; }
  if (m === 'sexton') o.armLx = -0.7;
  if (m === 'unfinished') o.lean = 0.12;
  if (e.state === 'spawn') { const k = 1 - e.t / e.spawnMax; o.y = -(1 - k) * (e.height || 1.8); }
  if (e.state === 'windup' && e.atk) {
    const k = 1 - e.t / e.winMax;
    o.tell = (0.35 + 0.65 * k) * (0.55 + 0.45 * Math.sin(time * 32));
    switch (e.atk.kind) {
      case 'swing': o.armRx = -1.2 - 1.6 * k; o.armRy = 1.1 * k; o.twist = 0.4 * k; if (m === 'creature') { o.armLx = -1.2 - 1.4 * k; o.armLy = -0.8 * k; } break;
      case 'lunge': o.lean = -0.25 * k; o.squash = 0.25 * k; if (!e.def.attacks || m !== 'hound') { o.armLx = o.armRx = -1.6; } break;
      case 'slam': case 'summon': o.armLx = o.armRx = -3.0 * k; o.squash = -0.1 * k; break;
      case 'throw': o.armRx = 1.3 * k; o.twist = 0.5 * k; if (m === 'sexton') { o.armLx = 1.2 * k; } break;
      case 'leap': o.squash = 0.45 * k; o.armLx = o.armRx = 0.8 * k; break;
      case 'nova': o.armLz = -1.4 * k; o.armRz = 1.4 * k; o.armLx = o.armRx = -0.4; break;
      default: break;
    }
    if (m === 'hound') { o.lean = -0.25 * k; o.squash = 0.3 * k; o.headPitch = -0.3 * k; }
  } else if (e.state === 'active' && e.atk) {
    if (e.atk.kind === 'lunge') { o.lean = m === 'hound' ? 0.15 : 0.55; o.armLx = o.armRx = -1.7; }
    if (e.atk.kind === 'leap') { o.armLx = o.armRx = -2.9; }
  } else if (e.state === 'recover' && e.atk && e.t > (e.atk.recover / e.speedMul) - 0.22) {
    if (e.atk.kind === 'swing') { o.armRx = -0.7; o.armRy = -1.2; o.twist = -0.4; if (m === 'creature') { o.armLx = -0.7; o.armLy = 1.2; } }
    if (e.atk.kind === 'slam') { o.armLx = o.armRx = -0.4; o.squash = 0.3; }
    if (e.atk.kind === 'throw') { o.armRx = -2.2; }
  } else if (e.state === 'stagger') {
    o.lean = -0.35; o.roll = Math.sin(time * 30) * 0.1;
  } else if (e.state === 'yield') {
    o.lean = 0.5; o.armLx = o.armRx = -0.2; o.squash = 0.15;
  }
  if (e.dead) {
    const k = Math.min(1, e.deathT / 0.35);
    o.lean = -1.45 * k; o.flash = 0;
    o.y = -Math.max(0, e.deathT - 0.7) * 1.1;
    o.moving = false;
  }
  pose(e.actor, o);
}
function posePlayer() {
  const a = P.actor;
  const o = { x: P.x, z: P.z, face: P.face, moving: P.moving, walk: P.walk, armRx: -0.35, armRz: 0.12, armLx: -0.2, flash: 0, tell: P.flash > 0 ? 1.2 : 0 };
  if (P.swing) {
    const s = P.swing, k = s.t / s.dur;
    if (s.i === 2) {
      const sweep = k < 0.3 ? 0 : Math.min(1, (k - 0.3) / 0.3);
      o.armRx = k < 0.3 ? -2.9 : lerp(-2.9, -0.7, sweep);
      o.twist = s.arc >= 360 ? -sweep * TAU : -0.3 * sweep;
      o.lean = 0.2 * sweep;
    } else {
      const dir = s.i === 0 ? 1 : -1;
      const sweep = k < 0.28 ? -k / 0.28 * 0.2 : Math.min(1, (k - 0.28) / 0.3);
      o.armRx = -1.45;
      o.armRy = dir * lerp(1.25, -1.35, Math.max(0, sweep));
      o.twist = dir * lerp(0.35, -0.35, Math.max(0, sweep));
    }
  }
  if (P.gunT > 0) { o.armLx = -1.55; o.armLy = 0.15; }
  if (P.drinkT > 0) { o.armLx = -2.5; o.armLy = 0.5; }
  if (P.dodgeT > 0) { o.lean = 0.55; o.squash = 0.25; o.armRx = 0.5; o.armLx = 0.5; }
  if (P.dead) { o.lean = -1.45; o.y = -0.15; o.moving = false; }
  if (P.iframes > 0 && P.dodgeT <= 0 && !P.dead && Math.floor(time * 20) % 2 === 0) a.group.visible = false; else a.group.visible = true;
  pose(a, o);
}

function syncScene(dt) {
  if (P) posePlayer();
  for (const e of enemies) poseEnemy(e);
  partPool.begin();
  for (const q of particles) {
    const s = q.s * Math.min(1, (q.life / q.max) * 2);
    _e.set(q.rx, q.ry, 0); _q.setFromEuler(_e);
    _m4.compose(_v.set(q.x, q.y, q.z), _q, _s.set(s, s, s));
    partPool.tint(partPool.addM(_m4), q.c[0], q.c[1], q.c[2]);
  }
  partPool.end();
  glowPool.begin();
  for (const q of glows) {
    const s = q.s * Math.min(1, (q.life / q.max) * 1.5);
    glowPool.tint(glowPool.add(q.x, q.y, q.z, q.ry, s, s, s), q.c[0] * 1.2, q.c[1] * 1.2, q.c[2] * 1.2);
  }
  for (const t of thrown) {
    const k = clamp(t.t / t.dur, 0, 1);
    const x = lerp(t.x0, t.x1, k), z = lerp(t.z0, t.z1, k), y = 1.6 + Math.sin(Math.PI * k) * 3.5;
    const H = HAZ[t.hazard];
    const c = H.palette[0];
    glowPool.tint(glowPool.add(x, y, z, time * 8, 0.32, 0.32, 0.32), c[0] * 1.3, c[1] * 1.3, c[2] * 1.3);
    if (Math.random() < 0.6) glows.push({ x, y, z, vx: 0, vy: 0.5, vz: 0, life: 0.3, max: 0.3, s: 0.14, c, rx: 0, ry: 0, vr: 0, grav: 0 });
  }
  glowPool.end();
  decalPool.begin();
  for (const d of decals) decalPool.tint(decalPool.add(d.x, 0.012, d.z, d.r, d.s, 1, d.s), d.c[0] * 0.8, d.c[1] * 0.8, d.c[2] * 0.8);
  decalPool.end();
  tracerPool.begin();
  for (const b of [...tracers, ...beams]) {
    const dx = b.bx - b.ax, dz = b.bz - b.az, L = Math.hypot(dx, dz);
    const w = b.w ? b.w * (b.life / 0.22 + 0.3) : 0.05;
    const i = tracerPool.add((b.ax + b.bx) / 2, 1.05, (b.az + b.bz) / 2, Math.atan2(-dz, dx), L, w, w);
    if (b.w) tracerPool.tint(i, 0.8, 1.3, 1.5); else tracerPool.tint(i, 1.5, 1.3, 0.9);
  }
  tracerPool.end();
  // Lights.
  if (P) { playerLight.position.set(P.x, 2.6, P.z + 0.4); playerLight.intensity = room && room.biome === 'lab' ? 7 : 5; playerLight.distance = 9; }
  lampLights.forEach((l, i) => { l.intensity = l.userData.on ? 9 + Math.sin(time * 9 + i * 2) * 1 + (Math.random() < 0.02 ? -4 : 0) : 0; l.distance = 11; });
  if (flashT > 0) { flashT = Math.max(0, flashT - dt * 9); flashLight.intensity = flashPower * flashT * flashT; flashLight.distance = 14; } else flashLight.intensity = 0;
  let glowOn = false;
  for (const e of enemies) {
    if (e.dead || !e.boss) continue;
    if (e.def.model === 'unfinished') { glowLight.color.set(0x8fe9ff); glowLight.position.set(e.x, 2.4, e.z); glowLight.intensity = 10 + Math.sin(time * 12) * 3; glowOn = true; }
    if (e.def.model === 'sexton') { glowLight.color.set(0xff9a3a); glowLight.position.set(e.x + Math.cos(e.face) * 0.6, 1.2, e.z - Math.sin(e.face) * 0.6); glowLight.intensity = 9 + Math.sin(time * 14) * 2; glowOn = true; }
  }
  if (!glowOn && pickups.length) { const pk = pickups[0]; glowLight.color.set(pk.kind === 'boon' ? 0x8fe9ff : 0xffd08a); glowLight.position.set(pk.x, 1.6, pk.z); glowLight.intensity = 7; glowOn = true; }
  if (!glowOn) glowLight.intensity = 0;
  glowLight.distance = 9;
}

// ------------------------------------------------------------------ camera
const camPos = new THREE.Vector3(0, 16, 11);
const camLook = new THREE.Vector3();
let W = 1, H = 1;
let titleAngle = 0.3;
function updateCamera(dt) {
  const asp = W / H;
  const far = asp < 1 ? clamp((1 / asp) * 0.82, 1, 1.8) : 1;
  if (state === 'menu' && !P) {
    titleAngle += dt * 0.06;
    const tx = Math.sin(titleAngle) * 9, tz = 7 + Math.cos(titleAngle) * 3;
    camPos.lerp(_v.set(tx, 4.2 * far, tz * far), Math.min(1, dt * 2));
    camLook.lerp(_s.set(0, asp < 1 ? -3.2 : 1.3, 0), Math.min(1, dt * 2));
  } else if (P && room) {
    const boss = room.kind === 'boss';
    const look = P.dead ? 0 : 1.4;
    let bx = P.x, bz = P.z;
    const bossE = boss && enemies.find((e) => e.boss && !e.dead);
    if (bossE) { const k = asp < 1 ? 0.4 : 0.22; bx = lerp(P.x, bossE.x, k); bz = lerp(P.z, bossE.z, k); }
    const fx = clamp(bx * 0.78 + Math.sin(P.aim) * look, -room.W / 2 + 4, room.W / 2 - 4);
    const fz = clamp(bz * 0.82 + Math.cos(P.aim) * look, -room.D / 2 + 2, room.D / 2 - 1);
    const hgt = (boss ? 16.5 : 13.5) * far, back = (boss ? 13 : 11) * far;
    camPos.lerp(_v.set(fx, hgt, fz + back), Math.min(1, dt * 5));
    camLook.lerp(_s.set(fx, 0, fz - 0.6), Math.min(1, dt * 5));
  }
  shakeAmt = Math.max(0, shakeAmt - dt * 2.6);
  const sa = shakeAmt * shakeAmt * 0.7;
  camera.position.set(camPos.x + rand(-1, 1) * sa, camPos.y + rand(-1, 1) * sa * 0.5, camPos.z + rand(-1, 1) * sa);
  camera.lookAt(camLook);
}

// ------------------------------------------------------------------ overlay
const _p = new THREE.Vector3();
function toScreen(x, y, z) { _p.set(x, y, z).project(camera); return [(_p.x * 0.5 + 0.5) * W, (-_p.y * 0.5 + 0.5) * H, _p.z]; }
function drawOverlay(dt) {
  octx.clearRect(0, 0, W, H);
  const playing = state === 'play' || state === 'pause' || state === 'overlay';
  if (!playing || !P || !room) { drawJoystick(); return; }
  octx.textAlign = 'center';
  octx.textBaseline = 'middle';
  for (let i = numbers.length - 1; i >= 0; i--) {
    const n = numbers[i];
    n.t += dt;
    if (n.t > n.life) { numbers.splice(i, 1); continue; }
    const [sx, sy, sz] = toScreen(n.x, n.y + n.t * 1.4, n.z);
    if (sz > 1) continue;
    const k = n.t / n.life;
    octx.globalAlpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
    octx.font = `600 ${n.big ? 24 : 17}px "Cormorant Garamond", Georgia, serif`;
    octx.lineWidth = 3;
    octx.strokeStyle = 'rgba(8,6,6,0.9)';
    octx.strokeText(n.text, sx, sy);
    octx.fillStyle = n.color;
    octx.fillText(n.text, sx, sy);
  }
  octx.globalAlpha = 1;
  for (const e of enemies) {
    if (e.dead || e.boss || e.hpShow <= 0) continue;
    const [sx, sy] = toScreen(e.x, (e.height || 1.8) + 0.25, e.z);
    const w = 40;
    octx.fillStyle = 'rgba(8,6,6,0.75)';
    octx.fillRect(sx - w / 2 - 1, sy - 1, w + 2, 6);
    octx.fillStyle = '#a3202a';
    octx.fillRect(sx - w / 2, sy, w * clamp(e.hp / e.maxHp, 0, 1), 4);
  }
  if (run.room.doorsOpen) {
    for (const g of gates) {
      if (!g.reward) continue;
      const R = REWARDS[g.reward];
      const [sx, sy, sz] = toScreen(g.x, 4.9, g.z);
      if (sz > 1) continue;
      octx.fillStyle = 'rgba(10,8,8,0.82)';
      octx.strokeStyle = g.reward === 'boss' ? '#c8202a' : g.reward === 'boon' ? '#7cf0ff' : '#c9a24a';
      octx.lineWidth = 2;
      octx.beginPath(); octx.arc(sx, sy, 22, 0, TAU); octx.fill(); octx.stroke();
      const img = iconImage(R.icon, '#efe6d2');
      if (img.complete) octx.drawImage(img, sx - 14, sy - 14, 28, 28);
      octx.font = '600 15px "Cormorant Garamond", Georgia, serif';
      octx.lineWidth = 3;
      octx.strokeStyle = 'rgba(8,6,6,0.9)';
      octx.strokeText(R.name, sx, sy + 36);
      octx.fillStyle = '#efe6d2';
      octx.fillText(R.name, sx, sy + 36);
    }
  }
  // Reload ring and ammo at the player.
  const [px, py] = toScreen(P.x, 0, P.z);
  if (P.reloadT > 0) {
    const k = 1 - P.reloadT / S.reload;
    octx.strokeStyle = 'rgba(8,6,6,0.8)'; octx.lineWidth = 5;
    octx.beginPath(); octx.arc(px, py + 18, 11, 0, TAU); octx.stroke();
    octx.strokeStyle = '#e8c35a'; octx.lineWidth = 3;
    octx.beginPath(); octx.arc(px, py + 18, 11, -Math.PI / 2, -Math.PI / 2 + TAU * k); octx.stroke();
  }
  if (aimMode === 'mouse' && mouse.seen && state === 'play') {
    const mx = mouse.x, my = mouse.y;
    octx.strokeStyle = 'rgba(239,230,210,0.9)'; octx.lineWidth = 1.5;
    octx.beginPath(); octx.arc(mx, my, 9, 0, TAU); octx.stroke();
    octx.beginPath(); octx.moveTo(mx - 15, my); octx.lineTo(mx - 6, my); octx.moveTo(mx + 6, my); octx.lineTo(mx + 15, my); octx.moveTo(mx, my - 15); octx.lineTo(mx, my - 6); octx.moveTo(mx, my + 6); octx.lineTo(mx, my + 15); octx.stroke();
    for (let i = 0; i < S.ammo; i++) { octx.fillStyle = i < P.ammo ? '#e8c35a' : 'rgba(239,230,210,0.25)'; octx.fillRect(mx - (S.ammo * 7) / 2 + i * 7, my + 18, 5, 8); }
    if (P.reloadT > 0) { octx.strokeStyle = '#e8c35a'; octx.lineWidth = 2; octx.beginPath(); octx.arc(mx, my, 13, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - P.reloadT / S.reload)); octx.stroke(); }
  } else if (state === 'play' && !P.dead) {
    const [ax, ay] = toScreen(P.x + Math.sin(P.aim) * 2.4, 0.1, P.z + Math.cos(P.aim) * 2.4);
    octx.fillStyle = 'rgba(239,230,210,0.7)';
    octx.beginPath(); octx.arc(ax, ay, 4, 0, TAU); octx.fill();
  }
  drawJoystick();
}
function drawJoystick() {
  if (!touchJoy.active) return;
  octx.globalAlpha = 0.45;
  octx.fillStyle = '#0a0808';
  octx.beginPath(); octx.arc(touchJoy.ox, touchJoy.oy, 52, 0, TAU); octx.fill();
  octx.globalAlpha = 0.85;
  octx.strokeStyle = '#efe6d2'; octx.lineWidth = 2;
  octx.beginPath(); octx.arc(touchJoy.ox, touchJoy.oy, 52, 0, TAU); octx.stroke();
  octx.fillStyle = '#c9a24a';
  octx.beginPath(); octx.arc(touchJoy.ox + touchJoy.vx * 46, touchJoy.oy + touchJoy.vy * 46, 20, 0, TAU); octx.fill();
  octx.globalAlpha = 1;
}

// ------------------------------------------------------------------ HUD
const hudCache = {};
const setText = (id, v) => { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } };
const setStyle = (id, p, v) => { const k = id + p; if (hudCache[k] !== v) { hudCache[k] = v; $(id).style[p] = v; } };
const setHTML = (id, v) => { if (hudCache[id + 'h'] !== v) { hudCache[id + 'h'] = v; $(id).innerHTML = v; } };
function updateHUD() {
  if (!P || !run) return;
  setStyle('hp-fill', 'width', `${clamp(P.hp / S.maxHp, 0, 1) * 100}%`);
  setText('hp-text', `${Math.max(0, Math.ceil(P.hp))} / ${S.maxHp}`);
  setStyle('gal-fill', 'width', `${P.gal}%`);
  $('gal').classList.toggle('ready', P.gal >= 100);
  setHTML('tonics', Array.from({ length: S.maxTonics }, (_, i) => `<span class="flask ${i < P.tonics ? 'on' : ''}">${svgIcon('flask')}</span>`).join(''));
  setHTML('dodges', Array.from({ length: BASE.dodges }, (_, i) => `<i class="${i < P.dodges ? 'on' : ''}"></i>`).join(''));
  setText('years-val', `${tale.years}`);
  setText('guineas-val', `${save.guineas}`);
  const act = ACTS[run.act], R = run.room;
  setText('loc', `Act ${ACT_TEXT[run.act].num} · ${ACT_TEXT[run.act].title}`);
  let obj = '';
  if (R.kind === 'boss') obj = R.cleared ? '' : 'Survive the reckoning';
  else if (R.kind === 'chance') obj = 'Try your luck at the table, or move on';
  else if (!R.cleared) obj = `Chamber ${run.roomIdx + 1} of ${act.rooms}: destroy what stirs`;
  else if (!R.doorsOpen) obj = { boon: 'Claim your insight', tonic: 'Take the tonic', guineas: 'Take the purse', letter: 'Read the letter' }[R.reward] || 'Claim your reward';
  else obj = 'Choose a gate';
  setText('objective', obj);
  const bkey = JSON.stringify(run.build.boons);
  if (hudCache.boons !== bkey) {
    hudCache.boons = bkey;
    $('hud-boons').innerHTML = Object.entries(run.build.boons).map(([id, n]) => {
      const b = BOONS.find((x) => x.id === id);
      return `<span class="boon-ico ${b.rarity}" title="${b.name}">${svgIcon(BOON_ICON[id])}${n > 1 ? `<b>${n}</b>` : ''}</span>`;
    }).join('');
  }
  const boss = enemies.find((e) => e.boss && !e.dead);
  if (boss) setStyle('boss-fill', 'width', `${clamp(boss.hp / boss.maxHp, 0, 1) * 100}%`);
  setStyle('vignette', 'opacity', String(clamp(1 - P.hp / S.maxHp / 0.35, 0, 1).toFixed(2)));
  $('cheat-chip').hidden = !(save.codes.god || save.codes.galvani || save.codes.slow);
}

// ------------------------------------------------------------------ screens
const SECTIONS = ['loading', 'title', 'prologue', 'intro', 'boons', 'letter', 'dice', 'dead', 'outro', 'outroResult', 'final', 'ending', 'lab', 'journal', 'settings', 'controls', 'pause'];
const OVERLAYS = ['boons', 'letter', 'dice', 'dead'];
let settingsReturn = 'title', labReturn = 'title', controlsReturn = 'title';
function setState(s) {
  screen = s;
  if (s === 'play') state = 'play';
  else if (s === 'pause') state = 'pause';
  else if (OVERLAYS.includes(s)) state = 'overlay';
  else state = 'menu';
  for (const id of SECTIONS) { const el = $(id); if (el) el.hidden = id !== s; }
  const inGame = ['play', 'pause', ...OVERLAYS].includes(s) || (s === 'settings' && settingsReturn === 'pause') || (s === 'controls' && controlsReturn === 'pause');
  $('hud').hidden = !inGame;
  $('touch').hidden = !(isTouch && s === 'play');
  app.classList.toggle('playing', s === 'play' && aimMode === 'mouse');
  app.classList.toggle('plain', !!save.codes.plain);
  if (!inGame) $('bossbar').hidden = true;
  if (s !== 'play') { $('banner').hidden = true; $('titlecard').hidden = true; }
  const render = { title: renderTitle, prologue: renderPrologue, intro: renderIntro, boons: renderBoons, letter: renderLetter, dice: renderDice, dead: renderDead, outro: renderOutro, outroResult: renderOutroResult, final: renderFinal, ending: renderEnding, lab: renderLab, journal: renderJournal, settings: renderSettings, controls: renderControls };
  if (render[s]) render[s]();
  if (s === 'title') { sound.intensity = 0; showTitleScene(); }
  if (s === 'play' && document.activeElement && document.activeElement.blur) document.activeElement.blur();
  const f = $(s) && $(s).querySelector('[data-autofocus]');
  if (f) setTimeout(() => f.focus({ preventScroll: true }), 30);
}
const paras = (list) => list.map((t) => `<p>${t}</p>`).join('');
const fmtY = (y) => `${y > 0 ? '+' : '−'}${Math.abs(y)} ${Math.abs(y) === 1 ? 'year' : 'years'}`;

let titleActor = null;
let sceneBiome = null;
function showScene(biome) {
  run = null;
  if (P && P.actor) { disposeActor(P.actor); P = null; }
  $('bossbar').hidden = true;
  timeScale = 1;
  if (sceneBiome !== biome || !room) {
    clearRoomEntities();
    buildRoomScene({ biome, W: 26, D: 18, seed: 1816 + biome.length, doors: [0], kind: 'combat' });
    sceneBiome = biome;
  }
  applyAtmos(biome);
  if (!titleActor) titleActor = makeActor('victor');
  titleActor.group.visible = true;
}
function showTitleScene() { showScene('graveyard'); }
function hideTitleActor() { if (titleActor) titleActor.group.visible = false; sceneBiome = null; }

function renderTitle() {
  const t = save.tale;
  const cont = t && !t.finished;
  $('btn-continue').hidden = !cont;
  $('btn-new').textContent = cont ? 'Begin a new tale' : 'Begin the tale';
  $('title-meta').innerHTML = `${svgIcon('coin')} ${save.guineas} guineas` + (cont ? ` · ${svgIcon('hourglass')} Act ${ACT_TEXT[t.act].num}, ${t.years} years remaining` : save.tales ? ` · ${save.tales} ${save.tales === 1 ? 'tale' : 'tales'} told` : '');
  newArmed = false;
}
let newArmed = false;
function beginNewTale(startAct = 0) {
  const t = save.tale;
  if (!newArmed && t && !t.finished && startAct === 0) { newArmed = true; $('btn-new').textContent = 'Tap again to abandon your tale'; return; }
  tale = save.tale = newTale(startAct);
  persist();
  sfx('click');
  setState(startAct === 0 ? 'prologue' : 'intro');
}
function renderPrologue() {
  showScene('ice');
  $('pro-head').textContent = PROLOGUE.head;
  $('pro-date').textContent = PROLOGUE.date;
  $('pro-body').innerHTML = paras(PROLOGUE.body);
  $('pro-sign').textContent = PROLOGUE.sign;
}
function renderIntro() {
  const T = ACT_TEXT[tale.act];
  showScene(ACTS[tale.act].biome);
  $('intro-num').textContent = `Act ${T.num}`;
  $('intro-title').textContent = T.title;
  $('intro-date').textContent = `${T.date} · ${T.place}`;
  $('intro-quote').innerHTML = `“${T.quote.text}”<cite>${T.quote.src}</cite>`;
  $('intro-body').innerHTML = paras(T.intro);
  $('intro-years').innerHTML = `${svgIcon('hourglass')} Victor has <b>${tale.years}</b> years left to live.`;
}

let boonChoices = [];
function rollBoons() {
  const owned = run.build.boons;
  const avail = BOONS.filter((b) => (owned[b.id] || 0) < b.max && (!b.years || tale.years > b.years + 1));
  const out = [];
  const W8 = { common: 60, rare: 30, promethean: 12 };
  while (out.length < 3 && avail.length) {
    let sum = 0; for (const b of avail) sum += W8[b.rarity];
    let r = Math.random() * sum, idx = 0;
    for (; idx < avail.length; idx++) { if ((r -= W8[avail[idx].rarity]) <= 0) break; }
    out.push(avail.splice(Math.min(idx, avail.length - 1), 1)[0]);
  }
  return out;
}
function openBoons() { boonChoices = rollBoons(); if (!boonChoices.length) { toast('You have learned all there is to learn.'); openDoors(); return; } setState('boons'); sfx('boon'); }
let boonLock = 0;
function renderBoons() {
  boonLock = performance.now() + 400;
  $('boon-cards').innerHTML = boonChoices.map((b, i) => {
    const n = (run.build.boons[b.id] || 0) + 1;
    return `<button class="boon ${b.rarity}" id="boon-${i}" data-i="${i}">
      <span class="boon-key">${i + 1}</span>
      <span class="boon-art">${svgIcon(BOON_ICON[b.id])}</span>
      <span class="boon-tag">${b.tag}${b.max > 1 ? ` · ${n} of ${b.max}` : ''}</span>
      <span class="boon-name">${b.name}</span>
      <span class="boon-desc">${b.desc}</span>
      ${b.years ? `<span class="boon-cost">${svgIcon('hourglass')} Costs ${b.years} years of Victor’s life</span>` : ''}
    </button>`;
  }).join('');
  $('boon-cards').querySelectorAll('.boon').forEach((el) => el.addEventListener('click', () => takeBoon(+el.dataset.i)));
}
function takeBoon(i) {
  if (screen !== 'boons' || performance.now() < boonLock) return;
  const b = boonChoices[i];
  if (!b) return;
  run.build.boons[b.id] = (run.build.boons[b.id] || 0) + 1;
  if (b.years) addYears(-b.years, `Bargained for ${b.name}`);
  computeStats();
  if (b.id === 'constitution') P.hp = Math.min(S.maxHp, P.hp + 20);
  if (b.id === 'double') P.ammo = S.ammo;
  sfx(b.years ? 'roar' : 'boon');
  setState('play');
  openDoors();
}

function openLetter() {
  const L = LETTERS[tale.letterIdx % LETTERS.length];
  run.letter = L;
  setState('letter');
}
function renderLetter() {
  const L = run.letter;
  $('letter-from').textContent = `From ${L.from}`;
  $('letter-text').textContent = L.text;
}
function closeLetter() {
  if (screen !== 'letter') return;
  save.letters[tale.letterIdx % LETTERS.length] = true;
  tale.letterIdx++;
  addYears(1, `A letter from ${run.letter.from}`);
  sfx('pickup');
  setState('play');
  openDoors();
}

const dice = { stake: 'g25', point: 0, rolling: false, a: 3, b: 4, msg: '' };
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const dieFace = (n) => `<span class="die">${Array.from({ length: 9 }, (_, i) => `<i class="${PIPS[n].includes(i) ? 'pip' : ''}"></i>`).join('')}</span>`;
function openDice() { dice.msg = ''; dice.point = 0; setState('dice'); }
function stakeOk() { return dice.stake === 'year' ? tale.years > 2 : save.guineas >= (dice.stake === 'g25' ? 25 : 60); }
function renderDice() {
  $('dice-purse').innerHTML = `${svgIcon('coin')} ${save.guineas} · ${svgIcon('hourglass')} ${tale.years} years`;
  $('dice-faces').innerHTML = dieFace(dice.a) + dieFace(dice.b);
  $('dice-msg').textContent = dice.msg || 'A sailor pushes the dice across the green baize. “What’ll you stake, doctor?”';
  $('dice-point').textContent = dice.point ? `Your point: ${dice.point}` : '';
  $('dice-stakes').innerHTML = [['g25', '25 guineas'], ['g60', '60 guineas'], ['year', 'A year of life']].map(([k, l]) => `<button class="seg ${dice.stake === k ? 'on' : ''}" data-k="${k}" id="stake-${k}" ${dice.point || dice.rolling ? 'disabled' : ''}>${l}</button>`).join('');
  $('dice-stakes').querySelectorAll('.seg').forEach((b) => b.addEventListener('click', () => { dice.stake = b.dataset.k; sfx('click'); renderDice(); }));
  $('btn-throw').disabled = dice.rolling || (!dice.point && !stakeOk());
  $('btn-throw').textContent = dice.point ? 'Throw for your point' : 'Throw';
  $('dice-rules').textContent = DICE_RULES;
}
function throwDice() {
  if (dice.rolling || (!dice.point && !stakeOk())) return;
  dice.rolling = true;
  renderDice();
  const end = performance.now() + 650;
  const tm = setInterval(() => {
    dice.a = 1 + Math.floor(Math.random() * 6); dice.b = 1 + Math.floor(Math.random() * 6);
    $('dice-faces').innerHTML = dieFace(dice.a) + dieFace(dice.b);
    sfx('dice');
    if (performance.now() < end) return;
    clearInterval(tm);
    const sum = dice.a + dice.b;
    const amt = dice.stake === 'g25' ? 25 : 60;
    const settle = (win, why) => {
      if (dice.stake === 'year') { addYears(win ? 1 : -1, win ? 'Won a year at the gaming table' : 'Lost a year at the gaming table'); dice.msg = `${why} You ${win ? 'win' : 'lose'} a year of life.`; }
      else { save.guineas = Math.max(0, save.guineas + (win ? amt : -amt)); dice.msg = `${why} You ${win ? 'win' : 'lose'} ${amt} guineas.`; }
      dice.point = 0;
      sfx(win ? 'coin' : 'hurt');
      persist();
    };
    if (!dice.point) {
      if (sum === 7 || sum === 11) settle(true, `${sum}!`);
      else if (sum === 2 || sum === 3 || sum === 12) settle(false, `${sum}: crabs.`);
      else { dice.point = sum; dice.msg = `Your point is ${sum}. Throw again: ${sum} wins, 7 loses.`; sfx('click'); }
    } else if (sum === dice.point) settle(true, `${sum}!`);
    else if (sum === 7) settle(false, 'Seven.');
    else { dice.msg = `${sum}. Still looking for your ${dice.point}.`; sfx('click'); }
    dice.rolling = false;
    renderDice();
    hudCache['years-val'] = null;
  }, 70);
}

function renderDead() {
  const cost = diff().deathYears;
  $('dead-sub').textContent = `Act ${ACT_TEXT[run.act].num}, chamber ${run.roomIdx + 1}. The fall costs ${cost} years of Victor’s life.`;
  $('dead-years').innerHTML = `${svgIcon('hourglass')} <b>${tale.years}</b> years remain`;
  $('fate-die').innerHTML = dieFace(6);
  $('fate-msg').textContent = 'Tempt fate: roll a 5 or 6 and Victor rises where he fell. Fail, and lose 2 more years.';
  $('btn-fate').disabled = tale.years <= 2;
}

function renderOutro() {
  const T = ACT_TEXT[run.act];
  $('outro-num').textContent = `The end of Act ${T.num}`;
  $('outro-title').textContent = T.title;
  $('outro-body').innerHTML = paras(T.outro);
  $('outro-prompt').textContent = T.choice.prompt;
  $('outro-choices').innerHTML = T.choice.options.map((o, i) => `<button class="choice" id="choice-${i}" data-i="${i}"><b>${o.label}</b><span>${o.detail}</span></button>`).join('');
  $('outro-choices').querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => takeActChoice(T.choice.options[+b.dataset.i])));
}
function renderOutroResult() {
  const o = outroResult;
  $('or-text').textContent = o.result;
  $('or-gain').innerHTML = [o.years ? `${svgIcon('hourglass')} ${fmtY(o.years)}` : '', o._boon ? `${svgIcon(BOON_ICON[o._boon.id])} ${o._boon.name}: ${o._boon.desc}` : '', `${svgIcon('coin')} ${run.guineas} guineas gathered this act`].filter(Boolean).map((x) => `<li>${x}</li>`).join('');
  $('or-years').innerHTML = `${svgIcon('hourglass')} Victor has <b>${tale.years}</b> years left.`;
}
function renderFinal() {
  const F = ACT_TEXT[3].final;
  $('final-prompt').textContent = F.prompt;
  $('final-choices').innerHTML = F.options.map((o, i) => `<button class="choice" id="final-${i}" data-i="${i}"><b>${o.label}</b><span>${o.detail}</span></button>`).join('');
  $('final-choices').querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => takeFinalChoice(F.options[+b.dataset.i])));
}
function renderEnding() {
  showScene('ice');
  const Y = tale.years;
  let title, text, death;
  if (tale.spent) {
    title = 'His years ran out';
    text = ENDINGS.spent;
    death = [1816, 1817, 1817, 1818][run ? run.act : tale.act];
  } else {
    const tier = ENDINGS.tiers.find((t) => Y >= t.min);
    title = tier.title;
    text = `${ENDINGS[tale.flags.spare ? 'spare' : 'kill']} ${tier.text}`;
    death = Y >= 1 ? 1818 + Y : 1818;
  }
  $('end-stone').innerHTML = `<span>Victor Frankenstein</span><b>${BIRTH_YEAR} – ${death}</b><span>${death - BIRTH_YEAR} years</span>`;
  $('end-title').textContent = title;
  $('end-text').textContent = text;
  $('end-quote').innerHTML = `“${ENDINGS.quote.text}”<cite>${ENDINGS.quote.src}</cite>`;
  $('end-log').innerHTML = [{ text: 'Life expectancy in 1816, at twenty-four', years: START_YEARS, base: true }, ...tale.log]
    .map((e) => `<li><span>${e.text}</span><b class="${e.base ? '' : e.years > 0 ? 'up' : 'down'}">${e.base ? `${e.years} years` : fmtY(e.years)}</b></li>`).join('');
  $('end-sum').innerHTML = `${svgIcon('hourglass')} ${Math.max(0, Y)} years remained · ${tale.deaths} ${tale.deaths === 1 ? 'fall' : 'falls'}`;
}
function renderLab() {
  $('lab-purse').innerHTML = `${svgIcon('coin')} ${save.guineas} guineas`;
  $('lab-list').innerHTML = LAB.map((it) => {
    const lvl = save.lab[it.id] || 0, maxed = lvl >= it.max, cost = maxed ? 0 : it.costs[lvl];
    return `<div class="lab-item">${svgIcon(it.icon, 'lab-ico')}<div class="lab-text"><b>${it.name}</b><span>${it.desc}</span><span class="pips">${Array.from({ length: it.max }, (_, k) => `<i class="${k < lvl ? 'on' : ''}"></i>`).join('')}</span></div>
      <button class="btn small" id="lab-${it.id}" data-id="${it.id}" ${maxed || save.guineas < cost ? 'disabled' : ''}>${maxed ? 'Complete' : `${cost} g`}</button></div>`;
  }).join('');
  $('lab-list').querySelectorAll('button[data-id]').forEach((b) => b.addEventListener('click', () => {
    const it = LAB.find((x) => x.id === b.dataset.id), lvl = save.lab[it.id] || 0;
    if (lvl >= it.max || save.guineas < it.costs[lvl]) return;
    save.guineas -= it.costs[lvl]; save.lab[it.id] = lvl + 1; persist(); sfx('coin'); renderLab();
  }));
}
function renderJournal() {
  $('journal-letters').innerHTML = LETTERS.map((L, i) => save.letters[i]
    ? `<li class="found"><b>${L.from}</b><span>${L.text}</span></li>`
    : `<li><b>A sealed letter</b><span>Found behind a gate marked with an envelope.</span></li>`).join('');
  $('journal-endings').textContent = `Endings reached: ${['spare', 'kill'].filter((k) => save.endings[k]).length} of 2 · Tales told: ${save.tales}`;
  const acts = $('journal-acts');
  acts.hidden = !save.codes.acts;
  if (save.codes.acts) {
    acts.innerHTML = '<div class="eyebrow">The University Key: begin a new tale at</div><div class="seg-row">' + ACT_TEXT.map((t, i) => `<button class="seg" id="jact-${i}" data-i="${i}">Act ${t.num}</button>`).join('') + '</div>';
    acts.querySelectorAll('.seg').forEach((b) => b.addEventListener('click', () => { newArmed = true; beginNewTale(+b.dataset.i); }));
  }
}
let resetArmed = false;
function renderSettings() {
  const st = save.settings;
  $('settings-list').innerHTML = [['music', 'Music'], ['sfx', 'Sound effects'], ['shake', 'Screen shake'], ['numbers', 'Damage numbers']]
    .map(([k, l]) => `<button class="toggle" id="set-${k}" data-k="${k}" aria-pressed="${st[k]}"><span>${l}</span><b>${st[k] ? 'On' : 'Off'}</b></button>`).join('');
  $('settings-list').querySelectorAll('.toggle').forEach((b) => b.addEventListener('click', () => { st[b.dataset.k] = !st[b.dataset.k]; applySettings(); persist(); sfx('click'); renderSettings(); }));
  $('diff-row').innerHTML = DIFFICULTIES.map((d) => `<button class="seg ${save.diff === d.id ? 'on' : ''}" id="diff-${d.id}" data-id="${d.id}">${d.name}</button>`).join('');
  $('diff-row').querySelectorAll('.seg').forEach((b) => b.addEventListener('click', () => { save.diff = b.dataset.id; persist(); sfx('click'); renderSettings(); }));
  $('diff-desc').textContent = diff().desc;
  renderCodes();
  resetArmed = false;
  $('btn-reset').textContent = 'Erase all progress';
  $('btn-reset').hidden = settingsReturn !== 'title';
}
function renderCodes() {
  const found = CODES.filter((c) => save.codes.found[c.code]).length;
  $('codes-count').textContent = `${found} of ${CODES.length} discovered`;
  $('codes-list').innerHTML = CODES.map((c) => {
    if (!save.codes.found[c.code]) return `<li class="code-row"><span><b>Undiscovered</b><small>${c.hint}</small></span></li>`;
    const ctl = c.type === 'toggle' ? `<button class="toggle mini" id="code-${c.key}" data-c="${c.code}" aria-pressed="${!!save.codes[c.key]}"><b>${save.codes[c.key] ? 'On' : 'Off'}</b></button>` : '<em>Used</em>';
    return `<li class="code-row found"><span><b>${c.name}</b><small>${c.code} · ${c.desc}</small></span>${ctl}</li>`;
  }).join('');
  $('codes-list').querySelectorAll('button[data-c]').forEach((b) => b.addEventListener('click', () => { const c = CODES.find((x) => x.code === b.dataset.c); save.codes[c.key] = !save.codes[c.key]; persist(); app.classList.toggle('plain', !!save.codes.plain); sfx('click'); renderCodes(); }));
}
function enterCode(raw) {
  const s = String(raw || '').toUpperCase().replace(/[^A-Z]/g, '');
  const c = CODES.find((x) => x.code === s);
  if (!c) return { ok: false, msg: 'Nothing stirs. That word means nothing here.' };
  save.codes.found[c.code] = true;
  let msg;
  if (c.type === 'toggle') { save.codes[c.key] = !save.codes[c.key]; msg = `${c.name}: ${save.codes[c.key] ? 'on' : 'off'}. ${c.desc}`; }
  else if (c.key === 'money') { if (save.codes.money) msg = 'Clerval has already emptied his purse for you.'; else { save.codes.money = true; save.guineas += 500; msg = '500 guineas from a friend.'; } }
  else if (c.key === 'years') { if (save.codes.years) msg = 'Her letter has already been read.'; else if (save.tale && !save.tale.finished) { save.codes.years = true; save.tale.years += 10; save.tale.log.push({ act: save.tale.act, text: 'A letter from Elizabeth (secret)', years: 10 }); msg = '+10 years for the current tale.'; } else msg = 'Begin a tale first, then whisper her name.'; }
  else if (c.key === 'acts') { save.codes.acts = true; msg = 'Every act can now be chosen from the Journal.'; }
  persist();
  app.classList.toggle('plain', !!save.codes.plain);
  sfx('boon');
  return { ok: true, msg };
}
function renderControls() {}
function applySettings() { sound.setMusic(save.settings.music); sound.setSfx(save.settings.sfx); }
function togglePause() {
  if (state === 'play') { setState('pause'); sfx('click'); }
  else if (screen === 'pause') { setState('play'); sfx('click'); }
}
let abandonArmed = false;
function abandonAct() {
  if (!abandonArmed) { abandonArmed = true; $('btn-abandon').textContent = 'Tap again: lose this act’s progress'; setTimeout(() => { abandonArmed = false; $('btn-abandon').textContent = 'Return to the title'; }, 2600); return; }
  abandonArmed = false;
  $('btn-abandon').textContent = 'Return to the title';
  persist();
  setState('title');
}

// ------------------------------------------------------------------ input wiring
function onFirstGesture() { sound.unlock(); applySettings(); sound.setAmbient(atmos.amb); }
window.addEventListener('pointerdown', onFirstGesture, { capture: true });
window.addEventListener('keydown', onFirstGesture, { capture: true });
let codeBuffer = '';
window.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT')) return;
  const c = e.code;
  keys.add(c);
  if (state === 'play') {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(c)) e.preventDefault();
    if (c === 'Space' || c === 'ShiftLeft' || c === 'ShiftRight') pressed.dodge = true;
    if (c === 'KeyQ') pressed.special = true;
    if (c === 'KeyE' || c === 'KeyF') { pressed.tonic = true; pressed.interact = true; }
    if (c === 'KeyR') pressed.reload = true;
    if (c === 'KeyJ') pressed.attack = true;
    if (c === 'KeyK') pressed.fire = true;
    if (c === 'Escape' || c === 'KeyP') togglePause();
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(c) && aimMode !== 'mouse' && !isTouch) aimMode = mouse.seen ? 'mouse' : aimMode;
  } else if (screen === 'pause') {
    if (c === 'Escape' || c === 'KeyP') togglePause();
  } else if (screen === 'boons') {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= boonChoices.length) takeBoon(n - 1);
  } else if (screen === 'letter') {
    if (c === 'Enter' || c === 'Space' || c === 'KeyE') { e.preventDefault(); closeLetter(); }
  } else if (state === 'menu') {
    if (c === 'Escape') { const b = $(screen) && $(screen).querySelector('[data-back]'); if (b) b.click(); }
    if (screen === 'title' && /^[a-z]$/i.test(e.key)) {
      codeBuffer = (codeBuffer + e.key.toUpperCase()).slice(-24);
      const hit = CODES.find((x) => codeBuffer.endsWith(x.code));
      if (hit) { codeBuffer = ''; const r = enterCode(hit.code); toast(`Secret word: ${r.msg}`); renderTitle(); }
    }
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); mouse.left = mouse.right = false; touchJoy.active = false; if (state === 'play') setState('pause'); });
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') setState('pause'); });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('mousemove', (e) => { const r = app.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.seen = true; if (!isTouch) aimMode = 'mouse'; });
canvas.addEventListener('mousedown', (e) => {
  if (state !== 'play' || isTouch) return;
  const r = app.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.seen = true; aimMode = 'mouse';
  if (e.button === 0) { mouse.left = true; pressed.attack = true; }
  if (e.button === 2) { mouse.right = true; pressed.fire = true; }
});
window.addEventListener('mouseup', (e) => { if (e.button === 0) mouse.left = false; if (e.button === 2) mouse.right = false; });
canvas.addEventListener('pointerdown', (e) => {
  if (state !== 'play' || e.pointerType === 'mouse' || touchJoy.active) return;
  const r = app.getBoundingClientRect();
  if (e.clientX - r.left > r.width * 0.55) return;
  touchJoy.active = true; touchJoy.id = e.pointerId;
  touchJoy.ox = e.clientX - r.left; touchJoy.oy = e.clientY - r.top; touchJoy.vx = touchJoy.vy = 0;
  aimMode = 'auto';
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
});
canvas.addEventListener('pointermove', (e) => {
  if (!touchJoy.active || e.pointerId !== touchJoy.id) return;
  const r = app.getBoundingClientRect();
  let dx = e.clientX - r.left - touchJoy.ox, dy = e.clientY - r.top - touchJoy.oy;
  const l = Math.hypot(dx, dy), max = 50;
  if (l > max) { touchJoy.ox += (dx / l) * (l - max); touchJoy.oy += (dy / l) * (l - max); dx = (dx / l) * max; dy = (dy / l) * max; }
  touchJoy.vx = dx / max; touchJoy.vy = dy / max;
});
const endJoy = (e) => { if (e.pointerId === touchJoy.id) { touchJoy.active = false; touchJoy.vx = touchJoy.vy = 0; } };
canvas.addEventListener('pointerup', endJoy);
canvas.addEventListener('pointercancel', endJoy);
const touchHold = { attack: false };
function bindTouch(id, fn, hold) {
  const el = $(id);
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(); if (hold) touchHold[hold] = true; });
  const up = () => { if (hold) touchHold[hold] = false; };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
}
bindTouch('t-attack', () => { pressed.attack = true; }, 'attack');
bindTouch('t-fire', () => { pressed.fire = true; });
bindTouch('t-dodge', () => { pressed.dodge = true; });
bindTouch('t-special', () => { pressed.special = true; });
bindTouch('t-tonic', () => { pressed.tonic = true; pressed.interact = true; });

const on = (id, fn) => $(id).addEventListener('click', fn);
on('btn-continue', () => { sfx('click'); tale = save.tale; setState('intro'); });
on('btn-new', () => beginNewTale(0));
on('btn-lab', () => { sfx('click'); labReturn = 'title'; setState('lab'); });
on('btn-journal', () => { sfx('click'); setState('journal'); });
on('btn-settings', () => { sfx('click'); settingsReturn = 'title'; setState('settings'); });
on('btn-controls', () => { sfx('click'); controlsReturn = 'title'; setState('controls'); });
on('btn-pro-next', () => { sfx('click'); setState('intro'); });
on('btn-begin', () => { sfx('click'); hideTitleActor(); enterAct(tale.act); });
on('btn-intro-lab', () => { sfx('click'); labReturn = 'intro'; setState('lab'); });
on('btn-intro-back', () => { sfx('click'); setState('title'); });
on('btn-lab-back', () => { sfx('click'); setState(labReturn); });
on('btn-journal-back', () => { sfx('click'); setState('title'); });
on('btn-settings-back', () => { sfx('click'); setState(settingsReturn); });
on('btn-controls-back', () => { sfx('click'); setState(controlsReturn); });
on('btn-letter', closeLetter);
on('btn-throw', throwDice);
on('btn-dice-leave', () => { sfx('click'); setState('play'); });
on('btn-retry', retryAct);
on('btn-fate', temptFate);
on('btn-or-next', () => { sfx('click'); setState('intro'); });
on('btn-end-new', () => { sfx('click'); newArmed = true; beginNewTale(0); });
on('btn-end-title', () => { sfx('click'); setState('title'); });
on('btn-pause', () => togglePause());
on('btn-resume', () => togglePause());
on('btn-pause-settings', () => { sfx('click'); settingsReturn = 'pause'; setState('settings'); });
on('btn-pause-controls', () => { sfx('click'); controlsReturn = 'pause'; setState('controls'); });
on('btn-abandon', abandonAct);
on('btn-code', () => { const r = enterCode($('code-input').value); $('code-msg').textContent = r.msg; $('code-msg').dataset.ok = r.ok ? '1' : '0'; if (r.ok) $('code-input').value = ''; renderCodes(); });
$('code-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('btn-code').click(); } });
on('btn-reset', () => {
  if (!resetArmed) { resetArmed = true; $('btn-reset').textContent = 'Tap again to erase everything'; return; }
  save = defaultSave(); tale = null; persist(); applySettings(); sfx('click'); renderSettings(); $('btn-reset').textContent = 'Erased';
});

// ------------------------------------------------------------------ main loop
let lightningT = 8, lightningFlash = 0;
function update(dt) {
  if (window.__botPress) { Object.assign(pressed, window.__botPress); window.__botPress = null; }
  updatePlayer(dt);
  updateEnemies(dt);
  updateProjectiles(dt);
  updateRoom(dt);
  for (const k in pressed) pressed[k] = false;
  if (run && run.downT > 0) { run.downT -= dt / Math.max(0.2, timeScale); if (run.downT <= 0) afterDown(); }
  if (run && run.slowT > 0) { run.slowT -= dt / Math.max(0.2, timeScale); if (run.slowT <= 0) timeScale = 1; }
  if (run && run.endT > 0) { run.endT -= dt / Math.max(0.2, timeScale); if (run.endT <= 0) actComplete(); }
}
function resize() {
  W = app.clientWidth || window.innerWidth;
  H = app.clientHeight || window.innerHeight;
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  const d = Math.min(window.devicePixelRatio || 1, 2);
  overlay.width = Math.round(W * d); overlay.height = Math.round(H * d);
  octx.setTransform(d, 0, 0, d, 0, 0);
}
window.addEventListener('resize', resize);
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const realDt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += realDt;
  pollPad();
  let simDt = 0;
  if (state === 'play' && run && !fadeDir) {
    if (hitStop > 0) hitStop -= realDt;
    else { simDt = realDt * timeScale * (save.codes.slow ? 0.66 : 1); update(simDt); }
  } else {
    for (const k in pressed) pressed[k] = false;
  }
  if (fadeDir) {
    fadeT += fadeDir * realDt * 3.2;
    if (fadeDir === 1 && fadeT >= 1) { fadeT = 1; fadeDir = -1; if (fadeCb) { const cb = fadeCb; fadeCb = null; cb(); } }
    if (fadeDir === -1 && fadeT <= 0) { fadeT = 0; fadeDir = 0; }
    $('fade').style.opacity = String(fadeT);
  }
  const pdt = state === 'play' ? simDt : state === 'menu' ? realDt : 0;
  updateParticles(pdt);
  updateTelegraphs(pdt);
  updateTrails(pdt || (state === 'menu' ? realDt : 0));
  // Lightning.
  if (atmos.lightning && (state === 'play' || state === 'menu')) {
    lightningT -= realDt;
    if (lightningT <= 0) { lightningT = rand(7, 15); lightningFlash = 0.35; setTimeout(() => sfx('thunder'), rand(300, 1100)); }
  }
  if (lightningFlash > 0) {
    lightningFlash -= realDt;
    const pulse = lightningFlash > 0.22 || (lightningFlash < 0.14 && lightningFlash > 0.06) ? 1 : 0;
    hemi.intensity = hemiBase + pulse * 3.2;
    $('lightning').style.opacity = String(pulse * 0.18);
  } else { hemi.intensity = hemiBase; $('lightning').style.opacity = '0'; }
  if (titleActor && titleActor.group.visible && state === 'menu') {
    pose(titleActor, { x: 0, z: 0, face: 0.25 + Math.sin(time * 0.4) * 0.15, moving: false, walk: 0, armRx: -0.35, armRz: 0.12, armLx: -0.15, bob: Math.sin(time * 1.6) * 0.01 });
    playerLight.position.set(0.5, 2.6, 1); playerLight.intensity = 6; playerLight.distance = 9;
  }
  updateCamera(realDt);
  updateWeather(realDt * (state === 'play' || state === 'menu' ? 1 : 0), camLook.x, camLook.z);
  syncScene(realDt);
  renderer.render(scene, camera);
  drawOverlay(realDt);
  if (run && P && state !== 'menu') updateHUD();
}

function boot(data) {
  const stored = loadSave();
  save = stored || (data && data.save ? mergeSave(data.save) : defaultSave());
  tale = save.tale;
  if (isTouch) document.body.classList.add('touch');
  resize();
  applyAtmos('graveyard');
  setState('title');
  requestAnimationFrame((t) => { last = t; frame(t); });
  if (window.claude && window.claude.hot && window.claude.hot.snapshot) { try { window.claude.hot.snapshot(() => ({ save })); } catch (e) { /* ignore */ } }
}

// Test hook for automated checks.
window.__spark = {
  get state() { return state; }, get screen() { return screen; }, get run() { return run; }, get P() { return P; }, get enemies() { return enemies; },
  get tale() { return tale; }, get save() { return save; }, get room() { return room; }, get gates() { return gates; }, get pickups() { return pickups; }, get S() { return S; }, get hazards() { return hazards; }, get projectiles() { return thrown; }, get novas() { return novas; },
  start(act = 0) { tale = save.tale = newTale(act); hideTitleActor(); enterAct(act); },
  god(on) { window.__god = on; },
  debugBoss() { computeStats(); P.hp = S.maxHp; run.roomIdx = ACTS[run.act].rooms; enterRoom('boss', 'boss'); },
  code(c) { return enterCode(c); },
  simulate(seconds, auto = true) {
    const steps = Math.round(seconds * 30);
    for (let i = 0; i < steps; i++) {
      if (auto) {
        if (screen === 'boons') { boonLock = 0; takeBoon(0); }
        else if (screen === 'letter') closeLetter();
        else if (screen === 'dice') setState('play');
        else if (screen === 'dead') { enterAct(tale.act); }
        else if (screen === 'outro') takeActChoice(ACT_TEXT[run.act].choice.options[0]);
        else if (screen === 'outroResult') { enterAct(tale.act); }
        else if (screen === 'final') { takeFinalChoice(ACT_TEXT[3].final.options[0]); }
      }
      if (fadeDir) { fadeT = 0; fadeDir = 0; $('fade').style.opacity = '0'; if (fadeCb) { const cb = fadeCb; fadeCb = null; cb(); } }
      if (state !== 'play' || !run) break;
      if (hitStop > 0) hitStop = 0;
      update((1 / 30) * timeScale);
      updateTelegraphs(1 / 30);
      updateParticles(1 / 30);
    }
    return { screen, act: run && run.act, room: run && run.roomIdx, kind: run && run.room && run.room.kind, hp: P && Math.round(P.hp), years: tale && tale.years, enemies: enemies.filter((e) => !e.dead).length, kills: run && run.kills, boons: run && Object.keys(run.build.boons).join(' '), deaths: tale && tale.deaths, boss: (enemies.find((e) => e.boss) || {}).hp };
  },
};

const hot = window.claude && window.claude.hot;
if (hot && hot.ready) hot.ready(boot);
else boot((hot && hot.data) || {});
