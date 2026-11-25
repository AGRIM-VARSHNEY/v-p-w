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

// ---------------------------------------------------------------- heroes
// Each hero is a set of limb geometries with pivots, so the walk cycle can swing them.
export function buildHero(id) {
  const P = {
    pip: { skin: '#ffcf9e', body: '#3fa34d', body2: '#2f7a3a', belt: '#8b5a2b', leg: '#6b4226', arm: '#3fa34d', hand: '#ffcf9e', eye: '#191736' },
    moss: { skin: '#6cc24a', body: '#7a4fc7', body2: '#5a379a', belt: '#ffd23f', leg: '#5aa63c', arm: '#7a4fc7', hand: '#6cc24a', eye: '#191736' },
    brick: { skin: '#9aa0b0', body: '#8a90a2', body2: '#6d7385', belt: '#5d6275', leg: '#7a8092', arm: '#9aa0b0', hand: '#b4bacb', eye: '#ffb347' },
    hive: { skin: '#ffcf9e', body: '#ffd23f', body2: '#191736', belt: '#191736', leg: '#3b3355', arm: '#ffd23f', hand: '#f4f7ff', eye: '#191736' },
  }[id];
  const s = 0.1;
  const big = id === 'brick';
  const legW = big ? 2.6 : 2;
  const leg = V().box(-legW / 2, -3, -1.1, legW, 3, 2.2, P.leg).box(-legW / 2 - 0.1, -3, -0.2, legW + 0.2, 1, 1.6, P.body2, 0.9).build(s, false);
  const armW = big ? 2.6 : 1.8;
  const arm = V().box(-armW / 2, -3.6, -armW / 2, armW, 3.6, armW, P.arm).box(-armW / 2, -4.6, -armW / 2, armW, 1.1, armW, P.hand).build(s, false);

  const body = V();
  const bw = big ? 8 : 6;
  body.box(-bw / 2, 3, -2, bw, 5, 4, P.body);
  body.box(-bw / 2 - 0.05, 3.8, -2.05, bw + 0.1, 0.9, 4.1, P.belt);
  if (id === 'hive') {
    body.box(-bw / 2 - 0.05, 5.6, -2.05, bw + 0.1, 0.8, 4.1, P.body2);
    // little wings on the back
    body.box(-3.2, 5.5, -3.2, 2.6, 2.6, 0.5, '#d6f3ff');
    body.box(0.6, 5.5, -3.2, 2.6, 2.6, 0.5, '#d6f3ff');
  }
  if (id === 'moss') {
    body.box(-bw / 2 - 0.3, 2.2, -2.3, bw + 0.6, 1.2, 4.6, P.body); // robe hem
    body.box(-0.5, 6, 2.0, 1, 1, 0.3, '#ffd23f'); // star clasp
  }
  if (id === 'brick') {
    body.box(-5, 7, -2, 2.4, 1.4, 4, '#5fb84a'); // moss on shoulders
    body.box(2.6, 7, -2, 2.4, 1.4, 4, '#5fb84a');
    body.box(-1, 5, 2.0, 2, 2, 0.3, '#ffb347'); // core glow
  }
  const bodyG = body.build(s, false);

  const head = V();
  if (id === 'moss') {
    head.box(-4, 0, -3, 8, 5, 6, P.skin);
    head.box(-4, 0, 2.95, 8, 1.2, 0.2, '#a8e07e'); // pale chin
    head.box(-3.6, 5, -1, 2.6, 2.2, 2.6, P.skin); // eye bumps
    head.box(1, 5, -1, 2.6, 2.2, 2.6, P.skin);
    head.box(-3.2, 5.4, 1.55, 1.8, 1.6, 0.2, '#ffffff');
    head.box(1.4, 5.4, 1.55, 1.8, 1.6, 0.2, '#ffffff');
    head.box(-2.7, 5.6, 1.7, 0.9, 1, 0.2, P.eye);
    head.box(1.9, 5.6, 1.7, 0.9, 1, 0.2, P.eye);
    head.box(-2, 1.8, 3.0, 4, 0.5, 0.2, '#3a7a2a'); // smile
    head.box(-3.5, 2.6, 3.0, 1.1, 0.7, 0.2, '#ff9aa2');
    head.box(2.4, 2.6, 3.0, 1.1, 0.7, 0.2, '#ff9aa2');
  } else if (id === 'brick') {
    head.box(-3.2, 0, -3, 6.4, 5, 6, P.skin);
    head.box(-3.2, 4, -3, 6.4, 1, 6, '#b4bacb');
    head.box(-2.4, 2, 2.95, 1.6, 1, 0.3, P.eye);
    head.box(0.8, 2, 2.95, 1.6, 1, 0.3, P.eye);
    head.box(-1.5, 5, -1.5, 3, 1, 3, '#5fb84a'); // mossy top
    head.box(-0.5, 6, -0.5, 1, 1.2, 1, '#7ed957');
  } else {
    head.box(-3.5, 0, -3, 7, 6, 6, P.skin);
    head.box(-2.4, 2.4, 2.95, 1.2, 1.5, 0.2, P.eye);
    head.box(1.2, 2.4, 2.95, 1.2, 1.5, 0.2, P.eye);
    head.box(-2.1, 3.3, 3.05, 0.5, 0.5, 0.1, '#ffffff');
    head.box(1.5, 3.3, 3.05, 0.5, 0.5, 0.1, '#ffffff');
    head.box(-3.3, 1.5, 2.95, 1.1, 0.8, 0.2, '#ff9aa2');
    head.box(2.2, 1.5, 2.95, 1.1, 0.8, 0.2, '#ff9aa2');
    if (id === 'pip') {
      head.box(-3.7, 4.6, -3.2, 7.4, 1.6, 6.4, '#6b3e1f'); // hair cap
      head.box(-3.7, 2.5, -3.2, 1, 2.5, 6.4, '#6b3e1f');
      head.box(2.7, 2.5, -3.2, 1, 2.5, 6.4, '#6b3e1f');
      head.box(-0.5, 6.2, -0.5, 1, 2.2, 1, '#2f7a3a'); // sprout stem
      head.box(-3, 7.6, -0.8, 2.6, 0.8, 1.6, '#7ed957');
      head.box(0.4, 8.2, -0.8, 2.8, 0.8, 1.6, '#5fb84a');
    } else {
      // beekeeper hat with veil
      head.box(-4.6, 5.6, -4.1, 9.2, 0.6, 8.2, '#f4f7ff');
      head.box(-3, 6.2, -2.6, 6, 2.2, 5.2, '#f4f7ff');
      head.box(-3.7, 4.4, -3.2, 7.4, 1.4, 6.4, '#c47a3a');
    }
  }
  const headG = head.build(s, false);
  return {
    leg, arm, body: bodyG, head: headG,
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

const COLORS = {
  grass: ['#6cc24a', '#78cc52', '#62b844', '#82d35c'],
  dirt: ['#9a6a3f', '#8d5f37'],
  stone: ['#8a8fa0', '#7c8193'],
  deep: ['#5f6278', '#56596d'],
  crystal: ['#c38bff', '#8fe9ff'],
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

export function buildIsland(seed = 7) {
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
