export type PartyCode = 's' | 'm' | 'sd' | 'c' | 'v' | 'kd' | 'l' | 'mp';

export type Category =
  | 'välfärd' | 'utbildning' | 'skatter' | 'klimat-miljö'
  | 'rättsväsende' | 'migration' | 'infrastruktur' | 'försvar' | 'övrigt';

export type Tetromino = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

/** Subset of utlovat /api/v1/promises.json fields we use. */
export interface PromiseData {
  id: string;
  title: string;
  parties: PartyCode[];
  category: Category;
  status: string;
  cost: { msek_base: number };
}

export interface PartyData {
  code: PartyCode;
  name: string;
  color: string;
  block: string;
}

/** A promise turned into a playable piece. */
export interface GamePiece {
  id: string;
  title: string;
  party: PartyCode;
  category: Category;
  msek_base: number;
  shape: Tetromino;
}
