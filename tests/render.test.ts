import { describe, it, expect, vi } from 'vitest';
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

  it('drawScene executes with ghost piece, screen shake and particle system', () => {
    const canvas = { width: 300, height: 600 } as HTMLCanvasElement;
    const calls: string[] = [];
    const translateMock = vi.fn((x: number, y: number) => { calls.push(`translate:${x},${y}`); });
    const setLineDashMock = vi.fn((pattern: number[]) => { calls.push(`setLineDash:${pattern.join(',')}`); });

    const ctx = {
      canvas,
      clearRect: () => calls.push('clearRect'),
      fillRect: () => calls.push('fillRect'),
      strokeRect: () => calls.push('strokeRect'),
      stroke: () => calls.push('stroke'),
      beginPath: () => calls.push('beginPath'),
      closePath: () => calls.push('closePath'),
      fill: () => calls.push('fill'),
      moveTo: () => calls.push('moveTo'),
      lineTo: () => calls.push('lineTo'),
      fillText: () => calls.push('fillText'),
      setLineDash: setLineDashMock,
      save: () => calls.push('save'),
      restore: () => calls.push('restore'),
      translate: translateMock,
      measureText: () => ({ width: 40 }),
    } as unknown as CanvasRenderingContext2D;


    const b = createBoard();
    const active = spawn({ id: '1', title: 'T', slug: 't', party: 's', category: 'välfärd', msek_base: 100, shape: 'I', quote: '', source: { url: '', domain: '' } });
    const ghost = ghostPiece(b, active);
    const ps = createParticleSystem();
    const drawSpy = vi.spyOn(ps, 'draw');

    drawScene(ctx, computeMetrics(300, 600), b, active, () => '#e3000f', null, 0, ghost, 2, ps);

    expect(translateMock).toHaveBeenCalledWith(0, 2);
    expect(setLineDashMock).toHaveBeenCalledWith([3, 2]);
    expect(drawSpy).toHaveBeenCalledWith(ctx);
  });
});
