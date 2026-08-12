import type { GamePiece } from './types';
import { lockPointsFor } from './mapping';

export function lineMultiplier(linesCleared: number): number {
  switch (linesCleared) {
    case 1: return 1;
    case 2: return 1.5;
    case 3: return 2;
    case 4: return 4;
    default: return 0;
  }
}

export function levelMultiplier(level: number): number {
  return 1 + (level - 1) * 0.1;
}

export function lockScore(piece: GamePiece): number {
  return lockPointsFor(piece.msek_base);
}

export function lineScore(clearedPieces: GamePiece[], linesCleared: number, level: number): number {
  const sum = clearedPieces.reduce((acc, p) => acc + lockPointsFor(p.msek_base), 0);
  return Math.round(sum * lineMultiplier(linesCleared) * levelMultiplier(level));
}
