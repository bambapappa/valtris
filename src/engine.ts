import type { GamePiece, PartyCode, Tetromino } from './types';

export const COLS = 10;
export const ROWS = 20;

export interface Cell {
  party: PartyCode;
  color: string;
  pieceId: string;
}
export type Board = (Cell | null)[][]; // [row][col]

export interface ActivePiece {
  game: GamePiece;
  shape: Tetromino;
  rotation: number; // 0..3
  row: number;      // anchor (top-left of the piece's bounding box)
  col: number;
}

// Each rotation is the list of filled [row,col] offsets within the bounding box.
type Offsets = Array<[number, number]>;
const ROTATIONS: Record<Tetromino, Offsets[]> = {
  I: [
    [[1,0],[1,1],[1,2],[1,3]],
    [[0,2],[1,2],[2,2],[3,2]],
    [[3,0],[3,1],[3,2],[3,3]],
    [[0,1],[1,1],[2,1],[3,1]],
  ],
  O: [
    [[0,1],[0,2],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[1,2]],
  ],
  T: [
    [[0,1],[1,0],[1,1],[1,2]],
    [[0,1],[1,1],[1,2],[2,1]],
    [[1,0],[1,1],[1,2],[2,1]],
    [[0,1],[1,0],[1,1],[2,1]],
  ],
  S: [
    [[0,1],[0,2],[1,0],[1,1]],
    [[0,1],[1,1],[1,2],[2,2]],
    [[1,1],[1,2],[2,0],[2,1]],
    [[0,0],[1,0],[1,1],[2,1]],
  ],
  Z: [
    [[0,0],[0,1],[1,1],[1,2]],
    [[0,2],[1,1],[1,2],[2,1]],
    [[1,0],[1,1],[2,1],[2,2]],
    [[0,1],[1,0],[1,1],[2,0]],
  ],
  J: [
    [[0,0],[1,0],[1,1],[1,2]],
    [[0,1],[0,2],[1,1],[2,1]],
    [[1,0],[1,1],[1,2],[2,2]],
    [[0,1],[1,1],[2,0],[2,1]],
  ],
  L: [
    [[0,2],[1,0],[1,1],[1,2]],
    [[0,1],[1,1],[2,1],[2,2]],
    [[1,0],[1,1],[1,2],[2,0]],
    [[0,0],[0,1],[1,1],[2,1]],
  ],
};

export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Cell | null>(COLS).fill(null));
}

export function cellsOf(p: ActivePiece): Array<[number, number]> {
  return ROTATIONS[p.shape]![p.rotation % 4]!.map(([r, c]) => [p.row + r, p.col + c]);
}

/**
 * Rotation-0 cell-offsets (4×4 bounding box) för en tetrominoform. Enda källan
 * till sanning för formerna — återanvänds av både celler-of (via ROTATIONS) och
 * UI:t (glyph/mini-rendering) så tabellen inte dupliceras.
 */
export function shapeCells(shape: Tetromino): Array<[number, number]> {
  return ROTATIONS[shape]![0]!.map(([r, c]) => [r, c] as [number, number]);
}

export function canPlace(board: Board, p: ActivePiece): boolean {
  for (const [r, c] of cellsOf(p)) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
    if (board[r]![c] !== null) return false;
  }
  return true;
}

export function tryMove(board: Board, p: ActivePiece, dCol: number, dRow: number): ActivePiece | null {
  const next: ActivePiece = { ...p, col: p.col + dCol, row: p.row + dRow };
  return canPlace(board, next) ? next : null;
}

export function tryRotate(board: Board, p: ActivePiece): ActivePiece | null {
  const next: ActivePiece = { ...p, rotation: (p.rotation + 1) % 4 };
  return canPlace(board, next) ? next : null;
}

export function hardDropRow(board: Board, p: ActivePiece): number {
  let row = p.row;
  while (canPlace(board, { ...p, row: row + 1 })) row++;
  return row;
}

export function lockPiece(board: Board, p: ActivePiece): Board {
  const next = board.map((r) => r.slice());
  for (const [r, c] of cellsOf(p)) {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      next[r]![c] = { party: p.game.party, color: '', pieceId: p.game.id };
    }
  }
  return next;
}

export function clearLines(board: Board): { board: Board; cleared: number } {
  const kept = board.filter((row) => row.some((cell) => cell === null));
  const cleared = ROWS - kept.length;
  const empties = Array.from({ length: cleared }, () => Array<Cell | null>(COLS).fill(null));
  return { board: [...empties, ...kept], cleared };
}

const SPAWN_COL = Math.floor(COLS / 2) - 2; // centre a 4-wide bounding box

export function spawn(piece: GamePiece): ActivePiece {
  return { game: piece, shape: piece.shape, rotation: 0, row: 0, col: SPAWN_COL };
}

export function isSpawnBlocked(board: Board, piece: GamePiece): boolean {
  return !canPlace(board, spawn(piece));
}
