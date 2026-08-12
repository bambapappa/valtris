import type { Category, GamePiece, PartyCode, PartyData, PromiseData, Tetromino } from './types';
import { shapeForCategory } from './mapping';

const CATEGORIES: Category[] = ['välfärd','utbildning','skatter','klimat-miljö','rättsväsende','migration','infrastruktur','försvar','övrigt'];
const PARTIES: PartyCode[] = ['s','m','sd','c','v','kd','l','mp'];

function asCategory(x: unknown): Category {
  return CATEGORIES.includes(x as Category) ? (x as Category) : 'övrigt';
}
function asParty(x: unknown): PartyCode {
  return PARTIES.includes(x as PartyCode) ? (x as PartyCode) : 's';
}

export function validatePromises(raw: any): PromiseData[] {
  const data = Array.isArray(raw?.data) ? raw.data : [];
  return data
    .filter((p: any) => p && typeof p.id === 'string')
    .map((p: any) => ({
      id: p.id,
      title: typeof p.title === 'string' ? p.title : '',
      parties: Array.isArray(p.parties) ? p.parties.map(asParty) : [],
      category: asCategory(p.category),
      status: typeof p.status === 'string' ? p.status : 'aktiv',
      cost: { msek_base: Number(p?.cost?.msek_base) || 0 },
    }));
}

export function validateParties(raw: any): PartyData[] {
  const data = Array.isArray(raw?.data) ? raw.data : [];
  return data
    .filter((p: any) => p && PARTIES.includes(p.code))
    .map((p: any) => ({ code: p.code, name: p.name, color: p.color, block: p.block }));
}

export function toGamePieces(promises: PromiseData[]): GamePiece[] {
  return promises
    .filter((p) => p.status === 'aktiv')
    .map((p) => ({
      id: p.id,
      title: p.title,
      party: p.parties[0] ?? 's',
      category: p.category,
      msek_base: p.cost.msek_base,
      shape: shapeForCategory(p.category),
    }));
}

const DEFAULT_PROMISES_URL = 'https://utlovat.se/api/v1/promises.json';
const DEFAULT_PARTIES_URL = 'https://utlovat.se/api/v1/parties.json';

async function fetchWithTimeout(url: string, ms = 8000): Promise<any> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function fetchGameInput(src?: { promisesUrl?: string; partiesUrl?: string }) {
  const [promisesRaw, partiesRaw] = await Promise.all([
    fetchWithTimeout(src?.promisesUrl ?? DEFAULT_PROMISES_URL),
    fetchWithTimeout(src?.partiesUrl ?? DEFAULT_PARTIES_URL),
  ]);
  return {
    promises: validatePromises(promisesRaw),
    parties: validateParties(partiesRaw),
  };
}

// shape is exported implicitly via GamePiece.shape; keep Tetromino import for type clarity.
export type { Tetromino };
