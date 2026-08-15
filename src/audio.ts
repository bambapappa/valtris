// audio.ts — Web Audio API ljudsyntetisör för valtris.
// Syntetiserar krispiga, taktila ljudeffekter (mekaniska klick, stämpeldunsar,
// klockackord) proceduriellt utan externa ljudfiler.

const MUTE_KEY = 'valtris_muted';

let audioCtx: AudioContext | null = null;
let muted: boolean = typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === 'true';

export function isMuted(): boolean {
  return muted;
}

export function setMuted(val: boolean): void {
  muted = val;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(MUTE_KEY, val ? 'true' : 'false');
  }
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}

export function initAudio(): void {
  if (typeof window === 'undefined') return;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
}

function getCtx(): AudioContext | null {
  if (!audioCtx && typeof window !== 'undefined') {
    initAudio();
  }
  return audioCtx;
}

/** Mekaniskt klick för sidoförflyttning. */
export function playMove(): void {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx || ctx.state !== 'running') return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.exponentialRampToValueAtTime(180, now + 0.025);

  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.025);
}

/** Taktilt klick med något högre tonhöjd för rotation. */
export function playRotate(): void {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx || ctx.state !== 'running') return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(580, now);
  osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);

  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.035);
}

/** Dämpad stämpelduns vid nedslag / hard drop. */
export function playHardDrop(): void {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx || ctx.state !== 'running') return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(110, now);
  osc.frequency.exponentialRampToValueAtTime(35, now + 0.08);

  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.08);
}

/** Lätt låsklick vid klossens placering. */
export function playLock(): void {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx || ctx.state !== 'running') return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(50, now + 0.05);

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.05);
}

/** Stigande harmoniska dur-ackord vid radrensning. */
export function playLineClear(lines: number): void {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx || ctx.state !== 'running') return;

  const now = ctx.currentTime;
  // C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50), E6 (1318.51)
  const freqs =
    lines >= 4
      ? [523.25, 659.25, 783.99, 1046.50, 1318.51]
      : lines === 3
      ? [523.25, 659.25, 783.99, 1046.50]
      : lines === 2
      ? [523.25, 659.25, 783.99]
      : [523.25, 659.25];

  const duration = lines >= 4 ? 0.45 : 0.28;

  freqs.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = lines >= 4 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, now + idx * 0.035);

    gain.gain.setValueAtTime(0.14 / freqs.length, now + idx * 0.035);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.035 + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.035);
    osc.stop(now + idx * 0.035 + duration);
  });
}

/** Låg, fallande retro-ton vid Game Over. */
export function playGameOver(): void {
  if (muted) return;
  const ctx = getCtx();
  if (!ctx || ctx.state !== 'running') return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(260, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.4);

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.4);
}
