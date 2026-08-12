import { describe, it, expect } from 'vitest';
import { PromisePool } from '../src/pool';
import { toGamePieces, validatePromises, validateParties } from '../src/api';
import promisesRaw from './fixtures/promises.sample.json';
import partiesRaw from './fixtures/parties.sample.json';

// Seeded RNG so the neutrality test is reproducible, not flaky. A mulberry32
// generator with a fixed seed produces a deterministic stream for the lifetime
// of the run, which is what we want when asserting a distributional guarantee.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('neutrality (full sample)', () => {
  it("no party's spawn share exceeds its share of active promises by more than 5 pp", () => {
    const pieces = toGamePieces(validatePromises(promisesRaw));
    const parties = validateParties(partiesRaw);
    const total = pieces.length;
    expect(total).toBeGreaterThan(0);

    const expected: Record<string, number> = {};
    for (const p of pieces) expected[p.party] = (expected[p.party] ?? 0) + 1;

    const pool = new PromisePool(pieces, { antiDrought: 12, rng: mulberry32(0x76543210) });
    const seen: Record<string, number> = {};
    const N = 20000;
    for (let i = 0; i < N; i++) {
      const p = pool.spawn();
      seen[p.party] = (seen[p.party] ?? 0) + 1;
    }

    // Neutrality contract: every party's spawn share must match its share of
    // active promises within 5 percentage points. The tolerance encodes the
    // guarantee; do not loosen it.
    for (const code of Object.keys(expected)) {
      const expShare = expected[code]! / total;
      const gotShare = (seen[code] ?? 0) / N;
      expect(Math.abs(gotShare - expShare)).toBeLessThan(0.05);
    }

    // Sanity: every known party that has at least one promise appears.
    for (const party of parties) {
      if (expected[party.code]) expect(seen[party.code]).toBeGreaterThan(0);
    }
  });
});
