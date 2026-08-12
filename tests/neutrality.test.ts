import { describe, it, expect } from 'vitest';
import { PromisePool } from '../src/pool';
import { toGamePieces, validatePromises } from '../src/api';
import promisesRaw from './fixtures/promises.full.json';

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

const PARTIES = ['s','m','sd','c','v','kd','l','mp'] as const;

describe('neutrality (full promise-bag)', () => {
  it("no party's spawn share differs from its share of pieces by more than 5 pp", () => {
    const pieces = toGamePieces(validatePromises(promisesRaw));
    const total = pieces.length;
    expect(total).toBeGreaterThan(0);

    // Expected share: each piece maps to exactly one (first) party, so the
    // expected share per party is its count in the bag divided by total.
    const expected: Record<string, number> = {};
    for (const p of pieces) expected[p.party] = (expected[p.party] ?? 0) + 1;

    const pool = new PromisePool(pieces, { rng: mulberry32(0x76543210) });
    const seen: Record<string, number> = {};
    const N = 20000;
    for (let i = 0; i < N; i++) {
      const p = pool.spawn();
      seen[p.party] = (seen[p.party] ?? 0) + 1;
    }

    // Print the per-party table for the report (visible under vitest reporter).
    const rows = PARTIES.map((code) => {
      const exp = expected[code] ?? 0;
      const got = seen[code] ?? 0;
      const expShare = exp / total;
      const gotShare = got / N;
      return `${code}: pieces=${exp} (${(expShare * 100).toFixed(2)}%) | spawns=${got} (${(gotShare * 100).toFixed(2)}%) | Δ=${((gotShare - expShare) * 100).toFixed(2)} pp`;
    });
    // eslint-disable-next-line no-console
    console.log(`[neutrality] total pieces=${total} N=${N}\n${rows.join('\n')}`);

    // Neutrality contract: every party's spawn share must match its share of
    // pieces within 5 percentage points. The tolerance encodes the guarantee;
    // do not loosen it — a violation means the uniform draw has a bug.
    for (const code of Object.keys(expected)) {
      const expShare = expected[code]! / total;
      const gotShare = (seen[code] ?? 0) / N;
      expect(Math.abs(gotShare - expShare)).toBeLessThan(0.05);
    }

    // Sanity: every party that has at least one piece appears at least once.
    for (const code of PARTIES) {
      if (expected[code]) expect(seen[code]).toBeGreaterThan(0);
    }
  });
});
