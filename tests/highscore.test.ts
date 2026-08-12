import { describe, it, expect } from 'vitest';
import { bestOf, addScore } from '../src/highscore';

describe('highscore (in-memory store)', () => {
  it('returns null when nothing recorded', () => {
    const store = new Map<string, number>();
    expect(bestOf(store)).toBeNull();
  });
  it('keeps the highest score', () => {
    const store = new Map<string, number>();
    addScore(store, 100); addScore(store, 50); addScore(store, 300);
    expect(bestOf(store)).toBe(300);
  });
});
