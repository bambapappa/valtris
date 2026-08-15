# Visuell lyftning, Game Feel och Ljudbild — Implementeringsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Förvandla valtris från ett stelt grundprojekt till ett taktilt, visuellt attraktivt och roligt spel i utlovat.se:s grafiska profil och neutrala anda.

**Architecture:** Modulär struktur där ren spelmotor (`engine.ts`), partikel/animationsmotor (`particles.ts`) och Web Audio-ljudmotor (`audio.ts`) samverkar med canvas-renderaren (`render.ts`) och DOM-gränssnittet (`ui.ts`), koordinerat av `main.ts`.

**Tech Stack:** TypeScript, HTML5 Canvas 2D, Web Audio API, Vanilla CSS (tokens), Vitest, Vite.

**Spec:** [`docs/superpowers/specs/2026-08-15-visual-gameplay-redesign.md`](file:///Users/bambapappa/Dev/projects/valtris/docs/superpowers/specs/2026-08-15-visual-gameplay-redesign.md)

## Global Constraints

- **Neutralitetskontraktet är 100 % orubbligt:** Partiet på klossen är enbart kosmetiskt. Färg och förkortning visas men påverkar aldrig fysik, sannolikheter, gravitation, poäng eller svårighetsgrad.
- **Kategori styr form, kostnad styr poäng:** Fast kartläggning kategori → tetromino (välfärd/utbildning → I, skatter → L, klimat-miljö → T, rättsväsende → Z, migration → S, övrigt → O, försvar/infrastruktur → J).
- **Grafisk profil (utlovat.se):** Varmt papper (`#f6f3ec`), trycksvärta (`#111111`), signalgult (`#ffd600`), grafit (`#3f3d38`), dis (`#6e6a61`), svaga hårlinjer (`#c9c3b6`), `border-radius: 0`, Anton, IBM Plex Mono, Source Serif 4.
- **Noll externa ljud- eller grafikfiler:** All audio syntetiseras i realtid via Web Audio API, all grafik ritas proceduriellt på Canvas 2D / DOM.
- **Alla 9 befintliga testfiler måste förbli gröna** (inklusive `tests/neutrality.test.ts`).

---

### Task 1: Web Audio API Ljudmotor (`src/audio.ts`)

**Files:**
- Create: `src/audio.ts`
- Test: `tests/audio.test.ts`

**Interfaces:**
- Produces:
  - `initAudio(): void`
  - `isMuted(): boolean`
  - `setMuted(muted: boolean): void`
  - `toggleMuted(): boolean`
  - `playMove(): void`
  - `playRotate(): void`
  - `playHardDrop(): void`
  - `playLock(): void`
  - `playLineClear(lines: number): void`
  - `playGameOver(): void`

- [ ] **Step 1: Write the failing tests for audio module**

Create `tests/audio.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isMuted, setMuted, toggleMuted, playMove, playRotate, playHardDrop, playLock, playLineClear, playGameOver, initAudio } from '../src/audio';

describe('audio module', () => {
  beforeEach(() => {
    localStorage.clear();
    setMuted(false);
  });

  it('manages mute state and persists to localStorage', () => {
    expect(isMuted()).toBe(false);
    expect(toggleMuted()).toBe(true);
    expect(isMuted()).toBe(true);
    expect(localStorage.getItem('valtris_muted')).toBe('true');

    setMuted(false);
    expect(isMuted()).toBe(false);
    expect(localStorage.getItem('valtris_muted')).toBe('false');
  });

  it('safely calls play methods even without active AudioContext', () => {
    expect(() => playMove()).not.toThrow();
    expect(() => playRotate()).not.toThrow();
    expect(() => playHardDrop()).not.toThrow();
    expect(() => playLock()).not.toThrow();
    expect(() => playLineClear(1)).not.toThrow();
    expect(() => playLineClear(4)).not.toThrow();
    expect(() => playGameOver()).not.toThrow();
  });

  it('does not produce sound when muted', () => {
    setMuted(true);
    expect(() => playMove()).not.toThrow();
    expect(() => playLineClear(2)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/audio.test.ts`
Expected: FAIL (Cannot find module '../src/audio')

- [ ] **Step 3: Implement `src/audio.ts`**

Create `src/audio.ts`:
```typescript
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
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
  const freqs = lines >= 4
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/audio.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/audio.ts tests/audio.test.ts
git commit -m "feat(audio): lägg till proceduriell Web Audio API-ljudmotor och mute-kontroll"
```

---

### Task 2: Ghost Piece & Engine Helper (`src/engine.ts`)

**Files:**
- Modify: `src/engine.ts`
- Modify: `tests/engine.test.ts`

**Interfaces:**
- Consumes: `hardDropRow(board, active)`
- Produces: `ghostPiece(board: Board, active: ActivePiece): ActivePiece`

- [ ] **Step 1: Write failing tests for `ghostPiece` in `tests/engine.test.ts`**

Add to `tests/engine.test.ts`:
```typescript
import { ghostPiece } from '../src/engine';

describe('ghostPiece', () => {
  it('returns an active piece positioned at the hard drop row with identical shape and game data', () => {
    const b = createBoard();
    const p = spawn({ id: '1', title: 'T', slug: 't', party: 's', category: 'övrigt', msek_base: 100, shape: 'O', quote: '', source: { url: '', domain: '' } });
    const ghost = ghostPiece(b, p);
    expect(ghost.row).toBe(ROWS - 2); // O shape is 2x2, bottom is ROWS-1
    expect(ghost.col).toBe(p.col);
    expect(ghost.rot).toBe(p.rot);
    expect(ghost.game.id).toBe(p.game.id);
  });

  it('stops directly above locked blocks on the board', () => {
    let b = createBoard();
    b[ROWS - 1]![4] = { party: 'm', color: '#005ea1', pieceId: 'p1' };
    const p = spawn({ id: '2', title: 'T2', slug: 't2', party: 'm', category: 'övrigt', msek_base: 50, shape: 'O', quote: '', source: { url: '', domain: '' } });
    // O shape covers cols 4 and 5
    const ghost = ghostPiece(b, p);
    expect(ghost.row).toBe(ROWS - 3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/engine.test.ts`
Expected: FAIL (ghostPiece is not exported/defined)

- [ ] **Step 3: Implement `ghostPiece` in `src/engine.ts`**

In `src/engine.ts`, export the function:
```typescript
export function ghostPiece(board: Board, active: ActivePiece): ActivePiece {
  return {
    ...active,
    row: hardDropRow(board, active),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/engine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine.ts tests/engine.test.ts
git commit -m "feat(engine): exportera ghostPiece för rendering av landningsguide"
```

---

### Task 3: Partikelsystem & Flytande Poäng (`src/particles.ts`)

**Files:**
- Create: `src/particles.ts`
- Modify: `src/types.ts`
- Test: `tests/particles.test.ts`

**Interfaces:**
- Produces:
  - `createParticleSystem()`
  - `ParticleSystem.spawnPaperExplosion(x: number, y: number, w: number, h: number, color: string)`
  - `ParticleSystem.spawnFloatingText(x: number, y: number, text: string, color?: string)`
  - `ParticleSystem.update(dtMs: number)`
  - `ParticleSystem.draw(ctx: CanvasRenderingContext2D)`
  - `ParticleSystem.getActiveParticleCount(): number`
  - `ParticleSystem.getActiveTextCount(): number`

- [ ] **Step 1: Write types in `src/types.ts`**

Add to `src/types.ts`:
```typescript
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rotation: number;
  vRot: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  active: boolean;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  active: boolean;
}
```

- [ ] **Step 2: Write failing tests in `tests/particles.test.ts`**

Create `tests/particles.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { createParticleSystem } from '../src/particles';

describe('ParticleSystem', () => {
  it('initializes with zero active particles and texts', () => {
    const ps = createParticleSystem(50, 10);
    expect(ps.getActiveParticleCount()).toBe(0);
    expect(ps.getActiveTextCount()).toBe(0);
  });

  it('spawns paper explosion particles and respects max limit', () => {
    const ps = createParticleSystem(20, 5);
    ps.spawnPaperExplosion(100, 100, 30, 30, '#e3000f');
    expect(ps.getActiveParticleCount()).toBeGreaterThan(0);
    expect(ps.getActiveParticleCount()).toBeLessThanOrEqual(20);
  });

  it('spawns floating text and updates position and alpha over time', () => {
    const ps = createParticleSystem(20, 5);
    ps.spawnFloatingText(100, 200, '+45 000 MSEK', '#ffd600');
    expect(ps.getActiveTextCount()).toBe(1);

    ps.update(300);
    expect(ps.getActiveTextCount()).toBe(1);

    // After full duration (e.g. 1000ms), text should expire and become inactive
    ps.update(1000);
    expect(ps.getActiveTextCount()).toBe(0);
  });

  it('updates particles physics and deactivates expired ones', () => {
    const ps = createParticleSystem(20, 5);
    ps.spawnPaperExplosion(50, 50, 20, 20, '#005ea1');
    expect(ps.getActiveParticleCount()).toBeGreaterThan(0);

    ps.update(800);
    expect(ps.getActiveParticleCount()).toBe(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test tests/particles.test.ts`
Expected: FAIL (Cannot find module '../src/particles')

- [ ] **Step 4: Implement `src/particles.ts`**

Create `src/particles.ts`:
```typescript
// particles.ts — partikelmotor och flytande poängtexter för valtris.
// Använder en fast förallokerad objektpool för stabil prestanda och noll GC.

import type { Particle, FloatingText } from './types';
import { FONT_MONO, SVARTA } from './profile';

export function createParticleSystem(maxParticles = 80, maxTexts = 8) {
  const particles: Particle[] = Array.from({ length: maxParticles }, () => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    w: 0,
    h: 0,
    rotation: 0,
    vRot: 0,
    color: '#111111',
    alpha: 1,
    life: 0,
    maxLife: 400,
    active: false,
  }));

  const texts: FloatingText[] = Array.from({ length: maxTexts }, () => ({
    x: 0,
    y: 0,
    text: '',
    color: '#ffd600',
    alpha: 1,
    life: 0,
    maxLife: 700,
    active: false,
  }));

  return {
    spawnPaperExplosion(x: number, y: number, w: number, h: number, color: string, count = 4) {
      let spawned = 0;
      for (let i = 0; i < particles.length && spawned < count; i++) {
        const p = particles[i]!;
        if (!p.active) {
          p.active = true;
          p.x = x + Math.random() * w;
          p.y = y + Math.random() * h;
          // Slumpmässig hastighet utåt och nedåt (pappersfall)
          p.vx = (Math.random() - 0.5) * 120;
          p.vy = -Math.random() * 80 - 20;
          p.w = 3 + Math.random() * 4;
          p.h = 3 + Math.random() * 4;
          p.rotation = Math.random() * Math.PI * 2;
          p.vRot = (Math.random() - 0.5) * 8;
          p.color = color;
          p.alpha = 1;
          p.life = 0;
          p.maxLife = 350 + Math.random() * 200;
          spawned++;
        }
      }
    },

    spawnFloatingText(x: number, y: number, text: string, color = '#ffd600') {
      for (let i = 0; i < texts.length; i++) {
        const t = texts[i]!;
        if (!t.active) {
          t.active = true;
          t.x = x;
          t.y = y;
          t.text = text;
          t.color = color;
          t.alpha = 1;
          t.life = 0;
          t.maxLife = 700;
          break;
        }
      }
    },

    update(dtMs: number) {
      const dtSec = dtMs / 1000;
      const gravity = 280; // px/s^2

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]!;
        if (p.active) {
          p.life += dtMs;
          if (p.life >= p.maxLife) {
            p.active = false;
            continue;
          }
          p.vy += gravity * dtSec;
          p.x += p.vx * dtSec;
          p.y += p.vy * dtSec;
          p.rotation += p.vRot * dtSec;
          p.alpha = Math.max(0, 1 - p.life / p.maxLife);
        }
      }

      for (let i = 0; i < texts.length; i++) {
        const t = texts[i]!;
        if (t.active) {
          t.life += dtMs;
          if (t.life >= t.maxLife) {
            t.active = false;
            continue;
          }
          // Sväva sakta uppåt (ca 30 px över sin livstid)
          t.y -= 35 * dtSec;
          // Håll full opacitet första hälften, tona sedan ut linjärt
          const progress = t.life / t.maxLife;
          t.alpha = progress < 0.5 ? 1 : Math.max(0, 1 - (progress - 0.5) * 2);
        }
      }
    },

    draw(ctx: CanvasRenderingContext2D) {
      // Rita partiklar
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]!;
        if (p.active && p.alpha > 0) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.strokeStyle = 'rgba(0,0,0,0.4)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      }

      // Rita flytande texter
      for (let i = 0; i < texts.length; i++) {
        const t = texts[i]!;
        if (t.active && t.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = t.alpha;
          ctx.font = `bold 13px ${FONT_MONO}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Bakgrundsplatta i trycksvärta så texten är kristallklar
          const metrics = ctx.measureText(t.text);
          const padX = 6, padY = 3;
          const bgW = metrics.width + padX * 2;
          const bgH = 18 + padY * 2;

          ctx.fillStyle = SVARTA;
          ctx.fillRect(t.x - bgW / 2, t.y - bgH / 2, bgW, bgH);
          ctx.strokeStyle = t.color;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(t.x - bgW / 2, t.y - bgH / 2, bgW, bgH);

          ctx.fillStyle = t.color;
          ctx.fillText(t.text, t.x, t.y + 0.5);
          ctx.restore();
        }
      }
    },

    getActiveParticleCount(): number {
      return particles.filter((p) => p.active).length;
    },

    getActiveTextCount(): number {
      return texts.filter((t) => t.active).length;
    },

    clear() {
      particles.forEach((p) => (p.active = false));
      texts.forEach((t) => (t.active = false));
    },
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test tests/particles.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/particles.ts tests/particles.test.ts
git commit -m "feat(particles): lägg till partikelsystem för pappersstans och flytande poängetiketter"
```

---

### Task 4: Canvas-rendering med Ghost Piece, Screen Shake & Partiklar (`src/render.ts`)

**Files:**
- Modify: `src/render.ts`
- Modify: `tests/render.test.ts`

**Interfaces:**
- Consumes: `ParticleSystem` (from `particles.ts`), `ghostPiece` (from `engine.ts`)
- Produces: `drawScene(ctx, m, board, active, colorOf, flash, now, ghost, shakeOffsetY, particleSystem)`

- [ ] **Step 1: Update failing tests in `tests/render.test.ts`**

Add tests for ghost piece and particle system rendering to `tests/render.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { computeMetrics, cellRect, drawScene } from '../src/render';
import { createBoard, spawn, ghostPiece } from '../src/engine';
import { createParticleSystem } from '../src/particles';

describe('render', () => {
  it('computes metrics from canvas size', () => {
    const m = computeMetrics(300, 600);
    expect(m.cell).toBe(30);
    expect(m.boardX).toBe(0);
    expect(m.boardY).toBe(0);
  });

  it('cellRect returns correct coords', () => {
    const m = computeMetrics(300, 600);
    const r = cellRect(m, 2, 3);
    expect(r.x).toBe(90);
    expect(r.y).toBe(60);
    expect(r.w).toBe(30);
    expect(r.h).toBe(30);
  });

  it('drawScene executes without throwing when given ghost piece, screen shake and particle system', () => {
    const canvas = { width: 300, height: 600 } as HTMLCanvasElement;
    const calls: string[] = [];
    const ctx = {
      canvas,
      clearRect: () => calls.push('clearRect'),
      fillRect: () => calls.push('fillRect'),
      strokeRect: () => calls.push('strokeRect'),
      stroke: () => calls.push('stroke'),
      beginPath: () => calls.push('beginPath'),
      moveTo: () => calls.push('moveTo'),
      lineTo: () => calls.push('lineTo'),
      fillText: () => calls.push('fillText'),
      setLineDash: () => calls.push('setLineDash'),
      save: () => calls.push('save'),
      restore: () => calls.push('restore'),
      translate: () => calls.push('translate'),
      measureText: () => ({ width: 40 }),
    } as unknown as CanvasRenderingContext2D;

    const b = createBoard();
    const active = spawn({ id: '1', title: 'T', slug: 't', party: 's', category: 'välfärd', msek_base: 100, shape: 'I', quote: '', source: { url: '', domain: '' } });
    const ghost = ghostPiece(b, active);
    const ps = createParticleSystem();

    expect(() => {
      drawScene(ctx, computeMetrics(300, 600), b, active, () => '#e3000f', null, 0, ghost, 2, ps);
    }).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/render.test.ts`
Expected: FAIL or type error on extended drawScene parameters.

- [ ] **Step 3: Update `src/render.ts`**

Update `src/render.ts`:
```typescript
import { COLS, ROWS, cellsOf } from './engine';
import type { Board, ActivePiece } from './engine';
import { SVARTA, GUL, LINJE_SVAG, FONT_MONO, stampColorOn, mix } from './profile';
import type { createParticleSystem } from './particles';

export interface ViewMetrics {
  cell: number;
  boardX: number;
  boardY: number;
}

export function computeMetrics(canvasW: number, canvasH: number): ViewMetrics {
  const cell = Math.floor(Math.min(canvasW / COLS, canvasH / ROWS));
  const boardW = cell * COLS;
  const boardH = cell * ROWS;
  return {
    cell,
    boardX: Math.floor((canvasW - boardW) / 2),
    boardY: Math.floor((canvasH - boardH) / 2),
  };
}

export function cellRect(
  m: ViewMetrics,
  row: number,
  col: number,
): { x: number; y: number; w: number; h: number } {
  return {
    x: m.boardX + col * m.cell,
    y: m.boardY + row * m.cell,
    w: m.cell,
    h: m.cell,
  };
}

const DEEP_TOP = 0.18;
const DEEP_BOTTOM = 0.22;
const HL_AMT = 0.28;
const SH_AMT = 0.34;

export interface ClearFlash {
  rows: number[];
  until: number;
}

function fillCell(
  ctx: CanvasRenderingContext2D,
  m: ViewMetrics,
  row: number,
  col: number,
  party: string,
  color: string,
): void {
  const r = cellRect(m, row, col);
  ctx.fillStyle = color;
  ctx.fillRect(r.x, r.y, r.w, r.h);

  const topH = Math.max(1, Math.round(r.h * DEEP_TOP));
  const botH = Math.max(1, Math.round(r.h * DEEP_BOTTOM));
  ctx.fillStyle = mix(color, '#ffffff', HL_AMT);
  ctx.fillRect(r.x, r.y, r.w, topH);
  ctx.fillStyle = mix(color, '#000000', SH_AMT);
  ctx.fillRect(r.x, r.y + r.h - botH, r.w, botH);

  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);

  const label = party.toUpperCase();
  ctx.fillStyle = stampColorOn(color);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(m.cell * 0.42)}px ${FONT_MONO}`;
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 0.5);
}

/**
 * Ghost piece (landningsskugga): ritas med partifärgad streckad kontur och
 * mjuk 14% fyllning så spelaren ser exakt var klossen landar.
 */
function drawGhost(
  ctx: CanvasRenderingContext2D,
  m: ViewMetrics,
  ghost: ActivePiece,
  color: string,
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.14;
  for (const [r, c] of cellsOf(ghost)) {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      const rr = cellRect(m, r, c);
      ctx.fillRect(rr.x + 1, rr.y + 1, rr.w - 2, rr.h - 2);
    }
  }

  ctx.globalAlpha = 0.65;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  if (typeof ctx.setLineDash === 'function') {
    ctx.setLineDash([3, 2]);
  }
  for (const [r, c] of cellsOf(ghost)) {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      const rr = cellRect(m, r, c);
      ctx.strokeRect(rr.x + 1, rr.y + 1, rr.w - 2, rr.h - 2);
    }
  }
  ctx.restore();
}

function outlineActive(
  ctx: CanvasRenderingContext2D,
  m: ViewMetrics,
  active: ActivePiece,
): void {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = Math.max(4, m.cell * 0.35);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = Math.max(2, m.cell * 0.12);
  ctx.strokeStyle = GUL;
  ctx.lineWidth = 2;
  for (const [r, c] of cellsOf(active)) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
    const rr = cellRect(m, r, c);
    ctx.strokeRect(rr.x + 1, rr.y + 1, rr.w - 2, rr.h - 2);
  }
  ctx.restore();
}

function drawClearFlash(
  ctx: CanvasRenderingContext2D,
  m: ViewMetrics,
  flash: ClearFlash,
  now: number,
): void {
  const remain = flash.until - now;
  if (remain <= 0) return;
  const t = Math.max(0, Math.min(1, remain / 180));
  const alpha = 0.78 * t;
  const boardW = m.cell * COLS;
  ctx.fillStyle = `rgba(255, 252, 230, ${alpha.toFixed(3)})`;
  for (const r of flash.rows) {
    if (r < 0 || r >= ROWS) continue;
    const y = m.boardY + r * m.cell;
    ctx.fillRect(m.boardX, y, boardW, m.cell);
  }
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  m: ViewMetrics,
  board: Board,
  active: ActivePiece | null,
  colorOf: (party: string) => string,
  flash?: ClearFlash | null,
  now: number = performance.now(),
  ghost?: ActivePiece | null,
  shakeOffsetY = 0,
  particleSystem?: ReturnType<typeof createParticleSystem> | null,
): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.save();
  if (shakeOffsetY !== 0) {
    ctx.translate(0, shakeOffsetY);
  }

  const boardW = m.cell * COLS;
  const boardH = m.cell * ROWS;

  // Rutnät
  ctx.strokeStyle = LINJE_SVAG;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 1; c < COLS; c++) {
    const x = m.boardX + c * m.cell + 0.5;
    ctx.moveTo(x, m.boardY);
    ctx.lineTo(x, m.boardY + boardH);
  }
  for (let r = 1; r < ROWS; r++) {
    const y = m.boardY + r * m.cell + 0.5;
    ctx.moveTo(m.boardX, y);
    ctx.lineTo(m.boardX + boardW, y);
  }
  ctx.stroke();

  // Låsta celler
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[r]![c];
      if (cell) {
        fillCell(ctx, m, r, c, cell.party, cell.color || colorOf(cell.party));
      }
    }
  }

  // Ghost piece (ritas under aktiv kloss om den inte redan är vid botten)
  if (ghost && active && ghost.row !== active.row) {
    drawGhost(ctx, m, ghost, colorOf(active.game.party));
  }

  // Aktiv kloss
  if (active) {
    for (const [r, c] of cellsOf(active)) {
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
        fillCell(ctx, m, r, c, active.game.party, colorOf(active.game.party));
      }
    }
    outlineActive(ctx, m, active);
  }

  // Radrens-flash
  if (flash && flash.rows.length > 0) {
    drawClearFlash(ctx, m, flash, now);
  }

  // Yttre ram
  ctx.strokeStyle = SVARTA;
  ctx.lineWidth = 2;
  ctx.strokeRect(m.boardX + 1, m.boardY + 1, boardW - 2, boardH - 2);

  // Partiklar och flytande poäng
  if (particleSystem) {
    particleSystem.draw(ctx);
  }

  ctx.restore();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/render.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/render.ts tests/render.test.ts
git commit -m "feat(render): stöd för ghost piece, screen-shake och partiklar i drawScene"
```

---

### Task 5: UI Live-telegram, Hjälpmodal (`?`), Ljudknapp & Layout (`src/ui.ts`, `index.html`, `src/styles/app.css`)

**Files:**
- Modify: `index.html`
- Modify: `src/ui.ts`
- Modify: `src/styles/app.css`

**Interfaces:**
- Produces:
  - `showActiveTelegram(piece: GamePiece | null, parties: PartyData[]): void`
  - `showHelpModal(visible: boolean): void`
  - `updateSoundButton(muted: boolean): void`

- [ ] **Step 1: Update `index.html` with Header Controls, Telegram Bar & Help Modal**

Update `index.html` to include:
1. Header action buttons (`#sound-toggle-btn`, `#help-toggle-btn`).
2. `#live-telegram` remsa i `.vt-game`.
3. `#help-modal` dialogkomponent.

In `index.html`:
```html
<!doctype html>
<html lang="sv">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>valtris — Tetris med vallöften</title>
    <link rel="stylesheet" href="/src/styles/base.css" />
    <link rel="stylesheet" href="/src/styles/app.css" />
  </head>
  <body>
    <main id="app" class="vt-app">
      <header class="vt-head">
        <div class="vt-head-top">
          <p class="vt-eyebrow">utlovat.se × tetris</p>
          <div class="vt-head-actions">
            <button id="sound-btn" class="vt-icon-btn" type="button" aria-label="Slå på/av ljud" title="Ljud">
              <span id="sound-icon">🔊</span>
            </button>
            <button id="help-btn" class="vt-icon-btn" type="button" aria-label="Hur man spelar" title="Regler & hjälp">
              <span>?</span>
            </button>
          </div>
        </div>
        <h1 class="vt-title">valtris</h1>
        <p class="vt-sub">Tetris med partiernas verkliga vallöften. Partiet på klossen är kosmetiskt — det styr inget.</p>
      </header>

      <section id="start-screen" class="vt-start" aria-label="Startskärm">
        <div class="vt-start-card">
          <p class="vt-eyebrow">utlovat.se × tetris</p>
          <h2 class="vt-start-title">valtris</h2>

          <div class="vt-start-howto">
            <p>
              Klossarna är partiernas verkliga vallöften. <strong>Vänster/höger</strong> flyttar,
              <strong>upp</strong> roterar, <strong>ner</strong> tappar mjukt och
              <strong>mellanslag</strong> tappar hårt. Fyllda rader rensas.
              <strong>Kostnaden</strong> är din poäng — större löften ger mer.
              Tappar du över toppen är spelet slut.
            </p>
          </div>

          <div class="vt-legends">
            <section class="vt-legend vt-legend--form" aria-label="Kategori till form">
              <h3 class="vt-legend-title">Form = kategori <span class="vt-legend-sub">(styrspelet)</span></h3>
              <p class="vt-legend-note">Klossens form avgörs av löftets kategori. Den här kartan är fast.</p>
              <ul id="legend-category" class="vt-legend-list"></ul>
            </section>

            <section class="vt-legend vt-legend--party" aria-label="Partifärger">
              <h3 class="vt-legend-title">Färg = parti <span class="vt-legend-sub">(endast kosmetiskt)</span></h3>
              <p class="vt-legend-note">Parti färgar bara klossen — det påverkar inte poäng eller form.</p>
              <ul id="legend-party" class="vt-legend-list"></ul>
            </section>
          </div>

          <div class="vt-start-actions">
            <button id="start-btn" class="vt-start-btn" type="button" disabled>Laddar löften…</button>
          </div>
          <p id="start-status" class="vt-status" role="status" aria-live="polite"></p>
        </div>
      </section>

      <section class="vt-game" hidden>
        <!-- Live-telegramremsa: visar aktivt vallöfte i realtid -->
        <div id="telegram" class="vt-telegram" aria-live="polite" aria-label="Aktivt vallöfte">
          <div class="vt-telegram-inner">
            <span id="telegram-stamp" class="vt-telegram-stamp">VAL</span>
            <span id="telegram-title" class="vt-telegram-title">Väntar på kloss…</span>
            <span id="telegram-cost" class="vt-telegram-cost">0 MSEK</span>
          </div>
        </div>

        <div class="vt-board-wrap">
          <canvas id="board" width="300" height="600" aria-label="Spelplan"></canvas>
          <div id="overlay" class="vt-overlay" hidden></div>
          
          <div class="vt-touch" role="group" aria-label="Kontroller">
            <button class="vt-btn" type="button" data-action="left" aria-label="Vänster"><span aria-hidden="true">◀</span></button>
            <button class="vt-btn" type="button" data-action="rotate" aria-label="Rotera"><span aria-hidden="true">↻</span></button>
            <button class="vt-btn" type="button" data-action="right" aria-label="Höger"><span aria-hidden="true">▶</span></button>
            <button class="vt-btn" type="button" data-action="drop" aria-label="Tappa hårt"><span aria-hidden="true">⤓</span></button>
          </div>
        </div>

        <aside class="vt-side">
          <section class="vt-panel">
            <h2 class="vt-panel-title">Nästa kloss</h2>
            <div id="next" class="vt-next" aria-label="Nästa kloss"></div>
          </section>

          <section class="vt-panel">
            <h2 class="vt-panel-title">Poäng</h2>
            <dl class="vt-stats">
              <dt>Poäng</dt><dd id="score">0</dd>
              <dt>Rensade rader</dt><dd id="lines">0</dd>
              <dt>Nivå</dt><dd id="level">1</dd>
              <dt>Bästa</dt><dd id="highscore">—</dd>
            </dl>
          </section>

          <div id="status" class="vt-status" role="status" aria-live="polite"></div>
        </aside>
      </section>

      <!-- Hjälp- och regelmodal (?) -->
      <div id="help-modal" class="vt-overlay" hidden>
        <div class="vt-card" role="dialog" aria-labelledby="help-title">
          <h2 id="help-title" class="vt-card-title">Hur fungerar valtris?</h2>
          
          <div class="vt-help-section">
            <h3 class="vt-help-h3">1. Kontroller</h3>
            <p class="vt-help-p"><strong>Tangentbord:</strong> Vänster/Höger piltangent flyttar. Upp roterar. Ner tappar mjukt (+1p/rad). Mellanslag tappar hårt direkt till botten.</p>
            <p class="vt-help-p"><strong>Mobil/Touch:</strong> Tryckknapparna under spelplanen styr spelet.</p>
          </div>

          <div class="vt-help-section">
            <h3 class="vt-help-h3">2. Form = Kategori (Styr spelet)</h3>
            <p class="vt-help-p">Klossens form bestäms av löftets politiska kategori (t.ex. Välfärd/Utbildning = I, Skatter = L, Klimat = T). Denna kartläggning är fast och gäller alla partier lika.</p>
          </div>

          <div class="vt-help-section">
            <h3 class="vt-help-h3">3. Färg = Parti (Endast kosmetiskt)</h3>
            <p class="vt-help-p">Partifärgen visar vem som gett löftet, men ger absolut ingen fördel, förändring av gravitation eller bonus. Samma fysik gäller alla klossar.</p>
          </div>

          <div class="vt-help-section">
            <h3 class="vt-help-h3">4. Poängräkning</h3>
            <p class="vt-help-p">När en kloss låses får du dess verkliga årskostnad i poäng (MSEK). När rader rensas multipliceras summan av radens löften med antal rensade rader och nivå.</p>
          </div>

          <div class="vt-help-section">
            <h3 class="vt-help-h3">5. Data & Neutralitet</h3>
            <p class="vt-help-p">All data hämtas live från <a href="https://utlovat.se" target="_blank" rel="noopener">utlovat.se</a> (CC-BY-4.0). valtris är ett oberoende projekt utan partikoppling.</p>
          </div>

          <p class="vt-card-foot">
            <button id="close-help-btn" class="vt-link-btn" type="button">Stäng (Esc)</button>
          </p>
        </div>
      </div>

      <section id="detail" class="vt-detail" hidden></section>

      <details class="vt-method">
        <summary>Så här spelas och mäts poängen</summary>
        <div id="method-text" class="vt-method-body"></div>
      </details>

      <footer class="vt-foot">
        <p>
          Data från <a href="https://utlovat.se">utlovat.se</a> (CC-BY-4.0). valtris är ett oberoende projekt utan partikoppling.
        </p>
      </footer>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: Add functions to `src/ui.ts`**

Update `src/ui.ts` to add `showActiveTelegram`, `showHelpModal`, and `updateSoundButton`:
```typescript
export function showActiveTelegram(piece: GamePiece | null, parties: PartyData[]) {
  const stampEl = document.getElementById('telegram-stamp');
  const titleEl = document.getElementById('telegram-title');
  const costEl = document.getElementById('telegram-cost');
  if (!stampEl || !titleEl || !costEl) return;

  if (!piece) {
    stampEl.textContent = 'VAL';
    stampEl.style.background = SVARTA;
    stampEl.style.color = PAPPER;
    titleEl.textContent = 'valtris';
    costEl.textContent = '';
    return;
  }

  const party = parties.find((p) => p.code === piece.party);
  const partyColor = party?.color ?? '#888888';
  const partyText = stampColorOn(partyColor);

  stampEl.textContent = piece.party.toUpperCase();
  stampEl.style.background = partyColor;
  stampEl.style.color = partyText;

  titleEl.textContent = piece.title;
  costEl.textContent = piece.msek_base > 0 ? `${fmt(piece.msek_base)} MSEK` : '0 MSEK (REGLERING)';
}

export function showHelpModal(visible: boolean) {
  const modal = document.getElementById('help-modal');
  if (modal) {
    modal.hidden = !visible;
  }
}

export function updateSoundButton(muted: boolean) {
  const icon = document.getElementById('sound-icon');
  if (icon) {
    icon.textContent = muted ? '🔇' : '🔊';
  }
}
```

- [ ] **Step 3: Update `src/styles/app.css` for Telegram, Header Actions & Help Modal**

Add styles to `src/styles/app.css`:
```css
/* ── Header Top with Action Buttons ── */
.vt-head-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.vt-head-actions {
  display: flex;
  gap: 0.5rem;
}
.vt-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.2rem;
  height: 2.2rem;
  font-family: var(--font-mono);
  font-size: var(--steg-0);
  font-weight: 700;
  color: var(--svarta);
  background: var(--papper);
  border: 2px solid var(--svarta);
  cursor: pointer;
  padding: 0;
  transition: background 60ms linear;
}
.vt-icon-btn:hover {
  background: var(--gul);
}
.vt-icon-btn:active {
  background: var(--svarta);
  color: var(--papper);
}

/* ── Live-telegram (Toppremsa) ── */
.vt-telegram {
  grid-column: 1 / -1;
  width: 100%;
  max-width: 480px;
  margin: 0 auto 0.25rem;
  background: var(--svarta);
  color: var(--papper);
  border-bottom: 2px solid var(--gul);
  padding: 0.4rem 0.6rem;
  box-sizing: border-box;
}
.vt-telegram-inner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: var(--steg--1);
}
.vt-telegram-stamp {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: var(--steg--1);
  padding: 0.1rem 0.35rem;
  border: 1px solid var(--svarta);
  white-space: nowrap;
}
.vt-telegram-title {
  flex: 1;
  font-family: var(--font-brod);
  font-size: var(--steg-0);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #faf8f5;
}
.vt-telegram-cost {
  color: var(--gul);
  font-weight: 700;
  white-space: nowrap;
  font-size: var(--steg--1);
}

/* ── Help Modal Sections ── */
.vt-help-section {
  border-top: var(--linje-under);
  padding-top: 0.6rem;
  margin-top: 0.2rem;
}
.vt-help-h3 {
  font-family: var(--font-display);
  font-size: var(--steg-0);
  text-transform: uppercase;
  letter-spacing: var(--sparrning-display);
  color: var(--svarta);
  margin-bottom: 0.25rem;
}
.vt-help-p {
  font-family: var(--font-brod);
  font-size: var(--steg--1);
  line-height: 1.45;
  color: var(--grafit);
  margin: 0 0 0.4rem;
}
.vt-help-p strong {
  color: var(--svarta);
}
```

- [ ] **Step 4: Verify with `npm test`**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add index.html src/ui.ts src/styles/app.css
git commit -m "feat(ui): lägg till live-telegram, ljudknapp och regelmodal"
```

---

### Task 6: Spelloop, Input & Audio/Juice Koppling (`src/main.ts`)

**Files:**
- Modify: `src/main.ts`
- Test: Full integration test suite

**Interfaces:**
- Integrates: `audio.ts`, `particles.ts`, `engine.ts` (`ghostPiece`), `render.ts`, `ui.ts`

- [ ] **Step 1: Implement complete orchestration in `src/main.ts`**

Update `src/main.ts` with:
1. `ParticleSystem` update & drawing.
2. `ghostPiece` computation in draw step.
3. Screen shake calculation on hard drop.
4. Audio triggers (`initAudio`, `playMove`, `playRotate`, `playHardDrop`, `playLock`, `playLineClear`, `playGameOver`).
5. Help modal (`?`) toggle with game pause & resume.
6. Mute toggle button wiring.
7. Live-telegram update when spawning active piece.

In `src/main.ts`:
```typescript
import { fetchGameInput, toGamePieces } from './api';
import { PromisePool } from './pool';
import { createBoard, spawn, tryMove, tryRotate, hardDropRow, lockPiece, clearLines, isSpawnBlocked, ghostPiece, COLS, ROWS } from './engine';
import type { Board } from './engine';
import { computeMetrics, drawScene } from './render';
import type { ClearFlash } from './render';
import { lockScore, lineScore } from './score';
import { colorForParty } from './mapping';
import { loadStore, saveStore, bestOf, addScore } from './highscore';
import { setStats, showNext, showDetail, showStatus, showGameOver, hideOverlay, setMethodText, renderCategoryLegend, renderPartyLegend, showActiveTelegram, showHelpModal, updateSoundButton } from './ui';
import { initAudio, isMuted, toggleMuted, playMove, playRotate, playHardDrop, playLock, playLineClear, playGameOver } from './audio';
import { createParticleSystem } from './particles';
import type { GamePiece, PartyData, PartyCode } from './types';

void COLS; void ROWS;

let parties: PartyData[] = [];
let pool: PromisePool | null = null;
let board = createBoard();
let active = spawn({ id:'x', title:'', slug:'', party:'s', category:'övrigt', msek_base:0, shape:'O', quote:'', source:{url:'',domain:''} });
let nextPiece: GamePiece | null = null;
let score = 0, level = 1, lines = 0, killer: GamePiece | null = null;
let over = false;
let started = false;
let pausedForHelp = false;
let rafId: number | null = null;
const store = loadStore();
const particleSystem = createParticleSystem();

// Screen-shake offset
let shakeUntil = 0;
let shakeOffsetY = 0;

const FLASH_MS = 180;
let clearFlash: ClearFlash | null = null;
let pendingBoard: Board | null = null;

const MAX_BOARD_W = 360;
function resizeCanvas() {
  const canvas = document.getElementById('board') as HTMLCanvasElement | null;
  if (!canvas) return;
  const app = document.querySelector('.vt-app') as HTMLElement | null;
  const avail = (app ? app.clientWidth : window.innerWidth) - 4;
  const targetW = Math.min(MAX_BOARD_W, Math.max(160, avail));
  const cell = Math.floor(targetW / COLS);
  const w = cell * COLS;
  const h = cell * ROWS;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

const onBoard = new Map<string, GamePiece>();

function tickInterval() { return Math.max(120, 800 - (level - 1) * 60); }
let lastTick = 0;
let lastFrameTime = performance.now();

function colorOf(p: string) { return colorForParty(p as PartyCode, parties); }

function draw() {
  const canvas = document.getElementById('board') as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const now = performance.now();
  const m = computeMetrics(canvas.width, canvas.height);
  const ghost = (!over && started && !clearFlash) ? ghostPiece(board, active) : null;

  drawScene(ctx, m, board, over ? null : active, colorOf, clearFlash, now, ghost, shakeOffsetY, particleSystem);
}

type ActionKind = 'left' | 'right' | 'rotate' | 'down' | 'drop';
const lastActionAt: Record<ActionKind, number> = { left: 0, right: 0, rotate: 0, down: 0, drop: 0 };
const ACTION_THROTTLE_MS = 40;

function handleAction(action: ActionKind) {
  if (!started || over || pausedForHelp) return;
  initAudio();
  if (clearFlash) return;
  const now = performance.now();
  if (now - lastActionAt[action] < ACTION_THROTTLE_MS) return;
  lastActionAt[action] = now;

  switch (action) {
    case 'left': {
      const next = tryMove(board, active, -1, 0);
      if (next) { active = next; playMove(); }
      break;
    }
    case 'right': {
      const next = tryMove(board, active, 1, 0);
      if (next) { active = next; playMove(); }
      break;
    }
    case 'rotate': {
      const next = tryRotate(board, active);
      if (next) { active = next; playRotate(); }
      break;
    }
    case 'down': {
      const d = tryMove(board, active, 0, 1);
      if (d) { active = d; score += 1; playMove(); }
      break;
    }
    case 'drop': {
      active = { ...active, row: hardDropRow(board, active) };
      shakeUntil = performance.now() + 120;
      playHardDrop();
      lockActive();
      break;
    }
  }
  setStats(score, level, lines, bestOf(store));
}

function spawnNext() {
  const piece = nextPiece ?? pool!.spawn();
  nextPiece = pool!.spawn();
  active = spawn(piece);
  showNext(nextPiece, parties);
  showActiveTelegram(piece, parties);
  if (isSpawnBlocked(board, piece)) endGame(killer ?? piece);
}

function lockActive() {
  killer = active.game;
  board = lockPiece(board, active);
  onBoard.set(active.game.id, active.game);

  const before = board;
  const res = clearLines(board);
  const postClear = res.board;

  const canvas = document.getElementById('board') as HTMLCanvasElement | null;
  const m = canvas ? computeMetrics(canvas.width, canvas.height) : { cell: 30, boardX: 0, boardY: 0 };

  if (res.cleared > 0) {
    const clearedPieces = collectClearedPieces(before, postClear);
    const addedScore = lineScore(clearedPieces, res.cleared, level);
    lines += res.cleared;
    score += addedScore;
    level = 1 + Math.floor(lines / 10);
    pruneOnBoard();

    playLineClear(res.cleared);

    const fullRows: number[] = [];
    for (let i = 0; i < before.length; i++) {
      if (before[i]!.every((c) => c !== null)) {
        fullRows.push(i);
        // Spawna pappersstans-partiklar för varje cell i raden
        for (let col = 0; col < COLS; col++) {
          const cell = before[i]![col];
          const color = cell?.color || (cell ? colorOf(cell.party) : '#ffd600');
          const r = { x: m.boardX + col * m.cell, y: m.boardY + i * m.cell, w: m.cell, h: m.cell };
          particleSystem.spawnPaperExplosion(r.x, r.y, r.w, r.h, color, 3);
        }
      }
    }

    // Spawna flytande poängetikett
    const midRow = fullRows.length > 0 ? fullRows[Math.floor(fullRows.length / 2)]! : 10;
    const textX = m.boardX + (COLS * m.cell) / 2;
    const textY = m.boardY + midRow * m.cell;
    const label = res.cleared === 4 ? `TETRIS! +${addedScore.toLocaleString('sv-SE')} MSEK` : res.cleared === 3 ? `TRIPPEL! +${addedScore.toLocaleString('sv-SE')} MSEK` : res.cleared === 2 ? `DUBBEL! +${addedScore.toLocaleString('sv-SE')} MSEK` : `+${addedScore.toLocaleString('sv-SE')} MSEK`;
    particleSystem.spawnFloatingText(textX, textY, label, '#ffd600');

    setStats(score, level, lines, bestOf(store));
    pendingBoard = postClear;
    clearFlash = { rows: fullRows, until: performance.now() + FLASH_MS };
    active = { ...active, row: ROWS + 4 };
  } else {
    playLock();
    score += lockScore(active.game);
    board = postClear;
    setStats(score, level, lines, bestOf(store));
    spawnNext();
  }
}

function finishClearFlash() {
  if (!pendingBoard) return;
  board = pendingBoard;
  pendingBoard = null;
  clearFlash = null;
  spawnNext();
}

function collectClearedPieces(before: ReturnType<typeof createBoard>, _after: ReturnType<typeof createBoard>): GamePiece[] {
  const ids = new Set<string>();
  for (const row of before) {
    if (row.every((c) => c !== null)) {
      for (const cell of row) {
        if (cell && cell.pieceId) ids.add(cell.pieceId);
      }
    }
  }
  const out: GamePiece[] = [];
  for (const id of ids) {
    const g = onBoard.get(id);
    if (g) out.push(g);
  }
  return out;
}

function pruneOnBoard() {
  const remaining = new Set<string>();
  for (const row of board) {
    for (const cell of row) {
      if (cell?.pieceId) remaining.add(cell.pieceId);
    }
  }
  for (const id of onBoard.keys()) {
    if (!remaining.has(id)) onBoard.delete(id);
  }
}

function endGame(k: GamePiece) {
  over = true;
  playGameOver();
  addScore(store, score); saveStore(store);
  showGameOver(k, parties, score, lines, level, bestOf(store));
  setStats(score, level, lines, bestOf(store));
}

function step(now: number) {
  const dt = Math.min(100, now - lastFrameTime);
  lastFrameTime = now;

  // Uppdatera partiklar och skärmskak
  particleSystem.update(dt);

  if (now < shakeUntil) {
    const remain = (shakeUntil - now) / 120;
    shakeOffsetY = Math.round(Math.sin(now * 0.05) * 3.5 * remain);
  } else {
    shakeOffsetY = 0;
  }

  if (started && !over && !pausedForHelp) {
    if (clearFlash && now >= clearFlash.until) {
      finishClearFlash();
    } else if (!clearFlash && now - lastTick > tickInterval()) {
      lastTick = now;
      const down = tryMove(board, active, 0, 1);
      if (down) active = down; else lockActive();
    }
  }
  if (started) draw();
  rafId = requestAnimationFrame(step);
}

function stopLoop() {
  if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
}

function reset() {
  board = createBoard(); score = 0; level = 1; lines = 0; over = false; killer = null;
  nextPiece = null; onBoard.clear(); clearFlash = null; pendingBoard = null;
  particleSystem.clear(); shakeOffsetY = 0; shakeUntil = 0;
  hideOverlay(); showStatus(''); spawnNext(); setStats(0, 1, 0, bestOf(store));
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && pausedForHelp) {
    toggleHelp(false);
    return;
  }
  if (!started) return;
  if (over) { if (e.key === 'Enter') beginGame(); return; }
  switch (e.key) {
    case 'ArrowLeft':  e.preventDefault(); handleAction('left'); break;
    case 'ArrowRight': e.preventDefault(); handleAction('right'); break;
    case 'ArrowDown':  e.preventDefault(); handleAction('down'); break;
    case 'ArrowUp':    e.preventDefault(); handleAction('rotate'); break;
    case ' ':          e.preventDefault(); handleAction('drop'); break;
    default: return;
  }
});

document.querySelectorAll<HTMLButtonElement>('.vt-touch [data-action]').forEach((btn) => {
  const action = btn.dataset.action as ActionKind;
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    handleAction(action);
  });
  btn.addEventListener('click', () => handleAction(action));
});

window.addEventListener('resize', () => { resizeCanvas(); draw(); });

const nextEl = document.getElementById('next');
if (nextEl) {
  nextEl.addEventListener('mouseenter', () => showDetail(nextPiece, parties));
  nextEl.addEventListener('mouseleave', () => showDetail(null, parties));
}

function setStartBtn(label: string, disabled: boolean) {
  const btn = document.getElementById('start-btn') as HTMLButtonElement | null;
  if (!btn) return;
  btn.textContent = label;
  btn.disabled = disabled;
}

function showStartScreen() {
  started = false;
  over = false;
  stopLoop();
  hideOverlay();
  const ss = document.getElementById('start-screen');
  const game = document.querySelector<HTMLElement>('.vt-game');
  if (ss) ss.hidden = false;
  if (game) game.hidden = true;
}

function beginGame() {
  if (!pool) { setStartStatus('Väntar på data från utlovat.se…'); return; }
  initAudio();
  const ss = document.getElementById('start-screen');
  const game = document.querySelector<HTMLElement>('.vt-game');
  if (ss) ss.hidden = true;
  if (game) game.hidden = false;
  started = true;
  reset();
  if (rafId == null) rafId = requestAnimationFrame(step);
}

function setStartStatus(msg: string) {
  const el = document.getElementById('start-status');
  if (el) el.textContent = msg;
}

document.getElementById('start-btn')?.addEventListener('click', () => {
  if (pool) beginGame();
});

document.getElementById('overlay')?.addEventListener('click', (e) => {
  const t = e.target as HTMLElement | null;
  if (t && t.closest('#back-to-start')) showStartScreen();
});

// Ljudknapp
document.getElementById('sound-btn')?.addEventListener('click', () => {
  initAudio();
  const isMute = toggleMuted();
  updateSoundButton(isMute);
});

// Hjälpmodal (?)
function toggleHelp(show: boolean) {
  pausedForHelp = show;
  showHelpModal(show);
}

document.getElementById('help-btn')?.addEventListener('click', () => {
  toggleHelp(true);
});
document.getElementById('close-help-btn')?.addEventListener('click', () => {
  toggleHelp(false);
});

async function load() {
  updateSoundButton(isMuted());
  setMethodText();
  renderCategoryLegend();
  setStartStatus('Hämtar löften från utlovat.se…');
  showStatus('Hämtar löften från utlovat.se…');
  try {
    const { promises, parties: p } = await fetchGameInput();
    parties = p;
    const pieces = toGamePieces(promises);
    if (pieces.length === 0) throw new Error('no active promises');
    pool = new PromisePool(pieces);
    renderPartyLegend(parties);
    setStartStatus('');
    showStatus('');
    setStartBtn('Starta', false);
  } catch (err) {
    setStartStatus('Kunde inte hämta löften från utlovat.se just nu — försök igen.');
    showStatus('Kunde inte hämta löften från utlovat.se just nu.');
    console.error(err);
  }
}

resizeCanvas();
load();
```

- [ ] **Step 2: Run all tests to verify entire test suite is green**

Run: `npm test`
Expected: ALL 11 test files PASS with 100% success rate.

- [ ] **Step 3: Commit**

```bash
git add src/main.ts
git commit -m "feat(game): integrera ghost piece, screen-shake, partiklar, ljud och hjälpmodal"
```
