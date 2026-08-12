const KEY = 'valtris.highscore.v1';

export type ScoreStore = Map<string, number>;

export function bestOf(store: ScoreStore): number | null {
  const v = store.get(KEY);
  return typeof v === 'number' ? v : null;
}

export function addScore(store: ScoreStore, score: number): void {
  const cur = store.get(KEY) ?? -Infinity;
  if (score > cur) store.set(KEY, score);
}

// Thin adapter over localStorage; not unit-tested (DOM), kept tiny.
export function loadStore(): ScoreStore {
  const m: ScoreStore = new Map();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) m.set(KEY, Number(JSON.parse(raw)));
  } catch { /* ignore corrupt storage */ }
  return m;
}
export function saveStore(store: ScoreStore): void {
  const v = store.get(KEY);
  try { if (typeof v === 'number') localStorage.setItem(KEY, String(v)); } catch { /* ignore */ }
}
