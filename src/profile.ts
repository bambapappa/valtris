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

/** Versala rubriker (används sällan på canvas — aldrig tal). */
export const FONT_DISPLAY = '"Anton", sans-serif';
/** Alla tal, etiketter, stämplar på canvas. */
export const FONT_MONO = '"IBM Plex Mono", monospace';
/** Brödtext/citat (används sällan på canvas). */
export const FONT_BROD = '"Source Serif 4", serif';
