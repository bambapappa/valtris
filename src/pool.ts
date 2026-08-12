import type { GamePiece, Tetromino } from './types';

const SHAPES: Tetromino[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

/** Fisher–Yates. Caller passes a function so tests can inject determinism. */
function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export interface PoolOptions {
  /** Max consecutive spawns without a given shape before it is forced. */
  antiDrought?: number;
  /** Injectable RNG for deterministic tests. */
  rng?: () => number;
}

/**
 * Promise pool — a bag of `GamePiece` drawn without replacement. When the bag
 * empties it is reshuffled from the full original set. An anti-drought rule
 * guarantees no shape is absent for more than `antiDrought` consecutive spawns
 * (reshuffling early if the starving shape's queue is exhausted).
 *
 * Party is cosmetic only: draws are weighted solely by each shape's remaining
 * count, which mirrors real category sizes. Anti-drought targets a shape, then
 * pops a piece of that shape.
 */
export class PromisePool {
  private original: GamePiece[] = [];
  private remaining: Map<Tetromino, GamePiece[]> = new Map();
  /** Shapes that actually exist in the pool — drought only binds these. */
  private readonly activeShapes: Set<Tetromino> = new Set();
  private recent: Tetromino[] = [];
  private readonly antiDrought: number;
  private readonly rng: () => number;

  constructor(pieces: GamePiece[], opts: PoolOptions = {}) {
    this.original = pieces;
    this.antiDrought = opts.antiDrought ?? 12;
    this.rng = opts.rng ?? Math.random;
    for (const p of pieces) this.activeShapes.add(p.shape);
    this.remaining = this.group(pieces);
  }

  private group(pieces: GamePiece[]): Map<Tetromino, GamePiece[]> {
    const m = new Map<Tetromino, GamePiece[]>();
    for (const s of SHAPES) m.set(s, []);
    for (const p of shuffle(pieces, this.rng)) m.get(p.shape)!.push(p);
    return m;
  }

  private totalCount(): number {
    let n = 0;
    for (const q of this.remaining.values()) n += q.length;
    return n;
  }

  /** Rebuild the bag from the full original set, re-grouped and re-shuffled. */
  private reshuffleAll(): void {
    this.remaining = this.group(this.original);
  }

  private droughtShape(): Tetromino | undefined {
    return SHAPES.find((s) => {
      if (!this.activeShapes.has(s)) return false;
      const lastSeen = this.recent.lastIndexOf(s);
      const since = lastSeen === -1 ? this.recent.length : this.recent.length - 1 - lastSeen;
      return since >= this.antiDrought;
    });
  }

  spawn(): GamePiece {
    let shape: Tetromino;

    // 1. Is any shape in drought? Bias toward it (reshuffle early if its queue
    //    is empty so the bound can still hold for skewed pools).
    const drought = this.droughtShape();
    if (drought) {
      shape = drought;
      if ((this.remaining.get(shape)?.length ?? 0) === 0) {
        this.reshuffleAll();
      }
    } else {
      // 2. Otherwise reshuffle on exhaustion, then draw weighted by remaining
      //    count (uniform over pieces).
      if (this.totalCount() === 0) this.reshuffleAll();
      const total = this.totalCount();
      let r = Math.floor(this.rng() * total);
      shape = SHAPES[0]!;
      for (const s of SHAPES) {
        r -= this.remaining.get(s)!.length;
        if (r < 0) {
          shape = s;
          break;
        }
      }
    }

    const queue = this.remaining.get(shape)!;
    const piece = queue.pop()!;
    this.recent.push(shape);
    // Keep the recent window bounded so lastIndexOf stays cheap and the
    // `since` calculation remains meaningful across long runs.
    if (this.recent.length > this.antiDrought * 2) this.recent.shift();
    return piece;
  }
}
