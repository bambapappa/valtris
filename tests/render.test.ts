import { describe, it, expect } from 'vitest';
import { computeMetrics, cellRect } from '../src/render';

describe('render geometry', () => {
  it('cell size fits 10 cols and 20 rows within the canvas', () => {
    const m = computeMetrics(300, 600);
    expect(m.cell).toBeLessThanOrEqual(300 / 10);
    expect(m.cell).toBeLessThanOrEqual(600 / 20);
  });
  it('cellRect places (0,0) at the board origin', () => {
    const m = computeMetrics(300, 600);
    const r = cellRect(m, 0, 0);
    expect(r.x).toBe(m.boardX);
    expect(r.y).toBe(m.boardY);
  });
  it('cellRect moves one cell width per column', () => {
    const m = computeMetrics(300, 600);
    expect(cellRect(m, 0, 1).x - cellRect(m, 0, 0).x).toBe(m.cell);
  });
});
