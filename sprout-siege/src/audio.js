// Sprout Siege: all sound is synthesized with WebAudio, so the game ships no audio files.

const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28];
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Chord progressions as MIDI roots plus chord tones (semitones above root).
const DAY = [
  { root: 53, tones: [0, 4, 7] },  // F
  { root: 48, tones: [0, 4, 7] },  // C
  { root: 50, tones: [0, 3, 7] },  // Dm
  { root: 46, tones: [0, 4, 7] },  // Bb
];
const NIGHT = [
  { root: 50, tones: [0, 3, 7] },  // Dm
  { root: 46, tones: [0, 4, 7] },  // Bb
  { root: 53, tones: [0, 4, 7] },  // F
  { root: 48, tones: [0, 4, 7] },  // C
];

export class Sound {
  constructor() {
    this.ctx = null;
    this.sfxOn = true;
    this.musicOn = true;
    this.last = Object.create(null);
    this.streak = 0;
    this.streakT = 0;
    this.intensity = 0;
    this.night = false;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch (e) {
      this.ctx = null;
      return;
    }
    const c = this.ctx;
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -14;
    this.comp.ratio.value = 4;
    this.comp.connect(c.destination);
    this.master = c.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.comp);
    this.sfx = c.createGain();
    this.sfx.gain.value = this.sfxOn ? 0.55 : 0;
    this.sfx.connect(this.master);
    this.music = c.createGain();
    this.music.gain.value = this.musicOn ? 0.2 : 0;
    this.music.connect(this.master);
    const len = c.sampleRate;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.nextTime = c.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  setSfx(on) {
    this.sfxOn = on;
    if (this.sfx) this.sfx.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.05);
  }

  setMusic(on) {
    this.musicOn = on;
    if (this.music) this.music.gain.setTargetAtTime(on ? 0.2 : 0, this.ctx.currentTime, 0.1);
  }

  tone(type, f0, f1, dur, vol, when = 0, dest = this.sfx, attack = 0.005) {
    const c = this.ctx;
    const t = c.currentTime + when;
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
    o.stop(t + dur + 0.02);
  }

  noise(dur, vol, ftype, f0, f1, when = 0, dest = this.sfx, q = 1) {
    const c = this.ctx;
    const t = c.currentTime + when;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = ftype;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(dest);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }

  throttle(name, gap) {
    const now = this.ctx.currentTime;
    if (this.last[name] && now - this.last[name] < gap) return false;
    this.last[name] = now;
    return true;
  }

  play(name) {
    if (!this.ctx || !this.sfxOn || this.ctx.state !== 'running') return;
    const r = Math.random;
    switch (name) {
      case 'hit':
        if (!this.throttle(name, 0.035)) return;
        this.tone('square', 520 + r() * 200, 260, 0.05, 0.035);
        break;
      case 'pop':
        if (!this.throttle(name, 0.03)) return;
        this.noise(0.08, 0.1, 'bandpass', 1400 + r() * 600, 400, 0, this.sfx, 2);
        this.tone('sine', 520 + r() * 120, 120, 0.1, 0.07);
        break;
      case 'seed': {
        if (!this.throttle(name, 0.022)) return;
        const now = this.ctx.currentTime;
        if (now - this.streakT > 0.45) this.streak = 0;
        this.streakT = now;
        const note = 76 + PENTA[Math.min(this.streak, PENTA.length - 1)];
        this.streak = Math.min(this.streak + 1, PENTA.length - 1);
        this.tone('sine', mtof(note), mtof(note) * 1.01, 0.08, 0.05);
        this.tone('triangle', mtof(note + 12), null, 0.05, 0.015);
        break;
      }
      case 'coin':
        this.tone('square', 988, null, 0.06, 0.04);
        this.tone('square', 1319, null, 0.12, 0.04, 0.06);
        break;
      case 'level':
        [60, 64, 67, 72, 76].forEach((m, i) => {
          this.tone('triangle', mtof(m + 12), null, 0.16, 0.09, i * 0.06);
          this.tone('square', mtof(m), null, 0.1, 0.03, i * 0.06);
        });
        break;
      case 'hurt':
        if (!this.throttle(name, 0.12)) return;
        this.tone('sawtooth', 240, 70, 0.2, 0.12);
        this.noise(0.12, 0.12, 'lowpass', 1200, 200);
        break;
      case 'dash':
        this.noise(0.18, 0.12, 'bandpass', 600, 3500, 0, this.sfx, 1.5);
        break;
      case 'stomp':
        if (!this.throttle(name, 0.1)) return;
        this.tone('sine', 130, 38, 0.28, 0.32);
        this.noise(0.22, 0.14, 'lowpass', 900, 120);
        break;
      case 'zap':
        if (!this.throttle(name, 0.08)) return;
        this.noise(0.12, 0.07, 'bandpass', 3200, 1800, 0, this.sfx, 3);
        this.tone('square', 1400, 500, 0.08, 0.03);
        break;
      case 'throw':
        if (!this.throttle(name, 0.08)) return;
        this.tone('triangle', 300, 560, 0.09, 0.05);
        break;
      case 'bee':
        if (!this.throttle(name, 0.15)) return;
        this.tone('sawtooth', 210 + r() * 40, 260, 0.14, 0.02);
        break;
      case 'spark':
        if (!this.throttle(name, 0.06)) return;
        this.tone('square', 880 + r() * 120, 1500, 0.05, 0.025);
        break;
      case 'boom':
        if (!this.throttle(name, 0.08)) return;
        this.noise(0.45, 0.22, 'lowpass', 900, 90);
        this.tone('sine', 95, 30, 0.35, 0.25);
        break;
      case 'chest':
        [67, 71, 74, 79, 83].forEach((m, i) => this.tone('triangle', mtof(m), null, 0.22, 0.08, i * 0.07));
        this.noise(0.6, 0.04, 'highpass', 6000, 9000, 0.3);
        break;
      case 'reel':
        if (!this.throttle(name, 0.05)) return;
        this.tone('square', 700 + r() * 500, null, 0.03, 0.025);
        break;
      case 'heal':
        [72, 76, 79].forEach((m, i) => this.tone('sine', mtof(m), null, 0.2, 0.06, i * 0.05));
        break;
      case 'bloom':
        [84, 88, 91, 96].forEach((m, i) => this.tone('sine', mtof(m), null, 0.5, 0.05, i * 0.09));
        break;
      case 'boss':
        this.tone('sawtooth', 55, 50, 1.4, 0.16, 0, this.sfx, 0.2);
        this.tone('sawtooth', 58, 52, 1.4, 0.12, 0, this.sfx, 0.2);
        this.noise(1.2, 0.1, 'lowpass', 300, 1500, 0.1);
        break;
      case 'warn':
        this.tone('square', 440, null, 0.12, 0.05);
        this.tone('square', 440, null, 0.12, 0.05, 0.2);
        break;
      case 'shoot':
        if (!this.throttle(name, 0.1)) return;
        this.tone('sine', 320, 180, 0.12, 0.05);
        break;
      case 'click':
        this.tone('square', 660, 880, 0.04, 0.03);
        break;
      case 'buy':
        this.tone('square', 784, null, 0.06, 0.04);
        this.tone('square', 1175, null, 0.14, 0.04, 0.07);
        break;
      case 'victory':
        [60, 64, 67, 72, 67, 72, 76, 79, 84].forEach((m, i) => this.tone('triangle', mtof(m + 12), null, 0.25, 0.08, i * 0.11));
        break;
      case 'over':
        [67, 63, 60, 55].forEach((m, i) => this.tone('triangle', mtof(m), null, 0.35, 0.08, i * 0.18));
        break;
      default:
        break;
    }
  }

  // --- Music: a small 16-step sequencer with layers that unlock with intensity ---
  schedule() {
    const c = this.ctx;
    if (!c || c.state !== 'running') return;
    const stepDur = 60 / 112 / 4;
    while (this.nextTime < c.currentTime + 0.12) {
      this.playStep(this.step, this.nextTime);
      this.step = (this.step + 1) % 64;
      this.nextTime += stepDur;
    }
  }

  playStep(step, t) {
    if (!this.musicOn) return;
    const prog = this.night ? NIGHT : DAY;
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const ch = prog[bar];
    const I = this.intensity;
    const dest = this.music;
    const when = t - this.ctx.currentTime;
    // Pad: one soft chord per bar.
    if (s === 0) {
      ch.tones.forEach((tn) => this.tone('triangle', mtof(ch.root + 12 + tn), null, 2.0, 0.05, when, dest, 0.25));
    }
    // Bass.
    if (s === 0 || s === 6 || s === 8 || (I >= 2 && s === 14)) {
      this.tone('triangle', mtof(ch.root - 12), null, 0.28, 0.22, when, dest, 0.01);
    }
    // Arpeggio.
    if (I >= 1 && s % 2 === 0) {
      const tn = ch.tones[(s / 2) % ch.tones.length];
      const oct = s >= 8 ? 24 : 12;
      this.tone('square', mtof(ch.root + oct + tn), null, 0.1, 0.025, when, dest, 0.005);
    }
    // Drums.
    if (I >= 1 && (s === 0 || s === 8 || (I >= 3 && s === 10))) {
      this.tone('sine', 140, 45, 0.18, 0.35, when, dest, 0.002);
    }
    if (I >= 2 && (s === 4 || s === 12)) {
      this.noise(0.12, 0.14, 'bandpass', 1800, 900, when, dest, 0.8);
    }
    if (I >= 1 && s % 2 === 1) {
      this.noise(0.03, 0.05, 'highpass', 7000, null, when, dest);
    }
    // Lead: a deterministic pentatonic line for boss fights.
    if (I >= 3 && (s % 4 === 0 || s % 4 === 3)) {
      const seed = (bar * 7 + s * 13) % PENTA.length;
      const m = ch.root + 24 + PENTA[seed % 8];
      this.tone('square', mtof(m), null, 0.16, 0.03, when, dest, 0.01);
    }
  }
}
