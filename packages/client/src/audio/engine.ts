/**
 * Generative audio: adaptive ambient score and synthesized effects.
 * No samples, no licences, a few kilobytes. Everything is in D so that
 * reveal stingers always resolve musically against the bed.
 */
import { haptic } from '../native/haptics.ts';

const midi = (n: number): number => 440 * 2 ** ((n - 69) / 12);

// D minor colour: Dm9, Bbmaj7, Fmaj9, Csus2 (MIDI notes)
const CHORDS: number[][] = [
  [50, 57, 60, 64, 65],
  [46, 53, 57, 62, 65],
  [41, 53, 57, 60, 67],
  [48, 55, 60, 62, 67],
];
const PENTA = [62, 65, 67, 69, 72, 74, 77, 79, 81];
const BAR = 60 / 72 * 4; // seconds per bar at 72 bpm
const CHORD_BARS = 4;

export type Rank = 0 | 1 | 2 | 3 | 4;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private sfx!: GainNode;
  private reverb!: ConvolverNode;
  private scheduledUntil = 0;
  private origin = 0;
  private muted = false;
  private analyser: AnalyserNode | null = null;
  private seed = 1;

  get running(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  /** Must be called from a user gesture (browser autoplay rules). */
  start(): void {
    if (this.ctx) { void this.ctx.resume(); return; }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.01; comp.release.value = 0.3;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.master.connect(comp).connect(this.analyser).connect(ctx.destination);

    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(ctx, 3.2);
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    this.reverb.connect(wet).connect(this.master);

    this.music = ctx.createGain();
    this.music.gain.value = 0;
    this.music.connect(this.master);
    this.music.connect(this.reverb);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.9;
    this.sfx.connect(this.master);
    this.sfx.connect(this.reverb);

    // Do not await: on some devices resume() only settles after a later gesture.
    void ctx.resume();
    this.origin = ctx.currentTime + 0.1;
    this.scheduledUntil = this.origin;
    this.music.gain.setTargetAtTime(0.55, ctx.currentTime, 1.5);
    this.pump();
    window.setInterval(() => this.pump(), 250);
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend(); else void this.ctx.resume();
    });
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 0.8, this.ctx.currentTime, 0.05);
  }

  /** Pull the score back while a reveal plays, then let it return. */
  duck(on: boolean): void {
    if (this.ctx) this.music.gain.setTargetAtTime(on ? 0.2 : 0.55, this.ctx.currentTime, on ? 0.15 : 0.9);
  }

  /** Peak of the current output block, 0..1. Also the hook for audio-reactive visuals. */
  peak(): number {
    if (!this.analyser) return 0;
    const buf = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buf);
    let max = 0;
    for (const v of buf) max = Math.max(max, Math.abs(v));
    return max;
  }

  // ---- music ---------------------------------------------------------------

  private rand(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  private pump(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const horizon = ctx.currentTime + 1.2;
    while (this.scheduledUntil < horizon) {
      const bar = Math.round((this.scheduledUntil - this.origin) / BAR);
      this.scheduleBar(bar, this.scheduledUntil);
      this.scheduledUntil += BAR;
    }
  }

  private scheduleBar(bar: number, t: number): void {
    const chord = CHORDS[Math.floor(bar / CHORD_BARS) % CHORDS.length]!;
    if (bar % CHORD_BARS === 0) {
      const len = BAR * CHORD_BARS;
      for (const n of chord) this.pad(midi(n), t, len);
      this.sub(midi(chord[0]! - 12), t, len);
    }
    // Slow pulse: soft plucked eighths outlining the chord.
    for (let i = 0; i < 8; i++) {
      if (this.rand() < 0.45) continue;
      const n = chord[1 + ((i * 2 + bar) % (chord.length - 1))]! + 12;
      this.pluck(midi(n), t + (i * BAR) / 8, 0.035);
    }
    // Sparse high sparkles.
    if (this.rand() < 0.6) {
      const n = PENTA[Math.floor(this.rand() * PENTA.length)]! + 12;
      this.pluck(midi(n), t + this.rand() * BAR, 0.05, 1.6);
    }
  }

  private pad(freq: number, t: number, len: number): void {
    const ctx = this.ctx!;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(420, t);
    filter.frequency.linearRampToValueAtTime(1300, t + len * 0.5);
    filter.frequency.linearRampToValueAtTime(480, t + len);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.045, t + len * 0.3);
    gain.gain.setValueAtTime(0.045, t + len * 0.7);
    gain.gain.linearRampToValueAtTime(0, t + len + 1.5);
    for (const detune of [-9, 7]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start(t);
      osc.stop(t + len + 1.6);
    }
    filter.connect(gain).connect(this.music);
  }

  private sub(freq: number, t: number, len: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.16, t + 1.5);
    gain.gain.setValueAtTime(0.16, t + len - 1);
    gain.gain.linearRampToValueAtTime(0, t + len + 0.5);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + len + 0.6);
  }

  private pluck(freq: number, t: number, level: number, decay = 0.7, dest: AudioNode = this.music): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(level, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(gain).connect(dest);
    osc.start(t);
    osc.stop(t + decay + 0.05);
  }

  private impulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6;
    }
    return buf;
  }

  // ---- effects -------------------------------------------------------------

  tap(): void {
    haptic('tap');
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1175, t);
    osc.frequency.exponentialRampToValueAtTime(784, t + 0.06);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    osc.connect(gain).connect(this.sfx);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /** A dry click, for things that pass by: the fields of the wheel. */
  tick(): void {
    haptic('tap');
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1760, t);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    osc.connect(gain).connect(this.sfx);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  deny(): void {
    haptic('warn');
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    for (const [i, f] of [196, 147].entries()) this.pluck(f, t + i * 0.09, 0.12, 0.18, this.sfx);
  }

  private noise(seconds: number): AudioBufferSourceNode {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  /** Engines spooling up, then the long rush. */
  warp(seconds = 2.4): void {
    haptic('warp');
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = this.noise(seconds + 0.4);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(180, t);
    bp.frequency.exponentialRampToValueAtTime(2600, t + 0.7);
    bp.frequency.exponentialRampToValueAtTime(900, t + seconds);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.2, t + 0.6);
    gain.gain.setValueAtTime(0.14, t + seconds - 0.5);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds + 0.3);
    src.connect(bp).connect(gain).connect(this.sfx);
    src.start(t);
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(36.7, t);
    osc.frequency.exponentialRampToValueAtTime(146.8, t + 0.8);
    osc.frequency.setValueAtTime(146.8, t + seconds - 0.4);
    osc.frequency.exponentialRampToValueAtTime(73.4, t + seconds + 0.2);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 500;
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.12, t + 0.5);
    og.gain.exponentialRampToValueAtTime(0.0001, t + seconds + 0.3);
    osc.connect(lp).connect(og).connect(this.sfx);
    osc.start(t);
    osc.stop(t + seconds + 0.4);
  }

  /** Two-tone alarm. Pirates get the harsher interval. */
  alert(kind: 'pirates' | 'customs'): void {
    haptic('warn');
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const [a, b] = kind === 'pirates' ? [311.1, 220] : [392, 293.7];
    for (let i = 0; i < 3; i++) {
      for (const [j, f] of [a, b].entries()) {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = f;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1400;
        const gain = ctx.createGain();
        const at = t + i * 0.32 + j * 0.16;
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(0.07, at + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.15);
        osc.connect(lp).connect(gain).connect(this.sfx);
        osc.start(at);
        osc.stop(at + 0.17);
      }
    }
  }

  /** Coins: more of them for a bigger sale, always landing on the root. */
  coins(amount: number): void {
    haptic('coins');
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const n = Math.max(2, Math.min(9, Math.round(Math.log10(Math.max(10, amount)) * 2)));
    for (let i = 0; i < n; i++) {
      const note = i === n - 1 ? 86 : PENTA[(i * 2) % PENTA.length]! + 12;
      this.pluck(midi(note), t + i * 0.055, 0.07, 0.35, this.sfx);
    }
  }

  /** Something went wrong and it cost you. */
  loss(): void {
    haptic('loss');
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.7);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1600, t);
    lp.frequency.exponentialRampToValueAtTime(200, t + 0.7);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    osc.connect(lp).connect(gain).connect(this.sfx);
    osc.start(t);
    osc.stop(t + 0.85);
  }

  /** Rising tension while the rift charges. */
  riser(seconds: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2.5;
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(5200, t + seconds);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.22, t + seconds * 0.95);
    gain.gain.linearRampToValueAtTime(0, t + seconds);
    src.connect(bp).connect(gain).connect(this.sfx);
    src.start(t);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(73.4, t);
    osc.frequency.exponentialRampToValueAtTime(293.7, t + seconds);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.14, t + seconds * 0.9);
    og.gain.linearRampToValueAtTime(0, t + seconds);
    osc.connect(og).connect(this.sfx);
    osc.start(t);
    osc.stop(t + seconds + 0.05);
  }

  /** Short colour cue when the rift shows its rarity: one motif per rank. */
  tell(rank: Rank): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const motif = [[62], [62, 69], [62, 69, 74], [62, 69, 74, 78], [62, 69, 74, 78, 81]][rank]!;
    motif.forEach((n, i) => this.pluck(midi(n + 12), t + i * 0.07, 0.09, 0.5, this.sfx));
  }

  /** The payoff. Bigger, brighter and longer with every rank. */
  reveal(rank: Rank): void {
    haptic(`reveal${rank}`);
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    // D major lift over the minor bed: the "win" colour.
    const voicings = [
      [62, 69],
      [62, 66, 69],
      [50, 62, 66, 69, 74],
      [38, 50, 62, 66, 69, 74, 78],
      [38, 50, 57, 62, 66, 69, 74, 78, 81, 86],
    ];
    const notes = voicings[rank]!;
    const hold = 0.6 + rank * 0.55;
    for (const [i, n] of notes.entries()) {
      const osc = ctx.createOscillator();
      osc.type = rank >= 2 ? 'sawtooth' : 'triangle';
      osc.frequency.value = midi(n);
      osc.detune.value = (i % 2 ? 6 : -6) * (rank >= 2 ? 1 : 0);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(600 + rank * 900, t);
      lp.frequency.exponentialRampToValueAtTime(400, t + hold + 0.8);
      const gain = ctx.createGain();
      const level = 0.11 / Math.sqrt(notes.length);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(level, t + 0.015);
      gain.gain.setValueAtTime(level, t + hold * 0.4);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + hold + 0.9);
      osc.connect(lp).connect(gain).connect(this.sfx);
      osc.start(t + i * 0.012);
      osc.stop(t + hold + 1);
    }
    if (rank >= 2) {
      // Impact thump.
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(36, t + 0.35);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      osc.connect(gain).connect(this.master);
      osc.start(t);
      osc.stop(t + 0.65);
    }
    if (rank >= 3) {
      // Shimmer run upwards.
      for (let i = 0; i < 6 + rank * 2; i++) {
        this.pluck(midi(PENTA[i % PENTA.length]! + 12 + (i > 8 ? 12 : 0)), t + 0.12 + i * 0.065, 0.06, 0.9, this.sfx);
      }
    }
  }
}

export const audio = new AudioEngine();
