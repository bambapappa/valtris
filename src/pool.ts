import type { GamePiece } from './types';

/** Injectable RNG so tests can drive the bag deterministically. */
export interface PoolOptions {
  rng?: () => number;
}

/** Fisher–Yates shuffle. Returns a new array; does not mutate the input. */
function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/**
 * Promise pool — a pure uniform promise-bag.
 *
 * Spawns draw uniformly at random from the remaining pieces, without
 * replacement. When the bag empties it is refilled and reshuffled from the
 * full original set. No anti-drought, no shape forcing: party is cosmetic
 * only, and a uniform draw over the bag is neutral by construction.
 */
export class PromisePool {
  private readonly original: readonly GamePiece[];
  private bag: GamePiece[];
  private readonly rng: () => number;

  constructor(pieces: GamePiece[], opts: PoolOptions = {}) {
    this.original = pieces;
    this.rng = opts.rng ?? Math.random;
    this.bag = shuffle(pieces, this.rng);
  }

  /** Refill the bag from the full original set, freshly shuffled. */
  private refill(): void {
    this.bag = shuffle(this.original, this.rng);
  }

  spawn(): GamePiece {
    if (this.bag.length === 0) this.refill();
    // Each remaining piece equally likely — uniform over pieces, which makes
    // party representation mirror each party's share of the original set.
    const i = Math.floor(this.rng() * this.bag.length);
    // Swap-remove keeps the draw O(1) and the remaining set honest.
    const last = this.bag.length - 1;
    const piece = this.bag[i]!;
    this.bag[i] = this.bag[last]!;
    this.bag.pop();
    return piece;
  }
}
