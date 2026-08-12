import { describe, it, expect } from 'vitest';
import { PromisePool } from '../src/pool';
import type { GamePiece, Tetromino } from '../src/types';

const SHAPES: Tetromino[] = ['I','O','T','S','Z','J','L'];
function mk(shape: Tetromino, id: string): GamePiece {
  return { id, title: id, party: 's', category: 'övrigt', msek_base: 0, shape };
}

describe('PromisePool', () => {
  it('draws without replacement until exhausted, then reshuffles', () => {
    const pool = new PromisePool([mk('O','a'), mk('O','b'), mk('I','c')]);
    const drawn = new Set([pool.spawn().id, pool.spawn().id, pool.spawn().id]);
    expect(drawn.size).toBe(3); // no duplicates in first pass
    // 4th draw still works (bag refilled and reshuffled)
    expect(() => pool.spawn()).not.toThrow();
  });

  it('bag is exhaustive: every piece appears exactly once before any repeat', () => {
    const pieces: GamePiece[] = [];
    for (const s of SHAPES) for (let i = 0; i < 3; i++) pieces.push(mk(s, `${s}${i}`));
    const pool = new PromisePool(pieces);
    const seen = new Map<string, number>();
    // Draw exactly one full bag — repeats belong to the next bag only after
    // every piece has appeared once.
    for (let i = 0; i < pieces.length; i++) {
      const id = pool.spawn().id;
      seen.set(id, (seen.get(id) ?? 0) + 1);
    }
    expect(seen.size).toBe(pieces.length);
    for (const id of pieces.map((p) => p.id)) {
      expect(seen.get(id)).toBe(1);
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
});
