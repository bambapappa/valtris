// profile.ts — canvas-renderarens spegling av utlovats designtokens.
// Canvas kan inte läsa CSS-variabler, så hex-värdena hardkodas här och måste
// hållas synkade med src/styles/tokens.css. Ändringar på ett ställe kräver ändring
// på det andra. Se docs/superpowers/plans/2026-08-13-valtris-profile-ui.md.

/** Bakgrund: varmt myndighetspapper. */
export const PAPPER = '#f6f3ec';
/** Tryckbläck: text, hårlinjer, plattor. */
export const SVARTA = '#111111';
/** Signalfärg: löpsedelsgul. */
export const GUL = '#ffd600';
/** Sekundärtext. */
export const GRAFIT = '#3f3d38';
/** Metadata/bildtext. */
export const DIS = '#6e6a61';
/** Underordnade hårlinjer. */
export const LINJE_SVAG = '#c9c3b6';

/**
 * Stämpelfärg (partiförkortning på en partifärgad cell). Luminansbaserat val så
 * förkortningen är läslig oberoende av partifärg — inte `color_text`, som för 5
 * av 8 partier är identisk med `color` (osynlig stämpel).
 *
 * `STAMP_LIGHT` (PAPPER) används på mörka partifärger, `STAMP_DARK` (SVARTA)
 * på ljusa. Samma regel för alla partier → neutralt.
 */
export const STAMP_LIGHT = PAPPER; // #f6f3ec  (på mörk partifärg)
export const STAMP_DARK = SVARTA; // #111     (på ljus partifärg)

/**
 * Väljer stämpelfärg (STAMP_LIGHT eller STAMP_DARK) för en given bakgrund i
 * hex (`#rrggbb`). Beräknar luminans enligt ITU-R BT.601 och vänder på tröskeln
 * 0.55: ljus bakgrund → mörk stämpel, annars → ljus stämpel.
 */
export function stampColorOn(bg: string): string {
  const h = bg.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16),
    g = parseInt(h.slice(2, 4), 16),
    b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255; // ITU-R BT.601
  return lum > 0.55 ? STAMP_DARK : STAMP_LIGHT;
}

/**
 * Blanda två hex-färger (`#rrggbb`) mot varandra med andel `amt` ∈ [0,1].
 * amt=0 → `a`, amt=1 → `b`. Används av renderaren för att uniformt härleda
 * en ljusare (mix mot #ffffff) respektive mörkare (mix mot #000000) variant
 * av en partifärg — samma andel för alla partier, så djupet blir neutralt.
 *
 * Enkel linjär kanalblandning (alpha-aware inte behövt — båda argument är
 * ogenomskinliga hex). Returnerar alltid `#rrggbb` (lägre bokstäver).
 */
export function mix(a: string, b: string, amt: number): string {
  const t = Math.max(0, Math.min(1, amt));
  const pa = parseHex(a);
  const pb = parseHex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return '#' + [r, g, bl].map((n) => n.toString(16).padStart(2, '0')).join('');
}

function parseHex(h: string): [number, number, number] {
  const s = h.replace('#', '');
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}

/** Versala rubriker (används sällan på canvas — aldrig tal). */
export const FONT_DISPLAY = '"Anton", sans-serif';
/** Alla tal, etiketter, stämplar på canvas. */
export const FONT_MONO = '"IBM Plex Mono", monospace';
/** Brödtext/citat (används sällan på canvas). */
export const FONT_BROD = '"Source Serif 4", serif';
