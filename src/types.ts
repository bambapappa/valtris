export type PartyCode = 's' | 'm' | 'sd' | 'c' | 'v' | 'kd' | 'l' | 'mp';

export type Category =
  | 'välfärd' | 'utbildning' | 'skatter' | 'klimat-miljö'
  | 'rättsväsende' | 'migration' | 'infrastruktur' | 'försvar' | 'övrigt';

export type Tetromino = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

/** Källdata för ett löfte (url + publik domän). */
export interface PromiseSource {
  url: string;
  domain: string;
}

/** Subset of utlovat /api/v1/promises.json fields we use. */
export interface PromiseData {
  id: string;
  title: string;
  slug: string;
  parties: PartyCode[];
  category: Category;
  status: string;
  cost: { msek_base: number };
  quote: string;
  source: PromiseSource;
}

export interface PartyData {
  code: PartyCode;
  name: string;
  color: string;
  /** Partiets kontrasttextfärg — för stämpel/etikett på partifärgen. */
  color_text: string;
  block: string;
}

/** A promise turned into a playable piece. */
export interface GamePiece {
  id: string;
  title: string;
  slug: string;
  party: PartyCode;
  category: Category;
  msek_base: number;
  shape: Tetromino;
  /** Löftets citat (oral/lösen) — visas i game-over. */
  quote: string;
  /** Löftets källa — visas i game-over. */
  source: PromiseSource;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rotation: number;
  vRot: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  active: boolean;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  active: boolean;
}
