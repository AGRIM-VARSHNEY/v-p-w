// Spark of Being: voxel builder, gothic characters, props and room construction.
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

const SHADE = { px: 0.82, nx: 0.78, py: 1.0, ny: 0.55, pz: 0.92, nz: 0.7 };

export class VoxBuilder {
  constructor() { this.pos = []; this.nor = []; this.col = []; this.ind = []; this.v = 0; }
  quad(a, b, c, d, n, r, g, bl, shade) {
    const e1x = b[0] - a[0], e1y = b[1] - a[1], e1z = b[2] - a[2];
    const e2x = c[0] - a[0], e2y = c[1] - a[1], e2z = c[2] - a[2];
    const cx = e1y * e2z - e1z * e2y, cy = e1z * e2x - e1x * e2z, cz = e1x * e2y - e1y * e2x;
    const verts = cx * n[0] + cy * n[1] + cz * n[2] < 0 ? [a, d, c, b] : [a, b, c, d];
    for (const p of verts) {
      this.pos.push(p[0], p[1], p[2]);
      this.nor.push(n[0], n[1], n[2]);
      this.col.push(r * shade, g * shade, bl * shade);
    }
    const v = this.v;
    this.ind.push(v, v + 1, v + 2, v, v + 2, v + 3);
    this.v += 4;
  }
  box(x, y, z, w, h, d, hex, mul = 1, skipBottom = false) {
    _c.set(hex);
    const r = _c.r * mul, g = _c.g * mul, b = _c.b * mul;
    const x1 = x + w, y1 = y + h, z1 = z + d;
    this.quad([x1, y, z], [x1, y1, z], [x1, y1, z1], [x1, y, z1], [1, 0, 0], r, g, b, SHADE.px);
    this.quad([x, y, z], [x, y, z1], [x, y1, z1], [x, y1, z], [-1, 0, 0], r, g, b, SHADE.nx);
    this.quad([x, y1, z], [x, y1, z1], [x1, y1, z1], [x1, y1, z], [0, 1, 0], r, g, b, SHADE.py);
    if (!skipBottom) this.quad([x, y, z], [x1, y, z], [x1, y, z1], [x, y, z1], [0, -1, 0], r, g, b, SHADE.ny);
    this.quad([x, y, z1], [x1, y, z1], [x1, y1, z1], [x, y1, z1], [0, 0, 1], r, g, b, SHADE.pz);
    this.quad([x, y, z], [x, y1, z], [x1, y1, z], [x1, y, z], [0, 0, -1], r, g, b, SHADE.nz);
    return this;
  }
  top(x, z, w, d, y, hex, mul = 1) {
    _c.set(hex);
    this.quad([x, y, z], [x, y, z + d], [x + w, y, z + d], [x + w, y, z], [0, 1, 0], _c.r * mul, _c.g * mul, _c.b * mul, 1);
    return this;
  }
  build(scale = 1) {
    const pos = new Float32Array(this.pos);
    if (scale !== 1) for (let i = 0; i < pos.length; i++) pos[i] *= scale;
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
export function cubeGeometry() { return V().box(-0.5, -0.5, -0.5, 1, 1, 1, '#ffffff').build(1); }

// ---------------------------------------------------------------- characters (1 voxel unit = 0.1 world units)
const LOOKS = {
  victor: {
    legH: 8, legW: 2.1, legX: 1.2, torsoH: 6.6, torsoW: 5.4, torsoD: 3.2, headW: 3.3, headH: 3.5, armW: 1.6, armLen: 6.6,
    skin: '#e3c09c', hair: '#24170f', torso: '#1d2738', sleeve: '#1d2738', legs: '#2b2722', boots: '#120f0d',
    coatSkirt: { len: 4.2, color: '#18202f' }, cape: '#26324a', shirtFront: '#e9e4d6', cravat: '#f2efe6', buttons: '#b8954a',
    hat: 'top', hatColor: '#121216', hatBand: '#4a2a1a', eyes: '#1a1410', brows: '#24170f',
  },
  shambler: {
    legH: 7.6, legW: 2.1, legX: 1.2, torsoH: 6.4, torsoW: 5.4, torsoD: 3.2, headW: 3.4, headH: 3.6, armW: 1.6, armLen: 7,
    skin: '#8d987d', skin2: '#78836a', hair: '#3a382e', torso: '#b8b09a', sleeve: '#8d987d', legs: '#46423a', boots: '#8d987d',
    rags: '#9a927e', stitches: '#3a2424', eyes: '#d6e6a0', glowEyes: true, patches: ['#7d8a6c', '#a3a88e'], torn: true,
  },
  robber: {
    legH: 7.8, legW: 2.1, legX: 1.2, torsoH: 6.4, torsoW: 5.6, torsoD: 3.4, headW: 3.3, headH: 3.4, armW: 1.7, armLen: 6.6,
    skin: '#cfa585', hair: '#2a2018', torso: '#4a3a28', sleeve: '#4a3a28', legs: '#3a3428', boots: '#1e1810',
    coatSkirt: { len: 2.6, color: '#3e3020' }, scarf: '#6a2a22', hat: 'cap', hatColor: '#2a2620', eyes: '#1a1410', belt: '#2a2018',
  },
  acolyte: {
    legH: 8, legW: 2, legX: 1.1, torsoH: 6.6, torsoW: 5.2, torsoD: 3.2, headW: 3.3, headH: 3.5, armW: 1.6, armLen: 6.6,
    skin: '#5a4a52', hair: '#1a141a', torso: '#2a2433', sleeve: '#2a2433', legs: '#2a2433', boots: '#141018',
    robe: '#241f2c', hood: '#1e1a25', faceDark: '#121016', eyes: '#7cf0ff', glowEyes: true, belt: '#6a4a2a',
  },
  brute: {
    legH: 11, legW: 3.4, legX: 2.1, torsoH: 10, torsoW: 10, torsoD: 6, headW: 4.2, headH: 4.4, armW: 3.2, armLen: 10.5,
    skin: '#a89a8a', hair: '#1a1816', torso: '#a89a8a', sleeve: '#a89a8a', legs: '#3a3028', boots: '#2a221c',
    patches: ['#8a967a', '#c09a84', '#968878'], stitches: '#3a2020', bolts: '#70707a', eyes: '#e8d8a0', glowEyes: true, chains: '#4a4a52',
    forearm: '#968878',
  },
  sexton: {
    legH: 9.6, legW: 1.9, legX: 1.1, torsoH: 7.6, torsoW: 5, torsoD: 3, headW: 3.2, headH: 3.8, armW: 1.5, armLen: 8,
    skin: '#cdbcaa', hair: '#d8d0c0', torso: '#141218', sleeve: '#141218', legs: '#141218', boots: '#0a090c',
    coatSkirt: { len: 7.4, color: '#100e14' }, collar: '#d8d0c0', hat: 'wide', hatColor: '#0b0a0d', eyes: '#ff9a3a', glowEyes: true, sunken: true,
  },
  creature: {
    legH: 11, legW: 2.8, legX: 1.7, torsoH: 9.6, torsoW: 7.6, torsoD: 4.4, headW: 4, headH: 4.4, armW: 2.4, armLen: 9.8,
    skin: '#c9b77a', skin2: '#b8a568', hair: '#08080a', torso: '#2a2420', sleeve: '#2a2420', legs: '#24201c', boots: '#1a1612',
    coatSkirt: { len: 4, color: '#221c18' }, longHair: true, lips: '#1a1012', eyes: '#e8e0b8', stitches: '#5a3a30', forearm: '#c9b77a', torn: true,
  },
  unfinished: {
    legH: 12, legW: 3.6, legX: 2.4, torsoH: 12, torsoW: 12, torsoD: 7, headW: 4.6, headH: 5, armW: 3.4, armLen: 12,
    skin: '#d8d0c8', hair: '#1a1410', torso: '#d8d0c8', sleeve: '#d8d0c8', legs: '#cfc8b8', boots: '#b8aca0',
    patches: ['#b8aca0', '#e4cbbf', '#c4b8a8'], stitches: '#5a2a30', bolts: '#c9a227', chestGlow: '#8fe9ff', cables: '#2a2a2e',
    eyes: '#8fe9ff', glowEyes: true, sheet: '#cfc8b8', longHair: true, forearm: '#e8e0d0',
  },
};

function stitchLine(v, x, y, z, len, vertical, color) {
  if (vertical) v.box(x, y, z, 0.25, len, 0.15, color);
  else v.box(x, y, z, len, 0.25, 0.15, color);
  for (let i = 0.4; i < len; i += 0.9) {
    if (vertical) v.box(x - 0.35, y + i, z, 0.95, 0.18, 0.16, color);
    else v.box(x + i, y - 0.35, z, 0.18, 0.95, 0.16, color);
  }
}

function humanoid(L, seed) {
  const R = rng(seed);
  const s = 0.1;
  const { legH, legW, legX, torsoH: tH, torsoW: tW, torsoD: tD, headW, headH, armW, armLen } = L;
  const hipY = legH, topY = legH + tH;
  const legGeo = (iron) => {
    const v = V();
    v.box(-legW / 2, -legH, -legW / 2, legW, legH, legW, L.legs);
    v.box(-legW / 2 - 0.15, -legH, -legW / 2 - 0.25, legW + 0.3, legH * 0.28, legW + 0.55, L.boots);
    if (L.torn) v.box(-legW / 2 - 0.1, -legH * 0.55, -legW / 2 - 0.1, legW + 0.2, 0.6, legW + 0.2, L.rags || L.legs, 0.8);
    return v.build(s);
  };
  const b = V();
  if (L.robe) {
    b.box(-tW / 2 - 0.6, 0.3, -tD / 2 - 0.6, tW + 1.2, hipY + 0.2, tD + 1.2, L.robe);
    b.box(-tW / 2 - 0.3, 0.3, tD / 2 + 0.5, tW + 0.6, 0.8, 0.2, L.belt || L.robe, 0.7);
  }
  b.box(-tW / 2, hipY, -tD / 2, tW, tH, tD, L.torso);
  if (L.coatSkirt) {
    const c = L.coatSkirt;
    b.box(-tW / 2 - 0.2, hipY - c.len, -tD / 2 - 0.3, tW + 0.4, c.len + 0.6, 0.6, c.color);
    b.box(-tW / 2 - 0.4, hipY - c.len, -tD / 2 - 0.3, 0.6, c.len + 0.6, tD + 0.2, c.color);
    b.box(tW / 2 - 0.2, hipY - c.len, -tD / 2 - 0.3, 0.6, c.len + 0.6, tD + 0.2, c.color);
    if (L.torn) for (let i = 0; i < 4; i++) b.box(-tW / 2 + R() * tW, hipY - c.len - 0.8, -tD / 2 - 0.3, 0.8, 1, 0.5, c.color, 0.9);
  }
  if (L.cape) b.box(-tW / 2 - 0.45, topY - 2.6, -tD / 2 - 0.45, tW + 0.9, 2.6, tD + 0.9, L.cape);
  if (L.shirtFront) b.box(-0.9, hipY + 2.2, tD / 2 - 0.05, 1.8, tH - 2.4, 0.2, L.shirtFront);
  if (L.cravat) b.box(-1.15, topY - 1.3, tD / 2 - 0.3, 2.3, 1.3, 0.7, L.cravat);
  if (L.buttons) for (const yy of [hipY + 1.5, hipY + 3]) { b.box(-1.6, yy, tD / 2, 0.5, 0.5, 0.15, L.buttons); b.box(1.1, yy, tD / 2, 0.5, 0.5, 0.15, L.buttons); }
  if (L.belt && !L.robe) b.box(-tW / 2 - 0.05, hipY + 0.4, -tD / 2 - 0.05, tW + 0.1, 0.7, tD + 0.1, L.belt);
  if (L.collar) b.box(-tW / 2 + 0.5, topY - 0.8, -tD / 2 - 0.2, tW - 1, 1, tD + 0.4, L.collar);
  if (L.patches) for (let i = 0; i < 5; i++) {
    const w = 1.5 + R() * 2.5, h = 1.5 + R() * 2.5;
    const x = -tW / 2 + R() * (tW - w), y = hipY + R() * (tH - h);
    b.box(x, y, tD / 2 - 0.05, w, h, 0.15, L.patches[i % L.patches.length]);
  }
  if (L.stitches) {
    stitchLine(b, -tW / 2 + 1, hipY + tH * 0.55, tD / 2 + 0.05, tW - 2, false, L.stitches);
    stitchLine(b, tW * 0.15, hipY + 1, tD / 2 + 0.05, tH - 2, true, L.stitches);
  }
  if (L.rags) for (let i = 0; i < 5; i++) b.box(-tW / 2 + R() * (tW - 1), hipY - 0.6 - R(), -tD / 2 + R() * tD, 1, 1.2, 0.6, L.rags);
  if (L.chestGlow) {
    b.box(-1.8, hipY + tH * 0.45, tD / 2 - 0.1, 3.6, 3, 0.4, L.chestGlow);
    for (let i = 0; i < 4; i++) b.box(-2.6, hipY + tH * 0.45 + i * 0.8, tD / 2 + 0.2, 5.2, 0.3, 0.2, '#e8e0d0');
  }
  if (L.cables) for (let i = 0; i < 4; i++) {
    const x = -tW / 2 + 1.5 + i * (tW - 3) / 3;
    b.box(x, hipY + 2 - i * 1.5, -tD / 2 - 0.6, 0.5, tH - 1 + i * 1.5, 0.5, L.cables);
  }
  if (L.bolts) { b.box(-tW / 2 + 0.6, topY - 0.6, -0.4, 1.4, 0.8, 0.8, L.bolts); b.box(tW / 2 - 2, topY - 0.6, -0.4, 1.4, 0.8, 0.8, L.bolts); }
  if (L.sheet) b.box(-tW / 2 - 0.5, hipY - 3, -tD / 2 - 0.5, tW + 1, 3.6, tD + 1, L.sheet);
  const bodyGeo = b.build(s);

  const h = V();
  const hw = headW / 2;
  h.box(-hw, 0, -hw, headW, headH, headW, L.skin);
  if (L.skin2) h.box(-hw - 0.05, 0.4, -hw * 0.3, 1.2, 1.6, hw * 1.2, L.skin2);
  const eyeY = headH * 0.52;
  const ew = L.glowEyes ? 0.7 : 0.55;
  if (L.sunken) { h.box(-hw + 0.5, eyeY - 0.4, hw - 0.1, 1.2, 1, 0.15, '#3a2e28'); h.box(hw - 1.7, eyeY - 0.4, hw - 0.1, 1.2, 1, 0.15, '#3a2e28'); }
  h.box(-hw + 0.75, eyeY, hw - 0.05, ew, ew * 0.8, 0.2, L.eyes);
  h.box(hw - 0.75 - ew, eyeY, hw - 0.05, ew, ew * 0.8, 0.2, L.eyes);
  if (L.brows) { h.box(-hw + 0.6, eyeY + 0.8, hw - 0.05, 1, 0.3, 0.2, L.brows); h.box(hw - 1.6, eyeY + 0.8, hw - 0.05, 1, 0.3, 0.2, L.brows); }
  if (L.lips) h.box(-0.8, headH * 0.2, hw - 0.05, 1.6, 0.4, 0.2, L.lips);
  if (L.stitches) stitchLine(h, -hw + 0.4, headH * 0.78, hw + 0.05, headW - 0.8, false, L.stitches);
  if (L.scarf) h.box(-hw - 0.1, -0.2, -hw - 0.1, headW + 0.2, headH * 0.4, headW + 0.2, L.scarf);
  if (L.hood) {
    h.box(-hw - 0.4, -0.2, -hw - 0.4, headW + 0.8, headH + 0.8, 0.8, L.hood);
    h.box(-hw - 0.4, headH, -hw - 0.4, headW + 0.8, 0.6, headW + 0.8, L.hood);
    h.box(-hw - 0.4, -0.2, -hw - 0.4, 0.6, headH + 0.6, headW + 0.8, L.hood);
    h.box(hw - 0.2, -0.2, -hw - 0.4, 0.6, headH + 0.6, headW + 0.8, L.hood);
    h.box(-hw + 0.2, 0.2, hw - 0.15, headW - 0.4, headH - 0.6, 0.12, L.faceDark);
    h.box(-hw + 0.75, eyeY, hw - 0.02, 0.6, 0.45, 0.2, L.eyes);
    h.box(hw - 1.35, eyeY, hw - 0.02, 0.6, 0.45, 0.2, L.eyes);
  } else {
    h.box(-hw - 0.15, headH - 0.6, -hw - 0.15, headW + 0.3, 0.8, headW + 0.3, L.hair);
    h.box(-hw - 0.15, headH * 0.4, -hw - 0.15, headW + 0.3, headH * 0.6, 0.6, L.hair);
    if (L.longHair) {
      h.box(-hw - 0.3, -2.5, -hw - 0.3, headW + 0.6, headH + 2.4, 1, L.hair);
      h.box(-hw - 0.3, -1.5, -hw - 0.3, 0.6, headH + 1.4, headW * 0.6, L.hair);
      h.box(hw - 0.3, -1.5, -hw - 0.3, 0.6, headH + 1.4, headW * 0.6, L.hair);
    }
  }
  if (L.hat === 'top') {
    h.box(-hw - 0.7, headH - 0.2, -hw - 0.7, headW + 1.4, 0.4, headW + 1.4, L.hatColor);
    h.box(-hw + 0.1, headH + 0.2, -hw + 0.1, headW - 0.2, 3.4, headW - 0.2, L.hatColor);
    h.box(-hw + 0.05, headH + 0.3, -hw + 0.05, headW - 0.1, 0.5, headW - 0.1, L.hatBand);
  } else if (L.hat === 'cap') {
    h.box(-hw - 0.2, headH - 0.3, -hw - 0.2, headW + 0.4, 1, headW + 0.4, L.hatColor);
    h.box(-hw, headH - 0.4, hw, headW, 0.3, 1.2, L.hatColor);
  } else if (L.hat === 'wide') {
    h.box(-hw - 1.6, headH - 0.2, -hw - 1.6, headW + 3.2, 0.35, headW + 3.2, L.hatColor);
    h.box(-hw + 0.2, headH + 0.15, -hw + 0.2, headW - 0.4, 1.8, headW - 0.4, L.hatColor);
  }
  const headGeo = h.build(s);

  const a = V();
  const upper = armLen * 0.55;
  a.box(-armW / 2, -upper, -armW / 2, armW, upper, armW, L.sleeve);
  a.box(-armW / 2 + 0.05, -armLen + 0.9, -armW / 2 + 0.05, armW - 0.1, armLen - upper - 0.9, armW - 0.1, L.forearm || L.sleeve);
  a.box(-armW / 2 + 0.1, -armLen, -armW / 2 + 0.1, armW - 0.2, 1, armW - 0.2, L.forearm || L.skin);
  if (L.chains) a.box(-armW / 2 - 0.2, -armLen + 1.2, -armW / 2 - 0.2, armW + 0.4, 0.7, armW + 0.4, L.chains);
  if (L.cape) a.box(-armW / 2 - 0.3, -1.8, -armW / 2 - 0.3, armW + 0.6, 1.8, armW + 0.6, L.cape);
  const armGeo = a.build(s);

  return {
    body: bodyGeo, head: headGeo, legL: legGeo(false), legR: legGeo(false), arm: armGeo,
    legX: legX * s, hipY: hipY * s, shoulderX: (tW / 2 + armW / 2 - 0.1) * s, shoulderY: (topY - armW * 0.45) * s,
    headY: topY * s, armLen: armLen * s, height: (topY + headH) * s,
  };
}

export function itemGeometry(name) {
  const v = V();
  switch (name) {
    case 'sabre': {
      v.box(-0.25, -1.1, -0.25, 0.5, 1.2, 0.5, '#3a2a1a');
      v.box(-0.75, -1.4, -0.35, 1.5, 0.35, 0.7, '#b8954a');
      v.box(-0.55, -1.1, 0.2, 0.25, 1.4, 0.25, '#b8954a');
      let z = 0;
      for (let i = 0; i < 6; i++) {
        v.box(-0.12, -2.6 - i * 1.3, -0.18 + z, 0.24, 1.32, 0.45, '#d8dce4');
        z += 0.12;
      }
      break;
    }
    case 'pistol':
      v.box(-0.35, -1.3, -0.45, 0.7, 1.6, 0.9, '#5a3a22');
      v.box(-0.25, -1.2, 0.3, 0.5, 0.5, 3.4, '#3a3a42');
      v.box(-0.3, -0.9, 0.2, 0.6, 0.6, 0.9, '#8a8a90');
      break;
    case 'shovel':
      v.box(-0.25, -12, -0.25, 0.5, 13, 0.5, '#6a4a2a');
      v.box(-1.3, -15, -0.25, 2.6, 3, 0.5, '#5a5a62');
      v.box(-0.9, 0.6, -0.3, 1.8, 0.4, 0.6, '#6a4a2a');
      break;
    case 'lantern':
      v.box(-0.2, -0.8, -0.2, 0.4, 1, 0.4, '#2a2420');
      v.box(-1, -3.4, -1, 2, 2.6, 2, '#2a2420');
      v.box(-0.8, -3.2, -0.8, 1.6, 2.2, 1.6, '#ffb35a');
      break;
    case 'vial':
      v.box(-0.2, -0.6, -0.2, 0.4, 0.6, 0.4, '#8a6a4a');
      v.box(-0.45, -2.2, -0.45, 0.9, 1.6, 0.9, '#7cf0ff');
      break;
    case 'claw':
      for (const x of [-0.9, -0.1, 0.7]) v.box(x, -1.6, 0.2, 0.3, 1.6, 0.3, '#2a2420');
      break;
    default:
      return null;
  }
  return v.build(0.1);
}

const RIG_ITEMS = {
  victor: { right: 'sabre', left: 'pistol' }, shambler: {}, robber: { right: 'shovel' }, acolyte: { right: 'vial' },
  brute: {}, sexton: { right: 'shovel', left: 'lantern' }, creature: {}, unfinished: {},
};

export function buildRig(kind) {
  if (kind === 'hound') return buildHound();
  const L = LOOKS[kind];
  const r = humanoid(L, kind.length * 31 + 7);
  const it = RIG_ITEMS[kind] || {};
  r.kind = kind;
  r.itemR = it.right ? itemGeometry(it.right) : null;
  r.itemL = it.left ? itemGeometry(it.left) : null;
  r.glowItemL = it.left === 'lantern';
  return r;
}

function buildHound() {
  const s = 0.1;
  const body = V()
    .box(-2.1, 5, -5.5, 4.2, 4.4, 11, '#2e2a26')
    .box(-2.3, 7.4, -5.6, 4.6, 2.4, 6, '#3a342e')
    .box(-0.6, 9.2, -5, 1.2, 0.8, 9, '#24201d')
    .build(s);
  const head = V()
    .box(-1.9, -1.6, 0, 3.8, 3.6, 4, '#2e2a26')
    .box(-1.2, -1.6, 4, 2.4, 2, 3, '#26221f')
    .box(-0.5, -0.2, 6.9, 1, 0.8, 0.3, '#0c0a0a')
    .box(-1.6, 2, 0.2, 1, 1.6, 1, '#24201d')
    .box(0.6, 2, 0.2, 1, 1.6, 1, '#24201d')
    .box(-1.5, 0.6, 3.95, 0.8, 0.6, 0.2, '#ff4a3a')
    .box(0.7, 0.6, 3.95, 0.8, 0.6, 0.2, '#ff4a3a')
    .box(-1, -2.2, 4.4, 2, 0.7, 2.2, '#d8d0c0')
    .build(s);
  const leg = V().box(-0.8, -5.2, -0.8, 1.6, 5.2, 1.6, '#26221f').box(-0.9, -5.2, -0.9, 1.8, 1, 2, '#1a1816').build(s);
  const tail = V().box(-0.5, -0.5, -5, 1, 1, 5, '#2e2a26').build(s);
  return { kind: 'hound', quad: true, body, head, leg, tail, headPos: [0, 0.82, 0.55], legs: [[-0.14, 0.52, 0.38], [0.14, 0.52, 0.38], [-0.14, 0.52, -0.42], [0.14, 0.52, -0.42]], tailPos: [0, 0.88, -0.55], height: 1.1 };
}

// ---------------------------------------------------------------- props (voxel units, scale 0.1, origin at ground centre)
const P = (boxes, foot, h, tall = true) => ({ boxes, foot, h, tall });
export const PROPS = {
  tomb1: P([[-4, 0, -1.5, 8, 9, 3, '#6e6e74'], [-3, 9, -1.5, 6, 1.4, 3, '#6e6e74'], [-2.4, 5, 1.45, 4.8, 0.4, 0.2, '#4a4a50'], [-1.8, 3.6, 1.45, 3.6, 0.4, 0.2, '#4a4a50'], [-4.2, 0, -1.7, 2, 3, 0.6, '#4a5a3a']], [0.45, 0.2], 1),
  tomb2: P([[-3, 0, -1.2, 6, 7, 2.4, '#5e5e66'], [-3.4, 0, -1.6, 6.8, 1, 3.2, '#4e4e56'], [-0.4, 7, -0.4, 0.8, 1.6, 0.8, '#5e5e66']], [0.36, 0.18], 0.85),
  cross: P([[-0.8, 0, -0.8, 1.6, 12, 1.6, '#76767c'], [-3.2, 7.6, -0.8, 6.4, 1.6, 1.6, '#76767c'], [-2, 0, -2, 4, 1, 4, '#5a5a60']], [0.22, 0.22], 1.3),
  obelisk: P([[-2.4, 0, -2.4, 4.8, 2, 4.8, '#5a5a62'], [-1.6, 2, -1.6, 3.2, 14, 3.2, '#6a6a72'], [-1, 16, -1, 2, 2, 2, '#6a6a72']], [0.3, 0.3], 1.8),
  deadtree: P([[-1, 0, -1, 2, 16, 2, '#2a2420'], [-1, 9, 0, 6, 1.2, 1.2, '#2a2420'], [-6, 12, -1, 5, 1.2, 1.2, '#2a2420'], [3, 10, -0.6, 1.2, 6, 1.2, '#2a2420'], [-5, 13, -0.6, 1.2, 5, 1.2, '#2a2420']], [0.25, 0.25], 2),
  mausoleum: P([[-14, 0, -12, 28, 18, 24, '#4e4e56'], [-15, 18, -13, 30, 2, 26, '#3e3e46'], [-12, 20, -10, 24, 2, 20, '#45454d'], [-4, 0, 11.9, 8, 13, 0.4, '#1a1a1e'], [-15, 0, 11, 2.4, 18, 2.4, '#5a5a62'], [12.6, 0, 11, 2.4, 18, 2.4, '#5a5a62'], [-3, 22, -1, 6, 4, 2, '#45454d']], [1.5, 1.3], 2.4),
  grave: P([[-3, 0, -6, 6, 0.4, 12, '#3a2e22'], [-2.6, 0.4, -5.6, 5.2, 0.4, 11.2, '#2e241a']], [0.3, 0.6], 0.1, false),
  lamppost: P([[-0.9, 0, -0.9, 1.8, 1.4, 1.8, '#1a1a1e'], [-0.4, 1.4, -0.4, 0.8, 16, 0.8, '#1a1a1e'], [-1.4, 17.4, -1.4, 2.8, 3, 2.8, '#1a1a1e'], [-1.1, 17.7, -1.1, 2.2, 2.4, 2.2, '#ffb35a'], [-1.7, 20.4, -1.7, 3.4, 0.6, 3.4, '#1a1a1e']], [0.2, 0.2], 2.1),
  boulder: P([[-6, 0, -5, 12, 7, 10, '#5a6070'], [-4, 7, -3, 8, 3, 7, '#666c7c'], [-6.2, 7, -5.2, 7, 1, 6, '#e6eef6']], [0.6, 0.5], 1),
  boulder2: P([[-4, 0, -4, 8, 5, 8, '#4e5464'], [-3, 5, -3, 6, 2, 5, '#e6eef6']], [0.4, 0.4], 0.7),
  pine: P([[-1, 0, -1, 2, 5, 2, '#3a2a20'], [-6, 4, -6, 12, 4, 12, '#1e3a2e'], [-4.6, 8, -4.6, 9.2, 4, 9.2, '#24463a'], [-3, 12, -3, 6, 4, 6, '#2a5040'], [-1.5, 16, -1.5, 3, 3, 3, '#2a5040'], [-6.2, 7.6, -6.2, 12.4, 0.8, 12.4, '#e6eef6'], [-4.8, 11.6, -4.8, 9.6, 0.8, 9.6, '#e6eef6']], [0.3, 0.3], 2),
  serac: P([[-3, 0, -3, 6, 10, 6, '#8fb4d8'], [-2, 10, -2, 4, 6, 4, '#a6c4e0'], [-1, 16, -1, 2, 4, 2, '#bcd4ea']], [0.35, 0.35], 1.8),
  drift: P([[-7, 0, -4, 14, 2, 8, '#dfe8f0'], [-4, 2, -2, 8, 1.4, 5, '#eef4fa']], [0.7, 0.4], 0.3, false),
  table: P([[-10, 6, -5, 20, 1.2, 10, '#4a3420'], [-9.5, 0, -4.5, 1.4, 6, 1.4, '#3a2818'], [8.1, 0, -4.5, 1.4, 6, 1.4, '#3a2818'], [-9.5, 0, 3.1, 1.4, 6, 1.4, '#3a2818'], [8.1, 0, 3.1, 1.4, 6, 1.4, '#3a2818'], [-7, 7.2, -3.6, 14, 2.4, 7.2, '#cfc8b8'], [-2, 9.6, -2, 4, 1, 4, '#cfc8b8'], [5, 7.2, -4, 1.4, 3, 1.4, '#7cf0ff'], [-8.4, 7.2, 2, 1.2, 2.4, 1.2, '#9ad86a']], [1.0, 0.5], 1),
  coil: P([[-3, 0, -3, 6, 2, 6, '#3a2a1a'], [-1.2, 2, -1.2, 2.4, 14, 2.4, '#b8743a'], [-2.4, 4, -2.4, 4.8, 0.8, 4.8, '#c88a4a'], [-2.4, 8, -2.4, 4.8, 0.8, 4.8, '#c88a4a'], [-2.4, 12, -2.4, 4.8, 0.8, 4.8, '#c88a4a'], [-2, 16, -2, 4, 4, 4, '#d8dce4']], [0.3, 0.3], 2),
  shelf: P([[-6, 0, -1.6, 12, 18, 3.2, '#3a2818'], [-5.4, 2, 1.2, 10.8, 3, 0.6, '#6a3a2a'], [-5.4, 7, 1.2, 10.8, 3, 0.6, '#2a4a3a'], [-5.4, 12, 1.2, 10.8, 3, 0.6, '#5a4a2a']], [0.6, 0.18], 1.8),
  crate: P([[-3.5, 0, -3.5, 7, 7, 7, '#6a4a2a'], [-3.6, 1, -3.6, 7.2, 1, 7.2, '#4a3218'], [-3.6, 5, -3.6, 7.2, 1, 7.2, '#4a3218']], [0.36, 0.36], 0.7),
  barrel: P([[-2.6, 0, -2.6, 5.2, 8, 5.2, '#5a3a20'], [-2.9, 1, -2.9, 5.8, 6, 5.8, '#4e321c'], [-3, 1.4, -3, 6, 0.6, 6, '#2a2a2e'], [-3, 6, -3, 6, 0.6, 6, '#2a2a2e']], [0.3, 0.3], 0.8),
  jars: P([[-5, 0, -3, 10, 7, 6, '#3a2818'], [-4, 7, -2, 2, 3, 2, '#7cf0ff'], [-1, 7, -2, 2, 4, 2, '#9ad86a'], [2, 7, -2, 2, 2.6, 2, '#d8a84a']], [0.5, 0.3], 1),
  slab: P([[-9, 0, -4, 18, 7, 8, '#5a5650'], [-8, 7, -3, 16, 1.6, 6, '#cfc8b8'], [-3, 8.6, -2, 5, 1.4, 4, '#c8c0b0']], [0.9, 0.4], 0.9),
  iceblock: P([[-5, 0, -5, 10, 8, 10, '#9fc0dc'], [-4, 8, -4, 8, 2, 8, '#b8d2e8']], [0.5, 0.5], 1),
  sledge: P([[-3, 0, -8, 0.8, 1.2, 16, '#5a3a22'], [2.2, 0, -8, 0.8, 1.2, 16, '#5a3a22'], [-3.4, 1.2, -6, 6.8, 1, 12, '#6a4a2a'], [-2.6, 2.2, -4, 5.2, 3, 7, '#4a4a3a'], [-3.4, 1.2, 6, 6.8, 4, 1, '#6a4a2a']], [0.35, 0.8], 0.5),
  mast: P([[-1, 0, -1, 2, 24, 2, '#4a3220'], [-8, 18, -0.6, 16, 1.2, 1.2, '#4a3220'], [-6, 6, -0.4, 12, 10, 0.3, '#a8a090']], [0.2, 0.2], 2.4),
  gaming: P([[-8, 7, -6, 16, 1.2, 12, '#2a4a32'], [-8.4, 6.6, -6.4, 16.8, 0.6, 12.8, '#4a3220'], [-7, 0, -5, 1.4, 6.6, 1.4, '#3a2818'], [5.6, 0, -5, 1.4, 6.6, 1.4, '#3a2818'], [-7, 0, 3.6, 1.4, 6.6, 1.4, '#3a2818'], [5.6, 0, 3.6, 1.4, 6.6, 1.4, '#3a2818'], [-1.6, 8.2, -1, 1.2, 1.2, 1.2, '#f2ecd8'], [0.6, 8.2, 0, 1.2, 1.2, 1.2, '#f2ecd8'], [-6, 8.2, 2, 3, 2.4, 3, '#ffcf7a']], [0.85, 0.65], 0.9),
  candles: P([[-2, 0, -2, 4, 12, 4, '#2a2420'], [-3.4, 12, -0.5, 6.8, 0.8, 1, '#b8954a'], [-3.4, 12.8, -0.4, 0.8, 2.4, 0.8, '#efe6cc'], [2.6, 12.8, -0.4, 0.8, 2.4, 0.8, '#efe6cc'], [-0.4, 12.8, -0.4, 0.8, 3, 0.8, '#efe6cc'], [-3.3, 15.2, -0.3, 0.6, 0.8, 0.6, '#ffcf7a'], [2.7, 15.2, -0.3, 0.6, 0.8, 0.6, '#ffcf7a'], [-0.3, 15.8, -0.3, 0.6, 0.8, 0.6, '#ffcf7a']], [0.2, 0.2], 1.6),
};

function addProp(v, name, ox, oz, rot, scale = 0.1) {
  const pr = PROPS[name];
  const c = Math.round(rot) % 4;
  for (const [x, y, z, w, h, d, col] of pr.boxes) {
    let x0 = x, z0 = z, x1 = x + w, z1 = z + d;
    for (let k = 0; k < c; k++) { const nx0 = -z1, nx1 = -z0, nz0 = x0, nz1 = x1; x0 = nx0; x1 = nx1; z0 = nz0; z1 = nz1; }
    v.box(ox + x0 * scale, y * scale, oz + z0 * scale, (x1 - x0) * scale, h * scale, (z1 - z0) * scale, col);
  }
  const [fx, fz] = c % 2 ? [pr.foot[1], pr.foot[0]] : pr.foot;
  return { x0: ox - fx, x1: ox + fx, z0: oz - fz, z1: oz + fz, h: pr.h, tall: pr.tall };
}

// ---------------------------------------------------------------- rooms
export const BIOMES = {
  graveyard: {
    floor: ['#2e2f2a', '#33342e', '#2a2b27', '#363630'], path: ['#4a4740', '#423f39'], puddle: '#20252c',
    wall: ['#4a4a50', '#424248', '#55555c'], cap: '#3a4434', trim: '#2a2a2e',
    props: { tomb1: 5, tomb2: 4, cross: 3, obelisk: 1, deadtree: 1.4, mausoleum: 0.5, grave: 2 }, lamp: 'lamppost', backdrop: 'graveyard',
  },
  glacier: {
    floor: ['#c4cfdc', '#b8c4d2', '#ccd6e2', '#aebbcc'], path: ['#93abc6', '#8aa4c0'], puddle: '#7f9cbc',
    wall: ['#565c6c', '#4c5262', '#626878'], cap: '#e6eef6', trim: '#3a3e4a',
    props: { boulder: 3, boulder2: 3, pine: 3, serac: 2, drift: 2 }, lamp: 'lamppost', backdrop: 'alps',
  },
  lab: {
    floor: ['#3a3632', '#35312d', '#403a34', '#2f2b28'], path: ['#4a3826', '#433220'], puddle: '#262220',
    wall: ['#2e2a28', '#36302c', '#28241f'], cap: '#1e1a18', trim: '#18140f',
    props: { table: 1.6, coil: 1.5, shelf: 1.6, crate: 3, barrel: 2, jars: 1.6, slab: 1 }, lamp: 'candles', backdrop: 'lab',
  },
  ice: {
    floor: ['#97adc4', '#a3b9cf', '#8ba3bb', '#b1c5d9'], path: ['#d4dee8', '#c8d4e0'], puddle: '#6f8aa8',
    wall: ['#7a90a8', '#6e849c', '#8aa0b8'], cap: '#e8f0f8', trim: '#5a6e86',
    props: { iceblock: 4, serac: 3, sledge: 1, mast: 0.8, drift: 3 }, lamp: 'lamppost', backdrop: 'arctic',
  },
};

function pickWeighted(R, table) {
  let sum = 0;
  for (const k in table) sum += table[k];
  let r = R() * sum;
  for (const k in table) { if ((r -= table[k]) <= 0) return k; }
  return Object.keys(table)[0];
}

export function gateGeometry() {
  const v = V();
  for (let i = 0; i < 6; i++) v.box(-1 + i * 0.38, 0, -0.06, 0.12, 3.1, 0.12, '#1c1c20');
  v.box(-1.05, 0.9, -0.08, 2.1, 0.14, 0.16, '#1c1c20');
  v.box(-1.05, 2.4, -0.08, 2.1, 0.14, 0.16, '#1c1c20');
  for (let i = 0; i < 6; i++) v.box(-1.02 + i * 0.38, 3.1, -0.05, 0.08, 0.3, 0.1, '#2a2a30');
  return v.build(1);
}

// Builds a walled arena. North wall holds the exit gates; the south wall is low so the camera sees in.
export function buildRoom(opt) {
  const { biome, W, D, seed, doors, kind } = opt;
  const B = BIOMES[biome];
  const R = rng(seed);
  const v = V();
  const hw = W / 2, hd = D / 2;
  // Floor tiles with paths and puddles.
  for (let x = -hw; x < hw; x++) {
    for (let z = -hd; z < hd; z++) {
      const n = valueNoise(x * 0.35, z * 0.35, seed % 97);
      let col = B.floor[Math.floor(n * 3.99)];
      const onPath = (Math.abs(x + 0.5) < 1.6 && z > -hd + 1) || doors.some((dx) => Math.abs(x + 0.5 - dx) < 1.3 && z < -hd + 4);
      if (onPath && kind !== 'boss') col = B.path[(x + z) & 1];
      else if (valueNoise(x * 0.6 + 40, z * 0.6, seed % 31) > 0.86) col = B.puddle;
      v.top(x, z, 1, 1, 0, col, 0.92 + R() * 0.12);
    }
  }
  const obstacles = [];
  const wallBlock = (x, z, h, w = 1, d = 1) => {
    for (let y = 0; y < h; y += 1) {
      const hh = Math.min(1, h - y);
      v.box(x, y, z, w, hh, d, B.wall[Math.floor(R() * B.wall.length)], 0.9 + R() * 0.15, true);
    }
    v.box(x - 0.04, h, z - 0.04, w + 0.08, 0.18, d + 0.08, B.cap, 1, true);
  };
  // North wall with gate gaps.
  const northH = 3.6;
  for (let x = -hw - 1; x < hw + 1; x++) {
    const inGap = doors.some((dx) => x + 0.5 > dx - 1.2 && x + 0.5 < dx + 1.2);
    if (inGap) continue;
    const h = northH + (R() < 0.25 ? -0.4 : 0) + (doors.some((dx) => Math.abs(x + 0.5 - dx) < 2.2) ? 1 : 0);
    wallBlock(x, -hd - 1, h);
  }
  for (const dx of doors) v.box(dx - 1.6, 3.4, -hd - 1.1, 3.2, 0.7, 1.2, B.trim);
  // Side walls.
  for (let z = -hd; z < hd + 1; z++) {
    wallBlock(-hw - 1, z, 2.4 + (R() < 0.2 ? 0.5 : 0));
    wallBlock(hw, z, 2.4 + (R() < 0.2 ? 0.5 : 0));
  }
  // Low south wall with an entrance gap.
  for (let x = -hw; x < hw; x++) {
    if (Math.abs(x + 0.5) < 1.6) continue;
    wallBlock(x, hd, 0.7);
  }
  obstacles.push({ x0: -hw - 2, x1: hw + 2, z0: -hd - 3, z1: -hd, h: 4, tall: true, wall: true });
  obstacles.push({ x0: -hw - 3, x1: -hw, z0: -hd - 2, z1: hd + 2, h: 3, tall: true, wall: true });
  obstacles.push({ x0: hw, x1: hw + 3, z0: -hd - 2, z1: hd + 2, h: 3, tall: true, wall: true });
  obstacles.push({ x0: -hw - 2, x1: hw + 2, z0: hd, z1: hd + 3, h: 1, tall: false, wall: true });
  // Backdrop silhouettes beyond the north wall.
  const back = (x, z, w, d, h, col) => v.box(x, 0, z, w, h, d, col, 1, true);
  if (B.backdrop === 'graveyard') {
    back(-6, -hd - 9, 6, 5, 9, '#1c1e24'); back(-4.5, -hd - 8, 3, 3, 15, '#1c1e24'); back(-3.8, -hd - 7.4, 1.6, 1.6, 18, '#1c1e24');
    for (let i = 0; i < 5; i++) back(-hw + 3 + i * 6 + R() * 2, -hd - 5 - R() * 3, 0.5, 0.5, 5 + R() * 3, '#141418');
  } else if (B.backdrop === 'alps') {
    for (let i = 0; i < 6; i++) { const x = -hw - 6 + i * 7; back(x, -hd - 18, 9, 8, 10 + R() * 8, '#3a4252'); back(x + 2, -hd - 17, 5, 5, 16 + R() * 6, '#d8e2ee'); }
  } else if (B.backdrop === 'arctic') {
    for (let i = 0; i < 7; i++) back(-hw - 4 + i * 6, -hd - 10 - R() * 6, 4, 3, 3 + R() * 5, '#7a90a8');
  } else if (B.backdrop === 'lab') {
    for (const x of [-hw + 4, -2, hw - 6]) v.box(x, 1.6, -hd - 1.05, 2, 1.6, 0.1, '#56627a');
  }
  // Interior obstacles, keeping the entrance lane, the centre and the gate approaches clear.
  const placed = [];
  const blocked = (o) => {
    if (o.x0 < -hw + 1 || o.x1 > hw - 1 || o.z0 < -hd + 1.4 || o.z1 > hd - 1) return true;
    if (Math.abs((o.x0 + o.x1) / 2) < 2.6 && o.z1 > hd - 5) return true;
    if (Math.hypot((o.x0 + o.x1) / 2, (o.z0 + o.z1) / 2) < 2.6) return true;
    for (const dx of doors) if (o.x1 > dx - 2.6 && o.x0 < dx + 2.6 && o.z0 < -hd + 4) return true;
    for (const q of placed) if (o.x0 < q.x1 + 1.3 && o.x1 > q.x0 - 1.3 && o.z0 < q.z1 + 1.3 && o.z1 > q.z0 - 1.3) return true;
    return false;
  };
  const lights = [];
  if (kind === 'chance') {
    const o = addProp(v, 'gaming', 0, -1, 0);
    obstacles.push(o); placed.push(o);
    for (const [x, z] of [[-5, -3], [5, -3]]) { const c = addProp(v, 'candles', x, z, 0); obstacles.push(c); placed.push(c); lights.push({ x, y: 1.7, z }); }
  } else {
    const n = kind === 'boss' ? 5 : Math.floor((W * D) / 36);
    for (let tries = 0; tries < 300 && placed.length < n; tries++) {
      const name = pickWeighted(R, B.props);
      const pr = PROPS[name];
      const rot = Math.floor(R() * 4);
      const x = -hw + 2 + R() * (W - 4), z = -hd + 2.5 + R() * (D - 5);
      const [fx, fz] = rot % 2 ? [pr.foot[1], pr.foot[0]] : pr.foot;
      const test = { x0: x - fx, x1: x + fx, z0: z - fz, z1: z + fz };
      if (blocked(test)) continue;
      const o = addProp(v, name, x, z, rot);
      placed.push(o);
      if (o.h > 0.25) obstacles.push(o);
    }
    for (const [x, z] of [[-hw + 1.6, -hd + 1.8], [hw - 1.6, -hd + 1.8], [-hw + 1.6, hd - 2.4], [hw - 1.6, hd - 2.4]]) {
      if (kind !== 'boss' && R() < 0.25) continue;
      const o = addProp(v, B.lamp, x, z, 0);
      obstacles.push(o);
      lights.push({ x, y: B.lamp === 'candles' ? 1.7 : 1.9, z });
    }
  }
  return { geo: v.build(1), obstacles, lights, W, D, doors: doors.map((x) => ({ x, z: -hd - 0.5 })) };
}
