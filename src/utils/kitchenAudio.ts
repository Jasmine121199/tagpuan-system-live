/**
 * TAGPUAN ERP - PHASE 6
 * Kitchen Display System (KDS) Audio Engine
 * Web Audio API synthesizer - 100% offline, zero external file dependencies
 */

class KitchenAudioEngine {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.8;

  constructor() {
    // Restore mute / volume settings from localStorage
    try {
      const savedMute = localStorage.getItem('tagpuan_kds_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
      const savedVol = localStorage.getItem('tagpuan_kds_volume');
      if (savedVol !== null) {
        this.volume = parseFloat(savedVol) || 0.8;
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  private initContext(): AudioContext | null {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public async unlock(): Promise<boolean> {
    try {
      const ctx = this.initContext();
      if (!ctx) return false;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      this.playNewOrderChime();
      return ctx.state === 'running';
    } catch {
      return false;
    }
  }

  public isUnlocked(): boolean {
    return !!this.audioCtx && this.audioCtx.state === 'running';
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem('tagpuan_kds_muted', String(muted));
    } catch {}
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem('tagpuan_kds_volume', String(this.volume));
    } catch {}
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Pleasant 2-tone melodic chime when a new order arrives
   */
  public playNewOrderChime() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.15 * this.volume, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      gainNode.connect(ctx.destination);

      // Note 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      osc1.connect(gainNode);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: A5 (880.00 Hz)
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.2);
      osc2.connect(gainNode);
      osc2.start(now + 0.2);
      osc2.stop(now + 0.8);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  /**
   * Upbeat confirmation tone when order is marked READY
   */
  public playReadyChime() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.12 * this.volume, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      gainNode.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.25); // G5
      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.6);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  /**
   * Critical 15m+ urgent repeating warning tone
   */
  public playCriticalWarningAlert() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.2 * this.volume, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      gainNode.connect(ctx.destination);

      // Tone 1: High alarm pulse
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.connect(gainNode);
      osc1.start(now);
      osc1.stop(now + 0.25);

      // Tone 2: Mid alarm pulse
      const osc2 = ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(440, now + 0.3); // A4
      osc2.connect(gainNode);
      osc2.start(now + 0.3);
      osc2.stop(now + 0.55);

      // Tone 3: Urgent peak pulse
      const osc3 = ctx.createOscillator();
      osc3.type = 'sawtooth';
      osc3.frequency.setValueAtTime(659.25, now + 0.6); // E5
      osc3.connect(gainNode);
      osc3.start(now + 0.6);
      osc3.stop(now + 1.1);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }
}

export const kitchenAudio = new KitchenAudioEngine();
