import { describe, it, expect } from 'vitest';
import { lineMultiplier, levelMultiplier, lockScore, lineScore } from '../src/score';
import type { GamePiece } from '../src/types';

const gp = (msek_base: number): GamePiece =>
  ({ id: 'p', title: 't', party: 's', category: 'övrigt', msek_base, shape: 'O', quote: '', source: { url: '', domain: '' } });

describe('scoring', () => {
  it('line multiplier rewards multi-line clears, especially tetris', () => {
    expect(lineMultiplier(1)).toBe(1);
    expect(lineMultiplier(2)).toBe(1.5);
    expect(lineMultiplier(3)).toBe(2);
    expect(lineMultiplier(4)).toBe(4);
    expect(lineMultiplier(0)).toBe(0);
  });
  it('level multiplier grows with level', () => {
    expect(levelMultiplier(1)).toBe(1);
    expect(levelMultiplier(2)).toBeCloseTo(1.1);
  });
  it('lockScore honours cost floor for zero-cost promises', () => {
    expect(lockScore(gp(0))).toBe(10);
    expect(lockScore(gp(5000))).toBe(5000);
  });
  it('lineScore sums cleared pieces, scaled by line + level multipliers', () => {
    const cleared = [gp(1000), gp(2000)];
    // sum=3000, single line (x1), level 1 (x1) => 3000
    expect(lineScore(cleared, 1, 1)).toBe(3000);
    // tetris (x4) level 2 (x1.1) => 3000*4*1.1 = 13200
    expect(lineScore(cleared, 4, 2)).toBe(13200);
  });
});
