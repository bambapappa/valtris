import { describe, it, expect } from 'vitest';
import { shapeForCategory, colorForParty, lockPointsFor } from '../src/mapping';
import type { PartyData } from '../src/types';

const PARTIES: PartyData[] = [
  { code: 's', name: 'Socialdemokraterna', color: '#EE2020', color_text: '#EE2020', block: 'rödgrönt' },
  { code: 'm', name: 'Moderaterna', color: '#1B5CB3', color_text: '#FFFFFF', block: 'borgerligt' },
];

describe('shapeForCategory', () => {
  it('maps each category to its tetromino per the final map', () => {
    expect(shapeForCategory('välfärd')).toBe('I');
    expect(shapeForCategory('utbildning')).toBe('I'); // shares I, intentional
    expect(shapeForCategory('skatter')).toBe('L');
    expect(shapeForCategory('klimat-miljö')).toBe('T');
    expect(shapeForCategory('rättsväsende')).toBe('Z');
    expect(shapeForCategory('migration')).toBe('S');
    expect(shapeForCategory('övrigt')).toBe('O');
    expect(shapeForCategory('försvar')).toBe('J');
    expect(shapeForCategory('infrastruktur')).toBe('J'); // shares J, intentional
  });
  it('is total — unknown category falls back to Ö (övrigt)', () => {
    expect(shapeForCategory('whatever' as never)).toBe('O');
  });
});

describe('colorForParty', () => {
  it('returns the colour from parties.json', () => {
    expect(colorForParty('s', PARTIES)).toBe('#EE2020');
  });
  it('falls back to neutral grey when the party is missing', () => {
    expect(colorForParty('mp', PARTIES)).toBe('#888888');
  });
});

describe('lockPointsFor', () => {
  it('returns the raw base cost when it is positive', () => {
    expect(lockPointsFor(6200)).toBe(6200);
  });
  it('returns a non-zero floor for zero-cost promises', () => {
    expect(lockPointsFor(0)).toBeGreaterThan(0);
  });
});
