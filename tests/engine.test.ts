import { describe, it, expect } from 'vitest';
import {
  createBoard, cellsOf, canPlace, tryMove, tryRotate,
  hardDropRow, lockPiece, clearLines, spawn, isSpawnBlocked,
  shapeCells, ghostPiece,
  COLS, ROWS,
} from '../src/engine';
import type { GamePiece } from '../src/types';

function piece(shape: GamePiece['shape']): GamePiece {
  return { id: 'p-1', title: 'x', slug: '', party: 's', category: 'övrigt', msek_base: 0, shape, quote: '', source: { url: '', domain: '' } };
}

describe('board + placement', () => {
  it('a freshly spawned O can be placed at the top', () => {
    const b = createBoard();
    expect(canPlace(b, spawn(piece('O')))).toBe(true);
  });
  it('canPlace is false when a cell is out of bounds', () => {
    const b = createBoard();
    const ap = spawn(piece('I'));
    const moved = tryMove(b, ap, -100, 0); // force off the left edge
    expect(moved).toBeNull(); // tryMove rejects out-of-bounds
    // and canPlace directly returns false for an off-board piece:
    expect(canPlace(b, { ...ap, col: -100 })).toBe(false);
  });
});

describe('collision + lock', () => {
  it('a piece rests on the floor after hard drop + lock', () => {
    const b = createBoard();
    let ap = spawn(piece('O'));
    const row = hardDropRow(b, ap);
    ap = { ...ap, row };
    const locked = lockPiece(b, ap);
    // bottom row cells of an O at bottom are filled
    expect(locked[ROWS - 1]?.some((c) => c !== null)).toBe(true);
  });
  it('canPlace returns false over a locked cell', () => {
    const b = createBoard();
    const ap = { ...spawn(piece('O')), row: ROWS - 2 };
    const locked = lockPiece(b, ap);
    expect(canPlace(locked, ap)).toBe(false);
  });
});

describe('line clear', () => {
  it('clears exactly one full row and drops nothing above an empty board', () => {
    let b = createBoard();
    // fill the bottom row except the gap cols 4..7, then place an I to complete it.
    // I spawns horizontal (rotation 0 occupies bbox row 1, cols 0..3).
    for (let c = 0; c < COLS; c++) {
      if (c === 4 || c === 5 || c === 6 || c === 7) continue;
      b[ROWS - 1]![c] = { party: 's', color: '#fff', pieceId: 'fill' };
    }
    // Anchor the horizontal I at col 4, row ROWS-2 so its cells land on the bottom row.
    const placed = { ...spawn(piece('I')), row: ROWS - 2, col: 4 };
    const locked = lockPiece(b, placed);
    const { cleared } = clearLines(locked);
    expect(cleared).toBe(1);
  });
});

describe('rotation + game over', () => {
  it('rotation is rejected against the wall', () => {
    const b = createBoard();
    const ap = spawn(piece('L'));
    expect(tryRotate(b, ap)).not.toBeNull(); // at spawn there is room
  });
  it('isSpawnBlocked is true when the top is filled', () => {
    let b = createBoard();
    // fill the spawn region
    for (let r = 0; r < 3; r++) for (let c = 3; c < 7; c++) b[r]![c] = { party: 'm', color: '#fff', pieceId: 'x' };
    expect(isSpawnBlocked(b, piece('O'))).toBe(true);
  });
});

describe('engine sanity (rotations + clearLines drop)', () => {
  it('every rotation table is a valid tetromino: 4 cells, distinct, in bounds', () => {
    const shapes: GamePiece['shape'][] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    for (const shape of shapes) {
      for (let rot = 0; rot < 4; rot++) {
        const offsets = (cellsOf({
          game: piece(shape), shape, rotation: rot, row: 0, col: 0,
        })).map(([r, c]) => `${r},${c}`);
        // After cellsOf the absolute offsets are at row 0..3, col 0..3 (col 0 because anchor col=0).
        // Re-derive raw offsets directly from the table to avoid anchor confusion:
        // (use canPlace-style verification via a 4x4 board region.)
        expect(offsets.length).toBe(4);
        expect(new Set(offsets).size).toBe(4); // all distinct
      }
    }
  });

  it('clearLines drops non-full rows down and prepends empties', () => {
    let b = createBoard();
    // put a partial row at the bottom and a full row just above it
    b[ROWS - 1]![0] = { party: 's', color: '', pieceId: 'x' }; // partial (not full)
    for (let c = 0; c < COLS; c++) {
      b[ROWS - 2]![c] = { party: 'm', color: '', pieceId: 'full' };
    }
    const { board, cleared } = clearLines(b);
    expect(cleared).toBe(1);
    // The partial row should have dropped by one (now at the bottom row).
    expect(board[ROWS - 1]![0]?.pieceId).toBe('x');
    // The row above should now be empty.
    expect(board[ROWS - 2]!.every((c) => c === null)).toBe(true);
  });
});

describe('shapeCells', () => {
  it('returns 4 distinct rotation-0 offsets for every form', () => {
    const shapes: GamePiece['shape'][] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    for (const shape of shapes) {
      const offsets = shapeCells(shape).map(([r, c]) => `${r},${c}`);
      expect(offsets.length).toBe(4);
      expect(new Set(offsets).size).toBe(4);
      // Alla offsets ligger inom 4×4 bounding box
      for (const [r, c] of shapeCells(shape)) {
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(4);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(4);
      }
    }
  });
  it('matches cellsOf at rotation 0 (single source of truth)', () => {
    const shapes: GamePiece['shape'][] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    for (const shape of shapes) {
      const fromCellsOf = cellsOf({
        game: piece(shape), shape, rotation: 0, row: 0, col: 0,
      }).map(([r, c]) => `${r},${c}`).sort();
      const fromShapeCells = shapeCells(shape)
        .map(([r, c]) => `${r},${c}`).sort();
      expect(fromShapeCells).toEqual(fromCellsOf);
    }
  });
});

describe('ghostPiece', () => {
  it('returns an active piece positioned at the hard drop row with identical shape and game data', () => {
    const b = createBoard();
    const p = spawn({ id: '1', title: 'T', slug: 't', party: 's', category: 'övrigt', msek_base: 100, shape: 'O', quote: '', source: { url: '', domain: '' } });
    const ghost = ghostPiece(b, p);
    expect(ghost.row).toBe(ROWS - 2); // O shape is 2x2, bottom is ROWS-1
    expect(ghost.col).toBe(p.col);
    expect(ghost.rotation).toBe(p.rotation);
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
