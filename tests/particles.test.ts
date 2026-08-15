import { describe, it, expect, vi } from 'vitest';
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

  it('clears all active particles and texts', () => {
    const ps = createParticleSystem(20, 5);
    ps.spawnPaperExplosion(50, 50, 20, 20, '#005ea1');
    ps.spawnFloatingText(100, 200, '+160 000 MSEK');
    expect(ps.getActiveParticleCount()).toBeGreaterThan(0);
    expect(ps.getActiveTextCount()).toBe(1);

    ps.clear();
    expect(ps.getActiveParticleCount()).toBe(0);
    expect(ps.getActiveTextCount()).toBe(0);
  });

  it('draws active particles and texts to canvas context without crashing', () => {
    const ps = createParticleSystem(20, 5);
    ps.spawnPaperExplosion(50, 50, 20, 20, '#e3000f');
    ps.spawnFloatingText(100, 200, 'TETRIS! +160 000 MSEK', '#ffd600');

    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 100 })),
      globalAlpha: 1,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: 'left',
      textBaseline: 'alphabetic',
    } as unknown as CanvasRenderingContext2D;

    ps.draw(ctx);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalledWith('TETRIS! +160 000 MSEK', expect.any(Number), expect.any(Number));
  });
});
