// Sprout Siege: voxel model builder, island mesher and all models.
import * as THREE from 'three';

const _c = new THREE.Color();

export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x, z, s) {
  let h = (x * 374761393 + z * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function valueNoise(x, z, s = 1) {
  const xi = Math.floor(x), zi = Math.floor(z);
  const xf = x - xi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi, s), b = hash2(xi + 1, zi, s), c = hash2(xi, zi + 1, s), d = hash2(xi + 1, zi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// Per-face baked shading gives crisp voxel edges regardless of lighting.
const SHADE = { px: 0.84, nx: 0.8, py: 1.0, ny: 0.6, pz: 0.93, nz: 0.74 };

export class VoxBuilder {
  constructor() {
    this.pos = [];
    this.nor = [];
    this.col = [];
    this.ind = [];
    this.v = 0;
  }

  quad(a, b, c, d, n, r, g, bl, shade) {
    // Fix winding so the face points along n.
    const e1x = b[0] - a[0], e1y = b[1] - a[1], e1z = b[2] - a[2];
    const e2x = c[0] - a[0], e2y = c[1] - a[1], e2z = c[2] - a[2];
    const cx = e1y * e2z - e1z * e2y, cy = e1z * e2x - e1x * e2z, cz = e1x * e2y - e1y * e2x;
    const flip = cx * n[0] + cy * n[1] + cz * n[2] < 0;
    const verts = flip ? [a, d, c, b] : [a, b, c, d];
    for (const p of verts) {
      this.pos.push(p[0], p[1], p[2]);
      this.nor.push(n[0], n[1], n[2]);
      this.col.push(r * shade, g * shade, bl * shade);
    }
    const v = this.v;
    this.ind.push(v, v + 1, v + 2, v, v + 2, v + 3);
    this.v += 4;
  }

  // Axis-aligned box from min corner (x, y, z) with size (w, h, d).
  box(x, y, z, w, h, d, hex, mul = 1) {
    _c.set(hex);
    const r = _c.r * mul, g = _c.g * mul, b = _c.b * mul;
    const x1 = x + w, y1 = y + h, z1 = z + d;
    this.quad([x1, y, z], [x1, y1, z], [x1, y1, z1], [x1, y, z1], [1, 0, 0], r, g, b, SHADE.px);
    this.quad([x, y, z], [x, y, z1], [x, y1, z1], [x, y1, z], [-1, 0, 0], r, g, b, SHADE.nx);
    this.quad([x, y1, z], [x, y1, z1], [x1, y1, z1], [x1, y1, z], [0, 1, 0], r, g, b, SHADE.py);
    this.quad([x, y, z], [x1, y, z], [x1, y, z1], [x, y, z1], [0, -1, 0], r, g, b, SHADE.ny);
    this.quad([x, y, z1], [x1, y, z1], [x1, y1, z1], [x, y1, z1], [0, 0, 1], r, g, b, SHADE.pz);
    this.quad([x, y, z], [x, y1, z], [x1, y1, z], [x1, y, z], [0, 0, -1], r, g, b, SHADE.nz);
    return this;
  }

  // Build geometry; scale converts voxel units to world units.
  build(scale = 1, recenter = true) {
    const pos = new Float32Array(this.pos);
    if (recenter) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, minZ = Infinity, maxZ = -Infinity;
      for (let i = 0; i < pos.length; i += 3) {
        minX = Math.min(minX, pos[i]); maxX = Math.max(maxX, pos[i]);
        minY = Math.min(minY, pos[i + 1]);
        minZ = Math.min(minZ, pos[i + 2]); maxZ = Math.max(maxZ, pos[i + 2]);
      }
      const ox = (minX + maxX) / 2, oz = (minZ + maxZ) / 2;
      for (let i = 0; i < pos.length; i += 3) {
        pos[i] -= ox; pos[i + 1] -= minY; pos[i + 2] -= oz;
      }
    }
    for (let i = 0; i < pos.length; i++) pos[i] *= scale;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(this.nor), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.col), 3));
    g.setIndex(this.ind);
    g.computeBoundingSphere();
    return g;
  }
}

const V = () => new VoxBuilder();

// ---------------------------------------------------------------- characters
// Early-1800s looks. Each character is a set of limb geometries with pivots so the walk cycle can swing them.
const LOOKS = {
  pip: { skin: '#ffcf9e', hair: '#6b3e1f', shirt: '#f2efe6', coat: '#2f4f8f', coat2: '#22396a', legs: '#8a6a45', boots: '#3a2a1c', hat: 'cap', hatCol: '#4a4a58', scarf: '#b03a2e' },
  joe: { big: true, skin: '#f0bf8f', hair: '#8a5a2a', shirt: '#ece4d0', coat: '#ece4d0', coat2: '#d8cfb8', apron: '#6b4a2a', legs: '#4a4a5a', boots: '#2a2018', whiskers: true },
  herbert: { skin: '#ffd8b0', hair: '#c8a060', shirt: '#ffffff', coat: '#3f6f4f', coat2: '#2f5a3c', legs: '#d8cfb0', boots: '#1a1a1a', hat: 'top', hatCol: '#1e1e24', cravat: true },
  biddy: { skin: '#ffcf9e', hair: '#5a3a1a', shirt: '#f2efe6', dress: '#7a5aa0', dress2: '#5f4482', apron: '#f2efe6', legs: '#5f4482', boots: '#3a2a1c', hat: 'bonnet', hatCol: '#ecdcae', ribbon: '#c0405a' },
  convict: { skin: '#e8b890', hair: '#3a3a3a', shirt: '#8d8f96', coat: '#7d7f86', coat2: '#6a6c73', legs: '#7d7f86', boots: '#3a3030', hat: 'rag', hatCol: '#9a8f7a', iron: true, stubble: true },
  provis: { skin: '#d8a070', hair: '#a0a0a0', shirt: '#e8e0cc', coat: '#3a3550', coat2: '#2a2640', legs: '#5a5048', boots: '#2a2018', hat: 'top', hatCol: '#3a3030', stubble: true },
};

export function buildHero(id) {
  const L = LOOKS[id] || LOOKS.pip;
  const s = 0.1;
  const big = !!L.big;
  const eye = '#191736';
  const legW = big ? 2.6 : 2;
  const makeLeg = (iron) => {
    const v = V().box(-legW / 2, -3, -1.1, legW, 3, 2.2, L.legs).box(-legW / 2 - 0.1, -3, -1.25, legW + 0.2, 1.1, 2.6, L.boots);
    if (iron) v.box(-legW / 2 - 0.4, -2.3, -1.5, legW + 0.8, 0.7, 3, '#4a4a52');
    return v.build(s, false);
  };
  const legL = makeLeg(!!L.iron);
  const legR = makeLeg(false);
  const armW = big ? 2.6 : 1.8;
  const av = V();
  if (big) {
    av.box(-armW / 2, -1.6, -armW / 2, armW, 1.6, armW, L.shirt);
    av.box(-armW / 2 + 0.1, -3.6, -armW / 2 + 0.1, armW - 0.2, 2, armW - 0.2, L.skin);
  } else {
    av.box(-armW / 2, -3.6, -armW / 2, armW, 3.6, armW, L.dress || L.coat);
  }
  av.box(-armW / 2, -4.6, -armW / 2, armW, 1.1, armW, L.skin);
  const arm = av.build(s, false);

  const body = V();
  const bw = big ? 8 : 6;
  if (L.dress) {
    body.box(-bw / 2 - 0.8, 0.4, -2.8, bw + 1.6, 2.8, 5.6, L.dress2);
    body.box(-bw / 2 - 0.4, 3.2, -2.4, bw + 0.8, 2, 4.8, L.dress);
    body.box(-bw / 2, 5.2, -2, bw, 2.8, 4, L.dress);
    body.box(-bw / 2 + 1, 1.0, 2.7, bw - 2, 6.2, 0.4, L.apron);
    body.box(-1.2, 7.2, 1.9, 2.4, 0.8, 0.3, '#ffffff');
  } else {
    body.box(-bw / 2, 3, -2, bw, 5, 4, L.coat);
    if (big) {
      body.box(-bw / 2 + 0.8, 1.4, 2.0, bw - 1.6, 6.4, 0.4, L.apron);
      body.box(-bw / 2 + 0.6, 7.2, 1.95, 0.8, 1, 0.3, L.apron);
      body.box(bw / 2 - 1.4, 7.2, 1.95, 0.8, 1, 0.3, L.apron);
    } else {
      body.box(-bw / 2, 1.8, -2.15, bw, 1.6, 1.4, L.coat2);
      body.box(-1, 3.6, 1.95, 2, 4.2, 0.2, L.shirt);
      body.box(-bw / 2 - 0.05, 3.3, -2.05, bw + 0.1, 0.7, 4.1, L.coat2);
      body.box(-0.25, 4.4, 2.1, 0.5, 0.5, 0.1, '#c9a227');
      body.box(-0.25, 5.8, 2.1, 0.5, 0.5, 0.1, '#c9a227');
    }
    if (L.cravat) body.box(-1.2, 7.1, 1.9, 2.4, 1, 0.5, '#ffffff');
    if (L.scarf) body.box(-bw / 2 + 0.2, 7.1, -2.2, bw - 0.4, 1, 4.4, L.scarf);
    if (L.iron) body.box(-0.4, 5, 2.0, 0.8, 1.4, 0.2, '#4a4a52');
  }
  const bodyG = body.build(s, false);

  const head = V();
  head.box(-3.5, 0, -3, 7, 6, 6, L.skin);
  head.box(-2.4, 2.4, 2.95, 1.2, 1.5, 0.2, eye);
  head.box(1.2, 2.4, 2.95, 1.2, 1.5, 0.2, eye);
  head.box(-2.1, 3.3, 3.05, 0.5, 0.5, 0.1, '#ffffff');
  head.box(1.5, 3.3, 3.05, 0.5, 0.5, 0.1, '#ffffff');
  head.box(-3.3, 1.5, 2.95, 1.1, 0.8, 0.2, '#ff9aa2');
  head.box(2.2, 1.5, 2.95, 1.1, 0.8, 0.2, '#ff9aa2');
  if (L.stubble) head.box(-2.6, 0.1, 2.95, 5.2, 1.1, 0.15, '#9a7a62');
  head.box(-3.7, 4.6, -3.2, 7.4, 1.6, 6.4, L.hair);
  head.box(-3.7, 1.6, -3.2, 1, 3.2, 4.2, L.hair);
  head.box(2.7, 1.6, -3.2, 1, 3.2, 4.2, L.hair);
  head.box(-3.7, 0.8, -3.25, 7.4, 4, 1, L.hair);
  if (L.whiskers) {
    head.box(-3.7, 0.2, 0.6, 1, 2.6, 2.2, L.hair);
    head.box(2.7, 0.2, 0.6, 1, 2.6, 2.2, L.hair);
  }
  if (L.hat === 'cap') {
    head.box(-3.9, 5.6, -3.4, 7.8, 1.4, 6.8, L.hatCol);
    head.box(-3.4, 5.5, 3.3, 6.8, 0.5, 1.8, '#3a3a46');
  } else if (L.hat === 'top') {
    head.box(-4.4, 5.8, -3.8, 8.8, 0.6, 7.6, L.hatCol);
    head.box(-3, 6.4, -2.6, 6, 5, 5.2, L.hatCol);
    head.box(-3.05, 6.6, -2.65, 6.1, 0.8, 5.3, '#5a3a2a');
  } else if (L.hat === 'bonnet') {
    head.box(-4.1, 3, -3.7, 8.2, 4.4, 1.2, L.hatCol);
    head.box(-4.1, 6, -3.7, 8.2, 1.4, 7.5, L.hatCol);
    head.box(-4.1, 1.4, -3.7, 0.9, 4.8, 7.5, L.hatCol);
    head.box(3.2, 1.4, -3.7, 0.9, 4.8, 7.5, L.hatCol);
    head.box(-4.3, 6.4, 3.5, 8.6, 1, 0.8, L.hatCol);
    head.box(-0.7, -0.2, 3.0, 1.4, 1.2, 0.5, L.ribbon);
    head.box(-3.3, 6.6, -1.5, 6.6, 0.6, 1.2, L.ribbon);
  } else if (L.hat === 'rag') {
    head.box(-3.8, 3.8, -3.3, 7.6, 1.4, 6.6, L.hatCol);
    head.box(2.4, 3.6, -3.9, 1.6, 1.6, 1, L.hatCol);
  }
  const headG = head.build(s, false);
  return {
    legL, legR, arm, body: bodyG, head: headG,
    legX: big ? 1.6 : 1.3, legY: 3,
    armX: big ? 5.3 : 4, armY: 7.6,
    headY: 8, scale: s,
  };
}

// ---------------------------------------------------------------- enemies
export function enemyGeometry(type) {
  const v = V();
  switch (type) {
    case 'gloop':
      v.box(-4.5, 0, -4.5, 9, 5, 9, '#7d5fd3');
      v.box(-3.5, 5, -3.5, 7, 2, 7, '#8f72e0');
      v.box(-2.5, 7, -2.5, 5, 1, 5, '#a58cf0');
      v.box(-3.2, 5.6, 2.5, 1.6, 1, 1.05, '#d7ccff');
      v.box(-2.6, 2.6, 4.5, 2, 2, 0.4, '#ffffff');
      v.box(0.6, 2.6, 4.5, 2, 2, 0.4, '#ffffff');
      v.box(-2.1, 2.8, 4.85, 1, 1.2, 0.3, '#191736');
      v.box(1.1, 2.8, 4.85, 1, 1.2, 0.3, '#191736');
      v.box(-1, 1.2, 4.5, 2, 0.7, 0.4, '#3b2a6b');
      break;
    case 'flutter':
      v.box(-2, 0, -2, 4, 4, 4, '#4b3a6b');
      v.box(-1.5, 0.5, 2, 3, 2.4, 0.4, '#6a5592');
      v.box(-2, 4, -0.5, 1, 1.6, 1, '#4b3a6b');
      v.box(1, 4, -0.5, 1, 1.6, 1, '#4b3a6b');
      v.box(-7, 1.6, -1.2, 5, 0.8, 3, '#33264f');
      v.box(2, 1.6, -1.2, 5, 0.8, 3, '#33264f');
      v.box(-8.5, 2.2, -1.2, 1.6, 0.8, 2, '#33264f');
      v.box(6.9, 2.2, -1.2, 1.6, 0.8, 2, '#33264f');
      v.box(-1.5, 2.3, 2.0, 1, 1, 0.4, '#ffe066');
      v.box(0.5, 2.3, 2.0, 1, 1, 0.4, '#ffe066');
      break;
    case 'shroom':
      v.box(-2, 0, -2, 4, 5, 4, '#f1e3c8');
      v.box(-1.5, 2.4, 2, 1, 1.3, 0.4, '#191736');
      v.box(0.5, 2.4, 2, 1, 1.3, 0.4, '#191736');
      v.box(-4, 5, -4, 8, 1, 8, '#d9c6a3');
      v.box(-5, 6, -5, 10, 3, 10, '#9b4fd1');
      v.box(-3.5, 9, -3.5, 7, 1, 7, '#b066e8');
      v.box(-2.5, 9.6, -1, 2, 0.6, 2, '#f4e9ff');
      v.box(1, 9.6, 1, 1.6, 0.6, 1.6, '#f4e9ff');
      v.box(4.8, 7, -1, 0.5, 1.5, 2, '#f4e9ff');
      v.box(-5.3, 7, 1, 0.5, 1.5, 1.6, '#f4e9ff');
      v.box(-1, 7, 4.8, 2, 1.5, 0.5, '#f4e9ff');
      break;
    case 'spitbud':
      v.box(-1, 0, -1, 2, 4, 2, '#3e8f4a');
      v.box(-4, 0.5, -1, 3, 1, 2, '#4caf50');
      v.box(1, 0.5, -1, 3, 1, 2, '#4caf50');
      v.box(-3.5, 4, -3.5, 7, 6, 7, '#d64f9a');
      v.box(-4.5, 5.5, -2, 1, 3.5, 4, '#ff7ac0');
      v.box(3.5, 5.5, -2, 1, 3.5, 4, '#ff7ac0');
      v.box(-2, 5.5, -4.5, 4, 3.5, 1, '#ff7ac0');
      v.box(-2, 10, -2, 4, 1, 4, '#ff7ac0');
      v.box(-1.6, 5.2, 3.5, 3.2, 2.4, 0.5, '#3a1030');
      v.box(-2.6, 8, 3.5, 1.6, 1, 0.4, '#ffffff');
      v.box(1, 8, 3.5, 1.6, 1, 0.4, '#ffffff');
      break;
    case 'beetle':
      v.box(-4, 1, -5, 8, 4, 9, '#2e3f7a');
      v.box(-0.5, 5, -5, 1, 0.5, 9, '#4a63b5');
      v.box(-3, 5, -3, 2, 0.4, 3, '#5b78d1');
      v.box(-3, 1, 4, 6, 3, 3, '#1f2a52');
      v.box(-0.5, 3, 6, 1, 1, 3, '#c9d4ff');
      v.box(-2.5, 2.5, 7, 1, 1, 0.4, '#ff5d5d');
      v.box(1.5, 2.5, 7, 1, 1, 0.4, '#ff5d5d');
      for (const z of [-4, -1, 2]) {
        v.box(-5, 0, z, 1, 2, 1, '#1f2a52');
        v.box(4, 0, z, 1, 2, 1, '#1f2a52');
      }
      break;
    default:
      v.box(-1, 0, -1, 2, 2, 2, '#ff00ff');
  }
  return v.build(1);
}

export function kingGeometry() {
  const v = V();
  v.box(-4.5, 0, -4.5, 9, 5, 9, '#6b4fc0');
  v.box(-3.5, 5, -3.5, 7, 2, 7, '#7d5fd3');
  v.box(-2.5, 7, -2.5, 5, 1, 5, '#8f72e0');
  v.box(-2.6, 2.6, 4.5, 2, 2, 0.4, '#ffffff');
  v.box(0.6, 2.6, 4.5, 2, 2, 0.4, '#ffffff');
  v.box(-2.1, 2.6, 4.85, 1.2, 1.2, 0.3, '#191736');
  v.box(0.9, 2.6, 4.85, 1.2, 1.2, 0.3, '#191736');
  v.box(-2.4, 4.6, 4.5, 2, 0.5, 0.4, '#191736'); // angry brows
  v.box(0.4, 4.6, 4.5, 2, 0.5, 0.4, '#191736');
  v.box(-1.5, 1, 4.5, 3, 0.8, 0.4, '#2a1b52');
  v.box(-3, 8, -3, 6, 1.6, 6, '#ffd23f');
  for (const [x, z] of [[-3, -3], [2, -3], [-3, 2], [2, 2], [-0.5, -3], [-0.5, 2]]) v.box(x, 9.6, z, 1, 1.4, 1, '#ffd23f');
  v.box(-0.6, 8.3, 2.9, 1.2, 1, 0.3, '#ff5d5d');
  return v.build(0.36);
}

export function golemGeometry() {
  const v = V();
  v.box(-5, 0, -3, 4, 6, 6, '#3f3a57');
  v.box(1, 0, -3, 4, 6, 6, '#3f3a57');
  v.box(-7, 6, -4, 14, 10, 8, '#5d5878');
  v.box(-7, 6, -4.05, 14, 1.5, 8.1, '#4a4562');
  v.box(-2, 9, 3.9, 4, 4, 0.6, '#c38bff');
  v.box(-1, 10, 4.3, 2, 2, 0.4, '#f0d9ff');
  v.box(-4, 16, -3.5, 8, 6, 7, '#6b6690');
  v.box(-3, 18, 3.4, 6, 1.5, 0.5, '#ff4fd8');
  v.box(-10, 5, -2, 3, 10, 4, '#4a4562');
  v.box(7, 5, -2, 3, 10, 4, '#4a4562');
  v.box(-10.5, 3, -2.5, 4, 3, 5, '#3f3a57');
  v.box(6.5, 3, -2.5, 4, 3, 5, '#3f3a57');
  v.box(-9, 14, -2, 3, 5, 3, '#9b6bff');
  v.box(6, 14, -2, 3, 5, 3, '#9b6bff');
  v.box(-8.5, 18, -1.5, 2, 2, 2, '#c38bff');
  v.box(6.5, 18, -1.5, 2, 2, 2, '#c38bff');
  v.box(-1, 22, -1, 2, 3, 2, '#9b6bff');
  return v.build(0.15);
}

// ---------------------------------------------------------------- props and pickups
export function treeGeometry(kind) {
  const v = V();
  if (kind === 0) {
    v.box(-1, 0, -1, 2, 6, 2, '#7a4a2a');
    v.box(-3.5, 4.5, -3.5, 7, 0.6, 7, '#3a8f40');
    v.box(-4, 5, -4, 8, 4, 8, '#4caf50');
    v.box(-3, 9, -3, 6, 2, 6, '#5cc05e');
    v.box(-1.5, 11, -1.5, 3, 1, 3, '#6fd16a');
    v.box(-4.05, 6, 1, 0.2, 1, 1, '#ff8fb1');
    v.box(2, 7, 3.95, 1, 1, 0.2, '#ff8fb1');
  } else {
    v.box(-1, 0, -1, 2, 3, 2, '#6b4226');
    v.box(-4, 3, -4, 8, 2, 8, '#2f7a3a');
    v.box(-3, 5, -3, 6, 2, 6, '#3a8f40');
    v.box(-2, 7, -2, 4, 2, 4, '#4caf50');
    v.box(-1, 9, -1, 2, 2, 2, '#5cc05e');
  }
  return v.build(0.2);
}

export function rockGeometry() {
  return V().box(-2, 0, -1.5, 4, 2, 3, '#8e94a6').box(-1, 2, -1, 2, 1, 2, '#a9afc0').box(1, 0, 0.5, 2, 1, 2, '#7d8396').build(0.18);
}

export function tuftGeometry() {
  return V().box(-1, 0, 0, 0.6, 2, 0.6, '#5fb84a').box(0, 0, -0.6, 0.6, 3, 0.6, '#6cc755').box(0.8, 0, 0.4, 0.6, 1.6, 0.6, '#4fa63e').build(0.13);
}

export function flowerGeometry(petal) {
  const v = V();
  v.box(-0.5, 0, -0.5, 1, 3, 1, '#3e8f4a');
  v.box(0.5, 1, -0.5, 1.5, 0.6, 1, '#4caf50');
  v.box(-1.5, 3, -0.5, 3, 1, 1, petal);
  v.box(-0.5, 3, -1.5, 1, 1, 3, petal);
  v.box(-0.5, 3.4, -0.5, 1, 1, 1, '#ffd23f');
  return v.build(0.12);
}

export function chestGeometry() {
  return V()
    .box(-3, 0, -2, 6, 3, 4, '#8b5a2b')
    .box(-3.2, 3, -2.2, 6.4, 1.6, 4.4, '#a0692f')
    .box(-3.3, 1.5, -2.3, 6.6, 0.6, 4.6, '#ffd23f')
    .box(-0.6, 2, 2.2, 1.2, 1.4, 0.4, '#ffd23f')
    .build(0.14);
}

export function gemGeometry() {
  return V().box(-1, 0, -1, 2, 1, 2, '#ffffff').box(-1.5, 1, -1.5, 3, 1.2, 3, '#ffffff').box(-1, 2.2, -1, 2, 1, 2, '#ffffff').box(-0.5, 3.2, -0.5, 1, 0.6, 1, '#ffffff').build(0.1);
}

export function acornGeometry(scale = 0.13) {
  return V()
    .box(-1.2, 0, -1.2, 2.4, 2.2, 2.4, '#d9a066')
    .box(-1.5, 2, -1.5, 3, 1.2, 3, '#6b4226')
    .box(-0.3, 3.2, -0.3, 0.6, 0.8, 0.6, '#5a3418')
    .box(-0.9, 0.8, 1.15, 0.6, 0.8, 0.1, '#ffe2b5')
    .build(scale);
}

export function appleGeometry() {
  return V().box(-1.5, 0, -1.5, 3, 3, 3, '#e8484a').box(-0.8, 1.6, 1.45, 0.7, 0.7, 0.1, '#ffd0d0').box(-0.25, 3, -0.25, 0.5, 1, 0.5, '#6b4226').box(0.25, 3.3, -0.25, 1.2, 0.4, 0.8, '#4caf50').build(0.13);
}

export function honeyGeometry() {
  return V().box(-1.3, 0, -1.3, 2.6, 2.8, 2.6, '#ffb627').box(-1.5, 2.8, -1.5, 3, 0.8, 3, '#8b5a2b').box(-0.7, 0.8, 1.25, 1.4, 1, 0.1, '#fff1c2').build(0.13);
}

export function coneGeometry() {
  return V().box(-1.2, 0, -1.2, 2.4, 3, 2.4, '#7a4a2a').box(-1.5, 0.6, -1.5, 3, 0.6, 3, '#8b5a2b').box(-1.5, 1.8, -1.5, 3, 0.6, 3, '#8b5a2b').box(-0.2, 3, -0.2, 0.4, 1, 0.4, '#ff5d5d').build(0.14);
}

export function leafGeometry() {
  return V().box(-2.5, 0, -0.8, 5, 0.5, 1.6, '#8be05f').box(-1.5, 0, -1.4, 3, 0.5, 2.8, '#7ed957').box(-2.5, 0.5, -0.15, 5, 0.12, 0.3, '#3f8f3a').build(0.15);
}

export function carrotGeometry() {
  return V().box(-3, 0, -0.7, 5, 1.4, 1.4, '#ff7a1a').box(-4, 0.2, -0.45, 1, 1, 0.9, '#ff9f43').box(-1, 1.39, -0.7, 0.6, 0.05, 1.4, '#d95f00').box(2, 0.2, -0.5, 2, 1, 1, '#4caf50').box(3, 0.4, -1.2, 1.6, 0.6, 2.4, '#5fb84a').build(0.14);
}

export function beeGeometry() {
  return V()
    .box(-1, 0, -1.5, 2, 2, 3, '#ffd23f')
    .box(-1.05, -0.02, -0.5, 2.1, 2.04, 0.6, '#191736')
    .box(-1.05, -0.02, 0.8, 2.1, 2.04, 0.5, '#191736')
    .box(-2.5, 2, -0.5, 1.8, 0.3, 1.5, '#e6f7ff')
    .box(0.7, 2, -0.5, 1.8, 0.3, 1.5, '#e6f7ff')
    .box(-0.3, 0.7, -2, 0.6, 0.6, 0.5, '#191736')
    .build(0.11);
}

export function cloudGeometry(seed) {
  const r = rng(seed);
  const v = V();
  const n = 3 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const w = 4 + r() * 6, d = 3 + r() * 5, h = 1.5 + r() * 2.5;
    v.box(i * 3 - n * 1.5 + r() * 2, r() * 1.2, -d / 2 + (r() - 0.5) * 3, w, h, d, '#ffffff');
  }
  return v.build(1);
}

// Unit box used for particles, projectiles and beams.
export function cubeGeometry() {
  return V().box(-0.5, -0.5, -0.5, 1, 1, 1, '#ffffff').build(1, false);
}

// ---------------------------------------------------------------- island mesher
const AIR = 0, GRASS = 1, DIRT = 2, STONE = 3, DEEP = 4, CRYSTAL = 5, RIM = 6;

const PALETTES = {
  meadow: { grass: ['#6cc24a', '#78cc52', '#62b844', '#82d35c'], dirt: ['#9a6a3f', '#8d5f37'], stone: ['#8a8fa0', '#7c8193'], deep: ['#5f6278', '#56596d'], crystal: ['#c38bff', '#8fe9ff'] },
  marsh: { grass: ['#86a85e', '#90b066', '#7a9c55', '#9ab872'], dirt: ['#6e5a3e', '#62503a'], stone: ['#7e8488', '#72787c'], deep: ['#555a64', '#4c5059'], crystal: ['#9fc8d8', '#c0d8e8'] },
  garden: { grass: ['#4f9a3f', '#5aa646', '#46903a', '#63ae4e'], dirt: ['#7a5a3a', '#6e5034'], stone: ['#8a8680', '#7e7a74'], deep: ['#5a5650', '#504c48'], crystal: ['#ff8fb1', '#ffd23f'] },
  cobble: { grass: ['#a8a292', '#b4ad9c', '#9a9586', '#bfb8a6'], dirt: ['#7a6a5a', '#6e5e50'], stone: ['#7c7a74', '#706e68'], deep: ['#55534e', '#4c4a46'], crystal: ['#ffd58a', '#e8b860'] },
  bank: { grass: ['#6aac52', '#76b85c', '#609e48', '#82c466'], dirt: ['#8a7050', '#7e6448'], stone: ['#8a8fa0', '#7c8193'], deep: ['#5f6278', '#56596d'], crystal: ['#8fd3ff', '#b8e8ff'] },
  village: { grass: ['#7cc95a', '#88d464', '#72bf52', '#93db6e'], dirt: ['#9a6a3f', '#8d5f37'], stone: ['#8a8fa0', '#7c8193'], deep: ['#5f6278', '#56596d'], crystal: ['#ffd23f', '#ff8fb1'] },
};

export const CELL = 4; // bloom cell size in world units

export function islandRadius(theta) {
  return 31 + 2.2 * Math.sin(3 * theta + 0.7) + 1.4 * Math.sin(5 * theta + 2.1) + 0.8 * Math.sin(9 * theta);
}

export function walkRadius(theta) {
  return islandRadius(theta) - 2.8;
}

function toGloom(r, g, b) {
  const lum = 0.3 * r + 0.59 * g + 0.11 * b;
  const t = 0.62;
  return [lum * (1 - t) + 0.09 * t, lum * (1 - t) + 0.075 * t, lum * (1 - t) + 0.16 * t];
}

export function buildIsland(seed = 7, paletteName = 'meadow') {
  const COLORS = PALETTES[paletteName] || PALETTES.meadow;
  const N = 80, Y0 = -17, Y1 = 3, SY = Y1 - Y0;
  const half = N / 2;
  const grid = new Uint8Array(N * N * SY);
  const shadeVar = new Uint8Array(N * N * SY);
  const R = rng(seed);
  const at = (x, y, z) => {
    if (x < 0 || z < 0 || x >= N || z >= N || y < Y0 || y >= Y1) return AIR;
    return grid[((y - Y0) * N + z) * N + x];
  };
  const set = (x, y, z, t) => {
    const i = ((y - Y0) * N + z) * N + x;
    grid[i] = t;
    shadeVar[i] = Math.floor(R() * 4);
  };

  for (let z = 0; z < N; z++) {
    for (let x = 0; x < N; x++) {
      const wx = x - half + 0.5, wz = z - half + 0.5;
      const r = Math.hypot(wx, wz);
      const th = Math.atan2(wz, wx);
      const Rt = islandRadius(th);
      if (r > Rt) continue;
      const t = r / Rt;
      const depth = Math.max(2, Math.floor(2 + 13.5 * Math.pow(Math.max(0, 1 - t * t), 0.75) + (valueNoise(wx * 0.25, wz * 0.25, 3) - 0.5) * 4));
      for (let L = -1; L >= -depth && L >= Y0; L--) {
        let type;
        if (L === -1) type = GRASS;
        else if (L >= -3) type = DIRT;
        else if (R() < 0.035) type = CRYSTAL;
        else type = L < -8 ? DEEP : STONE;
        set(x, L, z, type);
      }
      if (r > Rt - 1.8 && valueNoise(wx * 0.5, wz * 0.5, 9) > 0.42) {
        set(x, 0, z, RIM);
        if (valueNoise(wx * 0.7, wz * 0.7, 11) > 0.7) set(x, 1, z, RIM);
      }
    }
  }

  const CN = N / CELL;
  const pos = [], nor = [], col = [], ind = [];
  const gloomCol = [], bloomCol = [], vCell = [];
  let vc = 0;
  const DIRS = [
    { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1], shade: SHADE.px },
    { n: [-1, 0, 0], u: [0, 1, 0], v: [0, 0, 1], shade: SHADE.nx },
    { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1], shade: SHADE.py },
    { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], shade: SHADE.ny },
    { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], shade: SHADE.pz },
    { n: [0, 0, -1], u: [1, 0, 0], v: [0, 1, 0], shade: SHADE.nz },
  ];
  const AO = [0.5, 0.68, 0.84, 1];

  function colorFor(type, sv, isTop, x, z) {
    let hex;
    switch (type) {
      case GRASS: case RIM:
        hex = COLORS.grass[(sv + Math.floor(valueNoise(x * 0.3, z * 0.3, 5) * 3)) % 4];
        break;
      case DIRT: hex = COLORS.dirt[sv % 2]; break;
      case STONE: hex = COLORS.stone[sv % 2]; break;
      case DEEP: hex = COLORS.deep[sv % 2]; break;
      case CRYSTAL: hex = COLORS.crystal[sv % 2]; break;
      default: hex = '#ff00ff';
    }
    _c.set(hex);
    return [_c.r, _c.g, _c.b];
  }

  function emitFace(x, y, z, d, rgb, grassy, cell, y0f = 0, y1f = 1) {
    // Corners of the face in world space (block min corner = x - half, y, z - half).
    const bx = x - half, by = y, bz = z - half;
    const n = d.n, u = d.u, w = d.v;
    const base = [bx + (n[0] > 0 ? 1 : 0), by + (n[1] > 0 ? 1 : 0), bz + (n[2] > 0 ? 1 : 0)];
    const corners = [[0, 0], [1, 0], [1, 1], [0, 1]];
    const verts = [];
    for (const [cu, cv] of corners) {
      let fu = cu, fv = cv;
      // Side faces may be split vertically (grass strip). u is y for x-faces, v is y for z-faces.
      if (d.n[0] !== 0) fu = cu === 0 ? y0f : y1f;
      if (d.n[2] !== 0) fv = cv === 0 ? y0f : y1f;
      const px = base[0] + u[0] * fu + w[0] * fv;
      const py = base[1] + u[1] * fu + w[1] * fv;
      const pz = base[2] + u[2] * fu + w[2] * fv;
      // AO samples in the layer in front of the face.
      const ox = x + n[0], oy = y + n[1], oz = z + n[2];
      const su = cu ? 1 : -1, sv = cv ? 1 : -1;
      const s1 = at(ox + u[0] * su, oy + u[1] * su, oz + u[2] * su) !== AIR ? 1 : 0;
      const s2 = at(ox + w[0] * sv, oy + w[1] * sv, oz + w[2] * sv) !== AIR ? 1 : 0;
      const cr = at(ox + u[0] * su + w[0] * sv, oy + u[1] * su + w[1] * sv, oz + u[2] * su + w[2] * sv) !== AIR ? 1 : 0;
      const ao = s1 && s2 ? 0 : 3 - (s1 + s2 + cr);
      verts.push([px, py, pz, AO[ao]]);
    }
    // Winding: make (b-a)x(c-a) point along n.
    const a = verts[0], b = verts[1], c = verts[2];
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cx = e1[1] * e2[2] - e1[2] * e2[1], cy = e1[2] * e2[0] - e1[0] * e2[2], cz = e1[0] * e2[1] - e1[1] * e2[0];
    const order = cx * n[0] + cy * n[1] + cz * n[2] < 0 ? [0, 3, 2, 1] : [0, 1, 2, 3];
    const g = grassy ? toGloom(rgb[0], rgb[1], rgb[2]) : null;
    for (const k of order) {
      const p = verts[k];
      const m = d.shade * p[3];
      pos.push(p[0], p[1], p[2]);
      nor.push(n[0], n[1], n[2]);
      if (grassy) {
        col.push(g[0] * m, g[1] * m, g[2] * m);
        gloomCol.push(g[0] * m, g[1] * m, g[2] * m);
        bloomCol.push(rgb[0] * m, rgb[1] * m, rgb[2] * m);
        vCell.push(cell);
      } else {
        col.push(rgb[0] * m, rgb[1] * m, rgb[2] * m);
        gloomCol.push(0, 0, 0);
        bloomCol.push(0, 0, 0);
        vCell.push(-1);
      }
    }
    // Flip the diagonal when AO is uneven to avoid streaks.
    const aoA = verts[order[0]][3] + verts[order[2]][3];
    const aoB = verts[order[1]][3] + verts[order[3]][3];
    if (aoA < aoB) ind.push(vc + 1, vc + 2, vc + 3, vc + 1, vc + 3, vc);
    else ind.push(vc, vc + 1, vc + 2, vc, vc + 2, vc + 3);
    vc += 4;
  }

  const dirt = (() => { _c.set(COLORS.dirt[0]); return [_c.r, _c.g, _c.b]; })();
  for (let y = Y0; y < Y1; y++) {
    for (let z = 0; z < N; z++) {
      for (let x = 0; x < N; x++) {
        const type = at(x, y, z);
        if (type === AIR) continue;
        const sv = shadeVar[((y - Y0) * N + z) * N + x];
        const cell = Math.floor(x / CELL) + Math.floor(z / CELL) * CN;
        const grassy = type === GRASS || type === RIM;
        for (const d of DIRS) {
          if (at(x + d.n[0], y + d.n[1], z + d.n[2]) !== AIR) continue;
          const rgb = colorFor(type, sv, d.n[1] > 0, x, z);
          if (grassy && d.n[1] === 0) {
            // Grass side: green strip on top, dirt below.
            emitFace(x, y, z, d, rgb, true, cell, 0.7, 1);
            emitFace(x, y, z, d, dirt, false, cell, 0, 0.7);
          } else if (grassy && d.n[1] < 0) {
            emitFace(x, y, z, d, dirt, false, cell);
          } else {
            emitFace(x, y, z, d, rgb, grassy, cell);
          }
        }
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  const colorAttr = new THREE.Float32BufferAttribute(col, 3);
  geo.setAttribute('color', colorAttr);
  geo.setIndex(ind);
  geo.computeBoundingSphere();

  // Group grass vertices by bloom cell.
  const cellVerts = Array.from({ length: CN * CN }, () => []);
  for (let i = 0; i < vCell.length; i++) if (vCell[i] >= 0) cellVerts[vCell[i]].push(i);

  return {
    geo, colorAttr,
    gloom: new Float32Array(gloomCol), bloom: new Float32Array(bloomCol),
    cellVerts, CN, N, half,
  };
}

// ---------------------------------------------------------------- set pieces (authored around the origin, not recentred)
export const PROP_SCALE = {
  church: 0.36, grave: 0.2, battery: 0.22, reed: 0.12, clock: 0.21, manor: 0.42, cake: 0.2, lamp: 0.2,
  townhouse: 0.32, townhouse2: 0.32, crate: 0.18, barrel: 0.18, boat: 0.26, jetty: 0.25, cottage: 0.34,
  anvil: 0.2, hay: 0.22, fence: 0.22, parcel: 0.16, coin: 0.13, boomerang: 0.16, posy: 0.16,
};

export function propGeometry(name) {
  const v = V();
  switch (name) {
    case 'church':
      v.box(-6, 0, -4, 12, 9, 8, '#9a958a');
      v.box(-6.4, 9, -4.4, 12.8, 1.4, 8.8, '#4a4f5a');
      v.box(-5.6, 10.4, -3.6, 11.2, 1.4, 7.2, '#525866');
      v.box(-4.4, 11.8, -2.4, 8.8, 1.4, 4.8, '#4a4f5a');
      v.box(-3, 13.2, -1.2, 6, 1, 2.4, '#525866');
      v.box(-2.6, 0, 4, 5.2, 15, 5.2, '#8f8a7e');
      v.box(-3, 15, 3.6, 6, 1, 6, '#7a766c');
      v.box(-2, 16, 4.6, 4, 4, 4, '#4a4f5a');
      v.box(-1, 20, 5.6, 2, 3, 2, '#525866');
      v.box(-0.3, 23, 6.3, 0.6, 1.6, 0.6, '#c9a227');
      v.box(-1, 0, 9.15, 2, 3.6, 0.2, '#4a3020');
      v.box(-0.8, 10, 9.15, 1.6, 2.4, 0.2, '#2a2a3a');
      for (const z of [-2.5, 0.5]) {
        v.box(-6.15, 3, z, 0.2, 3, 1.4, '#2a3040');
        v.box(5.95, 3, z, 0.2, 3, 1.4, '#2a3040');
      }
      break;
    case 'grave':
      v.box(-1.5, 0, -0.5, 3, 3.4, 1, '#a4a4a8');
      v.box(-1, 3.4, -0.5, 2, 0.6, 1, '#a4a4a8');
      v.box(-1.1, 2, 0.45, 2.2, 0.2, 0.1, '#7a7a80');
      v.box(-0.8, 1.3, 0.45, 1.6, 0.2, 0.1, '#7a7a80');
      v.box(-1.4, 0, 0.6, 2.8, 0.5, 3, '#5e5040');
      break;
    case 'battery':
      v.box(-5, 0, -4, 10, 2, 8, '#6e8052');
      v.box(-4, 2, -3, 8, 1, 6, '#7a8a5e');
      v.box(-1.6, 3, -1.6, 3.2, 1.4, 3.2, '#5a3a22');
      v.box(-2.2, 2.4, -1, 0.6, 2.2, 2.2, '#3a2614');
      v.box(1.6, 2.4, -1, 0.6, 2.2, 2.2, '#3a2614');
      v.box(-0.7, 4, -1, 1.4, 1.4, 6, '#2a2a2e');
      v.box(-0.9, 3.8, 4.6, 1.8, 1.8, 0.6, '#2a2a2e');
      v.box(3, 3, 1.5, 1, 1, 1, '#2a2a2e');
      v.box(3.2, 3, 2.7, 1, 1, 1, '#2a2a2e');
      v.box(3.1, 4, 2.1, 1, 1, 1, '#2a2a2e');
      break;
    case 'reed':
      v.box(0, 0, 0, 0.5, 5, 0.5, '#8a9a5a');
      v.box(0.8, 0, -0.7, 0.5, 4, 0.5, '#7a8a4a');
      v.box(-0.8, 0, 0.6, 0.5, 3.4, 0.5, '#94a462');
      v.box(-0.05, 5, -0.05, 0.6, 1.4, 0.6, '#6b4a2a');
      v.box(0.75, 4, -0.75, 0.6, 1.2, 0.6, '#6b4a2a');
      break;
    case 'clock':
      v.box(-1.5, 0, -1, 3, 3, 2, '#5a3a22');
      v.box(-1.1, 3, -0.8, 2.2, 6, 1.6, '#6b4428');
      v.box(-0.5, 4.5, 0.75, 1, 3, 0.15, '#c9a227');
      v.box(-1.6, 9, -1.1, 3.2, 3.4, 2.2, '#5a3a22');
      v.box(-1.1, 9.6, 1.05, 2.2, 2.2, 0.15, '#f2e8c8');
      v.box(-0.9, 10.6, 1.18, 0.9, 0.22, 0.08, '#1a1a1a');
      v.box(-0.6, 9.9, 1.18, 0.22, 0.8, 0.08, '#1a1a1a');
      v.box(-0.4, 12.4, -0.3, 0.8, 0.8, 0.6, '#c9a227');
      break;
    case 'manor':
      v.box(-12, 0, -4, 24, 12, 8, '#8a4a3a');
      v.box(-12.4, 12, -4.4, 24.8, 1.2, 8.8, '#3a3a44');
      v.box(-11.6, 13.2, -3.4, 23.2, 1.4, 6.8, '#44444f');
      v.box(-10, 14.6, -2, 20, 1.2, 4, '#3a3a44');
      v.box(-9, 13, -1, 2, 5, 2, '#7a3e30');
      v.box(7, 13, -1, 2, 5, 2, '#7a3e30');
      for (const x of [-9.5, -5.5, 3.5, 7.5]) {
        for (const y of [3, 8]) {
          v.box(x, y, 3.95, 2, 2.6, 0.2, '#2a2028');
          v.box(x - 0.2, y + 1, 4.05, 2.4, 0.5, 0.15, '#7a5a3a');
        }
      }
      v.box(-1.2, 0, 3.95, 2.4, 4.4, 0.2, '#3a2418');
      v.box(-1.6, 4.4, 3.95, 3.2, 0.6, 0.25, '#d8cfb8');
      v.box(-12.1, 0, -1, 0.3, 8, 3, '#3f7a35');
      v.box(10.5, 2, 3.9, 1.6, 7, 0.4, '#3f7a35');
      v.box(-2, 0, 4, 4, 0.6, 1.4, '#b8b0a0');
      break;
    case 'cake':
      for (const [x, z] of [[-3.4, -2.4], [2.8, -2.4], [-3.4, 1.8], [2.8, 1.8]]) v.box(x, 0, z, 0.6, 3, 0.6, '#4a3020');
      v.box(-3.8, 3, -2.8, 7.6, 0.6, 5.6, '#d8d2c4');
      v.box(-3.8, 2.2, 2.75, 7.6, 0.8, 0.1, '#cfc8b8');
      v.box(-2, 3.6, -1.6, 4, 1.6, 3.2, '#d0c8b6');
      v.box(-1.4, 5.2, -1.1, 2.8, 1.4, 2.2, '#c8bfac');
      v.box(-0.8, 6.6, -0.6, 1.6, 1, 1.2, '#bfb6a2');
      v.box(-2.1, 4.4, -1.65, 0.1, 2.6, 0.1, '#f4f4f4');
      v.box(1.9, 4.6, 1.5, 0.1, 2.2, 0.1, '#f4f4f4');
      v.box(1.3, 4, 1.7, 0.5, 0.4, 0.5, '#1a1a1a');
      break;
    case 'lamp':
      v.box(-0.8, 0, -0.8, 1.6, 1.2, 1.6, '#2a2a30');
      v.box(-0.4, 1.2, -0.4, 0.8, 9, 0.8, '#2a2a30');
      v.box(-1.2, 9.4, -0.2, 2.4, 0.4, 0.4, '#2a2a30');
      v.box(-0.9, 10, -0.9, 1.8, 2, 1.8, '#ffe08a');
      v.box(-1.2, 12, -1.2, 2.4, 0.6, 2.4, '#2a2a30');
      v.box(-0.4, 12.6, -0.4, 0.8, 0.8, 0.8, '#2a2a30');
      break;
    case 'townhouse':
    case 'townhouse2': {
      const wall = name === 'townhouse' ? '#8a5a48' : '#e0d6c0';
      const door = name === 'townhouse' ? '#2a3a5a' : '#2f5a3c';
      v.box(-5, 0, -4, 10, 14, 8, wall);
      v.box(-5.3, 14, -4.3, 10.6, 1, 8.6, '#d8cfb8');
      v.box(-4, 15, -2, 2, 3, 2, '#7a4a3a');
      v.box(2, 15, -2, 2, 3, 2, '#7a4a3a');
      let k = 0;
      for (const x of [-3.5, 1.5]) {
        for (const y of [4.5, 8.5, 11.5]) {
          v.box(x, y, 3.95, 2, 2.4, 0.2, (k++ % 3 === 1) ? '#ffd58a' : '#2a3040');
          v.box(x - 0.2, y - 0.3, 4, 2.4, 0.3, 0.4, '#d8cfb8');
        }
      }
      v.box(-1, 0, 3.95, 2, 3.6, 0.2, door);
      v.box(-1, 3.6, 3.95, 2, 0.8, 0.2, '#ffd58a');
      v.box(-1.6, 0, 4, 3.2, 0.6, 1.2, '#b8b0a0');
      break;
    }
    case 'crate':
      v.box(-1.5, 0, -1.5, 3, 3, 3, '#a07848');
      v.box(-1.55, 0.4, -1.55, 3.1, 0.5, 3.1, '#7a5a34');
      v.box(-1.55, 2.1, -1.55, 3.1, 0.5, 3.1, '#7a5a34');
      break;
    case 'barrel':
      v.box(-1.2, 0, -1.2, 2.4, 3.4, 2.4, '#8a5a30');
      v.box(-1.4, 0.5, -1.4, 2.8, 2.4, 2.8, '#7a4a28');
      v.box(-1.45, 0.6, -1.45, 2.9, 0.3, 2.9, '#3a3a3a');
      v.box(-1.45, 2.5, -1.45, 2.9, 0.3, 2.9, '#3a3a3a');
      break;
    case 'boat':
      v.box(-2, 0, -5, 4, 0.6, 10, '#5a3a22');
      v.box(-2, 0.6, -5, 0.6, 1.4, 10, '#6b4428');
      v.box(1.4, 0.6, -5, 0.6, 1.4, 10, '#6b4428');
      v.box(-2, 0.6, -5, 4, 1.4, 0.6, '#6b4428');
      v.box(-1, 0, 5, 2, 1.8, 1.4, '#6b4428');
      v.box(-1.4, 1.2, -0.5, 2.8, 0.4, 1, '#8a6a45');
      v.box(-4.5, 1.4, 0, 3, 0.3, 0.5, '#c8a060');
      v.box(1.5, 1.4, 0, 3, 0.3, 0.5, '#c8a060');
      break;
    case 'jetty':
      v.box(-3, 0, -3, 6, 0.6, 6, '#8a6a45');
      for (const x of [-2, 0, 2]) v.box(x - 0.05, 0.55, -3, 0.1, 0.1, 6, '#5a4028');
      for (const [x, z] of [[-3.2, -3.2], [2.4, -3.2], [-3.2, 2.4], [2.4, 2.4]]) v.box(x, 0, z, 0.8, 3.2, 0.8, '#5a3a22');
      v.box(2.4, 3.2, 2.4, 0.8, 1, 0.8, '#ffd58a');
      break;
    case 'cottage':
      v.box(-7, 0, -4, 14, 7, 8, '#ece2c8');
      for (const x of [-7.05, -0.3, 6.45]) v.box(x, 0, -4.05, 0.6, 7, 8.1, '#4a3020');
      v.box(-7.05, 3.2, -4.05, 14.1, 0.5, 8.1, '#4a3020');
      v.box(-7.6, 7, -4.8, 15.2, 1.6, 9.6, '#c8a24a');
      v.box(-6.8, 8.6, -3.8, 13.6, 1.6, 7.6, '#bf9a42');
      v.box(-5.8, 10.2, -2.6, 11.6, 1.4, 5.2, '#c8a24a');
      v.box(-4.6, 11.6, -1.2, 9.2, 1, 2.4, '#b8923c');
      v.box(5, 6, -1.4, 2.2, 8, 2.2, '#8a5a4a');
      v.box(4.8, 14, -1.6, 2.6, 0.6, 2.6, '#6a4a3a');
      v.box(-2.8, 0, 3.95, 2.2, 4.6, 0.2, '#5a3a22');
      v.box(1.2, 2.2, 3.95, 2.6, 2.2, 0.2, '#2a2a3a');
      v.box(-6, 1.6, 3.95, 2.4, 2.4, 0.2, '#ff8a3a');
      v.box(-11, 0, -3, 4, 4, 6, '#5a4a40');
      v.box(-11.4, 4, -3.4, 4.8, 0.6, 6.8, '#4a3a32');
      v.box(-10.5, 0.6, 2.95, 3, 2, 0.2, '#ff8a3a');
      break;
    case 'anvil':
      v.box(-1.5, 0, -1.5, 3, 2, 3, '#6b4a2a');
      v.box(-2, 2, -0.8, 4, 1.2, 1.6, '#3a3a42');
      v.box(2, 2.3, -0.4, 1.4, 0.6, 0.8, '#3a3a42');
      v.box(-0.5, 3.2, -0.2, 0.6, 0.6, 2, '#6b4a2a');
      break;
    case 'hay':
      v.box(-2, 0, -1.5, 4, 3, 3, '#d8b85a');
      v.box(-2.05, 0, -0.6, 4.1, 3.05, 0.4, '#a8883a');
      v.box(-2.05, 0, 0.6, 4.1, 3.05, 0.4, '#a8883a');
      break;
    case 'fence':
      v.box(-3, 0, -0.3, 0.6, 3, 0.6, '#7a5a3a');
      v.box(2.4, 0, -0.3, 0.6, 3, 0.6, '#7a5a3a');
      v.box(-3, 1, -0.2, 6, 0.5, 0.4, '#8a6a45');
      v.box(-3, 2.2, -0.2, 6, 0.5, 0.4, '#8a6a45');
      break;
    case 'parcel':
      v.box(-1.6, 0, -1.6, 3.2, 2.2, 3.2, '#c8a878');
      v.box(-1.65, 0, -0.15, 3.3, 2.25, 0.3, '#5a3a22');
      v.box(-0.15, 0, -1.65, 0.3, 2.25, 3.3, '#5a3a22');
      v.box(-0.5, 2.2, -0.5, 1, 0.6, 1, '#5a3a22');
      break;
    case 'coin':
      v.box(-1.2, 0.2, -0.25, 2.4, 2.4, 0.5, '#d8dce4');
      v.box(-0.8, 0, -0.25, 1.6, 3.2, 0.5, '#d8dce4');
      v.box(-1.6, 0.6, -0.25, 3.2, 1.6, 0.5, '#d8dce4');
      v.box(-0.6, 0.8, -0.32, 1.2, 1.6, 0.64, '#aab2c0');
      break;
    case 'boomerang':
      v.box(-3, 0, -0.6, 4.2, 0.5, 1.2, '#a0703a');
      v.box(0, 0, -0.6, 1.2, 0.5, 4.2, '#a0703a');
      v.box(-2.6, 0.5, -0.3, 3.4, 0.1, 0.6, '#c89058');
      break;
    case 'posy':
      v.box(-0.3, -1, -0.3, 0.6, 1.5, 0.6, '#3e8f4a');
      v.box(-1.5, 0.4, -1.5, 3, 0.8, 3, '#ff8fb1');
      v.box(-0.6, 1, -0.6, 1.2, 0.6, 1.2, '#ffd23f');
      v.box(-2.2, -0.3, -0.4, 1.5, 0.4, 0.8, '#5fb84a');
      v.box(0.9, 0.2, 0.9, 1.2, 0.6, 1.2, '#f4f7ff');
      break;
    default:
      v.box(-1, 0, -1, 2, 2, 2, '#ff00ff');
  }
  return v.build(PROP_SCALE[name] || 0.2, false);
}
