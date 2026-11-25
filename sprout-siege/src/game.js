// Pip's Expectations: main game module.
import * as THREE from 'three';
import {
  RUN_LENGTH, HEROES, DIFFICULTIES, WEAPONS, PASSIVES, MAX_LEVEL, MAX_WEAPONS, MAX_PASSIVES,
  ENEMIES, BOSSES, EVENTS, SHOP, FLOWER_COLORS, ICONS, ICON_PALETTE,
} from './data.js';
import { BIRTH_YEAR, NEW_TALE_YEARS, THEMES, CHAPTERS, EPILOGUE, KEEPSAKES, REMEDIES, CODES, DICE_RULES } from './story.js';
import { Sound } from './audio.js';
import * as VX from './voxel.js';

const $ = (id) => document.getElementById(id);
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const isTouch = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
const LOW = isTouch;
const MAX_ENEMIES = LOW ? 220 : 330;

// ------------------------------------------------------------------ save data
const SAVE_KEY = 'pips-expectations-save-v1';
function defaultSave() {
  return {
    acorns: 0, shop: {}, heroes: { pip: true }, hero: 'pip', diff: 'normal',
    settings: { music: true, sfx: true, shake: true, numbers: true },
    best: { time: 0, kills: 0, bloom: 0, level: 0 }, wins: 0, runs: 0,
    story: null, chaptersDone: [], keepsakes: {}, tales: 0, bestYears: 0,
    codes: { found: {}, god: false, slow: false, bighead: false, plain: false, heroes: false, chapters: false, money: false },
  };
}
function newTale() {
  return { chapter: 0, years: NEW_TALE_YEARS, ledger: [], flags: {}, remedies: {}, done: [], fortune: false, finished: false };
}
function mergeSave(s) {
  const d = defaultSave();
  const out = Object.assign(d, s || {});
  out.settings = Object.assign(defaultSave().settings, (s && s.settings) || {});
  out.best = Object.assign(defaultSave().best, (s && s.best) || {});
  out.shop = Object.assign({}, (s && s.shop) || {});
  out.heroes = Object.assign({ pip: true }, (s && s.heroes) || {});
  out.codes = Object.assign(defaultSave().codes, (s && s.codes) || {});
  out.codes.found = Object.assign({}, (s && s.codes && s.codes.found) || {});
  out.keepsakes = Object.assign({}, (s && s.keepsakes) || {});
  out.chaptersDone = Array.isArray(s && s.chaptersDone) ? s.chaptersDone : [];
  if (out.story) out.story = Object.assign(newTale(), out.story);
  return out;
}
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return mergeSave(JSON.parse(raw));
  } catch (e) { /* storage blocked */ }
  return null;
}
let save = defaultSave();
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ }
}

// ------------------------------------------------------------------ icons
const ICON_URL = {};
for (const [name, rows] of Object.entries(ICONS)) {
  const c = document.createElement('canvas');
  c.width = 10; c.height = 10;
  const x = c.getContext('2d');
  rows.forEach((row, j) => {
    for (let i = 0; i < 10; i++) {
      const ch = row[i];
      if (!ch || ch === '.') continue;
      x.fillStyle = ICON_PALETTE[ch] || '#ff00ff';
      x.fillRect(i, j, 1, 1);
    }
  });
  ICON_URL[name] = c.toDataURL();
}
const iconImg = (name, cls = '') => `<img class="px ${cls}" src="${ICON_URL[name] || ICON_URL.coin}" alt="">`;

// ------------------------------------------------------------------ renderer and scene
const app = $('app');
const canvas = $('scene');
const overlay = $('overlay');
const octx = overlay.getContext('2d');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, LOW ? 1.5 : 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 500);
camera.position.set(0, 30, 50);

const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, bot: { value: new THREE.Color() } },
  vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vDir;
    void main(){ float h = vDir.y; vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.55)) : mix(mid, bot, pow(-h, 0.45));
    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
    }`,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 16), skyMat);
sky.renderOrder = -1;
scene.add(sky);
scene.fog = new THREE.Fog(0xbfe6ff, 55, 170);

const hemi = new THREE.HemisphereLight(0xffffff, 0x665588, 1.8);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.3);
sun.position.set(-0.6, 1, 0.45);
scene.add(sun);
const playerLight = new THREE.PointLight(0xffc98a, 0, 16, 1.4);
scene.add(playerLight);

function makeFrame(k, t) {
  return {
    t, hi: k.hi, si: k.si, night: k.night,
    top: new THREE.Color(k.top), mid: new THREE.Color(k.mid), bot: new THREE.Color(k.bot),
    hs: new THREE.Color(k.hs), hg: new THREE.Color(k.hg), sun: new THREE.Color(k.sun),
  };
}
const FREE_FRAMES = [
  { t: 0, top: '#3f9cf5', mid: '#a6dbff', bot: '#d4f0ff', hs: '#e2f3ff', hg: '#7a6a9a', hi: 1.9, sun: '#fff4dc', si: 2.4, night: 0 },
  { t: 200, top: '#4b93ea', mid: '#ffe0b0', bot: '#fff1d8', hs: '#ffe9cc', hg: '#7a5f86', hi: 1.8, sun: '#ffd9a0', si: 2.3, night: 0 },
  { t: 300, top: '#3f57b8', mid: '#ff9f7a', bot: '#ffc8a8', hs: '#ffc6a8', hg: '#5a467a', hi: 1.5, sun: '#ff9a5a', si: 1.9, night: 0.35 },
  { t: 365, top: '#0b0f33', mid: '#262463', bot: '#373072', hs: '#8090e0', hg: '#2a2050', hi: 1.15, sun: '#a8b8ff', si: 1.1, night: 1 },
].map((k) => makeFrame(k, k.t));
const chapterFramesCache = {};
function chapterFrames(ch) {
  if (!chapterFramesCache[ch.id]) chapterFramesCache[ch.id] = [makeFrame(ch.atmos[0], 0), makeFrame(ch.atmos[1], ch.length)];
  return chapterFramesCache[ch.id];
}
let atmosFrames = FREE_FRAMES;
let atmosT = 70;
let nightFactor = 0;
function applyAtmosphere(t) {
  const F = atmosFrames;
  let i = 0;
  while (i < F.length - 2 && t > F[i + 1].t) i++;
  const a = F[i], b = F[i + 1];
  const k = clamp((t - a.t) / (b.t - a.t), 0, 1);
  skyMat.uniforms.top.value.lerpColors(a.top, b.top, k);
  skyMat.uniforms.mid.value.lerpColors(a.mid, b.mid, k);
  skyMat.uniforms.bot.value.lerpColors(a.bot, b.bot, k);
  hemi.color.lerpColors(a.hs, b.hs, k);
  hemi.groundColor.lerpColors(a.hg, b.hg, k);
  hemi.intensity = lerp(a.hi, b.hi, k);
  sun.color.lerpColors(a.sun, b.sun, k);
  sun.intensity = lerp(a.si, b.si, k);
  scene.fog.color.copy(skyMat.uniforms.mid.value).lerp(skyMat.uniforms.bot.value, 0.5);
  nightFactor = lerp(a.night, b.night, k);
}

// ------------------------------------------------------------------ materials and pools
const matVox = new THREE.MeshLambertMaterial({ vertexColors: true });
const matGlow = new THREE.MeshBasicMaterial({ vertexColors: true });
const matShadow = new THREE.MeshBasicMaterial({ color: 0x1a1230, transparent: true, opacity: 0.22, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });

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
  addM(m4) {
    if (this.n >= this.cap) return -1;
    const i = this.n++;
    m4.toArray(this.a, i * 16);
    return i;
  }
  tint(i, r, g, b) {
    if (i < 0 || !this.c) return;
    const o = i * 3;
    this.c[o] = r; this.c[o + 1] = g; this.c[o + 2] = b;
  }
  end() {
    this.m.count = this.n;
    this.m.instanceMatrix.needsUpdate = true;
    if (this.c) this.m.instanceColor.needsUpdate = true;
  }
}

const rgbOf = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };

// ------------------------------------------------------------------ world
let island = null;
let currentThemeId = null;
let currentTheme = THEMES.meadow;
const islandMesh = new THREE.Mesh(new THREE.BufferGeometry(), matVox);
scene.add(islandMesh);

const HALF = 40;
const CN = 80 / VX.CELL;
const cellCount = CN * CN;
const cellFlowers = new Uint16Array(cellCount);
const cellBloom = new Float32Array(cellCount);
const cellTarget = new Uint8Array(cellCount);
const cellDelay = new Float32Array(cellCount);
const cellCountable = new Uint8Array(cellCount);
let countableTotal = 0;
for (let cz = 0; cz < CN; cz++) {
  for (let cx = 0; cx < CN; cx++) {
    const wx = cx * VX.CELL - HALF + VX.CELL / 2;
    const wz = cz * VX.CELL - HALF + VX.CELL / 2;
    const th = Math.atan2(wz, wx);
    if (Math.hypot(wx, wz) < VX.walkRadius(th) - 0.5) {
      cellCountable[cz * CN + cx] = 1;
      countableTotal++;
    }
  }
}
const cellAt = (x, z) => {
  const cx = Math.floor((x + HALF) / VX.CELL), cz = Math.floor((z + HALF) / VX.CELL);
  if (cx < 0 || cz < 0 || cx >= CN || cz >= CN) return -1;
  return cz * CN + cx;
};

const solids = []; // collidable circles {x, z, r}
const cellProps = Array.from({ length: cellCount }, () => []);
const GLOOM_TINT = [0.5, 0.46, 0.66];
const treePools = [new Pool(VX.treeGeometry(0), matVox, 40, true), new Pool(VX.treeGeometry(1), matVox, 40, true)];
const rockPool = new Pool(VX.rockGeometry(), matVox, 40);
const tuftPool = new Pool(VX.tuftGeometry(), matVox, 700, true);
const reedPool = new Pool(VX.propGeometry('reed'), matVox, 300, true);
const staticShadow = new Pool(new THREE.CircleGeometry(1, 18).rotateX(-Math.PI / 2), matShadow, 120);
const PROP_CAP = { grave: 16, lamp: 20, townhouse: 8, townhouse2: 8, crate: 14, barrel: 14, boat: 10, hay: 8, fence: 12, clock: 6, jetty: 4 };
const propPools = {};
function propPool(name) {
  if (!propPools[name]) propPools[name] = new Pool(VX.propGeometry(name), matVox, PROP_CAP[name] || 3, name === 'clock');
  return propPools[name];
}
const lampGlows = [];
const smokeEmitters = [];

function rotOff(dx, dz, th) {
  const c = Math.cos(th), s = Math.sin(th);
  return [dx * c + dz * s, -dx * s + dz * c];
}
function freeSpot(x, z, r) {
  for (const s of solids) if (Math.hypot(s.x - x, s.z - z) < s.r + r) return false;
  return true;
}
function placeOne(def, name, x, z, rot) {
  propPool(name).add(x, 0, z, rot, 1, 1, 1);
  if (def.circles) for (const [dx, dz, r] of def.circles) { const [ox, oz] = rotOff(dx, dz, rot); solids.push({ x: x + ox, z: z + oz, r }); }
  if (def.circle) solids.push({ x, z, r: def.circle });
  if (def.glow) lampGlows.push({ x, y: 2.2, z });
  if (def.smoke) smokeEmitters.push({ x: def.smoke[0], y: def.smoke[1], z: def.smoke[2], t: 0 });
}
function placeProp(def, R) {
  if (def.scatter) {
    const sc = def.scatter;
    let placed = 0;
    for (let tries = 0; tries < 200 && placed < sc.n; tries++) {
      const a = R() * TAU, r = Math.sqrt(R()) * sc.r;
      const x = sc.x + Math.cos(a) * r, z = sc.z + Math.sin(a) * r;
      if (Math.hypot(x, z) > VX.walkRadius(Math.atan2(z, x)) - 1) continue;
      if (Math.hypot(x, z) < 4) continue;
      if (!freeSpot(x, z, (def.circle || 0.4) + 0.5)) continue;
      placeOne(def, def.m, x, z, Math.floor(R() * 4) * Math.PI / 2 + (R() - 0.5) * 0.3);
      placed++;
    }
  } else if (def.ring) {
    const { r, n, offset } = def.ring;
    for (let i = 0; i < n; i++) {
      const a = ((i + offset) / n) * TAU;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const rot = def.face ? Math.atan2(-x, -z) : 0;
      placeOne(def, def.alt && i % 2 ? def.alt : def.m, x, z, rot);
    }
  } else if (def.line) {
    const { x0, z0, x1, z1, n } = def.line;
    const rot = Math.atan2(-(z1 - z0), x1 - x0);
    for (let i = 0; i < n; i++) {
      const k = (i + 0.5) / n;
      placeOne(def, def.m, lerp(x0, x1, k), lerp(z0, z1, k), rot);
    }
  } else {
    placeOne(def, def.m, def.x, def.z, def.rot || 0);
  }
}

function buildWorld(themeId) {
  const T = THEMES[themeId] || THEMES.meadow;
  if (currentThemeId === themeId && island) return;
  currentThemeId = themeId;
  currentTheme = T;
  const old = island;
  island = VX.buildIsland(T.seed, T.palette);
  islandMesh.geometry = island.geo;
  if (old) old.geo.dispose();
  cellProps.forEach((a) => { a.length = 0; });
  solids.length = 0; lampGlows.length = 0; smokeEmitters.length = 0;
  for (const pl of [...treePools, rockPool, tuftPool, reedPool, staticShadow]) pl.begin();
  for (const k in propPools) propPools[k].begin();
  const R = VX.rng(T.seed * 7 + 3);
  for (const def of T.props) placeProp(def, R);
  const start = T.start || [0, 0];
  const registerTint = (pool, idx, x, z) => {
    if (idx < 0) return;
    pool.tint(idx, ...GLOOM_TINT);
    const c = cellAt(x, z);
    if (c >= 0) cellProps[c].push({ pool, i: idx });
  };
  let made = 0;
  for (let tries = 0; tries < 900 && made < T.trees; tries++) {
    const a = R() * TAU, r = 6 + R() * 26;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (r > VX.walkRadius(a) - 1.2) continue;
    if (Math.hypot(x - start[0], z - start[1]) < 5) continue;
    if (!freeSpot(x, z, 3.2)) continue;
    const kind = T.treeKinds[Math.floor(R() * T.treeKinds.length)];
    const s = 0.85 + R() * 0.35;
    const pool = treePools[kind];
    const idx = pool.add(x, 0, z, Math.floor(R() * 4) * Math.PI / 2, s, s, s);
    registerTint(pool, idx, x, z);
    staticShadow.add(x, 0.03, z, 0, 1.1 * s, 1, 1.1 * s);
    solids.push({ x, z, r: 0.55 });
    made++;
  }
  for (let i = 0; i < T.rocks; i++) {
    const a = R() * TAU, r = 3 + R() * 27;
    if (r > VX.walkRadius(a)) continue;
    rockPool.add(Math.cos(a) * r, 0, Math.sin(a) * r, R() * TAU, 1, 1, 1);
  }
  for (let i = 0; i < T.tufts; i++) {
    const a = R() * TAU, r = 2 + R() * 29;
    if (r > VX.walkRadius(a) + 1) continue;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    registerTint(tuftPool, tuftPool.add(x, 0, z, R() * TAU, 1, 0.8 + R() * 0.6, 1), x, z);
  }
  for (let i = 0; i < T.reeds; i++) {
    const a = R() * TAU, r = 4 + R() * 28;
    if (r > VX.walkRadius(a) + 1.5) continue;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    registerTint(reedPool, reedPool.add(x, 0, z, R() * TAU, 1, 0.8 + R() * 0.7, 1), x, z);
  }
  for (const pl of [...treePools, rockPool, tuftPool, reedPool, staticShadow]) pl.end();
  for (const k in propPools) propPools[k].end();
  scene.fog.near = T.fog[0];
  scene.fog.far = T.fog[1];
  cellFlowers.fill(0); cellBloom.fill(0); cellTarget.fill(0); cellDelay.fill(0);
  flowersDirty = true;
}

// Clouds drifting around and below the island.
const clouds = [];
const cloudMat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.9, fog: false, emissive: 0x9aa4c8 });
for (let i = 0; i < 18; i++) {
  const m = new THREE.Mesh(VX.cloudGeometry(100 + i), cloudMat);
  const a = (i / 18) * TAU + Math.random() * 0.3;
  const r = 38 + Math.random() * 45;
  const y = i % 3 === 0 ? 4 + Math.random() * 8 : -4 - Math.random() * 20;
  const s = 0.7 + Math.random() * 0.8;
  m.scale.set(s, s * 0.8, s);
  m.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
  clouds.push({ m, a, r, y, spd: 0.004 + Math.random() * 0.006 });
  scene.add(m);
}

// ------------------------------------------------------------------ dynamic pools
const ENEMY_CAP = { gloop: 420, flutter: 300, shroom: 220, spitbud: 160, beetle: 160 };
const enemyPools = {};
for (const type of Object.keys(ENEMIES)) enemyPools[type] = new Pool(VX.enemyGeometry(type), matVox, ENEMY_CAP[type], true);
const shadowPool = new Pool(new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2), matShadow, 900);
const gemPool = new Pool(VX.gemGeometry(), matGlow, 700, true);
const coinPool = new Pool(VX.propGeometry('coin'), matVox, 80);
const applePool = new Pool(VX.appleGeometry(), matVox, 24);
const honeyPool = new Pool(VX.honeyGeometry(), matVox, 10);
const conePool = new Pool(VX.coneGeometry(), matVox, 10);
const chestPool = new Pool(VX.chestGeometry(), matVox, 14, true);
const parcelPool = new Pool(VX.propGeometry('parcel'), matVox, 8, true);
const leafPool = new Pool(VX.propGeometry('posy'), matVox, 12);
const carrotPool = new Pool(VX.propGeometry('boomerang'), matVox, 16);
const beePool = new Pool(VX.beeGeometry(), matVox, 80);
const meteorPool = new Pool(VX.acornGeometry(0.42), matVox, 24);
const cube = VX.cubeGeometry();
const boltPool = new Pool(cube, matGlow, 260, true);
const beamPool = new Pool(cube, matGlow, 240, true);
const partPool = new Pool(cube, matVox, LOW ? 900 : 1600, true);
const glowPool = new Pool(cube, matGlow, 800, true);
const flowerPools = FLOWER_COLORS.map((c) => new Pool(VX.flowerGeometry(c), matVox, LOW ? 340 : 560));
const FLOWER_CAP = flowerPools.reduce((s, pl) => s + pl.cap, 0);

// Rings and telegraphs.
const ringGeo = new THREE.RingGeometry(0.86, 1, 48).rotateX(-Math.PI / 2);
const discGeo = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2);
const lineGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0.5, 0, 0);
function makeFx(geo, n) {
  const list = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 }));
    m.visible = false;
    m.renderOrder = 2;
    scene.add(m);
    list.push({ m, life: 0, max: 1, active: false });
  }
  return list;
}
const ringFx = makeFx(ringGeo, 36);
const discFx = makeFx(discGeo, 24);
const lineFx = makeFx(lineGeo, 6);
function fx(list, opts) {
  const f = list.find((x) => !x.active) || list[0];
  f.active = true;
  f.life = opts.life;
  f.max = opts.life;
  f.x = opts.x; f.z = opts.z;
  f.r0 = opts.r0 ?? 0.2; f.r1 = opts.r1 ?? 1;
  f.op = opts.op ?? 0.8;
  f.grow = opts.grow ?? true;
  f.pulse = opts.pulse || false;
  f.rot = opts.rot || 0;
  f.len = opts.len || 1;
  f.w = opts.w || 1;
  f.m.material.color.set(opts.color || '#ffffff');
  f.m.visible = true;
  return f;
}
function updateFx(dt) {
  for (const list of [ringFx, discFx, lineFx]) {
    for (const f of list) {
      if (!f.active) continue;
      f.life -= dt;
      if (f.life <= 0) { f.active = false; f.m.visible = false; continue; }
      const k = 1 - f.life / f.max;
      if (list === lineFx) {
        f.m.position.set(f.x, 0.06, f.z);
        f.m.rotation.y = f.rot;
        f.m.scale.set(f.len, 1, f.w * (0.4 + 0.6 * Math.min(1, k * 3)));
        f.m.material.opacity = f.op * (0.5 + 0.5 * Math.sin(k * 30));
      } else {
        const r = f.grow ? lerp(f.r0, f.r1, 1 - Math.pow(1 - k, 3)) : f.r1;
        f.m.position.set(f.x, list === discFx ? 0.05 : 0.08, f.z);
        f.m.scale.set(r, 1, r);
        f.m.material.opacity = f.pulse ? f.op * (0.55 + 0.45 * Math.sin(k * 26)) : f.op * (1 - k);
      }
    }
  }
}
function clearFx() {
  for (const list of [ringFx, discFx, lineFx]) for (const f of list) { f.active = false; f.m.visible = false; }
}
// Persistent markers for objective targets, and Joe's cooling aura.
const markers = [];
for (let i = 0; i < 6; i++) {
  const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.8, depthWrite: false }));
  m.visible = false;
  m.renderOrder = 2;
  scene.add(m);
  markers.push(m);
}
const auraMesh = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ color: 0x7ed957, transparent: true, opacity: 0.16, depthWrite: false }));
auraMesh.visible = false;
auraMesh.renderOrder = 1;
scene.add(auraMesh);

// ------------------------------------------------------------------ characters
function makeCharacter(look) {
  const d = VX.buildHero(look);
  const s = d.scale;
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const group = new THREE.Group();
  const rig = new THREE.Group();
  group.add(rig);
  const body = new THREE.Mesh(d.body, mat);
  const head = new THREE.Mesh(d.head, mat);
  head.position.y = d.headY * s;
  const legL = new THREE.Mesh(d.legL, mat), legR = new THREE.Mesh(d.legR, mat);
  legL.position.set(-d.legX * s, d.legY * s, 0);
  legR.position.set(d.legX * s, d.legY * s, 0);
  const armL = new THREE.Mesh(d.arm, mat), armR = new THREE.Mesh(d.arm, mat);
  armL.position.set(-d.armX * s, d.armY * s, 0);
  armR.position.set(d.armX * s, d.armY * s, 0);
  rig.add(body, head, legL, legR, armL, armR);
  group.scale.setScalar(1.22);
  scene.add(group);
  return { group, rig, head, legL, legR, armL, armR, mat, look };
}
function disposeCharacter(m) {
  scene.remove(m.group);
  const seen = new Set();
  m.group.traverse((o) => { if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); } });
  m.mat.dispose();
}
function poseCharacter(m, x, z, face, moving, walk, t, extra = {}) {
  const wk = moving ? Math.sin(walk) : 0;
  m.legL.rotation.x = wk * 0.75; m.legR.rotation.x = -wk * 0.75;
  m.armL.rotation.x = -wk * 0.65 + (extra.armSwing || 0); m.armR.rotation.x = wk * 0.65 - (extra.armSwing || 0);
  m.armL.rotation.z = extra.armsOut ? -0.15 : 0; m.armR.rotation.z = extra.armsOut ? 0.15 : 0;
  m.rig.position.y = moving ? Math.abs(Math.sin(walk)) * 0.09 : Math.sin(t * 2.2) * 0.02;
  m.rig.rotation.x = extra.lean !== undefined ? extra.lean : moving ? 0.08 : 0;
  const sq = extra.squash || 0;
  m.rig.scale.set(1 + sq * 0.18, 1 - sq * 0.22, 1 + sq * 0.18);
  m.head.rotation.z = extra.shiver ? Math.sin(t * 40) * 0.05 : Math.sin(walk * 0.5) * 0.06;
  const hs = save.codes.bighead ? 1.8 : 1;
  m.head.scale.set(hs, hs, hs);
  m.group.position.set(x, 0, z);
  m.group.rotation.y = face;
  const f = extra.flash || 0;
  m.mat.emissive.setRGB(f, f * 0.2, f * 0.2);
}

let heroModel = null;
function makeHeroModel(id) {
  if (heroModel) disposeCharacter(heroModel);
  heroModel = makeCharacter(id);
  heroModel.id = id;
}

// ------------------------------------------------------------------ boss models
const bossModels = {};
let kingGeo = null, golemGeo = null;
function bossModel(id) {
  if (!bossModels[id]) {
    const B = BOSSES[id];
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, color: new THREE.Color(B.tint) });
    const geo = B.model === 'king' ? (kingGeo || (kingGeo = VX.kingGeometry())) : (golemGeo || (golemGeo = VX.golemGeometry()));
    const m = new THREE.Mesh(geo, mat);
    m.visible = false;
    scene.add(m);
    bossModels[id] = m;
  }
  return bossModels[id];
}

// ------------------------------------------------------------------ audio
const sound = new Sound();
const sfx = (n) => sound.play(n);

// ------------------------------------------------------------------ game state
let state = 'menu';
let menuView = 'main';
let run = null;
let p = null; // player
let stats = {};
let enemies = [];
let bolts = [], carrots = [], bees = [], meteors = [], beams = [], orbs = [];
let seeds = [], items = [], particles = [], glows = [], flowers = [], numbers = [];
let npcs = [];
let time = 0;
let hitStop = 0;
let shakeAmt = 0;
let timeScale = 1;
let flowersDirty = true;
let pendingStart = { mode: 'free', chapter: 0 };
const camShake = new THREE.Vector3();

function heroById(id) { return HEROES.find((h) => h.id === id) || HEROES[0]; }
function diffById(id) { return DIFFICULTIES.find((d) => d.id === id) || DIFFICULTIES[1]; }
const story = () => save.story;
const cheatsOn = () => !!(save.codes.god || save.codes.slow);

function computeStats() {
  const pa = run.passives, h = run.hero, sh = save.shop;
  const oldMax = stats.maxHp || 0;
  stats.maxHp = h.hp + 20 * (pa.heart || 0) + 10 * (sh.vital || 0);
  stats.speed = 5.0 * h.speed * (1 + 0.08 * (pa.boots || 0) + 0.04 * (sh.swift || 0));
  stats.dmgMult = h.dmg * (1 + 0.1 * (pa.blade || 0) + 0.05 * (sh.might || 0));
  stats.cdMult = Math.max(0.45, 1 - 0.07 * (pa.dial || 0));
  stats.area = 1 + 0.1 * (pa.bloom || 0);
  stats.magnet = 3.0 * (1 + h.magnet + 0.3 * (pa.honey || 0) + 0.15 * (sh.reach || 0));
  stats.crit = 0.05 + h.crit + 0.08 * (pa.clover || 0);
  stats.armor = h.armor + (pa.bark || 0);
  stats.regen = 0.4 * (pa.regrow || 0);
  stats.luck = pa.clover || 0;
  if (p && oldMax && stats.maxHp > oldMax) p.hp += stats.maxHp - oldMax;
}

function clearNpcs() {
  for (const n of npcs) disposeCharacter(n.model);
  npcs = [];
}
function spawnNpc(def) {
  const n = {
    id: def.id, look: def.look, mode: def.mode, x: def.x, z: def.z, face: 0, walk: 0, moving: false,
    hp: def.hp || 0, maxHp: def.hp || 0, inv: 0, flash: 0, atk: 1.5, squash: 0, model: makeCharacter(def.look),
  };
  npcs.push(n);
  return n;
}
const npcById = (id) => npcs.find((n) => n.id === id);

function resetWorld() {
  enemies = []; bolts = []; carrots = []; bees = []; meteors = []; beams = []; orbs = [];
  seeds = []; items = []; particles = []; glows = []; flowers = []; numbers = [];
  clearNpcs();
  cellFlowers.fill(0); cellBloom.fill(0); cellTarget.fill(0); cellDelay.fill(0);
  for (let c = 0; c < cellCount; c++) applyCellColor(c, 0);
  island.colorAttr.needsUpdate = true;
  for (const pl of [...treePools, tuftPool, reedPool]) pl.end();
  for (const id of Object.keys(bossModels)) bossModels[id].visible = false;
  // Objective props (clocks, jetties) are added again per objective.
  for (const name of ['clock', 'jetty']) if (propPools[name]) { propPools[name].begin(); propPools[name].end(); }
  for (let i = solids.length - 1; i >= 0; i--) if (solids[i].objective) solids.splice(i, 1);
  clearFx();
  flowersDirty = true;
}

function startRun(mode = 'free', chapterIdx = 0) {
  const hero = heroById(save.hero);
  const diff = diffById(save.diff);
  const chapter = mode === 'story' ? CHAPTERS[chapterIdx] : null;
  buildWorld(chapter ? chapter.theme : 'meadow');
  resetWorld();
  const tale = story();
  run = {
    mode, chapter, chapterIdx, hero, diff, time: 0, kills: 0, acorns: 0, level: 1, spawnAcc: 0,
    nextElite: chapter ? 45 : 50, eventIdx: 0, passives: {}, rerolls: 1 + (save.shop.reroll || 0),
    revive: !chapter && (save.shop.revive || 0) > 0, chances: 3 + (save.shop.revive || 0), knockdowns: 0,
    combo: 0, comboT: 0, bestCombo: 0, lastKill: -9, bloomed: 0, milestones: 0, bosses: [],
    pendingLevels: 0, vacuum: 0, victoryT: 0, deathT: 0, damage: 0, kingDead: false,
    hint: 7, moved: false, ended: false, won: false, obj: 0, objT: 0, objState: {}, ledger: [],
    keepsakeSpawned: false, keepsakeFound: false, practice: !!(chapter && tale && (tale.done[chapterIdx] || chapterIdx > tale.chapter)),
    usedCheats: cheatsOn(), fever: false,
  };
  run.maxChances = run.chances;
  const start = (THEMES[chapter ? chapter.theme : 'meadow'].start) || [0, 0];
  p = {
    x: start[0], z: start[1], vx: 0, vz: 0, face: 0, walk: 0, moving: false, hp: 100, inv: 0, flash: 0,
    dashT: 0, dashCd: 0, dashX: 0, dashZ: 1, xp: 0, level: 1, need: xpNeed(1), weapons: [], squash: 0,
  };
  stats = {};
  computeStats();
  p.hp = stats.maxHp;
  addWeapon(hero.start);
  makeHeroModel(hero.id);
  if (chapter) for (const d of chapter.npcs) spawnNpc(d);
  atmosFrames = chapter ? chapterFrames(chapter) : FREE_FRAMES;
  atmosT = 0;
  sound.intensity = 1;
  sound.night = chapter ? chapter.atmos[0].night > 0.5 : false;
  setState('play');
  if (chapter) {
    banner(`Chapter ${chapter.num}: ${chapter.title}`, `${chapter.date}. ${chapter.place}.`, 3.2);
    startObjective(0);
  } else {
    banner('The Long Night', 'Hold out until dawn. Your attacks fire on their own.');
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.4;
    const o = { x: p.x + Math.cos(a) * 10, z: p.z + Math.sin(a) * 10 };
    clampIsland(o, -0.5);
    spawnEnemy('gloop', o.x, o.z, { force: true });
  }
}

function xpNeed(l) { return Math.floor(5 + (l - 1) * 4 + Math.pow(l - 1, 1.55)); }

function addWeapon(id) {
  const w = p.weapons.find((x) => x.id === id);
  if (w) { w.level = Math.min(MAX_LEVEL, w.level + 1); return; }
  p.weapons.push({ id, level: 1, t: 0.4, a: 0 });
}

// ------------------------------------------------------------------ life ledger
function addLedger(years, text) {
  if (!run || run.mode !== 'story' || run.practice) return;
  run.ledger.push({ years, text });
  const el = $('life-chip');
  if (el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
}
function pendingYears() {
  if (!run || !run.ledger) return 0;
  return run.ledger.reduce((s, e) => s + e.years, 0);
}
function expectedYears() {
  const tale = story();
  return (tale ? tale.years : NEW_TALE_YEARS) + (run && run.mode === 'story' ? pendingYears() : 0);
}

// ------------------------------------------------------------------ objectives
const curObj = () => (run && run.chapter ? run.chapter.objectives[run.obj] : null);
function objText() {
  const o = curObj();
  if (!o) return '';
  const st = run.objState;
  const pct = Math.min(100, Math.round((run.bloomed / countableTotal) * 100));
  if (o.type === 'boss' && !st.spawned && st.wait - run.objT > 1.5) {
    return `${BOSSES[o.boss].name} gathers… ${Math.ceil(st.wait - run.objT)}s. Grow stronger!`;
  }
  return o.text
    .replace('{done}', st.done || 0).replace('{n}', st.n || 0)
    .replace('{pct}', pct).replace('{goal}', o.pct || 0)
    .replace('{left}', Math.max(0, Math.ceil(st.left || 0)));
}
function plainObjText(o) {
  return o.text.replace(/\s*\([^)]*\)/g, '').replace(/:\s*\{left\}s/, '').replace(/\{[a-z]+\}/g, '').trim();
}

function startObjective(i) {
  run.obj = i;
  run.objT = 0;
  const o = curObj();
  const st = { done: 0 };
  run.objState = st;
  if (o.surge) st.surgeT = i === 0 ? 9 : 2;
  switch (o.type) {
    case 'collect': {
      st.n = o.n;
      const placed = [];
      for (let k = 0, tries = 0; k < o.n && tries < 600; tries++) {
        const a = Math.random() * TAU, r = rand(8, 26);
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (r > VX.walkRadius(a) - 2.5) continue;
        if (Math.hypot(x - p.x, z - p.z) < 9) continue;
        if (!freeSpot(x, z, 1.2)) continue;
        if (placed.some((q) => Math.hypot(q[0] - x, q[1] - z) < 7)) continue;
        placed.push([x, z]);
        items.push({ kind: 'story', x, z, t: 0, name: o.names[k] });
        k++;
      }
      st.n = placed.length;
      break;
    }
    case 'reach':
      st.npc = npcById(o.npc);
      break;
    case 'wind': {
      st.n = o.points.length;
      st.points = o.points.map(([x, z]) => ({ x, z, prog: 0, done: false, idx: -1 }));
      const pl = propPool('clock');
      for (const pt of st.points) {
        pt.idx = pl.add(pt.x, 0, pt.z, Math.atan2(-pt.x, -pt.z), 1, 1, 1);
        pl.tint(pt.idx, 0.62, 0.6, 0.66);
        solids.push({ x: pt.x, z: pt.z, r: 0.45, objective: true });
      }
      pl.end();
      break;
    }
    case 'bloom':
      st.goal = o.pct;
      break;
    case 'escort': {
      st.n = o.points.length;
      st.idx = 0;
      st.points = o.points.map(([x, z]) => ({ x, z, prog: 0 }));
      st.npc = npcById(o.npc);
      const pl = propPool('jetty');
      for (const pt of st.points) pl.add(pt.x, 0, pt.z, Math.atan2(pt.x, pt.z), 1, 1, 1);
      pl.end();
      break;
    }
    case 'survive':
      st.left = o.time;
      if (run.chapter.fever) run.fever = true;
      break;
    case 'boss':
      st.spawned = false;
      st.wait = Math.max(1.4, (o.at || 0) - run.time);
      break;
    default: break;
  }
  hudCache.objective = null;
}

function updateObjective(dt) {
  const o = curObj();
  if (!o || run.victoryT > 0 || run.deathT > 0) return;
  const st = run.objState;
  run.objT += dt;
  if (st.surgeT > 0) {
    st.surgeT -= dt;
    if (st.surgeT <= 0) {
      const sg = o.surge;
      triggerEvent({ kind: sg.kind, type: sg.type, n: sg.n, text: sg.kind === 'ring' ? 'The Miasma closes in around you!' : 'A swarm comes in off the marshes!' });
    }
  }
  switch (o.type) {
    case 'collect':
      if (st.done >= st.n) completeObjective();
      break;
    case 'reach':
      if (st.npc && Math.hypot(p.x - st.npc.x, p.z - st.npc.z) < 2.4) completeObjective();
      break;
    case 'wind': {
      const pl = propPool('clock');
      for (const pt of st.points) {
        if (pt.done) continue;
        if (Math.hypot(p.x - pt.x, p.z - pt.z) < 2.4) {
          pt.prog += dt;
          if (Math.random() < dt * 6) sfx('reel');
          if (pt.prog >= o.time) {
            pt.done = true;
            st.done++;
            pl.tint(pt.idx, 1.25, 1.2, 1.05);
            pl.end();
            sfx('chest');
            burst(pt.x, 2.2, pt.z, GOLD, 24, 5, 0.14, true, 6);
            const c0 = cellAt(pt.x, pt.z);
            for (const dc of [0, -1, 1, -CN, CN]) if (c0 + dc >= 0 && c0 + dc < cellCount) bloomCell(c0 + dc, 0, true);
            if (st.done < st.n) banner(`A clock ticks again (${st.done} of ${st.n})`, 'Twenty to nine is over at last.', 2);
          }
        } else {
          pt.prog = Math.max(0, pt.prog - dt * 0.6);
        }
      }
      if (st.done >= st.n) completeObjective();
      break;
    }
    case 'bloom':
      if ((run.bloomed / countableTotal) * 100 >= o.pct) completeObjective();
      break;
    case 'escort': {
      const pt = st.points[st.idx];
      const n = st.npc;
      if (pt && n) {
        const near = Math.hypot(p.x - pt.x, p.z - pt.z) < 2.8 && Math.hypot(n.x - pt.x, n.z - pt.z) < 3.2;
        if (near) pt.prog += dt; else pt.prog = Math.max(0, pt.prog - dt * 0.6);
        if (pt.prog >= (o.hold || 2.5)) {
          st.done++;
          st.idx++;
          sfx('chest');
          burst(pt.x, 1, pt.z, GOLD, 18, 5, 0.12, true, 5);
          if (st.done < st.n) banner(`River stairs reached (${st.done} of ${st.n})`, 'Keep Provis close. On to the next stairs.', 2);
        }
      }
      if (st.done >= st.n) {
        if (n) {
          burst(n.x, 1, n.z, GOLD, 20, 4, 0.12, true, 5);
          disposeCharacter(n.model);
          npcs = npcs.filter((q) => q !== n);
          toast('Provis is safe aboard the boat. Hold off the fog!');
        }
        completeObjective();
      }
      break;
    }
    case 'survive':
      st.left -= dt;
      if (st.left <= 0) completeObjective();
      break;
    case 'boss':
      if (!st.spawned && run.objT > st.wait) { st.spawned = true; spawnBoss(o.boss); }
      break;
    default: break;
  }
}

function completeObjective() {
  const ch = run.chapter;
  sfx('bloom');
  if (!run.keepsakeSpawned && ch.keepsake) spawnKeepsake();
  if (run.obj + 1 < ch.objectives.length) {
    const next = ch.objectives[run.obj + 1];
    banner('Well done!', plainObjText(next), 2.6);
    startObjective(run.obj + 1);
  } else {
    chapterVictory();
  }
}

function spawnKeepsake() {
  run.keepsakeSpawned = true;
  for (let tries = 0; tries < 300; tries++) {
    const a = Math.random() * TAU, r = rand(6, 26);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (r > VX.walkRadius(a) - 2.5 || Math.hypot(x - p.x, z - p.z) < 10 || !freeSpot(x, z, 1)) continue;
    items.push({ kind: 'keepsake', x, z, t: 0, id: run.chapter.keepsake });
    return;
  }
}

function chapterVictory() {
  run.won = true;
  run.victoryT = 4.2;
  timeScale = 0.35;
  p.inv = 99;
  run.fever = false;
  for (const o of enemies) if (!o.dead) killEnemy(o, true);
  orbs = [];
  for (let i = 0; i < 16; i++) items.push({ kind: 'coin', x: p.x + rand(-3, 3), z: p.z + rand(-3, 3), t: 0 });
  bloomWave(p.x, p.z);
  sfx('victory');
  sound.night = false;
  sound.intensity = 1;
  banner(`Chapter ${run.chapter.num} complete`, 'The Miasma lifts, and the colour comes flooding back.', 4);
  $('bossbar').hidden = true;
}

// ------------------------------------------------------------------ spatial hash
const HC = 2;
const grid = new Map();
const hkey = (ix, iz) => (ix + 512) * 1024 + (iz + 512);
function rebuildHash() {
  for (const arr of grid.values()) arr.length = 0;
  for (const e of enemies) {
    if (e.dead) continue;
    const k = hkey(Math.floor(e.x / HC), Math.floor(e.z / HC));
    let a = grid.get(k);
    if (!a) { a = []; grid.set(k, a); }
    a.push(e);
  }
}
function query(x, z, r, out) {
  out.length = 0;
  const pad = 2;
  const x0 = Math.floor((x - r - pad) / HC), x1 = Math.floor((x + r + pad) / HC);
  const z0 = Math.floor((z - r - pad) / HC), z1 = Math.floor((z + r + pad) / HC);
  for (let ix = x0; ix <= x1; ix++) {
    for (let iz = z0; iz <= z1; iz++) {
      const a = grid.get(hkey(ix, iz));
      if (!a) continue;
      for (const e of a) {
        if (e.dead || e.spawnT > 0) continue;
        const dx = e.x - x, dz = e.z - z, rr = r + e.r;
        if (dx * dx + dz * dz <= rr * rr) out.push(e);
      }
    }
  }
  return out;
}
const QA = [], QB = [], QC = [];
function nearest(x, z, maxR, exclude) {
  let best = null, bd = maxR * maxR;
  for (const e of enemies) {
    if (e.dead || e.spawnT > 0 || (exclude && exclude.includes(e))) continue;
    const dx = e.x - x, dz = e.z - z, d = dx * dx + dz * dz;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function bossNear(x, z, maxR) {
  for (const b of run.bosses) {
    if (b.dead || b.spawnT > 0 || (b.y || 0) > 2) continue;
    if (Math.hypot(b.x - x, b.z - z) < maxR + b.r) return b;
  }
  return null;
}
function nearestN(x, z, maxR, n) {
  const list = [];
  for (const e of enemies) {
    if (e.dead || e.spawnT > 0) continue;
    const dx = e.x - x, dz = e.z - z, d = dx * dx + dz * dz;
    if (d < maxR * maxR) list.push([d, e]);
  }
  list.sort((a, b) => a[0] - b[0]);
  return list.slice(0, n).map((x) => x[1]);
}

// ------------------------------------------------------------------ spawning
function hpScale(t) { const m = t / 60; return 1 + m * 0.32 + m * m * 0.045; }

function spawnPos(minD = 15, maxD = 20) {
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * TAU, d = rand(minD, maxD);
    let x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
    const th = Math.atan2(z, x), r = Math.hypot(x, z), wr = VX.walkRadius(th) - 0.3;
    if (r > wr) { x *= wr / r; z *= wr / r; }
    if (Math.hypot(x - p.x, z - p.z) > 8 || i === 9) return [x, z];
  }
  return [0, 0];
}

function spawnEnemy(type, x, z, opts = {}) {
  if (enemies.length >= MAX_ENEMIES && !opts.force) return null;
  const T = ENEMIES[type];
  const t = run.time;
  if (x === undefined) [x, z] = spawnPos();
  const elite = !!opts.elite;
  const chMul = run.chapter ? run.chapter.hp : 1;
  const hp = Math.round(T.hp * hpScale(t) * run.diff.hp * chMul * (elite ? 14 : 1));
  const e = {
    type, x, z, kx: 0, kz: 0, hp, maxHp: hp, r: T.r * (elite ? 1.8 : 1), mass: elite ? 4 : 1,
    speed: T.speed * (1 + (t / 60) * 0.03) * (elite ? 0.85 : 1) * rand(0.9, 1.1),
    dmg: T.dmg * (elite ? 1.6 : 1), xp: Math.round(T.xp * (1 + t / 300) * (elite ? 12 : 1)), elite,
    spawnT: 0.45, flash: 0, anim: Math.random() * 10, seed: Math.random() * 100, face: 0,
    timer: rand(1.5, 3), st: 'walk', dx: 0, dz: 0, orbitT: 0, carrotT: 0, dead: false,
  };
  enemies.push(e);
  burst(x, 0.1, z, DUST, 4, 2, 0.14, false, 4);
  return e;
}

function pickType(t) {
  let w;
  if (run.chapter) {
    const mix = run.chapter.mix;
    w = Object.entries(mix).map(([k, v]) => [k, (k === 'spitbud' || k === 'beetle') && t < 40 ? 0 : (k === 'shroom' && t < 25 ? 0 : v)]);
  } else {
    w = [
      ['gloop', t < 120 ? 10 : 6],
      ['flutter', t > 40 ? 5 : 0],
      ['shroom', t > 95 ? 3 + t / 120 : 0],
      ['spitbud', t > 135 ? 2.2 : 0],
      ['beetle', t > 210 ? 2.8 : 0],
    ];
  }
  let sum = 0;
  for (const [, v] of w) sum += v;
  let r = Math.random() * sum;
  for (const [k, v] of w) { if ((r -= v) <= 0) return k; }
  return 'gloop';
}

function spawnUpdate(dt) {
  const t = run.time;
  let rate = (2.2 + t * 0.045 + Math.pow(t / 60, 2) * 0.33) * run.diff.spawn * (run.chapter ? run.chapter.spawn : 1);
  if (run.bosses.length) rate *= 0.45;
  if (run.victoryT > 0) rate = 0;
  run.spawnAcc += rate * dt;
  while (run.spawnAcc >= 1) {
    run.spawnAcc -= 1;
    spawnEnemy(pickType(t));
  }
  if (t >= run.nextElite && run.victoryT <= 0) {
    run.nextElite += 55;
    const e = spawnEnemy(pickType(t), undefined, undefined, { elite: true, force: true });
    if (e) banner('A great Miasma appears!', 'Defeat it for a strongbox of treasure.', 2.2);
  }
  if (!run.chapter) while (run.eventIdx < EVENTS.length && t >= EVENTS[run.eventIdx].t) triggerEvent(EVENTS[run.eventIdx++]);
}

function clampedAround(cx, cz, a, d) {
  const o = { x: cx + Math.cos(a) * d, z: cz + Math.sin(a) * d };
  clampIsland(o, -0.3);
  return o;
}

function triggerEvent(ev) {
  if (ev.kind === 'boss') { spawnBoss(ev.boss); return; }
  if (ev.kind === 'night') {
    sound.night = true;
    banner('Night falls', ev.text);
    return;
  }
  banner(ev.text, '', 2.4);
  sfx('warn');
  if (ev.kind === 'flock') {
    const a = Math.random() * TAU;
    for (let i = 0; i < ev.n; i++) {
      const o = clampedAround(p.x, p.z, a + rand(-0.35, 0.35), rand(15, 20));
      spawnEnemy(ev.type, o.x, o.z, { force: true });
    }
  } else if (ev.kind === 'ring') {
    const types = ['gloop', 'flutter', 'shroom'];
    for (let i = 0; i < ev.n; i++) {
      const o = clampedAround(p.x, p.z, (i / ev.n) * TAU, 11.5);
      spawnEnemy(ev.type === 'mix' ? types[i % 3] : ev.type, o.x, o.z, { force: true });
    }
  }
}

function spawnBoss(id) {
  const B = BOSSES[id];
  const [x, z] = spawnPos(12, 14);
  const hp = Math.round(B.hp * run.diff.hp);
  const e = {
    type: B.model, boss: id, kind: B.model, x, z, kx: 0, kz: 0, hp, maxHp: hp, r: B.r * B.size, mass: 99,
    speed: B.speed, dmg: B.dmg, xp: 0, spawnT: 1.2, flash: 0, anim: 0, face: 0, timer: 2.5, st: 'walk', dead: false,
    y: 0, tx: 0, tz: 0, fx: 0, fz: 0, waves: 0, attackIdx: 0, orbitT: 0, carrotT: 0, elite: false, seed: 0,
  };
  enemies.push(e);
  run.bosses.push(e);
  bossModel(id).visible = true;
  sound.intensity = 3;
  sfx('boss');
  shake(0.6);
  banner(B.name, B.hint, 3);
  $('boss-name').textContent = B.name;
  $('bossbar').hidden = false;
  burst(x, 0.2, z, DUST, 30, 6, 0.3, false, 5);
}

// ------------------------------------------------------------------ effects
const DUST = ['#e9d7b0', '#cfb98f', '#f4ead2'].map(rgbOf);
const SPARK = ['#9ef0ff', '#ffffff', '#6ae4ff'].map(rgbOf);
const GOLD = ['#ffd23f', '#fff1a8', '#ff9f1c'].map(rgbOf);
const ZAPC = ['#fff59e', '#ffffff', '#ffe066'].map(rgbOf);
const LEAFC = ['#7ed957', '#a6e36b', '#5fb84a'].map(rgbOf);
const SMOKE = ['#8a8a92', '#a0a0a8', '#76767e'].map(rgbOf);
const BLOOMC = FLOWER_COLORS.map(rgbOf);
const ENEMY_RGB = {};
for (const [k, v] of Object.entries(ENEMIES)) ENEMY_RGB[k] = v.colors.map(rgbOf);
ENEMY_RGB.king = ['#6b4fc0', '#8f72e0', '#ffd23f'].map(rgbOf);
ENEMY_RGB.golem = ['#5d5878', '#c38bff', '#ff4fd8'].map(rgbOf);

function burst(x, y, z, palette, n, speed, size, glow = false, up = 5) {
  const list = glow ? glows : particles;
  const cap = glow ? glowPool.cap - 200 : partPool.cap;
  for (let i = 0; i < n; i++) {
    if (list.length >= cap) return;
    const a = Math.random() * TAU, s = speed * rand(0.4, 1);
    const life = rand(0.45, 0.9);
    list.push({
      x, y, z, vx: Math.cos(a) * s, vy: rand(0.4, 1) * up, vz: Math.sin(a) * s,
      life, max: life, s: size * rand(0.7, 1.3), c: palette[(Math.random() * palette.length) | 0],
      rx: Math.random() * TAU, ry: Math.random() * TAU, vr: rand(-8, 8), grav: glow ? 4 : 18,
    });
  }
}

function shake(a) { if (save.settings.shake) shakeAmt = Math.min(1.2, shakeAmt + a); }

function addNumber(x, y, z, val, crit, color) {
  if (!save.settings.numbers && typeof val === 'number') return;
  if (numbers.length > 70) numbers.shift();
  numbers.push({ x, y, z, text: String(val), crit, t: 0, life: crit ? 0.9 : 0.65, color, ox: rand(-12, 12) });
}

let bannerTimer = null;
function banner(title, sub = '', dur = 2.8) {
  const el = $('banner');
  $('banner-title').textContent = title;
  $('banner-sub').textContent = sub;
  el.hidden = false;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => { el.hidden = true; }, dur * 1000);
}

function screenFlash(color) {
  const el = $('flash');
  el.style.background = color;
  el.classList.remove('go');
  void el.offsetWidth;
  el.classList.add('go');
}

let toastTimer = null;
function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.hidden = false;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

// ------------------------------------------------------------------ bloom
function applyCellColor(c, v) {
  const verts = island.cellVerts[c];
  const arr = island.colorAttr.array, g = island.gloom, b = island.bloom;
  for (let k = 0; k < verts.length; k++) {
    const o = verts[k] * 3;
    arr[o] = g[o] + (b[o] - g[o]) * v;
    arr[o + 1] = g[o + 1] + (b[o + 1] - g[o + 1]) * v;
    arr[o + 2] = g[o + 2] + (b[o + 2] - g[o + 2]) * v;
  }
  for (const pr of cellProps[c]) {
    pr.pool.tint(pr.i, lerp(GLOOM_TINT[0], 1, v), lerp(GLOOM_TINT[1], 1, v), lerp(GLOOM_TINT[2], 1, v));
  }
}

function bloomCell(c, delay = 0, silent = false) {
  if (c < 0 || cellTarget[c]) return;
  cellTarget[c] = 1;
  cellDelay[c] = delay;
  if (!cellCountable[c] || !run) return;
  run.bloomed++;
  const cx = c % CN, cz = (c / CN) | 0;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const nx = cx + dx, nz = cz + dz;
    if (nx < 0 || nz < 0 || nx >= CN || nz >= CN) continue;
    const n = nz * CN + nx;
    if (!cellCountable[n] && !cellTarget[n]) { cellTarget[n] = 1; cellDelay[n] = delay + 0.3; }
  }
  if (silent) return;
  const pct = run.bloomed / countableTotal;
  const next = (run.milestones + 1) * 0.2;
  if (pct >= next - 1e-6 && run.milestones < 5) {
    run.milestones++;
    const m = Math.round(next * 100);
    banner(`The land is ${m}% coloured again!`, 'The Miasma recoils. A strongbox has appeared.', 2.6);
    sfx('bloom');
    p.hp = Math.min(stats.maxHp, p.hp + stats.maxHp * 0.15);
    const [x, z] = nearbyFree(2.5);
    items.push({ kind: 'chest', x, z, t: 0, src: 'bloom' });
    burst(p.x, 0.5, p.z, BLOOMC, 30, 6, 0.16, true, 6);
  }
}

function nearbyFree(d) {
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * TAU;
    const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
    if (Math.hypot(x, z) < VX.walkRadius(Math.atan2(z, x)) - 0.5 && freeSpot(x, z, 0.6)) return [x, z];
  }
  return [p.x, p.z];
}

function spawnFlower(x, z, force = false) {
  const c = cellAt(x, z);
  if (c < 0) return;
  if (!force && cellFlowers[c] >= 6 && Math.random() > 0.12) return;
  if (flowers.length >= FLOWER_CAP) return;
  const th = Math.atan2(z, x);
  if (Math.hypot(x, z) > VX.islandRadius(th) - 1.1) return;
  flowers.push({ x, z, k: (Math.random() * FLOWER_COLORS.length) | 0, rot: Math.random() * TAU, g: 0, s: rand(0.85, 1.25) });
  cellFlowers[c]++;
  if (cellFlowers[c] >= 3) bloomCell(c);
}

function updateCells(dt) {
  let changed = false;
  for (let c = 0; c < cellCount; c++) {
    const target = cellTarget[c];
    if (cellBloom[c] === target) continue;
    if (cellDelay[c] > 0) { cellDelay[c] -= dt; continue; }
    const v = target ? Math.min(1, cellBloom[c] + dt * 1.6) : Math.max(0, cellBloom[c] - dt * 3);
    cellBloom[c] = v;
    applyCellColor(c, v);
    changed = true;
  }
  if (changed) {
    island.colorAttr.needsUpdate = true;
    for (const pl of [...treePools, tuftPool, reedPool]) pl.m.instanceColor.needsUpdate = true;
  }
}

function bloomWave(cx0, cz0) {
  for (let c = 0; c < cellCount; c++) {
    if (cellTarget[c]) continue;
    const wx = (c % CN) * VX.CELL - HALF + 2, wz = ((c / CN) | 0) * VX.CELL - HALF + 2;
    const d = Math.hypot(wx - cx0, wz - cz0);
    cellTarget[c] = 1;
    cellDelay[c] = d * 0.045;
    if (run && cellCountable[c]) run.bloomed++;
  }
  for (let i = 0; i < 500; i++) {
    const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 29;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (freeSpot(x, z, 0.3)) spawnFlower(x, z, true);
  }
}

// ------------------------------------------------------------------ combat
function damageEnemy(e, base, dirx, dirz, kb = 1.5) {
  if (e.dead || e.spawnT > 0) return;
  let dmg = base * stats.dmgMult;
  let crit = false;
  if (Math.random() < stats.crit) { dmg *= 2; crit = true; }
  dmg = Math.max(1, Math.round(dmg * rand(0.9, 1.1)));
  e.hp -= dmg;
  e.flash = 0.09;
  if (!e.boss) {
    const k = kb / e.mass;
    e.kx += dirx * k * 3;
    e.kz += dirz * k * 3;
  }
  run.damage += dmg;
  const hgt = e.boss ? (e.kind === 'golem' ? 3.4 : 3) : e.elite ? 1.6 : 0.9;
  addNumber(e.x, hgt + (e.y || 0), e.z, dmg, crit, crit ? '#ffd23f' : '#ffffff');
  sfx('hit');
  if (e.boss && Math.random() < 0.3) burst(e.x, 1.5, e.z, ENEMY_RGB[e.kind], 2, 3, 0.2);
  if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e, quiet = false) {
  if (e.dead) return;
  e.dead = true;
  run.kills++;
  if (run.time - run.lastKill < 1.2) run.combo++;
  else run.combo = 1;
  run.lastKill = run.time;
  run.bestCombo = Math.max(run.bestCombo, run.combo);
  const pal = ENEMY_RGB[e.boss ? e.kind : e.type];
  const y0 = e.boss ? 1.5 : ENEMIES[e.type] && ENEMIES[e.type].fly ? 0.9 : 0.4;
  burst(e.x, y0, e.z, pal, e.boss ? 60 : e.elite ? 26 : LOW ? 6 : 10, e.boss ? 9 : 5, e.boss ? 0.35 : 0.17);
  if (!quiet) sfx('pop');
  if (e.boss) { bossDefeated(e); return; }
  dropSeed(e.x, e.z, e.xp);
  if (Math.random() < 0.72) spawnFlower(e.x + rand(-0.4, 0.4), e.z + rand(-0.4, 0.4));
  if (e.elite) {
    items.push({ kind: 'chest', x: e.x, z: e.z, t: 0, src: 'elite' });
    for (let i = 0; i < 5; i++) items.push({ kind: 'coin', x: e.x + rand(-1, 1), z: e.z + rand(-1, 1), t: 0 });
    for (let i = 0; i < 4; i++) spawnFlower(e.x + rand(-1.2, 1.2), e.z + rand(-1.2, 1.2), true);
    shake(0.25);
    return;
  }
  // Drop table: shillings, healing (willow-bark tea is three times as common in the fever), honey, pine cone.
  const r = Math.random();
  const heal = run.fever ? 0.036 : 0.012;
  if (r < 0.035) items.push({ kind: 'coin', x: e.x, z: e.z, t: 0 });
  else if (r < 0.035 + heal) items.push({ kind: 'apple', x: e.x, z: e.z, t: 0 });
  else if (r < 0.035 + heal + 0.0035) items.push({ kind: 'honey', x: e.x, z: e.z, t: 0 });
  else if (r < 0.035 + heal + 0.006) items.push({ kind: 'cone', x: e.x, z: e.z, t: 0 });
}

function dropSeed(x, z, v) {
  if (seeds.length >= gemPool.cap - 10) {
    const s = seeds[(Math.random() * seeds.length) | 0];
    s.v += v;
    return;
  }
  seeds.push({ x: x + rand(-0.2, 0.2), z: z + rand(-0.2, 0.2), v, mag: false, sp: 0, b: Math.random() * 10 });
}

function bossDefeated(e) {
  const m = bossModels[e.boss];
  if (m) m.visible = false;
  run.bosses = run.bosses.filter((b) => b !== e);
  shake(1);
  hitStop = 0.25;
  screenFlash('rgba(255,255,255,0.7)');
  sfx('boom');
  if (!run.bosses.length) $('bossbar').hidden = true;
  if (run.chapter) {
    for (let i = 0; i < 10; i++) items.push({ kind: 'coin', x: e.x + rand(-2.5, 2.5), z: e.z + rand(-2.5, 2.5), t: 0 });
    for (let i = 0; i < 26; i++) spawnFlower(e.x + rand(-3, 3), e.z + rand(-3, 3), true);
    const o = curObj();
    if (o && o.type === 'boss' && o.boss === e.boss) completeObjective();
    return;
  }
  if (e.boss === 'king') {
    run.kingDead = true;
    banner('King Miasma is defeated!', 'Grab his strongbox. The Gloom Golem is coming.', 3);
    items.push({ kind: 'chest', x: e.x, z: e.z, t: 0, src: 'boss' });
    for (let i = 0; i < 18; i++) items.push({ kind: 'coin', x: e.x + rand(-2.5, 2.5), z: e.z + rand(-2.5, 2.5), t: 0 });
    for (let i = 0; i < 24; i++) dropSeed(e.x + rand(-2.5, 2.5), e.z + rand(-2.5, 2.5), 6);
    for (let i = 0; i < 26; i++) spawnFlower(e.x + rand(-3, 3), e.z + rand(-3, 3), true);
    sound.intensity = 2;
  } else {
    run.won = true;
    run.victoryT = 4.2;
    timeScale = 0.35;
    p.inv = 99;
    for (const o of enemies) if (!o.dead) killEnemy(o, true);
    orbs = [];
    for (let i = 0; i < 40; i++) items.push({ kind: 'coin', x: e.x + rand(-3, 3), z: e.z + rand(-3, 3), t: 0 });
    bloomWave(e.x, e.z);
    sfx('victory');
    sound.night = false;
    sound.intensity = 1;
    banner('Dawn at last!', 'The Miasma fades and every field blooms again.', 4);
  }
}

function knockedDown(reason, years) {
  if (run.chances > 1) {
    run.chances--;
    run.knockdowns++;
    addLedger(years, reason);
    p.hp = stats.maxHp * 0.7;
    p.inv = 2.5;
    banner(`${reason}! ${run.chances} ${run.chances === 1 ? 'chance' : 'chances'} left`, run.practice ? 'Back on your feet.' : `${years} years of life expectancy.`, 2.6);
    sfx('heal');
    bombAll(10);
    return true;
  }
  run.chances = 0;
  p.hp = 0;
  run.deathT = 1.8;
  timeScale = 0.3;
  sfx('over');
  burst(p.x, 0.8, p.z, LEAFC, 30, 6, 0.2);
  return false;
}

function hurtPlayer(raw, srcx, srcz) {
  if (p.inv > 0 || p.dashT > 0 || run.victoryT > 0 || run.deathT > 0 || window.__god || save.codes.god) return;
  const dmg = Math.max(1, Math.round(raw * run.diff.dmg * (1 + (run.time / 60) * 0.08) - stats.armor));
  p.hp -= dmg;
  p.inv = 0.8;
  p.flash = 0.25;
  addNumber(p.x, 1.9, p.z, dmg, false, '#ff5d5d');
  shake(0.35);
  hitStop = Math.max(hitStop, 0.045);
  sfx('hurt');
  if (srcx !== undefined) {
    const dx = p.x - srcx, dz = p.z - srcz, d = Math.hypot(dx, dz) || 1;
    p.vx += (dx / d) * 6; p.vz += (dz / d) * 6;
  }
  if (p.hp > 0) return;
  if (run.chapter) { knockedDown('Knocked down by the Miasma', -2); return; }
  if (run.revive) {
    run.revive = false;
    p.hp = stats.maxHp * 0.6;
    p.inv = 2.5;
    banner('Another chance!', 'Pip is back on his feet.', 2.4);
    sfx('heal');
    bombAll(10);
  } else {
    p.hp = 0;
    run.deathT = 1.8;
    timeScale = 0.3;
    sfx('over');
    burst(p.x, 0.8, p.z, LEAFC, 30, 6, 0.2);
  }
}

function hurtNpc(n, raw) {
  if (!n.maxHp || n.inv > 0 || run.victoryT > 0 || run.deathT > 0 || save.codes.god || window.__god) return;
  n.hp -= raw * run.diff.dmg * 0.5;
  n.inv = 0.8;
  n.flash = 0.25;
  n.calm = 0;
  if (n.hp <= 0) {
    n.hp = n.maxHp;
    n.inv = 2.5;
    const saved = knockedDown('Provis was struck down', -1);
    if (saved) {
      fx(ringFx, { x: n.x, z: n.z, r0: 0.5, r1: 8, life: 0.6, color: '#ffd23f', op: 0.9 });
      for (const e of enemies) if (!e.dead && !e.boss && Math.hypot(e.x - n.x, e.z - n.z) < 8) killEnemy(e, true);
    }
  }
}

function bombAll(radius) {
  fx(ringFx, { x: p.x, z: p.z, r0: 0.5, r1: radius, life: 0.6, color: '#ffd23f', op: 0.9 });
  shake(0.6);
  sfx('boom');
  for (const e of enemies) {
    if (e.dead || e.boss) continue;
    if (Math.hypot(e.x - p.x, e.z - p.z) < radius) killEnemy(e, true);
  }
}

// ------------------------------------------------------------------ weapons
const leafPos = [];
function updateWeapons(dt) {
  leafPos.length = 0;
  for (const w of p.weapons) {
    const L = WEAPONS[w.id].lv[w.level - 1];
    if (w.id === 'orbit') {
      w.a += L.spin * dt;
      const R = L.r * stats.area;
      for (let i = 0; i < L.n; i++) {
        const a = w.a + (i / L.n) * TAU;
        const x = p.x + Math.cos(a) * R, z = p.z + Math.sin(a) * R;
        leafPos.push(x, z, a);
        for (const e of query(x, z, 0.65 * stats.area, QA)) {
          if (e.orbitT > run.time) continue;
          e.orbitT = run.time + 0.34;
          const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz) || 1;
          damageEnemy(e, L.dmg, dx / d, dz / d, 1.8);
        }
      }
      continue;
    }
    w.t -= dt;
    if (w.t > 0) continue;
    const cd = L.cd * stats.cdMult;
    switch (w.id) {
      case 'spark': {
        const targets = nearestN(p.x, p.z, 14, L.n);
        const boss = bossNear(p.x, p.z, 14);
        if (boss && !targets.includes(boss)) targets.unshift(boss);
        if (!targets.length) { w.t = 0.12; break; }
        for (let i = 0; i < L.n; i++) {
          const e = targets[i % targets.length];
          const spread = i >= targets.length ? (i - targets.length + 1) * 0.18 : 0;
          const a = Math.atan2(e.z - p.z, e.x - p.x) + spread;
          bolts.push({ x: p.x, z: p.z, vx: Math.cos(a) * 17, vz: Math.sin(a) * 17, life: 1.1, dmg: L.dmg, pierce: e === boss ? L.pierce + 4 : L.pierce, hit: [] });
        }
        sfx('spark');
        w.t = cd;
        break;
      }
      case 'stomp': {
        const R = L.r * stats.area;
        for (const e of query(p.x, p.z, R, QA)) {
          const dx = e.x - p.x, dz = e.z - p.z, d = Math.hypot(dx, dz) || 1;
          damageEnemy(e, L.dmg, dx / d, dz / d, 2.6);
        }
        fx(ringFx, { x: p.x, z: p.z, r0: 0.4, r1: R, life: 0.45, color: '#ffe8a8', op: 0.95 });
        fx(discFx, { x: p.x, z: p.z, r0: 0.4, r1: R, life: 0.3, color: '#fff4d0', op: 0.35 });
        burst(p.x, 0.1, p.z, DUST, LOW ? 8 : 14, R * 2, 0.16, false, 3);
        p.squash = 1;
        shake(0.12);
        sfx('stomp');
        w.t = cd;
        break;
      }
      case 'carrot': {
        const t0 = bossNear(p.x, p.z, 12) || nearest(p.x, p.z, 12);
        const base = t0 ? Math.atan2(t0.z - p.z, t0.x - p.x) : Math.atan2(Math.cos(p.face), Math.sin(p.face));
        for (let i = 0; i < L.n; i++) {
          const a = base + (i - (L.n - 1) / 2) * 0.55;
          carrots.push({ x: p.x, z: p.z, dx: Math.cos(a), dz: Math.sin(a), dist: 0, range: L.range, back: false, spin: 0, dmg: L.dmg, sp: 15 });
        }
        sfx('throw');
        w.t = cd;
        break;
      }
      case 'bees': {
        for (let i = 0; i < L.n; i++) {
          const a = Math.random() * TAU;
          bees.push({ x: p.x, z: p.z, vx: Math.cos(a) * 5, vz: Math.sin(a) * 5, life: 3.2, dmg: L.dmg, tgt: null, ph: Math.random() * 10, sp: w.level >= 5 ? 11 : 9 });
        }
        sfx('bee');
        w.t = cd;
        break;
      }
      case 'zap': {
        const first = bossNear(p.x, p.z, 9) || nearest(p.x, p.z, 9);
        if (!first) { w.t = 0.15; break; }
        const hit = [];
        let cx = p.x, cz = p.z, cur = first;
        for (let k = 0; k < L.chain && cur; k++) {
          hit.push(cur);
          beams.push({ ax: cx, az: cz, bx: cur.x, bz: cur.z, life: 0.16 });
          const dx = cur.x - cx, dz = cur.z - cz, d = Math.hypot(dx, dz) || 1;
          damageEnemy(cur, L.dmg, dx / d, dz / d, 0.6);
          burst(cur.x, 0.8, cur.z, ZAPC, 3, 3, 0.1, true, 3);
          cx = cur.x; cz = cur.z;
          cur = nearest(cx, cz, 5, hit);
        }
        sfx('zap');
        w.t = cd;
        break;
      }
      case 'meteor': {
        const near = nearestN(p.x, p.z, 13, 12);
        const boss = bossNear(p.x, p.z, 13);
        for (let i = 0; i < L.n; i++) {
          let x, z;
          if (boss && i % 2 === 0) {
            x = boss.x + rand(-0.8, 0.8); z = boss.z + rand(-0.8, 0.8);
          } else if (near.length) {
            const e = near[(Math.random() * near.length) | 0];
            x = e.x + rand(-0.6, 0.6); z = e.z + rand(-0.6, 0.6);
          } else {
            const a = Math.random() * TAU, d = rand(3, 8);
            x = p.x + Math.cos(a) * d; z = p.z + Math.sin(a) * d;
          }
          const R = L.r * stats.area;
          const delay = i * 0.12;
          meteors.push({ x, z, t: 0.65 + delay, max: 0.65 + delay, r: R, dmg: L.dmg, rot: Math.random() * TAU });
          fx(discFx, { x, z, r0: R, r1: R, life: 0.65 + delay, color: '#ff9f43', op: 0.4, grow: false, pulse: true });
        }
        w.t = cd;
        break;
      }
      default:
        w.t = 1;
    }
  }
}

function updateProjectiles(dt) {
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i];
    b.x += b.vx * dt; b.z += b.vz * dt; b.life -= dt;
    let dead = b.life <= 0;
    if (!dead) {
      for (const e of query(b.x, b.z, 0.3 * stats.area, QB)) {
        if (b.hit.includes(e)) continue;
        b.hit.push(e);
        const d = Math.hypot(b.vx, b.vz) || 1;
        damageEnemy(e, b.dmg, b.vx / d, b.vz / d, 1);
        burst(b.x, 0.8, b.z, SPARK, 3, 3, 0.09, true, 2);
        if (--b.pierce < 0) { dead = true; break; }
      }
    }
    if (Math.random() < 0.5 && glows.length < glowPool.cap - 200) glows.push({ x: b.x, y: 0.8, z: b.z, vx: 0, vy: 0.5, vz: 0, life: 0.2, max: 0.2, s: 0.12, c: SPARK[0], rx: 0, ry: 0, vr: 0, grav: 0 });
    if (dead) bolts.splice(i, 1);
  }
  for (let i = carrots.length - 1; i >= 0; i--) {
    const c = carrots[i];
    c.spin += dt * 16;
    if (!c.back) {
      const sp = 4 + 12 * (1 - c.dist / c.range);
      c.x += c.dx * sp * dt; c.z += c.dz * sp * dt; c.dist += sp * dt;
      if (c.dist >= c.range * 0.98) c.back = true;
    } else {
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz) || 1;
      c.sp = Math.min(24, c.sp + dt * 20);
      c.x += (dx / d) * c.sp * dt; c.z += (dz / d) * c.sp * dt;
      if (d < 0.8) { carrots.splice(i, 1); continue; }
    }
    for (const e of query(c.x, c.z, 0.55 * stats.area, QB)) {
      if (e.carrotT > run.time) continue;
      e.carrotT = run.time + 0.3;
      const dx = e.x - c.x, dz = e.z - c.z, d = Math.hypot(dx, dz) || 1;
      damageEnemy(e, c.dmg, dx / d, dz / d, 1.4);
    }
  }
  for (let i = bees.length - 1; i >= 0; i--) {
    const b = bees[i];
    b.life -= dt; b.ph += dt * 12;
    if (b.life <= 0) { bees.splice(i, 1); continue; }
    if (!b.tgt || b.tgt.dead) b.tgt = (Math.random() < 0.5 && bossNear(b.x, b.z, 10)) || nearest(b.x, b.z, 10);
    let tx, tz;
    if (b.tgt) { tx = b.tgt.x; tz = b.tgt.z; } else { tx = p.x + Math.cos(b.ph * 0.3) * 2; tz = p.z + Math.sin(b.ph * 0.3) * 2; }
    const dx = tx - b.x, dz = tz - b.z, d = Math.hypot(dx, dz) || 1;
    const k = Math.min(1, dt * 7);
    b.vx += ((dx / d) * b.sp - b.vx) * k + Math.cos(b.ph) * 0.6;
    b.vz += ((dz / d) * b.sp - b.vz) * k + Math.sin(b.ph * 1.3) * 0.6;
    b.x += b.vx * dt; b.z += b.vz * dt;
    if (b.tgt && d < b.tgt.r + 0.25) {
      damageEnemy(b.tgt, b.dmg, dx / d, dz / d, 0.5);
      bees.splice(i, 1);
    }
  }
  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i];
    m.t -= dt;
    if (m.t > 0) continue;
    for (const e of query(m.x, m.z, m.r, QB)) {
      const dx = e.x - m.x, dz = e.z - m.z, d = Math.hypot(dx, dz) || 1;
      damageEnemy(e, m.dmg, dx / d, dz / d, 2);
    }
    fx(ringFx, { x: m.x, z: m.z, r0: 0.3, r1: m.r * 1.15, life: 0.4, color: '#ffb347', op: 0.9 });
    burst(m.x, 0.3, m.z, METEORC, LOW ? 8 : 14, 6, 0.18, false, 7);
    burst(m.x, 0.3, m.z, GOLD, 6, 4, 0.12, true, 5);
    shake(0.1);
    sfx('boom');
    meteors.splice(i, 1);
  }
  for (let i = beams.length - 1; i >= 0; i--) {
    beams[i].life -= dt;
    if (beams[i].life <= 0) beams.splice(i, 1);
  }
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    o.x += o.vx * dt; o.z += o.vz * dt; o.life -= dt;
    if (o.life <= 0) { orbs.splice(i, 1); continue; }
    let hit = false;
    if (Math.hypot(o.x - p.x, o.z - p.z) < 0.7) { hurtPlayer(o.dmg, o.x, o.z); hit = true; }
    else for (const n of npcs) if (n.maxHp && Math.hypot(o.x - n.x, o.z - n.z) < 0.7) { hurtNpc(n, o.dmg); hit = true; break; }
    if (hit) {
      burst(o.x, 0.8, o.z, ORBC, 6, 3, 0.1, true);
      orbs.splice(i, 1);
    }
  }
}
const METEORC = ['#d9a066', '#6b4226', '#ff9f43'].map(rgbOf);
const ORBC = ['#ff4fd8', '#ffffff'].map(rgbOf);

function fireOrb(x, z, a, speed, dmg) {
  orbs.push({ x, z, vx: Math.cos(a) * speed, vz: Math.sin(a) * speed, life: 5, dmg, rot: 0 });
}

// ------------------------------------------------------------------ enemies
function updateEnemies(dt) {
  const slow = save.codes.slow ? 0.5 : 1;
  const escort = npcs.find((n) => n.maxHp > 0);
  for (const e of enemies) {
    if (e.dead) continue;
    e.flash = Math.max(0, e.flash - dt);
    e.anim += dt * slow;
    if (e.spawnT > 0) { e.spawnT -= dt; continue; }
    if (e.boss) { updateBoss(e, dt * slow); continue; }
    const T = ENEMIES[e.type];
    let dx = p.x - e.x, dz = p.z - e.z;
    const d = Math.hypot(dx, dz) || 1;
    dx /= d; dz /= d;
    let vx = dx * e.speed, vz = dz * e.speed;
    if (e.type === 'flutter') {
      const w = Math.sin(e.anim * 3 + e.seed) * 0.7;
      vx += -dz * w * e.speed; vz += dx * w * e.speed;
    } else if (e.type === 'spitbud') {
      if (d < 6) { vx = -dx * e.speed * 0.7; vz = -dz * e.speed * 0.7; }
      else if (d < 9.5) { const s = Math.sin(e.seed) > 0 ? 1 : -1; vx = -dz * e.speed * 0.5 * s; vz = dx * e.speed * 0.5 * s; }
      e.timer -= dt * slow;
      if (e.timer <= 0 && d < 13) {
        e.timer = rand(2.4, 3.2) / (e.elite ? 1.6 : 1);
        const a = Math.atan2(p.z - e.z, p.x - e.x);
        fireOrb(e.x, e.z, a, 6.5 * slow, e.dmg);
        if (e.elite) { fireOrb(e.x, e.z, a + 0.3, 6.5 * slow, e.dmg); fireOrb(e.x, e.z, a - 0.3, 6.5 * slow, e.dmg); }
        sfx('shoot');
      }
    } else if (e.type === 'beetle') {
      e.timer -= dt * slow;
      if (e.st === 'walk' && d < 7.5 && e.timer <= 0) {
        e.st = 'wind'; e.timer = 0.65; e.dx = dx; e.dz = dz;
        fx(lineFx, { x: e.x, z: e.z, rot: Math.atan2(-dz, dx), len: 9, w: e.r * 1.6, life: 0.65 / slow, color: '#ff5d5d', op: 0.45 });
      } else if (e.st === 'wind') {
        vx = 0; vz = 0;
        if (e.timer <= 0) { e.st = 'dash'; e.timer = 0.6; }
      } else if (e.st === 'dash') {
        vx = e.dx * 13; vz = e.dz * 13;
        if (e.timer <= 0) { e.st = 'walk'; e.timer = rand(2, 3); }
      }
    }
    e.kx *= Math.exp(-9 * dt); e.kz *= Math.exp(-9 * dt);
    e.x += (vx * slow + e.kx) * dt; e.z += (vz * slow + e.kz) * dt;
    e.face = Math.atan2(e.st === 'dash' ? e.dx : dx, e.st === 'dash' ? e.dz : dz);
    const cellArr = grid.get(hkey(Math.floor(e.x / HC), Math.floor(e.z / HC)));
    if (cellArr) {
      let checks = 0;
      for (const o of cellArr) {
        if (o === e || o.dead) continue;
        if (++checks > 7) break;
        const ox = e.x - o.x, oz = e.z - o.z, rr = e.r + o.r;
        const dd = ox * ox + oz * oz;
        if (dd < rr * rr && dd > 1e-6) {
          const dl = Math.sqrt(dd), push = (rr - dl) * 0.5;
          e.x += (ox / dl) * push; e.z += (oz / dl) * push;
        }
      }
    }
    if (!T.fly) collideSolids(e, e.r);
    clampIsland(e, 0.6);
    const pd = Math.hypot(p.x - e.x, p.z - e.z);
    const minD = e.r + 0.42;
    if (pd < minD) {
      hurtPlayer(e.dmg, e.x, e.z);
      if (pd > 1e-4) { e.x = p.x - ((p.x - e.x) / pd) * minD; e.z = p.z - ((p.z - e.z) / pd) * minD; }
    }
    if (escort) {
      const nd = Math.hypot(escort.x - e.x, escort.z - e.z);
      if (nd < e.r + 0.45) {
        hurtNpc(escort, e.dmg * 0.8);
        if (nd > 1e-4) { e.x = escort.x - ((escort.x - e.x) / nd) * (e.r + 0.45); e.z = escort.z - ((escort.z - e.z) / nd) * (e.r + 0.45); }
      }
    }
  }
}

function collideSolids(o, r) {
  for (const t of solids) {
    const dx = o.x - t.x, dz = o.z - t.z, rr = r + t.r;
    if (Math.abs(dx) > rr || Math.abs(dz) > rr) continue;
    const d = Math.hypot(dx, dz);
    if (d < rr && d > 1e-5) { o.x = t.x + (dx / d) * rr; o.z = t.z + (dz / d) * rr; }
  }
}

function clampIsland(o, extra = 0) {
  const r = Math.hypot(o.x, o.z);
  const wr = VX.walkRadius(Math.atan2(o.z, o.x)) + extra;
  if (r > wr) { o.x *= wr / r; o.z *= wr / r; }
}

function updateBoss(e, dt) {
  const enraged = e.hp < e.maxHp * 0.45;
  const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz) || 1;
  if (e.kind === 'king') {
    const size = BOSSES[e.boss].size;
    const slamR = 3.6 * size;
    if (e.st === 'walk') {
      e.x += (dx / d) * e.speed * (enraged ? 1.3 : 1) * dt;
      e.z += (dz / d) * e.speed * (enraged ? 1.3 : 1) * dt;
      e.face = Math.atan2(dx, dz);
      e.timer -= dt;
      if (e.timer <= 0) {
        e.st = 'wind'; e.timer = enraged ? 0.5 : 0.7;
        const tgt = { x: p.x + p.vx * 0.3, z: p.z + p.vz * 0.3 };
        clampIsland(tgt, -0.5);
        e.tx = tgt.x; e.tz = tgt.z;
        fx(discFx, { x: e.tx, z: e.tz, r0: slamR, r1: slamR, life: e.timer + 0.85, color: '#ff4f6d', op: 0.38, grow: false, pulse: true });
        fx(ringFx, { x: e.tx, z: e.tz, r0: slamR, r1: slamR, life: e.timer + 0.85, color: '#ff4f6d', op: 0.9, grow: false, pulse: true });
        sfx('warn');
      }
    } else if (e.st === 'wind') {
      e.timer -= dt;
      if (e.timer <= 0) { e.st = 'air'; e.timer = 0.85; e.fx = e.x; e.fz = e.z; }
    } else if (e.st === 'air') {
      e.timer -= dt;
      const k = 1 - Math.max(0, e.timer) / 0.85;
      e.x = lerp(e.fx, e.tx, k); e.z = lerp(e.fz, e.tz, k);
      e.y = Math.sin(Math.PI * k) * 7;
      if (e.timer <= 0) {
        e.y = 0; e.st = 'walk'; e.timer = enraged ? 1.4 : 2.3;
        if (Math.hypot(p.x - e.x, p.z - e.z) < slamR) hurtPlayer(30, e.x, e.z);
        for (const n of npcs) if (n.maxHp && Math.hypot(n.x - e.x, n.z - e.z) < slamR) hurtNpc(n, 30);
        fx(ringFx, { x: e.x, z: e.z, r0: 1, r1: 6 * size, life: 0.5, color: '#c9b8ff', op: 0.95 });
        burst(e.x, 0.2, e.z, DUST, 26, 9, 0.24, false, 6);
        shake(0.55);
        sfx('stomp');
        for (const o of query(e.x, e.z, slamR, QC)) if (!o.boss) { const ox = o.x - e.x, oz = o.z - e.z, od = Math.hypot(ox, oz) || 1; o.kx += (ox / od) * 10; o.kz += (oz / od) * 10; }
        const n = enraged ? 5 : 3;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU;
          spawnEnemy('gloop', e.x + Math.cos(a) * 2.2, e.z + Math.sin(a) * 2.2, { force: true });
        }
      }
    }
  } else {
    e.timer -= dt;
    if (e.st === 'walk') {
      const sp = e.speed * (enraged ? 1.35 : 1);
      e.x += (dx / d) * sp * dt; e.z += (dz / d) * sp * dt;
      e.face = Math.atan2(dx, dz);
      if (e.timer <= 0) {
        const pattern = ['burst', 'charge', 'burst', 'summon'];
        e.st = pattern[e.attackIdx++ % pattern.length];
        if (e.st === 'burst') { e.timer = 0.7; e.waves = enraged ? 3 : 2; }
        if (e.st === 'charge') {
          e.timer = 0.95; e.tx = dx / d; e.tz = dz / d;
          fx(lineFx, { x: e.x, z: e.z, rot: Math.atan2(-e.tz, e.tx), len: 18, w: 2.6, life: 0.95, color: '#ff4fd8', op: 0.4 });
          sfx('warn');
        }
        if (e.st === 'summon') { e.timer = 0.8; }
      }
    } else if (e.st === 'burst') {
      if (e.timer <= 0) {
        const B = BOSSES[e.boss];
        const base = B.orbs || 16;
        const n = enraged ? base + 4 : base;
        const off = e.waves * 0.2;
        for (let i = 0; i < n; i++) fireOrb(e.x, e.z, (i / n) * TAU + off, (enraged ? 6 : 5.2) * (save.codes.slow ? 0.5 : 1), Math.round(B.dmg * 0.62));
        sfx('shoot');
        shake(0.15);
        e.waves--;
        e.timer = 0.5;
        if (e.waves <= 0) { e.st = 'walk'; e.timer = enraged ? 1.8 : 2.6; }
      }
    } else if (e.st === 'charge') {
      if (e.timer <= 0) { e.st = 'dash'; e.timer = 1.05; }
    } else if (e.st === 'dash') {
      e.x += e.tx * 15 * dt; e.z += e.tz * 15 * dt;
      e.face = Math.atan2(e.tx, e.tz);
      if (Math.random() < 0.5) burst(e.x, 0.1, e.z, DUST, 2, 3, 0.2, false, 3);
      if (e.timer <= 0) { e.st = 'walk'; e.timer = enraged ? 1.6 : 2.4; shake(0.3); }
    } else if (e.st === 'summon') {
      if (e.timer <= 0) {
        for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; spawnEnemy('flutter', e.x + Math.cos(a) * 3, e.z + Math.sin(a) * 3, { force: true }); }
        for (let i = 0; i < 2; i++) { const a = rand(0, TAU); spawnEnemy('beetle', e.x + Math.cos(a) * 3.5, e.z + Math.sin(a) * 3.5, { force: true }); }
        sfx('boss');
        e.st = 'walk'; e.timer = enraged ? 2 : 3;
      }
    }
  }
  clampIsland(e, 0);
  if ((e.y || 0) < 1.2) {
    const pd = Math.hypot(p.x - e.x, p.z - e.z);
    if (pd < e.r + 0.45) {
      hurtPlayer(e.dmg, e.x, e.z);
      if (pd > 1e-4) { p.x = e.x + ((p.x - e.x) / pd) * (e.r + 0.45); p.z = e.z + ((p.z - e.z) / pd) * (e.r + 0.45); }
    }
    for (const n of npcs) {
      if (!n.maxHp) continue;
      if (Math.hypot(n.x - e.x, n.z - e.z) < e.r + 0.45) hurtNpc(n, e.dmg);
    }
  }
}

// ------------------------------------------------------------------ pickups
function updatePickups(dt) {
  const mag = stats.magnet;
  for (let i = seeds.length - 1; i >= 0; i--) {
    const s = seeds[i];
    const dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz);
    if (!s.mag && (d < mag || run.vacuum > 0)) s.mag = true;
    if (s.mag) {
      s.sp = Math.min(30, s.sp + dt * 40);
      const v = Math.max(8, s.sp);
      s.x += (dx / (d || 1)) * v * dt; s.z += (dz / (d || 1)) * v * dt;
    }
    if (d < 0.6) {
      seeds.splice(i, 1);
      addXP(s.v);
      sfx('seed');
    }
  }
  if (run.vacuum > 0) run.vacuum -= dt;
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    it.t += dt;
    const dx = p.x - it.x, dz = p.z - it.z, d = Math.hypot(dx, dz);
    if (it.kind === 'coin' && (d < mag * 1.1 || it.mag || run.vacuum > 0) && run.deathT <= 0) {
      it.mag = true;
      const v = 10 + it.t * 4;
      it.x += (dx / (d || 1)) * v * dt; it.z += (dz / (d || 1)) * v * dt;
    }
    const reach = it.kind === 'chest' || it.kind === 'story' || it.kind === 'keepsake' ? 1.3 : 0.8;
    if (d < reach && it.t > 0.2 && run.deathT <= 0) {
      items.splice(i, 1);
      collect(it);
    }
  }
}

function collect(it) {
  switch (it.kind) {
    case 'coin':
      run.acorns++;
      sfx('coin');
      break;
    case 'apple':
      p.hp = Math.min(stats.maxHp, p.hp + 30);
      addNumber(p.x, 1.9, p.z, '+30', false, '#7ed957');
      if (run.fever) toast('Willow-bark tea cools the fever a little.');
      sfx('heal');
      break;
    case 'honey':
      run.vacuum = 1.2;
      banner('Honey jar!', 'Every seed nearby flies to you.', 1.8);
      sfx('heal');
      break;
    case 'cone':
      bombAll(14);
      banner('Pine-cone pop!', '', 1.4);
      break;
    case 'chest':
      openChest(it.src);
      break;
    case 'story':
      run.objState.done++;
      sfx('chest');
      burst(it.x, 0.8, it.z, GOLD, 16, 4, 0.12, true, 5);
      banner(`Found ${it.name}`, `${run.objState.done} of ${run.objState.n}`, 1.8);
      break;
    case 'keepsake': {
      const k = KEEPSAKES[it.id];
      run.keepsakeFound = true;
      save.keepsakes[it.id] = true;
      persist();
      sfx('chest');
      burst(it.x, 0.8, it.z, BLOOMC, 30, 5, 0.14, true, 6);
      banner(`Keepsake found: ${k.name}`, k.desc, 3.2);
      break;
    }
    default:
      break;
  }
}

function addXP(v) {
  p.xp += v;
  while (p.xp >= p.need) {
    p.xp -= p.need;
    p.level++;
    p.need = xpNeed(p.level);
    run.pendingLevels++;
  }
}

// ------------------------------------------------------------------ player
const keys = new Set();
const joy = { active: false, id: -1, ox: 0, oy: 0, x: 0, y: 0, vx: 0, vy: 0 };
let padDash = false, padPausePrev = false;

function readInput() {
  if (window.__bot) return window.__bot(p, enemies);
  let ix = 0, iz = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) iz -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) iz += 1;
  if (joy.active) { ix += joy.vx; iz += joy.vy; }
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  padDash = false;
  for (const gp of pads) {
    if (!gp) continue;
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    if (Math.hypot(ax, ay) > 0.2) { ix += ax; iz += ay; }
    if (gp.buttons[0] && gp.buttons[0].pressed) padDash = true;
    const pz = gp.buttons[9] && gp.buttons[9].pressed;
    if (pz && !padPausePrev) togglePause();
    padPausePrev = pz;
  }
  const l = Math.hypot(ix, iz);
  if (l > 1) { ix /= l; iz /= l; }
  return [ix, iz];
}

function tryDash() {
  if (state !== 'play' || !p || p.dashCd > 0 || run.deathT > 0) return;
  let dx = p.vx, dz = p.vz;
  const l = Math.hypot(dx, dz);
  if (l < 0.1) { dx = Math.sin(p.face); dz = Math.cos(p.face); } else { dx /= l; dz /= l; }
  p.dashX = dx; p.dashZ = dz;
  p.dashT = 0.2;
  p.dashCd = 1.3;
  p.inv = Math.max(p.inv, 0.32);
  sfx('dash');
  burst(p.x, 0.3, p.z, DUST, 8, 3, 0.15, false, 2);
}

let nearJoe = false;
function updatePlayer(dt) {
  const [ix, iz] = run.deathT > 0 ? [0, 0] : readInput();
  if (padDash) tryDash();
  p.inv = Math.max(0, p.inv - dt);
  p.flash = Math.max(0, p.flash - dt);
  p.dashCd = Math.max(0, p.dashCd - dt);
  p.squash = Math.max(0, p.squash - dt * 4);
  if (Math.hypot(ix, iz) > 0.1 && !run.moved) run.moved = true;
  let mvx, mvz;
  if (p.dashT > 0) {
    p.dashT -= dt;
    mvx = p.dashX * 17; mvz = p.dashZ * 17;
    if (Math.random() < 0.7 && glows.length < glowPool.cap - 200) glows.push({ x: p.x + rand(-0.2, 0.2), y: rand(0.3, 1.2), z: p.z + rand(-0.2, 0.2), vx: 0, vy: 0, vz: 0, life: 0.25, max: 0.25, s: 0.16, c: LEAFC[1], rx: 0, ry: 0, vr: 0, grav: 0 });
  } else {
    mvx = ix * stats.speed; mvz = iz * stats.speed;
  }
  p.vx = lerp(p.vx, mvx, Math.min(1, dt * 14));
  p.vz = lerp(p.vz, mvz, Math.min(1, dt * 14));
  p.x += p.vx * dt; p.z += p.vz * dt;
  collideSolids(p, 0.4);
  for (const n of npcs) {
    const dx = p.x - n.x, dz = p.z - n.z, d = Math.hypot(dx, dz);
    if (d < 0.75 && d > 1e-4) { p.x = n.x + (dx / d) * 0.75; p.z = n.z + (dz / d) * 0.75; }
  }
  clampIsland(p, 0);
  const sp = Math.hypot(p.vx, p.vz);
  p.moving = sp > 0.5;
  if (p.moving) {
    const target = Math.atan2(p.vx, p.vz);
    let da = target - p.face;
    while (da > Math.PI) da -= TAU;
    while (da < -Math.PI) da += TAU;
    p.face += da * Math.min(1, dt * 14);
    p.walk += dt * sp * 2.1;
    if (Math.random() < dt * 6) burst(p.x, 0.05, p.z, DUST, 1, 1, 0.1, false, 1.5);
  }
  if (stats.regen > 0) p.hp = Math.min(stats.maxHp, p.hp + stats.regen * dt);
  // The fever drains health unless Joe is close by.
  const joe = npcById('joe');
  nearJoe = !!(joe && Math.hypot(joe.x - p.x, joe.z - p.z) < 3.8);
  if (run.fever && run.victoryT <= 0 && run.deathT <= 0) {
    if (nearJoe) p.hp = Math.min(stats.maxHp, p.hp + 7 * dt);
    else if (!save.codes.god) p.hp = Math.max(1, p.hp - 1.4 * dt);
  }
}

function updateNpcs(dt) {
  for (const n of npcs) {
    if (n.maxHp) {
      n.calm = (n.calm || 0) + dt;
      if (n.calm > 3) n.hp = Math.min(n.maxHp, n.hp + 4 * dt);
    }
    n.inv = Math.max(0, n.inv - dt);
    n.flash = Math.max(0, n.flash - dt);
    n.squash = Math.max(0, n.squash - dt * 4);
    const dx = p.x - n.x, dz = p.z - n.z, d = Math.hypot(dx, dz) || 1;
    let speed = 0;
    if (n.mode === 'follow' && d > 2.0) speed = Math.min(4.6, 2 + d * 0.6);
    if (n.mode === 'ally' && d > 3.0) speed = Math.min(3.8, 1.5 + d * 0.5);
    if (speed > 0 && run.victoryT <= 0 && run.deathT <= 0) {
      n.x += (dx / d) * speed * dt; n.z += (dz / d) * speed * dt;
      n.walk += dt * speed * 2.1;
      n.moving = true;
    } else {
      n.moving = false;
    }
    if (d < 12) {
      const target = Math.atan2(dx, dz);
      let da = target - n.face;
      while (da > Math.PI) da -= TAU;
      while (da < -Math.PI) da += TAU;
      n.face += da * Math.min(1, dt * 8);
    }
    collideSolids(n, 0.4);
    clampIsland(n, 0);
    if (n.mode === 'ally' && run.victoryT <= 0) {
      n.atk -= dt;
      if (n.atk <= 0 && nearest(n.x, n.z, 3.4)) {
        n.atk = 2.2;
        n.squash = 1;
        const dmg = 22 * (1 + run.time / 120);
        for (const e of query(n.x, n.z, 3.4, QC)) {
          const ex = e.x - n.x, ez = e.z - n.z, ed = Math.hypot(ex, ez) || 1;
          damageEnemy(e, dmg, ex / ed, ez / ed, 2.4);
        }
        fx(ringFx, { x: n.x, z: n.z, r0: 0.4, r1: 3.4, life: 0.4, color: '#ffe8a8', op: 0.9 });
        burst(n.x, 0.2, n.z, DUST, 10, 5, 0.15, false, 3);
        sfx('stomp');
      }
    }
  }
}

// ------------------------------------------------------------------ main update
function update(dt) {
  run.time += dt;
  updatePlayer(dt);
  if (run.deathT <= 0 && run.victoryT <= 0) spawnUpdate(dt);
  rebuildHash();
  if (run.deathT <= 0) updateWeapons(dt);
  updateProjectiles(dt);
  updateEnemies(dt);
  updateNpcs(dt);
  if (run.deathT <= 0) updatePickups(dt);
  if (run.chapter) updateObjective(dt);
  enemies = enemies.filter((e) => !e.dead);
  if (run.hint > 0) {
    run.hint -= dt;
    if (run.moved && run.hint > 1) run.hint = 1;
  }
  if (run.victoryT > 0) {
    run.victoryT -= dt / Math.max(0.2, timeScale);
    timeScale = Math.min(1, timeScale + dt * 0.5);
    run.vacuum = 1;
    updatePickups(dt);
    if (run.victoryT <= 0) { if (run.chapter) endChapter(true); else endRun(true); }
    return;
  }
  if (run.deathT > 0) {
    run.deathT -= dt / Math.max(0.2, timeScale);
    if (run.deathT <= 0) { if (run.chapter) endChapter(false); else endRun(false); }
    return;
  }
  if (run.pendingLevels > 0) {
    run.pendingLevels--;
    openLevelUp();
  }
}

// ------------------------------------------------------------------ visuals sync
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();

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
        q.y = q.s * 0.5; q.vy *= -0.35; q.vx *= 0.6; q.vz *= 0.6; q.vr *= 0.6;
      }
      q.rx += q.vr * dt; q.ry += q.vr * 0.7 * dt;
    }
  }
  // Chimney smoke rises from the forge.
  for (const em of smokeEmitters) {
    em.t -= dt;
    if (em.t > 0 || particles.length >= partPool.cap) continue;
    em.t = 0.22;
    const life = rand(2.2, 3);
    particles.push({ x: em.x + rand(-0.1, 0.1), y: em.y, z: em.z + rand(-0.1, 0.1), vx: rand(0.2, 0.5), vy: rand(0.5, 0.8), vz: rand(-0.1, 0.1), life, max: life, s: rand(0.25, 0.4), c: SMOKE[(Math.random() * 3) | 0], rx: 0, ry: rand(0, TAU), vr: rand(-1, 1), grav: -0.05 });
  }
}

const GEM_RGB = ['#9dff6a', '#6ae4ff', '#c38bff', '#ffd23f'].map((h) => rgbOf(h).map((x) => x * 1.25));

function objectiveTargets() {
  const out = [];
  const o = curObj();
  if (!o || !run || run.victoryT > 0) return out;
  const st = run.objState;
  if (o.type === 'reach' && st.npc) out.push({ x: st.npc.x, z: st.npc.z, ring: 1.6 });
  if (o.type === 'wind') for (const pt of st.points) if (!pt.done) out.push({ x: pt.x, z: pt.z, ring: 2.4, prog: pt.prog / o.time });
  if (o.type === 'escort' && st.points[st.idx]) { const pt = st.points[st.idx]; out.push({ x: pt.x, z: pt.z, ring: 2.8, prog: pt.prog / (o.hold || 2.5) }); }
  if (o.type === 'collect') for (const it of items) if (it.kind === 'story') out.push({ x: it.x, z: it.z, ring: 0 });
  if (o.type === 'bloom') { const g = greyPatch(); if (g) out.push({ x: g.x, z: g.z, ring: 2 }); }
  return out;
}

// The nearest patch of land still grey, so players clearing fog always know where to head.
let greyCache = null, greyAt = -1;
function greyPatch() {
  if (!p) return null;
  if (greyCache && time - greyAt < 0.5 && !cellTarget[greyCache.c] && Math.hypot(greyCache.x - p.x, greyCache.z - p.z) > 2.5) return greyCache;
  let best = null, bd = 1e9;
  for (let c = 0; c < cellCount; c++) {
    if (!cellCountable[c] || cellTarget[c]) continue;
    const x = (c % CN) * VX.CELL - HALF + 2, z = ((c / CN) | 0) * VX.CELL - HALF + 2;
    const d = Math.hypot(x - p.x, z - p.z);
    if (d > 5 && d < bd) { bd = d; best = { c, x, z }; }
  }
  greyCache = best;
  greyAt = time;
  return best;
}

function syncScene(dt) {
  const t = time;
  for (const k in enemyPools) enemyPools[k].begin();
  shadowPool.begin();
  for (const e of enemies) {
    if (e.dead) continue;
    if (e.boss) {
      const m = bossModels[e.boss];
      if (!m) continue;
      const size = BOSSES[e.boss].size;
      const k = e.spawnT > 0 ? 1 - e.spawnT / 1.2 : 1;
      let sy = 1, sxz = 1, ry = e.face;
      const y = (e.y || 0) - (1 - k) * 2;
      if (e.kind === 'king') {
        if (e.st === 'wind') { sy = 0.75; sxz = 1.15; }
        else if (e.st === 'air') { sy = 1.15; sxz = 0.9; }
        else { const h = Math.abs(Math.sin(e.anim * 4)); sy = 1 + (h - 0.5) * 0.08; sxz = 1 - (h - 0.5) * 0.05; }
      } else {
        sy = 1 + Math.sin(e.anim * 3) * 0.02;
        if (e.st === 'burst') sxz = 1 + Math.sin(e.anim * 40) * 0.02;
        if (e.st === 'charge') ry += Math.sin(e.anim * 50) * 0.05;
      }
      m.position.set(e.x, y, e.z);
      m.rotation.y = ry;
      m.scale.set(sxz * k * size, sy * k * size, sxz * k * size);
      const f = e.flash > 0 ? 0.6 : 0;
      m.material.emissive.setRGB(f, f, f);
      const ss = e.r * 1.25 * Math.max(0.4, 1 - (e.y || 0) / 10);
      shadowPool.add(e.x, 0.03, e.z, 0, ss, 1, ss);
      continue;
    }
    const T = ENEMIES[e.type];
    const pool = enemyPools[e.type];
    let s = T.scale * (e.elite ? 1.8 : 1);
    let sx = 1, sy = 1, sz = 1, y = 0, ry = e.face;
    const a = e.anim;
    switch (e.type) {
      case 'gloop': {
        const h = Math.abs(Math.sin(a * 7 + e.seed));
        y = h * 0.32; sy = 0.85 + h * 0.3; sx = sz = 1.08 - h * 0.15;
        break;
      }
      case 'flutter':
        y = 0.75 + Math.sin(a * 5 + e.seed) * 0.15; sx = 1 + Math.sin(a * 24) * 0.28;
        break;
      case 'shroom':
        sy = 1 + Math.sin(a * 8) * 0.06; ry += Math.sin(a * 4) * 0.2;
        break;
      case 'spitbud':
        sy = 1 + Math.sin(a * 6) * 0.05;
        if (e.timer < 0.35) { sx = sz = 1.15; sy = 0.9; }
        break;
      case 'beetle':
        if (e.st === 'wind') ry += Math.sin(a * 60) * 0.12;
        if (e.st === 'dash') { sz = 1.2; sx = 0.9; }
        y = Math.abs(Math.sin(a * 12)) * 0.04;
        break;
      default: break;
    }
    if (e.spawnT > 0) {
      const k = 1 - e.spawnT / 0.45;
      const ek = 1 - Math.pow(1 - k, 3);
      s *= Math.max(0.05, ek);
      y -= (1 - ek) * 0.6;
    }
    const i = pool.add(e.x, y, e.z, ry, s * sx, s * sy, s * sz);
    if (e.flash > 0) pool.tint(i, 5, 5, 5);
    else if (e.elite) pool.tint(i, 1.45, 1.15, 0.55);
    else pool.tint(i, 1, 1, 1);
    const ss = e.r * (T.fly ? 0.8 : 1.15);
    shadowPool.add(e.x, 0.03, e.z, 0, ss, 1, ss);
  }
  for (const k in enemyPools) enemyPools[k].end();

  // Player, or the hero posing on the companion screen.
  if (heroModel && !p && menuView === 'heroes') {
    poseCharacter(heroModel, 0, 0, 0.35 + Math.sin(t * 0.6) * 0.35, false, 0, t, { armsOut: true, armSwing: Math.sin(t * 2.4) * 0.15 });
    heroModel.rig.position.y = Math.abs(Math.sin(t * 2.4)) * 0.05;
    heroModel.group.visible = true;
    shadowPool.add(0, 0.03, 0, 0, 0.55, 1, 0.55);
  }
  if (heroModel && p) {
    const hm = heroModel;
    let lean = p.dashT > 0 ? 0.45 : undefined;
    if (run && run.deathT > 0) lean = -1.2;
    poseCharacter(hm, p.x, p.z, p.face, p.moving, p.walk, t, { lean, squash: p.squash, flash: p.flash > 0 ? p.flash * 3 : 0 });
    if (run && run.deathT > 0) hm.rig.position.y = 0.1;
    hm.group.visible = !(p.inv > 0 && p.inv < 5 && Math.floor(t * 18) % 2 === 0 && run && run.victoryT <= 0 && run.deathT <= 0);
    shadowPool.add(p.x, 0.03, p.z, 0, 0.55, 1, 0.55);
    playerLight.position.set(p.x, 2.4, p.z);
    playerLight.intensity = nightFactor * 34;
  } else {
    playerLight.intensity = 0;
  }
  if (heroModel && !p && menuView !== 'heroes') heroModel.group.visible = false;
  for (const n of npcs) {
    poseCharacter(n.model, n.x, n.z, n.face, n.moving, n.walk, t, {
      shiver: n.mode === 'stand', squash: n.squash, armSwing: n.squash * 1.6,
      flash: n.flash > 0 ? n.flash * 3 : 0,
    });
    n.model.group.visible = !(n.inv > 0 && n.inv < 2 && n.maxHp && Math.floor(t * 18) % 2 === 0);
    shadowPool.add(n.x, 0.03, n.z, 0, 0.55, 1, 0.55);
  }

  // Seeds.
  gemPool.begin();
  for (const s of seeds) {
    const tier = s.v >= 25 ? 3 : s.v >= 10 ? 2 : s.v >= 3 ? 1 : 0;
    const sc = [1, 1.25, 1.55, 1.95][tier];
    const i = gemPool.add(s.x, 0.25 + Math.sin(t * 3 + s.b) * 0.08, s.z, t * 2 + s.b, sc, sc, sc);
    const c = GEM_RGB[tier];
    gemPool.tint(i, c[0], c[1], c[2]);
  }
  gemPool.end();

  // Items.
  coinPool.begin(); applePool.begin(); honeyPool.begin(); conePool.begin(); chestPool.begin(); parcelPool.begin();
  for (const it of items) {
    const bob = Math.sin(t * 3 + it.x) * 0.08;
    const pop = Math.min(1, it.t * 5);
    switch (it.kind) {
      case 'coin': coinPool.add(it.x, 0.15 + bob, it.z, t * 3 + it.x, pop, pop, pop); break;
      case 'apple': applePool.add(it.x, 0.15 + bob, it.z, t, pop * 1.2, pop * 1.2, pop * 1.2); break;
      case 'honey': honeyPool.add(it.x, 0.15 + bob, it.z, t, pop * 1.3, pop * 1.3, pop * 1.3); break;
      case 'cone': conePool.add(it.x, 0.15 + bob, it.z, t, pop * 1.3, pop * 1.3, pop * 1.3); break;
      case 'chest':
      case 'keepsake': {
        const small = it.kind === 'keepsake';
        const s = pop * (1 + Math.sin(t * 5) * 0.04) * (small ? 0.75 : 1.2);
        const i = chestPool.add(it.x, small ? 0.2 + bob : 0, it.z, small ? t * 1.5 : Math.sin(t) * 0.3, s, s, s);
        const g = 1 + Math.max(0, Math.sin(t * 4)) * 0.5;
        if (small) chestPool.tint(i, g * 1.1, g * 0.85, g * 1.5); else chestPool.tint(i, g, g, g * 0.9);
        shadowPool.add(it.x, 0.03, it.z, 0, 0.6, 1, 0.6);
        if (Math.random() < 0.15 && glows.length < glowPool.cap - 200) glows.push({ x: it.x + rand(-0.4, 0.4), y: 0.5, z: it.z + rand(-0.4, 0.4), vx: 0, vy: 1.4, vz: 0, life: 0.7, max: 0.7, s: 0.09, c: small ? BLOOMC[0] : GOLD[0], rx: 0, ry: 0, vr: 3, grav: 0 });
        break;
      }
      case 'story': {
        const s = pop * 1.3;
        const i = parcelPool.add(it.x, 0.25 + bob * 2, it.z, t * 1.2, s, s, s);
        const g = 1.1 + Math.max(0, Math.sin(t * 5)) * 0.5;
        parcelPool.tint(i, g, g, g * 0.85);
        shadowPool.add(it.x, 0.03, it.z, 0, 0.5, 1, 0.5);
        if (Math.random() < 0.2 && glows.length < glowPool.cap - 200) glows.push({ x: it.x + rand(-0.3, 0.3), y: 0.6, z: it.z + rand(-0.3, 0.3), vx: 0, vy: 1.6, vz: 0, life: 0.8, max: 0.8, s: 0.08, c: GOLD[0], rx: 0, ry: 0, vr: 3, grav: 0 });
        break;
      }
      default: break;
    }
  }
  coinPool.end(); applePool.end(); honeyPool.end(); conePool.end(); chestPool.end(); parcelPool.end();
  shadowPool.end();

  // Objective markers and Joe's cooling aura.
  const targets = objectiveTargets().filter((tg) => tg.ring > 0);
  markers.forEach((m, i) => {
    const tg = targets[i];
    m.visible = !!tg && state !== 'menu';
    if (!tg) return;
    const r = tg.ring * (1 + Math.sin(t * 4) * 0.05);
    m.position.set(tg.x, 0.07, tg.z);
    m.scale.set(r, 1, r);
    m.material.opacity = 0.55 + Math.sin(t * 4) * 0.25;
  });
  const joe = npcById('joe');
  auraMesh.visible = !!(joe && run && run.fever && state !== 'menu');
  if (auraMesh.visible) {
    auraMesh.position.set(joe.x, 0.04, joe.z);
    auraMesh.scale.set(3.8, 1, 3.8);
    auraMesh.material.opacity = (nearJoe ? 0.22 : 0.12) + Math.sin(t * 3) * 0.04;
  }

  // Weapons.
  leafPool.begin();
  for (let i = 0; i < leafPos.length; i += 3) leafPool.add(leafPos[i], 0.75, leafPos[i + 1], -leafPos[i + 2] + t * 3, stats.area, 1, stats.area);
  leafPool.end();
  carrotPool.begin();
  for (const c of carrots) carrotPool.add(c.x, 0.7, c.z, c.spin, 1.2, 1.2, 1.2);
  carrotPool.end();
  beePool.begin();
  for (const b of bees) beePool.add(b.x, 0.8 + Math.sin(b.ph) * 0.15, b.z, Math.atan2(b.vx, b.vz), 1, 1, 1);
  beePool.end();
  meteorPool.begin();
  for (const m of meteors) {
    const k = Math.max(0, m.t) / m.max;
    meteorPool.add(m.x, 0.2 + Math.pow(k, 1.4) * 13, m.z, m.rot + t * 6, 1, 1, 1);
  }
  meteorPool.end();
  boltPool.begin();
  for (const b of bolts) {
    const i = boltPool.add(b.x, 0.8, b.z, Math.atan2(-b.vz, b.vx), 0.55 * stats.area, 0.22 * stats.area, 0.22 * stats.area);
    boltPool.tint(i, SPARK[0][0] * 1.4, SPARK[0][1] * 1.4, SPARK[0][2] * 1.4);
  }
  for (const o of orbs) {
    const s = 0.32 + Math.sin(t * 12) * 0.04;
    _e.set(t * 3, t * 4, 0);
    _q.setFromEuler(_e);
    _m4.compose(_v.set(o.x, 0.8, o.z), _q, _s.set(s, s, s));
    const i = boltPool.addM(_m4);
    boltPool.tint(i, 1.2, 0.35, 1.0);
  }
  boltPool.end();
  beamPool.begin();
  for (const b of beams) {
    const dx = b.bx - b.ax, dz = b.bz - b.az, L = Math.hypot(dx, dz);
    const w = 0.14 * (b.life / 0.16) + 0.03;
    const i = beamPool.add((b.ax + b.bx) / 2, 0.85, (b.az + b.bz) / 2, Math.atan2(-dz, dx), L, w, w);
    beamPool.tint(i, 1.3, 1.25, 0.7);
  }
  beamPool.end();

  // Particles.
  partPool.begin();
  for (const q of particles) {
    const s = q.s * Math.min(1, (q.life / q.max) * 2);
    _e.set(q.rx, q.ry, 0);
    _q.setFromEuler(_e);
    _m4.compose(_v.set(q.x, q.y, q.z), _q, _s.set(s, s, s));
    const i = partPool.addM(_m4);
    partPool.tint(i, q.c[0], q.c[1], q.c[2]);
  }
  partPool.end();
  glowPool.begin();
  for (const q of glows) {
    const s = q.s * Math.min(1, (q.life / q.max) * 1.5);
    const i = glowPool.add(q.x, q.y, q.z, q.ry, s, s, s);
    glowPool.tint(i, q.c[0] * 1.3, q.c[1] * 1.3, q.c[2] * 1.3);
  }
  for (const lg of lampGlows) {
    const k = glowPool.add(lg.x, lg.y, lg.z, 0, 0.36, 0.38, 0.36);
    const g = 0.9 + nightFactor * 0.6;
    glowPool.tint(k, 1.3 * g, 1.05 * g, 0.55 * g);
  }
  const cx = p ? p.x : camLook.x, cz = p ? p.z : camLook.z;
  if (nightFactor > 0.2) {
    for (let i = 0; i < 40; i++) {
      const a = i * 2.39 + t * 0.15, r = 3 + (i % 7) * 2.2;
      const x = cx + Math.cos(a) * r + Math.sin(t * 0.7 + i) * 0.8, z = cz + Math.sin(a) * r * 0.8 + Math.cos(t * 0.5 + i) * 0.8;
      const blink = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7);
      const s = 0.09 * blink * nightFactor;
      const k = glowPool.add(x, 0.6 + Math.sin(t + i) * 0.4, z, 0, s, s, s);
      glowPool.tint(k, 1.4, 1.35, 0.6);
    }
  }
  if (currentTheme.snow) {
    const span = state === 'menu' && menuView !== 'heroes' ? 70 : 34;
    for (let i = 0; i < 170; i++) {
      const fx0 = ((i * 37.31) % span) - span / 2, fz0 = ((i * 71.77) % span) - span / 2;
      const y = 9 - ((t * (0.9 + (i % 5) * 0.12) + i * 0.77) % 10);
      const x = cx + fx0 + Math.sin(t * 0.8 + i) * 0.6, z = cz + fz0 + Math.cos(t * 0.6 + i) * 0.6;
      const k = glowPool.add(x, y, z, t + i, 0.07, 0.07, 0.07);
      glowPool.tint(k, 1.05, 1.08, 1.15);
    }
  }
  glowPool.end();

  // Flowers (only when something is still growing).
  let growing = flowersDirty;
  for (const f of flowers) if (f.g < 1) { f.g = Math.min(1, f.g + dt * 3); growing = true; }
  if (growing) {
    flowerPools.forEach((pl) => pl.begin());
    for (const f of flowers) {
      const k = f.g;
      const e = k < 1 ? 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2) : 1;
      const s = f.s * Math.max(0.01, e);
      flowerPools[f.k].add(f.x, 0, f.z, f.rot, s, s, s);
    }
    flowerPools.forEach((pl) => pl.end());
    flowersDirty = false;
  }

  for (const c of clouds) {
    c.a += c.spd * dt;
    c.m.position.set(Math.cos(c.a) * c.r, c.y + Math.sin(t * 0.3 + c.r) * 0.4, Math.sin(c.a) * c.r);
  }
}

// ------------------------------------------------------------------ camera
const camPos = new THREE.Vector3(0, 30, 50);
const camLook = new THREE.Vector3();
let menuAngle = 0.6;
function updateCamera(dt) {
  const asp = (W || 1) / (H || 1);
  if (state === 'menu') {
    menuAngle += dt * 0.05;
    let target, look;
    if (menuView === 'heroes' && heroModel) {
      const d = asp < 1 ? 8.5 : 7;
      target = new THREE.Vector3(Math.sin(0.35) * d, asp < 1 ? 2.6 : 3.2, Math.cos(0.35) * d);
      look = new THREE.Vector3(asp < 1 ? 0 : -1.4, asp < 1 ? -1.6 : 0.9, 0);
    } else {
      const d = asp < 1 ? (96 / Math.max(asp, 0.5)) * 0.55 : 70;
      target = new THREE.Vector3(Math.cos(menuAngle) * d, d * 0.55, Math.sin(menuAngle) * d);
      look = new THREE.Vector3(0, -4, 0);
    }
    camPos.lerp(target, Math.min(1, dt * 2.2));
    camLook.lerp(look, Math.min(1, dt * 2.2));
    camera.position.copy(camPos);
    camera.lookAt(camLook);
  } else if (p) {
    const far = asp < 1 ? clamp((1 / asp) * 0.95, 1, 2.1) : 1;
    const tx = p.x, tz = p.z + 13.5 * far, ty = 16 * far;
    camPos.x = lerp(camPos.x, tx, Math.min(1, dt * 6));
    camPos.y = lerp(camPos.y, ty, Math.min(1, dt * 6));
    camPos.z = lerp(camPos.z, tz, Math.min(1, dt * 6));
    camLook.set(camPos.x, 0.5, camPos.z - 13.5 * far - 0.4);
    shakeAmt = Math.max(0, shakeAmt - dt * 2.5);
    const sa = shakeAmt * shakeAmt * 0.9;
    camShake.set(rand(-1, 1) * sa, rand(-1, 1) * sa * 0.5, rand(-1, 1) * sa);
    camera.position.copy(camPos).add(camShake);
    camera.lookAt(camLook.x + camShake.x * 0.5, camLook.y, camLook.z + camShake.z * 0.5);
  }
  sky.position.copy(camera.position);
}

// ------------------------------------------------------------------ overlay (2D)
let W = 1, H = 1, ODPR = 1;
const _proj = new THREE.Vector3();
function toScreen(x, y, z) {
  _proj.set(x, y, z).project(camera);
  return [(_proj.x * 0.5 + 0.5) * W, (-_proj.y * 0.5 + 0.5) * H, _proj.z];
}
function pointTo(x, z, color) {
  const [sx, sy, sz] = toScreen(x, 0.5, z);
  const m = 34;
  if (sx > m && sx < W - m && sy > m + 40 && sy < H - m && sz < 1) return;
  const cx = W / 2, cy = H / 2;
  let dx = sx - cx, dy = sy - cy;
  if (sz > 1) { dx = -dx; dy = -dy; }
  const s = Math.min((W / 2 - m) / Math.abs(dx || 1e-3), (H / 2 - m - 20) / Math.abs(dy || 1e-3));
  const ex = cx + dx * s, ey = cy + dy * s + 10;
  octx.save();
  octx.translate(ex, ey);
  octx.rotate(Math.atan2(dy, dx));
  octx.fillStyle = color;
  octx.strokeStyle = '#191736';
  octx.lineWidth = 3;
  octx.beginPath();
  octx.moveTo(14, 0); octx.lineTo(-8, -10); octx.lineTo(-4, 0); octx.lineTo(-8, 10); octx.closePath();
  octx.stroke(); octx.fill();
  octx.restore();
}
function drawBar(x, y, w, ratio, color) {
  octx.fillStyle = '#191736';
  octx.fillRect(x - w / 2 - 2, y - 2, w + 4, 10);
  octx.fillStyle = '#4a2140';
  octx.fillRect(x - w / 2, y, w, 6);
  octx.fillStyle = color;
  octx.fillRect(x - w / 2, y, w * clamp(ratio, 0, 1), 6);
}
function drawOverlay(dt) {
  octx.clearRect(0, 0, W, H);
  if ((state === 'play' || state === 'levelup' || state === 'chest' || state === 'pause') && p && run) {
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.lineJoin = 'round';
    for (let i = numbers.length - 1; i >= 0; i--) {
      const n = numbers[i];
      n.t += dt;
      if (n.t > n.life) { numbers.splice(i, 1); continue; }
      const [sx, sy, sz] = toScreen(n.x, n.y + n.t * 1.6, n.z);
      if (sz > 1) continue;
      const k = n.t / n.life;
      const pop = k < 0.15 ? 0.6 + (k / 0.15) * 0.6 : 1.2 - Math.min(0.2, (k - 0.15));
      const size = (n.crit ? 22 : 15) * pop;
      octx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      octx.font = `${Math.round(size)}px "Abril Fatface", Georgia, serif`;
      octx.lineWidth = 4;
      octx.strokeStyle = '#191736';
      octx.strokeText(n.text, sx + n.ox * k, sy);
      octx.fillStyle = n.color;
      octx.fillText(n.text, sx + n.ox * k, sy);
    }
    octx.globalAlpha = 1;
    const [px, py] = toScreen(p.x, 0, p.z);
    drawBar(px, py + 12, 44, p.hp / stats.maxHp, p.hp / stats.maxHp < 0.3 ? '#ff5d5d' : '#7ed957');
    if (p.dashCd > 0) {
      octx.fillStyle = '#9ef0ff';
      octx.fillRect(px - 22, py + 22, 44 * (1 - p.dashCd / 1.3), 2);
    }
    for (const n of npcs) {
      if (!n.maxHp) continue;
      const [nx, ny] = toScreen(n.x, 0, n.z);
      drawBar(nx, ny + 12, 40, n.hp / n.maxHp, '#8fd3ff');
      if (Math.hypot(n.x - p.x, n.z - p.z) > 9) pointTo(n.x, n.z, '#8fd3ff');
    }
    for (const tg of objectiveTargets()) {
      pointTo(tg.x, tg.z, '#ffd23f');
      if (tg.prog > 0) {
        const [sx, sy, sz] = toScreen(tg.x, 3.2, tg.z);
        if (sz < 1) {
          octx.lineWidth = 7;
          octx.strokeStyle = '#191736';
          octx.beginPath(); octx.arc(sx, sy, 18, 0, TAU); octx.stroke();
          octx.lineWidth = 4;
          octx.strokeStyle = '#ffd23f';
          octx.beginPath(); octx.arc(sx, sy, 18, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(tg.prog, 0, 1)); octx.stroke();
        }
      }
    }
    for (const it of items) {
      if (it.kind === 'chest') pointTo(it.x, it.z, '#ffd23f');
      if (it.kind === 'keepsake') pointTo(it.x, it.z, '#ff8fb1');
    }
    for (const b of run.bosses) pointTo(b.x, b.z, '#ff4fd8');
  }
  if (joy.active) {
    octx.globalAlpha = 0.5;
    octx.fillStyle = '#191736';
    octx.beginPath(); octx.arc(joy.ox, joy.oy, 52, 0, TAU); octx.fill();
    octx.globalAlpha = 0.9;
    octx.strokeStyle = '#f3ead2';
    octx.lineWidth = 3;
    octx.beginPath(); octx.arc(joy.ox, joy.oy, 52, 0, TAU); octx.stroke();
    octx.fillStyle = '#c9a227';
    octx.beginPath(); octx.arc(joy.ox + joy.vx * 46, joy.oy + joy.vy * 46, 22, 0, TAU); octx.fill();
    octx.globalAlpha = 1;
  }
}

// ------------------------------------------------------------------ HUD
const hudCache = {};
function setText(id, v) {
  if (hudCache[id] === v) return;
  hudCache[id] = v;
  $(id).textContent = v;
}
function setStyle(id, prop, v) {
  const key = id + prop;
  if (hudCache[key] === v) return;
  hudCache[key] = v;
  $(id).style[prop] = v;
}
function setHidden(id, hidden) {
  const key = id + ':hidden';
  if (hudCache[key] === hidden) return;
  hudCache[key] = hidden;
  $(id).hidden = hidden;
}
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
function updateHUD() {
  if (!run || !p) return;
  setStyle('xp-fill', 'width', `${clamp(p.xp / p.need, 0, 1) * 100}%`);
  setText('lvl', `LV ${p.level}`);
  setStyle('hp-fill', 'width', `${clamp(p.hp / stats.maxHp, 0, 1) * 100}%`);
  setText('hp-text', `${Math.ceil(p.hp)} / ${stats.maxHp}`);
  setText('timer', fmtTime(run.time));
  setText('kills', String(run.kills));
  setText('acorns-run', String(run.acorns));
  const bloomPct = Math.min(100, Math.round((run.bloomed / countableTotal) * 100));
  setText('bloom-pct', `${bloomPct}%`);
  setStyle('bloom-fill', 'width', `${bloomPct}%`);
  let obj;
  if (run.chapter) {
    obj = run.victoryT > 0 ? `Chapter ${run.chapter.num} complete` : objText();
  } else if (run.victoryT > 0) obj = 'Dawn at last!';
  else if (run.bosses.length) obj = `Defeat ${BOSSES[run.bosses[0].boss].name}!`;
  else if (run.time < BOSSES.king.at) obj = `King Miasma arrives in ${fmtTime(BOSSES.king.at - run.time)}`;
  else if (run.time < BOSSES.golem.at) obj = `The Gloom Golem arrives in ${fmtTime(BOSSES.golem.at - run.time)}`;
  else obj = 'Hold on until dawn!';
  setText('objective', obj);
  const isStory = !!run.chapter;
  setHidden('story-chips', !isStory);
  if (isStory) {
    setText('life-years', run.practice ? 'Practice' : `${Math.round(expectedYears())} yrs`);
    const hearts = '♥'.repeat(run.chances) + '♡'.repeat(Math.max(0, run.maxChances - run.chances));
    setText('chances', hearts);
  }
  setHidden('fever-chip', !(run.fever && !nearJoe && run.victoryT <= 0));
  setHidden('cheat-chip', !cheatsOn());
  const slotKey = p.weapons.map((w) => w.id + w.level).join() + '|' + Object.entries(run.passives).map(([k, v]) => k + v).join();
  if (hudCache.slots !== slotKey) {
    hudCache.slots = slotKey;
    $('slots').innerHTML =
      p.weapons.map((w) => `<div class="slot weapon" title="${WEAPONS[w.id].name}">${iconImg(WEAPONS[w.id].icon)}<b>${w.level}</b></div>`).join('') +
      Object.entries(run.passives).map(([k, v]) => `<div class="slot passive" title="${PASSIVES[k].name}">${iconImg(PASSIVES[k].icon)}<b>${v}</b></div>`).join('');
  }
  if (run.bosses.length) {
    const b = run.bosses[0];
    setStyle('boss-fill', 'width', `${clamp(b.hp / b.maxHp, 0, 1) * 100}%`);
  }
  const showCombo = run.combo >= 10 && run.time - run.lastKill < 1.2;
  const comboEl = $('combo');
  if (showCombo) {
    setText('combo-n', String(run.combo));
    if (comboEl.hidden) comboEl.hidden = false;
    comboEl.dataset.tier = run.combo >= 200 ? '3' : run.combo >= 100 ? '2' : run.combo >= 40 ? '1' : '0';
  } else if (!comboEl.hidden) comboEl.hidden = true;
  const low = clamp(1 - p.hp / stats.maxHp / 0.35, 0, 1);
  const fever = run.fever && !nearJoe ? 0.35 + Math.sin(time * 3) * 0.1 : 0;
  setStyle('vignette', 'opacity', String(Math.max(low, fever).toFixed(2)));
  const showHint = run.hint > 0 && state === 'play';
  setHidden('hint', !showHint);
}

// ------------------------------------------------------------------ level up
let currentChoices = [];
function rollChoices() {
  const opts = [];
  const owned = new Set(p.weapons.map((w) => w.id));
  for (const w of p.weapons) if (w.level < MAX_LEVEL) opts.push({ kind: 'weapon', id: w.id, wt: 3.2 });
  if (p.weapons.length < MAX_WEAPONS) for (const id of Object.keys(WEAPONS)) if (!owned.has(id)) opts.push({ kind: 'weapon', id, wt: p.weapons.length < 3 ? 2.6 : 1.6 });
  const pcount = Object.keys(run.passives).length;
  for (const id of Object.keys(PASSIVES)) {
    const lv = run.passives[id] || 0;
    if (lv >= MAX_LEVEL) continue;
    if (!lv && pcount >= MAX_PASSIVES) continue;
    opts.push({ kind: 'passive', id, wt: lv ? 2.4 : 1.5 });
  }
  const n = 3 + (stats.luck >= 3 ? 1 : 0);
  const out = [];
  while (out.length < n && opts.length) {
    const sum = opts.reduce((s, o) => s + o.wt, 0);
    let r = Math.random() * sum, idx = 0;
    for (; idx < opts.length; idx++) { if ((r -= opts[idx].wt) <= 0) break; }
    out.push(opts.splice(Math.min(idx, opts.length - 1), 1)[0]);
  }
  if (!out.length) out.push({ kind: 'snack' }, { kind: 'acorns' });
  return out;
}

function choiceInfo(c) {
  if (c.kind === 'weapon') {
    const W0 = WEAPONS[c.id];
    const w = p.weapons.find((x) => x.id === c.id);
    const lv = w ? w.level : 0;
    return { icon: W0.icon, name: W0.name, desc: W0.up[lv], lv: lv + 1, isNew: !w, cls: 'weapon', type: 'Weapon' };
  }
  if (c.kind === 'passive') {
    const P0 = PASSIVES[c.id];
    const lv = run.passives[c.id] || 0;
    return { icon: P0.icon, name: P0.name, desc: P0.up, lv: lv + 1, isNew: !lv, cls: 'passive', type: 'Charm' };
  }
  if (c.kind === 'snack') return { icon: 'apple', name: 'A Picnic Hamper', desc: 'Heal 40 health', lv: 0, isNew: false, cls: 'extra', type: 'Treat' };
  return { icon: 'coin', name: 'A Purse of Shillings', desc: '+8 shillings', lv: 0, isNew: false, cls: 'extra', type: 'Treat' };
}

function applyChoice(c) {
  if (c.kind === 'weapon') addWeapon(c.id);
  else if (c.kind === 'passive') {
    run.passives[c.id] = (run.passives[c.id] || 0) + 1;
    computeStats();
    if (c.id === 'heart') p.hp = Math.min(stats.maxHp, p.hp + 20);
  } else if (c.kind === 'snack') p.hp = Math.min(stats.maxHp, p.hp + 40);
  else run.acorns += 8;
}

function renderChoices() {
  const box = $('cards');
  box.innerHTML = currentChoices.map((c, i) => {
    const info = choiceInfo(c);
    const pips = info.lv ? Array.from({ length: MAX_LEVEL }, (_, k) => `<i class="${k < info.lv ? 'on' : ''}"></i>`).join('') : '';
    return `<button class="card ${info.cls}" data-i="${i}" id="card-${i}">
      <span class="card-key">${i + 1}</span>
      <span class="card-icon">${iconImg(info.icon)}</span>
      <span class="card-type">${info.type}${info.isNew ? ' <em>New</em>' : info.lv ? ` · Lv ${info.lv}` : ''}</span>
      <span class="card-name">${info.name}</span>
      <span class="card-desc">${info.desc}</span>
      <span class="pips">${pips}</span>
    </button>`;
  }).join('');
  box.querySelectorAll('.card').forEach((b) => b.addEventListener('click', () => chooseCard(+b.dataset.i)));
  const rr = $('btn-reroll');
  rr.textContent = `Reroll (${run.rerolls})`;
  rr.disabled = run.rerolls <= 0;
}

let levelLock = 0;
function openLevelUp() {
  currentChoices = rollChoices();
  levelLock = performance.now() + 450;
  setState('levelup');
  $('lvl-title').textContent = `Level ${p.level}!`;
  renderChoices();
  sfx('level');
  screenFlash('rgba(255,210,63,0.35)');
  burst(p.x, 0.6, p.z, GOLD, 24, 5, 0.14, true, 6);
}

function chooseCard(i) {
  if (state !== 'levelup' || !currentChoices[i] || performance.now() < levelLock) return;
  applyChoice(currentChoices[i]);
  sfx('click');
  setState('play');
  if (run.pendingLevels > 0) {
    run.pendingLevels--;
    openLevelUp();
  }
}

function reroll() {
  if (state !== 'levelup' || run.rerolls <= 0) return;
  run.rerolls--;
  currentChoices = rollChoices();
  renderChoices();
  sfx('click');
}

// ------------------------------------------------------------------ strongboxes
let chestRewards = [];
let chestTimers = [];
function randomUpgrade() {
  const opts = rollChoices().filter((c) => c.kind === 'weapon' || c.kind === 'passive');
  const ownedFirst = opts.filter((c) => (c.kind === 'weapon' ? p.weapons.some((w) => w.id === c.id) : run.passives[c.id]));
  const list = ownedFirst.length && Math.random() < 0.75 ? ownedFirst : opts;
  return list.length ? pick(list) : { kind: 'acorns' };
}
function openChest(src) {
  const n = src === 'boss' ? 3 : Math.random() < 0.12 + 0.05 * stats.luck ? 3 : 1;
  chestRewards = [];
  for (let i = 0; i < n; i++) {
    const c = randomUpgrade();
    chestRewards.push(c);
    applyChoice(c);
  }
  const bonus = src === 'boss' ? 10 : 3;
  run.acorns += bonus;
  setState('chest');
  $('chest-title').textContent = n === 3 ? 'A jackpot strongbox!' : 'A strongbox!';
  $('chest-acorns').textContent = `+${bonus} shillings`;
  const reels = $('reels');
  reels.innerHTML = chestRewards.map((_, i) => `<div class="reel" id="reel-${i}"><span class="reel-icon"></span><span class="reel-name">…</span></div>`).join('');
  const all = Object.values(WEAPONS).map((w) => w.icon).concat(Object.values(PASSIVES).map((x) => x.icon));
  const cont = $('btn-chest');
  cont.disabled = true;
  sfx('chest');
  chestTimers.forEach(clearInterval);
  chestTimers = [];
  chestRewards.forEach((c, i) => {
    const el = $(`reel-${i}`);
    const iconEl = el.querySelector('.reel-icon'), nameEl = el.querySelector('.reel-name');
    const stopAt = performance.now() + 700 + i * 450;
    const tm = setInterval(() => {
      if (!p || !run) { clearInterval(tm); return; }
      if (performance.now() >= stopAt) {
        clearInterval(tm);
        const info = choiceInfo(c);
        const w = c.kind === 'weapon' ? p.weapons.find((x) => x.id === c.id) : null;
        const lv = c.kind === 'weapon' ? (w ? w.level : 0) : c.kind === 'passive' ? run.passives[c.id] : 0;
        iconEl.innerHTML = iconImg(info.icon);
        nameEl.textContent = lv ? `${info.name} · Lv ${lv}` : info.name;
        el.classList.add('landed');
        sfx('coin');
        if (i === chestRewards.length - 1) { cont.disabled = false; cont.focus({ preventScroll: true }); }
        return;
      }
      iconEl.innerHTML = iconImg(pick(all));
      sfx('reel');
    }, 70);
    chestTimers.push(tm);
  });
}
function closeChest() {
  if (state !== 'chest' || $('btn-chest').disabled) return;
  sfx('click');
  setState('play');
}

// ------------------------------------------------------------------ end of a run or chapter
function earnings(success) {
  const base = run.acorns + Math.floor(run.time / 30) + (success ? (run.chapter ? 25 : 50) : 0) + run.milestones * 4;
  return Math.round(base * (1 + 0.1 * (save.shop.greed || 0)) * run.diff.acorns);
}
const statRow = (label, val, best) => `<div class="stat"><span>${label}</span><b>${val}</b>${best ? '<em>Best!</em>' : ''}</div>`;

function endRun(victory) {
  if (run.ended) return;
  run.ended = true;
  timeScale = 1;
  const earned = earnings(victory);
  save.acorns += earned;
  save.runs++;
  const bloomPct = Math.min(100, Math.round((run.bloomed / countableTotal) * 100));
  const hadRuns = save.best.time > 0;
  const rec = [];
  if (run.time > save.best.time) { save.best.time = run.time; rec.push('time'); }
  if (run.kills > save.best.kills) { save.best.kills = run.kills; rec.push('kills'); }
  if (bloomPct > save.best.bloom) { save.best.bloom = bloomPct; rec.push('bloom'); }
  if (p.level > save.best.level) { save.best.level = p.level; rec.push('level'); }
  if (victory) save.wins++;
  persist();
  setState('results');
  sound.intensity = 0;
  $('res-eyebrow').textContent = 'The Long Night';
  $('res-title').textContent = victory ? 'Dawn at last!' : 'The night was too long';
  $('res-sub').textContent = victory
    ? `${run.hero.name} broke the Gloom Golem, and every field bloomed again.`
    : `${run.hero.name} held out for ${fmtTime(run.time)}. The posies you planted are still blooming.`;
  const b = (k) => hadRuns && rec.includes(k);
  $('res-stats').innerHTML =
    statRow('Time', fmtTime(run.time), b('time')) +
    statRow('Miasma scattered', run.kills, b('kills')) +
    statRow('Level', p.level, b('level')) +
    statRow('Land coloured', `${bloomPct}%`, b('bloom')) +
    statRow('Best combo', run.bestCombo) +
    statRow('Damage dealt', run.damage.toLocaleString());
  $('res-acorns').innerHTML = `${iconImg('coin')} +${earned} shillings <small>(${save.acorns} in your purse)</small>`;
  $('res-unlock').hidden = true;
  $('btn-again').textContent = 'Play again';
  $('btn-res-menu').textContent = 'Title';
  $('results').dataset.win = victory ? '1' : '0';
}

function endChapter(success) {
  if (run.ended) return;
  run.ended = true;
  timeScale = 1;
  run.earned = earnings(success);
  save.acorns += run.earned;
  save.runs++;
  persist();
  sound.intensity = 0;
  if (!success) {
    setState('results');
    $('res-eyebrow').textContent = `Chapter ${run.chapter.num}: ${run.chapter.title}`;
    $('res-title').textContent = 'Pip is laid low';
    $('res-sub').textContent = 'The Miasma was too much this time. Nothing from this attempt is written in Pip’s ledger, so try the chapter again.';
    $('res-stats').innerHTML =
      statRow('Time', fmtTime(run.time)) + statRow('Miasma scattered', run.kills) + statRow('Level', p.level) +
      statRow('Land coloured', `${Math.min(100, Math.round((run.bloomed / countableTotal) * 100))}%`) +
      statRow('Best combo', run.bestCombo) + statRow('Damage dealt', run.damage.toLocaleString());
    $('res-acorns').innerHTML = `${iconImg('coin')} +${run.earned} shillings <small>(${save.acorns} in your purse)</small>`;
    $('res-unlock').hidden = true;
    $('btn-again').textContent = 'Try again';
    $('btn-res-menu').textContent = 'The journey';
    $('results').dataset.win = '0';
    return;
  }
  if (!run.practice) {
    const r = p.hp / stats.maxHp;
    if (r >= 0.7) addLedger(1, 'Came through in good health');
    else if (r <= 0.3) addLedger(-1, 'Came through worn and weak');
  }
  setState('outro');
}

// ------------------------------------------------------------------ story screens
const paras = (list) => list.map((t) => `<p>${t}</p>`).join('');
const fmtYears = (y) => `${y > 0 ? '+' : '−'}${Math.abs(y)} ${Math.abs(y) === 1 ? 'year' : 'years'}`;
const deathYear = (years) => BIRTH_YEAR + Math.round(years);

function introText(ch) {
  const tale = story();
  const kind = !tale || !tale.flags.told;
  return ch.intro.map((t) => (t === '{kindLine}' ? (ch.kindLine ? ch.kindLine[kind ? 'kind' : 'told'] : '') : t)).filter(Boolean);
}

function renderJourney() {
  if (!story()) save.story = newTale();
  const tale = story();
  const y = Math.round(tale.years);
  $('journey-years').innerHTML = `${iconImg('hourglass')} Pip can expect to live to <b>${y}</b> <small>(born ${BIRTH_YEAR}, so until about ${deathYear(y)})</small>`;
  $('journey-acorns').innerHTML = `${iconImg('coin')} ${save.acorns}`;
  $('journey-list').innerHTML = CHAPTERS.map((ch, i) => {
    const done = !!tale.done[i];
    const current = i === tale.chapter && !tale.finished;
    const open = done || current || save.codes.chapters;
    const cls = done ? 'done' : current ? 'current' : open ? 'open' : 'locked';
    const label = done ? 'Read again' : current ? 'Read on' : open ? 'Read (practice)' : 'Locked';
    const delta = tale.ledger.filter((e) => e.ch === ch.num).reduce((s, e) => s + e.years, 0);
    const note = done ? `<span class="ch-note">${delta ? fmtYears(delta) : 'no change'} to Pip’s years${save.keepsakes[ch.keepsake] ? ' · keepsake found' : ''}</span>` : `<span class="ch-note">${ch.date} · ${ch.place}</span>`;
    return `<li class="ch-row ${cls}">
      <span class="ch-num">${ch.num}</span>
      <span class="ch-text"><b>${ch.title}</b>${note}</span>
      <button class="btn ${current ? '' : 'alt'} small" data-ch="${i}" id="ch-${i}" ${open ? '' : 'disabled'}>${label}</button>
    </li>`;
  }).join('');
  $('journey-list').querySelectorAll('button[data-ch]').forEach((b) => b.addEventListener('click', () => { sfx('click'); openChapter(+b.dataset.ch); }));
  $('btn-epilogue').hidden = !tale.finished;
  $('journey-note').textContent = tale.finished
    ? `The tale is told. Pip lived to ${y}.`
    : 'Each chapter changes how long Pip can expect to live. Keep him healthy, choose wisely, and visit the apothecary.';
  newTaleArmed = false;
  $('btn-newtale').textContent = 'Begin a new tale';
}

let newTaleArmed = false;
function beginNewTale() {
  if (!newTaleArmed && story() && (story().chapter > 0 || story().ledger.length)) {
    newTaleArmed = true;
    $('btn-newtale').textContent = 'Tap again to start over';
    return;
  }
  save.story = newTale();
  persist();
  sfx('click');
  setState('journey');
}

function openChapter(i) {
  pendingStart = { mode: 'story', chapter: i };
  setState('chapter');
}

function renderChapter() {
  const i = pendingStart.chapter;
  const ch = CHAPTERS[i];
  const tale = story();
  buildWorld(ch.theme);
  resetWorldVisualOnly();
  atmosFrames = chapterFrames(ch);
  atmosT = 0;
  let fortune = '';
  if (ch.fortune && tale && !tale.fortune && !tale.done[i]) {
    const amt = tale.flags.told ? ch.fortune.told : ch.fortune.kind;
    tale.fortune = true;
    save.acorns += amt;
    persist();
    fortune = `<p class="fortune">${iconImg('coin')} Mr Jaggers counts out your first allowance: <b>${amt} shillings</b>.</p>`;
  }
  const practice = tale && (tale.done[i] || i > tale.chapter);
  $('chapter-eyebrow').textContent = `Chapter ${ch.num}`;
  $('chapter-title').textContent = ch.title;
  $('chapter-date').textContent = `${ch.date} · ${ch.place} · Pip is ${ch.age}`;
  $('chapter-quote').innerHTML = `“${ch.quote.text}”<cite>${ch.quote.src}</cite>`;
  $('chapter-body').innerHTML = paras(introText(ch)) + fortune +
    (practice ? '<p class="practice-note">You have read this chapter before. Playing it again will not change Pip’s ledger.</p>' : '');
  $('chapter-goals').innerHTML = ch.objectives.map((o) => `<li>${plainObjText(o)}</li>`).join('');
}

let ledgerView = null;
function renderOutro() {
  const ch = run.chapter;
  $('outro-eyebrow').textContent = `Chapter ${ch.num} is finished`;
  $('outro-title').textContent = ch.title;
  $('outro-body').innerHTML = paras(ch.outro);
  const box = $('outro-choices');
  if (run.practice) {
    $('outro-prompt').textContent = 'You have lived this chapter before; the ledger stays as it was.';
    box.innerHTML = `<button class="btn" id="outro-continue">Back to the journey</button>`;
    $('outro-continue').addEventListener('click', () => { sfx('click'); setState('journey'); });
    return;
  }
  $('outro-prompt').textContent = ch.choice.prompt;
  box.innerHTML = ch.choice.options.map((o, i) => `<button class="choice" id="choice-${i}" data-i="${i}"><b>${o.label}</b><span>${o.detail}</span></button>`).join('');
  box.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => takeStoryChoice(ch.choice.options[+b.dataset.i])));
}

function takeStoryChoice(opt) {
  if (!run || run.choiceTaken) return;
  run.choiceTaken = true;
  const tale = story();
  const ch = run.chapter, idx = run.chapterIdx;
  let res = opt, resultText = opt.result, rolled = null;
  if (opt.chance) {
    rolled = Math.random() < opt.chance.p;
    res = rolled ? opt.chance.win : opt.chance.lose;
    resultText = res.result;
  }
  const entries = run.ledger.slice();
  if (res.years) entries.push({ years: res.years, text: opt.label });
  if (res.shillings) save.acorns = Math.max(0, save.acorns + res.shillings);
  if (opt.flag) { tale.flags[opt.flag] = true; if (opt.flag === 'kind') delete tale.flags.told; if (opt.flag === 'told') delete tale.flags.kind; }
  if (run.usedCheats) entries.push({ years: 0, text: 'With a little help from a secret code' });
  const delta = entries.reduce((s, e) => s + e.years, 0);
  tale.years += delta;
  for (const e of entries) tale.ledger.push({ years: e.years, text: e.text, ch: ch.num });
  tale.done[idx] = true;
  tale.chapter = Math.max(tale.chapter, idx + 1);
  save.chaptersDone[idx] = true;
  const unlocked = HEROES.filter((h) => h.unlock.type === 'chapter' && h.unlock.chapter === idx && !save.heroes[h.id]);
  unlocked.forEach((h) => { save.heroes[h.id] = true; });
  persist();
  sfx(rolled === false ? 'over' : 'chest');
  ledgerView = { ch, idx, entries, delta, resultText, earned: run.earned, shillings: res.shillings || 0, keepsake: run.keepsakeFound ? ch.keepsake : null, unlocked, rolled };
  setState('ledger');
}

function renderLedger() {
  const v = ledgerView;
  const tale = story();
  const y = Math.round(tale.years);
  $('ledger-eyebrow').textContent = `The ledger · Chapter ${v.ch.num}`;
  $('ledger-result').textContent = (v.rolled === true ? 'Fortune smiles. ' : v.rolled === false ? 'Fortune frowns. ' : '') + v.resultText;
  const rows = v.entries.filter((e) => e.years !== 0 || e.text);
  $('ledger-rows').innerHTML = (rows.length ? rows : [{ years: 0, text: 'A quiet chapter for Pip’s health' }])
    .map((e) => `<li><span>${e.text}</span><b class="${e.years > 0 ? 'up' : e.years < 0 ? 'down' : ''}">${e.years ? fmtYears(e.years) : '—'}</b></li>`).join('');
  const extras = [];
  extras.push(`${iconImg('coin')} +${v.earned} shillings found on the way${v.shillings ? `, ${v.shillings > 0 ? '+' : '−'}${Math.abs(v.shillings)} from your choice` : ''}`);
  if (v.keepsake) extras.push(`${iconImg(KEEPSAKES[v.keepsake].icon)} Keepsake: ${KEEPSAKES[v.keepsake].name}`);
  for (const h of v.unlocked) extras.push(`${iconImg(WEAPONS[h.start].icon)} ${h.name} joins you as a companion!`);
  $('ledger-extras').innerHTML = extras.map((x) => `<li>${x}</li>`).join('');
  $('ledger-total').innerHTML = `${iconImg('hourglass')} Pip can now expect to live to <b>${y}</b> <small>(until about ${deathYear(y)})</small>`;
  $('btn-ledger').textContent = v.idx === CHAPTERS.length - 1 ? 'Read the epilogue' : 'Turn the page';
}

function renderEpilogue() {
  const tale = story();
  if (!tale.finished) {
    tale.finished = true;
    save.tales++;
    save.bestYears = Math.max(save.bestYears, Math.round(tale.years));
    persist();
  }
  buildWorld('satis');
  resetWorldVisualOnly();
  for (let c = 0; c < cellCount; c++) { cellTarget[c] = 1; cellDelay[c] = Math.random() * 1.5; }
  for (let i = 0; i < 600; i++) {
    const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 29;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (freeSpot(x, z, 0.3)) flowers.push({ x, z, k: (Math.random() * 5) | 0, rot: Math.random() * TAU, g: 1, s: rand(0.85, 1.25) });
  }
  flowersDirty = true;
  atmosFrames = chapterFrames(CHAPTERS[1]);
  atmosT = CHAPTERS[1].length;
  const y = Math.round(tale.years);
  const tier = EPILOGUE.tiers.find((t) => y >= t.min);
  $('epi-date').textContent = EPILOGUE.date;
  $('epi-body').innerHTML = paras(EPILOGUE.text) + `<blockquote>“${EPILOGUE.quote.text}”<cite>${EPILOGUE.quote.src}</cite></blockquote>`;
  $('epi-stone').innerHTML = `<span>Philip Pirrip</span><b>${BIRTH_YEAR} – ${deathYear(y)}</b><span>He lived to ${y}</span>`;
  $('epi-tier').textContent = tier.title;
  $('epi-tier-text').textContent = tier.text;
  $('epi-facts').textContent = EPILOGUE.facts;
  $('epi-ledger').innerHTML = [{ years: NEW_TALE_YEARS, text: 'Expected at seven years old, in 1812', ch: '' }, ...tale.ledger]
    .map((e, i) => `<li><span>${e.ch ? `<i>${e.ch}</i> ` : ''}${e.text}</span><b class="${i && e.years > 0 ? 'up' : i && e.years < 0 ? 'down' : ''}">${i ? (e.years ? fmtYears(e.years) : '—') : `${e.years} years`}</b></li>`).join('');
  const found = Object.keys(KEEPSAKES).filter((k) => save.keepsakes[k]).length;
  $('epi-keepsakes').textContent = `Keepsakes found: ${found} of ${Object.keys(KEEPSAKES).length}`;
}

function renderKeepsakes() {
  const keys = Object.keys(KEEPSAKES);
  const found = keys.filter((k) => save.keepsakes[k]).length;
  $('keep-count').textContent = `${found} of ${keys.length} found`;
  $('keep-list').innerHTML = keys.map((k) => {
    const ks = KEEPSAKES[k];
    const has = save.keepsakes[k];
    return `<li class="keep ${has ? 'found' : ''}">
      <span class="keep-icon">${has ? iconImg(ks.icon) : '?'}</span>
      <span class="keep-text"><b>${has ? ks.name : 'Not yet found'}</b><span>${has ? ks.desc : `Hidden somewhere in Chapter ${CHAPTERS[ks.chapter].num}. It appears once your first task is done.`}</span></span>
    </li>`;
  }).join('');
}

// ------------------------------------------------------------------ the Blue Boar (dice)
const dice = { wager: 10, point: 0, rolling: false, a: 3, b: 4, msg: '' };
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const dieFace = (n) => `<span class="die">${Array.from({ length: 9 }, (_, i) => `<i class="${PIPS[n].includes(i) ? 'pip' : ''}"></i>`).join('')}</span>`;
function renderDice() {
  $('dice-acorns').innerHTML = `${iconImg('coin')} ${save.acorns}`;
  $('dice-faces').innerHTML = dieFace(dice.a) + dieFace(dice.b);
  $('dice-msg').textContent = dice.msg || 'The landlord rattles the dice cup. “Fancy a throw, young sir?”';
  $('dice-point').textContent = dice.point ? `Your point: ${dice.point}` : 'No point yet';
  $('dice-wagers').innerHTML = [5, 10, 25].map((w) => `<button class="seg ${dice.wager === w ? 'on' : ''}" data-w="${w}" id="wager-${w}" aria-pressed="${dice.wager === w}" ${dice.point || dice.rolling ? 'disabled' : ''}>${w}s</button>`).join('');
  $('dice-wagers').querySelectorAll('.seg').forEach((b) => b.addEventListener('click', () => { dice.wager = +b.dataset.w; sfx('click'); renderDice(); }));
  $('btn-throw').disabled = dice.rolling || (!dice.point && save.acorns < dice.wager);
  $('btn-throw').textContent = dice.point ? 'Throw for your point' : `Throw (${dice.wager} shillings)`;
  $('dice-rules').textContent = DICE_RULES;
}
function throwDice() {
  if (dice.rolling || (!dice.point && save.acorns < dice.wager)) return;
  dice.rolling = true;
  renderDice();
  const end = performance.now() + 650;
  const tm = setInterval(() => {
    dice.a = 1 + Math.floor(Math.random() * 6);
    dice.b = 1 + Math.floor(Math.random() * 6);
    $('dice-faces').innerHTML = dieFace(dice.a) + dieFace(dice.b);
    sfx('reel');
    if (performance.now() < end) return;
    clearInterval(tm);
    const sum = dice.a + dice.b;
    const win = () => { save.acorns += dice.wager; dice.msg = `${sum}! You win ${dice.wager} shillings.`; dice.point = 0; sfx('coin'); };
    const lose = (why) => { save.acorns = Math.max(0, save.acorns - dice.wager); dice.msg = `${why} You lose ${dice.wager} shillings.`; dice.point = 0; sfx('hurt'); };
    if (!dice.point) {
      if (sum === 7 || sum === 11) win();
      else if (sum === 2 || sum === 3 || sum === 12) lose(`${sum}: crabs!`);
      else { dice.point = sum; dice.msg = `Your point is ${sum}. Throw again: ${sum} wins, 7 loses.`; sfx('click'); }
    } else if (sum === dice.point) win();
    else if (sum === 7) lose('Seven!');
    else { dice.msg = `${sum}. Still looking for your ${dice.point}.`; sfx('click'); }
    dice.rolling = false;
    persist();
    renderDice();
  }, 70);
}

// ------------------------------------------------------------------ shop, apothecary, settings, codes
function renderShop() {
  $('shop-acorns').innerHTML = `${iconImg('coin')} ${save.acorns}`;
  $('shop-list').innerHTML = SHOP.map((it) => {
    const lv = save.shop[it.id] || 0;
    const maxed = lv >= it.max;
    const cost = maxed ? 0 : it.costs[lv];
    const pips = Array.from({ length: it.max }, (_, k) => `<i class="${k < lv ? 'on' : ''}"></i>`).join('');
    return `<div class="shop-item">
      ${iconImg(it.icon, 'shop-icon')}
      <div class="shop-text"><b>${it.name}</b><span>${it.desc}</span><span class="pips">${pips}</span></div>
      <button class="btn small" data-id="${it.id}" id="buy-${it.id}" ${maxed || save.acorns < cost ? 'disabled' : ''}>${maxed ? 'Sold out' : `${cost}s`}</button>
    </div>`;
  }).join('');
  $('shop-list').querySelectorAll('button[data-id]').forEach((b) => b.addEventListener('click', () => buy(b.dataset.id)));
  const tale = story();
  const open = tale && !tale.finished;
  $('apothecary-note').innerHTML = open
    ? `${iconImg('hourglass')} Pip can expect to live to <b>${Math.round(tale.years)}</b>. Each remedy can be bought once per tale.`
    : 'The apothecary only treats Pip during a tale. Begin the tale to visit.';
  $('remedy-list').innerHTML = REMEDIES.map((r) => {
    const bought = open && tale.remedies[r.id];
    const effect = r.chance ? `${r.chance.p * 100}% chance of +${r.chance.win} years, otherwise ${r.chance.lose} years` : `+${r.years} ${r.years === 1 ? 'year' : 'years'} of life expectancy`;
    return `<div class="shop-item">
      ${iconImg(r.icon, 'shop-icon')}
      <div class="shop-text"><b>${r.name}</b><span>${effect}</span><span class="note">${r.note}</span></div>
      <button class="btn small green" data-r="${r.id}" id="remedy-${r.id}" ${!open || bought || save.acorns < r.cost ? 'disabled' : ''}>${bought ? 'Taken' : `${r.cost}s`}</button>
    </div>`;
  }).join('');
  $('remedy-list').querySelectorAll('button[data-r]').forEach((b) => b.addEventListener('click', () => buyRemedy(b.dataset.r)));
}
function buy(id) {
  const it = SHOP.find((s) => s.id === id);
  const lv = save.shop[id] || 0;
  if (lv >= it.max || save.acorns < it.costs[lv]) return;
  save.acorns -= it.costs[lv];
  save.shop[id] = lv + 1;
  persist();
  sfx('buy');
  renderShop();
  const btn = $(`buy-${id}`);
  if (btn) btn.focus({ preventScroll: true });
}
function buyRemedy(id) {
  const tale = story();
  const r = REMEDIES.find((x) => x.id === id);
  if (!tale || tale.finished || tale.remedies[id] || save.acorns < r.cost) return;
  save.acorns -= r.cost;
  tale.remedies[id] = true;
  let years = r.years;
  if (r.chance) {
    const win = Math.random() < r.chance.p;
    years = win ? r.chance.win : r.chance.lose;
    toast(win ? `The elixir works wonders! ${fmtYears(years)}.` : `The elixir was mostly gin and soot. ${fmtYears(years)}.`);
  } else {
    toast(`${r.name}: ${fmtYears(years)} of life expectancy.`);
  }
  tale.years += years;
  tale.ledger.push({ years, text: r.name, ch: 'Apothecary' });
  persist();
  sfx(years > 0 ? 'heal' : 'hurt');
  renderShop();
}

let resetArmed = false;
function renderSettings() {
  const st = save.settings;
  const rows = [['music', 'Music'], ['sfx', 'Sound effects'], ['shake', 'Screen shake'], ['numbers', 'Damage numbers']];
  $('settings-list').innerHTML = rows.map(([k, label]) => `<button class="toggle" id="set-${k}" data-k="${k}" aria-pressed="${st[k]}"><span>${label}</span><b>${st[k] ? 'On' : 'Off'}</b></button>`).join('');
  $('settings-list').querySelectorAll('.toggle').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.k;
    st[k] = !st[k];
    applySettings();
    persist();
    sfx('click');
    renderSettings();
    $(`set-${k}`).focus({ preventScroll: true });
  }));
  renderCodes();
  resetArmed = false;
  $('btn-reset').textContent = 'Erase all progress';
  $('btn-reset').hidden = settingsReturn !== 'menu';
}
function renderCodes() {
  const found = CODES.filter((c) => save.codes.found[c.code]).length;
  $('codes-count').textContent = `${found} of ${CODES.length} discovered`;
  $('codes-list').innerHTML = CODES.map((c) => {
    if (!save.codes.found[c.code]) return `<li class="code-row"><span><b>???</b><small>Riddle: ${c.hint}</small></span></li>`;
    const control = c.type === 'toggle'
      ? `<button class="toggle mini" data-code="${c.code}" id="code-${c.key}" aria-pressed="${!!save.codes[c.key]}"><b>${save.codes[c.key] ? 'On' : 'Off'}</b></button>`
      : '<em>Used</em>';
    return `<li class="code-row found"><span><b>${c.name}</b><small>${c.code} · ${c.desc}</small></span>${control}</li>`;
  }).join('');
  $('codes-list').querySelectorAll('button[data-code]').forEach((b) => b.addEventListener('click', () => {
    const c = CODES.find((x) => x.code === b.dataset.code);
    save.codes[c.key] = !save.codes[c.key];
    persist();
    applyCheatsVisual();
    sfx('click');
    renderCodes();
  }));
}
function enterCode(raw) {
  const s = String(raw || '').toUpperCase().replace(/[^A-Z]/g, '');
  const c = CODES.find((x) => x.code === s);
  if (!c) return { ok: false, msg: 'Nothing happens. That is not a word anyone in 1812 would know.' };
  save.codes.found[c.code] = true;
  let msg = '';
  if (c.type === 'toggle') {
    save.codes[c.key] = !save.codes[c.key];
    msg = `${c.name}: ${save.codes[c.key] ? 'on' : 'off'}. ${c.desc}`;
  } else if (c.key === 'money') {
    if (save.codes.money) msg = 'The benefactor has already been generous once.';
    else { save.codes.money = true; save.acorns += 500; msg = 'A mysterious benefactor sends you 500 shillings.'; }
  } else if (c.key === 'heroes') {
    save.codes.heroes = true;
    HEROES.forEach((h) => { save.heroes[h.id] = true; });
    msg = 'What larks! Every companion has joined you.';
  } else if (c.key === 'chapters') {
    save.codes.chapters = true;
    msg = 'Mr Jaggers unlocks every chapter. Chapters read ahead count as practice.';
  }
  persist();
  applyCheatsVisual();
  sfx('chest');
  return { ok: true, msg, name: c.name };
}
function applyCheatsVisual() {
  app.classList.toggle('plain', !!save.codes.plain);
}
function applySettings() {
  sound.setMusic(save.settings.music);
  sound.setSfx(save.settings.sfx);
}

// ------------------------------------------------------------------ screens
const MENU_SCREENS = ['menu', 'journey', 'chapter', 'heroes', 'shop', 'keepsakes', 'settings', 'dice', 'outro', 'ledger', 'epilogue'];
const SCREENS = [...MENU_SCREENS, 'levelup', 'chest', 'pause', 'results', 'loading'];
let settingsReturn = 'menu';
let shopReturn = 'menu';
let heroesReturn = 'menu';
let keepReturn = 'menu';

function menuThemeChapter() {
  const tale = story();
  if (!tale) return CHAPTERS[0];
  return CHAPTERS[Math.min(tale.chapter, CHAPTERS.length - 1)];
}
function previewMenuIsland() {
  const ch = menuThemeChapter();
  buildWorld(ch.theme);
  resetWorldVisualOnly();
  atmosFrames = chapterFrames(ch);
  atmosT = ch.length * 0.25;
  const seedR = VX.rng(3);
  for (let c = 0; c < cellCount; c++) {
    const wx = (c % CN) * VX.CELL - HALF + 2, wz = ((c / CN) | 0) * VX.CELL - HALF + 2;
    const d = Math.hypot(wx - 2, wz + 4);
    if (d < 15 + seedR() * 5) { cellTarget[c] = 1; cellDelay[c] = d * 0.03; }
  }
  for (let i = 0; i < 420; i++) {
    const a = seedR() * TAU, r = Math.sqrt(seedR()) * 17;
    const x = 2 + Math.cos(a) * r, z = -4 + Math.sin(a) * r;
    if (Math.hypot(x, z) > 28 || !freeSpot(x, z, 0.3)) continue;
    flowers.push({ x, z, k: (seedR() * 5) | 0, rot: seedR() * TAU, g: 1, s: 0.9 + seedR() * 0.4 });
  }
  flowersDirty = true;
}

function resetWorldVisualOnly() {
  enemies = []; bolts = []; carrots = []; bees = []; meteors = []; beams = []; orbs = [];
  seeds = []; items = []; particles = []; glows = []; flowers = []; numbers = [];
  clearNpcs();
  cellFlowers.fill(0); cellTarget.fill(0); cellDelay.fill(0);
  for (const id of Object.keys(bossModels)) bossModels[id].visible = false;
  for (const name of ['clock', 'jetty']) if (propPools[name]) { propPools[name].begin(); propPools[name].end(); }
  for (let i = solids.length - 1; i >= 0; i--) if (solids[i].objective) solids.splice(i, 1);
  for (const m of markers) m.visible = false;
  auraMesh.visible = false;
  clearFx();
  flowersDirty = true;
}

function setState(s) {
  const inPauseSettings = s === 'settings' && settingsReturn === 'pause';
  if (inPauseSettings) state = 'pause';
  else state = MENU_SCREENS.includes(s) ? 'menu' : s;
  if (state === 'menu') menuView = s;
  if (['menu', 'journey', 'chapter', 'heroes', 'epilogue'].includes(s) && run) { run = null; p = null; }
  for (const id of SCREENS) {
    const el = $(id);
    if (el) el.hidden = id !== s;
  }
  const inRun = ['play', 'levelup', 'chest', 'pause'].includes(s) || inPauseSettings;
  $('hud').hidden = !inRun;
  $('touch').hidden = !(inRun && isTouch);
  if (state === 'menu') {
    $('bossbar').hidden = true;
    sound.intensity = 0;
    sound.night = false;
  }
  if (s === 'menu' || s === 'journey') previewMenuIsland();
  if (s === 'menu') renderMenu();
  if (s === 'journey') renderJourney();
  if (s === 'chapter') renderChapter();
  if (s === 'heroes') renderHeroes();
  if (s === 'shop') renderShop();
  if (s === 'keepsakes') renderKeepsakes();
  if (s === 'settings') renderSettings();
  if (s === 'dice') renderDice();
  if (s === 'outro') renderOutro();
  if (s === 'ledger') renderLedger();
  if (s === 'epilogue') renderEpilogue();
  if (s === 'play') {
    joy.active = false;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  applyCheatsVisual();
  const focusable = $(s) && $(s).querySelector('[data-autofocus]');
  if (focusable) setTimeout(() => focusable.focus({ preventScroll: true }), 30);
}

function renderMenu() {
  const tale = story();
  $('btn-story').textContent = !tale ? 'Begin the tale' : tale.finished ? 'Read the tale again' : 'Continue the tale';
  $('menu-acorns').innerHTML = `${iconImg('coin')} ${save.acorns}`;
  $('menu-best').textContent = tale
    ? (tale.finished ? `Last tale: Pip lived to ${Math.round(tale.years)}.` : `Chapter ${CHAPTERS[Math.min(tale.chapter, 4)].num} next · Pip can expect to live to ${Math.round(tale.years)}.`)
    : 'A tale of 1812, after Charles Dickens.';
}

function heroUnlocked(h) {
  if (save.heroes[h.id] || save.codes.heroes) return true;
  return h.unlock.type === 'chapter' && !!save.chaptersDone[h.unlock.chapter];
}
let heroSel = save.hero;
function renderHeroes() {
  if (!heroUnlocked(heroById(heroSel))) heroSel = 'pip';
  const list = $('hero-list');
  list.innerHTML = HEROES.map((h) => {
    const un = heroUnlocked(h);
    const bar = (v, max) => `<span class="bar"><i style="width:${clamp(v / max, 0.08, 1) * 100}%"></i></span>`;
    const lock = un ? '' : `<span class="lock">Joins after Chapter ${CHAPTERS[h.unlock.chapter].num}, or ${h.unlock.cost}s</span>`;
    return `<button class="hero-card ${h.id === heroSel ? 'sel' : ''} ${un ? '' : 'locked'}" data-id="${h.id}" id="hero-${h.id}" aria-pressed="${h.id === heroSel}">
      <span class="hero-head"><b>${h.name}</b><small>${h.title}</small>${iconImg(WEAPONS[h.start].icon, 'hero-weapon')}</span>
      <span class="hero-stats"><span>Health</span>${bar(h.hp, 150)}<span>Speed</span>${bar(h.speed - 0.7, 0.45)}<span>Power</span>${bar(h.dmg - 0.6, 0.6)}</span>
      ${lock}
    </button>`;
  }).join('');
  list.querySelectorAll('.hero-card').forEach((b) => b.addEventListener('click', () => selectHero(b.dataset.id)));
  const h = heroById(heroSel);
  $('hero-blurb').textContent = h.blurb;
  $('heroes-title').textContent = pendingStart.mode === 'story' ? `Chapter ${CHAPTERS[pendingStart.chapter].num}: choose a companion` : 'The Long Night: choose a companion';
  const go = $('btn-start');
  if (heroUnlocked(h)) { go.textContent = pendingStart.mode === 'story' ? 'Begin the chapter' : 'Begin the night'; go.disabled = false; }
  else { go.textContent = `Hire for ${h.unlock.cost}s`; go.disabled = save.acorns < h.unlock.cost; }
  $('diff-row').innerHTML = DIFFICULTIES.map((d) => `<button class="seg ${save.diff === d.id ? 'on' : ''}" data-id="${d.id}" id="diff-${d.id}" aria-pressed="${save.diff === d.id}">${d.name}</button>`).join('');
  $('diff-row').querySelectorAll('.seg').forEach((b) => b.addEventListener('click', () => { save.diff = b.dataset.id; persist(); sfx('click'); renderHeroes(); }));
  $('diff-desc').textContent = diffById(save.diff).desc;
  $('hero-acorns').innerHTML = `${iconImg('coin')} ${save.acorns}`;
  if (!heroModel || heroModel.id !== heroSel) makeHeroModel(heroSel);
  heroModel.group.visible = true;
}
function selectHero(id) {
  heroSel = id;
  if (heroUnlocked(heroById(id))) { save.hero = id; persist(); }
  sfx('click');
  renderHeroes();
}
function startOrUnlock() {
  const h = heroById(heroSel);
  if (!heroUnlocked(h)) {
    if (save.acorns < h.unlock.cost) return;
    save.acorns -= h.unlock.cost;
    save.heroes[h.id] = true;
    save.hero = h.id;
    persist();
    sfx('buy');
    renderHeroes();
    return;
  }
  save.hero = h.id;
  persist();
  sfx('click');
  startRun(pendingStart.mode, pendingStart.chapter);
}

function togglePause() {
  if (state === 'play') { setState('pause'); sfx('click'); }
  else if (state === 'pause') { setState('play'); sfx('click'); }
}

let quitArmed = false;
function quitRun() {
  if (!quitArmed) {
    quitArmed = true;
    $('btn-quit').textContent = 'Tap again to leave';
    setTimeout(() => { quitArmed = false; $('btn-quit').textContent = 'Leave this chapter'; }, 2500);
    return;
  }
  quitArmed = false;
  $('btn-quit').textContent = 'Leave this chapter';
  const wasStory = run && run.chapter;
  run = null;
  p = null;
  setState(wasStory ? 'journey' : 'menu');
}

// ------------------------------------------------------------------ input wiring
function onFirstGesture() {
  sound.unlock();
  applySettings();
}
window.addEventListener('pointerdown', onFirstGesture, { capture: true });
window.addEventListener('keydown', onFirstGesture, { capture: true });

let codeBuffer = '';
window.addEventListener('keydown', (e) => {
  const code = e.code;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code) && state === 'play') e.preventDefault();
  keys.add(code);
  if (state === 'play') {
    if (code === 'Space' || code === 'ShiftLeft' || code === 'ShiftRight') tryDash();
    if (code === 'Escape' || code === 'KeyP') togglePause();
  } else if (state === 'pause') {
    if (code === 'Escape' || code === 'KeyP') togglePause();
  } else if (state === 'levelup') {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= currentChoices.length) chooseCard(n - 1);
    if (code === 'KeyR') reroll();
  } else if (state === 'chest') {
    if (code === 'Enter' || code === 'Space') { e.preventDefault(); closeChest(); }
  } else if (state === 'menu') {
    if (code === 'Escape') {
      const back = $(menuView) && $(menuView).querySelector('[data-back]');
      if (back) back.click();
    }
    if ((menuView === 'menu' || menuView === 'journey') && /^[a-z]$/i.test(e.key)) {
      codeBuffer = (codeBuffer + e.key.toUpperCase()).slice(-20);
      const hit = CODES.find((c) => codeBuffer.endsWith(c.code));
      if (hit) {
        codeBuffer = '';
        const r = enterCode(hit.code);
        toast(`Secret code! ${r.msg}`);
        if (menuView === 'menu') renderMenu(); else renderJourney();
      }
    }
  }
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); joy.active = false; if (state === 'play') setState('pause'); });
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') setState('pause'); });

canvas.addEventListener('pointerdown', (e) => {
  if (state !== 'play' || joy.active) return;
  joy.active = true; joy.id = e.pointerId;
  const r = app.getBoundingClientRect();
  joy.ox = e.clientX - r.left;
  joy.oy = e.clientY - r.top;
  joy.vx = 0; joy.vy = 0;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
});
canvas.addEventListener('pointermove', (e) => {
  if (!joy.active || e.pointerId !== joy.id) return;
  const r = app.getBoundingClientRect();
  let dx = e.clientX - r.left - joy.ox, dy = e.clientY - r.top - joy.oy;
  const l = Math.hypot(dx, dy), max = 50;
  if (l > max) {
    joy.ox += (dx / l) * (l - max); joy.oy += (dy / l) * (l - max);
    dx = (dx / l) * max; dy = (dy / l) * max;
  }
  joy.vx = dx / max; joy.vy = dy / max;
  if (Math.hypot(joy.vx, joy.vy) < 0.15) { joy.vx = 0; joy.vy = 0; }
});
const endJoy = (e) => { if (e.pointerId === joy.id) { joy.active = false; joy.vx = 0; joy.vy = 0; } };
canvas.addEventListener('pointerup', endJoy);
canvas.addEventListener('pointercancel', endJoy);

const on = (id, fn) => $(id).addEventListener('click', fn);
on('btn-story', () => { sfx('click'); if (!story()) { save.story = newTale(); persist(); } setState(story().finished ? 'journey' : 'journey'); });
on('btn-free', () => { sfx('click'); pendingStart = { mode: 'free', chapter: 0 }; heroSel = save.hero; heroesReturn = 'menu'; setState('heroes'); });
on('btn-shop', () => { sfx('click'); shopReturn = 'menu'; setState('shop'); });
on('btn-keepsakes', () => { sfx('click'); keepReturn = 'menu'; setState('keepsakes'); });
on('btn-settings', () => { sfx('click'); settingsReturn = 'menu'; setState('settings'); });
on('btn-journey-back', () => { sfx('click'); setState('menu'); });
on('btn-journey-shop', () => { sfx('click'); shopReturn = 'journey'; setState('shop'); });
on('btn-journey-dice', () => { sfx('click'); dice.msg = ''; setState('dice'); });
on('btn-journey-keep', () => { sfx('click'); keepReturn = 'journey'; setState('keepsakes'); });
on('btn-newtale', beginNewTale);
on('btn-epilogue', () => { sfx('click'); setState('epilogue'); });
on('btn-chapter-back', () => { sfx('click'); setState('journey'); });
on('btn-chapter-go', () => { sfx('click'); heroSel = save.hero; heroesReturn = 'chapter'; setState('heroes'); });
on('btn-start', startOrUnlock);
on('btn-heroes-back', () => { sfx('click'); setState(heroesReturn); });
on('btn-shop-back', () => { sfx('click'); setState(run ? 'results' : shopReturn); });
on('btn-keep-back', () => { sfx('click'); setState(keepReturn); });
on('btn-settings-back', () => { sfx('click'); setState(settingsReturn); });
on('btn-dice-back', () => { sfx('click'); setState('journey'); });
on('btn-throw', throwDice);
on('btn-ledger', () => { sfx('click'); setState(ledgerView && ledgerView.idx === CHAPTERS.length - 1 ? 'epilogue' : 'journey'); });
on('btn-epi-new', () => { sfx('click'); save.story = newTale(); persist(); setState('journey'); });
on('btn-epi-menu', () => { sfx('click'); setState('menu'); });
on('btn-reroll', reroll);
on('btn-chest', closeChest);
on('btn-pause', () => { if (state === 'play') togglePause(); });
on('btn-resume', togglePause);
on('btn-pause-settings', () => { sfx('click'); settingsReturn = 'pause'; setState('settings'); });
on('btn-quit', quitRun);
on('btn-again', () => {
  sfx('click');
  if (run && run.chapter) { startRun('story', run.chapterIdx); return; }
  heroSel = save.hero; pendingStart = { mode: 'free', chapter: 0 }; heroesReturn = 'menu';
  run = null; p = null;
  setState('heroes');
});
on('btn-res-shop', () => { sfx('click'); shopReturn = 'menu'; setState('shop'); });
on('btn-res-menu', () => { sfx('click'); const st = run && run.chapter; run = null; p = null; setState(st ? 'journey' : 'menu'); });
on('btn-code', () => {
  const r = enterCode($('code-input').value);
  $('code-msg').textContent = r.msg;
  $('code-msg').dataset.ok = r.ok ? '1' : '0';
  if (r.ok) $('code-input').value = '';
  renderCodes();
});
$('code-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('btn-code').click(); } });
on('btn-reset', () => {
  if (!resetArmed) { resetArmed = true; $('btn-reset').textContent = 'Tap again to erase everything'; return; }
  save = defaultSave();
  persist();
  applySettings();
  applyCheatsVisual();
  sfx('click');
  renderSettings();
  $('btn-reset').textContent = 'Progress erased';
});
$('dash-btn').addEventListener('pointerdown', (e) => { e.preventDefault(); tryDash(); });

// ------------------------------------------------------------------ loop
function resize() {
  W = app.clientWidth || window.innerWidth;
  H = app.clientHeight || window.innerHeight;
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  ODPR = Math.min(window.devicePixelRatio || 1, 2);
  overlay.width = Math.round(W * ODPR);
  overlay.height = Math.round(H * ODPR);
  octx.setTransform(ODPR, 0, 0, ODPR, 0, 0);
}
window.addEventListener('resize', resize);

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const realDt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += realDt;
  let simDt = 0;
  if (state === 'play' && run) {
    if (hitStop > 0) hitStop -= realDt;
    else {
      simDt = realDt * timeScale;
      update(simDt);
    }
  }
  const pdt = state === 'play' ? simDt : state === 'menu' || state === 'results' ? realDt : 0;
  updateParticles(pdt);
  if (state === 'play' || state === 'results') updateFx(simDt);
  updateCells(realDt);
  if (state === 'play' && run) {
    if (run.chapter) {
      atmosT = run.won ? lerp(atmosT, run.chapter.length, Math.min(1, realDt * 0.8)) : Math.min(run.time, run.chapter.length);
      sound.night = nightFactor > 0.6 && !run.won;
    } else {
      atmosT = run.won ? lerp(atmosT, 40, Math.min(1, realDt * 0.7)) : run.time;
      sound.night = run.time >= 360 && !run.won;
    }
  }
  applyAtmosphere(atmosT);
  updateCamera(realDt);
  syncScene(realDt);
  renderer.render(scene, camera);
  drawOverlay(realDt);
  if (run && p && state !== 'menu') updateHUD();
}

function boot(data) {
  document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = iconImg(el.dataset.icon); });
  if (isTouch) {
    $('keys').textContent = 'Drag anywhere to move · tap DASH to dodge · attacks fire on their own';
    $('hint').textContent = 'Drag anywhere to move · tap DASH to dodge';
  }
  const stored = loadSave();
  save = stored || (data && data.save ? mergeSave(data.save) : defaultSave());
  heroSel = save.hero;
  resize();
  setState('menu');
  applyAtmosphere(atmosT);
  requestAnimationFrame((t) => { last = t; frame(t); });
  if (window.claude && window.claude.hot && window.claude.hot.snapshot) {
    try { window.claude.hot.snapshot(() => ({ save })); } catch (e) { /* ignore */ }
  }
}

// Small test hook used by automated checks.
window.__sprout = {
  get state() { return state; },
  get view() { return menuView; },
  get run() { return run; },
  get player() { return p; },
  get enemies() { return enemies; },
  get npcs() { return npcs; },
  get save() { return save; },
  skip(t) { if (run) { run.time = t; run.eventIdx = EVENTS.findIndex((e) => e.t >= t); if (run.eventIdx < 0) run.eventIdx = EVENTS.length; } },
  god(on) { window.__god = on; },
  xp(v) { if (p) addXP(v); },
  boss(id) { if (run) spawnBoss(id); },
  choose(i) { chooseCard(i); },
  closeChest() { closeChest(); },
  start() { pendingStart = { mode: 'free', chapter: 0 }; startRun('free'); },
  story(i) { if (!save.story) save.story = newTale(); startRun('story', i); },
  storyChoice(i) { if (state === 'menu' && menuView === 'outro' && run) takeStoryChoice(run.chapter.choice.options[i]); },
  code(c) { return enterCode(c); },
  bloomAll() { if (p) bloomWave(p.x, p.z); },
  target() {
    const o = curObj();
    if (!o || !p) return null;
    const st = run.objState;
    if (o.type === 'collect') { let b = null, bd = 1e9; for (const it of items) if (it.kind === 'story') { const d = Math.hypot(it.x - p.x, it.z - p.z); if (d < bd) { bd = d; b = it; } } return b && { x: b.x, z: b.z }; }
    if (o.type === 'reach' && st.npc) return { x: st.npc.x, z: st.npc.z };
    if (o.type === 'wind') { const pt = st.points.find((q) => !q.done); return pt && { x: pt.x, z: pt.z }; }
    if (o.type === 'escort') { const pt = st.points[st.idx]; if (!pt) return null; const n = st.npc; if (n && Math.hypot(n.x - p.x, n.z - p.z) > 5) return { x: n.x, z: n.z }; return { x: pt.x, z: pt.z }; }
    if (o.type === 'survive') { const j = npcById('joe'); return j ? { x: j.x, z: j.z, near: true } : null; }
    if (o.type === 'bloom') { const g = greyPatch(); return g && { x: g.x, z: g.z }; }
    return null;
  },
  simulate(seconds) {
    const steps = Math.round(seconds * 30);
    for (let i = 0; i < steps; i++) {
      let guard = 0;
      while (state === 'levelup' && guard++ < 20) { levelLock = 0; chooseCard(0); }
      if (state === 'chest') { $('btn-chest').disabled = false; closeChest(); }
      if (state !== 'play' || !run || run.ended) break;
      update(1 / 30);
      levelLock = 0;
    }
    return {
      state, view: menuView, boss: run && run.bosses.map((b) => b.boss + ':' + Math.round(b.hp)).join(), t: run && Math.round(run.time),
      hp: p && Math.round(p.hp), lvl: p && p.level, kills: run && run.kills, chances: run && run.chances,
      obj: run && run.chapter ? `${run.obj}:${curObj() && curObj().type} ${objText()}` : '', bloom: run && Math.round((run.bloomed / countableTotal) * 100),
      enemies: enemies.length, weapons: p && p.weapons.map((w) => w.id + w.level).join(' '),
    };
  },
};

const hot = window.claude && window.claude.hot;
if (hot && hot.ready) hot.ready(boot);
else boot((hot && hot.data) || {});
