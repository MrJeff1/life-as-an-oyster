export class ReefAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private sfx: GainNode | null = null;
  private surf: BiquadFilterNode | null = null;
  private ambient: AudioBufferSourceNode | null = null;
  private musicLevel = 0.55;
  private sfxLevel = 0.85;
  private muted = false;

  unlock() {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!this.ctx) {
      const ctx = new AC({ latencyHint: "interactive" });
      const master = ctx.createGain();
      const music = ctx.createGain();
      const sfx = ctx.createGain();
      music.connect(master);
      sfx.connect(master);
      master.connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
      this.music = music;
      this.sfx = sfx;
      this.applyGains(0);
      this.startSurf();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMusic(level: number) {
    this.musicLevel = clamp(level);
    this.applyGains(0.04);
  }

  setSfx(level: number) {
    this.sfxLevel = clamp(level);
    this.applyGains(0.04);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.applyGains(0.03);
  }

  setTide(tide: number) {
    if (!this.ctx || !this.surf) return;
    const freq = 220 + tide * 520;
    this.surf.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.4);
  }

  play(name: string) {
    if (!this.ctx || !this.sfx || this.ctx.state !== "running") return;
    const ctx = this.ctx;
    const bus = this.sfx;
    const rate = 1 + (Math.random() - 0.5) * 0.08;
    switch (name) {
      case "open":
        tone(ctx, bus, 520 * rate, 0.12, "sine", 0.03);
        break;
      case "clamp":
        noise(ctx, bus, 0.05, 0.18);
        tone(ctx, bus, 140 * rate, 0.1, "triangle", 0.07);
        break;
      case "hurt":
        noise(ctx, bus, 0.16, 0.28);
        tone(ctx, bus, 90, 0.22, "sawtooth", 0.04);
        break;
      case "safe":
        tone(ctx, bus, 660 * rate, 0.08, "sine", 0.035);
        tone(ctx, bus, 880 * rate, 0.12, "sine", 0.02, 0.06);
        break;
      case "warn":
        tone(ctx, bus, 392, 0.14, "triangle", 0.04);
        tone(ctx, bus, 311, 0.2, "triangle", 0.035, 0.12);
        break;
      case "feed":
        tone(ctx, bus, (740 + Math.random() * 180) * rate, 0.07, "sine", 0.02);
        break;
      case "pearl":
        tone(ctx, bus, 880, 0.16, "sine", 0.03);
        tone(ctx, bus, 1320, 0.22, "sine", 0.02, 0.08);
        break;
      case "spawn":
        tone(ctx, bus, 523, 0.14, "sine", 0.04);
        tone(ctx, bus, 659, 0.16, "sine", 0.035, 0.1);
        tone(ctx, bus, 784, 0.22, "sine", 0.03, 0.2);
        break;
      case "dry":
        noise(ctx, bus, 0.2, 0.06);
        break;
      default:
        break;
    }
  }

  dispose() {
    try {
      this.ambient?.stop();
    } catch {
      /* already stopped */
    }
    void this.ctx?.close();
    this.ctx = null;
  }

  private applyGains(ramp: number) {
    if (!this.ctx || !this.master || !this.music || !this.sfx) return;
    const t = this.ctx.currentTime;
    const master = this.muted ? 0 : 0.9;
    const music = this.musicLevel * this.musicLevel;
    const sfx = this.sfxLevel * this.sfxLevel;
    rampTo(this.master.gain, master, t, ramp);
    rampTo(this.music.gain, music, t, ramp);
    rampTo(this.sfx.gain, sfx, t, ramp);
  }

  private startSurf() {
    if (!this.ctx || !this.music) return;
    const ctx = this.ctx;
    const seconds = 2;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 380;
    const gain = ctx.createGain();
    gain.gain.value = 0.22;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.music);
    src.start();
    this.surf = filter;
    this.ambient = src;
  }
}

function clamp(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function rampTo(param: AudioParam, value: number, time: number, seconds: number) {
  const next = Math.max(0.0001, value);
  param.setTargetAtTime(next, time, Math.max(0.01, seconds));
}

function tone(
  ctx: AudioContext,
  bus: GainNode,
  freq: number,
  dur: number,
  type: OscillatorType,
  gain: number,
  delay = 0,
) {
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(bus);
  osc.start(t);
  osc.stop(t + dur + 0.02);
  osc.onended = () => {
    osc.disconnect();
    g.disconnect();
  };
}

function noise(ctx: AudioContext, bus: GainNode, dur: number, gain: number) {
  const t = ctx.currentTime;
  const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 240;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(bus);
  src.start(t);
  src.stop(t + dur + 0.02);
  src.onended = () => {
    src.disconnect();
    filter.disconnect();
    g.disconnect();
  };
}
