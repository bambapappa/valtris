import { describe, it, expect } from 'vitest';
import { toGamePieces, validatePromises, validateParties } from '../src/api';
import promisesRaw from './fixtures/promises.sample.json';
import partiesRaw from './fixtures/parties.sample.json';

describe('validation', () => {
  it('keeps active promises, drops non-active', () => {
    const pieces = toGamePieces(validatePromises(promisesRaw));
    // every output piece came from an active promise
    for (const p of promisesRaw.data) {
      if (p.status !== 'aktiv') expect(pieces.find((x) => x.id === p.id)).toBeUndefined();
    }
  });
  it('maps unknown category to övrigt and missing cost to 0', () => {
    const oneBad = { data: [{ id: 'x', title: 't', parties: ['s'], category: 'bagkategori', status: 'aktiv', cost: {} }] };
    const vs = validatePromises(oneBad);
    expect(vs).toHaveLength(1);
    const v = vs[0]!;
    expect(v.category).toBe('övrigt');
    expect(v.cost.msek_base).toBe(0);
  });
  it('parties validate to 8 parties with colors', () => {
    const parties = validateParties(partiesRaw);
    expect(parties.length).toBeGreaterThanOrEqual(8);
    for (const p of parties) expect(p.color).toMatch(/^#[0-9a-f]{6}$/i);
  });
  it('toGamePieces assigns the mapped shape to each piece', () => {
    const pieces = toGamePieces(validatePromises(promisesRaw));
    for (const p of pieces) expect(p.shape).toMatch(/^(I|O|T|S|Z|J|L)$/);
  });
});
