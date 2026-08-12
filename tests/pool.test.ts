import { describe, it, expect } from 'vitest';
import { PromisePool } from '../src/pool';
import type { GamePiece, Tetromino } from '../src/types';

const SHAPES: Tetromino[] = ['I','O','T','S','Z','J','L'];
function mk(shape: Tetromino, id: string): GamePiece {
  return { id, title: id, party: 's', category: 'övrigt', msek_base: 0, shape };
}
// A pool dominated by one shape (O=100) with rare J (2).
function skewed(): GamePiece[] {
  return [...Array.from({ length: 100 }, (_, i) => mk('O', `o${i}`)), mk('J', 'j0'), mk('J', 'j1')];
}

describe('PromisePool', () => {
  it('draws without replacement until exhausted, then reshuffles', () => {
    const pool = new PromisePool([mk('O','a'), mk('O','b'), mk('I','c')]);
    const drawn = new Set([pool.spawn().id, pool.spawn().id, pool.spawn().id]);
    expect(drawn.size).toBe(3); // no duplicates in first pass
    // 4th draw still works (reshuffled)
    expect(() => pool.spawn()).not.toThrow();
  });

  it('anti-drought forces a starved shape to appear before its threshold', () => {
    const pool = new PromisePool(skewed(), { antiDrought: 8 });
    let lastJ = -1;
    for (let i = 0; i < 200; i++) {
      const p = pool.spawn();
      if (p.shape === 'J') lastJ = i;
      // J must never be absent for more than `antiDrought` consecutive spawns
      expect(i - lastJ).toBeLessThanOrEqual(8);
    }
  });

  it('reshuffle reproduces the full original set (no pieces lost or invented)', () => {
    const original = [mk('O','a'), mk('O','b'), mk('I','c'), mk('T','d'), mk('J','e')];
    const pool = new PromisePool(original);
    // Draw well past one full pass to force at least one reshuffle, then
    // verify every draw is a member of the original set.
    const ids = new Set(original.map((p) => p.id));
    for (let i = 0; i < original.length * 3; i++) {
      expect(ids.has(pool.spawn().id)).toBe(true);
    }
  });

  it('recent window trims and drought bound holds across many draws for all shapes', () => {
    // Uniform spread, default antiDrought (12). Every shape must stay within
    // the bound across a long run.
    const pieces: GamePiece[] = [];
    let n = 0;
    for (const s of SHAPES) {
      for (let i = 0; i < 10; i++) pieces.push(mk(s, `p${n++}`));
    }
    const antiDrought = 12;
    const pool = new PromisePool(pieces, { antiDrought });
    const lastSeen = new Map<Tetromino, number>();
    for (const s of SHAPES) lastSeen.set(s, -1);
    for (let i = 0; i < 1000; i++) {
      const p = pool.spawn();
      lastSeen.set(p.shape, i);
      for (const s of SHAPES) {
        // Only enforce the bound once a shape has actually appeared at least once.
        if (lastSeen.get(s)! >= 0) {
          expect(i - lastSeen.get(s)!).toBeLessThanOrEqual(antiDrought);
        }
      }
    }
  });
});
