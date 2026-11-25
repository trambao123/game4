import { AudioScale } from '../types/game';

interface ScaleNote {
  name: string;
  freq: number;
}

// Bright, upbeat upper register (C5 -> C7) for joyful, crisp arcade energy
const SCALES: Record<AudioScale, ScaleNote[]> = {
  major: [
    { name: 'C5', freq: 523.25 },
    { name: 'D5', freq: 587.33 },
    { name: 'E5', freq: 659.25 },
    { name: 'F5', freq: 698.46 },
    { name: 'G5', freq: 783.99 },
    { name: 'A5', freq: 880.0 },
    { name: 'B5', freq: 987.77 },
    { name: 'C6', freq: 1046.5 },
    { name: 'D6', freq: 1174.66 },
    { name: 'E6', freq: 1318.51 },
    { name: 'F6', freq: 1396.91 },
    { name: 'G6', freq: 1567.98 },
    { name: 'A6', freq: 1760.0 },
    { name: 'C7', freq: 2093.0 },
  ],
  pentatonic: [
    { name: 'C5', freq: 523.25 },
    { name: 'D5', freq: 587.33 },
    { name: 'E5', freq: 659.25 },
    { name: 'G5', freq: 783.99 },
    { name: 'A5', freq: 880.0 },
    { name: 'C6', freq: 1046.5 },
    { name: 'D6', freq: 1174.66 },
    { name: 'E6', freq: 1318.51 },
    { name: 'G6', freq: 1567.98 },
    { name: 'A6', freq: 1760.0 },
    { name: 'C7', freq: 2093.0 },
  ],
  lydian: [
    { name: 'C5', freq: 523.25 },
    { name: 'D5', freq: 587.33 },
    { name: 'E5', freq: 659.25 },
    { name: 'F#5', freq: 739.99 },
    { name: 'G5', freq: 783.99 },
    { name: 'A5', freq: 880.0 },
    { name: 'B5', freq: 987.77 },
    { name: 'C6', freq: 1046.5 },
    { name: 'D6', freq: 1174.66 },
    { name: 'E6', freq: 1318.51 },
    { name: 'F#6', freq: 1479.98 },
    { name: 'G6', freq: 1567.98 },
    { name: 'A6', freq: 1760.0 },
  ],
};

/**
 * Bright, Joyful Arcade Jump-Step Sound Engine.
 * Designed around bouncy upward "jump / boop!" pitch glides,
 * sparkling multi-note harmonic cascades on Perfect streaks,
 * playful cute mascot chirps, and crisp level-up fanfares.
 */
class SoundEffectsEngine {
  private ctx: AudioContext | null = null;
  private dryBus: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayMix: GainNode | null = null;
  private masterFilter: BiquadFilterNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;

  private isMuted = false;
  private scale: AudioScale = 'major';
  private hopStepCounter = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      const ctx = new AudioCtx();
      this.ctx = ctx;

      this.dryBus = ctx.createGain();
      this.dryBus.gain.value = 1.0;

      // Bright sparkling short echo
      this.delayNode = ctx.createDelay(0.5);
      this.delayNode.delayTime.value = 0.072;

      this.delayFeedback = ctx.createGain();
      this.delayFeedback.gain.value = 0.22;

      const delayFilter = ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.value = 8500;

      this.delayMix = ctx.createGain();
      this.delayMix.gain.value = 0.2;

      this.delayNode.connect(delayFilter);
      delayFilter.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      delayFilter.connect(this.delayMix);

      this.masterFilter = ctx.createBiquadFilter();
      this.masterFilter.type = 'lowpass';
      this.masterFilter.frequency.value = 20000;
      this.masterFilter.Q.value = 0.5;

      this.compressor = ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -12;
      this.compressor.knee.value = 14;
      this.compressor.ratio.value = 3;
      this.compressor.attack.value = 0.002;
      this.compressor.release.value = 0.12;

      this.masterGain = ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.68;

      this.dryBus.connect(this.masterFilter);
      this.delayMix.connect(this.masterFilter);
      this.masterFilter.connect(this.compressor);
      this.compressor.connect(this.masterGain);
      this.masterGain.connect(ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private route(node: AudioNode, echoAmount = 0.22) {
    if (!this.dryBus || !this.delayNode || !this.ctx) return;
    node.connect(this.dryBus);
    if (echoAmount > 0) {
      const send = this.ctx.createGain();
      send.gain.value = echoAmount;
      node.connect(send);
      send.connect(this.delayNode);
    }
  }

  public unlock() {
    this.ensureContext();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.68, this.ctx.currentTime, 0.02);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setScale(scale: AudioScale) {
    this.scale = scale;
  }

  public getScale(): AudioScale {
    return this.scale;
  }

  public setIncognitoFilter(active: boolean) {
    if (!this.masterFilter || !this.ctx) return;
    this.masterFilter.frequency.setTargetAtTime(active ? 3800 : 20000, this.ctx.currentTime, 0.14);
  }

  /**
   * Springy upward "jump-boop!" chime: sweeps up from a lower pitch right into
   * the bright note for that unmistakable playful platformer jump-up feel.
   */
  private jumpChime(
    freq: number,
    startTime: number,
    duration: number,
    peakGain: number,
    glideRatio = 0.66,
    glideSec = 0.036,
    echoAmount = 0.24
  ) {
    if (!this.ctx) return;

    const mainOsc = this.ctx.createOscillator();
    const mainGain = this.ctx.createGain();
    mainOsc.type = 'sine';
    mainOsc.frequency.setValueAtTime(freq * glideRatio, startTime);
    mainOsc.frequency.exponentialRampToValueAtTime(freq, startTime + glideSec);

    mainGain.gain.setValueAtTime(0.0001, startTime);
    mainGain.gain.linearRampToValueAtTime(peakGain, startTime + 0.005);
    mainGain.gain.exponentialRampToValueAtTime(peakGain * 0.45, startTime + duration * 0.35);
    mainGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    mainOsc.connect(mainGain);
    this.route(mainGain, echoAmount);
    mainOsc.start(startTime);
    mainOsc.stop(startTime + duration + 0.03);

    // Bright upper shimmer layer
    const triOsc = this.ctx.createOscillator();
    const triGain = this.ctx.createGain();
    triOsc.type = 'triangle';
    triOsc.frequency.setValueAtTime(freq * glideRatio, startTime);
    triOsc.frequency.exponentialRampToValueAtTime(freq, startTime + glideSec);

    triGain.gain.setValueAtTime(0.0001, startTime);
    triGain.gain.linearRampToValueAtTime(peakGain * 0.38, startTime + 0.004);
    triGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.65);

    triOsc.connect(triGain);
    this.route(triGain, echoAmount * 0.8);
    triOsc.start(startTime);
    triOsc.stop(startTime + duration * 0.7 + 0.02);
  }

  /**
   * Bright coin / sparkle burst note.
   */
  private sparkleNote(
    freq: number,
    startTime: number,
    duration: number,
    peakGain: number,
    echoAmount = 0.3
  ) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 0.88, startTime);
    osc.frequency.exponentialRampToValueAtTime(freq, startTime + 0.022);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    this.route(gain, echoAmount);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  /**
   * Playful, bouncy "boing-hop!" step-up sound for normal placements,
   * gently alternating cheerful pitches so every floor feels energetic and light.
   */
  private bouncyStepHop(startTime: number) {
    if (!this.ctx) return;

    const hopRoots = [370, 415, 440, 493.88];
    const base = hopRoots[this.hopStepCounter % hopRoots.length];
    this.hopStepCounter += 1;

    // 1. Classic springy jump glide ("boing!")
    const hopOsc = this.ctx.createOscillator();
    const hopGain = this.ctx.createGain();
    hopOsc.type = 'sine';
    hopOsc.frequency.setValueAtTime(base, startTime);
    hopOsc.frequency.exponentialRampToValueAtTime(base * 1.85, startTime + 0.075);

    hopGain.gain.setValueAtTime(0.0001, startTime);
    hopGain.gain.linearRampToValueAtTime(0.25, startTime + 0.006);
    hopGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.105);

    hopOsc.connect(hopGain);
    this.route(hopGain, 0.16);
    hopOsc.start(startTime);
    hopOsc.stop(startTime + 0.12);

    // 2. Cute little peak pop + soft crisp slice zip
    this.sparkleNote(base * 1.9, startTime + 0.032, 0.075, 0.1, 0.14);
  }

  public playStart() {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;
    const now = ctx.currentTime;
    this.hopStepCounter = 0;
    this.jumpChime(523.25, now, 0.14, 0.22, 0.65, 0.03, 0.2);
    this.jumpChime(659.25, now + 0.055, 0.16, 0.22, 0.68, 0.03, 0.24);
    this.jumpChime(783.99, now + 0.11, 0.18, 0.22, 0.72, 0.03, 0.26);
    this.sparkleNote(1046.5, now + 0.165, 0.28, 0.22, 0.34);
  }

  public playBlockDrop(comboStreak: number, isPerfect: boolean): string {
    const ctx = this.ensureContext();
    const scaleNotes = SCALES[this.scale];
    const noteIdx = isPerfect ? Math.min(Math.max(0, comboStreak - 1), scaleNotes.length - 1) : 0;
    const note = scaleNotes[noteIdx];

    if (!ctx || this.isMuted) {
      return isPerfect ? note.name : 'Jump';
    }

    const now = ctx.currentTime;
    if (isPerfect) {
      // Bright bouncy jump-chime climbing upper register
      this.jumpChime(note.freq, now, 0.28, 0.26, 0.64, 0.032, 0.25);

      // Cheerful multi-note arcade flourishes as streak climbs
      if (comboStreak >= 2) {
        this.sparkleNote(note.freq * 1.5, now + 0.042, 0.2, 0.15, 0.3);
      }
      if (comboStreak >= 3) {
        this.sparkleNote(note.freq * 2.0, now + 0.078, 0.22, 0.13, 0.34);
      }
      // Streak 5+ restores block width: joyful coin-cascade burst!
      if (comboStreak >= 5) {
        this.sparkleNote(note.freq * 1.25, now + 0.03, 0.16, 0.14, 0.32);
        this.sparkleNote(note.freq * 1.5, now + 0.065, 0.18, 0.14, 0.35);
        this.sparkleNote(note.freq * 2.0, now + 0.105, 0.26, 0.16, 0.42);
      }
      return note.name;
    } else {
      this.bouncyStepHop(now);
      return 'Jump';
    }
  }

  public playMascotTap() {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;
    const now = ctx.currentTime;
    // Cute chibi happy double-chirp!
    this.jumpChime(783.99, now, 0.11, 0.22, 0.62, 0.032, 0.18);
    this.jumpChime(1174.66, now + 0.065, 0.16, 0.22, 0.68, 0.034, 0.26);
  }

  public playScalePreview() {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;
    const now = ctx.currentTime;
    const notes = SCALES[this.scale];
    [0, 2, 4, 7].forEach((idx, i) => {
      const note = notes[idx];
      if (note) {
        this.jumpChime(note.freq, now + i * 0.065, 0.22, 0.2, 0.72, 0.028, 0.26);
      }
    });
  }

  public playAutoCorrectChime() {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;
    const now = ctx.currentTime;
    this.jumpChime(783.99, now, 0.14, 0.2, 0.68, 0.025, 0.22);
    this.jumpChime(1046.5, now + 0.05, 0.16, 0.21, 0.72, 0.025, 0.26);
    this.sparkleNote(1567.98, now + 0.1, 0.26, 0.22, 0.34);
  }

  public playIncognitoToggle(entering: boolean) {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;
    const now = ctx.currentTime;
    if (entering) {
      this.jumpChime(659.25, now, 0.16, 0.19, 1.15, 0.03, 0.22);
      this.jumpChime(493.88, now + 0.065, 0.22, 0.19, 1.15, 0.035, 0.25);
    } else {
      this.jumpChime(493.88, now, 0.14, 0.19, 0.7, 0.028, 0.2);
      this.jumpChime(783.99, now + 0.06, 0.22, 0.2, 0.72, 0.028, 0.28);
    }
  }

  public playLandmarkFanfare() {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;
    const now = ctx.currentTime;
    const chord = [659.25, 783.99, 1046.5, 1318.51, 1567.98];
    chord.forEach((freq, idx) => {
      this.sparkleNote(freq, now + idx * 0.052, 0.28, 0.19, 0.36);
    });
  }

  public playPopupTap() {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;
    const now = ctx.currentTime;
    this.jumpChime(740, now, 0.09, 0.17, 0.68, 0.024, 0.14);
    this.sparkleNote(1108.73, now + 0.03, 0.12, 0.13, 0.18);
  }

  public playGameOver() {
    const ctx = this.ensureContext();
    if (!ctx || this.isMuted) return;
    const now = ctx.currentTime;
    const notes = [783.99, 659.25, 587.33, 440.0];
    notes.forEach((freq, idx) => {
      this.jumpChime(freq, now + idx * 0.075, 0.18, 0.19, 1.08, 0.03, 0.22);
    });
  }
}

export const soundFx = new SoundEffectsEngine();
