import type { GamePiece, PartyData, Tetromino } from './types';
import { stampColorOn, SVARTA, PAPPER } from './profile';
import { shapeCells } from './engine';

/**
 * UI-hjälpar för valtris. All DOM-uppdatering samlad här så main.ts bara
 * anropar funktioner. Stilmässigt i utlovats profil: Anton-versaler för
 * rubriker, IBM Plex Mono för tal/etiketter, Source Serif för brödtext och
 * citat. Färger/form via tokens (app.css); partifärger är det ENDAST kosmetiska
 * inslaget och sätts via inline style från partidata.
 *
 * Neutralitet: partiet visas bara som färg + förkortning. Inga värderande omdömen
 * om löften eller partier. Inget `verbatim`-mekanik.
 */

function setText(id: string, text: string) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function fmt(n: number): string {
  // Svenska siffror med mellanslagstusental — tabellmono, stabila kolumner.
  return n.toLocaleString('sv-SE');
}

export function setStats(score: number, level: number, lines: number, high: number | null) {
  setText('score', fmt(score));
  setText('level', String(level));
  setText('lines', String(lines));
  setText('highscore', high == null ? '—' : fmt(high));
}

/**
 * Nästa-kloss i profil: en mini-rendering av själva tetrominoFORMEN (4×4 celler
 * i spawn-rotation), ritad i partifärg med stämpelfärgad förkortning centrerad
 * över formen. Formen kommer från `shapeCells(piece.shape)` (src/engine.ts) —
 * alltså samma tabell som styr spelet, inte en kopia. Partiet är fortfarande
 * endast kosmetiskt (färg + förkortning); formen styrs av kategorin.
 *
 * Stämpelfärgen väljs luminansbaserat via `stampColorOn(party.color)` så
 * förkortningen är läslig för alla 8 partier. Visar INGEN poängsammanställning
 * i förväg — neutralitet.
 */
/**
 * Nästa-kloss i profil: en mini-rendering av själva tetrominoFORMEN
 * anpassad exakt efter formens bounding box, med samma 3D-fasade klossar
 * och partistämplar som på spelplanen.
 */
export function showNext(piece: GamePiece | null, parties: PartyData[]) {
  const el = document.getElementById('next');
  if (!el) return;
  if (!piece) { el.textContent = ''; return; }
  const party = parties.find((p) => p.code === piece.party);
  const bg = party?.color ?? '#888888';
  const fg = stampColorOn(bg);
  const abbr = piece.party.toUpperCase();

  const cells = shapeCells(piece.shape);
  const rows = cells.map(([r]) => r);
  const cols = cells.map(([, c]) => c);
  const minR = Math.min(...rows);
  const maxR = Math.max(...rows);
  const minC = Math.min(...cols);
  const maxC = Math.max(...cols);

  const numRows = maxR - minR + 1;
  const numCols = maxC - minC + 1;

  const filledSet = new Set(cells.map(([r, c]) => `${r - minR},${c - minC}`));

  const cellHtmls: string[] = [];
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const isFilled = filledSet.has(`${r},${c}`);
      if (isFilled) {
        cellHtmls.push(
          `<div class="vt-next-block" style="background:${bg};color:${fg};"><span>${abbr}</span></div>`
        );
      } else {
        cellHtmls.push(`<div class="vt-next-empty"></div>`);
      }
    }
  }

  el.innerHTML = `<div class="vt-next-wrap" role="img" aria-label="Nästa kloss: form ${piece.shape}, parti ${abbr}">
    <div class="vt-next-grid" style="grid-template-columns:repeat(${numCols}, 1.75rem);grid-template-rows:repeat(${numRows}, 1.75rem);">
      ${cellHtmls.join('')}
    </div>
    <div class="vt-next-meta">
      <span class="vt-next-form">Form ${piece.shape}</span>
      <span class="vt-next-divider">·</span>
      <span class="vt-next-cat">${escapeHtml(piece.category)}</span>
    </div>
  </div>`;
}

/** Detaljpuff vid hover på nästa-kloss — löftet i korthet, neutral ton. */
export function showDetail(piece: GamePiece | null, parties: PartyData[]) {
  const el = document.getElementById('detail');
  if (!el) return;
  if (!piece) { el.hidden = true; return; }
  const party = parties.find((p) => p.code === piece.party);
  el.hidden = false;
  el.innerHTML = `<p><strong>${escapeHtml(piece.title)}</strong></p>
    <p>Parti: ${escapeHtml(party?.name ?? piece.party)} · Kategori: ${escapeHtml(piece.category)} · Kostnad: ${fmt(piece.msek_base)} msek/år</p>`;
}

export function showStatus(msg: string) {
  setText('status', msg);
}

/**
 * Visar aktivt vallöfte i realtid i telegram-remsan över spelplanen.
 */
export function showActiveTelegram(piece: GamePiece | null, parties: PartyData[]) {
  const stampEl = document.getElementById('telegram-stamp');
  const partyEl = document.getElementById('telegram-party');
  const catEl = document.getElementById('telegram-category');
  const titleEl = document.getElementById('telegram-title');
  const costEl = document.getElementById('telegram-cost');
  if (!stampEl || !titleEl || !costEl) return;

  if (!piece) {
    stampEl.textContent = 'VAL';
    stampEl.style.background = SVARTA;
    stampEl.style.color = PAPPER;
    if (partyEl) partyEl.textContent = 'valtris';
    if (catEl) catEl.textContent = '';
    titleEl.textContent = 'valtris';
    costEl.textContent = '';
    return;
  }

  const party = parties.find((p) => p.code === piece.party);
  const partyColor = party?.color ?? '#888888';
  const partyText = stampColorOn(partyColor);
  const partyName = party?.name ?? piece.party.toUpperCase();

  stampEl.textContent = piece.party.toUpperCase();
  stampEl.style.background = partyColor;
  stampEl.style.color = partyText;

  if (partyEl) partyEl.textContent = partyName;
  if (catEl) catEl.textContent = piece.category;

  titleEl.textContent = piece.title;
  costEl.textContent = piece.msek_base > 0 ? `${fmt(piece.msek_base)} MSEK` : '0 MSEK (REGLERING)';
}

export function showHelpModal(visible: boolean) {
  const modal = document.getElementById('help-modal');
  if (modal) {
    modal.hidden = !visible;
  }
}

export function updateSoundButton(muted: boolean) {
  const icon = document.getElementById('sound-icon');
  if (icon) {
    icon.textContent = muted ? '🔇' : '🔊';
  }
}

/**
 * Game-over-overlay. Egentligt papperskort centrerat över brädet, i utlovats
 * stil: Anton-versal rubrik "SPELET SLUT", Mono-stats (poäng, rader, nivå,
 * bästa) och ett Source Serif-block som skriver ut det löfte som fyllt
 * brädet — rubrik, parti (endast kosmetiskt: färg+förkortning), kategori,
 * kostnad i msek/år, citatet kursivt och källans domän.
 *
 * Löftets `quote` och `source` kommer rakt från GamePiece (satt av api.ts från
 * utlovat.se). Inget påhittat.
 */
export function showGameOver(
  killer: GamePiece,
  parties: PartyData[],
  score: number,
  lines: number,
  level: number,
  best: number | null,
) {
  const overlay = document.getElementById('overlay');
  if (!overlay) return;
  const party = parties.find((p) => p.code === killer.party);
  const partyName = party?.name ?? killer.party;
  const partyColor = party?.color ?? '#888888';
  const partyText = stampColorOn(partyColor);
  const cost = `${fmt(killer.msek_base)} msek/år`;
  const quoteHtml = killer.quote
    ? `<p class="vt-promise-quote">${escapeHtml(killer.quote)}</p>`
    : '';
  const sourceDomain = killer.source?.domain || '(källa saknas)';
  const sourceHtml = killer.source?.url
    ? `<a href="${escapeAttr(killer.source.url)}" rel="nofollow noopener" target="_blank">${escapeHtml(sourceDomain)}</a>`
    : escapeHtml(sourceDomain);
  const utlovatUrl = `https://utlovat.se/lofte/${encodeURIComponent(killer.id)}/${encodeURIComponent(killer.slug)}`;

  overlay.innerHTML = `<div class="vt-card" role="dialog" aria-labelledby="vo-title">
    <h2 id="vo-title" class="vt-card-title">Spelet slut</h2>

    <dl class="vt-card-stats">
      <dt>Poäng</dt><dd>${fmt(score)}</dd>
      <dt>Rensade rader</dt><dd>${lines}</dd>
      <dt>Nivå</dt><dd>${level}</dd>
      <dt>Bästa</dt><dd>${best == null ? '—' : fmt(best)}</dd>
    </dl>

    <div class="vt-promise">
      <p class="vt-promise-rubrik">${escapeHtml(killer.title)}</p>
      <div class="vt-promise-meta">
        <span class="vt-stamp" style="background:${partyColor}">
          <span class="vt-stamp-swatch" style="background:${partyText}"></span>
          <span class="vt-stamp-abbr" style="color:${partyText}">${killer.party.toUpperCase()}</span>
        </span>
        <span>${escapeHtml(partyName)}</span>
        <span>${escapeHtml(killer.category)}</span>
        <span class="vt-promise-cost">${cost}</span>
      </div>
      ${quoteHtml}
      <p class="vt-promise-source">Källa: ${sourceHtml}</p>
      <p class="vt-promise-note">Det här löftet låstes sist och fyllde brädet — det blev det som gav dig game over.</p>
      <p class="vt-promise-link"><a href="${escapeAttr(utlovatUrl)}" target="_blank" rel="noopener">Läs löftet på utlovat.se →</a></p>
    </div>

    <p class="vt-card-foot">Retur = spela igen · <button id="back-to-start" class="vt-link-btn" type="button">tillbaka till start</button></p>
  </div>`;
  overlay.hidden = false;
}

export function hideOverlay() {
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.hidden = true;
    overlay.innerHTML = '';
  }
}

export function setMethodText() {
  const el = document.getElementById('method-text');
  if (!el) return;
  el.innerHTML = `
    <p>Klossarna är partiernas verkliga vallöften från utlovat.se. <strong>Kategorin styr klossens form</strong>,
    <strong>kostnaden styr poängen</strong>, och <strong>partiet bara visas</strong> — det ger ingen fördel.</p>
    <p>Du förlorar när stapeln når toppen, precis som i Tetris. Kostnaden är en poängvikt, inte ett tak:
    ett löften större än reformutrymmet är bara en högpoängare.</p>
    <p>Nollkostnadslöften (lagar, utredningar) ger en liten baspoäng. Spelet är neutralt: ett automatiserat
    prov kontrollerar att inget parti får en orimlig andel av klossarna.</p>`;
}

/* ── HTML-escape — för att visa löftescitat och partinamn säkert ── */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escapeAttr(s: string): string {
  return escapeHtml(s);
}

/* ── Startskärm: legender ──
 * Två tydligt åtskilda legender. (1) Form = kategori: statisk, fast map från
 * löfteskategori till tetrominoform — det är självaste styrspelet. (2) Färg =
 * parti: datadriven (byggd från parties.json via api), kosmetisk, påverkar inget.
 * Förväxlingen är det vi motverkar: formen styr, färgen visar bara. */

/** Form-ägd kategori→tetromino-map. Spegel av src/mapping.ts, hållen här för
 * att legenden ska vara deklarativ och läsbart lokaliserad. Två kategorier
 * delar form medvetet (välfärd & utbildning → I; försvar & infrastruktur → J). */
const CATEGORY_FORM_ROWS: Array<{ categories: string[]; shape: Tetromino }> = [
  { categories: ['välfärd', 'utbildning'], shape: 'I' },
  { categories: ['skatter'], shape: 'L' },
  { categories: ['klimat-miljö'], shape: 'T' },
  { categories: ['rättsväsende'], shape: 'Z' },
  { categories: ['migration'], shape: 'S' },
  { categories: ['övrigt'], shape: 'O' },
  { categories: ['försvar', 'infrastruktur'], shape: 'J' },
];

/** Liten inline-SVG-glyph av en tetrominoform (papper på svarta linjer), i
 * profilens kantiga stil — radius 0, 2px svart ram. Neutral färg (ej partifärg)
 * eftersom formen är styrspelet, inte partiet. Cell-offset kommer från
 * `shapeCells` (src/engine.ts) — ingen duplicerad formtabell. */
export function shapeGlyph(shape: Tetromino, size = 5): string {
  const cells = shapeCells(shape);
  const dim = size * 4;
  const rects = cells
    .map(([r, c]) => `<rect x="${c * size}" y="${r * size}" width="${size}" height="${size}" fill="${PAPPER}" stroke="${SVARTA}" stroke-width="0.6"/>`)
    .join('');
  return `<svg class="vt-glyph" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}" aria-hidden="true">${rects}</svg>`;
}

/** Renderar den statiska kategori→form-legenden. Fast map; inte partibunden. */
export function renderCategoryLegend() {
  const el = document.getElementById('legend-category');
  if (!el) return;
  el.innerHTML = CATEGORY_FORM_ROWS.map((row) => {
    const label = row.categories.length > 1 ? row.categories.join(' · ') : row.categories[0]!;
    return `<li class="vt-legend-row">
      <span class="vt-legend-glyph">${shapeGlyph(row.shape)}</span>
      <span class="vt-legend-form">${escapeHtml(row.shape)}</span>
      <span class="vt-legend-label">${escapeHtml(label)}</span>
    </li>`;
  }).join('');
}

/** Renderar partifärgslegenden DATADRIVET ur `parties` (från parties.json via
 * api). Inte hårdkodad — om utlovat ändrar en partifärg följer legenden med.
 * Förkortningen stämplas via delad `stampColorOn(party.color)` så kontrasten
 * är densamma som på klossarna. Kosmetisk, påverkar inget styrspel. */
export function renderPartyLegend(parties: PartyData[]) {
  const el = document.getElementById('legend-party');
  if (!el) return;
  el.innerHTML = parties.map((p) => {
    const fg = stampColorOn(p.color);
    return `<li class="vt-legend-row vt-legend-party-row">
      <span class="vt-legend-swatch" style="background:${escapeAttr(p.color)}">
        <span class="vt-legend-abbr" style="color:${escapeAttr(fg)}">${escapeHtml(p.code.toUpperCase())}</span>
      </span>
      <span class="vt-legend-label">${escapeHtml(p.name)}</span>
    </li>`;
  }).join('');
}

