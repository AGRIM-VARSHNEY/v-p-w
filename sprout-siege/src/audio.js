// Spark of Being: all sound is synthesized live with WebAudio. No audio files.

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
// D minor: i - VI - iv - V (Dm, Bb, Gm, A)
const PROG = [
  { root: 50, tones: [0, 3, 7] },
  { root: 46, tones: [0, 4, 7] },
  { root: 43, tones: [0, 3, 7] },
  { root: 45, tones: [0, 4, 7] },
];

export class Sound {
  constructor() {
    this.ctx = null;
    this.sfxOn = true;
    this.musicOn = true;
    this.last = Object.create(null);
    this.intensity = 0;
    this.step = 0;
    this.nextTime = 0;
    this.ambient = 'none';
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { this.ctx = null; return; }
    const c = this.ctx;
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -12;
    this.comp.ratio.value = 5;
    this.comp.connect(c.destination);
    this.master = c.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.comp);
    this.sfx = c.createGain();
    this.sfx.gain.value = this.sfxOn ? 0.6 : 0;
    this.sfx.connect(this.master);
    this.music = c.createGain();
    this.music.gain.value = this.musicOn ? 0.22 : 0;
    this.music.connect(this.master);
    const len = c.sampleRate * 2;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // Ambient bed: rain and wind from looping noise.
    this.amb = c.createGain();
    this.amb.gain.value = 0;
    this.amb.connect(this.sfx);
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    this.ambFilter = c.createBiquadFilter();
    this.ambFilter.type = 'bandpass';
    this.ambFilter.frequency.value = 2400;
    this.ambFilter.Q.value = 0.6;
    src.connect(this.ambFilter);
    this.ambFilter.connect(this.amb);
    src.start();
    this.setAmbient(this.ambient);
    this.nextTime = c.currentTime + 0.1;
    setInterval(() => this.schedule(), 25);
  }

  setAmbient(kind) {
    this.ambient = kind;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const g = kind === 'rain' ? 0.09 : kind === 'wind' ? 0.07 : kind === 'room' ? 0.015 : 0;
    this.ambFilter.frequency.setTargetAtTime(kind === 'rain' ? 2600 : kind === 'wind' ? 500 : 900, t, 0.3);
    this.ambFilter.Q.value = kind === 'wind' ? 1.4 : 0.6;
    this.amb.gain.setTargetAtTime(g, t, 0.6);
  }

  setSfx(on) {
    this.sfxOn = on;
    if (this.sfx) this.sfx.gain.setTargetAtTime(on ? 0.6 : 0, this.ctx.currentTime, 0.05);
  }

  setMusic(on) {
    this.musicOn = on;
    if (this.music) this.music.gain.setTargetAtTime(on ? 0.22 : 0, this.ctx.currentTime, 0.1);
  }

  tone(type, f0, f1, dur, vol, when = 0, dest = this.sfx, attack = 0.005) {
    const c = this.ctx;
    const t = c.currentTime + Math.max(0, when);
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  filtered(type, f0, dur, vol, cutoff, when = 0, dest = this.sfx, attack = 0.01, q = 1) {
    const c = this.ctx;
    const t = c.currentTime + Math.max(0, when);
    const o = c.createOscillator();
    const f = c.createBiquadFilter();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = f0;
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, t + Math.max(attack, dur * 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noise(dur, vol, ftype, f0, f1, when = 0, dest = this.sfx, q = 1, attack = 0.002) {
    const c = this.ctx;
    const t = c.currentTime + Math.max(0, when);
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = ftype;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.05);
  }

  throttle(name, gap) {
    const now = this.ctx.currentTime;
    if (this.last[name] && now - this.last[name] < gap) return false;
    this.last[name] = now;
    return true;
  }

  play(name, opt = 0) {
    if (!this.ctx || !this.sfxOn || this.ctx.state !== 'running') return;
    const r = Math.random;
    switch (name) {
      case 'slash':
        this.noise(0.13, 0.16, 'bandpass', 1800 + r() * 400, 6000, 0, this.sfx, 2.5, 0.01);
        break;
      case 'slashHeavy':
        this.noise(0.22, 0.2, 'bandpass', 900, 4200, 0, this.sfx, 2, 0.02);
        this.tone('sine', 220, 90, 0.18, 0.08);
        break;
      case 'hit':
        if (!this.throttle(name, 0.03)) return;
        this.noise(0.09, 0.22, 'lowpass', 1800, 300);
        this.tone('sine', 150 + r() * 30, 55, 0.12, 0.2);
        break;
      case 'crit':
        this.tone('triangle', 1600, 900, 0.12, 0.07);
        break;
      case 'gunshot':
        this.noise(0.45, 0.6, 'lowpass', 5000, 220, 0, this.sfx, 0.8, 0.001);
        this.tone('sine', 90, 28, 0.35, 0.55, 0, this.sfx, 0.002);
        this.noise(1.1, 0.08, 'lowpass', 900, 120, 0.08);
        break;
      case 'reload':
        this.tone('square', 1900, null, 0.025, 0.05);
        this.noise(0.12, 0.05, 'bandpass', 3000, 2000, 0.12, this.sfx, 3);
        this.tone('square', 1400, null, 0.03, 0.06, 0.35);
        break;
      case 'empty':
        if (!this.throttle(name, 0.2)) return;
        this.tone('square', 2400, null, 0.02, 0.04);
        break;
      case 'dodge':
        this.noise(0.22, 0.12, 'bandpass', 300, 1400, 0, this.sfx, 1.4, 0.03);
        break;
      case 'tonic':
        for (let i = 0; i < 3; i++) this.tone('sine', 320 - i * 30, 210, 0.11, 0.08, i * 0.13);
        break;
      case 'healed':
        [62, 66, 69].forEach((m, i) => this.tone('sine', mtof(m + 12), null, 0.4, 0.05, i * 0.06));
        break;
      case 'galvanic':
        for (let i = 0; i < 7; i++) this.noise(0.05, 0.16, 'highpass', 3000 + r() * 3000, null, i * 0.035 + r() * 0.02);
        this.tone('sawtooth', 70, 50, 0.6, 0.18, 0, this.sfx, 0.01);
        this.tone('square', 1200, 300, 0.25, 0.05);
        break;
      case 'spark':
        if (!this.throttle(name, 0.06)) return;
        this.noise(0.06, 0.08, 'highpass', 4000, null);
        break;
      case 'windup':
        if (!this.throttle(name, 0.12)) return;
        this.noise(0.25, 0.05, 'bandpass', 700, 1400, 0, this.sfx, 4, 0.08);
        break;
      case 'bossWindup':
        if (!this.throttle(name, 0.2)) return;
        this.filtered('sawtooth', 62, 0.5, 0.14, 380, 0, this.sfx, 0.08);
        break;
      case 'impact':
        if (!this.throttle(name, 0.08)) return;
        this.noise(0.4, 0.3, 'lowpass', 700, 80);
        this.tone('sine', 70, 30, 0.4, 0.35);
        break;
      case 'die':
        if (!this.throttle(name, 0.05)) return;
        this.noise(0.18, 0.16, 'lowpass', 1200, 200);
        this.tone('sine', 120, 40, 0.25, 0.14, 0.04);
        break;
      case 'hurt':
        if (!this.throttle(name, 0.15)) return;
        this.filtered('sawtooth', 160, 0.22, 0.14, 900, 0, this.sfx, 0.01);
        this.noise(0.14, 0.14, 'lowpass', 1500, 300);
        break;
      case 'thunder':
        this.noise(0.25, 0.25, 'highpass', 1200, 400, 0);
        this.noise(3.2, 0.32, 'lowpass', 420, 60, 0.05, this.sfx, 0.7, 0.12);
        break;
      case 'door':
        this.noise(1.3, 0.12, 'lowpass', 380, 120, 0, this.sfx, 1, 0.2);
        this.tone('square', 220, 180, 0.08, 0.04, 1.2);
        break;
      case 'pickup':
        this.tone('sine', 880, null, 0.6, 0.06);
        this.tone('sine', 1320, null, 0.8, 0.04, 0.08);
        break;
      case 'boon':
        [57, 62, 65, 69, 74].forEach((m, i) => this.tone('triangle', mtof(m + 12), null, 0.6, 0.05, i * 0.06));
        break;
      case 'coin':
        this.tone('square', 1568, null, 0.05, 0.03);
        this.tone('square', 2093, null, 0.1, 0.03, 0.05);
        break;
      case 'roar':
        this.filtered('sawtooth', 68, 1.6, 0.22, 600, 0, this.sfx, 0.15, 3);
        this.filtered('sawtooth', 71, 1.6, 0.18, 420, 0, this.sfx, 0.15, 3);
        this.noise(1.4, 0.12, 'bandpass', 300, 900, 0.1, this.sfx, 1.2, 0.2);
        break;
      case 'fall':
        [50, 46, 43, 38].forEach((m, i) => this.filtered('sawtooth', mtof(m), 1.2, 0.08, 700, i * 0.35, this.sfx, 0.05));
        this.tone('sine', mtof(74), null, 2.5, 0.05, 0.1);
        break;
      case 'victory':
        [50, 57, 62, 65, 69, 74].forEach((m, i) => this.tone('triangle', mtof(m + 12), null, 0.9, 0.06, i * 0.12));
        break;
      case 'heartbeat':
        if (!this.throttle(name, 0.7)) return;
        this.tone('sine', 62, 40, 0.14, 0.3);
        this.tone('sine', 58, 38, 0.14, 0.22, 0.2);
        break;
      case 'click':
        this.tone('square', 900, 700, 0.03, 0.025);
        break;
      case 'dice':
        if (!this.throttle(name, 0.05)) return;
        this.noise(0.04, 0.08, 'bandpass', 2500, null, 0, this.sfx, 2);
        break;
      default: break;
    }
  }

  // --- Music: a 16-step sequencer in D minor; layers enter with intensity (0 menu, 1 explore, 2 combat, 3 boss).
  schedule() {
    const c = this.ctx;
    if (!c || c.state !== 'running') return;
    const bpm = this.intensity >= 3 ? 92 : 76;
    const stepDur = 60 / bpm / 4;
    while (this.nextTime < c.currentTime + 0.15) {
      this.playStep(this.step, this.nextTime);
      this.step = (this.step + 1) % 64;
      this.nextTime += stepDur;
    }
  }

  playStep(step, t) {
    if (!this.musicOn) return;
    const bar = Math.floor(step / 16), s = step % 16;
    const ch = PROG[bar];
    const I = this.intensity;
    const dest = this.music;
    const when = t - this.ctx.currentTime;
    if (s === 0) {
      this.filtered('sawtooth', mtof(ch.root - 12), 3.2, 0.09, 380, when, dest, 0.6, 1.5);
      this.filtered('sawtooth', mtof(ch.root - 5), 3.2, 0.05, 520, when, dest, 0.8, 1.2);
      if (I >= 1) ch.tones.forEach((tn) => this.filtered('sawtooth', mtof(ch.root + 12 + tn), 3, 0.025, 1400, when, dest, 0.7));
    }
    // Harpsichord-like arpeggio.
    const arpEvery = I === 0 ? 4 : 2;
    if (s % arpEvery === 0) {
      const idx = (s / arpEvery) % 4;
      const tn = ch.tones[idx % 3] + (idx === 3 ? 12 : 0);
      this.tone('square', mtof(ch.root + 24 + tn), null, 0.22, I === 0 ? 0.018 : 0.024, when, dest, 0.002);
      this.tone('triangle', mtof(ch.root + 36 + tn), null, 0.12, 0.008, when, dest, 0.002);
    }
    // Low string ostinato.
    if (I >= 2 && s % 2 === 0) this.filtered('sawtooth', mtof(ch.root - 12 + (s % 8 === 6 ? 7 : 0)), 0.2, 0.07, 700, when, dest, 0.01);
    // Timpani.
    if (I >= 2 && (s === 0 || s === 8 || (I >= 3 && (s === 6 || s === 14)))) this.tone('sine', mtof(ch.root - 24) * 2, mtof(ch.root - 24) * 1.6, 0.5, 0.32, when, dest, 0.004);
    if (I >= 3 && s % 4 === 2) this.noise(0.08, 0.05, 'highpass', 6000, null, when, dest);
    if (I >= 3 && s % 2 === 1) this.tone('sawtooth', mtof(ch.root + 24 + ch.tones[1]), null, 0.09, 0.012, when, dest, 0.003);
  }
}
