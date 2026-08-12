import type { Category, PartyCode, PartyData, Tetromino } from './types';

// Final map. Two categories share a form on purpose:
//   välfärd & utbildning -> I ; försvar & infrastruktur -> J.
const SHAPE_BY_CATEGORY: Record<Category, Tetromino> = {
  välfärd: 'I',
  utbildning: 'I',
  skatter: 'L',
  'klimat-miljö': 'T',
  rättsväsende: 'Z',
  migration: 'S',
  övrigt: 'O',
  försvar: 'J',
  infrastruktur: 'J',
};

export function shapeForCategory(c: Category): Tetromino {
  return SHAPE_BY_CATEGORY[c] ?? 'O';
}

const FALLBACK_COLOR = '#888888';

export function colorForParty(code: PartyCode, parties: PartyData[]): string {
  return parties.find((p) => p.code === code)?.color ?? FALLBACK_COLOR;
}

/** Gameplay floor for zero-cost promises. This is a score value, not a
 * claimed kronor amount — documented in the in-game method text. */
const LOCK_FLOOR_NO_COST = 10;

export function lockPointsFor(msek_base: number): number {
  return msek_base > 0 ? msek_base : LOCK_FLOOR_NO_COST;
}
